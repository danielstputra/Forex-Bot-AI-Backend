import { Module } from '@nestjs/common';
import { PammModule } from './modules/pamm/pamm.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SocialModule } from './modules/social/social.module';
import { PrismaModule, SharedJwtModule } from '@app/shared';

@Module({
  imports: [
    PrismaModule,
    SharedJwtModule,
    PammModule,
    WalletModule,
    SocialModule,
  ],
})
export class OrderServiceModule {}
