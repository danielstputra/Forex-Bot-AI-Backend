import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { ProblemDetailsFilter } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableCors();
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.ORDER_SERVICE_PORT ?? 3004);
  console.log(`Order & Execution Service is running on: http://localhost:${process.env.ORDER_SERVICE_PORT ?? 3004}`);
}
bootstrap();
