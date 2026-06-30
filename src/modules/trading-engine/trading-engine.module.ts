import { Module } from '@nestjs/common';
import { TradingEngineService } from './trading-engine.service';
import { TradingEngineController } from './trading-engine.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TradingEngineController],
  providers: [TradingEngineService],
  exports: [TradingEngineService],
})
export class TradingEngineModule {}
