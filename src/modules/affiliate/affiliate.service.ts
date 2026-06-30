import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          include: {
            referred: {
              select: { email: true, legalName: true, createdAt: true }
            }
          }
        },
        payouts: true
      }
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const totalReferrals = user.referrals.length;
    const totalCommission = user.referrals.reduce((acc, ref) => acc + ref.commissionEarned, 0);
    const pendingPayout = user.payouts
      .filter((p) => p.status === 'PENDING')
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      referralCode: user.referralCode,
      totalReferrals,
      totalCommission,
      pendingPayout,
      referrals: user.referrals.map((r) => ({
        email: r.referred.email,
        name: r.referred.legalName,
        joinedAt: r.referred.createdAt,
        commission: r.commissionEarned,
        status: r.status
      })),
      payouts: user.payouts
    };
  }

  async requestPayout(userId: string, body: any) {
    const { amount, paymentMethod, payoutDetails } = body;
    if (!amount || !paymentMethod || !payoutDetails) {
      throw new BadRequestException('amount, paymentMethod, and payoutDetails are required.');
    }

    const payoutAmount = parseFloat(amount);
    
    // Check if the user has enough unpaid commission
    const stats = await this.getStats(userId);
    const availableCommission = stats.totalCommission - stats.pendingPayout - stats.payouts
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + p.amount, 0);

    if (availableCommission < payoutAmount) {
      throw new BadRequestException('Insufficient available commission for payout.');
    }

    return this.prisma.affiliatePayout.create({
      data: {
        affiliateId: userId,
        amount: payoutAmount,
        paymentMethod,
        payoutDetails,
        status: 'PENDING'
      }
    });
  }
}
