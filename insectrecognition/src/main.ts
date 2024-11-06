import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // Permite todas las peticiones, puedes restringir a un dominio específico si prefieres
  });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
