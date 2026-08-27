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

  // Secure CORS configuration
  const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || !isProduction) {
        return callback(null, true);
      }
      // Check if origin matches allowed domains or wildcard subdomains
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*' || allowed === origin) return true;
        if (allowed.startsWith('https://*.')) {
          const domain = allowed.replace('https://*.', '');
          return origin.endsWith(`.${domain}`);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin violation: ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Academy-Subdomain', 'Accept'],
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
