import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '@app/shared';
import * as express from 'express';

@Controller('reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('excel')
  async downloadExcelReport(@Request() req: any, @Res() res: express.Response) {
    return this.tradingExcelReport(req.user.sub, res);
  }

  // Helper mapping to avoid naming conflict
  private async tradingExcelReport(userId: string, res: express.Response) {
    return this.reportingService.generateExcelReport(userId, res);
  }
}
