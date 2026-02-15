import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from './common/config.service';
import { promises as fs } from 'fs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  await fs.mkdir(config.values.artifactsRoot, { recursive: true });

  app.enableCors({
    origin: config.values.corsOrigin
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false
    })
  );
  app.setGlobalPrefix('api/v1');

  if (config.values.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AST-VDP API')
      .setDescription('Flight processing orchestration API')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.values.apiPort);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.values.apiPort}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('API bootstrap failed', error);
  process.exit(1);
});
