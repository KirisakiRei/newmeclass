import './config/preload-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AppModule } from './app.module';

const toOrigin = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
};

const buildCspConnectSrc = () => Array.from(new Set([
  "'self'",
  ...(process.env.CORS_ORIGINS || '').split(',').map((value) => toOrigin(value)).filter(Boolean),
  toOrigin(process.env.PUBLIC_FRONTEND_URL),
  toOrigin(process.env.DASHBOARD_FRONTEND_URL),
  toOrigin(process.env.CMS_FRONTEND_URL),
  toOrigin(process.env.APP_URL),
]));

const buildCspImgSrc = () => Array.from(new Set([
  "'self'",
  'data:',
  'blob:',
  'https:',
]));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const uploadsDir = join(process.cwd(), 'uploads');
  const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase();
  mkdirSync(uploadsDir, { recursive: true });

  if (['1', 'true', 'yes', 'on'].includes(trustProxy)) {
    app.set('trust proxy', 1);
  }

  app.setGlobalPrefix(process.env.API_PREFIX || 'api');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      reportOnly: String(process.env.CSP_REPORT_ONLY || '').toLowerCase() === 'true',
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        connectSrc: buildCspConnectSrc(),
        imgSrc: buildCspImgSrc(),
        fontSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrcAttr: ["'none'"],
        upgradeInsecureRequests: [],
      },
      ...(process.env.CSP_REPORT_URI ? { reportUri: process.env.CSP_REPORT_URI } : {}),
    },
  }));
  app.use(cookieParser());
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('NEWME Backend API')
    .setDescription('Backend API for NEWME SaaS platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${process.env.API_PREFIX || 'api'}/docs`, app, document);

  await app.listen(Number(process.env.PORT || 5000));
}

bootstrap();
