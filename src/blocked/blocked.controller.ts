import {Controller, Get, Param, Post, Query, Req, UseGuards} from '@nestjs/common';
import { BlockedService } from './blocked.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation, ApiParam, ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {AuthGuard} from "@nestjs/passport";
import {TwoFaGuard} from "../auth/two-fa.guard";

@ApiTags("blocked")
@Controller('blocked')
export class BlockedController {
  constructor(private readonly blockedService: BlockedService) {}

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve blocked users' })
  @ApiResponse({ status: 200, description: 'Retrieve blocked users successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getBlockedUser(@Req() req) {
    const id = req.user.id;
    return this.blockedService.getBlockedUser(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/add')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiQuery({ name: 'name', description: 'Name of the user to block' })
  async blockUser(@Req() req, @Query('name') name: string) {
    const id = req.user.id;
    return this.blockedService.blockUser(id, name);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/:blocked_id/delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'blocked_id', description: 'ID of the user to unblock' })
  async unblockUser(@Param('blocked_id') blockedId: number, @Req() req) {
    const id = req.user.id;
    return this.blockedService.unblockUser(blockedId, id);
  }
}
