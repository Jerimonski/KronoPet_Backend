import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(
    `El Backend de la Veterinaria corre en: http://localhost:${port}/api/v1`,
  );
}

bootstrap().catch((err) => console.error(err));
