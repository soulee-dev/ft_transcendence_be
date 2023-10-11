import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
} from 'class-validator';
import { ChannelOptions } from '../enum/channel-options.enum';

export class CreateChannelDto {
  @IsString()
  @MaxLength(25)
  name: string;

  @IsString()
  @MaxLength(25)
  password?: string;

  @IsIn([ChannelOptions.Public, ChannelOptions.Private, ChannelOptions.Dm])
  option: ChannelOptions;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  users: string[];
}
