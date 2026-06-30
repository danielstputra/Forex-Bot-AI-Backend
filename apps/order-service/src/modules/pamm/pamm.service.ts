import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/shared';

@Injectable()
export class PammService {
  constructor(private prisma: PrismaService) {}

  async getPools(userId: string) {
    let pools = await this.prisma.pammPool.findMany({
      include: {
        manager: {
          select: {
            legalName: true,
            email: true
          }
        },
        investors: true
      }
    });

    // Seed default PAMM pool if none exist
    if (pools.length === 0) {
      const manager = await this.prisma.user.findFirst({
        where: { id: userId }
      }) || await this.prisma.user.findFirst();

      if (manager) {
        const newPool = await this.prisma.pammPool.create({
          data: {
            managerId: manager.id,
            name: 'Alpha AI Multi-Strategy Fund',
            description: 'Fund kuantitatif dengan target return bulanan 8-12% menggunakan bot grid-hedging AI.',
            minInvestment: 1000.0,
            performanceFeePct: 20.0,
            totalAum: 200000.0,
            allTimeRoi: 24.5,
            status: 'ACTIVE'
          }
        });

        // Seed default investors
        const mockInvestorsData = [
          { name: 'Andi Wijaya', email: 'andi@example.com', balance: 50000, share: 25.0 },
          { name: 'Siti Rahma', email: 'siti@example.com', balance: 30000, share: 15.0 },
          { name: 'Budi Santoso', email: 'budi@example.com', balance: 80000, share: 40.0 },
          { name: 'Diana Lestari', email: 'diana@example.com', balance: 40000, share: 20.0 }
        ];

        for (const mInv of mockInvestorsData) {
          // Find or create user for investor
          let investorUser = await this.prisma.user.findUnique({ where: { email: mInv.email } });
          if (!investorUser) {
            investorUser = await this.prisma.user.create({
              data: {
                email: mInv.email,
                legalName: mInv.name,
                passwordHash: 'dummy-hash',
                role: 'USER',
                status: 'ACTIVE'
              }
            });
          }

          await this.prisma.pammInvestor.create({
            data: {
              poolId: newPool.id,
              investorId: investorUser.id,
              allocatedCapital: mInv.balance,
              sharePercentage: mInv.share,
              status: 'ACTIVE'
            }
          });
        }

        pools = await this.prisma.pammPool.findMany({
          include: {
            manager: {
              select: {
                legalName: true,
                email: true
              }
            },
            investors: true
          }
        });
      }
    }

    return pools;
  }

  async createPool(userId: string, body: any) {
    const { name, description, minInvestment, performanceFeePct } = body;
    if (!name) {
      throw new BadRequestException('Pool name is required.');
    }

    return this.prisma.pammPool.create({
      data: {
        managerId: userId,
        name,
        description: description || '',
        minInvestment: minInvestment || 1000.0,
        performanceFeePct: performanceFeePct || 20.0,
        totalAum: 0.0,
        allTimeRoi: 0.0,
        status: 'ACTIVE'
      }
    });
  }

  async getPoolInvestors(poolId: string) {
    return this.prisma.pammInvestor.findMany({
      where: { poolId },
      include: {
        investor: {
          select: {
            legalName: true,
            email: true
          }
        }
      }
    });
  }

  async updateAllocation(poolId: string, body: any) {
    const { method, allocations } = body; // method: proportional, equal, manual
    if (!method) {
      throw new BadRequestException('Allocation method is required.');
    }

    const pool = await this.prisma.pammPool.findUnique({
      where: { id: poolId },
      include: { investors: true }
    });

    if (!pool) {
      throw new BadRequestException('PAMM pool not found.');
    }

    // Process based on method
    if (method === 'equal') {
      const equalShare = parseFloat((100 / pool.investors.length).toFixed(2));
      for (const inv of pool.investors) {
        await this.prisma.pammInvestor.update({
          where: { id: inv.id },
          data: { sharePercentage: equalShare }
        });
      }
    } else if (method === 'proportional') {
      const totalAum = pool.investors.reduce((sum, inv) => sum + inv.allocatedCapital, 0);
      if (totalAum > 0) {
        for (const inv of pool.investors) {
          const share = parseFloat(((inv.allocatedCapital / totalAum) * 100).toFixed(1));
          await this.prisma.pammInvestor.update({
            where: { id: inv.id },
            data: { sharePercentage: share }
          });
        }
      }
    } else if (method === 'manual' && allocations) {
      // allocations: array of { investorId: string, share: number }
      let sum = 0;
      for (const alloc of allocations) {
        sum += alloc.share;
      }
      if (Math.abs(sum - 100) > 0.1) {
        throw new BadRequestException(`Sum of manual allocations must be exactly 100%. Got ${sum}%`);
      }

      for (const alloc of allocations) {
        const match = pool.investors.find(inv => inv.investorId === alloc.investorId);
        if (match) {
          await this.prisma.pammInvestor.update({
            where: { id: match.id },
            data: { sharePercentage: alloc.share }
          });
        }
      }
    }

    return this.prisma.pammPool.findUnique({
      where: { id: poolId },
      include: { investors: true }
    });
  }

  async getAllocationLogs(userId: string, poolId: string) {
    // Verify manager access
    const pool = await this.prisma.pammPool.findFirst({
      where: { id: poolId, managerId: userId }
    });
    if (!pool) throw new BadRequestException('Pool not found or unauthorized.');

    return this.prisma.pammAllocationLog.findMany({
      where: { poolId },
      orderBy: { allocatedAt: 'desc' },
      take: 50
    });
  }

  async getPayouts(userId: string) {
    // Return mock or real performance fee payouts from AffiliatePayout table or simulated log
    const payouts = await this.prisma.affiliatePayout.findMany({
      where: { affiliateId: userId }
    });

    if (payouts.length === 0) {
      // Seed default payout history
      const defaultPayouts = [
        {
          amount: 2500.0,
          paymentMethod: 'USDT',
          payoutDetails: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          status: 'PAID',
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          amount: 1960.0,
          paymentMethod: 'USDT',
          payoutDetails: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          status: 'PAID',
          paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const p of defaultPayouts) {
        await this.prisma.affiliatePayout.create({
          data: {
            affiliateId: userId,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            payoutDetails: p.payoutDetails,
            status: p.status,
            paidAt: p.paidAt
          }
        });
      }

      return this.prisma.affiliatePayout.findMany({
        where: { affiliateId: userId }
      });
    }

    return payouts;
  }
}
