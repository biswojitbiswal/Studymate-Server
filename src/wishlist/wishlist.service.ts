import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginationDto } from "common/dtos/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable({})
export class WishlistService {
    constructor(private readonly prisma: PrismaService) { }


    async toggle(id: string, userId: string) {
        try {
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id },
                select: { id: true },
            });

            if (!klass) {
                throw new NotFoundException("Class not found");
            }


            const wishlist = await this.prisma.wishlist.findUnique({
                where: {
                    userId_productId: {
                        userId,
                        productId: klass.id,
                    },
                },
            });


            if (wishlist) {
                const deleted = await this.prisma.wishlist.delete({
                    where: {
                        userId_productId: {
                            userId,
                            productId: klass.id,
                        },
                    },
                });

                return {
                    message: "Class removed successfully from wishlist",
                };
            }

            await this.prisma.wishlist.create({
                data: {
                    userId,
                    productId: klass.id,
                },
            });

            return {
                message: "Class added successfully to wishlist",
            };
        } catch (error) {
            throw error;
        }
    }



    async getMyWishlists(userId: string, dto: PaginationDto) {
        try {
            const page = dto.page ? Number(dto.page) : 1;
            const limit = dto.limit ? Number(dto.limit) : 10;
            const search = dto.search?.trim();

            const skip = (page - 1) * limit;

            const where: any = {
                userId,
                ...(search && {
                    OR: [
                        {
                            product: {
                                title: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    ],
                }),
            };

            const [wishlists, total] = await this.prisma.$transaction([
                this.prisma.wishlist.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                seo_name: true,
                                description: true,
                                previewImg: true,
                                previewVdo: true,
                                price: true,
                                capacity: true,
                                type: true,
                                joiningStartDate: true,
                                joiningEndDate: true,
                                startDate: true,
                                endDate: true,
                                startTime: true,
                                durationMin: true,
                                isPaid: true,
                                syllabus: true,
                                tutor: {
                                    select: {
                                        id: true,
                                        rating: true,
                                        totalStudents: true,
                                        yearsOfExp: true,
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                avatar: true
                                            }
                                        }
                                    }
                                },
                                subject: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                board: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                level: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                language: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        },
                    },
                }),
                this.prisma.wishlist.count({
                    where,
                }),
            ]);

            const data = wishlists.map(f => f.product);

            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                data 
            };
        } catch (error) {
            throw error;
        }
    }

}