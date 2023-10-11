import { IsNumber, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNumber()
  readonly sent_by_id: number;

  @IsString()
  readonly message: string;
}
