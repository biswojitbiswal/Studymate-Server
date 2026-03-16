import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { ReviewDto, ReviewFilterDto, ReviewStatusDto } from "./dtos/review.dto";
import { Status } from "common/enums/tuition-class.enum";

@Injectable({})
export class ReviewService {
    constructor(private readonly prisma: PrismaService) { }


    async create(dto: ReviewDto, userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!student) throw new NotFoundException("Student account not found");

            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: dto.classId },
                select: {
                    id: true,
                    tutorId: true
                }
            })
            if (!klass) throw new NotFoundException("Class not found");

            const enrollment = await this.prisma.classEnrollment.findUnique({
                where: {
                    classId_studentId: {
                        classId: klass.id,
                        studentId: student.id
                    }
                }
            })
            if (!enrollment) throw new NotFoundException("You do not own this class");

            let review = await this.prisma.review.findUnique({
                where: {
                    enrollmentId: enrollment.id,
                    studentId: student.id,
                    klassId: klass.id,
                    tutorId: klass.tutorId,
                }
            })
            if (review) throw new BadRequestException("You have already added");

            review = await this.prisma.review.create({
                data: {
                    studentId: student.id,
                    klassId: klass.id,
                    tutorId: klass.tutorId,
                    enrollmentId: enrollment.id,
                    rating: dto.rating,
                    reviewText: dto.reviewText
                }
            })
        } catch (error) {
            throw error;
        }
    }


    async getAll(dto: ReviewFilterDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                tutorId,
                classId
            } = dto;

            const skip = (page - 1) * limit;

            const where: any = {};

            if (tutorId) {
                where.tutorId = tutorId;
            }

            if (classId) {
                where.klassId = classId;
            }

            if (search) {
                where.reviewText = {
                    contains: search,
                    mode: "insensitive",
                };
            }

            const [reviews, total] = await this.prisma.$transaction([
                this.prisma.review.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                        klass: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                }),

                this.prisma.review.count({
                    where,
                }),
            ]);

            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    reviews
                },
            };
        } catch (error) {
            throw error;
        }
    }



    async getBrowse(dto: ReviewFilterDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                tutorId,
                classId
            } = dto;

            const skip = (page - 1) * limit;

            const where: any = {
                status: Status.ACTIVE
            };

            if (tutorId) {
                where.tutorId = tutorId;
            }

            if (classId) {
                where.klassId = classId;
            }

            if (search) {
                where.reviewText = {
                    contains: search,
                    mode: "insensitive",
                };
            }

            const [reviews, total] = await this.prisma.$transaction([
                this.prisma.review.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                        klass: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                }),

                this.prisma.review.count({
                    where,
                }),
            ]);

            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    reviews
                },
            };
        } catch (error) {
            throw error;
        }
    }



    async statusUpdate(id: string, dto: ReviewStatusDto) {
        try {
            let review = await this.prisma.review.findUnique({
                where: { id },
                select: {
                    id: true
                }
            })
            if (!review) throw new NotFoundException("Review not found");

            review = await this.prisma.review.update({
                where: { id: review.id },
                data: {
                    status: dto.status
                }
            })

            return review;
        } catch (error) {
            throw error
        }
    }
}