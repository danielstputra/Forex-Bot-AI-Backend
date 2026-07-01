import { Controller, Get, Query } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('history')
  async getHistoricalData(
    @Query('pair') pair: string,
    @Query('range') range?: string,
    @Query('interval') interval?: string,
  ) {
    if (!pair) {
      return { error: 'Pair is required' };
    }
    
    const data = await this.marketDataService.getHistoricalData(pair, range, interval);
    return { data };
  }
}
