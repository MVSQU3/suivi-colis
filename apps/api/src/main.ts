import { loadEnv } from './env';
loadEnv();
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  // import après loadEnv pour que JwtModule lise les secrets
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? '').split(','), credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle(process.env.APP_NAME ?? 'suivi-colis').addBearerAuth().build());
  SwaggerModule.setup('api/docs', app, doc);
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`API prête sur http://localhost:${port}/api/v1 (docs : /api/docs)`);
}
void bootstrap();
