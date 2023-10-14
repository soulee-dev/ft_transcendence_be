import { IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Status } from '@prisma/client';
import {ApiProperty} from "@nestjs/swagger";
import {UserStatusEnum} from "../enum/user-status.enum";

export class CreateUserDto {
  @ApiProperty({
    description: 'The unique identifier of the user from 42 api',
    example: 1
  })
  @IsInt()
  @Min(1)
  readonly id: number;
  
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
