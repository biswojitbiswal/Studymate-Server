import { Injectable } from "@nestjs/common";
import { ClassType, SessionStatus, SessionType } from "@prisma/client";
import { getDayFromDate } from "src/common/utils/dayofweek.util";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class SessionJob {
    constructor(private readonly prisma: PrismaService) { }

    async ensureGroupSessionsGenerated(
        classId: string,
    ) {
        // Default: generate till next 7 days
        const generateUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const klass = await this.prisma.tuitionClass.findUnique({
            where: { id: classId },
            select: {
                id: true,
                tutorId: true,
                type: true,
                status: true,
                startDate: true,
                endDate: true,
                daysOfWeek: true,
                startTime: true,
                durationMin: true,
            },
        });

        if (!klass) return;

        if (klass.type !== ClassType.GROUP) return;

        if (
            !['PUBLISHED', 'ACTIVE'].includes(klass.status)
        ) {
            return;
        }


        const fromDate = new Date(Math.max(klass.startDate.getTime(), new Date().setHours(0, 0, 0, 0)));

        const toDate = new Date(
            Math.min(klass.endDate.getTime(), generateUntil.getTime()),
        );

        const targetDates: Date[] = [];

        for (
            let d = new Date(fromDate);
            d <= toDate;
            d.setDate(d.getDate() + 1)
        ) {
            const day = getDayFromDate(d);

            if (klass.daysOfWeek.includes(day)) {
                targetDates.push(new Date(d));
            }
        }

        // ─────────────────────────
        // Existing sessions
        // ─────────────────────────
        const existingSessions = await this.prisma.session.findMany({
            where: {
                classId: klass.id,
                date: {
                    gte: fromDate,
                    lte: toDate,
                },
                sessionType: SessionType.REGULAR,
            },
            select: { date: true },
        });

        const existingDateSet = new Set(
            existingSessions.map((s) =>
                s.date.toISOString().split('T')[0],
            ),
        );

        // ─────────────────────────
        // Create missing sessions
        // ─────────────────────────
        const sessionsToCreate = targetDates
            .filter(
                (d) => !existingDateSet.has(d.toISOString().split('T')[0]),
            )
            .map((d) => ({
                classId: klass.id,
                tutorId: klass.tutorId,
                studentId: null,
                date: d,
                startTime: klass.startTime!,
                durationMin: klass.durationMin!,
                sessionType: SessionType.REGULAR,
                status: SessionStatus.SCHEDULED,
                createdBy: 'SYSTEM',
            }));

        if (!sessionsToCreate.length) return;

        await this.prisma.session.createMany({
            data: sessionsToCreate,
        });
    }


}