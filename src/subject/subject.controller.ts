import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { SubjectService } from "./subject.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Public } from "src/common/decorator/public.decorator";
import { SubjectDto, UpdateSubjectDto } from "./dtos/subject.dto";

@Controller({
    path: 'subject',
    version: '1'
})
export class SubjectController{
    constructor(private readonly subject: SubjectService){}


    
        @UseGuards(AuthGuard, RolesGuard)
        @Post()
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async create(
            @Body() dto: SubjectDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.subject.create(dto, file)
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get()
        @Roles('ADMIN')
        async get(@Query() dto: PaginationDto){
            return await this.subject.get(dto)
        }
    
    
        @Public()
        @Get('public')
        async getForPublic(){
            return await this.subject.getForPublic()
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get(':id')
        @Roles('ADMIN')
        async getById(
            @Param('id') id: string,
        ){
            return await this.subject.getById(id)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Patch(':id')
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async update(
            @Param('id') id: string,
            @Body() dto: UpdateSubjectDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.subject.update(id, dto, file)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Delete(':id')
        @Roles('ADMIN')
        async delete(
            @Param('id') id: string,
        ){
            return await this.subject.delete(id)
        }
}