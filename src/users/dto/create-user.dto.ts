import {
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Status } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatusEnum } from '../enum/user-status.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'The unique identifier of the user from 42 api',
    example: 1,
  })
  @IsInt()
  @Min(1)
  readonly id: number;

  @ApiProperty({
    description: 'The name of the user',
    example: 'Kyuhong Han',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({
    description: 'The URL of the profile image',
    example: 'http://example.com/image.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  readonly profile_image: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'kyhan@sudent.42seoul.kr',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  readonly email: string;

  @ApiProperty({
    description: '2fa status of the user',
    example: 'true',
  })
  @IsBoolean()
  readonly is_2fa: boolean;

  @ApiProperty({
    description: 'The status of the user',
    example: UserStatusEnum.Online,
    enum: UserStatusEnum,
  })
  @IsEnum(UserStatusEnum)
  readonly status: Status;
}
