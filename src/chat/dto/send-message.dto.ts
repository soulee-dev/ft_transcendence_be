import { IsNumber, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ description: 'The ID of the user sending the message', example: 1 })
  @IsNumber()
  readonly sent_by_id: number;

  @ApiProperty({ description: 'The content of the message', example: 'Hello, World!' })
  @IsString()
  readonly message: string;
}
