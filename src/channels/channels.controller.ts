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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TwoFaGuard } from '../auth/two-fa.guard';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve public channels' })
  @ApiResponse({
    status: 200,
    description: 'Public channels retrieved successfully',
  })
  async getPublicChannels(@Req() req) {
    const id = req.user.id;
    return this.channelsService.getPublicChannels(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/joined')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve joined channels' })
  @ApiResponse({
    status: 200,
    description: 'joined channels retrieved successfully',
  })
  async getChannelsIn(@Req() req: any) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.getChannelsIn(id);
  }
  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/search/:name')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve channel by name' })
  @ApiResponse({
    status: 200,
    description: 'Channel by name retrieved successfully',
  })
  @ApiParam({ name: 'channel_name', description: 'Name of the channel' })
  async getChannelByName(@Param('name') name: string) {
    return this.channelsService.getChannelByName(name);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/:channel_id/users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users of a channel' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getChannelUsers(@Param('channel_id') id: number) {
    return this.channelsService.getChannelUsers(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/create/:user_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a direct message channel' })
  @ApiResponse({
    status: 201,
    description: 'Direct message channel created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({
    name: 'user_id',
    description: 'ID of the user to create a DM channel with',
  })
  async createDMChannel(@Param('user_id') user_id: number, @Req() req: any) {
    const creator = req.user.id;
    if (!creator) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.createDMChannel(user_id, creator);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreateChannelDto })
  async createChannel(@Body() channelData: CreateChannelDto, @Req() req: any) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.createChannel(channelData, id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:channel_id/leave')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a channel' })
  @ApiResponse({ status: 200, description: 'Left the channel successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel to leave' })
  async leaveChannel(@Param('channel_id') channel_id: number, @Req() req: any) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.handleUserDeparture(channel_id, id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:channel_id/update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a channel' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiParam({
    name: 'channel_id',
    description: 'ID of the channel to be updated',
  })
  @ApiBody({ type: UpdateChannelDto })
  async updateChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Body() updateData: UpdateChannelDto,
  ) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.updateChannel(channel_id, id, updateData);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:channel_id/admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manage a channel as an admin' })
  @ApiResponse({ status: 200, description: 'Channel managed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel to manage' })
  @ApiBody({ type: UserActionDto })
  async manageChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Body() managementData: UserActionDto,
  ) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.manageChannel(channel_id, id, managementData);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:channel_id/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a public channel' })
  @ApiResponse({ status: 200, description: 'Joined the channel successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel to join' })
  @ApiQuery({ name: 'password', description: 'Password to join the channel' })
  async joinPublicChannel(
    @Param('channel_id') channel_id: number,
    @Req() req: any,
    @Query('password') password: string,
  ) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.joinPublicChannel(channel_id, id, password);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/join')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a private channel' })
  @ApiResponse({ status: 200, description: 'Joined the channel successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiQuery({ name: 'password', description: 'Password to join the channel' })
  @ApiQuery({ name: 'name', description: 'Name of the channel to join' })
  async joinPrivateChannel(
    @Req() req: any,
    @Query('password') password: string,
    @Query('name') name: string,
  ) {
    const id = req.user.id;
    if (!id) {
      throw new UnauthorizedException(
        'You need to be logged in to create a channel.',
      );
    }
    return this.channelsService.joinPrivateChannel(id, password, name);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/:channel_id/banList')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ban list of a channel' })
  @ApiResponse({ status: 200, description: 'Ban list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getBanList(@Param('channel_id') id: number, @Req() req) {
    const userId = req.user.id;
    return this.channelsService.getBanList(id, userId);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/:channel_id/muteList')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mute list of a channel' })
  @ApiResponse({ status: 200, description: 'Mute list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getMuteList(@Param('channel_id') id: number, @Req() req) {
    const userId = req.user.id;
    return this.channelsService.getMuteList(id, userId);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/adminChannelList')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin list of a channel' })
  @ApiResponse({
    status: 200,
    description: 'Admin list retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdminChannelList(@Req() req) {
    const userId = req.user.id;
    return this.channelsService.getAdminChannelList(userId);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/:channel_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getChannel(@Param('channel_id') id: number) {
    return this.channelsService.getChannel(id);
  }
}
