import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import { UsersService } from "./users.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    getUsers() {
        return this.usersService.getUsers();
    }

    @Get('/:id')
    getUser(@Param('id') id: number) {
        return this.usersService.getUser(id);
    }

    @Post('/create')
    createUser(@Body() userData: CreateUserDto) {
        return this.usersService.createUser(userData);
    }

    @Post('/:id/update')
    updateUser(@Param('id') id: number, @Body() userData: UpdateUserDto) {
        return this.usersService.updateUser(id, userData);
    }

    @Post('/:id/delete')
    deleteUser(@Param('id') id: number) {
        return this.usersService.deleteUser(id);
    }
}
