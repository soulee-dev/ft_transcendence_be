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

  handleConnection(client: ExtendedSocket, ...args: any[]) {}

  handleDisconnect(client: ExtendedSocket) {}

  @SubscribeMessage('join')
  handleJoin(client: ExtendedSocket) {
    this.gameService.joinGame(client);
  }

  @SubscribeMessage('custom')
  handleCustom(client: ExtendedSocket, userId: string) {
    this.gameService.customGame(client, userId);
  }

  @SubscribeMessage('setCustom')
  handleSetCustom(client: ExtendedSocket, [roomId, speed]: [string, string]) {
    this.gameService.setCustomGame(client, roomId, speed);
  }

  @SubscribeMessage('acceptInvite')
  handleAcceptInvite(client: ExtendedSocket, roomId: string) {
    this.gameService.joinCustomGame(client, roomId);
  }

  @SubscribeMessage('declineInvite')
  handleDeclineInvite(client: ExtendedSocket, roomId: string) {
    this.gameService.declineInvite(client, roomId);
  }

  @SubscribeMessage('cancelMatch')
  handleCancelMatch(client: ExtendedSocket, roomId: string) {
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

  @SubscribeMessage('joinAsSpectator')
  handleJoinAsSpectator(client: ExtendedSocket, userId: string) {
    this.gameService.joinAsSpectator(client, userId);
  }

  @SubscribeMessage('leaveAsSpectator')
  handleLeaveAsSpectator(client: ExtendedSocket, roomID: string) {
    this.gameService.leaveAsSpectator(client, roomID);
  }
}
