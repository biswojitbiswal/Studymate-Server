import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { PrismaService } from "prisma/prisma.service";
import { Server } from 'socket.io';


@WebSocketGateway({
    cors: { origin: '*' }
})
export class NotificationGateway {
    constructor(private readonly prisma: PrismaService){}
    
    @WebSocketServer()
    server: Server;

    async sendToUser(userId: string, notification: any) {
        this.server.to(userId).emit('notification', notification);

        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });

        this.server.to(userId).emit('notification_count', count);
    }
}