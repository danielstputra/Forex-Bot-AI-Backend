import { Module } from '@nestjs/common';
import { MarketDataGateway } from './market-data.gateway';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

@Module({
  controllers: [MarketDataController],
  providers: [MarketDataGateway, MarketDataService],
  exports: [MarketDataGateway, MarketDataService],
})
export class MarketDataModule {}
