import { Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { SessionService } from "./session.service";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { AuthGuard } from "src/common/guards/auth.guard";

@Controller({
    path: 'sessions',
    version: '1'
})
export class SessionController {
    constructor(private readonly session: SessionService) { }

    @UseGuards(AuthGuard, RolesGuard)
    @Post('private/request')
    @Roles('STUDENT')
    async privateSessionRequest() {

    }


    // this is for every class page in sessions tab
    @UseGuards(AuthGuard, RolesGuard)
    @Get('class/:classId')
    @Roles('STUDENT', 'TUTOR')
    async getSessionsByClass() {

    }

    @UseGuards(AuthGuard, RolesGuard)
    @Patch('cancel/:sessionId')
    @Roles('STUDENT', 'TUTOR')
    async cancelSession() {

    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('approve/:sessionId')
    @Roles('TUTOR')
    async approveSession() {

    }

    @UseGuards(AuthGuard, RolesGuard)
    @Patch('reject/:sessionId')
    @Roles('TUTOR')
    async rejectSession() {

    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('reschedule/:sessionId')
    @Roles('STUDENT', 'TUTOR')
    async rescheduleSession() {

    }

    @UseGuards(AuthGuard, RolesGuard)
    @Post('group/extra')
    @Roles('TUTOR')
    async extraSession() {

    }


    @UseGuards(AuthGuard, RolesGuard)
    @Post('group/dbout')
    @Roles('TUTOR')
    async dboutSession() {

    }

    // this is for student and teachers dashboard 
    @UseGuards(AuthGuard, RolesGuard)
    @Get('upcoming')
    @Roles('TUTOR', 'STUDENT')
    async groupSession() {

    }

}