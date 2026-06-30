import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyServiceController } from './loyalty-service.controller';
import { LoyaltyServiceService } from './loyalty-service.service';

describe('LoyaltyServiceController', () => {
  let loyaltyServiceController: LoyaltyServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyServiceController],
      providers: [LoyaltyServiceService],
    }).compile();

    loyaltyServiceController = app.get<LoyaltyServiceController>(LoyaltyServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(loyaltyServiceController.getHello()).toBe('Hello World!');
    });
  });
});
