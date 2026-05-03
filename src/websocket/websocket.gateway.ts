import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { PrismaService } from 'prisma/prisma.service';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) { }
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.disconnect();
      }

      const decode = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      if (!decode || !decode.id) {
        client.disconnect();
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decode.id }
      })

      if (!user) {
        client.disconnect();
        throw new NotFoundException("User Not Found");
      }

      client.data.user = user;
      client.join(user.id);

      // console.log('Client connected:', user.id);
    } catch (error) {
      console.log('Client disconnected:', client.id);
      client.disconnect();

    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;

    if (user) {
      console.log(`User disconnected: ${user.id}`);

      // optional: update online status
      // this.server.emit("user-offline", user.id);

    } else {
      console.log(`Unknown client disconnected: ${client.id}`);
    }
  }


  async sendToUser(userId: string, notification: any) {

    this.server.to(userId).emit('notification', notification);

    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    this.server.to(userId).emit('notification_count', count);
  }


  async sendToMultipleUsers(userIds: string[], notification: any) {
    for (const userId of userIds) {
      this.server.to(userId).emit('notification', notification);

      const count = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });

      this.server.to(userId).emit('notification_count', count);
    }
  }

  async sendToConversation(conversationId: string, payload: any) {
    const participants = await this.prisma.conversationParticipants.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    participants.forEach((p) => {
      this.server.to(p.userId).emit("new_message", payload);
    });
  }


  @SubscribeMessage("messages_seen")
  async handleMessagesSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data.user?.id;

    if (!userId) {
      throw new BadRequestException("Invalid user");
    }

    // ✅ Security check
    const isParticipant = await this.prisma.conversationParticipants.findFirst({
      where: {
        conversationId: data.conversationId,
        userId,
      },
    });

    if (!isParticipant) {
      throw new BadRequestException("Not part of this conversation");
    }
    console.log(data.conversationId, "=====");

    // 🔥 Update DB
    const result = await this.prisma.messageReceipt.updateMany({
      where: {
        userId,
        seenAt: null,
        message: {
          conversationId: data.conversationId,
          senderId: { not: userId },
        },
      },
      data: {
        seenAt: new Date(),
      },
    });
    if (result.count === 0) return;

    // ✅ Debug
    console.log("Seen updated now:", result.count);

    const participants = await this.prisma.conversationParticipants.findMany({
      where: { conversationId: data.conversationId },
      select: { userId: true },
    });

    participants.forEach((p) => {
      this.server.to(p.userId).emit("messages_seen", {
        conversationId: data.conversationId,
        userId,
      });
    });
  }


  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(conversationId);
  }


  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.leave(conversationId);
  }
}