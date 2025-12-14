import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BoardDto, UpdateBoardDto } from "./dtos/board.dto";
import { slugify } from "src/common/utils/slugify.util";
import { Prisma, Status } from "@prisma/client"
import { PaginationDto } from "src/common/dtos/pagination.dto";

@Injectable({})
export class BoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService
    ) { }


    // =========================
    // CREATE
    // =========================
    async create(dto: BoardDto, file?: Express.Multer.File) {
        try {
            const slug = slugify(dto.name);

            let icon: string | null = null;
            let iconPublicId: string | null = null;

            if (file) {
                if (!file.mimetype.startsWith('image/')) {
                    throw new BadRequestException('Only image files are allowed');
                }

                const upload = await this.cloudinary.uploadFile(file.buffer, {
                    folder: 'studymate/boards',
                });

                icon = upload.url;
                // iconPublicId = upload.publicId;
            }

            return await this.prisma.board.create({
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
                return await this.prisma.board.findMany({
                    where,
                    orderBy: { priority: 'asc' },
                });
            }

            // Pagination logic
            const skip = (page - 1) * limit;

            const [data, total] = await Promise.all([
                this.prisma.board.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { priority: 'asc' },
                }),
                this.prisma.board.count({ where }),
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
            return await this.prisma.board.findMany({
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
            const board = await this.prisma.board.findUnique({
                where: { id },
            });

            if (!board) {
                throw new NotFoundException('Board not found');
            }

            return board;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    // =========================
    // UPDATE
    // =========================
    async update(id: string, dto: UpdateBoardDto, file?: Express.Multer.File) {
        try {
            const board = await this.prisma.board.findUnique({
                where: { id },
            });

            if (!board) {
                throw new NotFoundException('Board not found');
            }

            // 🚫 Block updates on archived boards
            if (board.status === Status.ARCHIVED) {
                throw new BadRequestException('Archived board cannot be updated');
            }

            // 🚫 Prevent archiving via update API
            if (dto.status === Status.ARCHIVED) {
                throw new BadRequestException(
                    'Use delete API to archive a board',
                );
            }

            let icon = board.icon;
            let iconPublicId: string | null = null;;
            if (board.icon) {
                iconPublicId = this.cloudinary.extractPublicIdFromUrl(board.icon)
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
                    folder: 'studymate/boards',
                });

                icon = upload.url;
            }

            return await this.prisma.board.update({
                where: { id },
                data: {
                    name: dto.name ?? board.name,
                    slug: dto.name ? slugify(dto.name) : board.slug,
                    priority: dto.priority ?? board.priority,
                    icon,
                    status: dto.status ?? board.status,
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
            const board = await this.prisma.board.findUnique({
                where: { id },
            });

            if (!board) {
                throw new NotFoundException('Board not found');
            }

            let iconPublicId: string | null = null;;
            if (board.icon) {
                iconPublicId = this.cloudinary.extractPublicIdFromUrl(board.icon);
            }
            if (iconPublicId) {
                await this.cloudinary.deleteFile(iconPublicId);
            }

            return await this.prisma.board.update({
                where: { id },
                data: {
                    status: Status.ARCHIVED,
                },
            });

            // return await this.prisma.board.delete({
            //     where: {id}
            // })
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }
}