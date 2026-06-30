import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService]
})
export class MarketModule {}
