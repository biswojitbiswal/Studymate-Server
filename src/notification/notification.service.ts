import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable({})
export class NotificationService{
    constructor(private readonly prisma: PrismaService){}


    // async create(userId: string, title: string, message: string, type: string)
}