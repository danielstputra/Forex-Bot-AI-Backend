import { Module } from '@nestjs/common';
import { BackofficeModule } from './modules/backoffice/backoffice.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PrismaModule, SharedJwtModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    SharedJwtModule,
    BackofficeModule,
    ReportingModule,
    TenantModule,
    SubscriptionModule,
  ],
})
export class BackofficeServiceModule {}
