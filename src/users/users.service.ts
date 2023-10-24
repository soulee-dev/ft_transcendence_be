import {BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    try {
      return await this.prisma.users.findMany();
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to get users');
    }
  }

  async getUser(id: number) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id: id } });
      if (!user) throw new NotFoundException(`User with id ${id} not found`);
      return user;
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to get user with id ${id}`);
    }
  }

  async createUser(userData: CreateUserDto) {
    try {
      return await this.prisma.users.create({
        data: userData,
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to create user');
    }
  }

  async updateUser(id: number, userData: UpdateUserDto) {
    try {
      if (userData.name) {
        let editedName = userData.name;
        userData.name = editedName.trim().replace(/\s+/g, '');
      }
      return await this.prisma.users.update({ where: { id: id }, data: userData });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to update user with id ${id}`);
    }
  }

  async deleteUser(id: number) {
    try {
      return await this.prisma.users.delete({ where: { id: id } });
    } catch (error) {
      console.error(error);
      throw new NotFoundException(`Failed to delete user with id ${id}`);
    }
  }
}
