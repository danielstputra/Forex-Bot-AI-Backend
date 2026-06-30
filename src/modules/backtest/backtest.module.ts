import { Module } from '@nestjs/common';
import { BacktestPersistenceService } from './backtest.service';
import { BacktestController } from './backtest.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BacktestPersistenceService],
  controllers: [BacktestController],
  exports: [BacktestPersistenceService]
})
export class BacktestModule {}
