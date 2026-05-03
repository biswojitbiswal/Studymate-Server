import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TaskStatus, TaskType } from "common/enums/task.enum";
import { ClassStatus } from "common/enums/tuition-class.enum";
import { PrismaService } from "prisma/prisma.service";
import { TutorAnalyticsDto } from "./dtos/admin.dto";

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
                        id: true,
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
                        id: true,
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
                totalHours: ((totalHours._sum.durationMin ?? 0) / 60),
                upcomingSessions,
                recentResources,
                recentAssignments,
            }
        } catch (error) {
            throw error;
        }
    }


    async tutorAnalytics(userId: string, dto: TutorAnalyticsDto) {
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


            const month = Number(dto.month); // 1–12
            const year = Number(dto.year);

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);

            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentTimeString = now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });


            const [
                wallet,
                totalClasses,
                pendingClasses,
                ongoingClasses,
                completedClasses,
                totalStudents,
                totalHours,
                rawSessions,
                ledgers,
                topClassesRaw,
                studentFeedbacks,
            ] = await this.prisma.$transaction([
                this.prisma.wallet.findUnique({
                    where: { tutorId: tutor.id }
                }),

                this.prisma.tuitionClass.count({
                    where: {
                        tutorId: tutor.id,
                        status: { not: ClassStatus.ARCHIVED }
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        tutorId: tutor.id,
                        status: { in: [ClassStatus.PUBLISHED, ClassStatus.DRAFT] }
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
                    _count: { studentId: true },
                    orderBy: {
                        studentId: "asc",
                    },
                }),
                this.prisma.session.aggregate({
                    where: { tutorId: tutor.id },
                    _sum: { durationMin: true }
                }),


                this.prisma.session.findMany({
                    where: {
                        tutorId: tutor.id,
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        status: true,
                        date: true,
                        startTime: true,
                    },
                }),
                this.prisma.ledger.findMany({
                    where: {
                        tutorId: tutor.id,
                        type: "CREDIT",
                        source: "CLASS_PURCHASE",
                        // status: "AVAILABLE", // 🔥 only settled earnings
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: {
                        amount: true,
                        createdAt: true,
                    },
                }),
                this.prisma.review.groupBy({
                    by: ['klassId'],
                    where: { klassId: { in: classIds } },
                    _avg: { rating: true },
                    _count: { rating: true },
                    orderBy: {
                        _avg: {
                            rating: "desc"
                        }
                    },
                    take: 3
                }),
                this.prisma.review.findMany({
                    where: { tutorId: tutor.id },
                    orderBy: { createdAt: "desc" },
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

            const sessionOverviewMap = {
                Scheduled: 0,
                Pending: 0,
                Cancelled: 0,
                Completed: 0
            }

            rawSessions.forEach((session) => {
                const isPastDate = session.date < now;
                const isToday =
                    session.date.toDateString() === now.toDateString();

                const isPastTime =
                    isToday && session.startTime < currentTimeString;

                switch (session.status) {
                    case "PENDING_TUTOR_APPROVAL":
                        sessionOverviewMap.Pending++;
                        break;

                    case "CANCELLED_BY_TUTOR":
                    case "CANCELLED_BY_STUDENT":
                        sessionOverviewMap.Cancelled++;
                        break;

                    case "COMPLETED":
                        sessionOverviewMap.Completed++;
                        break;

                    case "SCHEDULED":
                        if (isPastDate || isPastTime) {
                            // 🔥 treat missed scheduled as completed
                            sessionOverviewMap.Completed++;
                        } else {
                            sessionOverviewMap.Scheduled++;
                        }
                        break;
                }
            });

            const sessionOverview = Object.entries(sessionOverviewMap).map(
                ([name, value]) => ({ name, value })
            );


            const earningsMap: Record<string, number> = {};

            // initialize all days (important for chart continuity)
            const daysInMonth = endDate.getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const label = `${i}`;
                earningsMap[label] = 0;
            }

            // group data
            ledgers.forEach((entry) => {
                const day = new Date(entry.createdAt).getDate().toString();
                earningsMap[day] += entry.amount || 0;
            });

            const monthName = startDate.toLocaleString("en-US", {
                month: "short",
            });

            const earningsOverview = Object.entries(earningsMap).map(
                ([day, amount]) => ({
                    name: `${day} ${monthName}`,
                    earnings: Number((amount).toFixed(2)), // if paise → ₹
                })
            );


            const classDetails = await this.prisma.tuitionClass.findMany({
                where: {
                    id: { in: topClassesRaw.map((c) => c.klassId) },
                },
                select: {
                    id: true,
                    title: true,
                    previewImg: true
                },
            });

            const topClasses = topClassesRaw.map((item) => {
                const klass = classDetails.find(
                    (c) => c.id === item.klassId
                );

                const avgRating = item._avg?.rating ?? 0;
                const totalReviews =
                    typeof item._count === "object" && item._count?.rating
                        ? item._count.rating
                        : 0;

                return {
                    id: item.klassId,
                    title: klass?.title || "",
                    previewImage: klass?.previewImg || "",
                    avgRating: Number(avgRating.toFixed(1)),
                    totalReviews,
                };
            });

            return {
                wallet,
                totalClasses,
                pendingClasses,
                ongoingClasses,
                completedClasses,
                totalStudents: totalStudents.length,
                totalHours: ((totalHours._sum.durationMin ?? 0) / 60),
                sessionOverview,
                earningsOverview,
                topClasses,
                studentFeedbacks,
            };
        } catch (error) {
            throw error;
        }
    }
}