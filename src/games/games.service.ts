import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { ExtendedSocket } from '../auth/jwtWsGuard.interface';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';
import { UsersService } from '../users/users.service';

interface Player {
  socketID: string;
  playerNo: number;
  score: number;
  x: number;
  y: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface Spectator {
  socketID: string;
  userID: number;
}

interface Room {
  id: number;
  players: Player[];
  ball: Ball;
  winner: number;
  custom: boolean;
  spectators?: Spectator[];
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationGateway,
    private readonly usersService: UsersService,
  ) {}

  private rooms: Room[] = [];
  private nextRoomID: number = 1;
  public server: Server;

  async getRecord(id: number) {
    try {
      return await this.prisma.games.findMany({
        where: {
          OR: [{ player1_id: id }, { player2_id: id }],
        },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 전적 불러오기 실패`);
    }
  }

  async getLadder() {
    try {
      const games = await this.prisma.games.findMany();

      let userWins: Record<number, number> = {};

      // Determine the winner for each game
      games.forEach((game) => {
        let winnerId = null;
        if (game.score1 > game.score2) {
          winnerId = game.player1_id;
        } else if (game.score2 > game.score1) {
          winnerId = game.player2_id;
        }
        if (winnerId !== null) {
          if (!userWins[winnerId]) {
            userWins[winnerId] = 1;
          } else {
            userWins[winnerId]++;
          }
        }
      });

      // Convert the wins to an array, sort it, and take the top 10 users
      let rankedUsers = Object.entries(userWins)
        .map(([userId, winCount]) => ({
          userId: Number(userId),
          winCount,
        }))
        .sort((a, b) => b.winCount - a.winCount)
        .map((user, index) => ({
          ...user,
          rank: index + 1, // Assign the rank based on the index
        }))
        .slice(0, 10); // Take only the top 10

      return rankedUsers;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 랭킹 불러오기 실패`);
    }
  }

  async getLadderByUserId(id: number) {
    const ranking = await this.getLadder();
    const userRank = ranking.find((user) => user.userId === id);
    if (userRank) {
      return userRank;
    } else {
      return { userId: id, winCount: 0, rank: 0 };
    }
  }

  createRoom(client: ExtendedSocket, custom: boolean) {
    const room = {
      id: this.nextRoomID++,
      players: [
        {
          socketID: client.id,
          playerNo: client.user.sub,
          score: 0,
          x: 90,
          y: 200,
        },
      ],
      ball: {
        x: 395,
        y: 245,
        dx: Math.random() < 0.5 ? 1 : -1,
        dy: 0,
      },
      winner: 0,
      custom: custom,
    };
    this.rooms.push(room);
    client.join(room.id.toString());
    client.emit('playerNo', client.user.sub);
    client.emit('roomId', room.id);
    return room;
  }

  async customGame(client: ExtendedSocket, userId: string) {
    const user = await this.usersService.getUser(parseInt(userId));
    if (user.status === 'in_game') {
      throw new BadRequestException(
        `게임 중에는 커스텀 게임을 할 수 없습니다.`,
      );
    }
    const room = this.createRoom(client, true);
    const payload: NotificationPayload = {
      type: 'INVITE_CUSTOM_GAME',
      channelId: room.id,
      userId: client.user.sub,
      message: `커스텀 게임 초대가 왔습니다.`,
    };
    this.notification.sendNotificationToUser(parseInt(userId), payload);
  }

  joinCustomGame(client: ExtendedSocket, roomID: string) {
    try {
      const room = this.rooms.find((room) => room.id === parseInt(roomID));
      if (!room) {
        throw new BadRequestException(`존재하지 않는 게임입니다.`);
      }
      if (room) {
        client.join(room.id.toString());
        client.emit('playerNo', client.user.sub);

        room.players.push({
          socketID: client.id,
          playerNo: client.user.sub,
          score: 0,
          x: 690,
          y: 200,
        });

        client.to(room.id.toString()).emit('invitedPlayerHasArrived');
      }
    } catch (error) {
      throw error;
    }
  }

  setCustomGame(client: ExtendedSocket, roomID: string, speed: string) {
    const room = this.rooms.find((room) => room.id === parseInt(roomID));
    if (room) {
      room.ball.dx *= parseInt(speed);
      room.ball.dy *= parseInt(speed);
      this.server.to(room.id.toString()).emit('startingGame');

      setTimeout(() => {
        this.server.to(room.id.toString()).emit('startedGame', room);
        this.startGame(room, parseInt(speed));
      }, 3000);
    }
  }

  declineInvite(client: ExtendedSocket, roomID: string) {
    const room = this.rooms.find((room) => room.id === parseInt(roomID));
    if (room) {
      this.server.to(room.id.toString()).emit('declinedInvite');
      this.rooms = this.rooms.filter((r) => r.id !== room.id); // Remove the room
    }
  }

  async cancelMatch(client: ExtendedSocket, roomID: string) {
    const room = this.rooms.find((room) => room.id === parseInt(roomID));
    if (room) {
      if (room.players.length === 2) {
        const winner =
          room.players[0].playerNo === client.user.sub
            ? room.players[1]
            : room.players[0];
        const loser =
          room.players[0].playerNo !== client.user.sub
            ? room.players[1]
            : room.players[0];
        const payload: NotificationPayload = {
          type: 'LEFT_GAME',
          channelId: room.id,
          userId: client.user.sub,
          message: `상대방이 나갔습니다.`,
        };
        this.notification.sendNotificationToUser(winner.playerNo, payload);
        room.winner = winner.playerNo;
        winner.score = 10;
        loser.score = 0;
        this.server.to(room.id.toString()).emit('endGame', room);
        if (!room.custom) {
          await this.prisma.games.create({
            data: {
              player1_id: winner.playerNo,
              player2_id: loser.playerNo,
              score1: winner.score,
              score2: loser.score,
            },
          });
        }
      }
      this.rooms = this.rooms.filter((r) => r.id !== room.id); // Remove the room
    }
  }

  joinGame(client: ExtendedSocket) {
    try {
      let room: Room | undefined = this.rooms.find(
        (r) => r.players.length === 1 && !r.custom,
      );
      const joinedRoom = this.rooms.find(
        (r) =>
          r.players.find((p) => p.playerNo === client.user.sub) !== undefined,
      );
      if (joinedRoom) {
        const playerLength = joinedRoom.players.length;
        if (playerLength === 1) {
          this.rooms = this.rooms.filter((r) => r.id !== joinedRoom.id); // Remove the room
          client.leave(joinedRoom.id.toString());
          if (joinedRoom.spectators) {
            joinedRoom.spectators.forEach((s) => {
              const socket = this.server.sockets.sockets.get(s.socketID);
              if (socket) {
                socket.leave(joinedRoom.id.toString());
              }
            });
          }
        }
        if (playerLength === 2) {
          joinedRoom.players.forEach((p) => {
            const socket = this.server.sockets.sockets.get(p.socketID);
            if (socket) {
              this.cancelMatch(socket, joinedRoom.id.toString());
            }
          });
          if (joinedRoom.spectators) {
            joinedRoom.spectators.forEach((s) => {
              const socket = this.server.sockets.sockets.get(s.socketID);
              if (socket) {
                this.leaveAsSpectator(socket, joinedRoom.id.toString());
              }
            });
          }
        }
      }
      if (room) {
        if (room.players[0].playerNo === client.user.sub) {
          throw new BadRequestException(`자기 자신과는 게임을 할 수 없습니다.`);
        }
        client.join(room.id.toString());
        client.emit('playerNo', client.user.sub);

        room.players.push({
          socketID: client.id,
          playerNo: client.user.sub,
          score: 0,
          x: 690,
          y: 200,
        });
        const speed = 1;

        this.server.to(room.id.toString()).emit('startingGame');

        setTimeout(() => {
          this.server.to(room.id.toString()).emit('startedGame', room);
          this.startGame(room, speed);
        }, 3000);
      } else {
        room = this.createRoom(client, false);
      }
    } catch (error) {
      throw error;
    }
  }

  movePlayer(
    client: Socket,
    data: { roomID: number; playerNo: number; direction: string },
  ) {
    const room = this.rooms.find((room) => room.id === data.roomID);

    if (room) {
      const player = room.players.find((p) => p.playerNo === data.playerNo);
      if (player) {
        if (data.direction === 'up') {
          player.y -= 10;
          player.y = Math.max(player.y, 0);
        } else if (data.direction === 'down') {
          player.y += 10;
          player.y = Math.min(player.y, 440);
        }
        client.to(room.id.toString()).emit('updateGame', room);
      }
    }
  }
  async startGame(room: Room, speed: number) {
    let gameEnded = false;
    await this.prisma.users.updateMany({
      where: {
        id: {
          in: [room.players[0].playerNo, room.players[1].playerNo],
        },
      },
      data: {
        status: 'in_game',
      },
    });
    let interval = setInterval(async () => {
      // Ball movement logic
      room.ball.x += room.ball.dx * 3;
      room.ball.y += room.ball.dy * 3;

      // Collision detection with paddles
      const player1 = room.players[0];
      const player2 = room.players[1];

      // Player 1 collision
      if (
        room.ball.x > 100 &&
        room.ball.x < 110 &&
        room.ball.y > player1.y &&
        room.ball.y < player1.y + 60
      ) {
        room.ball.dx *= -1;
        this.adjustBallDirection(room.ball, player1.y, speed);
      }

      // Player 2 collision
      if (
        room.ball.x > 680 &&
        room.ball.x < 690 &&
        room.ball.y > player2.y &&
        room.ball.y < player2.y + 60
      ) {
        room.ball.dx *= -1;
        this.adjustBallDirection(room.ball, player2.y, speed);
      }

      // Wall collision detection
      if (room.ball.y <= 5 || room.ball.y >= 485) {
        room.ball.dy *= -1;
      }

      // Score update and ball reset
      if (room.ball.x <= 5 || room.ball.x >= 795) {
        this.updateScore(room);
        this.resetBall(room);
      }

      // Emit the updated game state to all clients in the room
      this.server.to(room.id.toString()).emit('updateGame', room);

      // Check for win condition
      if (!gameEnded && (player1.score >= 10 || player2.score >= 10)) {
        gameEnded = true;
        room.winner = player1.score >= 10 ? player1.playerNo : player2.playerNo;
        this.server.to(room.id.toString()).emit('endGame', room);
        if (!room.custom) {
          await this.prisma.games.create({
            data: {
              player1_id: room.players[0].playerNo,
              player2_id: room.players[1].playerNo,
              score1: room.players[0].score,
              score2: room.players[1].score,
            },
          });
        }
        await this.prisma.users.updateMany({
          where: {
            id: {
              in: [room.players[0].playerNo, room.players[1].playerNo],
            },
          },
          data: {
            status: 'online',
          },
        });
        clearInterval(interval);
        this.rooms = this.rooms.filter((r) => r.id !== room.id); // Remove the room
      }
    }, 1000 / 60); // 60 times per second
  }

  private adjustBallDirection(ball: Ball, playerY: number, speed: number) {
    if (ball.y < playerY + 30) {
      ball.dy = -1 * speed;
    } else if (ball.y > playerY + 30) {
      ball.dy = speed;
    } else {
      ball.dy = 0;
    }
  }

  private updateScore(room: Room) {
    if (room.ball.x <= 5) {
      room.players[1].score += 1;
    } else if (room.ball.x >= 795) {
      room.players[0].score += 1;
    }
  }

  private resetBall(room: Room) {
    room.ball.x = 395;
    room.ball.y = 245;
    room.ball.dx *=
      (room.players[0].score + room.players[1].score) % 2 ? -1 : 1;
    room.ball.dy = 0;
  }

  joinAsSpectator(client: ExtendedSocket, userId: string) {
    console.log(this.rooms);
    const room = this.rooms.find(
      (room) =>
        (room.players[0] && room.players[0].playerNo === parseInt(userId)) ||
        (room.players[1] && room.players[1].playerNo === parseInt(userId)),
    );
    if (room) {
      client.join(room.id.toString());
      if (room.spectators) {
        room.spectators.push(client.user.sub); // Add the client ID to the spectators array
      } else {
        room.spectators = [
          {
            socketID: client.id,
            userID: client.user.sub,
          },
        ];
      }
      this.server.to(room.id.toString()).emit('spectatorJoined', {
        spectatorId: client.user.sub,
        roomId: room.id,
      });
      client.emit('roomId', room.id);
    }
  }

  leaveAsSpectator(client: ExtendedSocket, roomID: string) {
    const room = this.rooms.find((room) => room.id === parseInt(roomID));
    if (room) {
      room.spectators = room.spectators.filter((id) => id !== client.user.sub); // Remove the client ID from the spectators array
      this.server
        .to(room.id.toString())
        .emit('spectatorLeft', { spectatorId: client.user.sub });
    }
    client.leave(roomID.toString());
  }
}
