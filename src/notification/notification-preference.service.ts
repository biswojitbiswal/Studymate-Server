import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { PreferenceDto } from "./dtos/notification-preference.dto";

@Injectable({})
export class NotificationPreferenceService{
    constructor(private readonly prisma: PrismaService){}

    async create(dto: PreferenceDto, userId: string){
        try {
            const preference = await this.prisma.notificationPreference.upsert({
                create: {
                    userId,
                    ...dto
                },
                update: {
                    ...dto
                },
                where: {userId}
            })

            return preference;
        } catch (error) {
            throw error;
        }
    }


    async getByUserId(userId: string){
        try {
            const preference = await this.prisma.notificationPreference.findUnique({
                where: {userId}
            })

            return preference;
        } catch (error) {
            throw error;
        }
    }
}