import { CreateUserDto } from './create-user.dto';
import { PartialType } from '@nestjs/mapped-types';
import {ApiProperty} from "@nestjs/swagger";
import {IsBoolean, IsEnum, IsInt, IsString, Min} from "class-validator";
import {UserStatusEnum} from "../enum/user-status.enum";
import {Status} from "@prisma/client";

export class UpdateUserDto {
    @ApiProperty({
        description: 'The unique identifier of the user from 42 api',
        example: 1,
        required: false
    })
    @IsInt()
    @Min(1)
    readonly id?: number;

    @ApiProperty({
        description: 'The name of the user',
        example: 'Kyuhong Han',
        required: false,
    })
    @IsString()
    readonly name?: string;

    @ApiProperty({
        description: 'The URL of the profile image',
        example: 'http://example.com/image.jpg',
        required: false,
    })
    @IsString()
    readonly profile_image?: string;

    @ApiProperty({
        description: 'The email of the user',
        example: 'kyhan@sudent.42seoul.kr',
        required: false,
    })
    @IsString()
    readonly email?: string;

    @ApiProperty({
        description: '2fa status of the user',
        example: 'true',
        required: false,
    })
    @IsBoolean()
    readonly is_2fa?: boolean

    @ApiProperty({
        description: 'The status of the user',
        example: UserStatusEnum.Online,
        enum: UserStatusEnum,
        required: false,
    })
    @IsEnum(UserStatusEnum)
    readonly status?: Status;
}
