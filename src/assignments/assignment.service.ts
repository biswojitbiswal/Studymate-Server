import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { AssignmentDto, AssignmentFilterDto, AssignmentStatusDto, StudentAssignmentFilterDto } from "./dtos/assignment.dto";
import { title } from "process";
import { TaskStatus, TaskType } from "common/enums/task.enum";

@Injectable({})
export class AssignmentService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: AssignmentDto, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor account not found!");

            const now = new Date();
            const klass = await this.prisma.tuitionClass.findUnique({
                where: {
                    id: dto.classId,
                    status: 'ACTIVE',
                    startDate: { lte: now },
                    endDate: { gte: now }
                },
                select: {
                    id: true,
                    status: true,
                    startDate: true,
                    endDate: true
                }
            })
            if (!klass) throw new NotFoundException("Class not found");

            const result = await this.prisma.$transaction(async (tx) => {
                const assignment = await tx.classTask.create({
                    data: {
                        title: dto.title,
                        description: dto.description,
                        dueDate: dto.dueDate,
                        classId: klass.id,
                        tutorId: tutor.id
                    }
                });

                const enrolledStudents = await tx.classEnrollment.findMany({
                    where: { classId: klass.id },
                    select: {
                        studentId: true
                    }
                });

                const studentIds = enrolledStudents.map(e => e.studentId);

                if (studentIds.length > 0) {
                    await tx.task.createMany({
                        data: studentIds.map(studentId => ({
                            title: assignment.title,
                            description: assignment.description ?? "",
                            dueDate: assignment.dueDate ? new Date(assignment.dueDate) : assignment.dueDate,
                            studentId,
                            status: TaskStatus.TODO,
                            type: TaskType.ASSIGNED,
                            classTaskId: assignment.id,
                            classId: assignment.classId,
                            tutorId: assignment.tutorId
                        }))
                    })
                }
                return assignment;
            })

            return result;
        } catch (error) {
            throw error;
        }
    }


    async update(id: string, dto: Partial<AssignmentDto>, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor account not found!");

            let assignment = await this.prisma.classTask.findUnique({
                where: { id }
            })
            if (!assignment) throw new NotFoundException("Assignment not found");

            if (tutor.id !== assignment.tutorId) {
                throw new BadRequestException("you don't own this assignment");
            }

            const updateData = {} as any;
            if (dto.title) updateData.title = dto.title;
            if (dto.description) updateData.description = dto.description;
            if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);

            assignment = await this.prisma.classTask.update({
                where: { id: assignment.id },
                data: {
                    ...updateData
                }
            })

            return assignment;
        } catch (error) {
            throw error;
        }
    }


    async delete(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: {
                    id: true
                }
            })
            if (!tutor) throw new NotFoundException("Tutor account not found!");

            let assignment = await this.prisma.classTask.findUnique({
                where: { id }
            })
            if (!assignment) throw new NotFoundException("Assignment not found");

            if (tutor.id !== assignment.tutorId) {
                throw new BadRequestException("you don't own this assignment");
            }

            await this.prisma.$transaction(async (tx) => {

                // delete student tasks
                await tx.task.deleteMany({
                    where: {
                        classTaskId: assignment.id
                    }
                });

                // delete assignment
                await tx.classTask.delete({
                    where: { id: assignment.id }
                });

            });

            return { message: "Assignment deleted successfully" };
        } catch (error) {
            throw error;
        }
    }


    async getDetails(id: string, userId: string) {
        try {
            const tutor = await this.prisma.tutor.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!tutor) {
                throw new NotFoundException("Tutor account not found");
            }

            const assignment = await this.prisma.classTask.findFirst({
                where: {
                    id,
                    tutorId: tutor.id
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    dueDate: true,
                    classId: true
                }
            });

            if (!assignment) {
                throw new NotFoundException("Assignment not found");
            }

            const tasks = await this.prisma.task.findMany({
                where: {
                    classTaskId: assignment.id
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatar: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // progress summary
            const summary = {
                completed: tasks.filter(t => t.status === 'COMPLETED').length,
                ongoing: tasks.filter(t => t.status === 'ONGOING').length,
                todo: tasks.filter(t => t.status === 'TODO').length
            };

            return {
                assignment,
                summary,
                students: tasks.map(task => ({
                    taskId: task.id,
                    studentId: task.student.id,
                    studentUserId: task.student.user.id,
                    name: task.student.user.name,
                    avatar: task.student.user.avatar,
                    status: task.status
                }))
            };

        } catch (error) {
            throw error;
        }
    }


    async getByClass(classId: string, dto: AssignmentFilterDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const where: any = {
                classId
            };

            // search by title
            if (dto.search) {
                where.title = {
                    contains: dto.search,
                    mode: 'insensitive'
                };
            }

            // date range filter
            if (dto.range === 'TODAY') {
                const start = new Date();
                start.setHours(0, 0, 0, 0);

                const end = new Date();
                end.setHours(23, 59, 59, 999);

                where.dueDate = {
                    gte: start,
                    lte: end
                };
            }

            if (dto.range === 'WEEK') {
                const start = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 7);

                where.dueDate = {
                    gte: start,
                    lte: end
                };
            }

            const [assignments, total] = await this.prisma.$transaction([
                this.prisma.classTask.findMany({
                    where,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                }),
                this.prisma.classTask.count({
                    where
                })
            ]);

            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    assignments,
                }
            };
        } catch (error) {
            throw error;
        }
    }


    async getAssignedTasks(userId: string, dto: StudentAssignmentFilterDto) {
        try {
            
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!student) {
                throw new NotFoundException("Student account not found");
            }

            const page = dto.page ?? 1;
            const limit = dto.limit ?? 10;
            const skip = (page - 1) * limit;

            const where: any = {
                studentId: student.id,
                type: 'ASSIGNED'
            };

            // filter by class
            if (dto.classId) {
                where.classId = dto.classId;
            }

            // filter by status
            if (dto.status && dto.status !== 'ALL') {
                where.status = dto.status;
            }

            // search assignment title
            if (dto.search) {
                where.classTask = {
                    title: {
                        contains: dto.search,
                        mode: 'insensitive'
                    }
                };
            }

            // due date filters
            if (dto.range === 'TODAY') {
                const start = new Date();
                start.setHours(0, 0, 0, 0);

                const end = new Date();
                end.setHours(23, 59, 59, 999);

                where.classTask = {
                    ...where.classTask,
                    dueDate: {
                        gte: start,
                        lte: end
                    }
                };
            }

            if (dto.range === 'WEEK') {
                const start = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 7);

                where.classTask = {
                    ...where.classTask,
                    dueDate: {
                        gte: start,
                        lte: end
                    }
                };
            }

            const [tasks, total] = await this.prisma.$transaction([
                this.prisma.task.findMany({
                    where,
                    include: {
                        classTask: {
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                dueDate: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip,
                    take: limit
                }),

                this.prisma.task.count({
                    where
                })
            ]);

            return {
                data: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    tasks,
                }
            };

        } catch (error) {
            throw error;
        }
    }


    async updateStatus(id: string, dto: AssignmentStatusDto, userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!student) throw new NotFoundException("Student account not found");

            let assignment = await this.prisma.task.findUnique({
                where: { id }
            })
            if (!assignment) throw new NotFoundException("Assignment not found");

            if (student.id !== assignment.studentId) {
                throw new BadRequestException("you don't own this assignment");
            }

            await this.prisma.task.update({
                where: { id: assignment.id },
                data: {
                    status: dto.status
                }
            })

            return { message: `Assignment status updated successfully` }
        } catch (error) {
            throw error;
        }
    }
}