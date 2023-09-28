import {Controller, Param, Get, Post, Query, Req} from '@nestjs/common';
import {FriendsService} from "./friends.service";
import {PrismaService} from "../prisma/prisma.service";

@Controller('friends')
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Get()
    async getFriends(@Req() req) {
        const reqId = req.user.id;
        return this.friendsService.getFriends(reqId);
    }

    @Post("/add")
    async addFriend(@Query('name') name: string, @Req() req) {
        const reqId = req.user.id;
        return this.friendsService.addFriend(reqId, name);
    }

    @Post("/delete")
    async deleteFriend(@Query('name') name: string, @Req() req) {
        const reqId = req.user.id;
        return this.friendsService.deleteFriend(reqId, name);
    }
}
