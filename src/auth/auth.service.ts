import { Injectable, UnauthorizedException } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {JwtService} from "@nestjs/jwt";

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private prisma: PrismaService) {}

    async login(user: any): Promise<string> {
        let dbUser = await this.prisma.users.findUnique({
            where: {id: user.id},
        });
        if (!dbUser) {
            dbUser = await this.prisma.users.create({
                data: {
                    id: user.id,
                },
            });
        }
        const payload = { user: dbUser.id };
        return this.jwtService.sign(payload);
    }
}
