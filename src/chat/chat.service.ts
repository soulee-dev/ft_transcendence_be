import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {SendMessageDto} from "./dto/send-message.dto";

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService) {}

    async getChat(id: number) {
        return this.prisma.chat.findMany({
            where: {channel_id: id},
        });
    }

    async sendMessage(id: number, messageData: SendMessageDto) {
        return this.prisma.chat.create({
            data: {
                channel_id: id,
                ...messageData,
            },
        })
    }
}
