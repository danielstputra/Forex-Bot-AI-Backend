import { Module } from '@nestjs/common';
import { PriceAlertService } from './price-alert.service';
import { PriceAlertController } from './price-alert.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PriceAlertService],
  controllers: [PriceAlertController],
  exports: [PriceAlertService]
})
export class PriceAlertModule {}
