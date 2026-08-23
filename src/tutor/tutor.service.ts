import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Roles, SignupIntent, Status, TutorStatus } from "@prisma/client";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { TutorApplyDto, TutorBrowseFilterDto, TutorProfileUpdateDto, TutorSortBy } from "./dtos/tutor.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { title } from "process";


function isTutorProfileCompleted(tutor: {
    title?: string | null;
    bio?: string | null;
    yearsOfExp?: number | null;
    qualification?: string[];
    demoLinks?: string[];
    tutorSubjects?: { subjectId: string }[];
    tutorLevels?: { levelId: string }[];
}) {
    return Boolean(
        tutor.title &&
        tutor.bio &&
        tutor.yearsOfExp !== null &&
        tutor.yearsOfExp !== undefined &&
        tutor.qualification &&
        tutor.qualification.length > 0 &&
        tutor.demoLinks &&
        tutor.demoLinks.length > 0 &&
        tutor.tutorSubjects &&
        tutor.tutorSubjects.length > 0 &&
        tutor.tutorLevels &&
        tutor.tutorLevels.length > 0
    );
}


@Injectable({})
export class TutorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ) { }


    async tutorApply(
        userId: string,
        dto: TutorApplyDto,
        file: Express.Multer.File,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const existingTutor = await this.prisma.tutor.findUnique({
            where: { userId },
            include: {
                tutorSubjects: true,
                tutorLevels: true,
            },
        });

        // ❌ Approved tutors cannot edit
        if (existingTutor?.tutorStatus === "APPROVED") {
            throw new BadRequestException(
                "Approved tutors cannot modify their application",
            );
        }

        /* ---------------- AVATAR ---------------- */
        let avatar: string | undefined;

        if (file) {
            if (!file.mimetype.startsWith("image/")) {
                throw new BadRequestException("Only image files are allowed");
            }

            const upload = await this.cloudinary.uploadFile(file.buffer, {
                folder: "studynest/tutor",
            });

            avatar = upload.url;
        }

        /* ---------------- TRANSACTION ---------------- */
        await this.prisma.$transaction(async (tx) => {
            let tutorId: string;

            // ✅ CREATE
            if (!existingTutor) {
                const tutor = await tx.tutor.create({
                    data: {
                        userId,
                        title: dto.title,
                        yearsOfExp: dto.yearsOfExp,
                        bio: dto.bio,
                        qualification: dto.qualification ?? [],
                        demoLinks: dto.demoLinks ?? [],
                        tutorStatus: "PENDING_REVIEW",
                    },
                });

                tutorId = tutor.id;
            }
            // ✅ UPDATE (PENDING / REJECTED)
            else {
                const tutor = await tx.tutor.update({
                    where: { id: existingTutor.id },
                    data: {
                        title: dto.title,
                        yearsOfExp: dto.yearsOfExp,
                        bio: dto.bio,
                        qualification: dto.qualification ?? [],
                        demoLinks: dto.demoLinks ?? [],
                        tutorStatus: "PENDING_REVIEW", // reset status
                        updatedAt: new Date(),
                    },
                });

                tutorId = tutor.id;

                // 🔁 Clear old relations
                await tx.tutorSubject.deleteMany({
                    where: { tutorId },
                });

                await tx.tutorLevel.deleteMany({
                    where: { tutorId },
                });
            }

            // 🔗 Re-create subjects
            await tx.tutorSubject.createMany({
                data: dto.subjectIds.map((subjectId) => ({
                    tutorId,
                    subjectId,
                })),
            });

            // 🔗 Re-create levels
            await tx.tutorLevel.createMany({
                data: dto.levelIds.map((levelId) => ({
                    tutorId,
                    levelId,
                })),
            });

            // 🖼 Update avatar only if uploaded
            if (avatar) {
                await tx.user.update({
                    where: { id: userId },
                    data: { avatar },
                });
            }
        });

        return {
            message: "Tutor application submitted successfully and sent for review",
        };
    }




    async me(userId: string) {
        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                    },
                },
                tutorSubjects: {
                    select: {
                        subject: { select: { id: true, name: true } },
                    },
                },
                tutorLevels: {
                    select: {
                        level: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!tutor) throw new NotFoundException('Tutor not found');

        return tutor;
    }



    async getAll(dto: PaginationDto) {
        try {
            const page = dto.page && dto.page > 0 ? dto.page : 1;
            const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
            const skip = (page - 1) * limit;
            const search = dto.search?.trim();

            const where: Prisma.TutorWhereInput = {
                tutorStatus: { not: TutorStatus.PENDING_REVIEW },
                user: {
                    role: Roles.TUTOR,
                    signupIntent: SignupIntent.TUTOR
                }
            }

            if (search) {
                where.OR = [
                    {
                        user: {
                            name: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    },

                    {
                        tutorSubjects: {
                            some: {
                                subject: {
                                    name: {
                                        contains: search,
                                        mode: Prisma.QueryMode.insensitive,
                                    },
                                },
                            },
                        },
                    },
                ];
            }

            const [tutors, total] = await this.prisma.$transaction([
                this.prisma.tutor.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: true,
                        tutorSubjects: {
                            select: {
                                subject: { select: { name: true } },
                            },
                        },
                        tutorLevels: {
                            select: {
                                level: { select: { name: true } },
                            },
                        },
                    },
                }),
                this.prisma.tutor.count({ where }),
            ]);

            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                data: tutors.map((t) => ({
                    id: t.id,
                    userId: t.user.id,
                    name: t.user.name,
                    email: t.user.email,
                    phone: t.user.phone,
                    avatar: t.user.avatar,
                    role: t.user.role,
                    signupIntent: t.user.signupIntent,
                    isActive: t.user.isActive,
                    isEmailVerified: t.user.isEmailVerified,
                    profileCompleted: t.user.profileCompleted,
                    provider: t.user.provider,
                    createdAt: t.user.createdAt,
                    title: t.title,
                    bio: t.bio,
                    yearsOfExp: t.yearsOfExp,
                    qualification: t.qualification,
                    demoLinks: t.demoLinks,
                    subjects: t.tutorSubjects.map((s) => s.subject.name),
                    levels: t.tutorLevels.map((l) => l.level.name),
                    tutorStatus: t.tutorStatus,
                    rating: t.rating,
                    totalStudents: t.totalStudents,
                })),
            };
        } catch (error) {
            throw error;
        }
    }


    async browseTutors(dto: TutorBrowseFilterDto) {
        try {
            const page = dto.page && dto.page > 0 ? dto.page : 1;
            const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
            const skip = (page - 1) * limit;
            const search = dto.search?.trim();

            const where: Prisma.TutorWhereInput = {
                tutorStatus: TutorStatus.APPROVED,
                user: {
                    role: Roles.TUTOR,
                    signupIntent: Roles.TUTOR
                }
            }

            if (search) {
                where.OR = [
                    {
                        user: {
                            name: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive
                            }

                        }
                    },
                    {
                        title: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive
                        }
                    },
                    {
                        bio: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive
                        }
                    },
                ]
            }

            if (dto.subjectId) {
                where.tutorSubjects = {
                    some: {
                        subjectId: dto.subjectId
                    }
                }
            }

            if (dto.levelId) {
                where.tutorLevels = {
                    some: {
                        levelId: dto.levelId
                    }
                }
            }

            if (dto.minExperience || dto.maxExperience) {
                where.yearsOfExp = {}

                if (dto.minExperience !== undefined) {
                    where.yearsOfExp.gte = dto.minExperience
                }

                if (dto.maxExperience !== undefined) {
                    where.yearsOfExp.lte = dto.maxExperience
                }
            }

            if (dto.minRating) {
                where.rating = {};
                if (dto.minRating !== undefined) {
                    where.rating.gte = dto.minRating;
                }
            }

            const orderBy: Prisma.TutorOrderByWithRelationInput = {}

            switch (dto.sortBy) {
                case TutorSortBy.HIGHEST_RATED:
                    orderBy.rating = 'desc';
                    break;

                case TutorSortBy.MOST_EXPERIENCED:
                    orderBy.yearsOfExp = 'desc';
                    break;

                case TutorSortBy.MOST_STUDENTS:
                    orderBy.totalStudents = 'desc';
                    break;

                case TutorSortBy.NEWEST:
                    orderBy.createdAt = 'desc';
                    break;

                default:
                    orderBy.rating = 'desc';
                    break;
            }

            const [tutors, totalTutor] = await this.prisma.$transaction([
                this.prisma.tutor.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        title: true,
                        yearsOfExp: true,
                        totalStudents: true,
                        tutorSubjects: {
                            select: {
                                subject: { select: { name: true } }
                            }
                        },
                        user: {
                            select: {
                                name: true,
                                avatar: true
                            }
                        }
                    }
                }),
                this.prisma.tutor.count({
                    where
                })
            ]);

            // Fetch review statistics for the whole page in one aggregate query.
            // Only approved public reviews contribute to the displayed rating/count.
            const tutorIds = tutors.map((t) => t.id);
            const reviewStats = tutorIds.length > 0
                ? await this.prisma.review.groupBy({
                    by: ['tutorId'],
                    where: {
                        tutorId: { in: tutorIds },
                        status: Status.ACTIVE,
                    },
                    _avg: { rating: true },
                    _count: { _all: true },
                })
                : [];
            const reviewStatsByTutor = new Map(
                reviewStats.map((stat) => [stat.tutorId, stat])
            );

            return {
                totalTutor,
                page,
                limit,
                totalPages: Math.ceil(totalTutor / limit),
                data: tutors.map((t) => {
                    const stats = reviewStatsByTutor.get(t.id);

                    return {
                        id: t.id,
                        name: t.user.name,
                        avatar: t.user.avatar,
                        title: t.title,
                        yearsOfExp: t.yearsOfExp,
                        subjects: t.tutorSubjects.map((s) => s.subject.name),
                        rating: Number((stats?._avg.rating ?? 0).toFixed(1)),
                        totalReviews: stats?._count._all ?? 0,
                        totalStudents: t.totalStudents,
                    };
                }),
            }
        } catch (error) {
            throw error;
        }
    }



    async tutorRequest(dto: PaginationDto) {
        try {
            const page = dto.page && dto.page > 0 ? dto.page : 1;
            const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
            const skip = (page - 1) * limit;
            const search = dto.search?.trim();

            const where: Prisma.TutorWhereInput = {
                tutorStatus: TutorStatus.PENDING_REVIEW,
                user: {
                    role: Roles.STUDENT,
                    signupIntent: SignupIntent.TUTOR
                }
            }

            if (search) {
                where.OR = [
                    {
                        user: {
                            name: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    },

                    {
                        tutorSubjects: {
                            some: {
                                subject: {
                                    name: {
                                        contains: search,
                                        mode: Prisma.QueryMode.insensitive,
                                    },
                                },
                            },
                        },
                    },
                ];
            }

            const [tutors, total] = await this.prisma.$transaction([
                this.prisma.tutor.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: true,
                        tutorSubjects: {
                            select: {
                                subject: { select: { name: true } },
                            },
                        },
                        tutorLevels: {
                            select: {
                                level: { select: { name: true } },
                            },
                        },
                    },
                }),
                this.prisma.tutor.count({ where }),
            ]);

            return {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                data: tutors.map((t) => ({
                    id: t.id,
                    userId: t.user.id,
                    name: t.user.name,
                    email: t.user.email,
                    phone: t.user.phone,
                    avatar: t.user.avatar,
                    role: t.user.role,
                    signupIntent: t.user.signupIntent,
                    isActive: t.user.isActive,
                    isEmailVerified: t.user.isEmailVerified,
                    profileCompleted: t.user.profileCompleted,
                    provider: t.user.provider,
                    createdAt: t.user.createdAt,
                    title: t.title,
                    bio: t.bio,
                    yearsOfExp: t.yearsOfExp,
                    qualification: t.qualification,
                    demoLinks: t.demoLinks,
                    subjects: t.tutorSubjects.map((s) => s.subject.name),
                    levels: t.tutorLevels.map((l) => l.level.name),
                    tutorStatus: t.tutorStatus,
                    rating: t.rating,
                    totalStudents: t.totalStudents,
                })),
            };
        } catch (error) {
            throw error;
        }
    }


    async profileUpdate(
        userId: string,
        dto: TutorProfileUpdateDto,
        file?: Express.Multer.File,
    ) {
        console.log(dto);

        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            include: { user: true },
        });

        if (!tutor) throw new NotFoundException('Tutor not found');

        const userUpdate: any = {};
        const tutorUpdate: any = {};

        if (dto.name) userUpdate.name = dto.name;
        if (dto.phone) userUpdate.phone = dto.phone;

        let avatar: string | null = null;
        if (file) {
            if (!file.mimetype.startsWith('image/')) {
                throw new BadRequestException('Only image files are allowed');
            }

            const upload = await this.cloudinary.uploadFile(file.buffer, {
                folder: 'studymate/student',
            });

            avatar = upload.url;
        }

        if (dto.email && dto.email !== tutor.user.email) {
            const exists = await this.prisma.user.findFirst({
                where: { email: dto.email, NOT: { id: tutor.user.id } },
            });
            if (exists) throw new BadRequestException('Email already in use');

            userUpdate.email = dto.email;
            userUpdate.isEmailVerified = false;
        }

        if (dto.title) tutorUpdate.title = dto.title;
        if (dto.bio) tutorUpdate.bio = dto.bio;
        if (dto.yearsOfExp !== undefined) tutorUpdate.yearsOfExp = dto.yearsOfExp;
        if (dto.qualification) tutorUpdate.qualification = dto.qualification;
        if (dto.demoLinks) tutorUpdate.demoLinks = dto.demoLinks;
        if (avatar) {
            tutorUpdate.avatar = avatar;
        }

        await this.prisma.$transaction(async (tx) => {
            if (Object.keys(userUpdate).length)
                await tx.user.update({ where: { id: tutor.user.id }, data: userUpdate });

            if (Object.keys(tutorUpdate).length)
                await tx.tutor.update({ where: { id: tutor.id }, data: tutorUpdate });

            if (dto.subjectIds) {
                await tx.tutorSubject.deleteMany({ where: { tutorId: tutor.id } });
                await tx.tutorSubject.createMany({
                    data: dto.subjectIds.map((id) => ({ tutorId: tutor.id, subjectId: id })),
                });
            }

            if (dto.levelIds) {
                await tx.tutorLevel.deleteMany({ where: { tutorId: tutor.id } });
                await tx.tutorLevel.createMany({
                    data: dto.levelIds.map((id) => ({ tutorId: tutor.id, levelId: id })),
                });
            }

            /* ---------- Re-fetch updated tutor ---------- */
            const updatedTutor = await tx.tutor.findUnique({
                where: { id: tutor.id },
                include: {
                    tutorSubjects: true,
                    tutorLevels: true,
                },
            });

            const profileCompleted = updatedTutor
                ? isTutorProfileCompleted(updatedTutor)
                : false;

            await tx.user.update({
                where: { id: tutor.user.id },
                data: { profileCompleted },
            });
        });

        return { message: 'Tutor profile updated successfully' };
    }



    async getById(id: string) {
        const tutor = await this.prisma.tutor.findUnique({
            where: { id },
            include: {
                user: { select: { name: true, avatar: true } },
                tutorSubjects: { select: { subject: { select: { name: true } } } },
                tutorLevels: { select: { level: { select: { name: true } } } },
            },
        });

        if (!tutor) throw new NotFoundException('Tutor not found');

        return tutor;
    }


    async toggleApproved(tutorId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { id: tutorId },
                include: { user: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            if (tutor.tutorStatus === 'APPROVED') {
                throw new BadRequestException('Tutor already approved');
            }

            await this.prisma.$transaction(async (tx) => {
                // 1️⃣ Update tutor status
                await tx.tutor.update({
                    where: { id: tutorId },
                    data: {
                        tutorStatus: 'APPROVED',
                    },
                });

                // 2️⃣ Promote user role
                await tx.user.update({
                    where: { id: tutor.userId },
                    data: {
                        role: 'TUTOR',
                    },
                });
            });

            return {
                message: 'Tutor approved successfully',
            };
        } catch (error) {
            throw error;
        }
    }


    async toggleRejected(tutorId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { id: tutorId },
                include: { user: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            if (tutor.tutorStatus === 'APPROVED') {
                throw new BadRequestException('Tutor already approved');
            }

            await this.prisma.$transaction(async (tx) => {
                // 1️⃣ Update tutor status
                await tx.tutor.update({
                    where: { id: tutorId },
                    data: {
                        tutorStatus: 'REJECTED',
                    },
                });
            });

            return {
                message: 'Tutor rejected successfully',
            };
        } catch (error) {
            throw error;
        }
    }


    async getByIdBrowse(tutorId: string) {
        try {
            const [tutor, reviewStats] = await this.prisma.$transaction([
                this.prisma.tutor.findUnique({
                    where: {
                        id: tutorId,
                        tutorStatus: TutorStatus.APPROVED,
                    },
                    select: {
                        id: true,
                        title: true,
                        bio: true,
                        yearsOfExp: true,
                        totalStudents: true,
                        demoLinks: true,
                        tutorSubjects: {
                            select: {
                                subject: { select: { name: true } }
                            }
                        },
                        tutorLevels: {
                            select: {
                                level: { select: { name: true } }
                            }
                        },
                        user: {
                            select: {
                                name: true,
                                avatar: true
                            }
                        }
                    }
                }),
                this.prisma.review.aggregate({
                    where: {
                        tutorId,
                        status: Status.ACTIVE,
                    },
                    _avg: { rating: true },
                    _count: { _all: true },
                })
            ]);
            if (!tutor) {
                throw new NotFoundException("Tutor not found");
            }

            return {
                id: tutor.id,
                name: tutor.user.name,
                avatar: tutor.user.avatar,
                title: tutor.title,
                bio: tutor.bio,
                yearsOfExp: tutor.yearsOfExp,
                demoLinks: tutor.demoLinks,
                subjects: tutor.tutorSubjects.map((s) => s.subject.name),
                levels: tutor.tutorLevels.map((l) => l.level.name),
                rating: Number((reviewStats._avg.rating ?? 0).toFixed(1)),
                totalReviews: reviewStats._count._all,
                totalStudents: tutor.totalStudents,
            };
        } catch (error) {
            throw error;
        }
    }
}
