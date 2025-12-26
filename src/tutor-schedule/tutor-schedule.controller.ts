import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TutorAvailibilityService } from "./tutor-availibility.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorator/roles.decorator";
import { CreateTutorAvailabilityDto, TutorAvailabilityFilterDto, UpdateTutorAvailabilityDto } from "./dtos/tutor-availibility.dto";
import { GetCurrentUserId } from "src/common/decorator/get-current-user-id.decorator";
import { CreateTutorTimeOffDto, TutorTimeOffFilterDto } from "./dtos/tutor-timeoff.dto";
import { TutorTimeoffService } from "./tutor-timeoff.service";
import { CreateTutorLeaveDto, TutorLeaveFilterDto } from "./dtos/tutor-leave.dto";
import { TutorLeaveService } from "./tutor-leave.service";

@Controller({
    path: 'schedule',
    version: '1'
})
export class TutorScheduleController{
    constructor(
        private readonly availibility: TutorAvailibilityService,
        private readonly timeoff: TutorTimeoffService,
        private readonly leave: TutorLeaveService
    ){}

    @UseGuards(AuthGuard, RolesGuard)
    @Post('availibility')
    @Roles('TUTOR')
    async create(@Body() dto: CreateTutorAvailabilityDto, @GetCurrentUserId() userId: string){
        return await this.availibility.create(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Post('timeoff')
    @Roles('TUTOR')
    async createTimeoff(@Body() dto: CreateTutorTimeOffDto, @GetCurrentUserId() userId: string){
        return await this.timeoff.create(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Post('leave')
    @Roles('TUTOR')
    async createLeave(@Body() dto: CreateTutorLeaveDto, @GetCurrentUserId() userId: string){
        return await this.leave.create(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get('availibility')
    @Roles('TUTOR')
    async getAll(@Query() dto: TutorAvailabilityFilterDto, @GetCurrentUserId() userId: string){
        return await this.availibility.getAll(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get('timeoff')
    @Roles('TUTOR')
    async getAllTimeOff(@Query() dto: TutorTimeOffFilterDto, @GetCurrentUserId() userId: string){
        return await this.timeoff.getAll(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Get('leave')
    @Roles('TUTOR')
    async getAllLeave(@Query() dto: TutorLeaveFilterDto, @GetCurrentUserId() userId: string){
        return await this.leave.getAll(dto, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('availibility/toggle/:id')
    @Roles('TUTOR')
    async statusToggle(@Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.availibility.statusToggle(id, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Delete('availibility/:id')
    @Roles('TUTOR')
    async delete(@Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.availibility.delete(id, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Delete('timeoff/:id')
    @Roles('TUTOR')
    async deleteTimeoff(@Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.timeoff.delete(id, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Delete('leave/:id')
    @Roles('TUTOR')
    async deleteLeave(@Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.leave.delete(id, userId)
    }


    @UseGuards(AuthGuard, RolesGuard)
    @Patch('availibility/:id')
    @Roles('TUTOR')
    async update(@Body() dto: UpdateTutorAvailabilityDto, @Param('id') id: string, @GetCurrentUserId() userId: string){
        return await this.availibility.update(id, dto, userId)
    }
}