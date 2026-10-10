import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter, validationExceptionFactory } from './common/http-exception.filter';
import { loadEnvFile } from './database/database.config';

async function bootstrap() {
  loadEnvFile();
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wi-Fi Dashboard API')
    .setDescription(
      'API do painel de acessos ao Wi-Fi de visitantes. As métricas são calculadas no fuso da loja; ' +
        'as datas `from`/`to` são dias de calendário (AAAA-MM-DD), ambos inclusivos.',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API ouvindo na porta ${port} — Swagger em /docs`, 'Bootstrap');
}

void bootstrap();
