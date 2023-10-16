import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
} from 'class-validator';
import { ChannelOptions } from '../enum/channel-options.enum';
import {ApiProperty} from "@nestjs/swagger";

export class CreateChannelDto {
  @ApiProperty({
    description: 'The name of the channel',
    example: 'General',
    maxLength: 25,
  })
  @IsString()
  @MaxLength(25)
  name: string;

  @ApiProperty({
    description: 'The password for the channel (if private)',
    example: 'securePassword',
    maxLength: 25,
    required: false,
  })
  @IsString()
  @MaxLength(25)
  password?: string;

  @ApiProperty({
    enum: ChannelOptions,
    example: ChannelOptions.Public,
    description: 'The type of channel',
  })
  @IsIn([ChannelOptions.Public, ChannelOptions.Private, ChannelOptions.Dm])
  option: ChannelOptions;

  @ApiProperty({
    description: 'Array of user IDs to add to the channel',
    example: ['user1', 'user2'],
  })
  @IsArray()
  @IsString({ each: true })
  users: string[];
}
