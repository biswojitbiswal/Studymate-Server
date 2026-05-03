import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthGuard } from "common/guards/auth.guard";
import { Roles } from "common/decorator/roles.decorator";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { TutorAnalyticsDto } from "./dtos/admin.dto";

@Controller({
    path: 'admin',
    version: '1'
})
export class AdminController{
    constructor(private readonly admin: AdminService){}


    @UseGuards(AuthGuard)
    @Roles('STUDENT')
    @Get('student/analytics')
    async studentAnalytics(@GetCurrentUserId() userId: string){
        return await this.admin.studentAnalytics(userId)
    }



    @UseGuards(AuthGuard)
    @Roles('TUTOR')
    @Get('tutor/analytics')
    async tutorAnalytics(@GetCurrentUserId() userId: string, @Query() dto: TutorAnalyticsDto){
        return await this.admin.tutorAnalytics(userId, dto)
    }
}