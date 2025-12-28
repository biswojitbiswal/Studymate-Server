import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AttendanceDto } from "./dtos/attendance.dto";
import { AttendanceStatus } from "src/common/enums/attendance.enum";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Prisma } from "@prisma/client";
import { contains } from "class-validator";
import { SessionStatus } from "src/common/enums/session.enum";
import { title } from "process";

@Injectable({})
export class AttendanceService {
    constructor(private readonly prisma: PrismaService) { }

    // TODO: Complete this api whe you working on dashboard
    async getMyAttendanceSummary(userId: String) {
        try {

        } catch (error) {
            throw error;
        }
    }


    async getMyClassAttendance(classId: string, dto: PaginationDto, userId: string) {
        try {
            const page = dto.page && dto.page > 0 ? dto.page : 1;
            const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
            const skip = (page - 1) * limit;

            const student = await this.prisma.student.findUnique({
                where: {userId},
                select: {
                    id: true
                }
            })
            if(!student) throw new NotFoundException("Student not found.")

            // 1. Validate session
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
            });

            if (!klass) {
                throw new NotFoundException('Class not found');
            }


            const sessions = await this.prisma.session.findMany({
                where: {
                    classId: klass.id,
                    status: { in: [SessionStatus.SCHEDULED, SessionStatus.COMPLETED] }
                },
                select: {
                    id: true
                }
            });


            if (!sessions || sessions.length === 0) {
                throw new NotFoundException('Session not found');
            }

            const sessionIds = sessions.map(s => s.id);

            // 2. Build where condition
            let where: Prisma.AttendanceWhereInput = {
                sessionId: { in: sessionIds },
                studentId: student.id
            };

            // 3. Search by student name
            if (dto.search) {
                where = {
                    session: {
                        klass: {
                            title: {
                                contains: dto.search,
                                mode: 'insensitive',
                            },
                            description: {
                                contains: dto.search,
                                mode: 'insensitive',
                            },
                        }
                    },
                };
            }

            // 4. Fetch attendance list
            const [attendance, total] = await this.prisma.$transaction([
                this.prisma.attendance.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        student: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                }),
                this.prisma.attendance.count({ where }),
            ]);

            // 5. Return paginated response
            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: limit ? Math.ceil(total / limit) : 1,
                    attendance
                },
            };
        } catch (error) {
            throw error;
        }
    }


    async markAllPresent(sessionId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found")
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    klass: {
                        select: { id: true },
                    },
                },
            });
            if (!session) throw new NotFoundException("Session not found");

            if (tutor.id !== session.tutorId) throw new ForbiddenException("You do not own this session.");

            const enrollments = await this.prisma.classEnrollment.findMany({
                where: { classId: session.klass.id },
                select: { studentId: true },
            });

            const enrolledStudentIds = enrollments.map(e => e.studentId);

            return await this.prisma.$transaction(
                enrolledStudentIds.map(id =>
                    this.prisma.attendance.createMany({
                        data: {
                            sessionId,
                            studentId: id,
                            status: AttendanceStatus.PRESENT,
                            markedBy: tutor.id,
                        },
                    }),
                ),
            );
        } catch (error) {
            throw error;
        }
    }



    async getSessionAttendance(sessionId: string, dto: PaginationDto) {
        try {
            const page = dto.page && dto.page > 0 ? dto.page : 1;
            const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
            const skip = (page - 1) * limit;

            // 1. Validate session
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    klass: {
                        select: { id: true },
                    },
                },
            });

            if (!session) {
                throw new NotFoundException('Session not found');
            }

            // 2. Build where condition
            let where: Prisma.AttendanceWhereInput = {
                sessionId: session.id,
            };

            // 3. Search by student name
            if (dto.search) {
                where = {
                    sessionId: session.id,
                    student: {
                        user: {
                            name: {
                                contains: dto.search,
                                mode: 'insensitive',
                            },
                        },
                    },
                };
            }

            // 4. Fetch attendance list
            const [attendance, total] = await this.prisma.$transaction([
                this.prisma.attendance.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        student: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                }),
                this.prisma.attendance.count({ where }),
            ]);

            // 5. Return paginated response
            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: limit ? Math.ceil(total / limit) : 1,
                    attendance
                },
            };
        } catch (error) {
            throw error;
        }
    }




    async markAttendanceBulk(dto: AttendanceDto, sessionId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found")
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    klass: {
                        select: { id: true },
                    },
                },
            });
            if (!session) throw new NotFoundException("Session not found");

            if (tutor.id !== session.tutorId) throw new ForbiddenException("You do not own this session.");

            const enrollments = await this.prisma.classEnrollment.findMany({
                where: { classId: session.klass.id },
                select: { studentId: true },
            });

            const enrolledStudentIds = new Set(
                enrollments.map(e => e.studentId),
            );

            // 5. Validate all incoming studentIds
            for (const record of dto.attendance) {
                if (!enrolledStudentIds.has(record.studentId)) {
                    throw new BadRequestException(`Student ${record.studentId} is not enrolled in this class`);
                }
            }

            return await this.prisma.$transaction(
                dto.attendance.map(record =>
                    this.prisma.attendance.upsert({
                        where: {
                            sessionId_studentId: {
                                sessionId,
                                studentId: record.studentId,
                            },
                        },
                        update: {
                            status: record.status,
                        },
                        create: {
                            sessionId,
                            studentId: record.studentId,
                            status: record.status,
                            markedBy: tutor.id,
                        },
                    }),
                ),
            );
        } catch (error) {
            throw error;
        }
    }



    async updateSingleAttendance(id: string, userId: string) {
        try {
            const attendance = await this.prisma.attendance.findUnique({
                where: { id }
            })
            if (!attendance) throw new NotFoundException("Attendance not found.");

            const newStatus = attendance.status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;

            return await this.prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    status: newStatus
                }
            })
        } catch (error) {
            throw error;
        }
    }
}