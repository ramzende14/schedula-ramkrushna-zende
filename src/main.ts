import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';


async function bootstrap() {
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
  console.log('DB_HOST:', process.env.DB_HOST);

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();




