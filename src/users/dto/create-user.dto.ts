import { IsEnum, IsString } from 'class-validator';
import { Status } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly profile_image: string;

  @IsEnum(Status)
  readonly status: Status;
}
