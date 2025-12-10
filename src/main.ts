import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_PROVIDER, WinstonModule } from 'nest-winston';
import { createWinstonTransports } from './common/logger/logger.factory';
import { HttpLoggerInterceptor } from './common/logger/http-logger.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';
import cookieParser from 'cookie-parser';




async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: Object.values(createWinstonTransports()),
    }),
  });


  app.enableCors({
    origin: true, // or specific domains
    credentials: true,
  });


  // get logger instance (the same instance is injected into filters)
  const winstonLogger = app.get(WINSTON_MODULE_PROVIDER);

  // use global interceptor (pass the logger)
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new HttpLoggerInterceptor(winstonLogger)
  );


  app.use('/uploads', express.static(join(process.cwd(), 'public', 'uploads')));
  // app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
  //   prefix: '/uploads/',
  // });



  app.use(bodyParser.json({ limit: '25mb' }));
  app.use(bodyParser.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        const constraints = firstError.constraints;
        const message = constraints
          ? Object.values(constraints)[0]
          : 'Validation error';
        return new BadRequestException(message);
      },
    }),
  );

  app.setGlobalPrefix('api')

  app.enableVersioning({
    type: VersioningType.URI
  })

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
