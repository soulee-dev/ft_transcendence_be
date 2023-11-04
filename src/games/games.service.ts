import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Server, Socket } from 'socket.io';

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
}

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  private rooms: Room[] = [];
  public server: Server;

  async getRecord(id: number) {
    try {
      return await this.prisma.games.findMany({
        where: {
          OR: [
            { player1_id: id, player2_id: { not: null } },
            { player2_id: id, player1_id: { not: null } },
          ],
        },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 전적 불러오기 실패`);
    }
  }

  async createGame(id: number) {
    try {
      return await this.prisma.games.create({
        data: {
          player1_id: id,
        },
      });
      // socket 처리
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 생성 실패`);
    }
  }

  async matchGame(id: number) {
    try {
      const unmatchedGames = await this.prisma.games.findMany({
        where: {
          player2_id: null,
        },
      });
      if (unmatchedGames.length === 0) {
        return { game: await this.createGame(id), matched: false };
      }
      const randomIndex = Math.floor(Math.random() * unmatchedGames.length);
      const randomGame = unmatchedGames[randomIndex];
      const randomGameId = randomGame.id;
      return {
        game: await this.prisma.games.update({
          where: { id: randomGameId },
          data: {
            player2_id: id,
          },
        }),
        matched: true,
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 매칭 실패`);
    }
  }

  async cancelMatch(id: number) {
    try {
      const canceledGame = await this.prisma.games.delete({
        where: {
          id: id,
          player2_id: null,
        },
      });
      return canceledGame;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`게임 취소 실패`);
    }
  }

  joinGame(client: Socket) {
    let room: Room | undefined = this.rooms.find((r) => r.players.length === 1);

    if (room) {
      client.join(room.id.toString());
      client.emit('playerNo', 2);

      room.players.push({
        socketID: client.id,
        playerNo: 2,
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
            playerNo: 1,
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
      };
      this.rooms.push(room);
      client.join(room.id.toString());
      client.emit('playerNo', 1);
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
  startGame(room: Room) {
    let interval = setInterval(() => {
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
      if (player1.score >= 10 || player2.score >= 10) {
        room.winner = player1.score >= 10 ? 1 : 2;
        this.server.to(room.id.toString()).emit('endGame', room);
        await this.prisma.games.create({});
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
