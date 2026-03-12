import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTutorAvailabilityDto, TutorAvailabilityFilterDto, UpdateTutorAvailabilityDto } from "./dtos/tutor-availibility.dto";
import { toMinutes, toTime } from "src/common/utils/time.util";
import { Prisma } from "@prisma/client";
import { getDayFromDate } from "src/common/utils/dayofweek.util";
import { DayOfWeek } from "common/enums/tuition-class.enum";
import { start } from "repl";


@Injectable({})
export class TutorAvailibilityService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTutorAvailabilityDto, userId: string) {
        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!tutor) throw new NotFoundException('Tutor not found');

        const newStart = toMinutes(dto.startTime);
        const newEnd = toMinutes(dto.endTime);

        if (newStart >= newEnd) {
            throw new BadRequestException('Start time must be less than end time');
        }

        const existing = await this.prisma.tutorAvailability.findMany({
            where: {
                tutorId: tutor.id,
                dayOfWeek: dto.dayOfWeek,
                isActive: true,
            },
        });

        for (const a of existing) {
            const start = toMinutes(a.startTime);
            const end = toMinutes(a.endTime);

            if (newStart < end && newEnd > start) {
                throw new BadRequestException(
                    `Overlaps with ${a.startTime}–${a.endTime}`,
                );
            }
        }

        const sessions = await this.prisma.session.findMany({
            where: {
                tutorId: tutor.id,
                status: {
                    in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'],
                },
            },
        });

        for (const s of sessions) {
            const sessionDay = getDayFromDate(s.date);

            if (sessionDay !== dto.dayOfWeek) continue;

            const sessionStart = toMinutes(s.startTime);
            const sessionEnd = sessionStart + s.durationMin;

            const isOverlap =
                newStart < sessionEnd &&
                newEnd > sessionStart;

            if (isOverlap) {
                throw new BadRequestException(
                    'You already have a session during this time',
                );
            }
        }


        return this.prisma.tutorAvailability.create({
            data: {
                tutorId: tutor.id,
                ...dto,
                isActive: true,
            },
        });
    }



    async getAll(dto: TutorAvailabilityFilterDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit

            const where: Prisma.TutorAvailabilityWhereInput = {
                tutorId: tutor.id
            }

            if (dto.dayOfWeek) {
                where.dayOfWeek = dto.dayOfWeek;
            }

            if (dto.timeZone) {
                where.timeZone = dto.timeZone;
            }

            if (dto.isActive !== undefined) {
                where.isActive = dto.isActive;
            }


            const orderBy: Prisma.TutorAvailabilityOrderByWithRelationInput = {
                [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc'
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.tutorAvailability.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy
                }),
                this.prisma.tutorAvailability.count({ where })
            ]);

            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data
            }
        } catch (error) {
            throw error
        }
    }


    async update(id: string, dto: UpdateTutorAvailabilityDto, userId: string) {
        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!tutor) throw new NotFoundException('Tutor not found');

        const availability = await this.prisma.tutorAvailability.findUnique({
            where: { id },
        });
        if (!availability) throw new NotFoundException('Availability not found');
        if (availability.tutorId !== tutor.id)
            throw new ForbiddenException('Not your availability');

        const finalDay = dto.dayOfWeek ?? availability.dayOfWeek;
        const finalStart = dto.startTime ?? availability.startTime;
        const finalEnd = dto.endTime ?? availability.endTime;

        const newStart = toMinutes(finalStart);
        const newEnd = toMinutes(finalEnd);

        if (newStart >= newEnd) {
            throw new BadRequestException('Invalid time range');
        }

        const others = await this.prisma.tutorAvailability.findMany({
            where: {
                tutorId: tutor.id,
                dayOfWeek: finalDay,
                id: { not: availability.id },
                isActive: true,
            },
        });

        for (const a of others) {
            const start = toMinutes(a.startTime);
            const end = toMinutes(a.endTime);

            if (newStart < end && newEnd > start) {
                throw new BadRequestException(
                    `Overlaps with ${a.startTime}–${a.endTime}`,
                );
            }
        }

        const sessions = await this.prisma.session.findMany({
            where: {
                tutorId: tutor.id,
                status: { in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'] }
            }
        })

        for (const s of sessions) {
            const sessionDay = getDayFromDate(s.date);

            // only care if same weekday
            if (sessionDay !== dto.dayOfWeek) continue;

            const sessionStart = toMinutes(s.startTime);
            const sessionEnd = sessionStart + s.durationMin;

            const isOverlap =
                newStart < sessionEnd &&
                newEnd > sessionStart;

            if (isOverlap) {
                throw new BadRequestException(
                    'You already have a session during this time',
                );
            }
        }

        return this.prisma.tutorAvailability.update({
            where: { id },
            data: {
                dayOfWeek: finalDay,
                startTime: finalStart,
                endTime: finalEnd,
                timeZone: dto.timeZone ?? availability.timeZone,
            },
        });
    }



    async delete(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");
            const availability = await this.prisma.tutorAvailability.findUnique({
                where: { id }
            })
            if (!availability) throw new NotFoundException("Availability not found");
            if (tutor.id !== availability.tutorId) throw new ForbiddenException("You do not own this Availability")

            return await this.prisma.tutorAvailability.delete({
                where: { id: availability.id }
            })
        } catch (error) {
            throw error
        }
    }


    async statusToggle(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");
            const availability = await this.prisma.tutorAvailability.findUnique({
                where: { id }
            })
            if (!availability) throw new NotFoundException("Availability not found");
            if (tutor.id !== availability.tutorId) throw new ForbiddenException("You do not own this Availability")

            return await this.prisma.tutorAvailability.update({
                where: { id: availability.id },
                data: {
                    isActive: !availability.isActive
                }
            })
        } catch (error) {
            throw error
        }
    }


    private async getDayFromDate(dateString: string) {
        const date = new Date(dateString)

        const days = [
            'SUN',
            'MON',
            'TUE',
            'WED',
            'THU',
            'FRI',
            'SAT'
        ]

        return days[date.getDay()] as DayOfWeek
    }


    async getFreeAvailibility(tutorId: string, date: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { id: tutorId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor account not found");

            const dateString = new Date(date);
            dateString.setHours(0, 0, 0, 0)

            const leave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    startDate: { lte: dateString },
                    endDate: { gte: dateString }
                }
            })

            if (leave) {
                return { date, slots: [] }
            }

            const day = getDayFromDate(date);

            const availibilities = await this.prisma.tutorAvailability.findMany({
                where: {
                    tutorId: tutor.id,
                    dayOfWeek: day,
                    isActive: true
                },
                select: {
                    id: true,
                    startTime: true,
                    endTime: true
                },
            })

            if (!availibilities.length) {
                return { date, slots: [] }
            }

            const sessions = await this.prisma.session.findMany({
                where: {
                    tutorId: tutor.id,
                    date: dateString
                },
                select: {
                    id: true,
                    date: true,
                    startTime: true,
                    durationMin: true,
                },
            })


            const timeOffs = await this.prisma.tutorTimeOff.findMany({
                where: {
                    tutorId: tutor.id,
                    date: dateString
                },
                select: {
                    id: true,
                    date: true,
                    startTime: true,
                    endTime: true
                }
            })

            const sessionBlocks = sessions.map(session => ({
                start: toMinutes(session.startTime),
                end: toMinutes(session.startTime) + session.durationMin
            }))

            const timeOffBlocks = timeOffs.map(tf => ({
                start: toMinutes(tf.startTime),
                end: toMinutes(tf.endTime)
            }))

            const blocks = [...sessionBlocks, ...timeOffBlocks];
            blocks.sort((a, b) => a.start - b.start);

            const availibilityBlocks = availibilities.map(avail => ({
                start: toMinutes(avail.startTime),
                end: toMinutes(avail.endTime)
            }))
            availibilityBlocks.sort((a, b) => a.start - b.start);

            const slots = [] as any;
            for (const availibility of availibilityBlocks) {
                let cursor = availibility.start;

                for (const block of blocks) {
                    if (block.end <= availibility.start) continue;

                    if (block.start >= availibility.end) break;

                    if (block.start > cursor) {
                        slots.push({
                            startTime: toTime(cursor),
                            endTime: toTime(block.start)
                        });
                    }

                    cursor = Math.max(cursor, block.end);
                }
                if (availibility.end > cursor) {
                    slots.push({
                        startTime: toTime(cursor),
                        endTime: toTime(availibility.end)
                    });
                }
            }

            return {
                date,
                slots
            }
        } catch (error) {
            throw error;
        }
    }

}