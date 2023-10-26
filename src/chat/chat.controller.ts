import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TwoFaGuard } from '../auth/two-fa.guard';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/:channel_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve chat messages from a channel' })
  @ApiResponse({
    status: 200,
    description: 'Chat messages retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getChat(@Param('channel_id') channel_id: number, @Req() req) {
    const id = req.user.id;
    return this.chatService.getChat(channel_id, id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:channel_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a channel' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  @ApiBody({ type: SendMessageDto })
  async sendMessage(
    @Param('channel_id') channelId: number,
    @Req() req,
    @Body() messageData: SendMessageDto,
  ) {
    const id = req.user.id;
    return this.chatService.sendMessage(channelId, id, messageData);
  }
}
