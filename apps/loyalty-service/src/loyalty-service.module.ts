import { Module } from '@nestjs/common';
import { LoyaltyServiceController } from './loyalty-service.controller';
import { LoyaltyServiceService } from './loyalty-service.service';

@Module({
  imports: [],
  controllers: [LoyaltyServiceController],
  providers: [LoyaltyServiceService],
})
export class LoyaltyServiceModule {}
