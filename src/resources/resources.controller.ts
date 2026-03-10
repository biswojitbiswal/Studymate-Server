import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ResourceService } from "./resources.service";
import { Roles } from "common/decorator/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateResourceDto, ResourceFilterDto, UpdateResourceDto } from "./dtos/resources.dto";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { PaginationDto } from "common/dtos/pagination.dto";
import { Public } from "common/decorator/public.decorator";

@Controller({
    path: 'resources',
    version: '1'
})
export class ResourceController {
    constructor(private readonly resourceService: ResourceService) { }


    @Roles('TUTOR')
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @Body() dto: CreateResourceDto, 
        @GetCurrentUserId() userId: string,
    ) {
        return await this.resourceService.create(dto, userId);
    }


    @Roles('STUDENT')
    @Get('student')
    async getForStudent(
        @GetCurrentUserId() userId: string,
        @Query() dto: ResourceFilterDto,
    ) {
        console.log(userId);
        
        return await this.resourceService.getForStudent(userId, dto);
    }


    @Roles('TUTOR')
    @Get('class/:classId')
    async getByClass(@Param('classId') classId: string, @Query() dto: PaginationDto, @GetCurrentUserId() userId: string) {
        return await this.resourceService.getByClass(classId, dto, userId);
    }


    @Roles('TUTOR')
    @Patch(':id')
    @UseInterceptors(FileInterceptor('file'))
    async update(
        @Param('id') id: string, 
        @Body() dto: UpdateResourceDto,
        @GetCurrentUserId() userId: string) {
        return await this.resourceService.update(id, dto, userId);
    }


    @Roles('TUTOR')
    @Delete(':id')
    async delete(@Param('id') id: string, @GetCurrentUserId() userId: string) {
        return await this.resourceService.delete(id, userId);
    }
}