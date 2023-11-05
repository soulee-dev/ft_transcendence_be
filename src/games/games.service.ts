import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { ExtendedSocket } from '../auth/jwtWsGuard.interface';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';

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

interface Room {
  id: number;
  players: Player[];
  ball: Ball;
  winner: number;
  custom: boolean;
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationGateway,
  ) {}

  private rooms: Room[] = [];
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
    // Count wins for player1
    const games = await this.prisma.games.findMany({
      where: {
        AND: [{ score1: { not: null } }, { score2: { not: null } }],
      },
    });

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

  customGame(client: ExtendedSocket, userId: number) {
    const room = {
      id: this.rooms.length + 1,
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
      custom: true,
    };
    this.rooms.push(room);
    client.join(room.id.toString());
    client.emit('playerNo', client.user.sub);
    const payload: NotificationPayload = {
      type: 'INVITE_CUSTOM_GAME',
      channelId: room.id,
      userId: client.user.sub,
      message: `커스텀 게임 초대가 왔습니다.`,
    };
    this.notification.sendNotificationToUser(userId, payload);
  }

  joinGame(client: ExtendedSocket) {
    let room: Room | undefined = this.rooms.find((r) => r.players.length === 1);

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

      this.server.to(room.id.toString()).emit('startingGame');

      setTimeout(() => {
        this.server.to(room.id.toString()).emit('startedGame', room);
        this.startGame(room);
      }, 3000);
    } else {
      room = {
        id: this.rooms.length + 1,
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
        custom: false,
      };
      this.rooms.push(room);
      client.join(room.id.toString());
      client.emit('playerNo', client.user.sub);
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
  async startGame(room: Room) {
    let gameEnded = false;
    let interval = setInterval(async () => {
      // Ball movement logic
      room.ball.x += room.ball.dx * 5;
      room.ball.y += room.ball.dy * 5;

      // Collision detection with paddles
      const player1 = room.players[0];
      const player2 = room.players[1];

      // Player 1 collision
      if (
        room.ball.x < 110 &&
        room.ball.y > player1.y &&
        room.ball.y < player1.y + 60
      ) {
        room.ball.dx = 1;
        this.adjustBallDirection(room.ball, player1.y);
      }

      // Player 2 collision
      if (
        room.ball.x > 670 &&
        room.ball.y > player2.y &&
        room.ball.y < player2.y + 60
      ) {
        room.ball.dx = -1;
        this.adjustBallDirection(room.ball, player2.y);
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
        await this.prisma.games.create({
          data: {
            player1_id: room.players[0].playerNo,
            player2_id: room.players[1].playerNo,
            score1: room.players[0].score,
            score2: room.players[1].score,
          },
        });
        clearInterval(interval);
        this.rooms = this.rooms.filter((r) => r.id !== room.id); // Remove the room
      }
    }, 1000 / 60); // 60 times per second
  }

  private adjustBallDirection(ball: Ball, playerY: number) {
    if (ball.y < playerY + 30) {
      ball.dy = -1;
    } else if (ball.y > playerY + 30) {
      ball.dy = 1;
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
    room.ball.dx = room.players[0].score >= 10 ? -1 : 1;
    room.ball.dy = 0;
  }
}
