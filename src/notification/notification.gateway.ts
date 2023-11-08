// notification.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationPayload } from './notification-payload.interface';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { UseGuards } from '@nestjs/common';
import { ExtendedSocket } from '../auth/jwtWsGuard.interface';

@WebSocketGateway({
  cors: {
    origin: `http://${process.env.HOST}:${process.env.FE_PORT}`,
    credentials: true,
  },
})
@UseGuards(JwtWsGuard)
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeUsers = new Set<number>();

  @SubscribeMessage('joinNotificationChannel')
  handleJoinNotificationChannel(@ConnectedSocket() client: ExtendedSocket) {
    const userId = client.user.sub; // <-- Get userId from the socket directly
    client.join(userId.toString());
    this.activeUsers.add(userId);
    return { status: 'Joined notification channel', userId };
  }

  @SubscribeMessage('leaveNotificationChannel')
  handleLeaveNotificationChannel(@ConnectedSocket() client: ExtendedSocket) {
    const userId = client.user.sub;
    client.leave(userId.toString());
    this.activeUsers.delete(userId);
    return { status: 'Left the notification channel' };
  }

  handleConnection(client: Socket) {
    console.log(`Client connected for notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from notifications: ${client.id}`);
  }

  sendNotificationToUser(userId: number, payload: NotificationPayload) {
    this.server.to(userId.toString()).emit('notification', payload);
  }
  sendNotificationToAllActiveUsers(payload: NotificationPayload) {
    this.activeUsers.forEach((userId) => {
      this.sendNotificationToUser(userId, payload);
    });
  }
}
