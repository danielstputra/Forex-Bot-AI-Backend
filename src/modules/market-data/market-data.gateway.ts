import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MarketDataGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private intervalId: NodeJS.Timeout | null = null;
  private fetchIntervalId: NodeJS.Timeout | null = null;
  
  // Base rates initialized with realistic defaults, updated via public API
  private basePrices: Record<string, number> = {
    'EUR/USD': 1.0852,
    'GBP/USD': 1.2724,
    'USD/JPY': 156.42,
    'AUD/USD': 0.6642,
  };

  private currentPrices: Record<string, number> = { ...this.basePrices };

  async handleConnection(client: Socket) {
    console.log(`[Socket.io] Client connected: ${client.id}`);
    
    // Fetch real rates immediately on first connection
    if (!this.fetchIntervalId) {
      await this.fetchRealExchangeRates();
      // Refresh real exchange rates every 30 seconds
      this.fetchIntervalId = setInterval(() => this.fetchRealExchangeRates(), 30000);
    }

    // Start broadcasting ticks if not already running
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        const tickData = this.generateTicks();
        this.server.emit('tick', tickData);
      }, 1000);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket.io] Client disconnected: ${client.id}`);
    
    const clientsCount = this.server?.sockets?.sockets?.size || 0;
    if (clientsCount === 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.fetchIntervalId) {
        clearInterval(this.fetchIntervalId);
        this.fetchIntervalId = null;
      }
    }
  }

  /**
   * Fetches real-world rates from open.er-api.com (free, no API key required)
   */
  private async fetchRealExchangeRates() {
    try {
      console.log('[MarketData] Fetching real-world exchange rates...');
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch from open.er-api.com');
      
      const json = await response.json();
      const rates = json.rates;
      
      if (rates) {
        // Convert USD-based rates to standard Forex pairs
        if (rates.EUR) this.basePrices['EUR/USD'] = parseFloat((1 / rates.EUR).toFixed(5));
        if (rates.GBP) this.basePrices['GBP/USD'] = parseFloat((1 / rates.GBP).toFixed(5));
        if (rates.JPY) this.basePrices['USD/JPY'] = parseFloat(rates.JPY.toFixed(3));
        if (rates.AUD) this.basePrices['AUD/USD'] = parseFloat((1 / rates.AUD).toFixed(5));
        
        console.log('[MarketData] Real-world exchange rates updated:', this.basePrices);
      }
    } catch (error) {
      console.error('[MarketData] Error fetching real exchange rates, using fallback:', error.message);
    }
  }

  private generateTicks() {
    const ticks = Object.keys(this.basePrices).map((pair) => {
      // Simulate real-time micro-fluctuations (spread) around the real base price
      const base = this.basePrices[pair];
      const change = (Math.random() - 0.5) * (pair === 'USD/JPY' ? 0.02 : 0.00015);
      
      this.currentPrices[pair] = parseFloat((base + change).toFixed(pair === 'USD/JPY' ? 3 : 5));
      const price = this.currentPrices[pair];
      
      return {
        pair,
        time: Math.floor(Date.now() / 1000),
        open: price - change,
        high: Math.max(price, price - change) + Math.random() * (pair === 'USD/JPY' ? 0.01 : 0.00005),
        low: Math.min(price, price - change) - Math.random() * (pair === 'USD/JPY' ? 0.01 : 0.00005),
        close: price,
        volume: Math.floor(5 + Math.random() * 45)
      };
    });

    return ticks;
  }
}
