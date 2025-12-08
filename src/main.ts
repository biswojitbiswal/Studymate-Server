import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_PROVIDER, WinstonModule } from 'nest-winston';
import { createWinstonTransports } from './common/logger/logger.factory';
import { HttpLoggerInterceptor } from './common/logger/http-logger.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: Object.values(createWinstonTransports()),
    }),
  });

  // get logger instance (the same instance is injected into filters)
  const winstonLogger = app.get(WINSTON_MODULE_PROVIDER);

  // use global interceptor (pass the logger)
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new HttpLoggerInterceptor(winstonLogger)
  );

  // get the DI-created filter instances and register globally
  const prismaFilter = app.get(PrismaExceptionFilter);
  const mongoFilter = app.get(MongoExceptionFilter);
  const allFilter = app.get(AllExceptionsFilter);

  // register filters in order (most specific -> general)
  app.useGlobalFilters(prismaFilter, mongoFilter, allFilter);
  await app.listen(process.env.PORT ?? 3000);
  winstonLogger.info(`Studymate is running at ${process.env.PORT ?? 3000}`);
  console.log(`Studymate is running at ${process.env.PORT ?? 3000}`);

}
bootstrap();
