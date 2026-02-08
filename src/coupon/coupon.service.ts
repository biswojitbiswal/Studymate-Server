import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponFilterDto, CouponValidateDto, CreateCouponDto, UpdateCouponDto } from './dtos/coupon.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Prisma } from '@prisma/client';
import { Status } from 'src/common/enums/tuition-class.enum';
import { PriceOn, PriceType } from 'src/common/enums/price.enum';
import { RedeemedStatus } from 'src/common/enums/coupon.enum';

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



    async update(id: string, dto: UpdateCouponDto) {
        console.log(dto);

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


    async getCouponForCheckout(userId: string, dto: CouponFilterDto) {
        try {
            const now = new Date();

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.productId },
                select: { price: true }
            });

            if (!klass) throw new NotFoundException("Class not found");

            const price = klass.price ?? 0;

            const userUsage = await this.prisma.couponRedemption.groupBy({
                by: ['couponId'],
                where: {
                    userId,
                    status: RedeemedStatus.REDEEMED
                },
                _count: true
            });

            const userUsageMap = new Map(
                userUsage.map(u => [u.couponId, u._count])
            );

            const coupons = await this.prisma.coupon.findMany({
                where: {
                    status: 'ACTIVE',

                    OR: [
                        { startsAt: null },
                        { startsAt: { lte: now } }
                    ],

                    AND: [
                        {
                            OR: [
                                { endsAt: null },
                                { endsAt: { gte: now } }
                            ]
                        },
                        { appliesTo: dto.itemType }
                    ]
                }
            });

            const validCoupons = [] as any;

            for (const c of coupons) {
                if (dto.itemType === PriceOn.CLASS && c.classId && c.classId !== dto.productId)
                    continue;

                if (dto.itemType === PriceOn.RESOURCE && c.resourceId && c.resourceId !== dto.productId)
                    continue;

                if (c.minOrderValue && price < c.minOrderValue)
                    continue;

                const usedByUser = userUsageMap.get(c.id) || 0;
                if (c.perUserLimit && usedByUser >= c.perUserLimit)
                    continue;

                if (c.usageLimit) {
                    const totalUsed = await this.prisma.couponRedemption.count({
                        where: { couponId: c.id, status: RedeemedStatus.REDEEMED }
                    });
                    if (totalUsed >= c.usageLimit)
                        continue;
                }

                validCoupons.push({
                    id: c.id,
                    code: c.code,
                    description: c.description,
                    discountType: c.discountType,
                    discountValue: c.discountValue,
                    maxDiscount: c.maxDiscount,
                    minOrderValue: c.minOrderValue
                });
            }

            return validCoupons;
        } catch (error) {
            throw error;
        }
    }



    // async redemeCoupon(customerId: string, id: string) {
    //     try {

    //     } catch (error) {
    //         if (error instanceof HttpException) {
    //             throw error;
    //         }
    //         throw new InternalServerErrorException("Internal Server Error")
    //     }
    // }



    async couponValidate(dto: CouponValidateDto, userId: string) {
        try {
            const coupon = await this.prisma.coupon.findUnique({
                where: {
                    code: dto.couponCode,
                },
            })
            if (!coupon || coupon.status !== 'ACTIVE') {
                throw new BadRequestException("Invalid Coupon");
            }

            if (coupon.appliesTo !== dto.itemType) {
                throw new BadRequestException('Coupon not applicable for this item');
            }

            const now = new Date();
            if (coupon.startsAt && now < coupon.startsAt) {
                throw new BadRequestException("Coupon not stated yet.");
            }
            if (coupon.endsAt && now > coupon.endsAt) {
                throw new BadRequestException("Coupon expired.");
            }

            let pricePaise = 0;

            if (dto.itemType === PriceOn.CLASS) {

                const klass = await this.prisma.tuitionClass.findUnique({
                    where: { id: dto.productId },
                    select: { id: true, price: true }
                });

                if (!klass) throw new NotFoundException('Class not found');

                pricePaise = Math.round((klass.price ?? 0) * 100);
            }

            if (coupon.classId) {
                if (coupon.classId !== dto.productId) {
                    throw new BadRequestException('Coupon not valid for this class');
                }
            }

            if (coupon.resourceId) {
                if (coupon.resourceId !== dto.productId) {
                    throw new BadRequestException('Coupon not valid for this resource');
                }
            }

            const [totalCount, usedCount] = await this.prisma.$transaction([
                this.prisma.couponRedemption.count({
                    where: {
                        couponId: coupon.id,
                        status: RedeemedStatus.REDEEMED
                    }
                }),
                this.prisma.couponRedemption.count({
                    where: {
                        couponId: coupon.id,
                        userId,
                        status: RedeemedStatus.REDEEMED
                    }
                })
            ])

            if (coupon.usageLimit && totalCount >= coupon.usageLimit) {
                throw new BadRequestException("Coupon usage limit exceed");
            }

            if (coupon.perUserLimit && usedCount >= coupon.perUserLimit) {
                throw new BadRequestException("Coupon usage limit exceed");
            }

            if (coupon.minOrderValue) {
                const minOrderPaise = Math.round(coupon.minOrderValue * 100);

                if (pricePaise < minOrderPaise) {
                    throw new BadRequestException(
                        `Coupon valid only above ₹${coupon.minOrderValue}`
                    );
                }
            }


            let discountPaise = 0;

            if (coupon.discountType === PriceType.PERCENTAGE) {

                discountPaise = Math.round(
                    (coupon.discountValue / 100) * pricePaise
                );

                if (coupon.maxDiscount) {
                    const maxDiscountPaise = Math.round(coupon.maxDiscount * 100);
                    if (discountPaise > maxDiscountPaise) {
                        discountPaise = maxDiscountPaise;
                    }
                }

            } else {
                discountPaise = Math.round(coupon.discountValue * 100);
            }

            const subtotalPaise = pricePaise;
            const discountedSubtotalPaise = Math.max(subtotalPaise - discountPaise, 0);

            const taxes = await this.prisma.taxSetting.findMany({
                where: { status: 'ACTIVE' }
            });

            let taxPaise = 0;
            let totalPecentage = 0;
            for (const t of taxes) {
                const tPaise = Math.round((t.value / 100) * discountedSubtotalPaise);
                taxPaise += tPaise;
                totalPecentage += t.value ?? 0;
            }

            const totalPaise = discountedSubtotalPaise + taxPaise;

            return {
                valid: true,
                couponId: coupon.id,
                pricing: {
                    subtotal: subtotalPaise / 100,
                    discount: discountPaise / 100,
                    totaltaxAmount: taxPaise / 100,
                    toalTaxPecentage: totalPecentage,
                    totalAmount: totalPaise / 100
                }
            };
        } catch (error) {
            throw error;
        }
    }
}
