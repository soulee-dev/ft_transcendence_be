import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuth2Strategy } from './oauth2.strategy';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module'; // Adjust path as necessary
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.YOUR_SECRET_KEY, // Choose a strong secret key
      signOptions: { expiresIn: '1h' }, // Token expiration time
    }),
    HttpModule,
    PassportModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OAuth2Strategy, JwtStrategy, UsersService],
})
export class AuthModule {}
