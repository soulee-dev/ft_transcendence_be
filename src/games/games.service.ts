import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
