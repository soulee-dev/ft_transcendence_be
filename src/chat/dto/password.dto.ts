import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";

export class PasswordDto {
    @ApiProperty({ description: 'Password of Channel', example: '1234' })
    @IsString()
    readonly password?: string;
}