import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown signals
  app.enableShutdownHooks();

  // Set global API version prefix
  app.setGlobalPrefix('api/v1');

  // Bind global exception formatting filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Bind global JSON envelope response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Configure global DTO validation pipes with production safeguards
  const isProduction = process.env.NODE_ENV === 'production';
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strip undecorated properties from payloads
      transform: true,            // Auto transform payload strings to types
      forbidNonWhitelisted: true, // Throw exception if undecorated properties exist
      disableErrorMessages: false, // Provide detailed validation logs
    })
  );

  // Production-safe CORS configuration
  const rawOrigins = process.env.CORS_ORIGINS || '';
  const configuredOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const defaultAllowedOrigins = [
    'https://eduerp.hyvorademo.in',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
    '*.hyvorademo.in',
    'hyvorademo.in',
    '*.hyvora.io',
    'hyvora.io',
    '*.vercel.app',
  ];

  const allowedOriginsList = [...configuredOrigins, ...defaultAllowedOrigins];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. server-to-server, mobile native, curl)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/^https?:\/\//, '').toLowerCase();

      const isAllowed = allowedOriginsList.some((pattern) => {
        if (pattern === '*' || pattern === origin) return true;
        const cleanPattern = pattern.replace(/^https?:\/\//, '').toLowerCase();

        if (cleanPattern.startsWith('*.')) {
          const rootDomain = cleanPattern.slice(2);
          return cleanOrigin === rootDomain || cleanOrigin.endsWith(`.${rootDomain}`);
        }

        return cleanOrigin === cleanPattern;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Academy-Subdomain',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // Initialize Swagger Open API documentation (Development / Configurable)
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('HYVORA EduERP API')
      .setDescription(
        'Enterprise REST API documentation for HYVORA EduERP multi-tenant ERP database portals.'
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 HYVORA EduERP Backend running in [${process.env.NODE_ENV || 'development'}] mode on port ${port}`);
}

bootstrap();
