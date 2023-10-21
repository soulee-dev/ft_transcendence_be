import {
  BadRequestException, HttpException, HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {th} from "date-fns/locale";
import {NotificationGateway} from "../notification/notification.gateway";
import {NotificationPayload} from "../notification/notification-payload.interface";

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
      throw new BadRequestException('Failed to get blocked users');
    }
  }

  async blockUser(id: number, name: string) {
    try {
      const { id: blockedUserId } =
      (await this.prisma.users.findUnique({
        select: { id: true },
        where: { name: name },
      })) || {};

      if (!blockedUserId) {
        throw new NotFoundException(`No user found with the name: ${name}`);
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
        throw new BadRequestException('Blocked user already exists.');
      }

      const ret = await this.prisma.blockedUsers.create({
        data: {
          user_id: blockedUserId,
          blocked_by: id,
        },
      });
      const payload: NotificationPayload = {
        type: "BLOCKED_BY_USER",
        channelId: NaN,
        userId: id,
        message: `You have blocked: ${id}`,
      }
      this.notificationGateway.sendNotificationToUser(blockedUserId, payload);
      return ret;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to block user');
    }
  }

  async unblockUser(blockedId: number, id: number) {
    try {
      const blockedContent = await this.prisma.blockedUsers.findUnique({
        select: {blocked_by: true, user_id: true},
        where: {id: blockedId},
      });
      if (blockedContent.blocked_by !== id) {
        throw new HttpException('Blocked by ID does not match the request.', HttpStatus.BAD_REQUEST);
      }
      const ret = await this.prisma.blockedUsers.delete({
        where: { id: blockedId },
      });
      const payload: NotificationPayload = {
        type: "UNBLOCKED_BY_USER",
        channelId: NaN,
        userId: id,
        message: `You have unblocked: ${id}`,
      }
      this.notificationGateway.sendNotificationToUser(blockedContent.user_id, payload);
      return ret;
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to unblock user with id ${id}`);
    }
  }
}
