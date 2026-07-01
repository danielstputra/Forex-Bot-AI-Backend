import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RequestPayoutDto } from './dto/affiliate.dto';

@Controller('affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateController {
  constructor(private affiliateService: AffiliateService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.affiliateService.getStats(req.user.sub);
  }

  @Post('payout')
  async requestPayout(@Request() req: any, @Body() body: RequestPayoutDto) {
    return this.affiliateService.requestPayout(req.user.sub, body);
  }
}
