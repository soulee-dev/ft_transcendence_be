import {HttpException, Injectable} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as speakeasy from 'speakeasy';
import * as nodemailer from 'nodemailer';
import {createClient} from "redis";


@Injectable()
export class AuthService {
  private redisClient;
  private mailTransporter: nodemailer.Transporter;
  constructor(
    private readonly jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    this.redisClient = createClient({
      url: "redis://redis:6379"
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
        pass: process.env.EMAIL_PASS
      }
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
      encoding: 'base32'
    });

    this.redisClient.set(`2fa:${userId}`, otp, 'EX', 300); // Expires in 5 minutes

    return otp;
  }

  async sendOtpEmail(email: string, otp: string) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your 2FA Code',
      text: `Your OTP is: ${otp}`
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

  storeOAuthUserTemporarily(userId: string, user: any): void {
    this.redisClient.set(`temp-user:${userId}`, JSON.stringify(user), 'EX', 600); // Expires in 10 minutes
  }

  async retrieveOAuthUserTemporarily(userId: string): Promise<any> {
    try {
      const storedTempUser = await this.redisClient.get(`temp-user:${userId}`);
      return JSON.parse(storedTempUser);
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  async login(user: any, id: number): Promise<string> {
    let dbUser = await this.prisma.users.findUnique({
      where: { id: id },
    });
    // TODO: Add additional infos about user
    if (!dbUser) {
      dbUser = await this.prisma.users.create({
        data: {
          id: user.id,
          name: user.name,
          profile_image: user.profile_image,
          email: user.email,
          is_2fa: false,
          status: "online",
        },
      });
    }
    const payload = { sub: dbUser.id };
    // TODO: It should be initialized in .env
    // TODO: It should be removed in further version
    return this.jwtService.sign(payload, {secret: 'YOUR_SECRET_KEY'});
  }
}
