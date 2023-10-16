import {BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(id: number) {
    try {
      return await this.prisma.friends.findMany({
        where: { friend_id: id },
      });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to get friends for user ${id}`);
    }
  }

  async getFriendRequests(id: number) {
    try {
      return await this.prisma.friendRequests.findMany({
        where: { receiver_id: id },
      });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to get friend requests for user ${id}`);
    }
  }

  async declineFriendRequest(requestId: number, id: number) {
    try {
      const friendRequest = await this.prisma.friendRequests.findUnique({
        where: { id: requestId },
        select: {
          receiver_id: true,
        },
      });
      if (!friendRequest) {
        throw new NotFoundException('Friend request not found.');
      }
      const { receiver_id } = friendRequest;
      if (receiver_id !== id) {
        throw new HttpException('Receiver ID does not match the request.', HttpStatus.BAD_REQUEST);
      }
      this.prisma.friendRequests.delete({
        where: { id: requestId },
      });
      return {
        status: HttpStatus.NO_CONTENT,
        message: 'Friend request declined successfully.',
      };
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to decline friend request ${id}`);
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
        throw new NotFoundException('Friend request not found.');
      }

      const { sender_id, receiver_id } = friendRequest;
      if (receiver_id !== id) {
        throw new HttpException('Receiver ID does not match the request.', HttpStatus.BAD_REQUEST);
      }

      this.prisma.friendRequests.delete({
        where: { id: requestId },
      });

      this.prisma.friends.createMany({
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
      return {
        status: HttpStatus.OK,
        message: 'Friend request accepted successfully.',
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`Failed to accept friend request ${id}`);
    }
  }

  async addFriend(senderId: number, friendName: string) {
    try {
      const { id: receiverId } = await this.prisma.users.findUnique({
        select: { id: true },
        where: { name: friendName },
      }) || {};

      if (!receiverId) {
        throw new NotFoundException(`No user found with the name: ${friendName}`);
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
        throw new BadRequestException('Friend request already exists.');
      }

      return await this.prisma.friendRequests.create({
        data: {
          sender_id: senderId,
          receiver_id: receiverId,
          status: 'pending',
        },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`Failed to add friend ${friendName}`);
    }
  }

  async deleteFriend(id: number, friendName: string) {
    try {
      const { id: friendId } = await this.prisma.users.findUnique({
        select: { id: true },
        where: { name: friendName },
      }) || {};

      if (!friendId) {
        throw new NotFoundException(`No user found with the name: ${friendName}`);
      }

      const friendship1 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: friendId,
            friend_id: id,
          },
        },
      });

      const friendship2 = await this.prisma.friends.findUnique({
        where: {
          user_id_friend_id: {
            user_id: id,
            friend_id: friendId,
          },
        },
      });

      if (!friendship1 || !friendship2) {
        throw new NotFoundException(`No friendship found between user ${id} and ${friendName}`);
      }

      this.prisma.friends.deleteMany({
        where: {
          OR: [{ id: friendship1.id }, { id: friendship2.id }],
        },
      });
      return HttpStatus.NO_CONTENT;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`Failed to delete friend ${friendName}`);
    }
  }
}
