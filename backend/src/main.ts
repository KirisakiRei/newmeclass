import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  app.setGlobalPrefix(process.env.API_PREFIX || 'api');
  app.use(helmet());
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
