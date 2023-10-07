import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class ChannelsService {
    constructor(private readonly prisma: PrismaService) {
    }

    async getChannels(user_id: number){
        try {
            const channels = await prisma.channelUsers.findMany({
                select: {channel_id: true},
                where: {user_id: user_id},
            });

            const channelIds = channels.map(channel => channel.channel_id);

            const channels = await prisma.channels.findMany({
                where: {
                    id: {
                        in: channelIds
                    }
                }
            });
            return channels;
        } catch (error) {
            console.error("Error getting channels:", error);
            throw error;
        }
    }

    async getChannelUsers(channel_id: number){
        try {
            const channelUsers = await this.prisma.channelUsers.findMany({
                where: {channel_id: channel_id},
            });
            return channelUsers;
        } catch (error) {
            console.error("Error getting channelUsers", error);
            throw error;
        }
    }
}
