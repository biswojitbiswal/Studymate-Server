import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CreateResourceDto, ResourceFilterDto, UpdateResourceDto } from "./dtos/resources.dto";
import { FileType } from "common/enums/resource.enum";
import { CloudinaryService } from "cloudinary/cloudinary.service";
import { slugify } from "common/utils/slugify.util";
import { PaginationDto } from "common/dtos/pagination.dto";
import { Prisma } from "@prisma/client";

@Injectable({})
export class ResourceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ) { }


    async create(dto: CreateResourceDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            const klass = await this.prisma.tuitionClass.findFirst({
                where: {
                    id: dto.classId,
                    tutorId: tutor.id,
                },
                select: { id: true },
            });

            if (!klass) {
                throw new ForbiddenException(
                    'You are not allowed to add resources to this class',
                );
            }


            const resource = await this.prisma.resource.create({
                data: {
                    title: dto.title,
                    seo_name: slugify(dto.title),
                    description: dto.description,
                    classId: dto.classId,
                    type: dto.type,
                    size: dto.size,
                    fileUrl: dto.fileUrl,
                },
            });

            return resource;
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new BadRequestException(
                    'Resource title already exists'
                );
            }
            throw error;
        }
    }


    async update(id: string, dto: UpdateResourceDto, userId: string) {
        try {
            // ───────── VERIFY TUTOR ─────────
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }
            const resource = await this.prisma.resource.findUnique({
                where: { id },
                select: {
                    id: true,
                    classId: true,
                },
            });

            if (!resource) {
                throw new NotFoundException('Resource not found');
            }

            // ───────── VERIFY CLASS OWNERSHIP ─────────
            const klass = await this.prisma.tuitionClass.findFirst({
                where: {
                    id: resource.classId,
                    tutorId: tutor.id,
                },
                select: { id: true },
            });

            if (!klass) {
                throw new ForbiddenException(
                    'You are not allowed to update this resource',
                );
            }

            // ───────── PREPARE UPDATE DATA ─────────
            const data: any = {};

            if (dto.title) {
                data.title = dto.title;
                data.seo_name = slugify(dto.title);
            }

            if (dto.description !== undefined) {
                data.description = dto.description;
            }

            if (dto.type) {
                data.type = dto.type;
            }

            if (dto.fileUrl) {
                data.fileUrl = dto.fileUrl;
            }

            if (dto.size) {
                data.size = dto.size;
            }

            // ───────── UPDATE RESOURCE ─────────
            const updatedResource = await this.prisma.resource.update({
                where: { id },
                data,
            });

            return updatedResource;
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new BadRequestException(
                    'Resource title already exists'
                );
            }
            throw error;
        }
    }


    async delete(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            const resource = await this.prisma.resource.findUnique({
                where: { id },
                select: {
                    id: true,
                    classId: true,
                    fileUrl: true,
                },
            });

            if (!resource) {
                throw new NotFoundException('Resource not found');
            }

            const klass = await this.prisma.tuitionClass.findFirst({
                where: {
                    id: resource.classId,
                    tutorId: tutor.id,
                },
                select: { id: true },
            });

            if (!klass) {
                throw new ForbiddenException(
                    'You are not allowed to delete this resource',
                );
            }

            await this.prisma.resource.delete({
                where: { id },
            });

            return {
                message: 'Resource deleted successfully',
            };
        } catch (error) {
            throw error;
        }
    }


    async getByClass(classId: string, dto: PaginationDto, userId: string) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!tutor) {
                throw new NotFoundException('Tutor not found');
            }

            const klass = await this.prisma.tuitionClass.findFirst({
                where: {
                    id: classId,
                    tutorId: tutor.id,
                },
                select: { id: true },
            });

            if (!klass) {
                throw new ForbiddenException(
                    'You are not allowed to access this class resources',
                );
            }

            const where: any = {
                classId,
            };

            if (dto.search) {
                where.title = {
                    contains: dto.search,
                    mode: 'insensitive',
                };
            }

            const [resources, total] = await Promise.all([
                this.prisma.resource.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc',
                    },
                }),

                this.prisma.resource.count({
                    where,
                }),
            ]);

            return {

                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                resources

            };
        } catch (error) {
            throw error;
        }
    }


    async getForStudent(userId: string, dto: ResourceFilterDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!student) {
                throw new NotFoundException('Student not found');
            }

            const enrollments = await this.prisma.classEnrollment.findMany({
                where: {
                    studentId: student.id,
                },
                select: {
                    classId: true,
                },
            });

            const classIds = enrollments.map(e => e.classId);

            if (classIds.length === 0) {
                throw new NotFoundException("Resource not found")
            }

            const where: any = {
                classId: {
                    in: classIds,
                },
            };

            if (dto.classId) {
                if (!classIds.includes(dto.classId)) {
                    throw new ForbiddenException(
                        'You are not enrolled in this class',
                    );
                }

                where.classId = dto.classId;
            }

            if (dto.search) {
                where.title = {
                    contains: dto.search,
                    mode: 'insensitive',
                };
            }

            const [resources, total] = await Promise.all([
                this.prisma.resource.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc',
                    },
                }),

                this.prisma.resource.count({ where }),
            ]);
            
            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                resources
            };
        } catch (error) {
            throw error;
        }
    }
}