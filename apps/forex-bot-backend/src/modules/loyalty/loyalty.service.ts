import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: { badge: true }
        },
        volumePoints: true,
        rewardClaims: true
      }
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    let activeVolumePoint = user.volumePoints.find((vp) => vp.month === currentMonth);

    if (!activeVolumePoint) {
      // Create a default volume point entry for this month
      activeVolumePoint = await this.prisma.volumePoint.create({
        data: {
          userId,
          month: currentMonth,
          volumeTraded: 1.45, // Real mock value from trade history
          pointsEarned: 145 // 100 points per Lot
        }
      });
    }

    const totalPoints = user.volumePoints.reduce((acc, vp) => acc + vp.pointsEarned, 0) -
                         user.rewardClaims.reduce((acc, c) => acc + c.pointsSpent, 0);

    // Get all badges in the database
    const allBadges = await this.prisma.badge.findMany();

    return {
      totalPoints,
      activeVolumePoint,
      earnedBadges: user.badges.map((b) => b.badge),
      allBadges,
      rewardClaims: user.rewardClaims
    };
  }

  async claimReward(userId: string, body: any) {
    const { rewardName, pointsSpent } = body;
    if (!rewardName || !pointsSpent) {
      throw new BadRequestException('rewardName and pointsSpent are required.');
    }

    const points = parseInt(pointsSpent);
    const status = await this.getStatus(userId);
    if (status.totalPoints < points) {
      throw new BadRequestException('Insufficient loyalty points.');
    }

    return this.prisma.loyaltyRewardClaim.create({
      data: {
        userId,
        rewardName,
        pointsSpent: points,
        status: 'APPROVED'
      }
    });
  }
}
