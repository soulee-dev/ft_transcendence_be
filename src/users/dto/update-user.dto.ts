import { CreateUserDto } from './create-user.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UserStatusEnum } from '../enum/user-status.enum';
import { Status } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'The unique identifier of the user from 42 api',
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({
    description: 'The name of the user',
    example: 'Kyuhong Han',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'The URL of the profile image',
    example: 'http://example.com/image.jpg',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  profile_image?: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'kyhan@sudent.42seoul.kr',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    description: '2fa status of the user',
    example: 'true',
    required: false,
  })
  @IsBoolean()
  is_2fa?: boolean;

  @ApiProperty({
    description: 'The status of the user',
    example: UserStatusEnum.Online,
    enum: UserStatusEnum,
    required: false,
  })
  @IsEnum(UserStatusEnum)
  status?: Status;
}
