import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as speakeasy from 'speakeasy';
import * as nodemailer from 'nodemailer';
import { createClient } from 'redis';
import * as process from 'process';

@Injectable()
export class AuthService {
  private redisClient;
  private mailTransporter: nodemailer.Transporter;
  constructor(
    private readonly jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    this.redisClient = createClient({
      url: 'redis://redis:6379',
    });

    this.initializeRedis();

    this.redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.redisClient.on('end', () => {
      console.log('Redis connection closed');
    });

    this.mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  private async initializeRedis() {
    try {
      await this.redisClient.connect();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }
  generateOTP(userId: string): string {
    const secret = speakeasy.generateSecret({ length: 20 });
    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
    });

    this.redisClient.set(`2fa:${userId}`, otp);
    this.redisClient.expire(`2fa:${userId}`, 300);
    return otp;
  }

  async sendOtpEmail(email: string, otp: string) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your 2FA Code',
      text: `Your OTP is: ${otp}\nYour code will be expired in 5 minutes.`,
    };
    await this.mailTransporter.sendMail(mailOptions);
  }

  async validateOTP(userId: string, otp: string): Promise<boolean> {
    try {
      const storedOtp = await this.redisClient.get(`2fa:${userId}`);

      if (!storedOtp || storedOtp !== otp) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to validate OTP:', error);
      return false;
    }
  }

  async login(user: any, id: number): Promise<string> {
    let dbUser = await this.prisma.users.findUnique({
      where: { id: id },
    });
    // TODO: Add additional infos about user
    if (!dbUser) {
      while (true) {
        const existingName = await this.prisma.users.findUnique({
          where: { name: user.name },
        });
        if (!existingName) {
          break;
        } else {
          user.name = user.name + '2';
        }
      }
      dbUser = await this.prisma.users.create({
        data: {
          id: user.id,
          name: user.name,
          profile_image: user.profile_image,
          email: user.email,
          is_2fa: false,
          status: 'online',
        },
      });
    }
    const payload = { sub: dbUser.id };
    // TODO: It should be initialized in .env
    // TODO: It should be removed in further version
    if (dbUser.is_2fa) {
      payload['2fa'] = false;
    }
    return this.jwtService.sign(payload, {
      secret: process.env.YOUR_SECRET_KEY,
    });
  }

  async complete2fa(userId: number): Promise<string> {
    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    const payload = { sub: dbUser.id, '2fa': true };
    return this.jwtService.sign(payload, {
      secret: process.env.YOUR_SECRET_KEY,
    });
  }
}
