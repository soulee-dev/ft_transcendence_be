import { ApiProperty } from "@nestjs/swagger";
import {IsString} from "class-validator";

export class ValidateOtpDto {
    @ApiProperty({
        description: 'The id of the intra user',
        example: '107121',
    })
    @IsString()
    userId: string;

    @ApiProperty({
        description: 'The id of the intra user',
        example: '010160',
    })
    @IsString()
    otp: string;
}
