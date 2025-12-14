import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { LanguageService } from "./language.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Public } from "src/common/decorator/public.decorator";
import { LanguageDto, UpdateLanguageDto } from "./dtos/language.dto";

@Controller({
    path: 'language',
    version: '1'
})
export class LanguageController{
    constructor(private readonly language: LanguageService){}


    
        @UseGuards(AuthGuard, RolesGuard)
        @Post()
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async create(
            @Body() dto: LanguageDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.language.create(dto, file)
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get()
        @Roles('ADMIN')
        async get(@Query() dto: PaginationDto){
            return await this.language.get(dto)
        }
    
    
        @Public()
        @Get('public')
        async getForPublic(){
            return await this.language.getForPublic()
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get(':id')
        @Roles('ADMIN')
        async getById(
            @Param('id') id: string,
        ){
            return await this.language.getById(id)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Patch(':id')
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async update(
            @Param('id') id: string,
            @Body() dto: UpdateLanguageDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.language.update(id, dto, file)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Delete(':id')
        @Roles('ADMIN')
        async delete(
            @Param('id') id: string,
        ){
            return await this.language.delete(id)
        }
}