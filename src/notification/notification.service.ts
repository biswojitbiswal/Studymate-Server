import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationGateway } from "./notification.gateway";

@Injectable({})
export class NotificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly preferenceService: NotificationPreferenceService,
        private readonly notificationGateway: NotificationGateway
    ) { }


    async create(data: {
        userId: string
        title: string
        message: string
        type: string
        metadata?: any
    }) {
        try {
            const pref = await this.preferenceService.getByUserId(data.userId)

            let notification = {} as any;
            if (pref?.inAppEnabled) {
                notification = await this.prisma.notification.create({
                    data: {
                        ...data,
                        isRead: false,
                    },
                });

                this.notificationGateway.sendToUser(data?.userId, notification);
            }

            return notification
        } catch (error) {
            throw error;
        }
    }


    async getByUserId(userId: string) {
        try {
            const notifications = await this.prisma.notification.findMany({
                where: {
                    userId,
                    isRead: false
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 10
            })

            return notifications;
        } catch (error) {
            throw error;
        }
    }


    async markAsRead(id: string) {
        try {
            await this.prisma.notification.update({
                where: { id },
                data: {
                    isRead: true
                }
            })

            return { message: "Notification marked as READ" }
        } catch (error) {
            throw error;
        }
    }


    async getUnreadCount(userId: string) {
        try {
            return await this.prisma.notification.count({
                where: { userId }
            })
        } catch (error) {
            throw error;
        }
    }


    async markAllAsRead(userId: string) {
        try {
            await this.prisma.notification.updateMany({
                where: { userId },
                data: {
                    isRead: true
                }
            })

            return { message: "Notifications are marked as READ" }
        } catch (error) {
            throw error;
        }
    }
}