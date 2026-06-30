import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaModule } from '@app/shared';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService]
})
export class TenantModule {}
