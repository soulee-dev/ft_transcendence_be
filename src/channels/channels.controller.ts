import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UserActionDto } from './dto/user-action.dto';
import {ApiTags} from "@nestjs/swagger";

@ApiTags("channels")
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getPublicChannels() {
    return this.channelsService.getPublicChannels();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/joined')
  async getChannelsIn(@Req() req: any) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
          'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.getChannelsIn(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/:channel_id/users')
  async getChannelUsers(@Param('channel_id') id: number) {
    return this.channelsService.getChannelUsers(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/create/:user_id')
  async createDMChannel(@Param('user_id') user_id: number, @Req() req: any) {
    const creator = req.user.id;
    if (!creator) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.createDMChannel(user_id, creator);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/create')
  async createChannel(@Body() channelData: CreateChannelDto, @Req() req: any) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.createChannel(channelData, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/:channel_id/leave')
  async leaveChannel(@Param('channel_id') channel_id: number, @Req() req: any) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.handleUserDeparture(channel_id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/:channel_id/update')
  async updateChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Body() updateData: UpdateChannelDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.updateChannel(channel_id, userId, updateData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/:channel_id/admin')
  async manageChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Body() managementData: UserActionDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.manageChannel(
      channel_id,
      userId,
      managementData,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/:channel_id/join')
  async joinPublicChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Query('password') password: string,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.joinPublicChannel(channel_id, userId, password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/join')
  async joinPrivateChannel(
    @Req() req: any,
    @Query('password') password: string,
    @Query('name') name: string,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.joinPrivateChannel(userId, password, name);
  }
}
