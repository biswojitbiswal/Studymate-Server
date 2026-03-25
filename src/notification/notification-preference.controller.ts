import { Body, Controller, Get, Post } from "@nestjs/common";
import { NotificationPreferenceService } from "./notification-preference.service";
import { PreferenceDto } from "./dtos/notification-preference.dto";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";

@Controller({
    path: 'notification-preferences',
    version: '1'
})
export class NotificationPreferenceController{
    constructor(private readonly preferenceService: NotificationPreferenceService){}


    @Post()
    async create(@Body() dto: PreferenceDto, @GetCurrentUserId() userId: string){
        return await this.preferenceService.create(dto, userId)
    }


    @Get()
    async getByUserId(@GetCurrentUserId() userId: string){
        return await this.preferenceService.getByUserId(userId)
    }
}