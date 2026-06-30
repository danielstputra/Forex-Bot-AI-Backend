import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
