import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationPreferenceController } from "./notification-preference.controller";
import { NotificationService } from "./notification.service";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationGateway } from "./notification.gateway";
import { WebsocketGateway } from "websocket/websocket.gateway";
import { WebsocketModule } from "websocket/websocket.module";

@Module({
    imports: [PrismaModule, WebsocketModule],
    controllers: [NotificationController, NotificationPreferenceController],
    providers: [NotificationService, NotificationPreferenceService, NotificationGateway],
    exports: [NotificationService, NotificationGateway]
})
export class NotificationModule{}