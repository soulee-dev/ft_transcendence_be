import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';
import { ChannelOption } from '@prisma/client';

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

      let chats = await this.prisma.chat.findMany({
        where: { channel_id: channelId },
      });
      let blockedUsers = await this.prisma.blockedUsers.findMany({
        where: {
          blocked_by: id,
        },
      });
      let blockedUserIds = blockedUsers.map((user) => user.user_id);
      chats = chats.filter((chat) => !blockedUserIds.includes(chat.sent_by_id));
      return chats;
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

      const channelOption = await this.prisma.channelOptions.findUnique({
        where: {
          channel_id: channelId,
        },
      });
      if (channelOption.option === ChannelOption.DM) {
        const channelUsers = await this.prisma.channelUsers.findMany({
          where: {
            channel_id: channelId,
          },
        });
        const blocked_by = channelUsers.filter(
          (user) => user.user_id !== senderId,
        );
        const blocked = await this.prisma.blockedUsers.findUnique({
          where: {
            user_id_blocked_by: {
              user_id: senderId,
              blocked_by: blocked_by[0].user_id,
            },
          },
        });
        if (blocked) {
          throw new HttpException('차단 당했음', HttpStatus.FORBIDDEN);
        }
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

      const blocked_by = await this.prisma.blockedUsers.findMany({
        where: {
          user_id: senderId,
        },
      });
      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });

      let filteredUsers = users.filter((user) => user.user_id !== senderId);
      const blockedUserIds = blocked_by.map(
        (blockedUser) => blockedUser.blocked_by,
      );

      filteredUsers = filteredUsers.filter(
        (user) => !blockedUserIds.includes(user.user_id),
      );

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
