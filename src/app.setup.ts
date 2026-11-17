import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuración global compartida por main.ts y las pruebas e2e
export function setupApp(app: INestApplication) {
  // Todas las rutas bajo /api/v1 (el panel usa API_PREFIX = "/api/v1")
  app.setGlobalPrefix('api/v1');

  // Orígenes permitidos separados por coma; sin cookies, el token va en Authorization
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
