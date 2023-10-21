import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway()
export class ChannelsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinChannel')
  handleJoinChannel(
      @MessageBody() channelId: number,
      @ConnectedSocket() client: Socket,
  ) {
    client.join(channelId.toString());
    return { status: 'Joined channel', channelId };
  } // front: 채널을 생성하는 주체이거나 채널에 join할때 emit

  @SubscribeMessage('leaveChannel')
  handleLeaveChannel(
      @MessageBody() channelId: number,
      @ConnectedSocket() client: Socket,
  ) {
    client.leave(channelId.toString());
    return { status: 'Left channel', channelId };
  } // front: 채팅방 나갈때 emit (밴 킥 뮤트는 noti로 해야할듯)

  @SubscribeMessage('logout')
  handleLogout(@ConnectedSocket() client: Socket) {
    // 모든 채널에서 클라이언트를 제거
    const rooms = Object.keys(client.rooms);
    rooms.forEach(room => client.leave(room));

    return { status: 'Logged out and left all channels' };
  } // front: 로그아웃할때 emit

  sendMessageToChannel(channelId: number, message: string) {
    this.server.to(channelId.toString()).emit('newMessage', message);
  }
}
