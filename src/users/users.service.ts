import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
      throw new BadRequestException('유저 불러오기 실패');
    }
  }

  async getUser(id: number) {
    try {
      const user = await this.prisma.users.findUnique({ where: { id: id } });
      if (!user) throw new BadRequestException(`해당 유저 없음`);
      return user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getUserByName(name: string) {
    try {
      name = name.trim().replace(/\s+/g, '');
      const user = await this.prisma.users.findUnique({
        where: { name: name },
      });
      if (!user) throw new BadRequestException(`해당 유저 없음`);
      return user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateUser(id: number, userData: UpdateUserDto) {
    try {
      if (userData.name) {
        let editedName = userData.name;
        userData.name = encodeURIComponent(editedName.trim().replace(/\s+/g, ''));
        if (userData.name.length === 0)
          throw new BadRequestException("적절한 이름을 입력하세요");
      }
      return await this.prisma.users.update({
        where: { id: id },
        data: userData,
      });
    } catch (error) {
      console.error(error);
      if (error)
        throw error;
      throw new BadRequestException(`유저 정보 수정 실패`);
    }
  }

  async deleteUser(id: number) {
    try {
      return await this.prisma.users.delete({ where: { id: id } });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(`유저 삭제 실패`);
    }
  }
}
