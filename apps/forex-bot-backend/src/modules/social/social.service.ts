import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async getLeaders(userId: string) {
    let leaders = await this.prisma.leaderPerformance.findMany({
      include: {
        user: {
          select: {
            legalName: true,
            email: true
          }
        }
      },
      orderBy: { ranking: 'asc' }
    });

    if (leaders.length === 0) {
      // Seed top performing leaders
      const mockLeaders = [
        { username: 'FX_Sniper_99', winRate: 84.5, roi30d: 42.8, copiers: 1280, aum: 14250.0, rank: 1 },
        { username: 'GoldenScalper', winRate: 79.2, roi30d: 35.4, copiers: 840, aum: 9800.0, rank: 2 },
        { username: 'SwingKing', winRate: 74.8, roi30d: 28.1, copiers: 512, aum: 6200.0, rank: 3 },
        { username: 'AlphaForexAI', winRate: 72.1, roi30d: 22.5, copiers: 320, aum: 4150.0, rank: 4 }
      ];

      for (const ml of mockLeaders) {
        // Create user for leader
        const email = `${ml.username.toLowerCase()}@example.com`;
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
          let dbRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });
          if (!dbRole) {
            dbRole = await this.prisma.role.create({
              data: { name: 'USER', description: 'USER system role' }
            });
          }
          user = await this.prisma.user.create({
            data: {
              email,
              legalName: ml.username,
              passwordHash: 'dummy-hash',
              roleId: dbRole.id,
              status: 'ACTIVE'
            }
          });
        }

        await this.prisma.leaderPerformance.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            monthlyRoi: ml.roi30d,
            winRate: ml.winRate,
            totalFollowers: ml.copiers,
            totalAum: ml.aum,
            ranking: ml.rank
          }
        });
      }

      leaders = await this.prisma.leaderPerformance.findMany({
        include: {
          user: {
            select: {
              legalName: true,
              email: true
            }
          }
        },
        orderBy: { ranking: 'asc' }
      });
    }

    // Format for frontend
    return leaders.map(l => ({
      id: l.id,
      userId: l.userId,
      username: l.user.legalName,
      winRate: l.winRate,
      roi30d: l.monthlyRoi,
      copiers: l.totalFollowers,
      profit: l.totalAum,
      pair: l.user.legalName === 'GoldenScalper' ? 'USD/JPY' : (l.user.legalName === 'SwingKing' ? 'GBP/USD' : (l.user.legalName === 'AlphaForexAI' ? 'AUD/USD' : 'EUR/USD'))
    }));
  }

  async getConnections(userId: string) {
    return this.prisma.copyBotConnection.findMany({
      where: { followerId: userId }
    });
  }

  async startCopying(userId: string, leaderId: string, body: any) {
    const { multiplier, maxLossLimit } = body;
    if (!leaderId) {
      throw new BadRequestException('leaderId is required.');
    }

    // Check if already copying
    const existing = await this.prisma.copyBotConnection.findFirst({
      where: { followerId: userId, leaderId, status: 'ACTIVE' }
    });

    if (existing) {
      throw new BadRequestException('You are already copying this trader.');
    }

    // Create copy connection
    const conn = await this.prisma.copyBotConnection.create({
      data: {
        followerId: userId,
        leaderId,
        multiplier: multiplier || 1.0,
        maxLossLimit: maxLossLimit || null,
        status: 'ACTIVE'
      }
    });

    // Increment follower count
    await this.prisma.leaderPerformance.updateMany({
      where: { userId: leaderId },
      data: { totalFollowers: { increment: 1 } }
    });

    // GAP 6: Write CopyTradeExecution record for audit trail
    // Fetch the leader's latest open trade (if any) to record as seed
    const latestTrade = await this.prisma.tradeRecord.findFirst({
      where: { userId: leaderId, status: 'OPEN' },
      orderBy: { executedAt: 'desc' }
    });

    if (latestTrade) {
      const allocatedLot = parseFloat((latestTrade.lotSize * (conn.multiplier || 1.0)).toFixed(2));
      await this.prisma.copyTradeExecution.create({
        data: {
          parentTradeId: latestTrade.id,
          followerId: userId,
          allocatedLot,
          status: 'OPEN'
        }
      });
    }

    return conn;
  }

  async stopCopying(userId: string, connectionId: string) {
    const conn = await this.prisma.copyBotConnection.findFirst({
      where: { id: connectionId, followerId: userId }
    });

    if (!conn) {
      throw new BadRequestException('Copy connection not found.');
    }

    // Decrement follower count
    await this.prisma.leaderPerformance.updateMany({
      where: { userId: conn.leaderId },
      data: {
        totalFollowers: { decrement: 1 }
      }
    });

    return this.prisma.copyBotConnection.delete({
      where: { id: connectionId }
    });
  }
}
