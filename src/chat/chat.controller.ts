import {Body, Controller, Get, Param, Post, UseGuards} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {AuthGuard} from "@nestjs/passport";

@ApiTags("chat")
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/:channel_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve chat messages from a channel' })
  @ApiResponse({ status: 200, description: 'Chat messages retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  async getChat(@Param('channel_id') id: number) {
    return this.chatService.getChat(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/:channel_id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a channel' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'channel_id', description: 'ID of the channel' })
  @ApiBody({ type: SendMessageDto })
  async sendMessage(
    @Param('channel_id') id: number,
    @Body() messageData: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, messageData);
  }
}
