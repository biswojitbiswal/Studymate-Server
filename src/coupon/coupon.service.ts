import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dtos/coupon.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Prisma } from '@prisma/client';
import { Status } from 'src/common/enums/tuition-class.enum';

@Injectable()
export class CouponService {
    constructor(private readonly prisma: PrismaService) { }


    async create(dto: CreateCouponDto) {
        try {
            const code = dto.code.trim().toUpperCase();

            const coupon = await this.prisma.coupon.create({
                data: {
                    code,
                    description: dto.description,

                    discountType: dto.discountType,
                    discountValue: dto.discountValue,

                    appliesTo: dto.appliesTo,
                    classId: dto.classId,
                    // resourceId: dto.resourceId,

                    minOrderValue: dto.minOrderValue,
                    maxDiscount: dto.maxDiscount,

                    startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                    endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,

                    status: dto.status ?? 'INACTIVE',
                },
            });

            return {
                error: 0,
                message: 'Coupon created successfully',
                data: coupon,
            };
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new BadRequestException('Coupon code already exists');
            }
            console.error('Error creating coupon:', error);
            throw new InternalServerErrorException('Failed to create coupon');
        }
    }



    async getAll(dto: PaginationDto) {
        try {
            const page = Number(dto.page ?? 1);
            const limit = Math.min(Number(dto.limit ?? 20), 100);
            const skip = (page - 1) * limit;

            const search = dto.search?.trim();

            const where: Prisma.CouponWhereInput = search
                ? {
                    OR: [
                        {
                            code: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                        {
                            description: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    ],
                }
                : {};

            const [items, total] = await this.prisma.$transaction([
                this.prisma.coupon.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.coupon.count({ where }),
            ]);

            return {
                page,
                limit,
                total,
                data: items,
            };
        } catch (error) {
            console.error('Error fetching coupons:', error);
            throw new InternalServerErrorException('Failed to get coupons');
        }
    }


    async getByID(id: string) {
        try {
            const coupon = await this.prisma.coupon.findUnique({
                where: { id },
            });

            if (!coupon) {
                throw new NotFoundException('Coupon not found');
            }

            return coupon;
        } catch (error) {
            console.error('Error fetching coupon by ID:', error);
            throw new InternalServerErrorException('Failed to get coupon by ID');
        }
    }



    async delete(id: string) {
        try {
            const existing = await this.prisma.coupon.findUnique({ where: { id } });
            if (!existing) throw new NotFoundException('Coupon not found');

            await this.prisma.couponRedemption.deleteMany({
                where: { couponId: id },
            });

            await this.prisma.coupon.delete({ where: { id } });

            return existing;
        } catch (error) {
            throw error;
        }
    }



    async update(id: string, dto: Partial<CreateCouponDto>) {
        const existing = await this.prisma.coupon.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Coupon not found');

        const data: Prisma.CouponUpdateInput = {
            description: dto.description ?? undefined,
            discountType: dto.discountType ?? undefined,
            discountValue: dto.discountValue ?? undefined,
            appliesTo: dto.appliesTo ?? undefined,
            classId: dto.classId ?? undefined,
            // resourceId: dto.resourceId ?? undefined,
            minOrderValue: dto.minOrderValue ?? undefined,
            maxDiscount: dto.maxDiscount ?? undefined,
            usageLimit: dto.usageLimit ?? undefined,
            perUserLimit: dto.perUserLimit ?? undefined,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
            status: dto.status ?? undefined,
        };

        const updated = await this.prisma.coupon.update({
            where: { id },
            data,
        });

        return {
            error: 0,
            message: 'Coupon updated successfully',
            data: updated,
        };
    }


    // async getForCustomer(customerId: string) {
    //     try {
    //         const curr = new Date();

    //         // 1) DB: only status + redemption filters
    //         const coupons = await this.prisma.coupon.findMany({
    //             where: {
    //                 status: Status.ACTIVE,
    //                 redemptions: {
    //                     none: {
    //                         customerId,
    //                     },
    //                 },
    //             },
    //             select: {
    //                 id: true,
    //                 title: true,
    //                 description: true,
    //                 code: true,
    //                 type: true,
    //                 value: true,
    //                 status: true,
    //                 startAt: true,
    //                 endAt: true,
    //                 minOrderAmount: true,
    //                 maxDiscount: true,
    //                 perUserLimit: true,
    //                 timesUsed: true,
    //             },
    //             orderBy: { createdAt: 'desc' },
    //         });

    //         // 2) TS: apply optional start/end date logic
    //         const available = coupons.filter(c => {
    //             const start = c.startAt;
    //             const end = c.endAt;

    //             // case 1: no dates at all -> always show (only status + redemption checked)
    //             if (!start && !end) return true;

    //             // case 2: has startAt, but not reached yet -> hide
    //             if (start && curr < start) return false;

    //             // case 3: has endAt, already passed -> hide
    //             if (end && curr > end) return false;

    //             // otherwise: valid
    //             return true;
    //         });

    //         if (!available || available.length === 0) {
    //             return {
    //                 error: 0,
    //                 message: "No available coupons",
    //                 data: [],
    //             };
    //         }

    //         return {
    //             error: 0,
    //             message: "Coupons retrieved successfully",
    //             data: available,
    //         };
    //     } catch (error) {
    //         if (error instanceof HttpException) {
    //             throw error;
    //         }
    //         console.error(error);
    //         throw new InternalServerErrorException("Internal Server Error");
    //     }
    // }


    // async redemeCoupon(customerId: string, id: string) {
    //     try {

    //     } catch (error) {
    //         if (error instanceof HttpException) {
    //             throw error;
    //         }
    //         throw new InternalServerErrorException("Internal Server Error")
    //     }
    // }
}
