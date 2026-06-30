import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { getRsaKeys } from './core/auth/jwt-rsa.helper';

async function bootstrap() {
  // 1. Pre-generate RSA Keys for RS256 JWT
  console.log('[Bootstrap] Initializing RSA Keys...');
  const keys = getRsaKeys();
  console.log('[Bootstrap] RSA Private/Public Keypair loaded successfully.');

  const app = await NestFactory.create(AppModule);

  // 2. Security Middleware
  app.use(helmet());

  // 3. CORS Configuration
  app.enableCors({
    origin: '*', // Allow all origins for local testing and cross-origin simulation
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 4. Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`[Bootstrap] Forex Bot AI Backend is running on: http://localhost:${port}`);
}
bootstrap();
