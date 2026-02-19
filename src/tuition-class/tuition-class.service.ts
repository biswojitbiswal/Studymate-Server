import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UploadedFiles } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminTuitionClassFilter, BrowseClassFilterDto, CreateTuitionClassDto, TutorTuitionClassFilter, TutorUpdateTuitionClassDto } from "./dtos/tuition-class.dto";
import { NOTFOUND } from "dns";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { ClassStatus, ClassType } from "src/common/enums/tuition-class.enum";
import { slugify } from "src/common/utils/slugify.util";
import { Prisma, TuitionClass } from "@prisma/client";
import items from "razorpay/dist/types/items";

@Injectable({})
export class TuitionClassService {
    constructor(private readonly prisma: PrismaService, private readonly cloudinary: CloudinaryService) { }

    // TODO: We should check the overlap existing session timing when we create any class(optional)
    async create(dto: CreateTuitionClassDto, userId: string, files: {
        previewImg?: Express.Multer.File[];
        previewVdo?: Express.Multer.File[];
    }) {
        console.log(dto);
        
        try {
            let previewImg: string | null = null;
            let previewVdo: string | null = null;

            // ───────── IMAGE ─────────
            if (files?.previewImg?.[0]) {
                const file = files.previewImg[0];

                if (!file.mimetype.startsWith('image/')) {
                    throw new BadRequestException('previewImg must be an image');
                }

                const upload = await this.cloudinary.uploadFile(file.buffer, {
                    folder: 'studymate/classes/images',
                });

                previewImg = upload.url;
            }

            // ───────── VIDEO ─────────
            if (files?.previewVdo?.[0]) {
                const file = files.previewVdo[0];

                if (!file.mimetype.startsWith('video/')) {
                    throw new BadRequestException('previewVdo must be a video');
                }

                const upload = await this.cloudinary.uploadFile(file.buffer, {
                    folder: 'studymate/classes/videos',
                    resourceType: 'video',
                });

                previewVdo = upload.url;
            }

            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            // PRIVATE class rules
            if (dto.type === ClassType.PRIVATE) {
                if (dto.capacity && dto.capacity > 1) {
                    throw new BadRequestException(
                        'Capacity must be 1 for PRIVATE classes',
                    );
                }

                if (dto.daysOfWeek?.length) {
                    throw new BadRequestException(
                        'daysOfWeek is not allowed for PRIVATE classes',
                    );
                }
            }

            // GROUP class rules
            if (dto.type === ClassType.GROUP) {
                if (!dto.capacity || dto.capacity < 1) {
                    throw new BadRequestException(
                        'Capacity is required for GROUP classes',
                    );
                }

                if (!dto.daysOfWeek || dto.daysOfWeek.length === 0) {
                    throw new BadRequestException(
                        'daysOfWeek is required for GROUP classes',
                    );
                }

                if (!dto.startTime || !dto.durationMin) {
                    throw new BadRequestException(
                        'startTime and durationMin are required for GROUP classes',
                    );
                }
            }

            let price: number;
            let currency: string | null = null;

            if (dto.isPaid) {
                if (dto.price == null || dto.price <= 0) {
                    throw new BadRequestException(
                        'Price must be greater than 0 for paid classes',
                    );
                }

                price = dto.price;
                currency = dto.currency ?? 'INR';
            } else {
                price = 0;
                currency = null;
            }

            const { startDate, endDate, joiningStartDate, joiningEndDate, ...restDto } = dto
            const klass = await this.prisma.tuitionClass.create({
                data: {
                    tutorId: tutor.id,
                    seo_name: slugify(dto.title),
                    previewImg,
                    previewVdo,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    joiningEndDate: new Date(joiningEndDate),
                    joiningStartDate: new Date(joiningStartDate),
                    ...restDto,
                    price,
                    currency,
                    status: ClassStatus.DRAFT
                }
            })

            return klass
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new BadRequestException(
                    'Tuition class name already exists'
                );
            }
            throw error;
        }
    }


    private async cleanupOldMedia(
        klass: TuitionClass,
        files?: {
            previewImg?: Express.Multer.File[];
            previewVdo?: Express.Multer.File[];
        },
    ) {
        try {
            if (files?.previewImg?.[0] && klass.previewImg) {
                const publicId =
                    await this.cloudinary.extractPublicIdFromUrl(klass.previewImg);
                if (publicId) await this.cloudinary.deleteFile(publicId);
            }

            if (files?.previewVdo?.[0] && klass.previewVdo) {
                const publicId =
                    await this.cloudinary.extractPublicIdFromUrl(klass.previewVdo);
                if (publicId) await this.cloudinary.deleteFile(publicId);
            }
        } catch (err) {
            // log only — NEVER break update flow
            console.error('Media cleanup failed', err);
        }
    }


    // TODO: We should check the overlap existing session timing when we update any class(optional)
    async updateByTutor(
        classId: string,
        dto: TutorUpdateTuitionClassDto,
        userId: string,
        files?: {
            previewImg?: Express.Multer.File[];
            previewVdo?: Express.Multer.File[];
        },
    ) {
        // ─────────────────────────
        // Fetch class
        // ─────────────────────────
        const klass = await this.prisma.tuitionClass.findUnique({
            where: { id: classId },
        });

        if (!klass) {
            throw new NotFoundException('Class not found');
        }

        // ─────────────────────────
        // Verify tutor ownership
        // ─────────────────────────
        const tutor = await this.prisma.tutor.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!tutor || klass.tutorId !== tutor.id) {
            throw new ForbiddenException('You do not own this class');
        }

        // ─────────────────────────
        // Block archived / completed
        // ─────────────────────────
        if (
            klass.status === ClassStatus.ARCHIVED ||
            klass.status === ClassStatus.COMPLETED
        ) {
            throw new BadRequestException(
                'Archived or completed classes cannot be edited',
            );
        }

        // ─────────────────────────
        // Block type change after publish
        // ─────────────────────────
        if (dto.type && klass.status !== ClassStatus.DRAFT) {
            throw new ForbiddenException(
                'Class type cannot be changed after publishing',
            );
        }

        const finalType = dto.type ?? klass.type;

        // ─────────────────────────
        // Upload media (optional)
        // ─────────────────────────
        let newPreviewImg: string | undefined;
        let newPreviewVdo: string | undefined;

        if (files?.previewImg?.[0]) {
            const file = files.previewImg[0];

            if (!file.mimetype.startsWith('image/')) {
                throw new BadRequestException('previewImg must be an image');
            }

            const upload = await this.cloudinary.uploadFile(file.buffer, {
                folder: 'studymate/classes/images',
            });

            newPreviewImg = upload.url;
        }

        if (files?.previewVdo?.[0]) {
            const file = files.previewVdo[0];

            if (!file.mimetype.startsWith('video/')) {
                throw new BadRequestException('previewVdo must be a video');
            }

            const upload = await this.cloudinary.uploadFile(file.buffer, {
                folder: 'studymate/classes/videos',
                resourceType: 'video',
            });

            newPreviewVdo = upload.url;
        }

        // ─────────────────────────
        // DRAFT → full edit
        // ─────────────────────────
        if (klass.status === ClassStatus.DRAFT) {
            // PRIVATE rules
            if (finalType === ClassType.PRIVATE) {
                if (dto.capacity && dto.capacity > 1) {
                    throw new BadRequestException(
                        'Capacity must be 1 for PRIVATE classes',
                    );
                }

                if (dto.daysOfWeek?.length) {
                    throw new BadRequestException(
                        'daysOfWeek is not allowed for PRIVATE classes',
                    );
                }
            }

            // GROUP rules
            if (finalType === ClassType.GROUP) {
                const capacity = dto.capacity ?? klass.capacity;
                if (!capacity || capacity < 1) {
                    throw new BadRequestException(
                        'Capacity is required for GROUP classes',
                    );
                }

                const daysOfWeek = dto.daysOfWeek ?? klass.daysOfWeek;
                if (!daysOfWeek || daysOfWeek.length === 0) {
                    throw new BadRequestException(
                        'daysOfWeek is required for GROUP classes',
                    );
                }

                const startTime = dto.startTime ?? klass.startTime;
                const durationMin = dto.durationMin ?? klass.durationMin;

                if (!startTime || !durationMin) {
                    throw new BadRequestException(
                        'startTime and durationMin are required for GROUP classes',
                    );
                }
            }

            // Pricing rules
            let price: number | undefined;
            let currency: string | null | undefined;

            if (dto.isPaid !== undefined) {
                if (dto.isPaid) {
                    if (dto.price == null || dto.price <= 0) {
                        throw new BadRequestException(
                            'Price must be greater than 0 for paid classes',
                        );
                    }
                    price = dto.price;
                    currency = dto.currency ?? 'INR';
                } else {
                    price = 0;
                    currency = null;
                }
            }

            const updated = await this.prisma.tuitionClass.update({
                where: { id: classId },
                data: {
                    title: dto.title,
                    description: dto.description,
                    syllabus: dto.syllabus,
                    visibility: dto.visibility,

                    type: dto.type,
                    capacity: dto.capacity,

                    joiningStartDate: dto.joiningStartDate
                        ? new Date(dto.joiningStartDate)
                        : undefined,
                    joiningEndDate: dto.joiningEndDate
                        ? new Date(dto.joiningEndDate)
                        : undefined,

                    isPaid: dto.isPaid,
                    price,
                    currency,

                    previewImg: newPreviewImg,
                    previewVdo: newPreviewVdo,
                },
            });

            await this.cleanupOldMedia(klass, files);
            return updated;
        }

        // ─────────────────────────
        // PUBLISHED / ACTIVE → limited edit
        // ─────────────────────────
        const updated = await this.prisma.tuitionClass.update({
            where: { id: classId },
            data: {
                title: dto.title,
                description: dto.description,
                syllabus: dto.syllabus,
                visibility: dto.visibility,
                previewImg: newPreviewImg,
                previewVdo: newPreviewVdo,
            },
        });

        await this.cleanupOldMedia(klass, files);
        return updated;
    }


    async publish(classId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
            if (!tutor) throw new NotFoundException("Tutor not found");
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                select: {
                    id: true,
                    tutorId: true,
                    status: true
                }
            })
            if (!klass) throw new NotFoundException("Class not found");
            if (klass.tutorId !== tutor.id) throw new ForbiddenException("You do not own this class.")
            if (klass.status !== ClassStatus.DRAFT) {
                throw new BadRequestException("You can not PUBLISH the class from your current status!")
            }

            return await this.prisma.tuitionClass.update({
                where: { id: klass.id },
                data: {
                    status: ClassStatus.PUBLISHED,
                }
            })
        } catch (error) {
            throw error
        }
    }


    async archiveByTutor(classId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
            if (!tutor) throw new NotFoundException("Tutor not found");
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                select: {
                    id: true,
                    tutorId: true,
                    status: true
                }
            })
            if (!klass) throw new NotFoundException("Class not found");
            if (klass.tutorId !== tutor.id) throw new ForbiddenException("You do not own this class.")

            if (klass.status === ClassStatus.ARCHIVED) {
                throw new BadRequestException('Class is already archived');
            }

            if (klass.status === ClassStatus.DRAFT) {
                return await this.prisma.tuitionClass.delete({
                    where: { id: klass.id }
                })
            }

            return await this.prisma.tuitionClass.update({
                where: { id: klass.id },
                data: {
                    status: ClassStatus.ARCHIVED
                }
            })
        } catch (error) {
            throw error
        }
    }


    async getForTutor(userId: string, dto: TutorTuitionClassFilter) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor not found");

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;


            const where: Prisma.TuitionClassWhereInput = {
                tutorId: tutor.id
            }

            if (dto.status) {
                where.status = dto.status
            }

            if (dto.type) {
                where.type = dto.type
            }

            if (dto.visibility) {
                where.visibility = dto.visibility
            }

            if (dto.search) {
                where.OR = [
                    {
                        title: {
                            contains: dto.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: dto.search,
                            mode: 'insensitive'
                        }
                    },
                ]
            }

            const orderBy: Prisma.TuitionClassOrderByWithRelationInput = {
                [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc'
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.tuitionClass.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy
                }),
                this.prisma.tuitionClass.count({ where })
            ]);

            // const classIds = classes.map(cls => cls.id);
            // const enrollmentCounts = await this.prisma.classEnrollment.groupBy({
            //     by: ['classId'],
            //     where: {id: {in: classIds}},
            //     _count: {classId: true}
            // })
            // console.log(enrollmentCounts);
            
            // const enrollmentMap = new Map(
            //     enrollmentCounts.map(e => [e.classId, e._count.classId])
            // )

            // const data = classes.map(k => ({
            //     ...k,
            //     totalEnrollment: enrollmentMap.get(k.id) ?? 0
            // }))
            // console.log(data);
            
            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data
            }
        } catch (error) {
            throw error
        }
    }


    async getById(classId: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
            // if (!tutor) throw new NotFoundException("Tutor not found");
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                include: {
                    tutor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
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
                    language: {
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
                    board: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            })
            if (!klass) throw new NotFoundException("Class not found");
            if (tutor) {
                if (klass.tutorId !== tutor.id) throw new ForbiddenException("You do not own this class.")
            }

            const totalEnrollment = await this.prisma.classEnrollment.count({
                where: {
                    classId: klass.id
                }
            })

            

            return {...klass, totalEnrollment};
        } catch (error) {
            throw error
        }
    }


    async getAllForAdmin(dto: AdminTuitionClassFilter) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;


            const where: Prisma.TuitionClassWhereInput = {}

            if (dto.status) {
                where.status = dto.status
            }

            if (dto.type) {
                where.type = dto.type
            }

            if (dto.visibility) {
                where.visibility = dto.visibility
            }

            if (dto.search) {
                where.OR = [
                    {
                        title: {
                            contains: dto.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: dto.search,
                            mode: 'insensitive'
                        }
                    },
                ]
            }

            const [data, total] = await this.prisma.$transaction([
                this.prisma.tuitionClass.findMany({
                    where,
                    include: {
                        tutor: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true
                                    }
                                }
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.tuitionClass.count({ where })
            ]);

            return {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data
            }
        } catch (error) {
            throw error
        }
    }


    async archiveByAdmin(classId: string, adminId: string) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: adminId } });
            if (!user) throw new NotFoundException("User not found");
            if (user.role !== 'ADMIN') throw new ForbiddenException("You have not permission for this action")
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { id: classId },
                select: {
                    id: true,
                    tutorId: true,
                    status: true
                }
            })
            if (!klass) throw new NotFoundException("Class not found");

            if (klass.status === ClassStatus.ARCHIVED) {
                throw new BadRequestException('Class is already archived');
            }

            if (klass.status === ClassStatus.DRAFT) {
                return await this.prisma.tuitionClass.delete({
                    where: { id: klass.id }
                })
            }

            return await this.prisma.tuitionClass.update({
                where: { id: klass.id },
                data: {
                    status: ClassStatus.ARCHIVED
                }
            })
        } catch (error) {
            throw error
        }
    }


    async browse(dto: BrowseClassFilterDto) {
        try {
            const page = dto.page ? dto.page : 1;
            const limit = dto.limit ? dto.limit : 10;
            const skip = (page - 1) * limit;

            const where: Prisma.TuitionClassWhereInput = {
                status: 'PUBLISHED',
            };

            if (dto.type) {
                where.type = dto.type;
            }

            if (dto.search) {
                where.OR = [
                    { title: { contains: dto.search, mode: 'insensitive' } },
                    { description: { contains: dto.search, mode: 'insensitive' } },
                ];
            }

            if (dto.subjectIds?.length) {
                where.subjectId = { in: dto.subjectIds };
            };

            if (dto.levelIds?.length) {
                where.levelId = { in: dto.levelIds };
            };

            if (dto.languageIds?.length) {
                where.languageId = { in: dto.languageIds };
            };

            if (dto.boardIds?.length) {
                where.boardId = { in: dto.boardIds };
            }

            if (dto.paid !== undefined) {
                where.isPaid = dto.paid
            }

            if (dto.maxPrice !== undefined) {
                where.price = { lte: dto.maxPrice };
            }

            // if (dto.minRating !== undefined) {
            //     where.rating = { gte: dto.minRating };
            // }

            let orderBy: Prisma.TuitionClassOrderByWithRelationInput = {
                createdAt: 'desc',
            };

            if (dto.sortBy) {
                orderBy = {
                    [dto.sortBy]: dto.sortOrder ?? 'desc',
                };
            }

            /* ---------- Query ---------- */
            const [data, total] = await Promise.all([
                this.prisma.tuitionClass.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                    select: {
                        id: true,
                        title: true,
                        seo_name: true,
                        previewImg: true,
                        previewVdo: true,
                        price: true,
                        type: true,
                        subjectId: true,
                        levelId: true,
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
                            },
                        },
                        subject: {
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
                    },
                }),

                this.prisma.tuitionClass.count({ where }),
            ]);

            const classIds = data?.map(cls => cls.id);

            const enrollmentCounts = await this.prisma.classEnrollment.groupBy({
                by: ['classId'],
                where: {id: {in: classIds}},
                _count: {classId: true}
            })

            const enrollmentMap = new Map(
                enrollmentCounts.map(e => [e.classId, e._count.classId])
            )

            const items = data.map(cls => ({
                ...cls,
                totalEnrollment: enrollmentMap.get(cls.id)
            }))

            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    items
                },
            };
        } catch (error) {
            throw error;
        }
    }


    async getPublicById(seo_name: string) {
        try {
            const klass = await this.prisma.tuitionClass.findUnique({
                where: { seo_name },
                select: {
                    id: true,
                    title: true,
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
            })

            if(!klass) throw new NotFoundException("Class not found")

            return klass;
        } catch (error) {
            throw error;
        }
    }
}
