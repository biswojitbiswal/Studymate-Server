import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateGroupDboutSessionDto, CreateGroupExtraSessionDto, CreatePrivateSessionDto, GetClassSessionsDto, RescheduleSessionDto } from "./dtos/session.dto";
import { ClassStatus, ClassType } from "src/common/enums/tuition-class.enum";
import { getDayFromDate } from "src/common/utils/dayofweek.util";
import { toMinutes } from "src/common/utils/time.util";
import { Prisma, SessionStatus, SessionType } from "@prisma/client";
import { SessionJob } from "./session.jobs";

@Injectable({})
export class SessionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly session: SessionJob,
    ) { }

    async create(dto: CreatePrivateSessionDto, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    role: true,
                    student: { select: { id: true } },
                    tutor: { select: { id: true } },
                },
            });

            if (!user) {
                throw new NotFoundException('User not found.');
            }

            // ─────────────────────────
            // Class
            // ─────────────────────────
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
            });

            if (!klass) {
                throw new NotFoundException('Class not found.');
            }

            if (klass.type !== ClassType.PRIVATE) {
                throw new BadRequestException('Not a private class.');
            }

            if (!['PUBLISHED', 'ACTIVE'].includes(klass.status)) {
                throw new BadRequestException('Class is not accepting sessions.');
            }

            if (klass.capacity !== 1) {
                throw new InternalServerErrorException(
                    'Invalid private class configuration.',
                );
            }

            // ─────────────────────────
            // Tutor (class owner)
            // ─────────────────────────
            const tutor = await this.prisma.tutor.findUnique({
                where: { id: klass.tutorId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor account not found.');
            }

            // ─────────────────────────
            // Student (only if student flow)
            // ─────────────────────────
            const studentId =
                user.role === 'STUDENT' ? user.student?.id : null;

            if (user.role === 'STUDENT' && !studentId) {
                throw new NotFoundException('Student account not found.');
            }

            // ─────────────────────────
            // Enrollment (BOTH student & tutor creation)
            // ─────────────────────────
            if (studentId) {
                const enrollment = await this.prisma.classEnrollment.findFirst({
                    where: {
                        classId: klass.id,
                        studentId,
                    },
                });

                if (!enrollment) {
                    throw new ForbiddenException(
                        'Student must be enrolled in the class.',
                    );
                }
            }

            // ─────────────────────────
            // Prevent multiple pending (student only)
            // ─────────────────────────
            if (user.role === 'STUDENT') {
                const existingPending = await this.prisma.session.findFirst({
                    where: {
                        classId: klass.id,
                        studentId,
                        status: SessionStatus.PENDING_TUTOR_APPROVAL,
                    },
                });

                if (existingPending) {
                    throw new BadRequestException(
                        'You already have a pending session request.',
                    );
                }
            }

            // ─────────────────────────
            // Date & Time validation
            // ─────────────────────────
            const today = new Date();
            const requestedDate = new Date(dto.date);

            if (requestedDate < new Date(today.toDateString())) {
                throw new BadRequestException('Date must not be in the past.');
            }

            const start = toMinutes(dto.startTime);
            const end = start + dto.durationMin;

            if (dto.durationMin <= 0) {
                throw new BadRequestException('Duration must be valid.');
            }

            if (requestedDate.toDateString() === today.toDateString()) {
                const nowMinutes =
                    today.getHours() * 60 + today.getMinutes();

                if (start <= nowMinutes) {
                    throw new BadRequestException(
                        'Time must be in the future.',
                    );
                }
            }

            // ─────────────────────────
            // Tutor AVAILABILITY (student only)
            // ─────────────────────────
            if (user.role === 'STUDENT') {
                const dayOfWeek = getDayFromDate(requestedDate);

                const availabilities =
                    await this.prisma.tutorAvailability.findMany({
                        where: {
                            tutorId: tutor.id,
                            dayOfWeek,
                            isActive: true,
                        },
                    });

                if (!availabilities.length) {
                    throw new BadRequestException(
                        'Tutor is not available on this day.',
                    );
                }

                const fits = availabilities.some((a) => {
                    const aStart = toMinutes(a.startTime);
                    const aEnd = toMinutes(a.endTime);
                    return start >= aStart && end <= aEnd;
                });

                if (!fits) {
                    throw new BadRequestException(
                        'Time must fall inside tutor availability.',
                    );
                }
            }

            // ─────────────────────────
            // Tutor TIME-OFF
            // ─────────────────────────
            const timeOffs = await this.prisma.tutorTimeOff.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                },
            });

            for (const t of timeOffs) {
                const tStart = toMinutes(t.startTime);
                const tEnd = toMinutes(t.endTime);

                if (start < tEnd && end > tStart) {
                    throw new BadRequestException(
                        'Selected time overlaps tutor time-off.',
                    );
                }
            }

            // ─────────────────────────
            // Tutor LEAVE
            // ─────────────────────────
            const leave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    startDate: { lte: requestedDate },
                    endDate: { gte: requestedDate },
                },
            });

            if (leave) {
                throw new BadRequestException(
                    'Tutor is on leave on the selected date.',
                );
            }

            // ─────────────────────────
            // Tutor session overlap
            // ─────────────────────────
            const tutorSessions = await this.prisma.session.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                    status: {
                        in: [
                            SessionStatus.SCHEDULED,
                            SessionStatus.PENDING_TUTOR_APPROVAL,
                        ],
                    },
                },
            });

            for (const s of tutorSessions) {
                const sStart = toMinutes(s.startTime);
                const sEnd = sStart + s.durationMin;

                if (start < sEnd && end > sStart) {
                    throw new BadRequestException(
                        'Tutor already has a session at this time.',
                    );
                }
            }

            // ─────────────────────────
            // Final status decision
            // ─────────────────────────
            const status =
                user.role === 'STUDENT'
                    ? SessionStatus.PENDING_TUTOR_APPROVAL
                    : SessionStatus.SCHEDULED;

            const createdBy =
                user.role === 'STUDENT' ? 'STUDENT' : 'TUTOR';

            // ─────────────────────────
            // Create session
            // ─────────────────────────
            return await this.prisma.session.create({
                data: {
                    classId: klass.id,
                    tutorId: tutor.id,
                    studentId,
                    date: requestedDate,
                    startTime: dto.startTime,
                    durationMin: dto.durationMin,
                    sessionType: SessionType.REGULAR,
                    status,
                    createdBy,
                },
            });
        } catch (error) {
            throw error;
        }
    }



    async getByClassId(dto: GetClassSessionsDto, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    role: true,
                    student: { select: { id: true } },
                    tutor: { select: { id: true } },
                },
            });

            if (!user) {
                throw new NotFoundException('User not found.');
            }

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
                select: {
                    id: true,
                    tutorId: true,
                    type: true,
                },
            });

            if (!klass) {
                throw new NotFoundException('Class not found');
            }

            // If tutor
            if (user.role === 'TUTOR') {
                if (klass.tutorId !== user.tutor?.id) {
                    throw new ForbiddenException('You do not own this class');
                }
            }

            // If student
            if (user.role === 'STUDENT') {
                const enrolled = await this.prisma.classEnrollment.findFirst({
                    where: {
                        classId: klass.id,
                        studentId: user.student?.id,
                    },
                });

                if (!enrolled) {
                    throw new ForbiddenException('You are not enrolled in this class');
                }
            }

            if (klass.type === ClassType.GROUP) {
                await this.session.ensureGroupSessionsGenerated(klass.id);
            }

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const where: Prisma.SessionWhereInput = {};
            if (dto.classId) {
                where.classId = dto.classId
            }

            if (dto.status) {
                where.status = dto.status;
            }

            if (dto.sessionType) {
                where.sessionType = dto.sessionType;
            }

            if (dto.fromDate || dto.toDate) {
                where.date = {}
                if (dto.fromDate) {
                    where.date.gte = new Date(dto.fromDate);
                }
                if (dto.toDate) {
                    where.date.lte = new Date(dto.toDate);
                }
            }

            const [items, total] = await Promise.all([
                this.prisma.session.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        date: 'asc',
                    },
                }),
                this.prisma.session.count({ where }),
            ]);

            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data: items,
            };
        } catch (error) {
            throw error
        }
    }


    async cancel(sessionId: string, userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    role: true,
                    tutor: {
                        select: {
                            id: true,
                        }
                    },
                    student: {
                        select: {
                            id: true
                        }
                    }
                }
            })
            if (!user) throw new NotFoundException("User not found");

            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    klass: {
                        select: {
                            id: true,
                            type: true
                        }
                    }
                }
            })

            if (!session) throw new NotFoundException("Session not found");

            if (
                session.status === SessionStatus.COMPLETED ||
                session.status === SessionStatus.CANCELLED_BY_TUTOR ||
                session.status === SessionStatus.CANCELLED_BY_STUDENT
            ) {
                throw new BadRequestException('Session cannot be cancelled.');
            }

            if (user.role === 'STUDENT') {
                if (!user.student || session.studentId !== user.student.id) {
                    throw new ForbiddenException('You do not own this session.');
                }

                if (session.klass.type === ClassType.GROUP) {
                    throw new BadRequestException(
                        'Students cannot cancel group sessions.',
                    );
                }
            }

            if (user.role === 'TUTOR') {
                if (!user.tutor || session.tutorId !== user.tutor.id) {
                    throw new ForbiddenException('You do not own this session.');
                }
            }

            const sessionDate = new Date(session.date);
            const sessionStartMinutes = toMinutes(session.startTime);

            const sessionStart = new Date(session.date);
            sessionStart.setHours(Math.floor(sessionStartMinutes / 60), sessionStartMinutes % 60, 0, 0);

            const now = new Date();

            if (now >= sessionStart) {
                throw new BadRequestException(
                    'Cannot cancel a session after it has started.',
                );
            }

            if (user.role === 'STUDENT') {
                const diffMs = sessionStart.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours < 12) {
                    throw new BadRequestException(
                        'Sessions must be cancelled at least 12 hours in advance.',
                    );
                }
            }

            return await this.prisma.session.update({
                where: { id: session.id },
                data: {
                    status: user.role === 'TUTOR' ? SessionStatus.CANCELLED_BY_TUTOR : SessionStatus.CANCELLED_BY_STUDENT,
                    meetingLink: null
                }
            })
        } catch (error) {
            throw error
        }
    }


    async approve(sessionId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    status: true,
                    tutorId: true,
                    sessionType: true,
                    klass: {
                        select: {
                            id: true,
                            type: true
                        }
                    }
                }
            });

            if (!session) throw new NotFoundException("Session not found");

            if (session.tutorId !== tutor.id) throw new ForbiddenException("You do not own this session.");

            if (session.klass.type !== ClassType.PRIVATE) {
                throw new BadRequestException(
                    'Only private sessions require approval.',
                );
            }

            if (session.sessionType !== SessionType.REGULAR) {
                throw new BadRequestException(
                    'Only regular sessions can be approved.',
                );
            }

            if (session.status !== SessionStatus.PENDING_TUTOR_APPROVAL) {
                throw new BadRequestException(
                    'You can only approve pending sessions.',
                );
            }

            return await this.prisma.session.update({
                where: { id: session.id },
                data: {
                    status: SessionStatus.SCHEDULED
                }
            })
        } catch (error) {
            throw error;
        }
    }


    async reject(sessionId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    status: true,
                    tutorId: true,
                    sessionType: true,
                    klass: {
                        select: {
                            id: true,
                            type: true
                        }
                    }
                }
            });

            if (!session) throw new NotFoundException("Session not found");

            if (session.tutorId !== tutor.id) throw new ForbiddenException("You do not own this session.");

            if (session.klass.type !== ClassType.PRIVATE) {
                throw new BadRequestException(
                    'Only private sessions can be rejected.',
                );
            }

            if (session.sessionType !== SessionType.REGULAR) {
                throw new BadRequestException(
                    'Only regular sessions can be rejected.',
                );
            }

            if (session.status !== SessionStatus.PENDING_TUTOR_APPROVAL) {
                throw new BadRequestException(
                    'Only pending sessions can be rejected.',
                );
            }

            return await this.prisma.session.update({
                where: { id: session.id },
                data: {
                    status: SessionStatus.CANCELLED_BY_TUTOR
                }
            })
        } catch (error) {
            throw error
        }
    }



    async reschedule(
        sessionId: string,
        dto: RescheduleSessionDto,
        userId: string,
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    role: true,
                    tutor: { select: { id: true } },
                    student: { select: { id: true } },
                },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    klass: {
                        select: {
                            type: true,
                        },
                    },
                },
            });

            if (!session) {
                throw new NotFoundException('Session not found');
            }

            if (
                user.role === 'STUDENT' &&
                session.studentId !== user.student?.id
            ) {
                throw new ForbiddenException('You do not own this session');
            }

            if (
                user.role === 'TUTOR' &&
                session.tutorId !== user.tutor?.id
            ) {
                throw new ForbiddenException('You do not own this session');
            }

            if (session.klass.type !== ClassType.PRIVATE) {
                throw new BadRequestException(
                    'Group sessions cannot be rescheduled. Please cancel and create an extra session.',
                );
            }

            if (session.sessionType !== SessionType.REGULAR) {
                throw new BadRequestException(
                    'Only regular sessions can be rescheduled.',
                );
            }

            if (session.status !== SessionStatus.SCHEDULED) {
                throw new BadRequestException(
                    'Only scheduled sessions can be rescheduled.',
                );
            }


            const requestedDate = new Date(dto.date);
            const startMinutes = toMinutes(dto.startTime);
            const endMinutes = startMinutes + dto.durationMin;

            const newSessionStart = new Date(requestedDate);
            newSessionStart.setHours(
                Math.floor(startMinutes / 60),
                startMinutes % 60,
                0,
                0,
            );

            const now = new Date();

            // Cannot reschedule past/ongoing sessions
            if (now >= newSessionStart) {
                throw new BadRequestException(
                    'Cannot reschedule to a past or ongoing time.',
                );
            }

            if (user.role === 'STUDENT') {
                const diffHours =
                    (newSessionStart.getTime() - now.getTime()) /
                    (1000 * 60 * 60);

                if (diffHours < 12) {
                    throw new BadRequestException(
                        'Sessions must be rescheduled at least 12 hours in advance.',
                    );
                }
            }

            const dayOfWeek = getDayFromDate(requestedDate);

            const availabilities =
                await this.prisma.tutorAvailability.findMany({
                    where: {
                        tutorId: session.tutorId,
                        dayOfWeek,
                        isActive: true,
                    },
                });

            if (!availabilities.length) {
                throw new BadRequestException(
                    'Tutor is not available on the selected day.',
                );
            }

            const isInsideAvailability = availabilities.some((a) => {
                const aStart = toMinutes(a.startTime);
                const aEnd = toMinutes(a.endTime);
                return startMinutes >= aStart && endMinutes <= aEnd;
            });

            if (!isInsideAvailability) {
                throw new BadRequestException(
                    'Selected time is outside tutor availability.',
                );
            }

            const timeOffs = await this.prisma.tutorTimeOff.findMany({
                where: {
                    tutorId: session.tutorId,
                    date: requestedDate,
                },
            });

            for (const t of timeOffs) {
                const tStart = toMinutes(t.startTime);
                const tEnd = toMinutes(t.endTime);

                if (startMinutes < tEnd && endMinutes > tStart) {
                    throw new BadRequestException(
                        'Selected time overlaps tutor time-off.',
                    );
                }
            }

            const leave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: session.tutorId,
                    AND: [
                        { startDate: { lte: requestedDate } },
                        { endDate: { gte: requestedDate } },
                    ],
                },
            });

            if (leave) {
                throw new BadRequestException(
                    'Tutor is on leave on the selected date.',
                );
            }

            const sessions = await this.prisma.session.findMany({
                where: {
                    tutorId: session.tutorId,
                    date: requestedDate,
                    NOT: { id: session.id },
                },
            });

            for (const s of sessions) {
                const sStart = toMinutes(s.startTime);
                const sEnd = sStart + s.durationMin;

                if (startMinutes < sEnd && endMinutes > sStart) {
                    throw new BadRequestException(
                        'Tutor already has a session at this time.',
                    );
                }
            }


            const newStatus =
                user.role === 'STUDENT'
                    ? SessionStatus.PENDING_TUTOR_APPROVAL
                    : SessionStatus.SCHEDULED;


            return await this.prisma.session.update({
                where: { id: session.id },
                data: {
                    date: requestedDate,
                    startTime: dto.startTime,
                    durationMin: dto.durationMin,
                    status: newStatus,
                    meetingLink:
                        user.role === 'STUDENT' ? null : session.meetingLink,
                },
            });
        } catch (error) {
            throw error;
        }
    }




    async createExtraSession(
        dto: CreateGroupExtraSessionDto,
        userId: string,
    ) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
                select: {
                    id: true,
                    tutorId: true,
                    type: true,
                    status: true,
                },
            });

            if (!klass) {
                throw new NotFoundException('Class not found');
            }

            if (klass.tutorId !== tutor.id) {
                throw new ForbiddenException('You do not own this class');
            }

            if (klass.type !== ClassType.GROUP) {
                throw new BadRequestException(
                    'Extra sessions are allowed only for group classes',
                );
            }

            if (!['PUBLISHED', 'ACTIVE'].includes(klass.status)) {
                throw new BadRequestException(
                    'Extra sessions can only be created for active or published classes',
                );
            }

            const requestedDate = new Date(dto.date);
            const startMinutes = toMinutes(dto.startTime);
            const endMinutes = startMinutes + dto.durationMin;

            if (dto.durationMin <= 0) {
                throw new BadRequestException('Invalid session duration');
            }

            const sessionStart = new Date(requestedDate);
            sessionStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0,);

            if (new Date() >= sessionStart) {
                throw new BadRequestException(
                    'Session must be scheduled in the future',
                );
            }

            const timeOffs = await this.prisma.tutorTimeOff.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                },
            });

            for (const t of timeOffs) {
                const tStart = toMinutes(t.startTime);
                const tEnd = toMinutes(t.endTime);

                if (startMinutes < tEnd && endMinutes > tStart) {
                    throw new BadRequestException(
                        'Selected time overlaps tutor time-off',
                    );
                }
            }

            const leave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    AND: [
                        { startDate: { lte: requestedDate } },
                        { endDate: { gte: requestedDate } },
                    ],
                },
            });

            if (leave) {
                throw new BadRequestException(
                    'Tutor is on leave on the selected date',
                );
            }

            const sessions = await this.prisma.session.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                },
            });

            for (const s of sessions) {
                const sStart = toMinutes(s.startTime);
                const sEnd = sStart + s.durationMin;

                if (startMinutes < sEnd && endMinutes > sStart) {
                    throw new BadRequestException(
                        'Tutor already has a session at this time',
                    );
                }
            }

            return await this.prisma.session.create({
                data: {
                    classId: klass.id,
                    tutorId: tutor.id,
                    studentId: null,
                    date: requestedDate,
                    startTime: dto.startTime,
                    durationMin: dto.durationMin,
                    sessionType: dto.sessionType, // EXTRA
                    status: SessionStatus.SCHEDULED,
                    createdBy: 'TUTOR',
                },
            });
        } catch (error) {
            throw error;
        }
    }



    async createDboutSession(dto: CreateGroupDboutSessionDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
                select: {
                    id: true,
                    tutorId: true,
                    type: true,
                    status: true,
                },
            });

            if (!klass) {
                throw new NotFoundException('Class not found');
            }

            if (klass.tutorId !== tutor.id) {
                throw new ForbiddenException('You do not own this class');
            }

            if (klass.type !== ClassType.GROUP) {
                throw new BadRequestException(
                    'Dbout sessions are allowed only for group classes',
                );
            }

            if (!['PUBLISHED', 'ACTIVE'].includes(klass.status)) {
                throw new BadRequestException(
                    'Extra sessions can only be created for active or published classes',
                );
            }

            const requestedDate = new Date(dto.date);
            const startMinutes = toMinutes(dto.startTime);
            const endMinutes = startMinutes + dto.durationMin;

            if (dto.durationMin <= 0) {
                throw new BadRequestException('Invalid session duration');
            }

            const sessionStart = new Date(requestedDate);
            sessionStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0,);

            if (new Date() >= sessionStart) {
                throw new BadRequestException(
                    'Session must be scheduled in the future',
                );
            }

            const timeOffs = await this.prisma.tutorTimeOff.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                },
            });

            for (const t of timeOffs) {
                const tStart = toMinutes(t.startTime);
                const tEnd = toMinutes(t.endTime);

                if (startMinutes < tEnd && endMinutes > tStart) {
                    throw new BadRequestException(
                        'Selected time overlaps tutor time-off',
                    );
                }
            }

            const leave = await this.prisma.tutorLeave.findFirst({
                where: {
                    tutorId: tutor.id,
                    AND: [
                        { startDate: { lte: requestedDate } },
                        { endDate: { gte: requestedDate } },
                    ],
                },
            });

            if (leave) {
                throw new BadRequestException(
                    'Tutor is on leave on the selected date',
                );
            }

            const sessions = await this.prisma.session.findMany({
                where: {
                    tutorId: tutor.id,
                    date: requestedDate,
                },
            });

            for (const s of sessions) {
                const sStart = toMinutes(s.startTime);
                const sEnd = sStart + s.durationMin;

                if (startMinutes < sEnd && endMinutes > sStart) {
                    throw new BadRequestException(
                        'Tutor already has a session at this time',
                    );
                }
            }

            return await this.prisma.session.create({
                data: {
                    classId: klass.id,
                    tutorId: tutor.id,
                    studentId: null,
                    date: requestedDate,
                    startTime: dto.startTime,
                    durationMin: dto.durationMin,
                    sessionType: dto.sessionType, // EXTRA
                    status: SessionStatus.SCHEDULED,
                    createdBy: 'TUTOR',
                },
            });
        } catch (error) {
            throw error;
        }
    }


    private buildSessionStart(date: Date, startTime: string): Date {
        const minutes = toMinutes(startTime);

        const start = new Date(date);
        start.setHours(
            Math.floor(minutes / 60),
            minutes % 60,
            0,
            0,
        );

        return start;
    }


    async getUpcomingSession(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    role: true,
                    tutor: { select: { id: true } },
                    student: { select: { id: true } },
                },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const now = new Date()
            const today = new Date()
            today.setHours(0, 0, 0, 0);

            const where: Prisma.SessionWhereInput = {
                date: { gte: today },
                status: { in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'] }
            }

            if (user.role === 'TUTOR') {
                where.tutorId = user.tutor?.id
            }

            if (user.role === 'STUDENT') {
                where.studentId = user.student?.id
            }

            const sessions = await this.prisma.session.findMany({
                where,
                include: {
                    klass: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                },
                orderBy: [
                    { date: 'asc' },
                    { startTime: 'asc' },
                ],
            });

            const upcoming = sessions.filter((session) => {
                const sessionStart = this.buildSessionStart(
                    session.date,
                    session.startTime,
                );
                return sessionStart > now;
            });

            return upcoming;
        } catch (error) {
            throw error
        }
    }
}