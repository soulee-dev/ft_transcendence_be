import {Injectable} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateChannelDto} from "./dto/create-channel.dto";
import {ChannelOptions} from "./enum/channel-options.enum";
import {UpdateChannelDto} from "./dto/update-channel.dto";
import {UserActionDto} from "./dto/user-action.dto";
import {UserAction} from "./enum/user-action.enum";
import {addMinutes} from 'date-fns';

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

            const channelIds = channelsId.map(channel => channel.channel_id);

            const channels = await this.prisma.channels.findMany({
                where: {
                    id: {
                        in: channelIds
                    }
                }
            });
            return channels;
        } catch (error) {
            console.error("Error getting channels:", error);
            throw error;
        }
    }
    async getChannelsIn(user_id: number) {
        try {
            const channelsId = await this.prisma.channelUsers.findMany({
                select: {channel_id: true},
                where: {user_id: user_id},
            });

            const channelIds = channelsId.map(channel => channel.channel_id);

            const channels = await this.prisma.channels.findMany({
                where: {
                    id: {
                        in: channelIds
                    }
                }
            });
            return channels;
        } catch (error) {
            console.error("Error getting channels:", error);
            throw error;
        }
    }

    async getChannelUsers(channel_id: number) {
        try {
            const channelUsers = await this.prisma.channelUsers.findMany({
                where: {channel_id: channel_id},
            });
            return channelUsers;
        } catch (error) {
            console.error("Error getting channelUsers", error);
            throw error;
        }
    }

    async createDMChannel(userId: number, creatorId: number) {
        const user = await this.prisma.users.findUnique({
            select: {name: true},
            where: {
                id: userId,
            }
        })
        if (!user)
            return ; // undefined user
        const creator = await this.prisma.users.findUnique({
            select: {name: true},
            where: {
                id: creatorId,
            }
        })
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
                        user_id: userId,
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

    }

    async createChannel(channelData: CreateChannelDto, userId: number) {
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
                throw new Error('Some users not found');
            }

            // Transaction 1: Create the channel
            const channel = await this.prisma.channels.create({
                data: {
                    name: name,
                    password: password,
                },
            });

            // Transaction 2: Create the channel options and channel users
            const channelInfo = await this.prisma.$transaction([
                this.prisma.channelOptions.create({
                    data: {
                        channel_id: channel.id,
                        option: option,
                    },
                }),
                this.prisma.channelUsers.createMany({
                    data: [
                        {
                            channel_id: channel.id,
                            user_id: userId,
                            admin: true,
                        },
                        // Adding other users as non-admins
                        ...invitedUsers.map(user => ({
                            channel_id: channel.id,
                            user_id: user.id,
                            admin: false,
                        })),
                    ],
                }),
            ]);
            return {
                channel,
                channelInfo
            };
        } catch (error) {
            // Log error details for debugging
            console.error('Error creating channel:', error);

            // Decide how to handle the error:
            // - Re-throw the error, or
            // - Return a failure status/object, or
            // - Throw a different error, etc.

            throw new Error('Failed to create channel');
        }
    }

    async handleUserDeparture(channelId: number, userId: number) {
        try {
            // Remove the user from the channel
            const channelOption = await this.prisma.channelOptions.findUnique({
                where: {
                    channel_id: channelId,
                }
            })
            if (channelOption.option === ChannelOptions.Dm)
                return; // you cannot leave DM
            await this.prisma.channelUsers.delete({
                where: {
                    // Use appropriate condition to identify the user-channel relationship
                    user_id_channel_id: {
                        user_id: userId,
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
                        where: { channel_id: channelId },
                    }),
                    this.prisma.channelOptions.deleteMany({
                        where: { channel_id: channelId },
                    }),
                    this.prisma.channels.delete({
                        where: { id: channelId },
                    }),
                    this.prisma.chat.delete({
                        where: { id: channelId },
                    })
                ]);
            }
        } catch (error) {
            // Handle errors (e.g., log them and/or throw an exception)
            console.error(error);
            throw new Error('Failed to handle user departure');
        }
    }

    async updateChannel(channelId: number, userId: number, updateData: UpdateChannelDto) {
        const user = await this.prisma.channelUsers.findUnique({
            where: {
                user_id_channel_id: {
                    user_id: userId,
                    channel_id: channelId,
                }
            }
        })
        if (user.admin === false)
            return; //error: you are not admin

        const channelOption = await this.prisma.channelOptions.findUnique({
            where: {
                channel_id: channelId,
            }
        });
        if (channelOption.option === ChannelOptions.Dm)
            return; // cannot change DM option
        if (updateData.option === ChannelOptions.Dm)
            return; //error
        try {
            const updatedChannel = await this.prisma.channels.update({
                where: { id: channelId },
                data: updateData,
            });

            return updatedChannel;
        } catch (error) {
            // Handle errors appropriately
            console.error(error);
            throw new Error('Failed to update channel');
        }
    }

    async manageChannel(channelId: number, adminId: number, managementData: UserActionDto) {
        const channelOption = await this.prisma.channelOptions.findUnique({
            where: {
                channel_id: channelId,
            }
        })
        if (channelOption.option === ChannelOptions.Dm)
            return; //DM cannot be updated
        const admin = await this.prisma.channelUsers.findUnique({
            where: {
                user_id_channel_id: {
                    user_id: adminId,
                    channel_id: channelId,
                }
            }
        })
        if (admin.admin === false)
            return; //error: you are not admin
        const { userId, action } = managementData;
        const user = await this.prisma.channelUsers.findUnique({
            where: {
                user_id_channel_id: {
                    user_id: userId,
                    channel_id: channelId,
                }
            }
        })
        if (!user)
            return; //error user is not in channel
        if (action === UserAction.GiveAdmin) {
            return this.prisma.channelUsers.update({
                where: {
                    user_id_channel_id: {
                        user_id: userId,
                        channel_id: channelId,
                    }
                },
                data: {
                    admin: true,
                }
            });
        }
        if (action === UserAction.Kick) {
            return this.handleUserDeparture(channelId, userId);
        }
        if (action === UserAction.Ban) {
            this.handleUserDeparture(channelId, userId);
            return this.prisma.channelBans.create({
                data: {
                    channel_id: channelId,
                    user_id: userId,
                }
            })
        }
        if (action === UserAction.Mute) {
            const until = addMinutes(new Date(), 180);

            // Store the mute in the database with the expiration time
            return  this.prisma.channelMutes.create({
                data: {
                    channel_id: channelId,
                    user_id: userId,
                    until: until,
                },
            });
        }
        if (action === UserAction.UnBan) {
            return this.prisma.channelBans.delete({
                where: {
                    channel_id_user_id: {
                        channel_id: channelId,
                        user_id: userId,
                    }
                }
            })
        }
    }

    async joinPublicChannel(channelId: number, userId: number, password: string) {
        const banned = await this.prisma.channelBans.findUnique({
            where: {
                channel_id_user_id: {
                    channel_id: channelId,
                    user_id: userId,
                }
            }
        })
        if (banned)
            return; // you are banned
        const channel = await this.prisma.channels.findUnique({
            where: {
                id: channelId,
            }
        })
        if (channel.password !== password)
            return ; // password wrong
        return this.prisma.channelUsers.create({
            data: {
                channel_id: channelId,
                user_id: userId,
                admin: false,
            }
        })
    }

    async joinPrivateChannel(userId: number, password: string, name: string) {
        const channel = await this.prisma.channels.findUnique({
            where: {
                name: name,
            }
        })
        const banned = await this.prisma.channelBans.findUnique({
            where: {
                channel_id_user_id: {
                    channel_id: channel.id,
                    user_id: userId,
                }
            }
        })
        if (banned)
            return; // you are banned
        if (channel.password !== password)
            return ; // password wrong
        return this.prisma.channelUsers.create({
            data: {
                channel_id: channel.id,
                user_id: userId,
                admin: false,
            }
        })
    }
}
