import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env available everywhere
    }),
    LoggerModule,
    PrismaModule,
    AuthModule
  ],
  providers: [
    AllExceptionsFilter,
    MongoExceptionFilter,
    PrismaExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
