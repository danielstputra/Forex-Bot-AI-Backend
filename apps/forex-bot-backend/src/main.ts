import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { getRsaKeys } from './core/auth/jwt-rsa.helper';
import { PrismaClient } from '@prisma/client';
import { ProblemDetailsFilter } from '@app/shared';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // 5. Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Forex Bot AI - Enterprise Trading Platform API')
    .setDescription(`
**Sistem Infrastruktur Backend B2B2C Skala Enterprise**
Dokumentasi resmi untuk seluruh endpoint API yang mencakup manajemen Multi-Tenant, Keamanan Sistem, Algoritma Trading AI (Automated Trading), Subscription, Real-Time Market Data, serta Integrasi Finansial (Broker/Wallet/VPS).

### Informasi Rilis
- **Author**: Daniels Trysyahputra
- **Tanggal Update/Rilis**: 1 Juli 2026
- **Arsitektur**: Clean Architecture (CQRS) & White-Label Orchestration
- **Keamanan**: Wajib menggunakan JWT Bearer Token untuk endpoint yang dilindungi.

*Gunakan token JWT yang didapat dari endpoint Login untuk mengakses fitur terkunci.*
    `.trim())
    .setVersion('1.0.0')
    .setContact('Daniels Trysyahputra', 'https://github.com/danielstputra', 'danielstputra@gmail.com')
    .setExternalDoc('Postman Collection (JSON)', '/api/docs-json')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    yamlDocumentUrl: 'api/docs-yaml',
    swaggerOptions: {
      persistAuthorization: true,
    }
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`[Bootstrap] Forex Bot AI Backend is running on: http://localhost:${port}`);
}
bootstrap();
