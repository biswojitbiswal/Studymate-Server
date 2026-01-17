import { Body, Controller, Get, Param, Patch, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { StudentService } from "./student.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { StudentDto } from "./dtos/student.dto";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller({
    path: 'student',
    version: '1'
})
export class StudentController{
    constructor(private readonly studentService: StudentService){}

    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get('me')
    async me(@GetCurrentUserId() userId: string){
        return await this.studentService.me(userId)
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @UseInterceptors(FileInterceptor('avatar'))
    @Patch('me')
    async profileUpdate(@GetCurrentUserId() userId: string, @Body() dto: StudentDto, @UploadedFile() file?: Express.Multer.File){
        console.log(dto, file);
        
        return await this.studentService.profileUpdate(userId, dto, file)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async getAll(@Query() dto: PaginationDto){
        return await this.studentService.getAll(dto)
    }



    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT','TUTOR','ADMIN')
    @Get(':id')
    async getById(@Param('id') id: string){
        return await this.studentService.getById(id)
    }
}

