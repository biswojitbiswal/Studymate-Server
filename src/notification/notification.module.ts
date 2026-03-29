import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationPreferenceController } from "./notification-preference.controller";
import { NotificationService } from "./notification.service";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationGateway } from "./notification.gateway";

@Module({
    imports: [PrismaModule],
    controllers: [NotificationController, NotificationPreferenceController],
    providers: [NotificationService, NotificationPreferenceService, NotificationGateway]
})
export class NotificationModule{}