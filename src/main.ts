import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const device = require('express-device');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors();
  app.useGlobalPipes(new ValidationPipe()); // For Enabling DTOs
  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.use(device.capture());
  console.log('App is listening on 127.0.0.0', process.env.PORT);
  await app.listen(process.env.PORT);
}
bootstrap();
