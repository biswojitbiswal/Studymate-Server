import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { TutorApplyDto, TutorProfileUpdateDto } from "./dtos/tutor.dto";

@Injectable({})
export class TutorService {
    constructor(private readonly prisma: PrismaService) { }


    async tutorApply(userId: string, dto: TutorApplyDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (user.role !== 'STUDENT') {
                throw new BadRequestException('Only students can apply as tutor');
            }

            const existingTutor = await this.prisma.tutor.findUnique({
                where: { userId },
            });

            if (existingTutor) {
                if (existingTutor.tutorStatus === 'PENDING_REVIEW') {
                    throw new BadRequestException('Tutor application already under review');
                }

                if (existingTutor.tutorStatus === 'APPROVED') {
                    throw new BadRequestException('You are already an approved tutor');
                }
            }

            await this.prisma.$transaction(async (tx) => {
                const tutor = await tx.tutor.create({
                    data: {
                        userId,
                        title: dto.title,
                        yearsOfExp: dto.yearsOfExp,
                        bio: dto.bio,
                        qualification: dto.qualification ?? [],
                        demoLinks: dto.demoLinks ?? [],
                        tutorStatus: 'PENDING_REVIEW',
                    },
                });

                // Tutor ↔ Subjects
                await tx.tutorSubject.createMany({
                    data: dto.subjectIds.map((subjectId) => ({
                        tutorId: tutor.id,
                        subjectId,
                    })),
                });

                // Tutor ↔ Levels
                await tx.tutorLevel.createMany({
                    data: dto.levelIds.map((levelId) => ({
                        tutorId: tutor.id,
                        levelId,
                    })),
                });
            });

            return {
                message: 'Tutor application submitted successfully. Waiting for admin approval.',
            };
        } catch (error) {
            throw error;
        }
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



    async getAll(dto: PaginationDto & { search?: string }) {
        const page = dto.page && dto.page > 0 ? dto.page : 1;
        const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
        const skip = (page - 1) * limit;
        const search = dto.search?.trim();

        const where: Prisma.TutorWhereInput = search
            ? {
                OR: [
                    {
                        user: {
                            is: {
                                name: {
                                    contains: search,
                                    mode: Prisma.QueryMode.insensitive,
                                },
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
                ],
            }
            : {};

        const [tutors, total] = await this.prisma.$transaction([
            this.prisma.tutor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { name: true, email: true, avatar: true },
                    },
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
            data: tutors.map((t) => ({
                id: t.id,
                name: t.user.name,
                email: t.user.email,
                avatar: t.user.avatar,
                subjects: t.tutorSubjects.map((s) => s.subject.name),
                levels: t.tutorLevels.map((l) => l.level.name),
                status: t.tutorStatus,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }



    async profileUpdate(
        userId: string,
        dto: TutorProfileUpdateDto,
        file?: Express.Multer.File,
    ) {
        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            include: { user: true },
        });

        if (!tutor) throw new NotFoundException('Tutor not found');

        const userUpdate: any = {};
        const tutorUpdate: any = {};

        if (dto.name) userUpdate.name = dto.name;
        if (dto.phone) userUpdate.phone = dto.phone;

        if (file) userUpdate.avatar = file.filename;

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


    // async toggleApprove(tutorId: string) {
    //     const tutor = await this.prisma.tutor.findUnique({
    //         where: { id: tutorId },
    //         include: { user: true },
    //     });

    //     if (!tutor) {
    //         throw new NotFoundException('Tutor not found');
    //     }

    //     // ❌ Do not allow toggle for these states
    //     if (tutor.tutorStatus === 'REJECTED') {
    //         throw new BadRequestException(
    //             'Rejected tutor must re-apply to be approved again',
    //         );
    //     }

    //     if (tutor.tutorStatus === 'SUSPENDED') {
    //         throw new BadRequestException(
    //             'Suspended tutor cannot be toggled. Use suspend/unsuspend instead.',
    //         );
    //     }

    //     // Determine next state
    //     const isApproving = tutor.tutorStatus !== 'APPROVED';

    //     await this.prisma.$transaction(async (tx) => {
    //         // 1️⃣ Update tutor status
    //         await tx.tutor.update({
    //             where: { id: tutorId },
    //             data: {
    //                 tutorStatus: isApproving ? 'APPROVED' : 'PENDING_REVIEW',
    //             },
    //         });

    //         // 2️⃣ Update user role
    //         await tx.user.update({
    //             where: { id: tutor.userId },
    //             data: {
    //                 role: isApproving ? 'TUTOR' : 'STUDENT',
    //             },
    //         });
    //     });

    //     return {
    //         message: isApproving
    //             ? 'Tutor approved successfully'
    //             : 'Tutor approval revoked successfully',
    //         status: isApproving ? 'APPROVED' : 'PENDING_REVIEW',
    //     };
    // }


}