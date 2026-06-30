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

  // 3.2 Reverse Proxy Gateway Routing
  const { createProxyMiddleware } = require('http-proxy-middleware');
  console.log('[Gateway] Registering Microservice Proxies...');
  
  // Auth Service (Port 3001)
  app.use('/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
  }));

  // Market Data Service (Port 3002) - Supports WebSockets
  app.use('/socket.io', createProxyMiddleware({ 
    target: process.env.MARKET_DATA_SERVICE_URL || 'http://localhost:3002', 
    changeOrigin: true, 
    ws: true,
  }));

  // Strategy & Signal Service (Port 3003)
  app.use('/trading', createProxyMiddleware({
    target: process.env.STRATEGY_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
  }));

  // Order & Execution Service (Port 3004)
  app.use('/pamm', createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
  }));
  app.use('/wallet', createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
  }));
  app.use('/wallets', createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
  }));
  app.use('/social', createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
  }));

  // Backoffice & Analytics Service (Port 3005)
  app.use('/backoffice', createProxyMiddleware({
    target: process.env.BACKOFFICE_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
  }));
  app.use('/reporting', createProxyMiddleware({
    target: process.env.BACKOFFICE_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
  }));
  app.use('/tenant', createProxyMiddleware({
    target: process.env.BACKOFFICE_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
  }));
  app.use('/subscription', createProxyMiddleware({
    target: process.env.BACKOFFICE_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
  }));

  console.log('[Gateway] Microservice Proxies registered successfully.');

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
