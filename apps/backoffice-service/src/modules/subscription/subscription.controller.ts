import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '@app/shared';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('current')
  async getCurrent(@Request() req: any) {
    return this.subscriptionService.getCurrentSubscription(req.user.id);
  }

  @Get('invoices')
  async getInvoices(@Request() req: any) {
    return this.subscriptionService.getInvoices(req.user.id);
  }

  @Post('upgrade')
  async upgrade(@Request() req: any, @Body() body: any) {
    return this.subscriptionService.upgrade(req.user.id, body);
  }
}
