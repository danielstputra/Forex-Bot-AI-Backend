import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly pairMap: Record<string, string> = {
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'USDJPY=X',
    'AUD/USD': 'AUDUSD=X',
  };

  async getHistoricalData(pair: string, range: string = '1d', interval: string = '1m') {
    const symbol = this.pairMap[pair];
    if (!symbol) {
      throw new Error('Unsupported pair');
    }

    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch from Yahoo Finance: ${response.statusText}`);
      }

      const json = await response.json();
      const result = json.chart?.result?.[0];

      if (!result) {
        return [];
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};

      const data = timestamps.map((time: number, index: number) => {
        return {
          time,
          open: quote.open?.[index] || null,
          high: quote.high?.[index] || null,
          low: quote.low?.[index] || null,
          close: quote.close?.[index] || null,
          volume: quote.volume?.[index] || 0,
        };
      }).filter((item: any) => item.close !== null);

      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching historical data for ${pair}: ${error.message}`);
      return [];
    }
  }
}
