import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PaginationDto } from "common/dtos/pagination.dto";
import { ProductType } from "common/enums/order.enum";
import { ClassStatus } from "common/enums/tuition-class.enum";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class ClassEnrollmentService {
    constructor(private readonly prisma: PrismaService) { }

    async createEnrollmentFromOrder(tx: Prisma.TransactionClient, orderId: string) {
        try {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    userId: true,
                    productId: true,
                    productType: true,
                    status: true,
                }
            })

            if (!order) return;
            if (order.status !== OrderStatus.PAID) return;

            const student = await tx.student.findUnique({
                where: { userId: order.userId },
                select: { id: true }
            });
            if (!student) return;

            if (order.productType === 'CLASS') {
                const klass = await tx.tuitionClass.findUnique({
                    where: { id: order.productId },
                    select: { id: true }
                });

                if (!klass) throw new Error("Purchased class no longer exists");

                const existing = await tx.classEnrollment.findUnique({
                    where: {
                        classId_studentId: {
                            classId: order.productId,
                            studentId: student.id
                        }
                    }
                })

                if (existing) return;

                await tx.classEnrollment.create({
                    data: {
                        classId: order.productId,
                        studentId: student.id,
                        orderId: order.id,
                        enrolledAt: new Date(),
                    }
                })
            }

            if (order.productType === 'RESOURCE') {

            }
        } catch (error) {
            throw error;
        }
    }


    async getClassByEnrollment(userId: string, dto: PaginationDto) {
        try {
            const page = dto.page ? Number(dto.page) : 1;
            const limit = dto.limit ? Number(dto.limit) : 10;
            const skip = (page - 1) * limit;

            // 1️⃣ find student
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!student)
                throw new NotFoundException("Student account not found");

            // 2️⃣ build where condition
            const where: Prisma.TuitionClassWhereInput = {
                enrollments: {
                    some: {
                        studentId: student.id
                    }
                }
            };

            if (dto.search) {
                where.OR = [
                    {
                        title: {
                            contains: dto.search,
                            mode: "insensitive"
                        }
                    },
                    {
                        description: {
                            contains: dto.search,
                            mode: "insensitive"
                        }
                    }
                ];
            }

            const total = await this.prisma.tuitionClass.count({ where });

            // 4️⃣ fetch classes
            const data = await this.prisma.tuitionClass.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    tutor: {
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
                    },
                    _count: {
                        select: { enrollments: true }
                    }
                }
            });

            if (data.length === 0)
                throw new NotFoundException("You have not enrolled in any class yet");

            const classIds = data.map(d => d.id);

            const orders = await this.prisma.order.findMany({
                where: {
                    userId,
                    productType: ProductType.CLASS,
                    productId: {in: classIds}
                },
                select: {
                    productId: true,
                    totalAmount: true
                }
            })

            const orderMap = new Map(
                orders.map(o => [o.productId, o.totalAmount])
            )

            const classes = data.map(cls => ({
                ...cls,
                paidAmount: orderMap.get(cls.id) ?? null
            }))
            
            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                classes
            };

        } catch (error) {
            throw error;
        }
    }


}