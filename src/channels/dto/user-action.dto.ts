// user-action.dto.ts

import { IsEnum, IsNumber } from 'class-validator';
import { UserAction } from '../enum/user-action.enum';

export class UserActionDto {
    @IsNumber()
    userId: number;

    @IsEnum(UserAction)
    action: UserAction;
}
