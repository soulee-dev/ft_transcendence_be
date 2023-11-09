import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { th } from 'date-fns/locale';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';

@Injectable()
export class BlockedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getBlockedUser(id: number) {
    try {
      return await this.prisma.blockedUsers.findMany({
        where: { blocked_by: id },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException('차단한 유저 불러오기 실패');
    }
  }

  async blockUser(id: number, name: string) {
    try {
      name = name.trim().replace(/\s+/g, '');
      const { id: blockedUserId } =
        (await this.prisma.users.findUnique({
          select: { id: true },
          where: { name: name },
        })) || {};

      if (!blockedUserId) {
        throw new BadRequestException(`${name} 유저 없음`);
      }
      if (id === blockedUserId) {
        throw new BadRequestException('자기 자신을 차단할 수 없습니다.');
      }

      const existingBlocked = await this.prisma.blockedUsers.findUnique({
        where: {
          user_id_blocked_by: {
            user_id: blockedUserId,
            blocked_by: id,
          },
        },
      });

      if (existingBlocked) {
        throw new BadRequestException('이미 차단한 유저');
      }

      const ret = await this.prisma.blockedUsers.create({
        data: {
          user_id: blockedUserId,
          blocked_by: id,
        },
      });
      const payload: NotificationPayload = {
        type: 'BLOCKED_BY_USER',
        channelId: null,
        userId: id,
        message: `차단 당했습니다`,
      };
      this.notificationGateway.sendNotificationToUser(blockedUserId, payload);
      return ret;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async unblockUser(blockedId: number, id: number) {
    try {
      const blockedContent = await this.prisma.blockedUsers.findUnique({
        select: { blocked_by: true, user_id: true },
        where: { id: blockedId },
      });
      if (blockedContent.blocked_by !== id) {
        throw new HttpException('차단한 유저가 아님', HttpStatus.BAD_REQUEST);
      }
      const ret = await this.prisma.blockedUsers.delete({
        where: { id: blockedId },
      });
      const payload: NotificationPayload = {
        type: 'UNBLOCKED_BY_USER',
        channelId: null,
        userId: id,
        message: `차단해제 됐습니다.`,
      };
      this.notificationGateway.sendNotificationToUser(
        blockedContent.user_id,
        payload,
      );
      return ret;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
