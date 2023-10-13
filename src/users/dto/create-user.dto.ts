import { IsEnum, IsString } from 'class-validator';
import { Status } from '@prisma/client';
import {ApiProperty} from "@nestjs/swagger";
import {UserStatusEnum} from "../enum/user-status.enum";

export class CreateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    example: 'Kyuhong Han'
  })
  @IsString()
  readonly name: string;

  @ApiProperty({
    description: 'The URL of the profile image',
    example: 'http://example.com/image.jpg'
  })
  @IsString()
  readonly profile_image: string;

  @ApiProperty({
    description: 'The status of the user',
    example: UserStatusEnum.Online,
    enum: UserStatusEnum
  })
  @IsEnum(UserStatusEnum)
  readonly status: Status;
}
