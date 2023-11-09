import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamesGateway } from './games.gateway';
import { NotificationGateway } from '../notification/notification.gateway';
import { UsersService } from '../users/users.service';

@Module({
  controllers: [GamesController],
  providers: [
    GamesService,
    PrismaService,
    GamesGateway,
    NotificationGateway,
    UsersService,
  ],
})
export class GamesModule {}
