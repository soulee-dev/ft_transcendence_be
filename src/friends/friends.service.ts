import { Injectable } from '@nestjs/common';
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

    async addFriend(id: number, friendName: string) {
        // Find the friend by name
        const { id: friendId } = await this.prisma.users.findUnique({
            select: { id: true },
            where: { name: friendName },
        }) || {};

        if (!friendId) {
            throw new NotFoundException(`No user found with the name: ${friendName}`);
        }

        // Create the friendship record
        return this.prisma.friends.create({
            data: {
                user_id: friendId,
                friend_id: id,
            }
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
        const friendship = await this.prisma.friends.findUnique({
            where: {
                user_id_friend_id: {
                    user_id: friendId,
                    friend_id: id,
                },
            },
        });

        if (!friendship) {
            throw new Error(`No friendship found between user ${id} and ${friendName}`);
        }

        // Delete the unique friendship record
        return this.prisma.friends.delete({
            where: { id: friendship.id },
        });
    }

}
