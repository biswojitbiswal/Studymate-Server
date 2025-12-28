import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { AuthGuard } from "src/common/guards/auth.guard";
import { AttendanceDto } from "./dtos/attendance.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { PaginationDto } from "src/common/dtos/pagination.dto";

@Controller({
    path: 'attendance',
    version: '1'
})
export class AttendanceController {
    constructor(private readonly attendance: AttendanceService) { }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get('summary')
    async getMyAttendanceSummary(@GetCurrentUserId() userId: string) {
        return this.attendance.getMyAttendanceSummary(userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('STUDENT')
    @Get('classes/:classId/me')
    async getMyClassAttendance(
        @Param('classId') classId: string,
        @Query() dto: PaginationDto,
        @GetCurrentUserId() userId: string,
    ) {
        return this.attendance.getMyClassAttendance(classId, dto, userId);
    }


    

    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR')
    @Get('mark-all-present/:sessionId')
    async markAllPresent(@Param('sessionId') sessionId: string, @GetCurrentUserId() userId: string) {
        return this.attendance.markAllPresent(sessionId, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR')
    @Get('sessions/:sessionId')
    async getSessionAttendance(@Param('sessionId') sessionId: string, @Query() dto: PaginationDto) {
        return this.attendance.getSessionAttendance(sessionId, dto);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR')
    @Post('sessions/:sessionId')
    async markAttendanceBulk(
        @Param('sessionId') sessionId: string,
        @Body() dto: AttendanceDto,
        @GetCurrentUserId() userId: string
    ) {
        return this.attendance.markAttendanceBulk(dto, sessionId, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Roles('TUTOR')
    @Patch(':id')
    async updateSingleAttendance(
        @Param('id') id: string,
        @GetCurrentUserId() userId: string,
    ) {
        return this.attendance.updateSingleAttendance(id, userId);
    }




}