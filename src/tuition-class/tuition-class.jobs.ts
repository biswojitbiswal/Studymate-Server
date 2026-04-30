import { Injectable } from "@nestjs/common";
import { LedgerService } from "payout/ledger.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class TuitionClassJob {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ledgerService: LedgerService
    ) { }

    //TODO: updateClassesToActive
    async updateClassesToActive() {
        const now = new Date();

        const result = await this.prisma.tuitionClass.updateMany({
            where: {
                status: 'PUBLISHED',
                startDate: {
                    lte: now,
                },
            },
            data: {
                status: 'ACTIVE',
            },
        });

        return {
            updatedCount: result.count,
            message: `${result.count} classes moved to ACTIVE`,
        };
    }


    //TODO: updateClassesToComplete
    async updateClassesToComplete() {
        const now = new Date();

        // 1. Get classes FIRST
        const classes = await this.prisma.tuitionClass.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lt: now }
            },
            select: {
                id: true,
                tutorId: true
            }
        });

        if (!classes.length) {
            return {
                updatedCount: 0,
                message: "No classes to update"
            };
        }

        // 2. Update all to COMPLETED
        await this.prisma.tuitionClass.updateMany({
            where: {
                id: { in: classes.map(c => c.id) }
            },
            data: {
                status: 'COMPLETED'
            }
        });

        // 3. Process ledger per class
        await Promise.all(
            classes.map(cls =>
                this.ledgerService.availLedger(cls.id, cls.tutorId)
            )
        );


        return {
            updatedCount: classes.length,
            message: `${classes.length} classes moved to COMPLETED`
        };
    }

}