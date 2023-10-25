import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { PrismaModule } from '../prisma/prisma.module';
import {NotificationGateway} from "../notification/notification.gateway";
import {TwoFaGuard} from "../auth/two-fa.guard";

@Module({
  imports: [PrismaModule],
  providers: [FriendsService, NotificationGateway, TwoFaGuard],
  controllers: [FriendsController],
})
export class FriendsModule {}
