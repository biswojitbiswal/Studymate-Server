import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { AssignmentService } from "./assignment.service";
import { Roles } from "common/decorator/roles.decorator";
import { AssignmentDto, AssignmentFilterDto, AssignmentStatusDto, StudentAssignmentFilterDto } from "./dtos/assignment.dto";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";

@Controller({
    path: 'assignments',
    version: '1'
})
export class AssignmentController {
    constructor(private readonly assignmentService: AssignmentService) { }


    @Roles('TUTOR')
    @Post()
    async create(@Body() dto: AssignmentDto, @GetCurrentUserId() userId: string) {
        return await this.assignmentService.create(dto, userId);
    }


    @Roles('TUTOR')
    @Get('class/:classId')
    async getByClass(@Param('classId') classId: string, @Query() dto: AssignmentFilterDto) {
        return await this.assignmentService.getByClass(classId, dto);
    }


    @Roles('STUDENT')
    @Get('assigned')
    async getAssignedTasks(
        @GetCurrentUserId() userId: string,
        @Query() dto: StudentAssignmentFilterDto,
    ) {
        return this.assignmentService.getAssignedTasks(userId, dto);
    }


    @Roles('STUDENT')
    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body() dto: AssignmentStatusDto, @GetCurrentUserId() userId: string) {
        return await this.assignmentService.updateStatus(id, dto, userId);
    }


    @Roles('TUTOR')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<AssignmentDto>, @GetCurrentUserId() userId: string) {
        return await this.assignmentService.update(id, dto, userId);
    }


    @Roles('TUTOR')
    @Delete(':id')
    async delete(@Param('id') id: string, @GetCurrentUserId() userId: string) {
        return await this.assignmentService.delete(id, userId);
    }


    @Roles('TUTOR')
    @Get(':id')
    async getDetails(
        @Param('id') id: string,
        @GetCurrentUserId() userId: string
    ) {
        return this.assignmentService.getDetails(id, userId);
    }

    // /tasks/student
}