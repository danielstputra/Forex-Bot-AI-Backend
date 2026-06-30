import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

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

    return this.prisma.depositRequest.create({
      data: {
        walletId: wallet.id,
        amount: parseFloat(amount),
        paymentMethod,
        proofUrl: filename ? `/uploads/deposits/${filename}` : null,
        status: 'PENDING'
      }
    });
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
