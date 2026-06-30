import { Module } from '@nestjs/common';
import { BackofficeService } from './backoffice.service';
import { BackofficeController } from './backoffice.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BackofficeController],
  providers: [BackofficeService],
  exports: [BackofficeService],
})
export class BackofficeModule {}
