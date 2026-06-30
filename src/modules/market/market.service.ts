import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getEconomicEvents() {
    let events = await this.prisma.economicEvent.findMany({
      orderBy: { eventDate: 'asc' }
    });

    // Seed default economic events if none exist
    if (events.length === 0) {
      const defaults = [
        {
          time: '19:30',
          currency: 'USD',
          event: 'Non-Farm Employment Change (NFP)',
          impact: 'HIGH',
          previous: '175K',
          forecast: '185K',
          eventDate: new Date()
        },
        {
          time: '21:00',
          currency: 'USD',
          event: 'Federal Funds Rate (Fed Interest Rate Decision)',
          impact: 'HIGH',
          previous: '5.50%',
          forecast: '5.50%',
          eventDate: new Date()
        },
        {
          time: '16:00',
          currency: 'EUR',
          event: 'CPI Flash Estimate y/y',
          impact: 'MEDIUM',
          previous: '2.4%',
          forecast: '2.6%',
          eventDate: new Date()
        }
      ];

      for (const d of defaults) {
        await this.prisma.economicEvent.create({ data: d });
      }
      events = await this.prisma.economicEvent.findMany({
        orderBy: { eventDate: 'asc' }
      });
    }

    return events;
  }

  async getNewsSentiment() {
    let sentiments = await this.prisma.newsSentiment.findMany({
      orderBy: { analyzedAt: 'desc' }
    });

    // Seed default news sentiments if none exist
    if (sentiments.length === 0) {
      const defaults = [
        {
          currencyPair: 'EUR/USD',
          sentimentScore: 0.78,
          label: 'BULLISH',
          keywords: JSON.stringify(['ECB Hawk', 'Euro Strength', 'Fed Pivot'])
        },
        {
          currencyPair: 'GBP/USD',
          sentimentScore: 0.62,
          label: 'BULLISH',
          keywords: JSON.stringify(['BOE Inflation', 'Sterling Demand'])
        },
        {
          currencyPair: 'USD/JPY',
          sentimentScore: 0.24,
          label: 'BEARISH',
          keywords: JSON.stringify(['BOJ Intervention', 'Yen Recovery'])
        }
      ];

      for (const d of defaults) {
        await this.prisma.newsSentiment.create({ data: d });
      }
      sentiments = await this.prisma.newsSentiment.findMany({
        orderBy: { analyzedAt: 'desc' }
      });
    }

    return sentiments;
  }
}
