import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.users.findMany();
  }

  async getUser(id: number) {
    return this.prisma.users.findUnique({ where: { id } });
  }

  async createUser(userData: CreateUserDto) {
    return this.prisma.users.create({
      data: userData,
    });
  }

  async updateUser(id: number, userData: UpdateUserDto) {
    return this.prisma.users.update({ where: { id }, data: userData });
  }

  async deleteUser(id: number) {
    return this.prisma.users.delete({ where: { id } });
  }
}
