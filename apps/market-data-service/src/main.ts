import { NestFactory } from '@nestjs/core';
import { MarketDataModule } from './market-data.module';
import { ProblemDetailsFilter } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(MarketDataModule);
  app.enableCors();
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.MARKET_DATA_PORT ?? 3002);
  console.log(`Market Data Service is running on: http://localhost:${process.env.MARKET_DATA_PORT ?? 3002}`);
}
bootstrap();
