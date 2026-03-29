import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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

      client.join(user.id);

      console.log('Client connected:', user.id);
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
}