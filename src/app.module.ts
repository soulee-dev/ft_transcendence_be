import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { FriendsModule } from './friends/friends.module';
import { FriendsService } from './friends/friends.service';
import { FriendsController } from './friends/friends.controller';
import { ChatModule } from './chat/chat.module';
import { BlockedModule } from './blocked/blocked.module';
import { ChannelsModule } from './channels/channels.module';
import { CronJobsService } from './cron-jobs/cron-jobs.service';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { NotificationGateway } from './notification/notification.gateway';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FriendsModule,
    ChatModule,
    BlockedModule,
    ChannelsModule,
    CronJobsModule,
    GamesModule,
  ],
  controllers: [
    AppController,
    UsersController,
    AuthController,
    FriendsController,
  ],
  providers: [
    AppService,
    UsersService,
    PrismaService,
    AuthService,
    JwtService,
    FriendsService,
    CronJobsService,
    NotificationGateway,
  ],
})
export class AppModule {}
