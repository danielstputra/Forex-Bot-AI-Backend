import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService, BrokerApiClientFactory } from '@app/shared';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class TradingEngineService {
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(private prisma: PrismaService) {}

  async startBot(userId: string) {
    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) throw new BadRequestException('Bot configuration not found.');

    await this.prisma.auditLog.create({
      data: { userId, action: 'START_BOT', ipAddress: '127.0.0.1', details: `Strategy: ${config.strategyName}`, status: 'SUCCESS' }
    });

    await this.redis.publish('telemetry:stats', JSON.stringify({
      userId,
      event: 'BOT_STARTED',
      timestamp: new Date(),
      strategyName: config.strategyName
    })).catch(err => console.error('Failed to publish telemetry:', err.message));

    return this.prisma.botConfig.update({
      where: { id: config.id },
      data: { isActive: true }
    });
  }

  async stopBot(userId: string) {
    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) throw new BadRequestException('Bot configuration not found.');

    return this.prisma.$transaction(async (tx) => {
      await tx.botConfig.update({ where: { id: config.id }, data: { isActive: false } });

      const openTrades = await tx.tradeRecord.findMany({ where: { userId, closePrice: null } });

      for (const trade of openTrades) {
        const closePrice = trade.entryPrice * 1.001;
        const profitAmount = 15.00;

        await tx.tradeRecord.update({
          where: { id: trade.id },
          data: { closePrice, closedAt: new Date(), profitAmount, status: 'CLOSED' }
        });

        // Close on external broker if ticketId exists
        if (trade.ticketId) {
          const linkedAccounts = await tx.brokerAccount.findMany({
            where: { userId, status: 'CONNECTED' }
          });

          for (const account of linkedAccounts) {
            try {
              const client = BrokerApiClientFactory.getClient(account);
              await client.closeOrder(trade.ticketId, {
                symbol: trade.currencyPair,
                price: closePrice,
              });
            } catch (err) {
              console.error(`Failed to close external trade ${trade.ticketId} for account ${account.accountNumber}:`, err);
            }
          }
        }

        // GAP 4: Write OrderExecutionLog on close
        await tx.orderExecutionLog.create({
          data: {
            tradeRecordId: trade.id,
            actionType: 'ORDER_CLOSED',
            rawPayload: JSON.stringify({ closePrice, profitAmount, closedAt: new Date() })
          }
        });

        // GAP 6: Accumulate VolumePoint for loyalty when trade closes
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        const pointsEarned = Math.floor(trade.lotSize * 10);
        const existingVP = await tx.volumePoint.findFirst({
          where: { userId, month: currentMonth }
        });
        if (existingVP) {
          await tx.volumePoint.update({
            where: { id: existingVP.id },
            data: {
              volumeTraded: existingVP.volumeTraded + trade.lotSize,
              pointsEarned: existingVP.pointsEarned + pointsEarned
            }
          });
        } else {
          await tx.volumePoint.create({
            data: { userId, month: currentMonth, volumeTraded: trade.lotSize, pointsEarned }
          });
        }
      }

      await tx.auditLog.create({
        data: { userId, action: 'STOP_BOT', ipAddress: '127.0.0.1', details: `Closed ${openTrades.length} positions`, status: 'SUCCESS' }
      });

      this.redis.publish('telemetry:stats', JSON.stringify({
        userId,
        event: 'BOT_STOPPED',
        timestamp: new Date(),
        closedPositionsCount: openTrades.length
      })).catch(err => console.error('Failed to publish telemetry:', err.message));

      return { status: 'stopped', closedPositions: openTrades.length };
    });
  }

  async updateConfig(userId: string, body: any) {
    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) throw new BadRequestException('Bot configuration not found.');

    const { riskTolerance, lotMultiplier, maxDrawdown, newsFilterOn, useSentiment } = body;

    return this.prisma.botConfig.update({
      where: { id: config.id },
      data: {
        riskTolerance: riskTolerance !== undefined ? parseFloat(riskTolerance) : undefined,
        lotMultiplier: lotMultiplier !== undefined ? parseFloat(lotMultiplier) : undefined,
        maxDrawdown: maxDrawdown !== undefined ? parseFloat(maxDrawdown) : undefined,
        newsFilterOn: newsFilterOn !== undefined ? !!newsFilterOn : undefined,
        useSentiment: useSentiment !== undefined ? !!useSentiment : undefined
      }
    });
  }

  async executeOrder(userId: string, body: any) {
    const { currencyPair, tradeType, lotSize, entryPrice } = body;
    if (!currencyPair || !tradeType || !lotSize || !entryPrice) {
      throw new BadRequestException('currencyPair, tradeType, lotSize, and entryPrice are required.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found.');

    const mainTrade = await this.prisma.tradeRecord.create({
      data: {
        userId,
        currencyPair,
        tradeType,
        lotSize: parseFloat(lotSize),
        entryPrice: parseFloat(entryPrice),
        status: 'OPEN'
      }
    });

    // GAP 4: Write OrderExecutionLog on order submission
    await this.prisma.orderExecutionLog.create({
      data: {
        tradeRecordId: mainTrade.id,
        actionType: 'ORDER_SUBMITTED',
        rawPayload: JSON.stringify({ currencyPair, tradeType, lotSize, entryPrice })
      }
    });

    // Execute on external broker APIs if linked accounts exist
    const linkedAccounts = await this.prisma.brokerAccount.findMany({
      where: { userId, status: 'CONNECTED' }
    });

    let primaryTicketId: string | undefined = undefined;

    for (const account of linkedAccounts) {
      try {
        const client = BrokerApiClientFactory.getClient(account);
        const result = await client.placeOrder({
          symbol: currencyPair,
          type: tradeType as 'BUY' | 'SELL',
          lotSize: parseFloat(lotSize),
          price: parseFloat(entryPrice),
        });

        if (result.success && result.ticketId) {
          if (!primaryTicketId) {
            primaryTicketId = result.ticketId;
          }
          await this.prisma.orderExecutionLog.create({
            data: {
              tradeRecordId: mainTrade.id,
              actionType: 'ORDER_FILLED',
              rawPayload: JSON.stringify({
                brokerAccountId: account.id,
                accountNumber: account.accountNumber,
                brokerName: account.brokerName,
                ticketId: result.ticketId,
                response: result.rawPayload ? JSON.parse(result.rawPayload) : null
              })
            }
          });
        } else {
          await this.prisma.orderExecutionLog.create({
            data: {
              tradeRecordId: mainTrade.id,
              actionType: 'ORDER_FAILED',
              rawPayload: JSON.stringify({
                brokerAccountId: account.id,
                accountNumber: account.accountNumber,
                brokerName: account.brokerName,
                errorMessage: result.errorMessage,
                response: result.rawPayload ? JSON.parse(result.rawPayload) : null
              })
            }
          });
        }
      } catch (err: any) {
        await this.prisma.orderExecutionLog.create({
          data: {
            tradeRecordId: mainTrade.id,
            actionType: 'ORDER_FAILED',
            rawPayload: JSON.stringify({
              brokerAccountId: account.id,
              accountNumber: account.accountNumber,
              brokerName: account.brokerName,
              error: err.message
            })
          }
        });
      }
    }

    if (primaryTicketId) {
      await this.prisma.tradeRecord.update({
        where: { id: mainTrade.id },
        data: { ticketId: primaryTicketId }
      });
      mainTrade.ticketId = primaryTicketId;
    }

    this.redis.publish('telemetry:stats', JSON.stringify({
      userId,
      event: 'ORDER_EXECUTED',
      timestamp: new Date(),
      tradeId: mainTrade.id,
      symbol: currencyPair,
      type: tradeType,
      lotSize,
      price: entryPrice
    })).catch(err => console.error('Failed to publish telemetry:', err.message));

    // PAMM allocation for MANAGER role
    if (user.role === 'MANAGER') {
      const slaves = [
        { id: 'slave-1', name: 'Andi Wijaya', equity: 50000 },
        { id: 'slave-2', name: 'Siti Rahma', equity: 30000 },
        { id: 'slave-3', name: 'Budi Santoso', equity: 80000 },
        { id: 'slave-4', name: 'Diana Lestari', equity: 40000 }
      ];
      const totalEquity = slaves.reduce((sum, s) => sum + s.equity, 0);
      const allocations = slaves.map((slave) => ({
        slaveId: slave.id,
        slaveName: slave.name,
        allocatedLot: parseFloat(((slave.equity / totalEquity) * parseFloat(lotSize)).toFixed(2)),
        equityShare: ((slave.equity / totalEquity) * 100).toFixed(1) + '%'
      }));
      return { mainTrade, pammAllocation: { allocationMethod: 'Equity Proportional', totalEquity, allocations } };
    }

    return { mainTrade };
  }

  // GAP 5: Strategy License management
  async generateLicense(userId: string, body: any) {
    const { ipBound, validDays } = body;

    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) throw new BadRequestException('Bot configuration not found.');

    const rawKey = crypto.randomBytes(32).toString('hex');
    const licenseKeyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const expiresAt = new Date(Date.now() + (validDays || 365) * 24 * 60 * 60 * 1000);

    await this.prisma.strategyLicense.create({
      data: {
        botConfigId: config.id,
        licenseKeyHash,
        ipBound: ipBound || null,
        expiresAt,
        status: 'ACTIVE'
      }
    });

    return {
      licenseKey: rawKey,
      message: 'Store this key safely — it will not be shown again.',
      expiresAt,
      ipBound: ipBound || null
    };
  }

  async getLicenses(userId: string) {
    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) return [];

    return this.prisma.strategyLicense.findMany({
      where: { botConfigId: config.id },
      orderBy: { createdAt: 'desc' }
    });
  }

  async revokeLicense(userId: string, licenseId: string) {
    const config = await this.prisma.botConfig.findFirst({ where: { userId } });
    if (!config) throw new BadRequestException('Bot configuration not found.');

    return this.prisma.strategyLicense.updateMany({
      where: { id: licenseId, botConfigId: config.id },
      data: { status: 'REVOKED' }
    });
  }

  async getOrderLogs(userId: string) {
    const trades = await this.prisma.tradeRecord.findMany({
      where: { userId },
      select: { id: true }
    });
    const tradeIds = trades.map(t => t.id);
    return this.prisma.orderExecutionLog.findMany({
      where: { tradeRecordId: { in: tradeIds } },
      orderBy: { loggedAt: 'desc' },
      take: 50
    });
  }
}
