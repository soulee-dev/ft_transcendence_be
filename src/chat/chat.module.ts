import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFaGuard } from '../auth/two-fa.guard';
import { NotificationGateway } from '../notification/notification.gateway';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, TwoFaGuard, NotificationGateway],
})
export class ChatModule {}
