import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService]
})
export class LoyaltyModule {}
