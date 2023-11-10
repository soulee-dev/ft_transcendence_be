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
      const user = await this.getUser(id);
      if (userData.name) {
        let editedName = userData.name.trim().replace(/\s+/g, '');
        // Check if the name contains only English letters and digits
        if (!/^[a-zA-Z0-9]*$/.test(editedName)) {
          throw new BadRequestException('이름은 영어와 숫자만 포함해야 합니다');
        }
        userData.name = editedName;
        if (userData.name.length === 0)
          throw new BadRequestException('적절한 이름을 입력하세요');
        const dmChannel = await this.prisma.channels.findFirst({
          where: {
            name: {
              startsWith: 'DM:',
              contains: user.name,
            },
          },
        });
        if (dmChannel) {
          let channelUsers = await this.prisma.channelUsers.findMany({
            where: { channel_id: dmChannel.id },
          });
          channelUsers = channelUsers.filter(
            (channelUser) => channelUser.user_id !== id,
          );
          const otherUserName = await this.getUser(channelUsers[0].user_id);
          await this.prisma.channels.update({
            where: { id: dmChannel.id },
            data: { name: `DM: ${userData.name}, ${otherUserName.name}` },
          });
        }
      }
      return await this.prisma.users.update({
        where: { id: id },
        data: userData,
      });
    } catch (error) {
      console.error(error);
      throw error;
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
