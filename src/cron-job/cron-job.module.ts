import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TuitionClassJob } from 'src/tuition-class/tuition-class.jobs';
import { CronService } from './cron-job.service';
import { SessionJob } from 'src/session/session.jobs';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TuitionClassModule } from 'src/tuition-class/tuition-class.module';
import { SessionModule } from 'src/session/session.module';


@Module({
  imports: [
    PrismaModule,
    TuitionClassModule,
    SessionModule
  ],
  providers: [CronService]
})
export class CronModule {}
