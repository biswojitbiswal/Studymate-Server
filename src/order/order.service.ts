import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductType } from "src/common/enums/order.enum";
import { PriceOn, PriceType } from "src/common/enums/price.enum";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class OrderService {
    constructor(private readonly prisma: PrismaService) { }

    async checkout(classId: string, userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: {userId},
                select: {id: true}
            })
            if(!student) throw new NotFoundException("Student account not found");

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    previewImg: true,
                    sessions: true,
                    capacity: true,
                    seo_name: true,
                    type: true,
                    daysOfWeek: true,
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
                    }
                }
            })

            if (!klass) throw new NotFoundException("Class not found");

            const alreadyEnrolled = await this.prisma.classEnrollment.findFirst({
                where: {
                    classId,
                    studentId: student.id
                }
            });

            if (alreadyEnrolled) {
                throw new BadRequestException("You already purchased this class");
            }

            const enrolledCount = await this.prisma.classEnrollment.count({
                where: { classId }
            });

            if (enrolledCount >= klass.capacity) {
                throw new BadRequestException("Class is full");
            }


            let itemType: ProductType = ProductType.CLASS;
            let subtotal = Math.round((klass?.price ?? 0) * 100)

            // Here We dont need, we need it when we create order
            // const commissions = await this.prisma.commissionSetting.findMany({
            //     where: {
            //         appliesTo: itemType,
            //         status: 'ACTIVE'
            //     },
            // });

            // let totalCommission = 0;
            // for(let c of commissions){
            //     if(c.type === PriceType.FIXED){
            //         totalCommission += c.value ?? 0;
            //     } else if(c.type === PriceType.PERCENTAGE){
            //         const total = (c.value / 100) * (subtotal ?? 0);
            //         totalCommission += total;
            //     }
            // }

            const taxes = await this.prisma.taxSetting.findMany({
                where: { status: 'ACTIVE' },
            })

            let totaltaxAmount = 0;
            let toalTaxPecentage = 0;
            for (let t of taxes) {
                const tax = Math.round((t.value / 100) * subtotal);
                totaltaxAmount += tax;
                toalTaxPecentage += t.value;
            }

            const totalAmount = (subtotal ?? 0) + (totaltaxAmount ?? 0);

            return {
                klass,
                pricing: {
                    subtotal: subtotal / 100,
                    toalTaxPecentage,
                    totaltaxAmount: totaltaxAmount / 100,
                    totalAmount: totalAmount / 100
                }
            }
        } catch (error) {
            throw error;
        }
    }
}