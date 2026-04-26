import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { WebsocketModule } from "websocket/websocket.module";

@Module({
    imports: [PrismaModule, WebsocketModule],
    controllers: [ChatController],
    providers: [ChatService]
})
export class ChatModule{}