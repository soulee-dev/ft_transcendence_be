import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelOptions } from './enum/channel-options.enum';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UserActionDto } from './dto/user-action.dto';
import { UserAction } from './enum/user-action.enum';
import { addMinutes } from 'date-fns';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {
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

      const channel = await this.prisma.channels.create({
        data: {
          name: creator.name + ', ' + user.name,
          password: null,
        },
      });

      const channelInfo = await this.prisma.$transaction([
        this.prisma.channelOptions.create({
          data: {
            channel_id: channel.id,
            option: ChannelOptions.Dm,
          },
        }),
        this.prisma.channelUsers.createMany({
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
        }),
      ]);
      return {channel, channelInfo};
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error creating DM channel:', error);
      throw new HttpException('Failed to create DM channel', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  async createChannel(channelData: CreateChannelDto, id: number) {
    const {name, password, option, users} = channelData;

    try {
      // Check if all user names are valid
      const invitedUsers = await this.prisma.users.findMany({
        where: {
          name: {
            in: users,
          },
        },
      });

      if (invitedUsers.length !== users.length) {
        throw new HttpException('Some users not found', HttpStatus.NOT_FOUND);
      }
      const existingChannel = await this.prisma.channels.findUnique({
        where: {
          name: name,
        }
      })
      if (existingChannel)
        throw new HttpException("Name already existed", HttpStatus.CONFLICT);
      // Transaction 1: Create the channel
      const channel = await this.prisma.channels.create({
        data: {
          name: name,
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
        const resultOfUsers = await this.prisma.channelUsers.createMany({
          data: [
            {
              channel_id: channel.id,
              user_id: id,
              admin: true,
            },
            // Adding other users as non-admins
            ...invitedUsers.map((user) => ({
              channel_id: channel.id,
              user_id: user.id,
              admin: false,
            })),
          ],
        });
      return {
        channel,
        resultOfOption,
        resultOfUsers,
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
        await this.prisma.$transaction([
          this.prisma.channelUsers.deleteMany({
            where: {channel_id: channelId},
          }),
          this.prisma.channelOptions.deleteMany({
            where: {channel_id: channelId},
          }),
          this.prisma.chat.delete({
            where: {id: channelId},
          }),
          this.prisma.channels.delete({
            where: {id: channelId},
          }),
        ]);
      }
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
        return this.prisma.channelUsers.update({
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
      }
      if (action === UserAction.Kick) {
        return this.handleUserDeparture(channelId, id);
      }
      if (action === UserAction.Ban) {
        this.handleUserDeparture(channelId, id);
        return this.prisma.channelBans.create({
          data: {
            channel_id: channelId,
            user_id: id,
          },
        });
      }
      if (action === UserAction.Mute) {
        const until = addMinutes(new Date(), 180);

        // Store the mute in the database with the expiration time
        return this.prisma.channelMutes.create({
          data: {
            channel_id: channelId,
            user_id: id,
            until: until,
          },
        });
      }
      if (action === UserAction.UnBan) {
        return this.prisma.channelBans.delete({
          where: {
            channel_id_user_id: {
              channel_id: channelId,
              user_id: id,
            },
          },
        });
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

      return this.prisma.channelUsers.create({
        data: {
          channel_id: channelId,
          user_id: id,
          admin: false,
        },
      });

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

      return this.prisma.channelUsers.create({
        data: {
          channel_id: channel.id,
          user_id: id,
          admin: false,
        },
      });

    } catch (error) {
      console.error(error);
      throw new HttpException("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}