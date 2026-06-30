import { NestFactory } from '@nestjs/core';
import { TradingEngineModule } from './modules/trading-engine/trading-engine.module';
import { ProblemDetailsFilter } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(TradingEngineModule);
  app.enableCors();
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.STRATEGY_SERVICE_PORT ?? 3003);
  console.log(`Strategy & Signal Service is running on: http://localhost:${process.env.STRATEGY_SERVICE_PORT ?? 3003}`);
}
bootstrap();
