import {Controller, Param, Get, Post, Query, UseGuards, Req} from '@nestjs/common';
import { FriendsService } from './friends.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {AuthGuard} from "@nestjs/passport";

@ApiTags("friends")
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all friends of the user' })
  @ApiResponse({ status: 200, description: 'Retrieve all friends successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getFriends(@Req() req) {
    const id = req.user.id
    return this.friendsService.getFriends(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a friend by name' })
  @ApiResponse({ status: 201, description: 'Friend added successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiQuery({ name: 'name', description: 'Name of the friend to add' })
  async addFriend(@Query('name') name: string, @Req() req) {
    const id = req.user.id;
    return this.friendsService.addFriend(id, name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a friend by name' })
  @ApiResponse({ status: 200, description: 'Friend deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiQuery({ name: 'name', description: 'Name of the friend to delete' })
  async deleteFriend(@Query('name') name: string, @Req() req) {
    const id = req.user.id;
    return this.friendsService.deleteFriend(id, name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all friend requests of the user' })
  @ApiResponse({ status: 200, description: 'Retrieve all friend requests successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getFriendRequests(@Req() req) {
    const id = req.user.id;
    return this.friendsService.getFriendRequests(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/request/:requestId/accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a friend request by ID' })
  @ApiResponse({ status: 200, description: 'Friend request accepted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'requestId', description: 'ID of the friend request to accept' })
  async acceptFriendRequest(@Param('requestId') requestId: number, @Req() req) {
    const id = req.user.id;
    return this.friendsService.acceptFriendRequest(requestId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/request/:requestId/decline')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline a friend request by ID' })
  @ApiResponse({ status: 200, description: 'Friend request declined successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'requestId', description: 'ID of the friend request to decline' })
  async declineFriendRequest(@Param('requestId') requestId: number, @Req() req) {
    const id = req.user.id;
    return this.friendsService.declineFriendRequest(requestId, id);
  }
}
