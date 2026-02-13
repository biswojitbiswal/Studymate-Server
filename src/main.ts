import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_PROVIDER, WinstonModule } from 'nest-winston';
import { createWinstonTransports } from './common/logger/logger.factory';
import { HttpLoggerInterceptor } from './common/logger/http-logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';
import cookieParser from 'cookie-parser';




async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      transports: Object.values(createWinstonTransports()),
    }),
  });


  app.set('trust proxy', 1);


  const allowedOrigins = [
    'http://localhost:3000',
    'https://studynest-jade.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

  // Webhook route → RAW BODY ONLY
  app.use('/api/v1/payments/webhook', bodyParser.raw({ type: '*/*' }));

  // All other routes → normal JSON
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
  // const prismaFilter = app.get(PrismaExceptionFilter);
  // const mongoFilter = app.get(MongoExceptionFilter);
  // const allFilter = app.get(AllExceptionsFilter);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  winstonLogger.info(`StudyNest is running on port ${port}`);
  console.log(`StudyNest is running on port ${port}`);


}
bootstrap();
