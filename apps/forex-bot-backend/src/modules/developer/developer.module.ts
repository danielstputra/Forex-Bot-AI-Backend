import { Module } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeveloperService],
  controllers: [DeveloperController],
  exports: [DeveloperService]
})
export class DeveloperModule {}
