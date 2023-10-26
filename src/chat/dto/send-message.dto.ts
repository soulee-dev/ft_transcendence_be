import { IsNumber, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ description: 'The content of the message', example: 'Hello, World!' })
  @IsString()
  readonly message: string;

  @ApiProperty({ description: 'Password of Channel', example: '1234' })
  @IsString()
  readonly password?: string;
}
