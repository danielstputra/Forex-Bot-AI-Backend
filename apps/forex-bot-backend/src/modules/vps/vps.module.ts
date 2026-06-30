import { Module } from '@nestjs/common';
import { VpsService } from './vps.service';
import { VpsController } from './vps.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VpsController],
  providers: [VpsService],
  exports: [VpsService]
})
export class VpsModule {}
