import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TaskDto, TaskFilterDto, UpdateTaskDto } from "./dtos/task.dto";
import { TaskStatus, TaskType } from "@prisma/client";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { contains } from "class-validator";

@Injectable({})
export class TaskService {
    constructor(private readonly prisma: PrismaService) { }


    async create(dto: TaskDto, userId: string) {
        try {
            const student = await this.prisma.student.findUnique({
                where: { userId }
            })
            if (!student) throw new NotFoundException("Student not found for this user.");

            const task = await this.prisma.task.create({
                data: {
                    title: dto.title,
                    description: dto.description ?? "",
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : dto.dueDate,
                    studentId: student.id,
                    status: TaskStatus.TODO,
                    type: TaskType.PRIVATE
                }
            })

            return task
        } catch (error) {
            throw error
        }
    }


    async getAll(dto: TaskFilterDto, userId: string) {
        try {
            const { page, limit, search, status, date, range } = dto
            console.log(dto);

            const student = await this.prisma.student.findUnique({
                where: { userId }
            })
            if (!student) throw new NotFoundException("Student not found");

            const where: any = {
                studentId: student.id,
                type: TaskType.PRIVATE,
            };

            let dateFilter: { gte: Date; lte: Date } | undefined;

            if (range !== 'ALL') {
                const baseDate = date ? new Date(date) : new Date();

                if (range === 'WEEK') {
                    const day = baseDate.getDay();
                    const diffToMonday = day === 0 ? -6 : 1 - day;

                    const startOfTheWeek = new Date(baseDate);
                    startOfTheWeek.setDate(baseDate.getDate() + diffToMonday);
                    startOfTheWeek.setHours(0, 0, 0, 0);

                    const endOfTheWeek = new Date(startOfTheWeek);
                    endOfTheWeek.setDate(startOfTheWeek.getDate() + 6);
                    endOfTheWeek.setHours(23, 59, 59, 999);

                    dateFilter = { gte: startOfTheWeek, lte: endOfTheWeek };
                } else if (range === 'TODAY') {
                    const startOfDay = new Date(baseDate);
                    startOfDay.setHours(0, 0, 0, 0);

                    const endOfDay = new Date(baseDate);
                    endOfDay.setHours(23, 59, 59, 999);

                    dateFilter = {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }

            }

            if (dateFilter) {
                where.dueDate = dateFilter;
            }

            if (status && status !== 'ALL') {
                where.status = status;
            }


            if (search) {
                where.OR = [
                    {
                        title: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                ]
            }

            const shouldPaginate = page && limit
            if (!shouldPaginate) {
                const task = await this.prisma.task.findMany({
                    where,
                    orderBy: {
                        createdAt: 'desc'
                    }
                })

                return {
                    data: task,
                    total: task.length
                }
            }

            const skip = (page - 1) * limit;

            const [tasks, total] = await Promise.all([
                this.prisma.task.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                this.prisma.task.count({ where })
            ])

            return {
                data: tasks,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total,
            }
        } catch (error) {
            throw error
        }
    }


    async getById(id: string) {
        try {
            const task = await this.prisma.task.findUnique({
                where: { id }
            })
            if (!task) throw new NotFoundException("Task not found");

            return task;
        } catch (error) {
            throw error
        }
    }


    async markAsDone(id: string) {
        try {
            let task = await this.prisma.task.findUnique({
                where: { id }
            })
            if (!task) throw new NotFoundException("Task not found");

            task = await this.prisma.task.update({
                where: { id: task.id },
                data: {
                    status: TaskStatus.COMPLETED
                }
            })

            return task;
        } catch (error) {
            throw error
        }
    }


    async update(id: string, dto: UpdateTaskDto) {
        try {
            let task = await this.prisma.task.findUnique({
                where: { id }
            })
            if (!task) throw new NotFoundException("Task not found");

            const updateData = {} as any;
            if (dto.title) updateData.title = dto.title;
            if (dto.description) updateData.description = dto.description;
            if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
            if (dto.status) updateData.status = dto.status

            task = await this.prisma.task.update({
                where: { id: task.id },
                data: {
                    ...updateData
                }
            })

            return task
        } catch (error) {
            throw error
        }
    }


    async delete(id: string) {
        try {
            const task = await this.prisma.task.findUnique({
                where: { id }
            })
            if (!task) throw new NotFoundException("Task not found");

            return await this.prisma.task.delete({
                where: { id: task.id }
            })
        } catch (error) {
            throw error
        }
    }
}