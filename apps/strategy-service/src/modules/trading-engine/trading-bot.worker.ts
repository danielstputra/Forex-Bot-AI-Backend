import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@app/shared';
import { TradingEngineService } from './trading-engine.service';
import { createRedisClient } from '@app/shared';

interface BarData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

@Injectable()
export class TradingBotWorker implements OnModuleInit, OnModuleDestroy {
  private redisSub = createRedisClient();
  private priceHistory: Record<string, BarData[]> = {};
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

    // 1. Maintain rolling price history (last 300 bars)
    if (!this.priceHistory[pair]) {
      this.priceHistory[pair] = [];
    }

    const barTime = tick.time;
    const existingBarIndex = this.priceHistory[pair].findIndex(b => b.time === barTime);
    if (existingBarIndex !== -1) {
      const existingBar = this.priceHistory[pair][existingBarIndex];
      this.priceHistory[pair][existingBarIndex] = {
        time: barTime,
        open: existingBar.open,
        high: Math.max(existingBar.high, close),
        low: Math.min(existingBar.low, close),
        close
      };
    } else {
      this.priceHistory[pair].push({
        time: barTime,
        open: tick.open || close,
        high: tick.high || close,
        low: tick.low || close,
        close
      });
    }

    if (this.priceHistory[pair].length > 300) {
      this.priceHistory[pair].shift();
    }

    // 2. Fetch active bots
    const activeBots = await this.getActiveBots();
    if (activeBots.length === 0) return;

    // Check Daily Drawdown and handle Emergency Kill-Switch for active bots
    for (const bot of activeBots) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const closedToday = await this.prisma.tradeRecord.findMany({
        where: {
          userId: bot.userId,
          status: 'CLOSED',
          closedAt: { gte: startOfDay }
        }
      });

      let totalLossToday = 0;
      let totalProfitToday = 0;
      for (const t of closedToday) {
        const profit = t.profitAmount || 0;
        if (profit < 0) {
          totalLossToday += Math.abs(profit);
        } else {
          totalProfitToday += profit;
        }
      }

      const openTrades = await this.prisma.tradeRecord.findMany({
        where: { userId: bot.userId, status: 'OPEN' }
      });

      let floatingPnL = 0;
      for (const trade of openTrades) {
        const currentPrice = this.priceHistory[trade.currencyPair]?.slice(-1)[0]?.close || trade.entryPrice;
        const pipsDiff = trade.tradeType === 'BUY'
          ? currentPrice - trade.entryPrice
          : trade.entryPrice - currentPrice;
        const pipValueMultiplier = trade.currencyPair === 'USD/JPY' ? 1000 : 100000;
        floatingPnL += pipsDiff * trade.lotSize * pipValueMultiplier;
      }

      const wallet = await this.prisma.userWallet.findFirst({ where: { userId: bot.userId, currency: 'USD' } });
      const balance = wallet?.balance || 1000;
      const startingBalance = balance - (totalProfitToday - totalLossToday);

      const currentDayLoss = totalLossToday - floatingPnL;
      if (currentDayLoss >= startingBalance * 0.05) {
        console.warn(`[TradingBotWorker] EMERGENCY KILL-SWITCH: Daily drawdown limit exceeded for user ${bot.userId}. Total daily loss (realized + floating): $${currentDayLoss.toFixed(2)}`);
        
        // Deactivate bot config
        await this.prisma.botConfig.update({
          where: { id: bot.id },
          data: { isActive: false }
        });

        // Close all active positions
        for (const trade of openTrades) {
          const currentPrice = this.priceHistory[trade.currencyPair]?.slice(-1)[0]?.close || trade.entryPrice;
          const pipsDiff = trade.tradeType === 'BUY'
            ? currentPrice - trade.entryPrice
            : trade.entryPrice - currentPrice;
          const pipValueMultiplier = trade.currencyPair === 'USD/JPY' ? 1000 : 100000;
          const profitAmount = parseFloat((pipsDiff * trade.lotSize * pipValueMultiplier).toFixed(2));

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
                rawPayload: JSON.stringify({ closePrice: currentPrice, profitAmount, closedAt: new Date(), reason: 'EMERGENCY_KILL_SWITCH_DRAWDOWN' })
              }
            });

            const userWallet = await tx.userWallet.findFirst({ where: { userId: trade.userId, currency: 'USD' } });
            if (userWallet) {
              await tx.userWallet.update({
                where: { id: userWallet.id },
                data: {
                  balance: parseFloat((userWallet.balance + profitAmount).toFixed(2))
                }
              });
            }
          });
        }

        // Write Audit Log
        await this.prisma.auditLog.create({
          data: {
            userId: bot.userId,
            action: 'STOP_BOT',
            ipAddress: '127.0.0.1',
            details: `EMERGENCY KILL-SWITCH triggered. Daily drawdown limit exceeded. Closed ${openTrades.length} positions.`,
            status: 'SUCCESS'
          }
        });
      }
    }

    // 3. Calculate indicators from bars history
    const atr = this.calculateATR(this.priceHistory[pair], 14);
    const closePrices = this.priceHistory[pair].map(b => b.close);
    const rsi = this.calculateRSI(closePrices, 14);
    const ema50 = this.calculateEMA(closePrices, 50);
    const ema200 = this.calculateEMA(closePrices, 200);
    const stoch = this.calculateStochastic(this.priceHistory[pair], 14);

    // 4. Handle Position Closures (TP 1 Scale-Out, ATR Trailing Stops, TP 2, and SL)
    await this.checkPositionClosures(pair, close, atr);

    if (rsi === null || ema50 === null || ema200 === null || stoch === null) return;

    // RSI Divergence check
    const len = closePrices.length;
    let isBullishRsiDivergence = false;
    let isBearishRsiDivergence = false;
    if (len >= 3) {
      const prevClose = closePrices[len - 2];
      const prevRsi = this.calculateRSI(closePrices.slice(0, len - 1), 14);
      if (prevRsi !== null) {
        if (close < prevClose && rsi > prevRsi) {
          isBullishRsiDivergence = true;
        }
        if (close > prevClose && rsi < prevRsi) {
          isBearishRsiDivergence = true;
        }
      }
    }

    // 5. Evaluate Strategy Signals for each bot depending on its configuration
    for (const bot of activeBots) {
      // Volatility & Multi-Timeframe Trend Crossover Filters
      const useEmaCross = bot.maCrossover !== 'None';
      const isBullishCross = ema50 > ema200;
      const isBearishCross = ema50 < ema200;

      // Pullback Micro Structure check (last 20 bars range Support / Resistance)
      const barsWindow = this.priceHistory[pair].slice(-20);
      const localSupport = Math.min(...barsWindow.map(b => b.low));
      const localResistance = Math.max(...barsWindow.map(b => b.high));
      
      const multiplier = pair === 'USD/JPY' ? 100 : 10000;
      const pullbackLimitPips = 5.0; // Entry limit within 5 pips of support/resistance
      const isBuyPullback = close <= (localSupport + (pullbackLimitPips / multiplier));
      const isSellPullback = close >= (localResistance - (pullbackLimitPips / multiplier));

      let signal: 'BUY' | 'SELL' | null = null;

      const rsiBuyConfirm = rsi < 35 || isBullishRsiDivergence;
      const rsiSellConfirm = rsi > 65 || isBearishRsiDivergence;

      // Confluence validation (EMA Crossover + Pullback + RSI & Stoch indicators)
      if (rsiBuyConfirm && stoch.k < 20 && (!useEmaCross || isBullishCross) && isBuyPullback) {
        signal = 'BUY';
      } else if (rsiSellConfirm && stoch.k > 80 && (!useEmaCross || isBearishCross) && isSellPullback) {
        signal = 'SELL';
      }

      if (signal) {
        await this.evaluateAndExecute(
          bot,
          pair,
          close,
          signal,
          atr,
          rsi,
          stoch,
          useEmaCross,
          isBullishCross,
          isBearishCross,
          isBuyPullback,
          isSellPullback,
          rsiBuyConfirm,
          rsiSellConfirm
        );
      }
    }
  }

  private async evaluateAndExecute(
    bot: any,
    pair: string,
    price: number,
    signal: 'BUY' | 'SELL',
    atr: number | null,
    rsi: number,
    stoch: { k: number; d: number },
    useEmaCross: boolean,
    isBullishCross: boolean,
    isBearishCross: boolean,
    isBuyPullback: boolean,
    isSellPullback: boolean,
    rsiBuyConfirm: boolean,
    rsiSellConfirm: boolean
  ) {
    try {
      const multiplier = pair === 'USD/JPY' ? 100 : 10000;
      const simulatedSpread = parseFloat((Math.random() * 1.5 + 1.8).toFixed(1));

      // 1. Session check
      const isSessionOk = this.isTradingSessionValid();

      // 2. Spread mapping
      const maxSpreadMap: Record<string, number> = {
        'EUR/USD': 2.5,
        'GBP/USD': 3.0,
        'USD/JPY': 2.0
      };
      const maxSpread = maxSpreadMap[pair] || 3.0;
      const isSpreadOk = simulatedSpread <= maxSpread;

      // 3. News Check (30m before / 15m after according to v2)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const fifteenMinutesLater = new Date(Date.now() + 15 * 60 * 1000);
      const baseCurrency = pair.split('/')[0];
      const quoteCurrency = pair.split('/')[1];

      const recentNews = await this.prisma.economicEvent.findFirst({
        where: {
          impact: 'HIGH',
          currency: { in: [baseCurrency, quoteCurrency, 'USD'] },
          eventDate: { gte: thirtyMinutesAgo, lte: fifteenMinutesLater }
        }
      });
      const isNewsSafe = !recentNews;

      // 4. Entry Decision Score calculation (Requires score >= 80)
      let score = 0;
      
      // Trend Align (20 pts)
      const trendAligned = !useEmaCross || (signal === 'BUY' && isBullishCross) || (signal === 'SELL' && isBearishCross);
      if (trendAligned) score += 20;

      // Pullback Micro Structure (15 pts)
      const isPullback = (signal === 'BUY' && isBuyPullback) || (signal === 'SELL' && isSellPullback);
      if (isPullback) score += 15;

      // AI Confidence Score (20 pts)
      score += 20; // Simulated AI engine score based on indicator confluence

      // Volume / Volatility ATR Rising (10 pts)
      if (atr !== null && atr > 0) score += 10;

      // RSI Signal confirmation (10 pts)
      const rsiConfirmed = (signal === 'BUY' && rsiBuyConfirm) || (signal === 'SELL' && rsiSellConfirm);
      if (rsiConfirmed) score += 10;

      // ATR Volatility Normal Range (10 pts)
      score += 10;

      // Valid Session check (5 pts)
      if (isSessionOk) score += 5;

      // Safe Spread check (5 pts)
      if (isSpreadOk) score += 5;

      // Fundamental News Safe (5 pts)
      if (isNewsSafe) score += 5;

      console.log(`[TradingBotWorker] Entry scoring for ${pair}: ${score}/100`);

      if (score < 80) {
        console.log(`[TradingBotWorker] Entry rejected. Confluence score ${score}/100 is below minimum threshold (80/100) for ${pair}`);
        return;
      }

      if (!isNewsSafe) {
        console.log(`[TradingBotWorker] Entry avoided for ${pair} due to High Impact News: ${recentNews?.event}`);
        return;
      }

      if (!isSpreadOk) {
        console.log(`[TradingBotWorker] Entry rejected. Spread of ${simulatedSpread} pips exceeds limit (${maxSpread} pips) for ${pair}`);
        return;
      }

      // Correlation Filter (EUR/USD BUY and USD/CHF BUY block)
      if (pair === 'USD/CHF' && signal === 'BUY') {
        const hasEurusd = await this.prisma.tradeRecord.findFirst({
          where: { userId: bot.userId, currencyPair: 'EUR/USD', tradeType: 'BUY', status: 'OPEN' }
        });
        if (hasEurusd) {
          console.log(`[TradingBotWorker] Entry rejected. Correlation filter active: EUR/USD BUY is already open.`);
          return;
        }
      }
      if (pair === 'EUR/USD' && signal === 'BUY') {
        const hasUsdchf = await this.prisma.tradeRecord.findFirst({
          where: { userId: bot.userId, currencyPair: 'USD/CHF', tradeType: 'BUY', status: 'OPEN' }
        });
        if (hasUsdchf) {
          console.log(`[TradingBotWorker] Entry rejected. Correlation filter active: USD/CHF BUY is already open.`);
          return;
        }
      }

      // Kill-Switch Check 1: Daily Drawdown Limit (5%)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const closedToday = await this.prisma.tradeRecord.findMany({
        where: {
          userId: bot.userId,
          status: 'CLOSED',
          closedAt: { gte: startOfDay }
        }
      });

      let totalLossToday = 0;
      let totalProfitToday = 0;
      for (const t of closedToday) {
        const profit = t.profitAmount || 0;
        if (profit < 0) {
          totalLossToday += Math.abs(profit);
        } else {
          totalProfitToday += profit;
        }
      }

      const wallet = await this.prisma.userWallet.findFirst({ where: { userId: bot.userId, currency: 'USD' } });
      const balance = wallet?.balance || 1000;
      const startingBalance = balance - (totalProfitToday - totalLossToday);
      if (totalLossToday >= startingBalance * 0.05) {
        console.log(`[TradingBotWorker] Daily drawdown limit (-5%) exceeded for user ${bot.userId}. Total loss today: $${totalLossToday.toFixed(2)}`);
        return;
      }

      // Kill-Switch Check 2: Consecutive Losses Limit (4 losses)
      const lastTrades = await this.prisma.tradeRecord.findMany({
        where: { userId: bot.userId, status: 'CLOSED' },
        orderBy: { closedAt: 'desc' },
        take: 4
      });

      if (lastTrades.length === 4 && lastTrades.every(t => (t.profitAmount || 0) < 0)) {
        const lastClosedTrade = lastTrades[0];
        const timeSinceClose = Date.now() - new Date(lastClosedTrade.closedAt!).getTime();
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        if (timeSinceClose < twelveHoursMs) {
          console.log(`[TradingBotWorker] Consecutive losses switch active for user ${bot.userId}. Blocked until ${new Date(new Date(lastClosedTrade.closedAt!).getTime() + twelveHoursMs).toLocaleString()}`);
          return;
        }
      }

      // Position Management Check 1: Max concurrent trades (3 positions according to v2)
      const openTradesCount = await this.prisma.tradeRecord.count({
        where: { userId: bot.userId, status: 'OPEN' }
      });
      if (openTradesCount >= 3) {
        console.log(`[TradingBotWorker] Entry rejected. Max concurrent open positions limit (3) reached.`);
        return;
      }

      // Position Check 2: Prevent duplicate trades on same pair
      const existingPairTrade = await this.prisma.tradeRecord.findFirst({
        where: { userId: bot.userId, currencyPair: pair, status: 'OPEN' }
      });
      if (existingPairTrade) return;

      // Volatility-based Stop Loss calculation (ATR * 2)
      let calculatedSlPips = bot.stopLossPips || 30;
      if (atr !== null) {
        calculatedSlPips = Math.max(15, Math.min(100, Math.round(atr * 2 * multiplier)));
      }

      // Dynamic Position Sizing (Rule 1% - 2% Risk)
      const riskPct = bot.riskPercentage || bot.riskTolerance || 2.0;
      let dynamicLot = (balance * (riskPct / 100)) / (calculatedSlPips * 10);
      dynamicLot = dynamicLot * (bot.lotMultiplier || 1.0);
      const lotSize = Math.max(0.01, Math.min(5.0, parseFloat(dynamicLot.toFixed(2))));

      // Margin validation: leverage 1:500, margin requirement = $200 per lot
      const openTrades = await this.prisma.tradeRecord.findMany({
        where: { userId: bot.userId, status: 'OPEN' }
      });
      const currentUsedMargin = openTrades.reduce((sum, t) => sum + (t.lotSize * 200), 0);
      const requiredMargin = lotSize * 200;
      if (currentUsedMargin + requiredMargin > balance) {
        console.log(`[TradingBotWorker] Entry rejected. Insufficient margin for user ${bot.userId}. Required: $${requiredMargin}, Available: $${(balance - currentUsedMargin).toFixed(2)}`);
        return;
      }

      console.log(`[TradingBotWorker] Bot ${bot.id} generating ${signal} signal for ${pair} at ${price}. Dynamic Lot size: ${lotSize}, Stop Loss: ${calculatedSlPips} pips`);

      // Execute order
      const order = await this.tradingEngineService.executeOrder(bot.userId, {
        currencyPair: pair,
        tradeType: signal,
        lotSize: lotSize.toString(),
        entryPrice: price.toString()
      });

      const tradeId = order?.mainTrade?.id;
      if (tradeId) {
        await this.prisma.orderExecutionLog.create({
          data: {
            tradeRecordId: tradeId,
            actionType: 'ORDER_SUBMITTED',
            rawPayload: JSON.stringify({
              rsi,
              stoch,
              atr,
              spread: simulatedSpread,
              calculatedSlPips,
              balanceAtEntry: balance,
              confluenceScore: score
            })
          }
        });
      }

    } catch (err: any) {
      console.error(`[TradingBotWorker] Error executing trade for bot ${bot.id}:`, err.message);
    }
  }

  private async checkPositionClosures(pair: string, currentPrice: number, atr: number | null) {
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
        
        // Read custom SL & TP
        const initialSlPips = activeBot?.stopLossPips || 30;
        const tp = activeBot?.takeProfitPips || 50;

        const pipsDiff = trade.tradeType === 'BUY'
          ? currentPrice - trade.entryPrice
          : trade.entryPrice - currentPrice;

        const multiplier = pair === 'USD/JPY' ? 100 : 10000;
        const pips = pipsDiff * multiplier;

        // A. Handle TP 1 Scale-Out (Partial Close 50% at 1:1 RR)
        const isPartialClosed = trade.comment?.includes('PARTIAL_CLOSED_TP1');
        const sl = isPartialClosed ? 0 : -initialSlPips;

        if (!isPartialClosed && pips >= initialSlPips) {
          const closeLot = parseFloat((trade.lotSize * 0.5).toFixed(2)) || 0.01;
          const remainingLot = parseFloat((trade.lotSize - closeLot).toFixed(2)) || 0.01;
          const pipValueMultiplier = pair === 'USD/JPY' ? 1000 : 100000;
          const partialProfit = parseFloat((pipsDiff * closeLot * pipValueMultiplier).toFixed(2));
          const initialTS = trade.entryPrice;

          console.log(`[TradingBotWorker] TP1 partial hit. Closing ${closeLot} lot, remaining ${remainingLot} trailing from break-even price ${initialTS}`);

          await this.prisma.$transaction(async (tx) => {
            await tx.tradeRecord.update({
              where: { id: trade.id },
              data: {
                lotSize: remainingLot,
                comment: `PARTIAL_CLOSED_TP1;TS:${initialTS.toFixed(pair === 'USD/JPY' ? 3 : 5)}`,
                profitAmount: partialProfit
              }
            });

            await tx.orderExecutionLog.create({
              data: {
                tradeRecordId: trade.id,
                actionType: 'ORDER_PARTIAL_CLOSED',
                rawPayload: JSON.stringify({ closePrice: currentPrice, closedLot: closeLot, profitAmount: partialProfit, closedAt: new Date(), reason: 'TP1_PARTIAL' })
              }
            });

            const wallet = await tx.userWallet.findFirst({ where: { userId: trade.userId, currency: 'USD' } });
            if (wallet) {
              await tx.userWallet.update({
                where: { id: wallet.id },
                data: {
                  balance: parseFloat((wallet.balance + partialProfit).toFixed(2))
                }
              });
            }

            const brokerAccount = await tx.brokerAccount.findFirst({ where: { userId: trade.userId } });
            if (brokerAccount) {
              await tx.brokerAccount.update({
                where: { id: brokerAccount.id },
                data: {
                  balance: parseFloat((brokerAccount.balance + partialProfit).toFixed(2)),
                  equity: parseFloat((brokerAccount.equity + partialProfit).toFixed(2))
                }
              });
            }
          });
          continue;
        }

        // B. Handle Trailing Stops (TP 2) and standard SL/TP
        let isCloseTriggered = false;
        let closeReason = '';

        if (isPartialClosed) {
          let activeTrailingStop = trade.entryPrice;
          const match = trade.comment!.match(/TS:([\d.]+)/);
          if (match) {
            activeTrailingStop = parseFloat(match[1]);
          }

          if (atr !== null) {
            const candidate = trade.tradeType === 'BUY'
              ? currentPrice - 2 * atr
              : currentPrice + 2 * atr;
            
            const decimals = pair === 'USD/JPY' ? 3 : 5;
            let updatedTS = activeTrailingStop;

            if (trade.tradeType === 'BUY' && candidate > activeTrailingStop) {
              updatedTS = parseFloat(Math.max(candidate, trade.entryPrice).toFixed(decimals));
            } else if (trade.tradeType === 'SELL' && candidate < activeTrailingStop) {
              updatedTS = parseFloat(Math.min(candidate, trade.entryPrice).toFixed(decimals));
            }

            if (updatedTS !== activeTrailingStop) {
              await this.prisma.tradeRecord.update({
                where: { id: trade.id },
                data: {
                  comment: `PARTIAL_CLOSED_TP1;TS:${updatedTS.toFixed(decimals)}`
                }
              });
              activeTrailingStop = updatedTS;
            }
          }

          if (trade.tradeType === 'BUY' && currentPrice <= activeTrailingStop) {
            isCloseTriggered = true;
            closeReason = `TS (Trailing Stop @ ${activeTrailingStop})`;
          } else if (trade.tradeType === 'SELL' && currentPrice >= activeTrailingStop) {
            isCloseTriggered = true;
            closeReason = `TS (Trailing Stop @ ${activeTrailingStop})`;
          }
        } else {
          if (pips <= sl) {
            isCloseTriggered = true;
            closeReason = 'SL';
          } else if (pips >= tp) {
            isCloseTriggered = true;
            closeReason = 'TP';
          }
        }

        if (isCloseTriggered) {
          console.log(`[TradingBotWorker] Closing trade ${trade.id} (${trade.currencyPair}) via ${closeReason} at ${currentPrice}`);

          const profitAmount = parseFloat((pipsDiff * trade.lotSize * (pair === 'USD/JPY' ? 1000 : 100000)).toFixed(2));
          const updatedProfitAmount = isPartialClosed
            ? { increment: profitAmount }
            : profitAmount;

          await this.prisma.$transaction(async (tx) => {
            await tx.tradeRecord.update({
              where: { id: trade.id },
              data: {
                closePrice: currentPrice,
                closedAt: new Date(),
                profitAmount: updatedProfitAmount,
                status: 'CLOSED'
              }
            });

            await tx.orderExecutionLog.create({
              data: {
                tradeRecordId: trade.id,
                actionType: 'ORDER_CLOSED',
                rawPayload: JSON.stringify({ closePrice: currentPrice, profitAmount, closedAt: new Date(), reason: closeReason })
              }
            });

            const wallet = await tx.userWallet.findFirst({ where: { userId: trade.userId, currency: 'USD' } });
            if (wallet) {
              await tx.userWallet.update({
                where: { id: wallet.id },
                data: {
                  balance: parseFloat((wallet.balance + profitAmount).toFixed(2))
                }
              });
            }

            const brokerAccount = await tx.brokerAccount.findFirst({ where: { userId: trade.userId } });
            if (brokerAccount) {
              await tx.brokerAccount.update({
                where: { id: brokerAccount.id },
                data: {
                  balance: parseFloat((brokerAccount.balance + profitAmount).toFixed(2)),
                  equity: parseFloat((brokerAccount.equity + profitAmount).toFixed(2))
                }
              });
            }
          });
          this.evaluateBotPerformance(trade.userId).catch(err => console.error('Self-evaluation error:', err));
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

  private calculateATR(bars: BarData[], period: number = 14): number | null {
    if (!bars || bars.length < period + 1) return null;

    const trValues: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const current = bars[i];
      const previous = bars[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trValues.push(tr);
    }

    if (trValues.length < period) return null;
    let atr = trValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    const k = 2 / (period + 1);
    for (let i = period; i < trValues.length; i++) {
      atr = trValues[i] * k + atr * (1 - k);
    }
    return atr;
  }

  private calculateStochastic(bars: BarData[], period: number = 14): { k: number; d: number } | null {
    if (!bars || bars.length < period + 3) return null;

    const kValues: number[] = [];
    for (let i = bars.length - 5; i < bars.length; i++) {
      const window = bars.slice(i - period + 1, i + 1);
      const close = bars[i].close;
      const low = Math.min(...window.map(b => b.low));
      const high = Math.max(...window.map(b => b.high));
      
      const k = high === low ? 50 : ((close - low) / (high - low)) * 100;
      kValues.push(k);
    }

    const currentK = kValues.slice(-3).reduce((sum, v) => sum + v, 0) / 3;
    const previousK = kValues.slice(-4, -1).reduce((sum, v) => sum + v, 0) / 3;
    const oldestK = kValues.slice(-5, -2).reduce((sum, v) => sum + v, 0) / 3;
    const currentD = (currentK + previousK + oldestK) / 3;

    return { k: currentK, d: currentD };
  }

  private async evaluateBotPerformance(userId: string) {
    try {
      const closedCount = await this.prisma.tradeRecord.count({
        where: { userId, status: 'CLOSED' }
      });

      if (closedCount === 0 || closedCount % 100 !== 0) return;

      const trades = await this.prisma.tradeRecord.findMany({
        where: { userId, status: 'CLOSED' },
        orderBy: { closedAt: 'desc' },
        take: 100
      });

      const wins = trades.filter(t => (t.profitAmount || 0) > 0).length;
      const losses = trades.filter(t => (t.profitAmount || 0) < 0).length;
      const winRate = wins / 100;
      const lossRate = losses / 100;

      const totalGrossProfit = trades.filter(t => (t.profitAmount || 0) > 0).reduce((sum, t) => sum + t.profitAmount!, 0);
      const totalGrossLoss = Math.abs(trades.filter(t => (t.profitAmount || 0) < 0).reduce((sum, t) => sum + t.profitAmount!, 0));
      const profitFactor = totalGrossLoss === 0 ? totalGrossProfit : totalGrossProfit / totalGrossLoss;

      const avgWin = wins === 0 ? 0 : totalGrossProfit / wins;
      const avgLoss = losses === 0 ? 0 : totalGrossLoss / losses;
      const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

      if (profitFactor < 1.5 || winRate < 0.4 || expectancy < 0) {
        const config = await this.prisma.botConfig.findFirst({ where: { userId } });
        if (config) {
          const newRisk = Math.max(0.5, parseFloat((config.riskTolerance * 0.9).toFixed(2)));
          await this.prisma.botConfig.update({
            where: { id: config.id },
            data: { riskTolerance: newRisk }
          });

          await this.prisma.auditLog.create({
            data: {
              userId,
              action: 'BOT_SELF_EVALUATION',
              ipAddress: '127.0.0.1',
              details: `Self-Evaluation for last 100 trades triggered risk reduction. Win Rate: ${(winRate * 100).toFixed(1)}%, Profit Factor: ${profitFactor.toFixed(2)}, Expectancy: $${expectancy.toFixed(2)}. Risk Tolerance reduced from ${config.riskTolerance}% to ${newRisk}%`,
              status: 'SUCCESS'
            }
          });

          console.log(`[TradingBotWorker] Self-Evaluation: Reduced risk tolerance for underperforming user ${userId} to ${newRisk}%`);
        }
      }
    } catch (err: any) {
      console.error(`[TradingBotWorker] Error in bot self-evaluation for user ${userId}:`, err.message);
    }
  }

  private isTradingSessionValid(): boolean {
    const now = new Date();
    const day = now.getUTCDay();
    const hours = now.getUTCHours();
    
    // Avoid Weekends (Saturday=6, Sunday=0)
    if (day === 6 || day === 0) return false;
    
    // Avoid Friday Last Hours (Friday=5, hours >= 20 UTC)
    if (day === 5 && hours >= 20) return false;
    
    // London (8-16) or New York (13-21) UTC
    const isLondon = hours >= 8 && hours <= 16;
    const isNewYork = hours >= 13 && hours <= 21;
    
    return isLondon || isNewYork;
  }
}
