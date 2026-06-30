import { Controller, Get } from '@nestjs/common';
import { LoyaltyServiceService } from './loyalty-service.service';

@Controller()
export class LoyaltyServiceController {
  constructor(private readonly loyaltyServiceService: LoyaltyServiceService) {}

  @Get()
  getHello(): string {
    return this.loyaltyServiceService.getHello();
  }
}
