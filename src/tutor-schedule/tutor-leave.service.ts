import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTutorLeaveDto, TutorLeaveFilterDto } from "./dtos/tutor-leave.dto";
import { Prisma } from "@prisma/client";

@Injectable({})
export class TutorLeaveService {
    constructor(private readonly prisma: PrismaService) { }


    async create(dto: CreateTutorLeaveDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');

            const startDate = new Date(dto.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(dto.endDate);
            endDate.setHours(23, 59, 59, 999);

            if (startDate > endDate) {
                throw new BadRequestException('Invalid date range');
            }

            const existing = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    AND: [
                        { startDate: { lte: endDate } },
                        { endDate: { gte: startDate } }
                    ]
                }
            })
            if (existing) {
                throw new BadRequestException('Leave overlaps with an existing leave');
            }

            const hasSession = await this.prisma.session.findFirst({
                where: {
                    tutorId: tutor.id,
                    status: { in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'] },
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            })

            if (hasSession) {
                throw new BadRequestException("'Please cancel your existing sessions before taking leave'")
            }

            return await this.prisma.tutorLeave.create({
                data: {
                    tutorId: tutor.id,
                    startDate,
                    endDate,
                    reason: dto.reason,
                }
            })
        } catch (error) {
            throw error;
        }
    }



    async getAll(dto: TutorLeaveFilterDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const where: Prisma.TutorLeaveWhereInput = {
                tutorId: tutor.id,
            };

            // ───────── Date range filter ─────────
            if (dto.fromDate || dto.toDate) {
                where.AND = [];

                if (dto.fromDate) {
                    const from = new Date(dto.fromDate);
                    from.setHours(0, 0, 0, 0);

                    where.AND.push({
                        endDate: { gte: from },
                    });
                }

                if (dto.toDate) {
                    const to = new Date(dto.toDate);
                    to.setHours(23, 59, 59, 999);

                    where.AND.push({
                        startDate: { lte: to },
                    });
                }
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.tutorLeave.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { startDate: 'desc' },
                }),
                this.prisma.tutorLeave.count({ where }),
            ]);

            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data,
            };
        } catch (error) {
            throw error;
        }
    }



    async delete(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (!tutor) throw new NotFoundException('Tutor not found');
            const leave = await this.prisma.tutorLeave.findUnique({
                where: { id }
            })
            if (!leave) throw new NotFoundException("Leave not found");
            if (leave.tutorId !== tutor.id) throw new ForbiddenException("You do not own this leave.")

            return await this.prisma.tutorLeave.delete({
                where: { id: leave.id }
            })
        } catch (error) {
            throw error;
        }
    }
}