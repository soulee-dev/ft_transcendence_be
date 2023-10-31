import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { AuthGuard } from '@nestjs/passport';
import { TwoFaGuard } from '../auth/two-fa.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/my-record')
  @ApiBearerAuth()
  async getMyGames(@Req() req) {
    const id = req.user.id;
    return this.gamesService.getRecord(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/user/:userId/record')
  @ApiBearerAuth()
  async getOthersGames(@Param('userId') userId: number) {
    return this.gamesService.getRecord(userId);
  }
}
