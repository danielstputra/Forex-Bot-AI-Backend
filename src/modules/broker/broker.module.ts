import { Module } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { BrokerController } from './broker.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BrokerController],
  providers: [BrokerService],
  exports: [BrokerService]
})
export class BrokerModule {}
