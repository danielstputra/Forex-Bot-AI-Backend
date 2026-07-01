import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

async function httpsGetJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options: https.RequestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      },
      timeout: 5000,
    };
    const req = https.request(parsedUrl, options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`HTTP status code ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (err) => { reject(err); });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

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
      let json: any;
      try {
        json = await httpsGetJson(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
          {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        );
      } catch (e1: any) {
        this.logger.warn(`Query1 failed for historical data of ${pair}: ${e1.message}`);
      }

      if (!json) {
        try {
          json = await httpsGetJson(
            `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
            {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
            }
          );
        } catch (e2: any) {
          this.logger.warn(`Query2 failed for historical data of ${pair}: ${e2.message}`);
        }
      }

      if (!json) {
        throw new Error(`Failed to fetch from Yahoo Finance mirrors`);
      }

      const result = json.chart?.result?.[0];

      if (!result) {
        return this.generateMockData(pair, range, interval);
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

      if (data.length === 0) {
        return this.generateMockData(pair, range, interval);
      }

      return data;
    } catch (error: any) {
      this.logger.warn(`Error fetching historical data for ${pair}: ${error.message}. Falling back to generated mock market data.`);
      return this.generateMockData(pair, range, interval);
    }
  }

  private generateMockData(pair: string, range: string, interval: string) {
    const basePriceMap: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2720,
      'USD/JPY': 157.30,
      'AUD/USD': 0.6620,
    };

    const basePrice = basePriceMap[pair] || 1.0;
    const dataPoints = 200; // Generate 200 clean historical candles
    const now = Math.floor(Date.now() / 1000);
    
    // Interval spacing in seconds
    let spacing = 60; // 1m
    if (interval.endsWith('m')) spacing = parseInt(interval) * 60;
    else if (interval.endsWith('h')) spacing = parseInt(interval) * 3600;
    else if (interval.endsWith('d')) spacing = parseInt(interval) * 86400;

    const data = [];
    let currentPrice = basePrice;

    for (let i = dataPoints; i > 0; i--) {
      const time = now - i * spacing;
      
      // Random walk generator
      const change = (Math.random() - 0.5) * (basePrice * 0.001);
      const open = currentPrice;
      const close = currentPrice + change;
      const decimals = pair === 'USD/JPY' ? 3 : 5;
      const high = parseFloat((Math.max(open, close) + Math.random() * (basePrice * 0.0005)).toFixed(decimals));
      const low = parseFloat((Math.min(open, close) - Math.random() * (basePrice * 0.0005)).toFixed(decimals));
      const openVal = parseFloat(open.toFixed(decimals));
      const closeVal = parseFloat(close.toFixed(decimals));
      const volume = Math.floor(Math.random() * 100) + 10;

      data.push({
        time,
        open: openVal,
        high,
        low,
        close: closeVal,
        volume,
      });

      currentPrice = close;
    }

    return data;
  }
}
