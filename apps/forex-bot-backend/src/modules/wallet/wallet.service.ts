import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

// ─── Payment Response Interface ──────────────────────────────────────────────
export interface PaymentResult {
  depositId: string;
  paymentType: string;
  // QR code image URL (QRIS, GoPay)
  qrUrl?: string;
  // Virtual Account info
  vaNumber?: string;
  vaBank?: string;
  // Deeplink for e-wallet apps
  deeplink?: string;
  // Redirect URL for web checkout (ShopeePay, DANA, OVO via Xendit)
  checkoutUrl?: string;
  // Retail payment code (Alfamart, Indomaret)
  paymentCode?: string;
  retailStore?: string;
  // Amount in IDR
  amountIdr: number;
  // Expiry
  expiresAt?: string;
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: Get App Config ─────────────────────────────────────────────────
  private async getGatewayConfig() {
    const appConfig = await this.prisma.appConfig.findFirst();
    const activeGateway = appConfig?.activePaymentGateway || 'MIDTRANS';
    const midtransKey = appConfig?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-dnX0h4Vb3R4uWq7fP0l4t7e8';
    const xenditKey = appConfig?.xenditApiKey || process.env.XENDIT_API_KEY || '';
    const midtransBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
    return { activeGateway, midtransKey, xenditKey, midtransBaseUrl };
  }

  private midtransAuth(key: string) {
    return 'Basic ' + Buffer.from(key + ':').toString('base64');
  }
  private xenditAuth(key: string) {
    return 'Basic ' + Buffer.from(key + ':').toString('base64');
  }

  // ─── USD → IDR (use live rate or static fallback) ──────────────────────────
  private toIdr(amount: number, currency: string): number {
    const rate = currency === 'USD' ? 16200 : 1;
    return Math.round(amount * rate);
  }

  // ─── Get Wallets ────────────────────────────────────────────────────────────
  async getWallets(userId: string) {
    const currencies = ['USD', 'USDT', 'BTC'];
    const wallets = [];
    for (const cur of currencies) {
      let wallet = await this.prisma.userWallet.findFirst({ where: { userId, currency: cur } });
      if (!wallet) {
        const mockAddress = cur === 'USDT'
          ? 'TX982a' + Math.random().toString(36).substring(2, 28)
          : cur === 'BTC' ? '1bc' + Math.random().toString(36).substring(2, 28) : null;
        wallet = await this.prisma.userWallet.create({
          data: { userId, currency: cur, balance: cur === 'USD' ? 1000.00 : 0.00, address: mockAddress }
        });
      }
      wallets.push(wallet);
    }
    return wallets;
  }

  // ─── Request Deposit ─────────────────────────────────────────────────────────
  async requestDeposit(userId: string, body: any, filename: string | null) {
    const { currency, amount, method } = body;
    if (!currency || !amount || !method) {
      throw new BadRequestException('currency, amount, and method are required.');
    }

    const wallet = await this.prisma.userWallet.findFirst({ where: { userId, currency } });
    if (!wallet) throw new BadRequestException(`Wallet for ${currency} not found.`);

    const deposit = await this.prisma.depositRequest.create({
      data: {
        walletId: wallet.id,
        amount: parseFloat(amount),
        paymentMethod: method,
        proofUrl: filename ? `/uploads/deposits/${filename}` : null,
        status: 'PENDING'
      }
    });

    const amountIdr = this.toIdr(parseFloat(amount), currency);
    const { midtransKey, xenditKey, midtransBaseUrl } = await this.getGatewayConfig();

    // ── QRIS Universal ────────────────────────────────────────────────────────
    if (method === 'QRIS') {
      return this.chargeQris(deposit, amountIdr, midtransKey, midtransBaseUrl);
    }

    // ── GoPay (Midtrans) ──────────────────────────────────────────────────────
    if (method === 'GOPAY') {
      return this.chargeGopay(deposit, amountIdr, midtransKey, midtransBaseUrl);
    }

    // ── ShopeePay (Midtrans) ──────────────────────────────────────────────────
    if (method === 'SHOPEEPAY') {
      return this.chargeShopeepay(deposit, amountIdr, midtransKey, midtransBaseUrl);
    }

    // ── Virtual Account (Midtrans) ────────────────────────────────────────────
    if (method.startsWith('VA_')) {
      const bankCode = method.replace('VA_', '').toLowerCase(); // bca, mandiri, bni, bri, cimb, permata
      return this.chargeVirtualAccount(deposit, amountIdr, bankCode, midtransKey, midtransBaseUrl);
    }

    // ── Retail (Alfamart / Indomaret) ─────────────────────────────────────────
    if (method === 'ALFAMART' || method === 'INDOMARET') {
      const store = method === 'ALFAMART' ? 'alfamart' : 'indomaret';
      return this.chargeRetail(deposit, amountIdr, store, midtransKey, midtransBaseUrl);
    }

    // ── Xendit E-Wallets (DANA, OVO, LINKAJA) ────────────────────────────────
    if (['DANA', 'OVO', 'LINKAJA'].includes(method)) {
      return this.chargeXenditEwallet(deposit, amountIdr, method, xenditKey);
    }

    // ── Bank Transfer Manual / Crypto ─────────────────────────────────────────
    return {
      depositId: deposit.id,
      paymentType: method,
      amountIdr,
      // No gateway action needed – admin approves manually
    } as PaymentResult;
  }

  // ── QRIS via Midtrans ─────────────────────────────────────────────────────────
  private async chargeQris(deposit: any, amountIdr: number, key: string, baseUrl: string): Promise<PaymentResult> {
    try {
      const res = await fetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.midtransAuth(key) },
        body: JSON.stringify({
          payment_type: 'qris',
          transaction_details: { order_id: deposit.id, gross_amount: amountIdr },
          qris: { acquirer: 'gopay' }
        })
      });
      const data = await res.json();
      if (res.ok && data.actions) {
        const qrUrl = data.actions.find((a: any) => a.name === 'generate-qr-code')?.url || data.actions[0]?.url;
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: qrUrl } });
        return { depositId: deposit.id, paymentType: 'QRIS', qrUrl, amountIdr, expiresAt: data.expiry_time };
      }
      console.error('[QRIS] Midtrans error:', data);
    } catch (err) { console.error('[QRIS] Exception:', err); }
    return { depositId: deposit.id, paymentType: 'QRIS', amountIdr };
  }

  // ── GoPay via Midtrans ────────────────────────────────────────────────────────
  private async chargeGopay(deposit: any, amountIdr: number, key: string, baseUrl: string): Promise<PaymentResult> {
    try {
      const res = await fetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.midtransAuth(key) },
        body: JSON.stringify({
          payment_type: 'gopay',
          transaction_details: { order_id: deposit.id, gross_amount: amountIdr },
          gopay: { enable_callback: false }
        })
      });
      const data = await res.json();
      if (res.ok && data.actions) {
        const qrUrl = data.actions.find((a: any) => a.name === 'generate-qr-code')?.url;
        const deeplink = data.actions.find((a: any) => a.name === 'deeplink-redirect')?.url;
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: qrUrl || deeplink } });
        return { depositId: deposit.id, paymentType: 'GOPAY', qrUrl, deeplink, amountIdr, expiresAt: data.expiry_time };
      }
      console.error('[GOPAY] Midtrans error:', data);
    } catch (err) { console.error('[GOPAY] Exception:', err); }
    return { depositId: deposit.id, paymentType: 'GOPAY', amountIdr };
  }

  // ── ShopeePay via Midtrans ────────────────────────────────────────────────────
  private async chargeShopeepay(deposit: any, amountIdr: number, key: string, baseUrl: string): Promise<PaymentResult> {
    try {
      const res = await fetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.midtransAuth(key) },
        body: JSON.stringify({
          payment_type: 'shopeepay',
          transaction_details: { order_id: deposit.id, gross_amount: amountIdr },
          shopeepay: { callback_url: `${process.env.APP_URL || 'https://localhost:3000'}/payment/callback` }
        })
      });
      const data = await res.json();
      if (res.ok && data.actions) {
        const checkoutUrl = data.actions.find((a: any) => a.name === 'deeplink-redirect')?.url || data.actions[0]?.url;
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: checkoutUrl } });
        return { depositId: deposit.id, paymentType: 'SHOPEEPAY', checkoutUrl, deeplink: checkoutUrl, amountIdr, expiresAt: data.expiry_time };
      }
      console.error('[SHOPEEPAY] Midtrans error:', data);
    } catch (err) { console.error('[SHOPEEPAY] Exception:', err); }
    return { depositId: deposit.id, paymentType: 'SHOPEEPAY', amountIdr };
  }

  // ── Virtual Account via Midtrans ──────────────────────────────────────────────
  private async chargeVirtualAccount(deposit: any, amountIdr: number, bank: string, key: string, baseUrl: string): Promise<PaymentResult> {
    try {
      const body: any = {
        payment_type: 'bank_transfer',
        transaction_details: { order_id: deposit.id, gross_amount: amountIdr },
        bank_transfer: { bank }
      };
      if (bank === 'permata') body.payment_type = 'permata';

      const res = await fetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.midtransAuth(key) },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        const vaNumber = data.va_numbers?.[0]?.va_number || data.permata_va_number;
        const vaBank = (data.va_numbers?.[0]?.bank || bank).toUpperCase();
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: `VA:${vaBank}:${vaNumber}` } });
        return { depositId: deposit.id, paymentType: `VA_${vaBank}`, vaNumber, vaBank, amountIdr, expiresAt: data.expiry_time };
      }
      console.error(`[VA_${bank.toUpperCase()}] Midtrans error:`, data);
    } catch (err) { console.error(`[VA_${bank}] Exception:`, err); }
    return { depositId: deposit.id, paymentType: `VA_${bank.toUpperCase()}`, amountIdr };
  }

  // ── Retail (Alfamart/Indomaret) via Midtrans ──────────────────────────────────
  private async chargeRetail(deposit: any, amountIdr: number, store: string, key: string, baseUrl: string): Promise<PaymentResult> {
    try {
      const res = await fetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.midtransAuth(key) },
        body: JSON.stringify({
          payment_type: 'cstore',
          transaction_details: { order_id: deposit.id, gross_amount: amountIdr },
          cstore: { store, message: 'ForexBotAI Deposit' }
        })
      });
      const data = await res.json();
      if (res.ok) {
        const paymentCode = data.payment_code;
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: `RETAIL:${store}:${paymentCode}` } });
        return { depositId: deposit.id, paymentType: store.toUpperCase(), paymentCode, retailStore: store, amountIdr, expiresAt: data.expiry_time };
      }
      console.error(`[${store.toUpperCase()}] Midtrans error:`, data);
    } catch (err) { console.error(`[${store}] Exception:`, err); }
    return { depositId: deposit.id, paymentType: store.toUpperCase(), amountIdr };
  }

  // ── Xendit E-Wallet (DANA, OVO, LINKAJA) ──────────────────────────────────────
  private async chargeXenditEwallet(deposit: any, amountIdr: number, method: string, xenditKey: string): Promise<PaymentResult> {
    if (!xenditKey) {
      console.warn(`[${method}] Xendit API key not configured. Storing as pending manual.`);
      return { depositId: deposit.id, paymentType: method, amountIdr };
    }
    try {
      const channelCodeMap: Record<string, string> = { DANA: 'ID_DANA', OVO: 'ID_OVO', LINKAJA: 'ID_LINKAJA' };
      const res = await fetch('https://api.xendit.co/ewallets/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.xenditAuth(xenditKey) },
        body: JSON.stringify({
          reference_id: deposit.id,
          currency: 'IDR',
          amount: amountIdr,
          checkout_method: 'ONE_TIME_PAYMENT',
          channel_code: channelCodeMap[method],
          channel_properties: {
            success_redirect_url: `${process.env.APP_URL || 'https://localhost:3000'}/payment/success`,
            failure_redirect_url: `${process.env.APP_URL || 'https://localhost:3000'}/payment/failed`,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        const checkoutUrl = data.actions?.desktop_web_checkout_url || data.actions?.mobile_web_checkout_url;
        await this.prisma.depositRequest.update({ where: { id: deposit.id }, data: { proofUrl: checkoutUrl } });
        return { depositId: deposit.id, paymentType: method, checkoutUrl, amountIdr };
      }
      console.error(`[${method}] Xendit error:`, data);
    } catch (err) { console.error(`[${method}] Exception:`, err); }
    return { depositId: deposit.id, paymentType: method, amountIdr };
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────────
  async handleMidtransWebhook(body: any) {
    const { order_id, transaction_status } = body;
    if (!order_id || !transaction_status) throw new BadRequestException('Invalid webhook payload');

    try {
      const { midtransKey, midtransBaseUrl } = await this.getGatewayConfig();
      const res = await fetch(`${midtransBaseUrl}/${order_id}/status`, {
        headers: { 'Authorization': this.midtransAuth(midtransKey) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transaction_status === 'settlement' || data.transaction_status === 'capture') {
          const deposit = await this.prisma.depositRequest.findUnique({ where: { id: order_id }, include: { wallet: true } });
          if (deposit && deposit.status === 'PENDING') {
            await this.prisma.$transaction(async (tx) => {
              await tx.depositRequest.update({ where: { id: order_id }, data: { status: 'APPROVED' } });
              await tx.userWallet.update({ where: { id: deposit.walletId }, data: { balance: { increment: deposit.amount } } });
            });
            console.log(`[Midtrans Webhook] Deposit ${order_id} approved, balance credited.`);
            return { success: true };
          }
        }
      }
    } catch (err) { console.error('[Midtrans Webhook] Error:', err); }
    return { success: false };
  }

  async handleXenditWebhook(body: any) {
    // Xendit EWallet Webhook
    const referenceId = body?.data?.reference_id || body?.reference_id;
    const status = body?.data?.status || body?.status;

    if (referenceId && status === 'SUCCEEDED') {
      try {
        const deposit = await this.prisma.depositRequest.findUnique({ where: { id: referenceId }, include: { wallet: true } });
        if (deposit && deposit.status === 'PENDING') {
          await this.prisma.$transaction(async (tx) => {
            await tx.depositRequest.update({ where: { id: referenceId }, data: { status: 'APPROVED' } });
            await tx.userWallet.update({ where: { id: deposit.walletId }, data: { balance: { increment: deposit.amount } } });
          });
          console.log(`[Xendit Webhook] Deposit ${referenceId} approved, balance credited.`);
          return { success: true };
        }
      } catch (err) { console.error('[Xendit Webhook] Error:', err); }
    }
    return { success: false };
  }

  // ─── Withdrawal ──────────────────────────────────────────────────────────────
  async requestWithdrawal(userId: string, body: any) {
    const { currency, amount, method, accountDetails } = body;
    if (!currency || !amount || !method) throw new BadRequestException('currency, amount, and method are required.');

    const wallet = await this.prisma.userWallet.findFirst({ where: { userId, currency } });
    if (!wallet) throw new BadRequestException(`Wallet for ${currency} not found.`);

    const withdrawAmount = parseFloat(amount);
    if (wallet.balance < withdrawAmount) throw new BadRequestException('Insufficient wallet balance.');

    return this.prisma.$transaction(async (tx) => {
      await tx.userWallet.update({ where: { id: wallet.id }, data: { balance: { decrement: withdrawAmount } } });
      return tx.withdrawalRequest.create({
        data: { walletId: wallet.id, amount: withdrawAmount, paymentMethod: method, payoutDetails: accountDetails || '', status: 'PENDING' }
      });
    });
  }
}
