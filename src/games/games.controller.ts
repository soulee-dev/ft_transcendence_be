import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { AuthGuard } from '@nestjs/passport';
import { TwoFaGuard } from '../auth/two-fa.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('games')
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

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/ladder')
  @ApiBearerAuth()
  async getLadder() {
    return this.gamesService.getLadder();
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/ladder/:userId')
  @ApiBearerAuth()
  async getLadderByUserId(@Param('userId') id: number) {
    return this.gamesService.getLadderByUserId(id);
  }
}
