import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma, Roles, TutorStatus } from "@prisma/client";
import { TaskStatus, TaskType } from "common/enums/task.enum";
import { ClassStatus } from "common/enums/tuition-class.enum";
import { PrismaService } from "prisma/prisma.service";
import { AdminAnalyticsDto, TutorAnalyticsDto } from "./dtos/admin.dto";
import { SessionStatus } from "common/enums/session.enum";
import { it } from "node:test";

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

    async adminAnalytics(dto: AdminAnalyticsDto) {
        try {
            const fromDt = new Date(dto.fromDate);
            const toDt = new Date(dto.toDate);
            toDt.setHours(23, 59, 59, 999);

            const diffInDays = Math.ceil((toDt.getTime() - fromDt.getTime()) / (1000 * 60 * 60 * 24));

            let groupId;
            console.log(diffInDays);

            if (diffInDays <= 30) {
                // Group by day
                groupId = {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                };
            }
            else if (diffInDays <= 110) {
                // Group by week
                groupId = {
                    // $dateTrunc: {
                    //     date: "$createdAt",
                    //     unit: "week"
                    // }
                    year: { $isoWeekYear: "$createdAt" },
                    week: { $isoWeek: "$createdAt" }
                }
            }
            else if (diffInDays <= 620) {
                // Group by month
                groupId = {
                    $dateToString: {
                        format: "%Y-%m",
                        date: "$createdAt"
                    }
                }
            }
            else {
                // Group by year
                groupId = {
                    $dateToString: {
                        format: "%Y",
                        date: "$createdAt"
                    }
                }
            }

            interface sessionOverview {
                _id: string;
                count: number;
            }

            interface userOverview {
                _id: {
                    date: string,
                    role: string
                },
                count: number,
            }
            const [
                totalUser,
                totalStudent,
                totalTutor,
                totalTutorReq,
                totalClasses,
                ongoingClasses,
                completedClasses,
                totalEarning,
                totalTaxes,
                totalPayouts,
                totalCommission,
                totalDiscount,
                earnings,
                sessionsRaw,
                usersRaw
            ] = await this.prisma.$transaction([
                this.prisma.user.count({
                    where: {
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                }),
                this.prisma.user.count({
                    where: {
                        role: Roles.STUDENT,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    }
                }),
                this.prisma.user.count({
                    where: {
                        role: Roles.TUTOR,
                        tutor: {
                            tutorStatus: TutorStatus.APPROVED,
                            createdAt: {
                                gte: fromDt,
                                lte: toDt
                            }
                        }
                    }
                }),
                this.prisma.user.count({
                    where: {
                        role: Roles.STUDENT,
                        signupIntent: Roles.TUTOR,
                        tutor: {
                            tutorStatus: TutorStatus.PENDING_REVIEW,
                            createdAt: {
                                gte: fromDt,
                                lte: toDt
                            }
                        }
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        status: { notIn: [ClassStatus.DRAFT, ClassStatus.ARCHIVED] }
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        status: ClassStatus.ACTIVE
                    }
                }),
                this.prisma.tuitionClass.count({
                    where: {
                        status: ClassStatus.COMPLETED
                    }
                }),
                this.prisma.order.aggregate({
                    where: {
                        status: OrderStatus.PAID,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                    _sum: { totalAmount: true }
                }),
                this.prisma.order.aggregate({
                    where: {
                        status: OrderStatus.PAID,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                    _sum: { taxAmount: true }
                }),
                this.prisma.order.aggregate({
                    where: {
                        status: OrderStatus.PAID,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                    _sum: { basePrice: true }
                }),
                this.prisma.order.aggregate({
                    where: {
                        status: OrderStatus.PAID,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                    _sum: { commissionAmount: true }
                }),
                this.prisma.order.aggregate({
                    where: {
                        status: OrderStatus.PAID,
                        createdAt: {
                            gte: fromDt,
                            lte: toDt
                        }
                    },
                    _sum: { discountAmount: true }
                }),
                this.prisma.order.aggregateRaw({
                    pipeline: [
                        {
                            $match: {
                                status: OrderStatus.PAID,
                                createdAt: {
                                    $gte: { $date: fromDt.toISOString() },
                                    $lte: { $date: toDt.toISOString() }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: groupId,
                                earning: {
                                    $sum: {
                                        $subtract: [
                                            "$commissionAmount",
                                            {
                                                $ifNull: ["$discountAmount", 0]
                                            }
                                        ]
                                    }
                                }
                            }
                        },
                        {
                            $sort: {
                                _id: 1
                            }
                        }
                    ]
                }),
                this.prisma.session.aggregateRaw({
                    pipeline: [
                        {
                            $match: {
                                status: { $in: [SessionStatus.SCHEDULED, SessionStatus.COMPLETED, SessionStatus.PENDING_TUTOR_APPROVAL] },
                                date: {
                                    $gte: { $date: fromDt.toISOString() },
                                    $lte: { $date: toDt.toISOString() }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$sessionType",
                                count: {
                                    $sum: 1
                                }
                            }
                        },
                        {
                            $sort: {
                                _id: 1
                            }
                        }
                    ]
                }),
                this.prisma.user.aggregateRaw({
                    pipeline: [
                        {
                            $match: {
                                createdAt: {
                                    $gte: { $date: fromDt.toISOString() },
                                    $lte: { $date: toDt.toISOString() }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    date: groupId,
                                    role: "$role"
                                },
                                count: {
                                    $sum: 1
                                }
                            }
                        },
                        {
                            $sort: {
                                _id: 1
                            }
                        }
                    ]
                })
            ])

            const sessions = sessionsRaw as unknown as sessionOverview[];
            const users = usersRaw as unknown as userOverview[];

            const sessionOverview = {
                REGULAR: 0,
                EXTRA: 0,
                DOUBT: 0,
            };

            for (const item of sessions) {
                sessionOverview[item._id] = item.count;
            }

            let map = {} as any

            for (const item of users) {
                if (item._id.role !== 'ADMIN') {
                    const date = item._id.date;
                    const role = item._id.role;

                    if (!map[date]) {
                        map[date] = {
                            date,
                            Tutor: role === 'TUTOR' ? item.count : 0,
                            Student: role === 'STUDENT' ? item.count : 0,
                        }
                    } else {
                        if (role === "TUTOR") {
                            map[date].Tutor += item.count;
                        }

                        if (role === "STUDENT") {
                            map[date].Student += item.count;
                        }
                    }
                }
            }


            const netPlatformRevenue = Number(totalCommission._sum.commissionAmount ?? 0) - Number(totalDiscount._sum.discountAmount ?? 0);

            return {
                totalUser,
                totalStudent,
                totalTutor,
                totalTutorReq,
                totalClasses,
                ongoingClasses,
                completedClasses,
                totalEarning: totalEarning._sum.totalAmount,
                totalTaxes: totalTaxes._sum.taxAmount,
                totalPayouts: totalPayouts._sum.basePrice,
                totalCommission: totalCommission._sum.commissionAmount,
                totalDiscount: totalDiscount._sum.discountAmount,
                earnings,
                sessionOverview,
                revenueSummary: [
                    {
                        label: "Total Earning",
                        value: Number(totalEarning._sum.totalAmount ?? 0),
                    },
                    {
                        label: "Tax",
                        value: Number(totalTaxes._sum.taxAmount ?? 0),
                    },
                    {
                        label: "Payout",
                        value: Number(totalPayouts._sum.basePrice ?? 0),
                    },
                    {
                        label: "Commission",
                        value: Number(totalCommission._sum.commissionAmount ?? 0),
                    },
                    {
                        label: "Discount",
                        value: Number(totalDiscount._sum.discountAmount ?? 0),
                    },
                ],
                netPlatformRevenue,

                userOverview: Object.values(map)
            }
        } catch (error) {
            console.log(error);

        }
    }
}