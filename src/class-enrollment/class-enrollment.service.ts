import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
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
                select: {id: true}
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
}