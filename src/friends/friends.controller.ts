import {Controller, Param, Get, Post, Query, Req} from '@nestjs/common';
import {FriendsService} from "./friends.service";
import {PrismaService} from "../prisma/prisma.service";

@Controller('friends')
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Get("/:id")
    async getFriends(@Param("id") id: number) {
        return this.friendsService.getFriends(id);
    }

    @Post("/:id/add")
    async addFriend(@Query('name') name: string, @Param("id") id: number) {
        return this.friendsService.addFriend(id, name);
    }

    @Post("/:id/delete")
    async deleteFriend(@Query('name') name: string, @Param("id") id: number) {
        return this.friendsService.deleteFriend(id, name);
    }

    @Get("/requests/:id")
    async getFriendRequests(@Param("id") id: number) {
        return this.friendsService.getFriendRequests(id);
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
