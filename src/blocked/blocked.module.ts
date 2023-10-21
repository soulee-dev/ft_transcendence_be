import { Module } from '@nestjs/common';
import { BlockedService } from './blocked.service';
import { BlockedController } from './blocked.controller';
import { PrismaService } from '../prisma/prisma.service';
import {NotificationGateway} from "../notification/notification.gateway";

@Module({
  providers: [BlockedService, PrismaService, NotificationGateway],
  controllers: [BlockedController],
})
export class BlockedModule {}
