import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { Server, Socket } from 'socket.io';
import { ExtendedSocket } from '../auth/jwtWsGuard.interface';
import { GamesService } from './games.service';

@WebSocketGateway({
  cors: {
    origin: `http://${process.env.HOST}:${process.env.FE_PORT}`,
    credentials: true,
  },
})
@UseGuards(JwtWsGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  constructor(private readonly gameService: GamesService) {}
  afterInit(server: Server) {
    this.gameService.server = server;
  }

  handleConnection(client: ExtendedSocket, ...args: any[]) {
    console.log('a user connected');
  }

  handleDisconnect(client: ExtendedSocket) {
    console.log('user disconnected');
  }

  @SubscribeMessage('join')
  handleJoin(client: ExtendedSocket) {
    this.gameService.joinGame(client);
  }

  @SubscribeMessage('custom')
  handleCustom(client: ExtendedSocket, @MessageBody() userId: number) {
    this.gameService.customGame(client, userId);
  }

  @SubscribeMessage('setCustom')
  handleSetCustom(
    client: ExtendedSocket,
    @MessageBody() roomId: number,
    @MessageBody() speed: number,
  ) {
    this.gameService.setCustomGame(client, roomId, speed);
  }

  @SubscribeMessage('acceptInvite')
  handleAcceptInvite(client: ExtendedSocket, @MessageBody() roomId: number) {
    this.gameService.joinCustomGame(client, roomId);
  }

  @SubscribeMessage('declineInvite')
  handleDeclineInvite(client: ExtendedSocket, @MessageBody() roomId: number) {
    this.gameService.declineInvite(client, roomId);
  }

  @SubscribeMessage('cancelMatch')
  handleCancelMatch(client: ExtendedSocket, @MessageBody() roomId: number) {
    this.gameService.cancelMatch(client, roomId);
  }

  @SubscribeMessage('move')
  handleMove(client: ExtendedSocket, payload: any) {
    this.gameService.movePlayer(client, payload);
  }

  @SubscribeMessage('leave')
  handleLeave(client: ExtendedSocket, roomID: string) {
    client.leave(roomID);
  }
}
