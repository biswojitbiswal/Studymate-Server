import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { BoardModule } from './board/board.module';
import { LevelModule } from './level/level.module';
import { SubjectModule } from './subject/subject.module';
import { LanguageModule } from './language/language.module';
import { TaskModule } from './task/task.module';
import { TuitionClassModule } from './tuition-class/tuition-class.module';
import { SessionModule } from './session/session.module';
import { TutorScheduleModule } from './tutor-schedule/tutor-schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MeetingModule } from './meeting/meeting.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env available everywhere
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    CloudinaryModule,
    BoardModule,
    LevelModule,
    SubjectModule,
    LanguageModule,
    TaskModule,
    TuitionClassModule,
    SessionModule,
    TutorScheduleModule,
    AttendanceModule,
    MeetingModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
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
export class AppModule { }
