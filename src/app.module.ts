import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { MailModule } from './core/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { TradingEngineModule } from './modules/trading-engine/trading-engine.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { BackofficeModule } from './modules/backoffice/backoffice.module';
import { BrokerModule } from './modules/broker/broker.module';
import { VpsModule } from './modules/vps/vps.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { SupportModule } from './modules/support/support.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MarketModule } from './modules/market/market.module';
import { PammModule } from './modules/pamm/pamm.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { PriceAlertModule } from './modules/price-alert/price-alert.module';
import { SocialModule } from './modules/social/social.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { BacktestModule } from './modules/backtest/backtest.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [
    // Rate Limiting: 100 requests per 60 seconds
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    MailModule,
    AuthModule,
    TradingEngineModule,
    MarketDataModule,
    ReportingModule,
    BackofficeModule,
    BrokerModule,
    VpsModule,
    WalletModule,
    AffiliateModule,
    SupportModule,
    LoyaltyModule,
    TenantModule,
    MarketModule,
    PammModule,
    DeveloperModule,
    PriceAlertModule,
    SocialModule,
    InboxModule,
    BacktestModule,
    SubscriptionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
