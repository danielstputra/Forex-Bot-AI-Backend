import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class BacktestPersistenceService {
  constructor(private prisma: PrismaService) { }

  async saveResult(userId: string, body: any) {
    const { strategyName, paramsJson, resultJson } = body;
    return this.prisma.backtestHistory.create({
      data: {
        userId,
        strategyName: strategyName || 'Custom Strategy',
        paramsJson: typeof paramsJson === 'string' ? paramsJson : JSON.stringify(paramsJson),
        resultJson: typeof resultJson === 'string' ? resultJson : JSON.stringify(resultJson)
      }
    });
  }

  async getHistory(userId: string) {
    const records = await this.prisma.backtestHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return records.map(r => ({
      id: r.id,
      strategyName: r.strategyName,
      createdAt: r.createdAt,
      params: JSON.parse(r.paramsJson),
      result: JSON.parse(r.resultJson)
    }));
  }

  async deleteHistory(userId: string, historyId: string) {
    return this.prisma.backtestHistory.deleteMany({
      where: { id: historyId, userId }
    });
  }
}
