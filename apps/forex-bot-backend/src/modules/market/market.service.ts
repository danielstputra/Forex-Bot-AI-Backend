import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getEconomicEvents() {
    let events = await this.prisma.economicEvent.findMany({
      orderBy: { time: 'asc' }
    });

    const now = new Date();
    
    // Refresh events if database is empty or if they are from a past day
    const needsRefresh = events.length === 0 || 
      new Date(events[0].eventDate).toDateString() !== now.toDateString();

    if (needsRefresh) {
      await this.prisma.economicEvent.deleteMany({});
      
      const defaults = [
        {
          time: '09:30',
          currency: 'AUD',
          event: 'CPI y/y',
          impact: 'LOW',
          previous: '3.5%',
          forecast: '3.4%',
          actual: '3.4%',
          eventDate: new Date()
        },
        {
          time: '13:00',
          currency: 'GBP',
          event: 'GDP m/m',
          impact: 'MEDIUM',
          previous: '0.4%',
          forecast: '0.2%',
          actual: '0.1%',
          eventDate: new Date()
        },
        {
          time: '16:00',
          currency: 'EUR',
          event: 'CPI Flash Estimate y/y',
          impact: 'MEDIUM',
          previous: '2.4%',
          forecast: '2.6%',
          actual: '2.6%',
          eventDate: new Date()
        },
        {
          time: '19:30',
          currency: 'USD',
          event: 'Non-Farm Employment Change (NFP)',
          impact: 'HIGH',
          previous: '175K',
          forecast: '185K',
          actual: null,
          eventDate: new Date()
        },
        {
          time: '19:30',
          currency: 'USD',
          event: 'Unemployment Rate',
          impact: 'HIGH',
          previous: '3.9%',
          forecast: '3.9%',
          actual: null,
          eventDate: new Date()
        },
        {
          time: '21:00',
          currency: 'USD',
          event: 'Federal Funds Rate (Fed Interest Rate Decision)',
          impact: 'HIGH',
          previous: '5.50%',
          forecast: '5.50%',
          actual: null,
          eventDate: new Date()
        }
      ];

      for (const d of defaults) {
        await this.prisma.economicEvent.create({ data: d });
      }
      
      events = await this.prisma.economicEvent.findMany({
        orderBy: { time: 'asc' }
      });
    }

    // Dynamically release results if the event time has passed today
    let updated = false;
    for (const event of events) {
      if (event.actual === null) {
        const [hours, minutes] = event.time.split(':').map(Number);
        const eventTime = new Date();
        eventTime.setHours(hours, minutes, 0, 0);

        if (now >= eventTime) {
          let simulatedActual = event.forecast;
          if (event.event.includes('NFP')) {
            simulatedActual = '192K';
          } else if (event.event.includes('Unemployment')) {
            simulatedActual = '3.8%';
          } else if (event.event.includes('Rate')) {
            simulatedActual = '5.50%';
          }

          await this.prisma.economicEvent.update({
            where: { id: event.id },
            data: { actual: simulatedActual }
          });
          event.actual = simulatedActual;
          updated = true;
        }
      }
    }

    if (updated) {
      events = await this.prisma.economicEvent.findMany({
        orderBy: { time: 'asc' }
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
