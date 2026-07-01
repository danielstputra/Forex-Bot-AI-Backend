import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@app/shared';
import { TradingEngineService } from './trading-engine.service';
import { createRedisClient } from '@app/shared';

@Injectable()
export class TradingBotWorker implements OnModuleInit, OnModuleDestroy {
  private redisSub = createRedisClient();
  private priceHistory: Record<string, number[]> = {};
  private activeBotsCache: any[] = [];
  private lastCacheTime = 0;

  constructor(
    private prisma: PrismaService,
    private tradingEngineService: TradingEngineService,
  ) {}

  async onModuleInit() {
    console.log('[TradingBotWorker] Starting Autonomous Trading Engine...');
    
    this.redisSub.subscribe('market:ticks').catch((err) => {
      console.error('[TradingBotWorker] Redis subscription error:', err.message);
    });

    this.redisSub.on('message', async (channel, message) => {
      if (channel === 'market:ticks') {
        try {
          const ticks = JSON.parse(message);
          if (Array.isArray(ticks)) {
            for (const tick of ticks) {
              await this.processTick(tick);
            }
          } else {
            await this.processTick(ticks);
          }
        } catch (e: any) {
          console.error('[TradingBotWorker] Error parsing tick:', e.message);
        }
      }
    });
  }

  onModuleDestroy() {
    this.redisSub.disconnect();
  }

  private async getActiveBots() {
    const now = Date.now();
    // Cache active bots list for 5 seconds to prevent database overload
    if (now - this.lastCacheTime > 5000) {
      this.activeBotsCache = await this.prisma.botConfig.findMany({
        where: { isActive: true }
      });
      this.lastCacheTime = now;
    }
    return this.activeBotsCache;
  }

  private async processTick(tick: any) {
    const { pair, close } = tick;
    if (!pair || !close) return;

    // 1. Maintain rolling price history (last 50 close prices)
    if (!this.priceHistory[pair]) {
      this.priceHistory[pair] = [];
    }
    this.priceHistory[pair].push(close);
    if (this.priceHistory[pair].length > 50) {
      this.priceHistory[pair].shift();
    }

    // 2. Fetch active bots
    const activeBots = await this.getActiveBots();
    if (activeBots.length === 0) return;

    // 3. Calculate indicators
    const rsi = this.calculateRSI(this.priceHistory[pair], 14);
    const emaFast = this.calculateEMA(this.priceHistory[pair], 9);
    const emaSlow = this.calculateEMA(this.priceHistory[pair], 21);

    // 4. Handle Position Closures (Take Profit & Stop Loss)
    await this.checkPositionClosures(pair, close);

    if (rsi === null) return;

    // 5. Evaluate Strategy Signals for each bot depending on its configuration
    for (const bot of activeBots) {
      let signal: 'BUY' | 'SELL' | null = null;
      
      const useEmaCross = bot.maCrossover !== 'None';
      const isBullishCross = emaFast !== null && emaSlow !== null ? emaFast > emaSlow : true;
      const isBearishCross = emaFast !== null && emaSlow !== null ? emaFast < emaSlow : true;

      // Smart Dual-Factor Convergence Logic (EMA Cross Confirmation + RSI oversold/overbought checks)
      if (rsi < 35 && (!useEmaCross || isBullishCross)) {
        signal = 'BUY';
      } else if (rsi > 65 && (!useEmaCross || isBearishCross)) {
        signal = 'SELL';
      }

      if (signal) {
        await this.evaluateAndExecute(bot, pair, close, signal);
      }
    }
  }

  private async evaluateAndExecute(bot: any, pair: string, price: number, signal: 'BUY' | 'SELL') {
    try {
      // Risk Check 1: Max concurrent trades
      const openTradesCount = await this.prisma.tradeRecord.count({
        where: { userId: bot.userId, status: 'OPEN' }
      });
      if (openTradesCount >= 5) return;

      // Risk Check 2: Prevent duplicate trades on same pair
      const existingPairTrade = await this.prisma.tradeRecord.findFirst({
        where: { userId: bot.userId, currencyPair: pair, status: 'OPEN' }
      });
      if (existingPairTrade) return;

      // Lot size calculation based on risk tolerance and multiplier
      const baseLot = 0.01;
      const lotSize = parseFloat((baseLot * bot.lotMultiplier * (bot.riskTolerance / 2)).toFixed(2)) || 0.01;

      console.log(`[TradingBotWorker] Bot ${bot.id} generating ${signal} signal for ${pair} at ${price}. Lot size: ${lotSize}`);

      // Execute order
      await this.tradingEngineService.executeOrder(bot.userId, {
        currencyPair: pair,
        tradeType: signal,
        lotSize: lotSize.toString(),
        entryPrice: price.toString()
      });

    } catch (err: any) {
      console.error(`[TradingBotWorker] Error executing trade for bot ${bot.id}:`, err.message);
    }
  }

  private async checkPositionClosures(pair: string, currentPrice: number) {
    try {
      const openTrades = await this.prisma.tradeRecord.findMany({
        where: { currencyPair: pair, status: 'OPEN' },
        include: {
          user: {
            include: {
              botConfigs: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      for (const trade of openTrades) {
        const activeBot = trade.user?.botConfigs?.[0];
        
        // Dynamically read customized TP/SL levels, or default
        const tp = activeBot?.takeProfitPips || 50;
        const sl = -(activeBot?.stopLossPips || 30);

        const pipsDiff = trade.tradeType === 'BUY'
          ? currentPrice - trade.entryPrice
          : trade.entryPrice - currentPrice;

        const multiplier = pair === 'USD/JPY' ? 100 : 10000;
        const pips = pipsDiff * multiplier;

        if (pips >= tp || pips <= sl) {
          const reason = pips >= tp ? 'TP' : 'SL';
          console.log(`[TradingBotWorker] Closing trade ${trade.id} (${trade.currencyPair}) via ${reason} at ${currentPrice} (Pips: ${pips.toFixed(1)})`);

          const profitAmount = parseFloat((pipsDiff * trade.lotSize * (pair === 'USD/JPY' ? 1000 : 100000)).toFixed(2));

          await this.prisma.$transaction(async (tx) => {
            await tx.tradeRecord.update({
              where: { id: trade.id },
              data: {
                closePrice: currentPrice,
                closedAt: new Date(),
                profitAmount,
                status: 'CLOSED'
              }
            });

            await tx.orderExecutionLog.create({
              data: {
                tradeRecordId: trade.id,
                actionType: 'ORDER_CLOSED',
                rawPayload: JSON.stringify({ closePrice: currentPrice, profitAmount, closedAt: new Date(), reason })
              }
            });
          });
        }
      }
    } catch (err: any) {
      console.error('[TradingBotWorker] Error checking position closures:', err.message);
    }
  }

  private calculateRSI(prices: number[], period: number = 14): number | null {
    if (!prices || prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) {
        gains += diff;
      } else {
        losses -= diff;
      }
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  private calculateEMA(prices: number[], period: number): number | null {
    if (!prices || prices.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
}
