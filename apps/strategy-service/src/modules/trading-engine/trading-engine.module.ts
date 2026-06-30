import { Module } from '@nestjs/common';
import { TradingEngineService } from './trading-engine.service';
import { TradingEngineController } from './trading-engine.controller';
import { TradingBotWorker } from './trading-bot.worker';
import { SharedJwtModule, PrismaModule } from '@app/shared';

@Module({
  imports: [SharedJwtModule, PrismaModule],
  controllers: [TradingEngineController],
  providers: [TradingEngineService, TradingBotWorker],
  exports: [TradingEngineService]
})
export class TradingEngineModule {}
