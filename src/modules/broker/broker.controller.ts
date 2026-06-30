import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('broker')
@UseGuards(JwtAuthGuard)
export class BrokerController {
  constructor(private brokerService: BrokerService) {}

  @Post('link')
  async linkAccount(@Request() req: any, @Body() body: any) {
    return this.brokerService.linkAccount(req.user.sub, body);
  }

  @Get('accounts')
  async getAccounts(@Request() req: any) {
    return this.brokerService.getAccounts(req.user.sub);
  }

  @Post('sync/:accountId')
  async syncAccount(@Request() req: any, @Param('accountId') accountId: string) {
    return this.brokerService.syncAccount(req.user.sub, accountId);
  }

  @Get('sync-logs/:accountId')
  async getSyncLogs(@Request() req: any, @Param('accountId') accountId: string) {
    return this.brokerService.getSyncLogs(req.user.sub, accountId);
  }
}
