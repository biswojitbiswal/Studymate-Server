import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { BoardService } from "./board.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { BoardDto, UpdateBoardDto } from "./dtos/board.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { Public } from "src/common/decorator/public.decorator";
import { PaginationDto } from "src/common/dtos/pagination.dto";


@Controller({
    path: 'board',
    version: '1'
})
export class BoardController{
    constructor(private readonly board: BoardService){}


    @UseGuards(AuthGuard, RolesGuard)
    @Post()
    @Roles('ADMIN')
    @UseInterceptors(FileInterceptor('icon'))
    async create(
        @Body() dto: BoardDto,
        @UploadedFile() file?: Express.Multer.File,
    ){
        return await this.board.create(dto, file)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get()
    @Roles('ADMIN')
    async get(@Query() dto: PaginationDto){
        return await this.board.get(dto)
    }


    @Public()
    @Get('public')
    async getForPublic(){
        return await this.board.getForPublic()
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get(':id')
    @Roles('ADMIN')
    async getById(
        @Param('id') id: string,
    ){
        return await this.board.getById(id)
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Patch(':id')
    @Roles('ADMIN')
    @UseInterceptors(FileInterceptor('icon'))
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateBoardDto,
        @UploadedFile() file?: Express.Multer.File,
    ){
        return await this.board.update(id, dto, file)
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Delete(':id')
    @Roles('ADMIN')
    async delete(
        @Param('id') id: string,
    ){
        return await this.board.delete(id)
    }
}