import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { Server } from 'socket.io';
import { ExtendedSocket } from '../auth/jwtWsGuard.interface';
import { GamesService } from './games.service';

@WebSocketGateway({
  cors: {
    origin: `http://${process.env.HOST}:${process.env.FE_PORT}`,
    credentials: true,
  },
})
@UseGuards(JwtWsGuard)
export class GamesGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;
  constructor(private readonly gameService: GamesService) {}

  handleConnection(client: ExtendedSocket): void {
    console.log('Client connected:', client.id);
  }

  @SubscribeMessage('requestMatch')
  async handleRequestMatch(
    @ConnectedSocket() client: ExtendedSocket,
    data: any,
  ): Promise<void> {
    try {
      const playerId = client.user.sub;
      const { game, matched } = await this.gameService.matchGame(playerId);

      client.join(game.id.toString());
      if (!matched) {
        client.emit('InMatching', { message: '게임 매칭 중' });
      }

      if (matched) {
        this.server
          .to(game.id.toString())
          .emit('matchSuccess', { message: '게임 매칭 성공' });
        this.server
          .to(game.id.toString())
          .emit('start', { message: '게임 시작' });
      }
    } catch (error) {
      console.error(error);
      client.emit('matchError', { message: '게임 매칭 실패' });
    }
  }

  sendEndOfGame(gameId: number, winnerId: number): void {
    this.server.to(gameId.toString()).emit('end', { winnerId });
  }

  @SubscribeMessage('cancelMatch')
  async handleLeaveCurrentRoom(
    @ConnectedSocket() client: ExtendedSocket,
  ): Promise<void> {
    try {
      const rooms = this.server.sockets.adapter.sids.get(client.id);
      if (rooms) {
        for (const room of rooms.keys()) {
          if (room !== client.id) {
            const canceldMatch = await this.gameService.cancelMatch(
              parseInt(room),
            );
            client.leave(room);
          }
        }
      }
    } catch (error) {
      console.error(error);
      client.emit('leaveError', { message: '매칭 취소 실패' });
    }
  }

  @SubscribeMessage('leaveGame')
  async handleLeaveGame(
    @ConnectedSocket() client: ExtendedSocket,
    @MessageBody() data: { gameId: number },
  ): Promise<void> {
    try {
      client.leave(data.gameId.toString());
    } catch (error) {
      console.error(error);
      client.emit('leaveError', { message: '게임 나가기 실패' });
    }
  }
}
