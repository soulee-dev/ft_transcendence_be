// notification.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  ConnectedSocket,
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
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinNotificationChannel')
  handleJoinNotificationChannel(@ConnectedSocket() client: ExtendedSocket) {
      const userId = client.user.sub; // <-- Get userId from the socket directly
      client.join(userId.toString());
      console.log(`User ${userId} joined the notification channel`);
      return { status: 'Joined notification channel', userId };
  }

  @SubscribeMessage('leaveNotificationChannel')
  handleLeaveNotificationChannel(@ConnectedSocket() client: Socket) {
      client.leave('notificationChannel');
      console.log(`User ${client.id} left the notification channel`)
      return { status: 'Left the notification channel' };
  }

  handleConnection(client: Socket) {
      console.log(`Client connected for notifications: ${client.id}`);
  }

  sendNotificationToUser(userId: number, payload: NotificationPayload) {
      this.server.to(userId.toString()).emit('notification', payload);
      console.log(`Notification sent to user ${userId}, payload: ${JSON.stringify(payload)}`)
  }
}
