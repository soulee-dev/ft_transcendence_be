import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPayload } from '../notification/notification-payload.interface';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getFriends(id: number) {
    try {
      return await this.prisma.friends.findMany({
        where: { user_id: id },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`친구 불러오기 실패`);
    }
  }

  async getFriendRequests(id: number) {
    try {
      return await this.prisma.friendRequests.findMany({
        where: { receiver_id: id },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`친구요청 불러오기 실패`);
    }
  }

  async declineFriendRequest(requestId: number, id: number) {
    try {
      const friendRequest = await this.prisma.friendRequests.findUnique({
        where: { id: requestId },
        select: {
          sender_id: true,
          receiver_id: true,
        },
      });
      if (!friendRequest) {
        throw new BadRequestException('해당 친구요청 없음');
      }
      const { sender_id, receiver_id } = friendRequest;
      if (receiver_id !== id) {
        throw new HttpException(
          '친구요청 수신자가 아님',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.prisma.friendRequests.delete({
        where: { id: requestId },
      });
      const payload: NotificationPayload = {
        type: 'DECLINED_YOUR_REQ',
        channelId: null,
        userId: receiver_id,
        message: `친구요청 거절 당함`,
      };
      this.notificationGateway.sendNotificationToUser(sender_id, payload);
      return {
        status: HttpStatus.NO_CONTENT,
        message: '친구요청 거절 성공',
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: number, id: number) {
    try {
      const friendRequest = await this.prisma.friendRequests.findUnique({
        where: { id: requestId },
        select: {
          sender_id: true,
          receiver_id: true,
        },
      });

      if (!friendRequest) {
        throw new BadRequestException('해당 친구요청 없음');
      }

      const { sender_id, receiver_id } = friendRequest;
      if (receiver_id !== id) {
        throw new HttpException(
          '친구요청 수신자가 아님',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.friendRequests.delete({
        where: { id: requestId },
      });

      await this.prisma.friends.createMany({
        data: [
          {
            user_id: sender_id,
            friend_id: receiver_id,
          },
          {
            user_id: receiver_id,
            friend_id: sender_id,
          },
        ],
      });
      const payload: NotificationPayload = {
        type: 'ACCEPTED_YOUR_REQ',
        channelId: null,
        userId: receiver_id,
        message: `친구 요청 수락됨`,
      };
      this.notificationGateway.sendNotificationToUser(sender_id, payload);
      return {
        status: HttpStatus.OK,
        message: '친구요청 수락 성공',
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async addFriend(senderId: number, friendName: string) {
    try {
      friendName = friendName.trim().replace(/\s+/g, '');
      const { id: receiverId } =
        (await this.prisma.users.findUnique({
          select: { id: true },
          where: { name: friendName },
        })) || {};

      if (!receiverId) {
        throw new BadRequestException(`${friendName} 유저 없음`);
      }

      if (senderId === receiverId) {
        throw new BadRequestException('자기 자신을 친구로 추가할 수 없음');
      }

      const existingFriend1 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: senderId,
            friend_id: receiverId,
          },
        },
      });

      const existingFriend2 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: receiverId,
            friend_id: senderId,
          },
        },
      });

      if (existingFriend1 && existingFriend2) {
        throw new BadRequestException('이미 친구임');
      }

      const existingRequest = await this.prisma.friendRequests.findUnique({
        where: {
          sender_id_receiver_id: {
            sender_id: senderId,
            receiver_id: receiverId,
          },
        },
      });

      if (existingRequest) {
        throw new BadRequestException('이미 친구요청을 보냄');
      }
      const blocked = await this.prisma.blockedUsers.findUnique({
        where: {
          user_id_blocked_by: {
            user_id: senderId,
            blocked_by: receiverId,
          },
        },
      });
      if (blocked) {
        throw new HttpException('차단 당함', HttpStatus.FORBIDDEN);
      }
      const request = await this.prisma.friendRequests.create({
        data: {
          sender_id: senderId,
          receiver_id: receiverId,
          status: 'pending',
        },
      });
      const payload: NotificationPayload = {
        type: 'REQUESTED_FRIEND',
        channelId: null,
        userId: senderId,
        message: `친구 요청이 왔습니다.`,
      };
      this.notificationGateway.sendNotificationToUser(receiverId, payload);
      return request;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteFriend(id: number, friendName: string) {
    try {
      friendName = friendName.trim().replace(/\s+/g, '');
      const friend = await this.prisma.users.findUnique({
        select: { id: true },
        where: { name: friendName },
      });

      if (!friend) {
        throw new BadRequestException(`${friendName} 유저 없음`);
      }

      const friendship1 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: friend.id,
            friend_id: id,
          },
        },
      });

      const friendship2 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: id,
            friend_id: friend.id,
          },
        },
      });

      if (!friendship1 || !friendship2) {
        throw new BadRequestException(`친구가 아님`);
      }

      await this.prisma.friends.deleteMany({
        where: {
          OR: [{ id: friendship1.id }, { id: friendship2.id }],
        },
      });
      const payload: NotificationPayload = {
        type: 'DELETED_FRIEND',
        channelId: null,
        userId: id,
        message: `친구 삭제 당함`,
      };
      this.notificationGateway.sendNotificationToUser(friend.id, payload);
      return {
        status: HttpStatus.NO_CONTENT,
        message: '친구 삭제 성공',
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
