import {Body, Controller, Get, Param, Post, Req, UseGuards} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam, ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {AuthGuard} from "@nestjs/passport";
import {id} from "date-fns/locale";

@ApiTags("users")
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiOkResponse({ description: 'Users retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getUsers() {
    return this.usersService.getUsers();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiParam({ name: 'id', description: 'ID of the user to retrieve' })
  getUser(@Param('id') id: number) {
    return this.usersService.getUser(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a my profile by ID' })
  @ApiOkResponse({ description: 'My profile retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMe(@Req() req) {
    const id = req.user.id;
    return this.usersService.getUser(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateUserDto })
  createUser(@Body() userData: CreateUserDto) {
    return this.usersService.createUser(userData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/me/update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: UpdateUserDto })
  updateUser(@Req() req, @Body() userData: UpdateUserDto) {
    const id = req.user.id;
    return this.usersService.updateUser(id, userData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/me/delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  deleteUser(@Req() req) {
    const id = req.user.id;
    return this.usersService.deleteUser(id);
  }
}
