import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getChat(channelId: number, id: number) {
    try {
      const user = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: id,
            channel_id: channelId,
          },
        },
      });

      if (!user) {
        throw new HttpException('You are not in the channel', HttpStatus.FORBIDDEN);
      }
      return await this.prisma.chat.findMany({
        where: { channel_id: channelId },
      });
    } catch (error) {
      console.error(error);
      throw new HttpException('Failed to retrieve chat', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async sendMessage(id: number, messageData: SendMessageDto) {
    try {
      const senderId = messageData.sent_by_id;

      const user = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: senderId,
            channel_id: id,
          },
        },
      });

      if (!user) {
        throw new HttpException('You are not in the channel', HttpStatus.FORBIDDEN);
      }

      const mute = await this.prisma.channelMutes.findUnique({
        where: {
          channel_id_user_id: {
            channel_id: id,
            user_id: senderId,
          },
        },
      });

      if (mute) {
        throw new HttpException('You are muted in the channel', HttpStatus.FORBIDDEN);
      }

      return await this.prisma.chat.create({
        data: {
          channel_id: id,
          ...messageData,
        },
      });
    } catch (error) {
      console.error(error);
      throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
