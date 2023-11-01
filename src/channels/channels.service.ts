import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelOptions } from './enum/channel-options.enum';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UserActionDto } from './dto/user-action.dto';
import { UserAction } from './enum/user-action.enum';
import { addMinutes } from 'date-fns';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationPayload } from '../notification/notification-payload.interface';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getChannelsIn(user_id: number) {
    try {
      const channelsId = await this.prisma.channelUsers.findMany({
        select: { channel_id: true },
        where: { user_id: user_id },
      });

      const channelIds = channelsId.map((channel) => channel.channel_id);

      const channels = await this.prisma.channels.findMany({
        where: {
          id: {
            in: channelIds,
          },
        },
      });
      const updatedChannels = channels.map((channel) => {
        if (channel.password) {
          return { ...channel, password: true };
        } else {
          return { ...channel, password: false };
        }
      });
      return updatedChannels;
    } catch (error) {
      console.error('Error getting channels:', error);
      throw new HttpException(
        '참여한 채팅방을 찾을 수 없음',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getChannelByName(name: string) {
    try {
      const channel = await this.prisma.channels.findUnique({
        where: {
          name: name,
        },
      });
      if (!channel) {
        throw new HttpException(
          '해당 이름의 채팅방 없음',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (channel.password) {
        return { ...channel, password: true };
      } else {
        return { ...channel, password: false };
      }
    } catch (error) {
      console.error('Error getting channels:', error);
      throw error;
    }
  }
  async getPublicChannels(id: number) {
    try {
      const channelsId = await this.prisma.channelOptions.findMany({
        select: { channel_id: true },
        where: { option: ChannelOptions.Public },
      });

      const joinedChannels = await this.getChannelsIn(id);
      const joinedChannelIds = joinedChannels.map((channel) => channel.id);
      const unjoinedChannelIds = channelsId.filter(
        (channel) => !joinedChannelIds.includes(channel.channel_id),
      );

      const channelIds = unjoinedChannelIds.map(
        (channel) => channel.channel_id,
      );

      const channels = await this.prisma.channels.findMany({
        where: {
          id: {
            in: channelIds,
          },
        },
      });
      const updatedChannels = channels.map((channel) => {
        if (channel.password) {
          return { ...channel, password: true };
        } else {
          return { ...channel, password: false };
        }
      });
      return updatedChannels;
    } catch (error) {
      console.error('Error getting channels:', error);
      throw new HttpException(
        '공개 채팅방 불러오기 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getChannelUsers(channel_id: number) {
    try {
      const channelUsers = await this.prisma.channelUsers.findMany({
        where: { channel_id: channel_id },
      });
      return channelUsers;
    } catch (error) {
      console.error('Error getting channelUsers', error);
      throw new HttpException(
        '채팅방 멤버 불러오기 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createDMChannel(id: number, creatorId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        select: { name: true },
        where: {
          id: id,
        },
      });
      if (!user)
        throw new HttpException('해당 유저 없음', HttpStatus.BAD_REQUEST);

      const creator = await this.prisma.users.findUnique({
        select: { name: true },
        where: {
          id: creatorId,
        },
      });
      if (!creator)
        throw new HttpException('채팅방 생성자 없음', HttpStatus.BAD_REQUEST);

      const blocked = await this.prisma.blockedUsers.findUnique({
        where: {
          user_id_blocked_by: {
            user_id: creatorId,
            blocked_by: id,
          },
        },
      });
      if (blocked) throw new HttpException('차단 당했음', HttpStatus.FORBIDDEN);
      const existingDM = await this.prisma.channels.findFirst({
        where: {
          OR: [
            { name: 'DM: ' + creator.name + ', ' + user.name },
            { name: 'DM: ' + user.name + ', ' + creator.name },
          ],
        },
      });

      if (existingDM)
        throw new HttpException('이미 존재하는 DM', HttpStatus.BAD_REQUEST);

      const channel = await this.prisma.channels.create({
        data: {
          name: 'DM: ' + creator.name + ', ' + user.name,
          password: null,
        },
      });

      const resultOfOption = await this.prisma.channelOptions.create({
        data: {
          channel_id: channel.id,
          option: ChannelOptions.Dm,
        },
      });
      const resultOfUsers = await this.prisma.channelUsers.createMany({
        data: [
          {
            channel_id: channel.id,
            user_id: id,
            admin: false,
          },
          {
            channel_id: channel.id,
            user_id: creatorId,
            admin: false,
          },
        ],
      });
      const payload: NotificationPayload = {
        type: 'ADDED_TO_CHANNEL',
        channelId: channel.id,
        userId: null,
        message: `DM 채팅방에 초대되었습니다`,
      };
      this.notificationGateway.sendNotificationToUser(id, payload);
      return { channel, resultOfOption, resultOfUsers };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error creating DM channel:', error);
      throw error;
    }
  }

  async createChannel(channelData: CreateChannelDto, id: number) {
    const { name, password, option, users } = channelData;

    try {
      let editedName = name;
      editedName = editedName.trim().replace(/\s+/g, ' ');
      if (!editedName ?? editedName === '')
        throw new HttpException(
          '올바르지 않은 채팅방 이름',
          HttpStatus.BAD_REQUEST,
        );
      if (editedName.startsWith('DM:'))
        throw new HttpException(
          '다음의 형식을 포함할 수 없음: DM:',
          HttpStatus.BAD_REQUEST,
        );
      // Check if all user names are valid
      const invitedUsers = await this.prisma.users.findMany({
        where: {
          name: {
            in: users,
          },
        },
      });

      if (invitedUsers.length !== users.length) {
        throw new HttpException(
          '초대할 유저중 존재 하지 않는 유저가 있음',
          HttpStatus.BAD_REQUEST,
        );
      }
      const existingChannel = await this.prisma.channels.findUnique({
        where: {
          name: editedName,
        },
      });
      if (existingChannel)
        throw new HttpException('이미 존재하는 이름', HttpStatus.CONFLICT);
      // Transaction 1: Create the channel
      const channel = await this.prisma.channels.create({
        data: {
          name: editedName,
          password: password,
        },
      });

      // Transaction 2: Create the channel options and channel users
      const resultOfOption = await this.prisma.channelOptions.create({
        data: {
          channel_id: channel.id,
          option: option,
        },
      });

      const admin = await this.prisma.channelUsers.create({
        data: {
          channel_id: channel.id,
          user_id: id,
          admin: true,
        },
      });

      const blocked = await this.prisma.blockedUsers.findMany({
        where: {
          user_id: id,
        },
      });
      const blockedByUserIds = blocked.map((b) => b.blocked_by);
      const filteredUsers = invitedUsers.filter(
        (user) => !blockedByUserIds.includes(user.id),
      );

      let nonAdminUser;
      if (filteredUsers.length) {
        nonAdminUser = await this.prisma.channelUsers.createMany({
          data: [
            ...filteredUsers.map((user) => ({
              channel_id: channel.id,
              user_id: user.id,
              admin: false,
            })),
          ],
        });
      }
      const payload: NotificationPayload = {
        type: 'ADDED_TO_CHANNEL',
        channelId: channel.id,
        userId: null,
        message: `채팅방에 초대되었습니다`,
      };
      filteredUsers.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.id, payload);
      });
      if (option === ChannelOptions.Public) {
        const publicPayload: NotificationPayload = {
          type: 'PUBLIC_CHANNEL_CREATED',
          channelId: channel.id,
          userId: null,
          message: `공개 채팅방이 생성되었습니다`,
        };
        this.notificationGateway.sendNotificationToAllActiveUsers(
          publicPayload,
        );
      }
      return {
        channel,
        resultOfOption,
        admin,
        ...(nonAdminUser ? { nonAdminUser } : {}),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Log error details for debugging
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async handleUserDeparture(channelId: number, id: number) {
    try {
      // Remove the user from the channel
      const channelOption = await this.prisma.channelOptions.findUnique({
        where: {
          channel_id: channelId,
        },
      });
      if (channelOption.option === ChannelOptions.Dm)
        throw new HttpException('DM 나갈 수 없음', HttpStatus.BAD_REQUEST);
      // you cannot leave DM
      await this.prisma.channelUsers.delete({
        where: {
          // Use appropriate condition to identify the user-channel relationship
          user_id_channel_id: {
            user_id: id,
            channel_id: channelId,
          },
        },
      });

      // Check if there are any users left in the channel
      const remainingUsers = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });

      // If no users left, delete the channel and related entities
      if (remainingUsers.length === 0) {
        const deletedUser = await this.prisma.channelUsers.deleteMany({
          where: { channel_id: channelId },
        });
        const deletedOptions = await this.prisma.channelOptions.deleteMany({
          where: { channel_id: channelId },
        });
        const deletedChat = await this.prisma.chat.deleteMany({
          where: { channel_id: channelId },
        });
        const deletedChannel = await this.prisma.channels.delete({
          where: { id: channelId },
        });
        return {
          deletedUser,
          deletedOptions,
          deletedChat,
          deletedChannel,
        };
      }

      const userName = await this.prisma.users.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
        },
      });

      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });

      const filteredUsers = users.filter((user) => user.user_id !== id);

      const payload: NotificationPayload = {
        type: 'USER_QUIT_CHANNEL',
        channelId: channelId,
        userId: id,
        message: `${userName.name} 유저가 나감`,
      };
      filteredUsers.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.user_id, payload);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Handle errors (e.g., log them and/or throw an exception)
      console.error(error);
      throw error;
    }
  }

  async updateChannel(
    channelId: number,
    id: number,
    updateData: UpdateChannelDto,
  ) {
    if (updateData.name) {
      let editedName = updateData.name;
      updateData.name = editedName.trim().replace(/\s+/g, ' ');
      if (updateData.name.startsWith('DM:'))
        throw new HttpException(
          '다음의 형식을 포함할 수 없음: DM:',
          HttpStatus.BAD_REQUEST,
        );
    }

    const user = await this.prisma.channelUsers.findUnique({
      where: {
        user_id_channel_id: {
          user_id: id,
          channel_id: channelId,
        },
      },
    });
    if (user.admin === false)
      throw new HttpException('관리자가 아님', HttpStatus.FORBIDDEN); //error: you are not admin

    const channelOption = await this.prisma.channelOptions.findUnique({
      where: {
        channel_id: channelId,
      },
    });
    if (
      channelOption.option === ChannelOptions.Dm ||
      updateData.option === ChannelOptions.Dm
    )
      throw new HttpException('DM 옵션 변경 불가', HttpStatus.BAD_REQUEST); // cannot change DM option
    try {
      const updatedChannel = await this.prisma.channels.update({
        where: { id: channelId },
        data: updateData,
      });
      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });
      const payload: NotificationPayload = {
        type: 'CHANNEL_UPDATED',
        channelId: channelId,
        userId: null,
        message: `채팅방 정보가 변경됨`,
      };
      users.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.user_id, payload);
      });
      return updatedChannel;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      console.error(error);
      throw error;
    }
  }

  async manageChannel(
    channelId: number,
    adminId: number,
    managementData: UserActionDto,
  ) {
    try {
      const channelOption = await this.prisma.channelOptions.findUnique({
        where: {
          channel_id: channelId,
        },
      });
      if (channelOption.option === ChannelOptions.Dm)
        throw new HttpException('DM 수정 불가', HttpStatus.BAD_REQUEST);

      const admin = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: adminId,
            channel_id: channelId,
          },
        },
      });
      if (!admin || admin.admin === false)
        throw new HttpException('관리자가 아님', HttpStatus.FORBIDDEN);

      const { id, action } = managementData;
      const user = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: id,
            channel_id: channelId,
          },
        },
      });
      if (!user)
        throw new HttpException('해당 유저 없음', HttpStatus.BAD_REQUEST);
      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });

      const userName = await this.prisma.users.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
        },
      });
      if (action === UserAction.GiveAdmin) {
        const userState = await this.prisma.channelUsers.update({
          where: {
            user_id_channel_id: {
              user_id: id,
              channel_id: channelId,
            },
          },
          data: {
            admin: true,
          },
        });
        const payload: NotificationPayload = {
          type: 'GIVEN_ADMIN',
          channelId: channelId,
          userId: id,
          message: `${userName.name} 유저에게 관리자 권한 부여됨`,
        };
        users.forEach((user) => {
          this.notificationGateway.sendNotificationToUser(
            user.user_id,
            payload,
          );
        });
        return userState;
      }
      if (action === UserAction.Kick) {
        const userState = await this.handleUserDeparture(channelId, id);
        const payload: NotificationPayload = {
          type: 'KICKED',
          channelId: channelId,
          userId: id,
          message: `${userName.name} 유저가 강퇴됨`,
        };
        users.forEach((user) => {
          this.notificationGateway.sendNotificationToUser(
            user.user_id,
            payload,
          );
        });
        return userState;
      }
      if (action === UserAction.Ban) {
        await this.handleUserDeparture(channelId, id);
        const userState = await this.prisma.channelBans.create({
          data: {
            channel_id: channelId,
            user_id: id,
          },
        });
        const payload: NotificationPayload = {
          type: 'BANNED',
          channelId: channelId,
          userId: id,
          message: `${userName.name} 유저가 차단됨`,
        };
        users.forEach((user) => {
          this.notificationGateway.sendNotificationToUser(
            user.user_id,
            payload,
          );
        });
        return userState;
      }
      if (action === UserAction.Mute) {
        const until = addMinutes(new Date(), 3);

        // Store the mute in the database with the expiration time
        const userState = await this.prisma.channelMutes.create({
          data: {
            channel_id: channelId,
            user_id: id,
            until: until,
          },
        });
        const payload: NotificationPayload = {
          type: 'MUTED',
          channelId: channelId,
          userId: id,
          message: `${userName.name} 유저가 뮤트됨`,
        };
        users.forEach((user) => {
          this.notificationGateway.sendNotificationToUser(
            user.user_id,
            payload,
          );
        });
        return userState;
      }
      if (action === UserAction.UnBan) {
        const userState = await this.prisma.channelBans.delete({
          where: {
            channel_id_user_id: {
              channel_id: channelId,
              user_id: id,
            },
          },
        });
        const payload: NotificationPayload = {
          type: 'UNBANNED',
          channelId: channelId,
          userId: id,
          message: `${userName.name} 유저가 차단 해제됨`,
        };
        users.forEach((user) => {
          this.notificationGateway.sendNotificationToUser(
            user.user_id,
            payload,
          );
        });
        return userState;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async joinPublicChannel(channelId: number, id: number, password: string) {
    try {
      const banned = await this.prisma.channelBans.findUnique({
        where: {
          channel_id_user_id: {
            channel_id: channelId,
            user_id: id,
          },
        },
      });
      if (banned) throw new HttpException('차단 당함', HttpStatus.FORBIDDEN);

      const channel = await this.prisma.channels.findUnique({
        where: {
          id: channelId,
        },
      });
      if (channel.password !== password)
        throw new HttpException(
          '올바르지 않은 비밀번호',
          HttpStatus.UNAUTHORIZED,
        );

      const joinedUser = await this.prisma.channelUsers.create({
        data: {
          channel_id: channelId,
          user_id: id,
          admin: false,
        },
      });

      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channelId,
        },
      });
      const user = await this.prisma.users.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
        },
      });
      const payload: NotificationPayload = {
        type: 'USER_JOIN_CHANNEL',
        channelId: channelId,
        userId: id,
        message: `${user.name} 유저가 참여함`,
      };
      users.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.user_id, payload);
      });
      return joinedUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async joinPrivateChannel(id: number, password: string, name: string) {
    try {
      const channel = await this.prisma.channels.findUnique({
        where: {
          name: name,
        },
      });
      if (!channel) {
        throw new HttpException(
          '해당 이름의 채널 없음',
          HttpStatus.BAD_REQUEST,
        );
      }

      const banned = await this.prisma.channelBans.findUnique({
        where: {
          channel_id_user_id: {
            channel_id: channel.id,
            user_id: id,
          },
        },
      });
      if (banned) {
        throw new HttpException('차단 당함', HttpStatus.FORBIDDEN);
      }

      if (channel.password !== password) {
        throw new HttpException(
          '올바르지 않은 비밀번호',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const joinedUser = await this.prisma.channelUsers.create({
        data: {
          channel_id: channel.id,
          user_id: id,
          admin: false,
        },
      });
      const users = await this.prisma.channelUsers.findMany({
        where: {
          channel_id: channel.id,
        },
      });
      const user = await this.prisma.users.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
        },
      });
      const payload: NotificationPayload = {
        type: 'USER_JOIN_CHANNEL',
        channelId: channel.id,
        userId: id,
        message: `${user.name} 유저가 참여함`,
      };
      users.forEach((user) => {
        this.notificationGateway.sendNotificationToUser(user.user_id, payload);
      });
      return joinedUser;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
