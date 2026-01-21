import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { StudentDto } from "./dtos/student.dto";
import { Prisma } from "@prisma/client";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";


function isStudentProfileCompleted(student: {
    levelId?: string | null;
    boardId?: string | null;
    preferredLanguageId?: string | null;
    studentSubjects?: { subjectId: string }[];
}) {
    return Boolean(
        student.levelId &&
        student.boardId &&
        student.preferredLanguageId &&
        student.studentSubjects &&
        student.studentSubjects.length > 0
    );
}

@Injectable({})
export class StudentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ) { }


    async me(userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId },
                include: {
                    user: true,
                    studentSubjects: true
                }
            })
            if (!student) throw new NotFoundException("Student not found");

            return student;
        } catch (error) {
            throw error;
        }
    }


    async getAll(dto: PaginationDto) {
        const page = dto.page && dto.page > 0 ? dto.page : 1;
        const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
        const skip = (page - 1) * limit;
        const search = dto.search?.trim();

        const whereCondition: Prisma.StudentWhereInput = search
            ? {
                OR: [
                    {
                        user: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        board: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        level: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        studentSubjects: {
                            some: {
                                subject: {
                                    name: {
                                        contains: search,
                                        mode: 'insensitive',
                                    },
                                },
                            },
                        },
                    },
                ],
            }
            : {};

        const [students, total] = await this.prisma.$transaction([
            this.prisma.student.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },

                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    board: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    level: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    preferredLanguage: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    studentSubjects: {
                        select: {
                            subject: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),

            this.prisma.student.count({
                where: whereCondition,
            }),
        ]);

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: students.map((s) => ({
                id: s.id,
                name: s.user?.name ?? null,
                email: s.user?.email ?? null,
                avatar: s.user?.avatar ?? null,
                board: s.board?.name ?? null,
                level: s.level?.name ?? null,
                language: s.preferredLanguage?.name ?? null,
                subjects: s.studentSubjects.map((ss) => ss.subject.name),
            })),
        };
    }



    async profileUpdate(
        userId: string,
        dto: StudentDto,
        file?: Express.Multer.File,
    ) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            include: { user: true },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

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

        const userUpdateData: any = {};

        if (dto.name) {
            userUpdateData.name = dto.name;
        }

        if (avatar) {
            userUpdateData.avatar = avatar;
        }

        if (dto.email && dto.email !== student.user.email) {
            const emailExists = await this.prisma.user.findFirst({
                where: {
                    email: dto.email,
                    NOT: { id: student.user.id },
                },
            });

            if (emailExists) {
                throw new BadRequestException('Email already in use');
            }

            userUpdateData.email = dto.email;
            userUpdateData.isEmailVerified = false;
        }


        const studentUpdateData: any = {};

        if (dto.levelId) studentUpdateData.levelId = dto.levelId;
        if (dto.boardId) studentUpdateData.boardId = dto.boardId;
        if (dto.languageId) studentUpdateData.preferredLanguageId = dto.languageId;
        if (dto.goals) studentUpdateData.goals = dto.goals;

        await this.prisma.$transaction(async (tx) => {
            if (Object.keys(userUpdateData).length > 0) {
                await tx.user.update({
                    where: { id: student.user.id },
                    data: userUpdateData,
                });
            }

            if (Object.keys(studentUpdateData).length > 0) {
                await tx.student.update({
                    where: { id: student.id },
                    data: studentUpdateData,
                });
            }

            if (dto.subjectIds) {
                await tx.studentSubject.deleteMany({
                    where: { studentId: student.id },
                });

                if (dto.subjectIds.length > 0) {
                    await tx.studentSubject.createMany({
                        data: dto.subjectIds.map((subjectId) => ({
                            studentId: student.id,
                            subjectId,
                        })),
                    });
                }
            }

            /* ---- Re-fetch updated student ---- */
            const updatedStudent = await tx.student.findUnique({
                where: { id: student.id },
                include: { studentSubjects: true },
            });

            /* ---- Profile completion check ---- */
            const profileCompleted = isStudentProfileCompleted(updatedStudent!);

            await tx.user.update({
                where: { id: student.user.id },
                data: { profileCompleted },
            });
        });

        return {
            message: 'Student profile updated successfully',
        };
    }



    async getById(id: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { id }
            })
            if (!student) throw new NotFoundException("Student not found");
            return student;
        } catch (error) {
            throw error;
        }
    }

}