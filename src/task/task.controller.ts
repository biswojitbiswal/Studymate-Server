import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TaskService } from "./task.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { TaskDto, TaskFilterDto, UpdateTaskDto } from "./dtos/task.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { PaginationDto } from "src/common/dtos/pagination.dto";

@Controller({
    path: 'task',
    version: '1'
})
export class TaskController{
    constructor(private readonly task: TaskService){}


    @UseGuards(AuthGuard, RolesGuard)
    @Post()
    @Roles('STUDENT')
    async create(@Body() dto: TaskDto, @GetCurrentUserId() userId: string){
        return await this.task.create(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get()
    @Roles('STUDENT')
    async getAll(@Query() dto: TaskFilterDto, @GetCurrentUserId() userId: string){
        return await this.task.getAll(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('status/:id')
    @Roles('STUDENT')
    async markAsDone(@Param('id') id: string){
        return await this.task.markAsDone(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get(':id')
    @Roles('STUDENT')
    async getById(@Param('id') id: string){
        return await this.task.getById(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch(':id')
    @Roles('STUDENT')
    async update(@Param('id') id: string, @Body() dto: UpdateTaskDto){
        return await this.task.update(id, dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Delete(':id')
    @Roles('STUDENT')
    async delete(@Param('id') id: string){
        return await this.task.delete(id)
    }
}