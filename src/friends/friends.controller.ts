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

    @Get("/requests")
    async getFriendRequests(@Req() req) {
        const reqId = req.user.id;
        return this.friendsService.getFriendRequests(reqId);
    }

    @Post("/request/:id/accept")
    async acceptFriendRequest(@Param('id') id: number) {
        return this.friendsService.acceptFriendRequest(id);
    }

    @Post("/request/:id/decline")
    async declineFriendRequest(@Param('id') id: number) {
        return this.friendsService.declineFriendRequest(id);
    }
}
