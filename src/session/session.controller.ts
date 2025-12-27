import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SessionService } from "./session.service";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { AuthGuard } from "src/common/guards/auth.guard";
import { CreateGroupDboutSessionDto, CreateGroupExtraSessionDto, CreatePrivateSessionDto, GetClassSessionsDto, RescheduleSessionDto } from "./dtos/session.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";

@Controller({
    path: 'sessions',
    version: '1'
})
export class SessionController {
    constructor(private readonly session: SessionService) { }

    @UseGuards(AuthGuard, RolesGuard)
    @Post('private/request')
    @Roles('STUDENT','TUTOR')
    async privateSessionRequest(@Body() dto: CreatePrivateSessionDto, @GetCurrentUserId() userId: string) {
        return await this.session.create(dto, userId)
    }


    // this is for every class details page in sessions tab
    @UseGuards(AuthGuard, RolesGuard)
    @Get('class')
    @Roles('STUDENT', 'TUTOR')
    async getSessionsByClass(@Query() dto: GetClassSessionsDto, @GetCurrentUserId() userId: string) {
        return await this.session.getByClassId(dto, userId)
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Patch('cancel/:sessionId')
    @Roles('STUDENT', 'TUTOR')
    async cancelSession(@Param('sessionId') sessionId: string, @GetCurrentUserId() userId: string) {
        return await this.session.cancel(sessionId, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('approve/:sessionId')
    @Roles('TUTOR')
    async approveSession(@Param('sessionId') sessionId: string, @GetCurrentUserId() userId: string) {
        return await this.session.approve(sessionId, userId);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Patch('reject/:sessionId')
    @Roles('TUTOR')
    async rejectSession(@Param('sessionId') sessionId: string, @GetCurrentUserId() userId: string) {
        return await this.session.reject(sessionId, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('reschedule/:sessionId')
    @Roles('STUDENT', 'TUTOR')
    async rescheduleSession(
        @Param('sessionId') sessionId: string,
        @Body() dto: RescheduleSessionDto,
        @GetCurrentUserId() userId: string,
    ) {
        return await this.session.reschedule(sessionId, dto, userId);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Post('group/extra')
    @Roles('TUTOR')
    async extraSession(@Body() dto: CreateGroupExtraSessionDto, @GetCurrentUserId() userId: string) {
        return await this.session.createExtraSession(dto, userId);
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Post('group/dbout')
    @Roles('TUTOR')
    async dboutSession(@Body() dto: CreateGroupDboutSessionDto, @GetCurrentUserId() userId: string) {
        return await this.session.createDboutSession(dto, userId)
    }

    // this is for student and teachers dashboard 
    @UseGuards(AuthGuard, RolesGuard)
    @Get('upcoming')
    @Roles('TUTOR', 'STUDENT')
    async getUpcomingSession(@GetCurrentUserId() userId: string) {
        return await this.session.getUpcomingSession(userId)
    }

}