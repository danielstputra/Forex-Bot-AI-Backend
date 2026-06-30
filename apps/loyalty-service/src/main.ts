import { NestFactory } from '@nestjs/core';
import { LoyaltyServiceModule } from './loyalty-service.module';

async function bootstrap() {
  const app = await NestFactory.create(LoyaltyServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
