import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class TuitionClassJob {
    constructor(private readonly prisma: PrismaService) { }

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

        const result = await this.prisma.tuitionClass.updateMany({
            where: {
                status: 'ACTIVE',
                endDate: {
                    lt: now,
                },
            },
            data: {
                status: 'COMPLETED',
            },
        });

        return {
            updatedCount: result.count,
            message: `${result.count} classes moved to COMPLETED`,
        };
    }

}