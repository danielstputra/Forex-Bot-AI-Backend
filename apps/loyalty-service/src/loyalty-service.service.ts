import { Injectable } from '@nestjs/common';

@Injectable()
export class LoyaltyServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
