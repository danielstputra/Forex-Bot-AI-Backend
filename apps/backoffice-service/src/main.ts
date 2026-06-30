import { NestFactory } from '@nestjs/core';
import { BackofficeServiceModule } from './backoffice-service.module';
import { ProblemDetailsFilter } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(BackofficeServiceModule);
  app.enableCors();
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.BACKOFFICE_SERVICE_PORT ?? 3005);
  console.log(`Backoffice Service is running on: http://localhost:${process.env.BACKOFFICE_SERVICE_PORT ?? 3005}`);
}
bootstrap();
