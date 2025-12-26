import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTutorTimeOffDto, TutorTimeOffFilterDto } from "./dtos/tutor-timeoff.dto";
import { toMinutes } from "src/common/utils/time.util";
import { Prisma } from "@prisma/client";
import { getDayFromDate } from "src/common/utils/dayofweek.util";

@Injectable({})
export class TutorTimeoffService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTutorTimeOffDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');

            
            const date = new Date(dto.date);
            const existingLeave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    AND: [
                        {startDate: {lte: date}},
                        {endDate: {gte: date}}
                    ]
                }
            })
            if(existingLeave) throw new BadRequestException("You have taken leave on this date. TimeOff is not allowed.")

            const day = getDayFromDate(dto.date);

            const availabilities = await this.prisma.tutorAvailability.findMany({
                where: {
                    tutorId: tutor.id,
                    dayOfWeek: day,
                    isActive: true,
                },
            });

            if (!availabilities.length) {
                throw new BadRequestException('You have no availability on this day');
            }

            const start = toMinutes(dto.startTime);
            const end = toMinutes(dto.endTime);

            if (start >= end) {
                throw new BadRequestException('Invalid time range');
            }

            // ───────── Availability containment check ─────────
            const isInsideAvailability = availabilities.some(a => {
                const aStart = toMinutes(a.startTime);
                const aEnd = toMinutes(a.endTime);
                return start >= aStart && end <= aEnd;
            });

            if (!isInsideAvailability) {
                throw new BadRequestException(
                    'TimeOff must be inside your availability window',
                );
            }


            // ───────── TimeOff overlap check ─────────
            const overlappingTimeOff = await this.prisma.tutorTimeOff.findFirst({
                where: {
                    tutorId: tutor.id,
                    date: new Date(dto.date),
                    AND: [
                        { startTime: { lt: dto.endTime } },
                        { endTime: { gt: dto.startTime } },
                    ],
                },
            });

            if (overlappingTimeOff) {
                throw new BadRequestException(
                    'TimeOff overlaps with an existing break',
                );
            }

            // ───────── Session overlap check (GROUP + PRIVATE) ─────────
            const sessions = await this.prisma.session.findMany({
                where: {
                    tutorId: tutor.id,
                    date: new Date(dto.date),
                    status: {
                        in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'],
                    },

                },
            });

            const timeOffStart = toMinutes(dto.startTime);
            const timeOffEnd = toMinutes(dto.endTime);

            for (const s of sessions) {
                const sessionStart = toMinutes(s.startTime);
                const sessionEnd = sessionStart + s.durationMin;

                const isOverlap =
                    timeOffStart < sessionEnd &&
                    timeOffEnd > sessionStart;

                if (isOverlap) {
                    throw new BadRequestException(
                        'You already have a session during this time',
                    );
                }
            }

            // ───────── Create TimeOff ─────────
            return await this.prisma.tutorTimeOff.create({
                data: {
                    tutorId: tutor.id,
                    date: new Date(dto.date),
                    startTime: dto.startTime,
                    endTime: dto.endTime,
                    reason: dto.reason,
                },
            });
        } catch (error) {
            throw error;
        }
    }




    async getAll(dto: TutorTimeOffFilterDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const where: Prisma.TutorTimeOffWhereInput = {
                tutorId: tutor.id,
            };

            // ───────── Date range filters ─────────
            if (dto.fromDate || dto.toDate) {
                where.date = {};

                if (dto.fromDate) {
                    where.date.gte = new Date(dto.fromDate);
                }

                if (dto.toDate) {
                    where.date.lte = new Date(dto.toDate);
                }
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.tutorTimeOff.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { date: 'desc' },
                }),
                this.prisma.tutorTimeOff.count({ where }),
            ]);

            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data,
            };
        } catch (error) {
            throw error
        }
    }


    async delete(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');
            const timeoff = await this.prisma.tutorTimeOff.findUnique({
                where: { id }
            })
            if (!timeoff) throw new NotFoundException("Timeoff not found");
            if (timeoff.tutorId !== tutor.id) throw new ForbiddenException("You do not own this timeoff")

            return await this.prisma.tutorTimeOff.delete({
                where: { id: timeoff.id }
            })
        } catch (error) {
            throw error
        }
    }
}