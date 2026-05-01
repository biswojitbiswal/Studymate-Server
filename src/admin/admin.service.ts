import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TaskStatus, TaskType } from "common/enums/task.enum";
import { ClassStatus } from "common/enums/tuition-class.enum";
import { PrismaService } from "prisma/prisma.service";

@Injectable({})
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }


    async studentAnalytics(userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: {
                    id: true,
                    userId: true
                }
            })
            if (!student) throw new NotFoundException("Student not found");

            const enrolls = await this.prisma.classEnrollment.findMany({
                where: { studentId: student.id },
                select: {
                    klass: {
                        select: {
                            id: true
                        }
                    }
                }
            })

            const enrolledClassIds = enrolls.map((e) => e.klass.id);

            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentTimeString = now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });

            const ssessionWhere: Prisma.SessionWhereInput = {
                AND: [
                    {
                        classId: {
                            in: enrolledClassIds,
                        },
                    },
                    {
                        OR: [
                            { date: { gt: today } },
                            {
                                date: today,
                                startTime: { gt: currentTimeString },
                            },
                        ],
                    },
                ],
            };

            const [
                totalClasses,
                ongoingClasses,
                completedClasses,
                totalAssignments,
                pendingAssignments,
                ongoingAssignments,
                completedAssignments,
                totalHours,
                upcomingSessions,
                recentResources,
                recentAssignments,
            ] = await this.prisma.$transaction([
                this.prisma.classEnrollment.count({
                    where: { studentId: student.id }
                }),
                this.prisma.classEnrollment.count({
                    where: {
                        studentId: student.id,
                        klass: {
                            status: ClassStatus.ACTIVE
                        }
                    }
                }),
                this.prisma.classEnrollment.count({
                    where: {
                        studentId: student.id,
                        klass: {
                            status: ClassStatus.COMPLETED
                        }
                    }
                }),
                this.prisma.task.count({
                    where: {
                        studentId: student.id,
                        type: TaskType.ASSIGNED
                    }
                }),
                this.prisma.task.count({
                    where: {
                        studentId: student.id,
                        type: TaskType.ASSIGNED,
                        status: TaskStatus.TODO
                    }
                }),
                this.prisma.task.count({
                    where: {
                        studentId: student.id,
                        type: TaskType.ASSIGNED,
                        status: TaskStatus.ONGOING
                    }
                }),
                this.prisma.task.count({
                    where: {
                        studentId: student.id,
                        type: TaskType.ASSIGNED,
                        status: TaskStatus.COMPLETED
                    }
                }),
                this.prisma.session.aggregate({
                    where: {
                        classId: { in: enrolledClassIds },
                    },
                    _sum: { durationMin: true }
                }),
                this.prisma.session.findMany({
                    where: ssessionWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                this.prisma.resource.findMany({
                    where: {
                        classId: { in: enrolledClassIds },
                    },
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        title: true,
                        seo_name: true,
                        description: true,
                        type: true,
                        size: true,
                        fileUrl: true,
                        klass: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }),
                this.prisma.task.findMany({
                    where: {
                        studentId: student.id,
                        type: TaskType.ASSIGNED,
                        status: TaskStatus.TODO
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: {
                        title: true,
                        description: true,
                        dueDate: true,
                        tutorId: true,
                        classId: true,
                    }
                }),
            ])

            return {
                totalClasses,
                ongoingClasses,
                completedClasses,
                totalAssignments,
                pendingAssignments,
                ongoingAssignments,
                completedAssignments,
                totalHours,
                upcomingSessions,
                recentResources,
                recentAssignments,
            }
        } catch (error) {
            throw error;
        }
    }


    async tutorAnalytics(userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true
                        }
                    }
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            const classes = await this.prisma.tuitionClass.findMany({
                where: { tutorId: tutor.id },
                select: {
                    id: true
                }
            })
            const classIds = classes.map((c) => c.id);

            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentTimeString = now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });

            const ssessionWhere: Prisma.SessionWhereInput = {
                AND: [
                    {
                        classId: {
                            in: classIds,
                        },
                    },
                    {
                        OR: [
                            { date: { gt: today } },
                            {
                                date: today,
                                startTime: { gt: currentTimeString },
                            },
                        ],
                    },
                ],
            };

            const [
                wallet,
                totalClasses,
                pendingClasses,
                ongoinClasses,
                completedClasses,
                totalStudents,
                totalHours,
                earningsOverview,
                sessionsOverview,
                upcomingSessions,
                topClasses,
                studentFeedbacks,
            ] = await this.prisma.$transaction([
                this.prisma.wallet.findUnique({
                    where: { tutorId: tutor.id }
                }),

                this.prisma.tuitionClass.count({
                    where: { 
                        tutorId: tutor.id,
                        status: {not: ClassStatus.ARCHIVED}
                     }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        tutorId: tutor.id,
                        status: { in: [ClassStatus.PUBLISHED] }
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        tutorId: tutor.id,
                        status: { in: [ClassStatus.ACTIVE] }
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        tutorId: tutor.id,
                        status: { in: [ClassStatus.COMPLETED] }
                    }
                }),
                this.prisma.classEnrollment.groupBy({
                    by: ['studentId'],
                    where: { classId: { in: classIds } },
                    _count: { studentId: true }
                }),
                this.prisma.session.aggregate({
                    where: { tutorId: tutor.id },
                    _sum: { durationMin: true }
                }),

                this.prisma.session.findMany({
                    where: ssessionWhere
                }),
                this.prisma.review.groupBy({
                    by: ['klassId'],
                    where: { klassId: {in: classIds} },
                    _avg: {rating: true},
                    _count: {rating: true},
                    orderBy: {
                        _avg: {
                            rating: "desc"
                        }
                    },
                    take: 3
                }),
                this.prisma.review.findMany({
                    where: { tutorId: tutor.id },
                    orderBy: {createdAt: "desc"},
                    take: 3,
                    include: {
                        klass: {
                            select: {
                                id: true,
                                title: true
                            }
                        },
                        student: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true
                                    }
                                }
                            }
                        }
                    }
                }),
            ])


        } catch (error) {
            throw error;
        }
    }
}