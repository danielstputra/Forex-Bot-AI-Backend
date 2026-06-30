import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/shared';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallets(userId: string) {
    const currencies = ['USD', 'USDT', 'BTC'];
    
    // Ensure the user has a wallet for each currency
    const wallets = [];
    for (const cur of currencies) {
      let wallet = await this.prisma.userWallet.findFirst({
        where: { userId, currency: cur }
      });

      if (!wallet) {
        const mockAddress = cur === 'USDT' ? 'TX982a' + Math.random().toString(36).substring(2, 28) :
                            (cur === 'BTC' ? '1bc' + Math.random().toString(36).substring(2, 28) : null);
        
        wallet = await this.prisma.userWallet.create({
          data: {
            userId,
            currency: cur,
            balance: cur === 'USD' ? 1000.00 : 0.00, // Give them a free $1000 USD to start
            address: mockAddress
          }
        });
      }
      wallets.push(wallet);
    }

    return wallets;
  }

  async requestDeposit(userId: string, body: any, filename: string | null) {
    const { currency, amount, paymentMethod } = body;
    if (!currency || !amount || !paymentMethod) {
      throw new BadRequestException('currency, amount, and paymentMethod are required.');
    }

    const wallet = await this.prisma.userWallet.findFirst({
      where: { userId, currency }
    });
    if (!wallet) {
      throw new BadRequestException(`Wallet for currency ${currency} not found.`);
    }

    // 1. Buat request deposit di database
    const deposit = await this.prisma.depositRequest.create({
      data: {
        walletId: wallet.id,
        amount: parseFloat(amount),
        paymentMethod,
        proofUrl: filename ? `/uploads/deposits/${filename}` : null,
        status: 'PENDING'
      }
    });

    // 2. Baca konfigurasi payment gateway aktif dari database
    const appConfig = await this.prisma.appConfig.findFirst();
    const activeGateway = appConfig?.activePaymentGateway || 'MIDTRANS';
    const midtransKey = appConfig?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-dnX0h4Vb3R4uWq7fP0l4t7e8';
    const xenditKey = appConfig?.xenditApiKey || process.env.XENDIT_API_KEY || '';

    // 3. Jika metode adalah QRIS, lakukan integrasi sesuai gateway aktif
    if (paymentMethod === 'QRIS') {
      if (activeGateway === 'MIDTRANS') {
        try {
          const authHeader = Buffer.from(midtransKey + ':').toString('base64');
          const amountInIdr = Math.round(deposit.amount * (currency === 'USD' ? 16000 : 1));

          const midtransUrl = 'https://api.sandbox.midtrans.com/v2/charge';
          const response = await fetch(midtransUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authHeader}`
            },
            body: JSON.stringify({
              payment_type: 'qris',
              transaction_details: {
                order_id: deposit.id,
                gross_amount: amountInIdr
              }
            })
          });

          const data = await response.json();
          if (response.ok && data.actions && data.actions[0]) {
            const qrUrl = data.actions[0].url;
            const updatedDeposit = await this.prisma.depositRequest.update({
              where: { id: deposit.id },
              data: { proofUrl: qrUrl }
            });
            return {
              ...updatedDeposit,
              qrUrl
            };
          }
        } catch (err) {
          console.error('Error initiating Midtrans payment:', err);
        }
      } else if (activeGateway === 'XENDIT' && xenditKey) {
        try {
          const authHeader = Buffer.from(xenditKey + ':').toString('base64');
          const amountInIdr = Math.round(deposit.amount * (currency === 'USD' ? 16000 : 1));

          const xenditUrl = 'https://api.xendit.co/qr_codes';
          const response = await fetch(xenditUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authHeader}`
            },
            body: JSON.stringify({
              reference_id: deposit.id,
              type: 'DYNAMIC',
              currency: 'IDR',
              amount: amountInIdr
            })
          });

          const data = await response.json();
          if (response.ok && data.qr_string) {
            // Render QRIS string EMVCo menggunakan API QR Code gratis
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qr_string)}`;
            const updatedDeposit = await this.prisma.depositRequest.update({
              where: { id: deposit.id },
              data: { proofUrl: qrUrl }
            });
            return {
              ...updatedDeposit,
              qrUrl
            };
          }
        } catch (err) {
          console.error('Error initiating Xendit payment:', err);
        }
      }
    }

    return deposit;
  }

  async handleMidtransWebhook(body: any) {
    const { order_id, transaction_status } = body;
    if (!order_id || !transaction_status) {
      throw new BadRequestException('Invalid webhook payload');
    }

    try {
      const appConfig = await this.prisma.appConfig.findFirst();
      const midtransKey = appConfig?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-dnX0h4Vb3R4uWq7fP0l4t7e8';
      const authHeader = Buffer.from(midtransKey + ':').toString('base64');
      const statusUrl = `https://api.sandbox.midtrans.com/v2/${order_id}/status`;
      
      const response = await fetch(statusUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authHeader}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const status = data.transaction_status;

        if (status === 'settlement' || status === 'capture') {
          const deposit = await this.prisma.depositRequest.findUnique({
            where: { id: order_id },
            include: { wallet: true }
          });

          if (deposit && deposit.status === 'PENDING') {
            await this.prisma.$transaction(async (tx) => {
              await tx.depositRequest.update({
                where: { id: order_id },
                data: { status: 'APPROVED' }
              });
              await tx.userWallet.update({
                where: { id: deposit.walletId },
                data: { balance: { increment: deposit.amount } }
              });
            });
            console.log(`[Midtrans Webhook] Deposit ${order_id} berhasil diverifikasi dan saldo ditambahkan.`);
            return { success: true, message: 'Deposit approved' };
          }
        }
      }
    } catch (err) {
      console.error('Error handling Midtrans webhook:', err);
    }
    return { success: false };
  }

  async handleXenditWebhook(body: any) {
    const { event, data } = body;
    if (event === 'qr_code.payment' && data) {
      const { reference_id, status } = data;
      if (status === 'COMPLETED') {
        try {
          const deposit = await this.prisma.depositRequest.findUnique({
            where: { id: reference_id },
            include: { wallet: true }
          });

          if (deposit && deposit.status === 'PENDING') {
            await this.prisma.$transaction(async (tx) => {
              await tx.depositRequest.update({
                where: { id: reference_id },
                data: { status: 'APPROVED' }
              });
              await tx.userWallet.update({
                where: { id: deposit.walletId },
                data: { balance: { increment: deposit.amount } }
              });
            });
            console.log(`[Xendit Webhook] Deposit ${reference_id} berhasil diverifikasi dan saldo ditambahkan.`);
            return { success: true, message: 'Deposit approved' };
          }
        } catch (err) {
          console.error('Error handling Xendit webhook:', err);
        }
      }
    }
    return { success: false };
  }

  async requestWithdrawal(userId: string, body: any) {
    const { currency, amount, paymentMethod, payoutDetails } = body;
    if (!currency || !amount || !paymentMethod || !payoutDetails) {
      throw new BadRequestException('currency, amount, paymentMethod, and payoutDetails are required.');
    }

    const wallet = await this.prisma.userWallet.findFirst({
      where: { userId, currency }
    });
    if (!wallet) {
      throw new BadRequestException(`Wallet for currency ${currency} not found.`);
    }

    const withdrawAmount = parseFloat(amount);
    if (wallet.balance < withdrawAmount) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct balance immediately (frozen for withdrawal)
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: withdrawAmount } }
      });

      return tx.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amount: withdrawAmount,
          paymentMethod,
          payoutDetails,
          status: 'PENDING'
        }
      });
    });
  }
}
