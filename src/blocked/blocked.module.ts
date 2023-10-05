import { Module } from '@nestjs/common';
import { BlockedService } from './blocked.service';
import { BlockedController } from './blocked.controller';
import {PrismaService} from "../prisma/prisma.service";

@Module({
  providers: [BlockedService, PrismaService],
  controllers: [BlockedController]
})
export class BlockedModule {}
