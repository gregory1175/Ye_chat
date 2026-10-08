import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

declare const process: { env: { PORT?: string } };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
