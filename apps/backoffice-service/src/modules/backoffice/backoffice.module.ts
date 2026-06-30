import { Module } from '@nestjs/common';
import { BackofficeService } from './backoffice.service';
import { BackofficeController } from './backoffice.controller';
import { TenantInitController } from './tenant-init.controller';
import { PrismaModule } from '@app/shared';

@Module({
  imports: [PrismaModule],
  controllers: [BackofficeController, TenantInitController],
  providers: [BackofficeService],
  exports: [BackofficeService],
})
export class BackofficeModule {}
