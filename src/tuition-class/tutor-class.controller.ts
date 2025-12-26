import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { TuitionClassService } from "./tuition-class.service";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { CreateTuitionClassDto, TutorTuitionClassFilter, TutorUpdateTuitionClassDto } from "./dtos/tuition-class.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { AuthGuard } from "src/common/guards/auth.guard";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

@Controller({
    path: 'tutor/classes',
    version: '1'
})
export class TutorClassController {
    constructor(private readonly classservice: TuitionClassService) { }

    // 1️⃣ Create class (DRAFT)
    @UseGuards(AuthGuard, RolesGuard)
    @Post()
    @Roles('TUTOR')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'previewImg', maxCount: 1 },
        { name: 'previewVdo', maxCount: 1 },
    ]))
    async create(
        @Body() dto: CreateTuitionClassDto,
        @GetCurrentUserId() userId: string,
        @UploadedFiles()
        files: {
            previewImg?: Express.Multer.File[];
            previewVdo?: Express.Multer.File[];
        },
    ) {
        return this.classservice.create(dto, userId, files);
    }

    // 2️⃣ Update class (status-aware)
    @UseGuards(AuthGuard, RolesGuard)
    @Patch(':classId')
    @Roles('TUTOR')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'previewImg', maxCount: 1 },
        { name: 'previewVdo', maxCount: 1 },
    ]))
    async update(
        @Param('classId') classId: string,
        @Body() dto: TutorUpdateTuitionClassDto,
        @GetCurrentUserId() userId: string,
        @UploadedFiles()
        files: {
            previewImg?: Express.Multer.File[];
            previewVdo?: Express.Multer.File[];
        },
    ) {
        return this.classservice.updateByTutor(classId, dto, userId, files);
    }

    // 3️⃣ Publish class
    @UseGuards(AuthGuard, RolesGuard)
    @Post(':classId/publish')
    @Roles('TUTOR')
    async publish(
        @Param('classId') classId: string,
        @GetCurrentUserId() userId: string,
    ) {
        return this.classservice.publish(classId, userId);
    }

    // 4️⃣ Archive class (soft delete)
    @UseGuards(AuthGuard, RolesGuard)
    @Post(':classId/archive')
    @Roles('TUTOR')
    async archive(
        @Param('classId') classId: string,
        @GetCurrentUserId() userId: string,
    ) {
        return this.classservice.archiveByTutor(classId, userId);
    }

    // 5️⃣ Get tutor’s classes
    @UseGuards(AuthGuard, RolesGuard)
    @Get()
    @Roles('TUTOR')
    async getForTutor(
        @GetCurrentUserId() userId: string,
        @Query() dto: TutorTuitionClassFilter,
    ) {
        return this.classservice.getForTutor(userId, dto);
    }

    // 6️⃣ Get class by id (tutor view)
    @UseGuards(AuthGuard, RolesGuard)
    @Get(':classId')
    @Roles('TUTOR')
    async getById(
        @Param('classId') classId: string,
        @GetCurrentUserId() userId: string,
    ) {
        return this.classservice.getByIdForTutor(classId, userId);
    }
}


