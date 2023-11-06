import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { id } from 'date-fns/locale';
import { TwoFaGuard } from '../auth/two-fa.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiOkResponse({ description: 'Users retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUsers() {
    return this.usersService.getUsers();
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a my profile by ID' })
  @ApiOkResponse({ description: 'My profile retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMe(@Req() req: any) {
    const id = req.user.id;
    return this.usersService.getUser(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/name/:name')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a user by name' })
  @ApiOkResponse({ description: 'User retrieved by name successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'name', description: 'Name of the user to retrieve' })
  async getUserByName(@Param('name') name: string) {
    return this.usersService.getUserByName(name);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Get('/id/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'ID of the user to retrieve' })
  async getUser(@Param('id') id: number) {
    return this.usersService.getUser(id);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/me/update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(@Req() req, @Body() userData: UpdateUserDto) {
    const id = req.user.id;
    return this.usersService.updateUser(id, userData);
  }

  @UseGuards(AuthGuard('jwt'), TwoFaGuard)
  @Post('/me/delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteUser(@Req() req) {
    const id = req.user.id;
    return this.usersService.deleteUser(id);
  }
}
