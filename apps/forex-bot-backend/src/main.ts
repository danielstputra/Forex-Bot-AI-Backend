import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { getRsaKeys } from './core/auth/jwt-rsa.helper';
import { PrismaClient } from '@prisma/client';
import { ProblemDetailsFilter } from '@app/shared';

const prisma = new PrismaClient();

async function bootstrap() {
  // 1. Pre-generate RSA Keys for RS256 JWT
  console.log('[Bootstrap] Initializing RSA Keys...');
  const keys = getRsaKeys();
  console.log('[Bootstrap] RSA Private/Public Keypair loaded successfully.');

  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailsFilter());

  // 2. Security Middleware
  app.use(helmet());

  // 3. CORS Configuration
  app.enableCors({
    origin: true, // Dynamic origin matching, required when credentials: true
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3.1 Tenant Identification Middleware (Host-to-Tenant Mapping)
  app.use(async (req: any, res: any, next: any) => {
    const host = req.headers.host || '';
    const domain = host.split(':')[0];

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { domain },
        select: { id: true }
      });
      if (tenant) {
        req.headers['x-tenant-id'] = tenant.id;
      }
    } catch (err: any) {
      console.error('[Gateway] Tenant lookup error:', err.message);
    }
    next();
  });

  console.log('[Gateway] AppModule loaded with all business modules.');

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
