import { Module } from '@nestjs/common';
import { PammService } from './pamm.service';
import { PammController } from './pamm.controller';
import { PrismaModule } from '@app/shared';

@Module({
  imports: [PrismaModule],
  providers: [PammService],
  controllers: [PammController],
  exports: [PammService]
})
export class PammModule { }
