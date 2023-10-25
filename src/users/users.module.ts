import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import {TwoFaGuard} from "../auth/two-fa.guard";

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, TwoFaGuard],
})
export class UsersModule {}
