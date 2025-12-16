import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { LevelService } from "./level.service";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { Public } from "src/common/decorator/public.decorator";
import { LevelDto, UpdateLevelDto } from "./dtos/level.dto";
import { AuthGuard } from "src/common/guards/auth.guard";

@Controller({
    path: 'level',
    version: '1'
})
export class LevelController{
    constructor(private readonly level: LevelService){}

    
        @UseGuards(AuthGuard, RolesGuard)
        @Post()
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async create(
            @Body() dto: LevelDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.level.create(dto, file)
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get()
        @Roles('ADMIN')
        async get(@Query() dto: PaginationDto){
            return await this.level.get(dto)
        }
    
    
        @Public()
        @Get('public')
        async getForPublic(){
            return await this.level.getForPublic()
        }
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Get(':id')
        @Roles('ADMIN')
        async getById(
            @Param('id') id: string,
        ){
            return await this.level.getById(id)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Patch(':id')
        @Roles('ADMIN')
        @UseInterceptors(FileInterceptor('icon'))
        async update(
            @Param('id') id: string,
            @Body() dto: UpdateLevelDto,
            @UploadedFile() file?: Express.Multer.File,
        ){
            return await this.level.update(id, dto, file)
        }
    
    
    
        @UseGuards(AuthGuard, RolesGuard)
        @Delete(':id')
        @Roles('ADMIN')
        async delete(
            @Param('id') id: string,
        ){
            return await this.level.delete(id)
        }
}