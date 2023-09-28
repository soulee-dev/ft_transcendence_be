import {BadRequestException, Injectable} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import { NotFoundException } from '@nestjs/common';


@Injectable()
export class FriendsService {
    constructor(private readonly prisma: PrismaService) {}

    async getFriends(id: number) {
        return this.prisma.friends.findMany({
            where: {friend_id: id},
        });
    }

    async getFriendRequests(id: number) {
        return this.prisma.friendRequests.findMany({
            where: {receiver_id: id},
        });
    }

    async declineFriendRequest(id: number) {
        return this.prisma.friendRequests.update({
            where: {id: id},
            data: {
                status: 'declined',
            },
        });
    }
    async acceptFriendRequest(id: number) {
        const friendRequest = await this.prisma.friendRequests.findUnique({
            where: { id: id },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        if (!friendRequest) {
            throw new Error('Friend request not found.');
        }

        const { sender_id, receiver_id } = friendRequest;

        this.prisma.friendRequests.update({
            where: {id: id},
            data: {
                status: 'accepted',
            },
        });
        return this.prisma.friends.createMany({
            data: [
                {
                    user_id: sender_id,
                    friend_id: receiver_id
                },
                {
                    user_id: receiver_id,
                    friend_id: sender_id
                }
            ]
        });
    }

    async addFriend(senderId: number, friendName: string) {
        // Find the friend by name
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

        // Create the friend request
        return this.prisma.friendRequests.create({
            data: {
                sender_id: senderId,
                receiver_id: receiverId,
                status: 'pending',
            },
        });
    }


    async deleteFriend(id: number, friendName: string) {
        // Find the friend by name
        const { id: friendId } = await this.prisma.users.findUnique({
            select: { id: true },
            where: { name: friendName },
        }) || {};

        if (!friendId) {
            throw new NotFoundException(`No user found with the name: ${friendName}`);
        }

        // Find the unique friendship record
        const friendship1 = await this.prisma.friends.findUnique({
            where: {
                user_id_friend_id: {
                    user_id: friendId,
                    friend_id: id,
                },
            },
        });

        if (!friendship1) {
            throw new Error(`No friendship found between user ${id} and ${friendName}`);
        }

        const friendship2 = await this.prisma.friends.findUnique({
            where: {
                user_id_friend_id: {
                    user_id: id,
                    friend_id: friendId,
                },
            },
        });

        if (!friendship2) {
            throw new Error(`No friendship found between user ${id} and ${friendName}`);
        }

        // Delete the unique friendship record
        return this.prisma.friends.deleteMany({
            where: {
                OR: [
                    { id: friendship1.id },
                    { id: friendship2.id }
                ]
            }
        });
    }

}
