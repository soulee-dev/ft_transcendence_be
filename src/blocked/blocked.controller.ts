import {Controller, Get, Param, Post, Query} from '@nestjs/common';
import {BlockedService} from "./blocked.service";

@Controller('blocked')
export class BlockedController {
    constructor(private readonly blockedService: BlockedService) {}

    @Get("/:id")
    async getBlockedUser(@Param("id") id: number) {
        return this.blockedService.getBlockedUser(id);
    }

    @Post("/:id/add")
    async blockUser(@Param("id") id: number, @Query('name') name: string) {
        return this.blockedService.blockUser(id, name);
    }

    @Post("/:blocked_id/delete")
    async unblockUser(@Param("blocked_id") id: number){
        return this.blockedService.unblockUser(id);
    }
}
