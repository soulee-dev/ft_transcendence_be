// user-action.dto.ts

import { IsEnum, IsNumber } from 'class-validator';
import { UserAction } from '../enum/user-action.enum';
import {ApiProperty} from "@nestjs/swagger";

export class UserActionDto {
  @ApiProperty({
    description: 'The ID of the user to perform the action on',
    example: 1
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    enum: UserAction,
    example: UserAction.Kick,
    description: 'The action to perform on the user'
  })
  @IsEnum(UserAction)
  action: UserAction;
}
