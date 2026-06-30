import { Controller, Get, UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(private marketService: MarketService) {}

  @Get('economic-events')
  async getEconomicEvents() {
    return this.marketService.getEconomicEvents();
  }

  @Get('news-sentiment')
  async getNewsSentiment() {
    return this.marketService.getNewsSentiment();
  }
}
