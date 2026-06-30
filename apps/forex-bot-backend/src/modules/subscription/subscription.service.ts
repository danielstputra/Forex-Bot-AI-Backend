import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' }
    });
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 5 }, transactions: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });
    return subscription;
  }

  async upgrade(userId: string, body: any) {
    const { tier } = body;
    if (!tier) throw new BadRequestException('tier is required.');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier } });
    if (!plan) throw new NotFoundException(`Plan with tier "${tier}" not found.`);

    const existingSub = await this.prisma.subscription.findUnique({ where: { userId } });

    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // 1-year subscription

    let subscription: any;

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert Subscription
      subscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          validUntil
        },
        create: {
          userId,
          planId: plan.id,
          status: 'ACTIVE',
          validUntil
        }
      });

      // 2. Create Transaction record
      await tx.transaction.create({
        data: {
          subscriptionId: subscription.id,
          amount: plan.priceYearly,
          currency: 'USD',
          paymentGateway: 'MANUAL',
          status: 'SUCCESS'
        }
      });

      // 3. Create Invoice record
      const dueDate = new Date();
      await tx.invoice.create({
        data: {
          subscriptionId: subscription.id,
          amount: plan.priceYearly,
          status: 'PAID',
          dueDate,
          paidAt: new Date()
        }
      });
    });

    return {
      message: `Subscription upgraded to ${plan.name} successfully.`,
      tier: plan.tier,
      validUntil,
      planName: plan.name
    };
  }

  async getInvoices(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return [];
    return this.prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: 'desc' }
    });
  }
}
