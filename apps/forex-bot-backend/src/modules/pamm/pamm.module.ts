import { Module } from '@nestjs/common';
import { PammService } from './pamm.service';
import { PammController } from './pamm.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [PammService],
  controllers: [PammController],
  exports: [PammService]
})
export class PammModule { }
