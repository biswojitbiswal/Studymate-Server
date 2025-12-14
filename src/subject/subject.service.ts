import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SubjectDto, UpdateSubjectDto } from "./dtos/subject.dto";
import { slugify } from "src/common/utils/slugify.util";
import { Status } from "@prisma/client";
import { PaginationDto } from "src/common/dtos/pagination.dto";

@Injectable({})
export class SubjectService{
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ){}


    // =========================
        // CREATE
        // =========================
        async create(dto: SubjectDto, file?: Express.Multer.File) {
            try {
                const slug = slugify(dto.name);
    
                let icon: string | null = null;
                let iconPublicId: string | null = null;
    
                if (file) {
                    if (!file.mimetype.startsWith('image/')) {
                        throw new BadRequestException('Only image files are allowed');
                    }
    
                    const upload = await this.cloudinary.uploadFile(file.buffer, {
                        folder: 'studymate/subjects',
                    });
    
                    icon = upload.url;
                    // iconPublicId = upload.publicId;
                }
    
                return await this.prisma.subject.create({
                    data: {
                        name: dto.name,
                        slug,
                        priority: dto.priority,
                        icon,
                        //   iconPublicId,
                        status: Status.ACTIVE,
                    },
                });
            } catch (error) {
                throw error
            }
        }
    
        // =========================
        // GET ALL (ADMIN)
        // =========================
        async get(dto: PaginationDto) {
            try {
                const { page, limit, search } = dto;
    
                // Build where condition dynamically
                const where: any = {};
    
                if (search) {
                    where.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { slug: { contains: search, mode: 'insensitive' } },
                    ];
                }
    
                // If pagination not provided → return all
                if (!page || !limit) {
                    return await this.prisma.subject.findMany({
                        where,
                        orderBy: { priority: 'asc' },
                    });
                }
    
                // Pagination logic
                const skip = (page - 1) * limit;
    
                const [data, total] = await Promise.all([
                    this.prisma.subject.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { priority: 'asc' },
                    }),
                    this.prisma.subject.count({ where }),
                ]);
    
                return {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    data
                };
            } catch (error) {
                throw new InternalServerErrorException(error.message);
            }
        }
    
    
        // =========================
        // GET PUBLIC
        // =========================
        async getForPublic() {
            try {
                return await this.prisma.subject.findMany({
                    where: { status: Status.ACTIVE },
                    orderBy: { priority: 'asc' },
                });
            } catch (error) {
                throw new InternalServerErrorException(error.message);
            }
        }
    
        // =========================
        // GET BY ID
        // =========================
        async getById(id: string) {
            try {
                const subject = await this.prisma.subject.findUnique({
                    where: { id },
                });
    
                if (!subject) {
                    throw new NotFoundException('Subject not found');
                }
    
                return subject;
            } catch (error) {
                if (error instanceof NotFoundException) throw error;
                throw new InternalServerErrorException(error.message);
            }
        }
    
        // =========================
        // UPDATE
        // =========================
        async update(id: string, dto: UpdateSubjectDto, file?: Express.Multer.File) {
            try {
                const subject = await this.prisma.subject.findUnique({
                    where: { id },
                });
    
                if (!subject) {
                    throw new NotFoundException('Subject not found');
                }
    
                // 🚫 Block updates on archived subjects
                if (subject.status === Status.ARCHIVED) {
                    throw new BadRequestException('Archived subject cannot be updated');
                }
    
                // 🚫 Prevent archiving via update API
                if (dto.status === Status.ARCHIVED) {
                    throw new BadRequestException(
                        'Use delete API to archive a subject',
                    );
                }
    
                let icon = subject.icon;
                let iconPublicId: string | null = null;;
                if (subject.icon) {
                    iconPublicId = this.cloudinary.extractPublicIdFromUrl(subject.icon)
                }
    
                // upload new icon
                if (file) {
                    if (!file.mimetype.startsWith('image/')) {
                        throw new BadRequestException('Only image files are allowed');
                    }
    
                    // delete old icon
                    if (iconPublicId) {
                        await this.cloudinary.deleteFile(iconPublicId);
                    }
    
                    const upload = await this.cloudinary.uploadFile(file.buffer, {
                        folder: 'studymate/subjects',
                    });
    
                    icon = upload.url;
                }
    
                return await this.prisma.subject.update({
                    where: { id },
                    data: {
                        name: dto.name ?? subject.name,
                        slug: dto.name ? slugify(dto.name) : subject.slug,
                        priority: dto.priority ?? subject.priority,
                        icon,
                        status: dto.status ?? subject.status,
                    },
                });
            } catch (error) {
                throw error
            }
        }
    
        // =========================
        // DELETE (SOFT DELETE)
        // =========================
        async delete(id: string) {
            try {
                const subject = await this.prisma.subject.findUnique({
                    where: { id },
                });
    
                if (!subject) {
                    throw new NotFoundException('Subject not found');
                }
    
                let iconPublicId: string | null = null;;
                if (subject.icon) {
                    iconPublicId = this.cloudinary.extractPublicIdFromUrl(subject.icon);
                }
                if (iconPublicId) {
                    await this.cloudinary.deleteFile(iconPublicId);
                }
    
                return await this.prisma.subject.update({
                    where: { id },
                    data: {
                        status: Status.ARCHIVED,
                    },
                });
    
                // return await this.prisma.subject.delete({
                //     where: {id}
                // })
            } catch (error) {
                if (error instanceof NotFoundException) throw error;
                throw new InternalServerErrorException(error.message);
            }
        }
}