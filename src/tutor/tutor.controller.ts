import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { TutorService } from "./tutor.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { Roles } from "src/common/decorator/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { TutorApplyDto, TutorBrowseFilterDto, TutorProfileUpdateDto } from "./dtos/tutor.dto";
import { Public } from "common/decorator/public.decorator";

@Controller({
    path: "tutor",
    version: "1"
})
export class TutorController {
    constructor(private readonly tutorService: TutorService) { }


    @UseInterceptors(FileInterceptor('avatar'))
    @Post('apply')
    async tutorApply(
        @GetCurrentUserId() userId: string,
        @Body() dto: TutorApplyDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        return await this.tutorService.tutorApply(userId, dto, file);
    }


    @Public()
    @Get('browse')
    async browseTutors(
        @Query() dto: TutorBrowseFilterDto
    ) {
        return await this.tutorService.browseTutors(dto);
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(@Query() dto: PaginationDto) {
        return await this.tutorService.getAll(dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR', 'STUDENT')
    @Get('me')
    async me(@GetCurrentUserId() userId: string) {
        return await this.tutorService.me(userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('requests')
    async tutorRequest(@Query() dto: PaginationDto) {
        return await this.tutorService.tutorRequest(dto)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR')
    @UseInterceptors(FileInterceptor('avatar'))
    @Patch('me')
    async profileUpdate(@GetCurrentUserId() userId: string, @Body() dto: TutorProfileUpdateDto, @UploadedFile() file?: Express.Multer.File) {
        return await this.tutorService.profileUpdate(userId, dto, file)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch('approved/:id')
    async toggleApproved(@Param('id') id: string) {
        return await this.tutorService.toggleApproved(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch('rejected/:id')
    async toggleRejected(@Param('id') id: string) {
        return await this.tutorService.toggleRejected(id)
    }


    @Public()
    @Get(':id/browse')
    async getByIdBrowse(@Param('id') id: string) {
        return await this.tutorService.getByIdBrowse(id)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT', 'TUTOR', 'ADMIN')
    @Get(':id')
    async getById(@Param('id') id: string) {
        return await this.tutorService.getById(id)
    }
}

