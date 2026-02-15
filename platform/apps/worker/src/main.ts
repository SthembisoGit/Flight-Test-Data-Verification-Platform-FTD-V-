import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule);
  // eslint-disable-next-line no-console
  console.log('Worker started');
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Worker bootstrap failed', error);
  process.exit(1);
});
