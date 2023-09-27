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

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [AppController, UsersController, AuthController],
  providers: [AppService, UsersService, PrismaService, AuthService, JwtService],
})
export class AppModule {}
