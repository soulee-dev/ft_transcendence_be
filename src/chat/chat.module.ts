import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import {ChannelsGateway} from "../channels/channels.gateway";

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, ChannelsGateway],
})
export class ChatModule {}
