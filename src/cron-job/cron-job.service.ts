import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClassStatus, ClassType } from 'src/common/enums/tuition-class.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionJob } from 'src/session/session.jobs';
import { TuitionClassJob } from 'src/tuition-class/tuition-class.jobs';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly tuitionClassJob: TuitionClassJob,
        private readonly sessionJob: SessionJob
    ) { }

    /**
     * MASTER DAILY CRON
     * Runs every day at midnight
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        timeZone: 'Asia/Kolkata',
    })
    async handleDailyCron() {
        this.logger.log('Daily cron started');

        await this.handleTuitionClassLifecycle();

        this.logger.log('Daily cron finished');
    }


    @Cron('0 */6 * * *', {
        timeZone: 'Asia/Kolkata',
    }) // every 6 hours
    async sessionSafetyCron() {
        await this.handleSessionGenerateLifecycle();

        this.logger.log('6hr cron finished');
    }


    private async handleTuitionClassLifecycle() {
        const activeResult = await this.tuitionClassJob.updateClassesToActive();

        const completeResult = await this.tuitionClassJob.updateClassesToComplete();

        this.logger.log(activeResult.message);
        this.logger.log(completeResult.message);
    }


    private async handleSessionGenerateLifecycle() {
        const classes = await this.prisma.tuitionClass.findMany({
            where: {
                type: ClassType.GROUP,
                status: ClassStatus.ACTIVE
            },
            select: { id: true },
        });

        let sessonGeneration = {} as any;

        if (classes.length === 0) {
            this.logger.log("No active group classes found");
            return;
        }

        for (const klass of classes) {
            sessonGeneration = await this.sessionJob.ensureGroupSessionsGenerated(klass.id);
        }


    }
}
