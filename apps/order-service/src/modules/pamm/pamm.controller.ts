import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PammService } from './pamm.service';
import { JwtAuthGuard } from '@app/shared';

@Controller('pamm')
@UseGuards(JwtAuthGuard)
export class PammController {
  constructor(private pammService: PammService) {}

  @Get('pools')
  async getPools(@Request() req: any) {
    return this.pammService.getPools(req.user.id);
  }

  @Post('pools')
  async createPool(@Request() req: any, @Body() body: any) {
    return this.pammService.createPool(req.user.id, body);
  }

  @Get('pools/:id/investors')
  async getPoolInvestors(@Param('id') id: string) {
    return this.pammService.getPoolInvestors(id);
  }

  @Post('pools/:id/allocation')
  async updateAllocation(@Param('id') id: string, @Body() body: any) {
    return this.pammService.updateAllocation(id, body);
  }

  @Get('payouts')
  async getPayouts(@Request() req: any) {
    return this.pammService.getPayouts(req.user.id);
  }
}
