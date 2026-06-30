import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PriceAlertService {
  constructor(private prisma: PrismaService) { }

  async getAlerts(userId: string) {
    let alerts = await this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (alerts.length === 0) {
      // Seed default alerts
      const defaults = [
        { symbol: 'EUR/USD', targetPrice: 1.0950, condition: 'ABOVE' },
        { symbol: 'USD/JPY', targetPrice: 154.20, condition: 'BELOW' }
      ];

      for (const d of defaults) {
        await this.prisma.priceAlert.create({
          data: {
            userId,
            symbol: d.symbol,
            targetPrice: d.targetPrice,
            condition: d.condition,
            isTriggered: false
          }
        });
      }

      alerts = await this.prisma.priceAlert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    return alerts;
  }

  async createAlert(userId: string, body: any) {
    const { symbol, targetPrice, condition } = body;
    if (!symbol || !targetPrice || !condition) {
      throw new BadRequestException('symbol, targetPrice, and condition are required.');
    }

    return this.prisma.priceAlert.create({
      data: {
        userId,
        symbol,
        targetPrice: parseFloat(targetPrice),
        condition, // ABOVE, BELOW
        isTriggered: false
      }
    });
  }

  async deleteAlert(userId: string, id: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, userId }
    });

    if (!alert) {
      throw new BadRequestException('Price alert not found.');
    }

    return this.prisma.priceAlert.delete({
      where: { id }
    });
  }
}
