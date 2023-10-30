import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { TwoFaGuard } from '../auth/two-fa.guard';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, PrismaService, NotificationGateway, TwoFaGuard],
})
export class ChannelsModule {}
