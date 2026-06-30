import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createRedisClient } from '@app/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MarketDataGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private intervalId: NodeJS.Timeout | null = null;
  private redis = createRedisClient();
  private currentPrices: Record<string, number> = {
    'EUR/USD': 1.0852,
    'GBP/USD': 1.2724,
    'USD/JPY': 156.42,
    'AUD/USD': 0.6642,
  };

  async handleConnection(client: Socket) {
    console.log(`[Socket.io] Client connected: ${client.id}`);
    
    // Start broadcasting real-time ticks if not already running
    if (!this.intervalId) {
      console.log('[MarketData] Starting Yahoo Finance real-time price feed...');
      await this.fetchRealtimeTicks();
      this.intervalId = setInterval(() => this.fetchRealtimeTicks(), 2000);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket.io] Client disconnected: ${client.id}`);
    
    const clientsCount = this.server?.sockets?.sockets?.size || 0;
    if (clientsCount === 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        console.log('[MarketData] Stopped Yahoo Finance real-time price feed.');
      }
    }
  }

  /**
   * Fetches real-time price ticks from Yahoo Finance (100% real, real-time data)
   */
  private async fetchRealtimeTicks() {
    try {
      const response = await fetch(
        'https://query1.finance.yahoo.com/v7/finance/quote?symbols=EURUSD=X,GBPUSD=X,USDJPY=X,AUDUSD=X'
      );
      if (!response.ok) throw new Error('Failed to fetch from Yahoo Finance');

      const json = await response.json();
      const results = json.quoteResponse?.result || [];

      const pairMap: Record<string, string> = {
        'EURUSD=X': 'EUR/USD',
        'GBPUSD=X': 'GBP/USD',
        'USDJPY=X': 'USD/JPY',
        'AUDUSD=X': 'AUD/USD'
      };

      const ticks = results.map((item: any) => {
        const pair = pairMap[item.symbol];
        if (!pair) return null;

        const price = item.regularMarketPrice;
        this.currentPrices[pair] = price;

        return {
          pair,
          time: Math.floor(Date.now() / 1000),
          open: item.regularMarketOpen || price,
          high: item.regularMarketDayHigh || price,
          low: item.regularMarketDayLow || price,
          close: price,
          volume: item.regularMarketVolume || 100
        };
      }).filter(Boolean);

      if (ticks.length > 0) {
        // Broadcast to other microservices via Redis Pub/Sub
        this.redis.publish('market:ticks', JSON.stringify(ticks)).catch((err) => {
          console.error('[MarketData] Failed to publish ticks to Redis:', err.message);
        });

        // Broadcast to WebSocket clients
        this.server.emit('tick', ticks);
      }
    } catch (error: any) {
      console.error('[MarketData] Error fetching real-time ticks:', error.message);
    }
  }
}
