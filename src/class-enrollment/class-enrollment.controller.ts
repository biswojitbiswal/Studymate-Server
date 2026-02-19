import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ClassEnrollmentService } from "./class-enrollment.service";
import { RolesGuard } from "common/guards/roles.guard";
import { Roles } from "common/decorator/roles.decorator";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { PaginationDto } from "common/dtos/pagination.dto";
import { AuthGuard } from "common/guards/auth.guard";

@Controller({
    path: "class-enrollments",
    version: '1'
})
export class ClassEnrollmentController{
    constructor(private readonly enrollmentService: ClassEnrollmentService){}


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get()
    async getClassByEnrollment(@GetCurrentUserId() userId: string, @Query() dto: PaginationDto){
        return await this.enrollmentService.getClassByEnrollment(userId, dto)
    }

}