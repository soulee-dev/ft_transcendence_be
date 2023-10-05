import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class BlockedService {
    constructor(private readonly prisma: PrismaService) {}

    async getBlockedUser(id: number) {
        return this.prisma.blockedUsers.findMany({
            where: {blocked_by: id},
        });
    }

    async blockUser(id: number, name: string) {
        const { id: blockedUserId } = await this.prisma.users.findUnique({
            select: { id: true },
            where: { name: name },
        }) || {};

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

        return this.prisma.blockedUsers.create({
            data: {
                user_id: blockedUserId,
                blocked_by: id,
            }
        })
    }

    async unblockUser(id: number){
        return this.prisma.blockedUsers.delete({
            where: {id: id},
        });
    }
}
