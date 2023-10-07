import {Controller, Get, Param, Post} from '@nestjs/common';
import {ChannelsService} from "./channels.service";

@Controller('channels')
export class ChannelsController {
    constructor(private readonly channelsService: ChannelsService) {
    }

    @Get("/:user_id")
    async getChannels(@Param("user_id") id: number){
        return this.channelsService.getChannels(id);
    }

    @Get("/:channel_id/users")
    async getChannelUsers(@Param("channel_id") id: number){
        return this.channelsService.getChannelUsers(id);
    }

    @Post("/create")
    async createChannel(){}
}
