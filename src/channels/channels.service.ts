import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelOptions } from './enum/channel-options.enum';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UserActionDto } from './dto/user-action.dto';
import { UserAction } from './enum/user-action.enum';
import { addMinutes } from 'date-fns';
import {ChannelsGateway} from "./channels.gateway";
import {NotificationGateway} from "../notification/notification.gateway";
import {NotificationPayload} from "../notification/notification-payload.interface";
import {ChannelNotificationPayload} from "./channel-notification-payload.interface";

@Injectable()
export class ChannelsService {
  constructor(
      private readonly prisma: PrismaService,
      private readonly notificationGateway: NotificationGateway,
      private readonly channelsGateway: ChannelsGateway,
      ) {
  }

  async getPublicChannels() {
    try {
      const channelsId = await this.prisma.channelOptions.findMany({
        select: {channel_id: true},
        where: {option: ChannelOptions.Public},
      });

      const channelIds = channelsId.map((channel) => channel.channel_id);

      const channels = await this.prisma.channels.findMany({
        where: {
          id: {
            in: channelIds,
          },
        },
      });
      return channels;
    } catch (error) {
      console.error('Error getting channels:', error);
      throw new HttpException('Failed to retrieve public channels', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getChannelsIn(user_id: number) {
    try {
      const channelsId = await this.prisma.channelUsers.findMany({
        select: {channel_id: true},
        where: {user_id: user_id},
      });

      const channelIds = channelsId.map((channel) => channel.channel_id);

      const channels = await this.prisma.channels.findMany({
        where: {
          id: {
            in: channelIds,
          },
        },
      });
      return channels;
    } catch (error) {
      console.error('Error getting channels:', error);
      throw new HttpException('Failed to retrieve channels for the user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getChannelUsers(channel_id: number) {
    try {
      const channelUsers = await this.prisma.channelUsers.findMany({
        where: {channel_id: channel_id},
      });
      return channelUsers;
    } catch (error) {
      console.error('Error getting channelUsers', error);
      throw new HttpException('Failed to retrieve users for the channel', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createDMChannel(id: number, creatorId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        select: {name: true},
        where: {
          id: id,
        },
      });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const creator = await this.prisma.users.findUnique({
        select: {name: true},
        where: {
          id: creatorId,
        },
      });
      if (!creator) throw new HttpException('Creator not found', HttpStatus.NOT_FOUND);

      const existingDM = await this.prisma.channels.findFirst({
        where: {
          OR: [
            { name: 'DM: ' + creator.name + ', ' + user.name},
            { name: 'DM: ' + user.name + ', ' + creator.name}
          ]
        }
      })

      if (existingDM)
        throw new HttpException('DM is existing', HttpStatus.BAD_REQUEST);

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
        type: "ADDED_TO_CHANNEL",
        channelId: channel.id,
        userId: NaN,
        message: `You have been added to a new channel: ${channel.id}`,
      }
      this.notificationGateway.sendNotificationToUser(id, payload)
      return {channel, resultOfOption, resultOfUsers};
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error creating DM channel:', error);
      throw new HttpException('Failed to create DM channel', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  async createChannel(channelData: CreateChannelDto, id: number) {
    const {name, password, option, users} = channelData;

    try {
      let editedName = name;
      editedName = editedName.trim().replace(/\s+/g, ' ');
      if (!editedName ?? editedName === '')
        throw new HttpException('Unavailable channel name', HttpStatus.BAD_REQUEST);
      if (editedName.startsWith("DM:"))
        throw new HttpException('Unavailable channel name', HttpStatus.BAD_REQUEST);
      // Check if all user names are valid
      const invitedUsers = await this.prisma.users.findMany({
        where: {
          name: {
            in: users,
          },
        },
      });

      if (invitedUsers.length !== users.length) {
        throw new HttpException('Some users not found', HttpStatus.BAD_REQUEST);
      }
      const existingChannel = await this.prisma.channels.findUnique({
        where: {
          name: editedName,
        }
      })
      if (existingChannel)
        throw new HttpException("Name already existed", HttpStatus.CONFLICT);
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
          }
        });
        let nonAdminUser;
        if (users.length) {
          nonAdminUser = await this.prisma.channelUsers.createMany({
            data: [
              ...invitedUsers.map((user) => ({
                channel_id: channel.id,
                user_id: user.id,
                admin: false,
              })),
            ],
          });
        }
        const payload: NotificationPayload = {
          type: "ADDED_TO_CHANNEL",
          channelId: channel.id,
          userId: NaN,
          message: `You have been added to a new channel: ${channel.id}`,
        }
        invitedUsers.forEach(user => {
          this.notificationGateway.sendNotificationToUser(user.id, payload);
        })
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

      // Decide how to handle the error:
      // - Re-throw the error, or
      // - Return a failure status/object, or
      // - Throw a different error, etc.

      throw new HttpException('Failed to create channel', HttpStatus.INTERNAL_SERVER_ERROR);
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
        throw new HttpException("You cannot leave a DM", HttpStatus.BAD_REQUEST);
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
            where: {channel_id: channelId},
          });
        const deletedOptions = await this.prisma.channelOptions.deleteMany({
            where: {channel_id: channelId},
          });
        const deletedChat = await this.prisma.chat.deleteMany({
            where: {channel_id: channelId},
          });
        const deletedChannel = await this.prisma.channels.delete({
            where: {id: channelId},
          });
        return {
          deletedUser, deletedOptions, deletedChat, deletedChannel,
        }
      }
      const payload: ChannelNotificationPayload = {
        type: 'USER_QUIT',
        channelId: channelId,
        userId: id,
        message: `user ${id} quited this channel ${channelId}`
      };
      this.channelsGateway.sendNotificationToChannel(channelId, payload);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Handle errors (e.g., log them and/or throw an exception)
      console.error(error);
      throw new HttpException('Failed to handle user departure', HttpStatus.INTERNAL_SERVER_ERROR);
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
      if (updateData.name.startsWith("DM:"))
        throw new HttpException('Unavailable channel name', HttpStatus.BAD_REQUEST);
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
      throw new HttpException("You are not an admin", HttpStatus.FORBIDDEN); //error: you are not admin

    const channelOption = await this.prisma.channelOptions.findUnique({
      where: {
        channel_id: channelId,
      },
    });
    if (channelOption.option === ChannelOptions.Dm || updateData.option === ChannelOptions.Dm)
      throw new HttpException("Cannot change DM option", HttpStatus.BAD_REQUEST); // cannot change DM option
    try {
      const updatedChannel = await this.prisma.channels.update({
        where: {id: channelId},
        data: updateData,
      });
      const payload: ChannelNotificationPayload = {
        type: 'CHANNEL_UPDATED',
        channelId: channelId,
        userId: NaN,
        message: `Channel has been updated ${channelId}`,
      };
      this.channelsGateway.sendNotificationToChannel(channelId, payload);
      return updatedChannel;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Handle errors appropriately
      console.error(error);
      throw new HttpException('Failed to update channel', HttpStatus.INTERNAL_SERVER_ERROR);
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
        throw new HttpException("DM cannot be updated", HttpStatus.BAD_REQUEST);

      const admin = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: adminId,
            channel_id: channelId,
          },
        },
      });
      if (!admin || admin.admin === false)
        throw new HttpException("You are not an admin", HttpStatus.FORBIDDEN);

      const {id, action} = managementData;
      const user = await this.prisma.channelUsers.findUnique({
        where: {
          user_id_channel_id: {
            user_id: id,
            channel_id: channelId,
          },
        },
      });
      if (!user)
        throw new HttpException("User is not in channel", HttpStatus.NOT_FOUND);
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
          type: "GIVEN_ADMIN",
          channelId: channelId,
          userId: NaN,
          message: `You have given admin: ${channelId}`,
        }
        this.notificationGateway.sendNotificationToUser(id, payload);
        return userState;
      }
      if (action === UserAction.Kick) {
        const userState = await this.handleUserDeparture(channelId, id);
        const payload: NotificationPayload = {
          type: "KICKED",
          channelId: channelId,
          userId: NaN,
          message: `You have kicked: ${channelId}`,
        }
        this.notificationGateway.sendNotificationToUser(id, payload);
        return userState;
      }
      if (action === UserAction.Ban) {
        this.handleUserDeparture(channelId, id);
        const userState = await this.prisma.channelBans.create({
          data: {
            channel_id: channelId,
            user_id: id,
          },
        });
        const payload: NotificationPayload = {
          type: "BANNED",
          channelId: channelId,
          userId: NaN,
          message: `You have banned: ${channelId}`,
        }
        this.notificationGateway.sendNotificationToUser(id, payload);
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
          type: "MUTED",
          channelId: channelId,
          userId: NaN,
          message: `You have muted: ${channelId}`,
        }
        this.notificationGateway.sendNotificationToUser(id, payload);
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
          type: "UNBANNED",
          channelId: channelId,
          userId: NaN,
          message: `You have unbanned: ${channelId}`,
        }
        this.notificationGateway.sendNotificationToUser(id, payload);
        return userState;
      }
    } catch (error) {
      console.error(error);
      throw new HttpException("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
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
      if (banned)
        throw new HttpException("You are banned", HttpStatus.FORBIDDEN);

      const channel = await this.prisma.channels.findUnique({
        where: {
          id: channelId,
        },
      });
      if (channel.password !== password)
        throw new HttpException("Incorrect password", HttpStatus.BAD_REQUEST);

      const joinedUser = await this.prisma.channelUsers.create({
        data: {
          channel_id: channelId,
          user_id: id,
          admin: false,
        },
      });
      const payload: ChannelNotificationPayload = {
        type: 'USER_JOIN',
        channelId: channelId,
        userId: id,
        message: `user ${id} joined this channel ${channelId}`
      };
      this.channelsGateway.sendNotificationToChannel(channelId, payload);
      return joinedUser;
    } catch (error) {
      console.error(error);
      throw new HttpException("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
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
        throw new HttpException("Channel not found", HttpStatus.NOT_FOUND);
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
        throw new HttpException("You are banned", HttpStatus.FORBIDDEN);
      }

      if (channel.password !== password) {
        throw new HttpException("Incorrect password", HttpStatus.BAD_REQUEST);
      }

      const joinedUser = await this.prisma.channelUsers.create({
        data: {
          channel_id: channel.id,
          user_id: id,
          admin: false,
        },
      });
      const payload: ChannelNotificationPayload = {
        type: 'USER_JOIN',
        channelId: channel.id,
        userId: id,
        message: `user ${id} quited this channel ${channel.id}`
      };
      this.channelsGateway.sendNotificationToChannel(channel.id, payload);
      return joinedUser
    } catch (error) {
      console.error(error);
      throw new HttpException("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}