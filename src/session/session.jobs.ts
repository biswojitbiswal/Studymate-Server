import { Injectable } from "@nestjs/common";
import { ClassType, SessionStatus, SessionType } from "@prisma/client";
import { getDayFromDate } from "src/common/utils/dayofweek.util";
import { MeetingService } from "src/meeting/meeting.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class SessionJob {
    constructor(
        private readonly prisma: PrismaService,
        private readonly meetingService: MeetingService
    ) { }

    // TODO: Add Jobqueue for scaling
    async ensureGroupSessionsGenerated(classId: string) {
        const generateUntil = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

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
        if (!['PUBLISHED', 'ACTIVE'].includes(klass.status)) return;

        const fromDate = new Date(
            Math.max(
                klass.startDate.getTime(),
                new Date().setHours(0, 0, 0, 0),
            ),
        );

        const toDate = new Date(
            Math.min(klass.endDate.getTime(), generateUntil.getTime()),
        );

        // ─────────────────────────
        // Target dates
        // ─────────────────────────
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
                date: { gte: fromDate, lte: toDate },
                sessionType: SessionType.REGULAR,
            },
            select: { date: true },
        });

        const existingDateSet = new Set(
            existingSessions.map(
                (s) => s.date.toISOString().split('T')[0],
            ),
        );

        // ─────────────────────────
        // Create missing sessions
        // ─────────────────────────
        for (const date of targetDates) {
            const dateKey = date.toISOString().split('T')[0];

            if (existingDateSet.has(dateKey)) continue;

            // 1️⃣ Create session first
            const session = await this.prisma.session.create({
                data: {
                    classId: klass.id,
                    tutorId: klass.tutorId,
                    studentId: null,
                    date,
                    startTime: klass.startTime!,
                    durationMin: klass.durationMin!,
                    sessionType: SessionType.REGULAR,
                    status: SessionStatus.SCHEDULED,
                    createdBy: 'SYSTEM',
                },
            });

            // 2️⃣ Create meeting link
            const meeting = this.meetingService.createMeeting(session.id);

            // 3️⃣ Update session with meeting link
            await this.prisma.session.update({
                where: { id: session.id },
                data: {
                    meetingLink: meeting.meetingLink,
                },
            });
        }
    }



}