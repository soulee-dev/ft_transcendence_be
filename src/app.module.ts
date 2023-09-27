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
import {JwtService} from "@nestjs/jwt";
import { FriendsModule } from './friends/friends.module';
import {FriendsService} from "./friends/friends.service";
import {FriendsController} from "./friends/friends.controller";

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, FriendsModule],
  controllers: [AppController, UsersController, AuthController, FriendsController],
  providers: [AppService, UsersService, PrismaService, AuthService, JwtService, FriendsService],
})
export class AppModule {}
