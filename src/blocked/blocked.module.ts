import { Module } from '@nestjs/common';
import { BlockedService } from './blocked.service';
import { BlockedController } from './blocked.controller';
import { PrismaService } from '../prisma/prisma.service';
import {NotificationGateway} from "../notification/notification.gateway";
import {TwoFaGuard} from "../auth/two-fa.guard";

@Module({
  providers: [BlockedService, PrismaService, NotificationGateway, TwoFaGuard],
  controllers: [BlockedController],
})
export class BlockedModule {}
