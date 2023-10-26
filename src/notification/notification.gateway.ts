// notification.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationPayload } from './notification-payload.interface';

@WebSocketGateway({
  cors: {
    origin: `http://${process.env.HOST}:${process.env.FE_PORT}`,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinNotificationChannel')
  handleJoinNotificationChannel(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(userId.toString());
    return { status: 'Joined notification channel', userId };
  } // front: 로그인성공하면 emit

  @SubscribeMessage('leaveNotificationChannel')
  handleLeaveNotificationChannel(@ConnectedSocket() client: Socket) {
    client.leave('notificationChannel');
    return { status: 'Left the notification channel' };
  } // front: 로그아웃하면 emit

  handleConnection(client: Socket) {
    console.log(`Client connected for notifications: ${client.id}`);
  }

  // 새로운 알림을 사용자에게 전송하는 메서드
  sendNotificationToUser(userId: number, payload: NotificationPayload) {
    this.server.to(userId.toString()).emit('notification', payload);
  }
}
