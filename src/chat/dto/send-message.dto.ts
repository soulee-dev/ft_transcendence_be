import { IsNumber, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ description: 'The content of the message', example: 'Hello, World!' })
  @IsString()
  readonly message: string;
}
