import { Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";

@Controller({
    path: 'notification',
    version: '1'
})
export class NotificationController{
    constructor(private readonly notificationService: NotificationService){}

    @Get()
    async getByUserId(@GetCurrentUserId() userId: string){
        return await this.notificationService.getByUserId(userId);
    }


    @Get('count')
    async getUnreadCount(@GetCurrentUserId() userId: string){
        return await this.notificationService.getUnreadCount(userId);
    }


    @Patch('bulk/mark-read')
    async markAllAsRead(@GetCurrentUserId() userId: string){
        return await this.notificationService.markAllAsRead(userId);
    }


    @Patch(':id/mark-read')
    async markAsRead(@Param('id') id: string){
        return await this.notificationService.markAsRead(id);
    }
}