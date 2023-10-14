import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(user: any): Promise<string> {
    let dbUser = await this.prisma.users.findUnique({
      where: { id: user.id },
    });
    // TODO: Add additional infos about user
    if (!dbUser) {
      dbUser = await this.prisma.users.create({
        data: {
          id: user.id,
        },
      });
    }
    const payload = { sub: dbUser.id };
    // TODO: It should be initialized in .env
    // TODO: It should be removed in further version
    return this.jwtService.sign(payload, {secret: 'YOUR_SECRET_KEY'});
  }
}
