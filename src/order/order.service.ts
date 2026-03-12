import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, ProductType } from "src/common/enums/order.enum";
import { PriceOn, PriceType } from "src/common/enums/price.enum";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminOrderFilterDto, CreateOrderDto, OrderFilterDto } from "./dtos/order.dto";
import { PrismaClient } from "@prisma/client/extension";
import { Prisma } from "@prisma/client";
import { CouponService } from "src/coupon/coupon.service";
import { PaymentService } from "src/payment/payment.service";
import { PaginationDto } from "common/dtos/pagination.dto";

@Injectable({})
export class OrderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly coupon: CouponService,
        private readonly paymentService: PaymentService,

    ) { }

    async checkout(classId: string, userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            })
            if (!student) throw new NotFoundException("Student account not found");

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    previewImg: true,
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


    private async getNextOrderSequence(tx: PrismaClient | Prisma.TransactionClient, year: number) {
        const existing = await tx.orderCounter.findUnique({ where: { year } });

        if (!existing) {
            const created = await tx.orderCounter.create({ data: { year, seq: 1 } });
            return created.seq;
        }

        const updated = await tx.orderCounter.update({
            where: { year },
            data: { seq: existing.seq + 1 },
        });

        return updated.seq;
    }


    async create(dto: CreateOrderDto, userId: string) {
        try {
            const order = await this.prisma.$transaction(async (tx) => {

                let klass: any;

                if (dto.itemType === PriceOn.CLASS) {
                    klass = await tx.tuitionClass.findUnique({
                        where: { id: dto.productId }
                    });

                    if (!klass) throw new NotFoundException("Class not found");
                }

                const student = await tx.student.findUnique({
                    where: { userId },
                    select: { id: true }
                });

                if (!student) throw new NotFoundException("Student account not found");

                const alreadyEnrolled = await tx.classEnrollment.findFirst({
                    where: {
                        classId: klass.id,
                        studentId: student.id
                    }
                });

                if (alreadyEnrolled)
                    throw new BadRequestException("You already purchased this class");

                const enrolledCount = await tx.classEnrollment.count({
                    where: { classId: klass.id }
                });

                if (enrolledCount >= klass.capacity)
                    throw new BadRequestException("Class is full");


                /* -------- PRICE CALCULATION -------- */

                const subtotal = Math.round((klass.price ?? 0) * 100);

                const commissions = await tx.commissionSetting.findMany({
                    where: {
                        appliesTo: dto.itemType,
                        status: 'ACTIVE'
                    },
                });

                let totalCommission = 0;

                for (const c of commissions) {
                    if (c.type === PriceType.FIXED) {
                        totalCommission += Math.round((c.value ?? 0) * 100);
                    }
                    else if (c.type === PriceType.PERCENTAGE) {
                        totalCommission += Math.round((c.value / 100) * subtotal);
                    }
                }

                const taxes = await tx.taxSetting.findMany({
                    where: { status: 'ACTIVE' },
                });

                let totalTaxAmount = 0;
                let totalTaxPercentage = 0;

                for (const t of taxes) {
                    const tax = Math.round((t.value / 100) * subtotal);
                    totalTaxAmount += tax;
                    totalTaxPercentage += t.value;
                }

                const totalAmount = subtotal + totalTaxAmount;


                /* -------- ORDER NUMBER GENERATION -------- */

                const year = new Date().getFullYear();

                const seq = await this.getNextOrderSequence(tx, year);

                const padded = String(seq).padStart(4, '0');
                const orderCode = `SN-C-${year}-${padded}`;


                /* -------- CREATE ORDER -------- */

                const createdOrder = await tx.order.create({
                    data: {
                        userId,
                        orderNo: orderCode,
                        productType: dto.itemType,
                        productId: dto.productId,
                        basePrice: subtotal / 100,
                        commissionAmount: totalCommission / 100,
                        tax: totalTaxPercentage,
                        taxAmount: totalTaxAmount / 100,
                        totalAmount: totalAmount / 100,
                        status: OrderStatus.PENDING
                    }
                });


                return createdOrder;
            });

            if (dto.couponCode) {
                await this.coupon.createCouponRemption(
                    userId,
                    dto.couponCode,
                    order.id
                )
            }

            const payment = await this.paymentService.createRazorpayOrder(order.id, userId);

            return payment;
        } catch (error) {
            throw error;
        }
    }


    async getStatus(orderId: string) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    status: true
                }
            })

            if (!order) throw new BadRequestException("Something went wrong, Please try again");

            return order;
        } catch (error) {
            throw error;
        }
    }


    async getAll(dto: AdminOrderFilterDto) {
        try {
            const page = dto.page ? Number(dto.page) : 1;
            const limit = dto.limit ? Number(dto.limit) : 15;
            const skip = (page - 1) * limit;


            const where: Prisma.OrderWhereInput = {};

            if (dto.status) {
                where.status = dto.status;
            }

            if (dto.productType) {
                where.productType = dto.productType;
            }

            if (dto.from || dto.to) {
                where.createdAt = {};

                if (dto.from) {
                    where.createdAt.gte = new Date(dto.from);
                }

                if (dto.to) {
                    const toDate = new Date(dto.to);
                    toDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }
            }

            if (dto.search) {
                where.OR = [
                    {
                        orderNo: {
                            contains: dto.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            name: {
                                contains: dto.search,
                                mode: "insensitive",
                            },
                        },
                    },
                    {
                        user: {
                            email: {
                                contains: dto.search,
                                mode: "insensitive",
                            },
                        },
                    },
                    {
                        transactions: {
                            some: {
                                providerPaymentId: {
                                    contains: dto.search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                ];
            }


            const [orders, total] = await this.prisma.$transaction([

                this.prisma.order.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        transactions: true,
                        couponRedemption: true,
                    },
                }),

                this.prisma.order.count({ where }),
            ]);


            const revenue = await this.prisma.order.aggregate({
                where: {
                    status: OrderStatus.PAID,
                    ...(where.createdAt ? { createdAt: where.createdAt } : {}),
                },
                _sum: {
                    totalAmount: true,
                },
            });


            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalRevenue: revenue._sum.totalAmount ?? 0,
                orders,
            };
        } catch (error) {
            throw error;
        }
    }


    async getMyOrders(dto: OrderFilterDto, userId: string) {
        try {
            const page = dto.page ? Number(dto.page) : 1;
            const limit = dto.limit ? Number(dto.limit) : 10;
            const skip = (page - 1) * limit;

            let where: Prisma.OrderWhereInput = {
                userId
            };

            if (dto.status) {
                where.status = dto.status;
            }

            if (dto.productType) {
                where.productType = dto.productType;
            }

            if (dto.search) {
                where.OR = [
                    {
                        orderNo: {
                            contains: dto.search,
                            mode: "insensitive",
                        },
                    },
                ];
            }

            const [orders, total] = await this.prisma.$transaction([
                this.prisma.order.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),

                this.prisma.order.count({ where }),
            ]);

            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                orders
            };
        } catch (error) {
            throw error;
        }
    }


    async getById(orderId: string, userId: string) {

        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            },
            include: {
                transactions: true,
                couponRedemption: true,
            }
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        let product = {} as any;

        // if (order.productType === "COURSE") {
        //     product = await this.prisma.course.findUnique({
        //         where: { id: order.productId },
        //         select: {
        //             id: true,
        //             title: true,
        //             thumbnail: true
        //         }
        //     });
        // }

        if (order.productType === "CLASS") {
            product = await this.prisma.tuitionClass.findUnique({
                where: { id: order.productId },
                select: {
                    id: true,
                    title: true
                }
            });
        }

        return {
            ...order,
            product
        };
    }
}