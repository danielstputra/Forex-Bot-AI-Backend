import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BacktestPersistenceService } from './backtest.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('backtest')
@UseGuards(JwtAuthGuard)
export class BacktestController {
  constructor(private backtestService: BacktestPersistenceService) {}

  @Get('history')
  async getHistory(@Request() req: any) {
    return this.backtestService.getHistory(req.user.id);
  }

  @Post('save')
  async saveResult(@Request() req: any, @Body() body: any) {
    return this.backtestService.saveResult(req.user.id, body);
  }

  @Delete('history/:id')
  async deleteHistory(@Request() req: any, @Param('id') id: string) {
    return this.backtestService.deleteHistory(req.user.id, id);
  }
}
