import {Controller, Param, Get, Post, Query} from '@nestjs/common';
import {FriendsService} from "./friends.service";
import {PrismaService} from "../prisma/prisma.service";

@Controller('friends')
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Get("/:id")
    async getFriends(@Param('id') id: number) {
        return this.friendsService.getFriends(id);
    }

    @Post("/:id/add")
    async addFriend(@Param('id') id: number, @Query('name') name: string) {
        return this.friendsService.addFriend(id, name);
    }

    @Post("/:id/delete")
    async deleteFriend(@Param('id') id: number, @Query('name') name: string) {
        return this.friendsService.deleteFriend(id, name);
    }
}
