import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

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
        throw new HttpException('채팅방 유저 아님', HttpStatus.FORBIDDEN);
      }

      return await this.prisma.chat.findMany({
        where: { channel_id: channelId },
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async sendMessage(
    channelId: number,
    senderId: number,
    messageData: SendMessageDto,
  ) {
    try {
      const user = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: senderId,
            channel_id: channelId,
          },
        },
      });

      if (!user) {
        throw new HttpException('채팅방 유저 아님', HttpStatus.FORBIDDEN);
      }

      const mute = await this.prisma.channelMutes.findUnique({
        where: {
          channel_id_user_id: {
            channel_id: channelId,
            user_id: senderId,
          },
        },
      });

      if (mute) {
        throw new HttpException('채팅방에서 뮤트 당함', HttpStatus.FORBIDDEN);
      }

      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });

      const filteredUsers = users.filter((user) => user.user_id !== senderId);

      const newMessage = await this.prisma.chat.create({
        data: {
          channel_id: channelId,
          sent_by_id: senderId,
          ...messageData,
        },
      });
      const payload: NotificationPayload = {
        type: 'SENT_MESSAGE',
        channelId: channelId,
        userId: senderId,
        message: messageData.message,
      };
      filteredUsers.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.user_id, payload);
      });
      return newMessage;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
