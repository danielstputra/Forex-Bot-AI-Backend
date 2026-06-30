import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.loyaltyService.getStatus(req.user.sub);
  }

  @Post('claim')
  async claimReward(@Request() req: any, @Body() body: any) {
    return this.loyaltyService.claimReward(req.user.sub, body);
  }
}
