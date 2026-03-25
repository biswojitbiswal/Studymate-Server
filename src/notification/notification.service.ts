import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable({})
export class NotificationService{
    constructor(private readonly prisma: PrismaService){}


    async create(userId: string, title: string, message: string, type: string, metadata: any){
        try {
            const notification = await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
                    isRead: false,
                    metadata
                }
            })

            return notification;
        } catch (error) {
            throw error;
        }
    }


    async getByUserId(userId: string){
        try {
            const notifications = await this.prisma.notification.findMany({
                where: {
                    userId,
                    isRead: false
                },
                take: 10
            })

            if(!notifications) throw new NotFoundException("Notification not found");

            return notifications;
        } catch (error) {
            throw error;
        }
    }


    async MarkAsRead(id: string){
        try {
            const notification = await this.prisma.notification.findUnique({
                where: {id},
                select: {
                    id: true,
                }
            })

            if(!notification) throw new NotFoundException("Notification not found");

            await this.prisma.notification.update({
                where: {id: notification.id},
                data: {
                    isRead: true
                }
            })

            return {message: "Notification marked as READ"}
        } catch (error) {
            throw error;
        }
    }
}