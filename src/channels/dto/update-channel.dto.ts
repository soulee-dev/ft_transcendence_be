import { IsIn, IsString, MaxLength } from 'class-validator';
import { ChannelOptions } from '../enum/channel-options.enum';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateChannelDto } from './create-channel.dto';

export class UpdateChannelDto extends PartialType(CreateChannelDto) {
  @ApiProperty({
    description: 'The new name of the channel',
    example: 'UpdatedChannel',
    maxLength: 25,
    required: false,
  })
  @IsString()
  @MaxLength(25)
  name?: string;

  @ApiProperty({
    description: 'The new password for the channel',
    example: 'UpdatedPassword',
    maxLength: 25,
    required: false,
  })
  @IsString()
  @MaxLength(25)
  password?: string;
}
