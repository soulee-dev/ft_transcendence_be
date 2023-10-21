import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsGateway } from './channels.gateway';
import {NotificationGateway} from "../notification/notification.gateway";

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, PrismaService, ChannelsGateway, NotificationGateway],
})
export class ChannelsModule {}
