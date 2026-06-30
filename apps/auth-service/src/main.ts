import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { ProblemDetailsFilter } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
