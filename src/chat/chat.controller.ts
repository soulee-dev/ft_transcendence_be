import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('/:id')
  async getChat(@Param('id') id: number) {
    return this.chatService.getChat(id);
  }

  @Post('/:id')
  async sendMessage(
    @Param('id') id: number,
    @Body() messageData: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, messageData);
  }
}
