import { IsIn, IsString, MaxLength } from 'class-validator';
import { ChannelOptions } from '../enum/channel-options.enum';

export class UpdateChannelDto {
    @IsString()
    @MaxLength(25)
    name?: string;

    @IsString()
    @MaxLength(25)
    password?: string;

    @IsIn([ChannelOptions.Public, ChannelOptions.Private, ChannelOptions.Dm])
    option?: ChannelOptions;
}