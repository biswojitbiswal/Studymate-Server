import { Controller, Post } from "@nestjs/common";
import { NotificationService } from "./notification.service";

@Controller({
    path: 'notification',
    version: '1'
})
export class NotificationController{
    constructor(private readonly notificationService: NotificationService){}


}