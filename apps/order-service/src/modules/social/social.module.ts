import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { PrismaModule } from '@app/shared';

@Module({
  imports: [PrismaModule],
  providers: [SocialService],
  controllers: [SocialController],
  exports: [SocialService]
})
export class SocialModule {}
