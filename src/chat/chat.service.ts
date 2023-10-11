import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getChat(id: number) {
    return this.prisma.chat.findMany({
      where: { channel_id: id },
    });
  }

  async sendMessage(id: number, messageData: SendMessageDto) {
    const senderId = messageData.sent_by_id;
    const user = await this.prisma.channelUsers.findUnique({
      where: {
        user_id_channel_id: {
          user_id: senderId,
          channel_id: id,
        },
      },
    });
    if (!user) return; //you are not in channel
    const mute = await this.prisma.channelMutes.findUnique({
      where: {
        channel_id_user_id: {
          channel_id: id,
          user_id: senderId,
        },
      },
    });
    if (mute) return; // you are muted
    return this.prisma.chat.create({
      data: {
        channel_id: id,
        ...messageData,
      },
    });
  }
}
