import {Controller, Get, UseGuards, Req, Res, Post, Body} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import {ApiBody, ApiOperation, ApiResponse, ApiTags} from "@nestjs/swagger";
import {ValidateOtpDto} from "./dto/validate-otp.dto";

@ApiTags("auth")
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('oauth2'))
  oauthlogin() {}

  @Get('callback')
  @UseGuards(AuthGuard('oauth2'))
  async oauthCallback(@Req() req: any, @Res() res: Response) {
    this.authService.storeOAuthUserTemporarily(req.user.id, req.user);
    // TODO: 여기서 2fa on off 처리해야할듯
    const otp = this.authService.generateOTP(req.user.id);
    await this.authService.sendOtpEmail(req.user.email, otp);

    return res.send({ message: `OTP sent to email! Please verify. ${req.user.id}` });
  }

  @Post('validate-otp')
  @ApiOperation({ summary: 'Validate OTP and log in the user' })
  @ApiResponse({ status: 200, description: 'OTP validation successful and logged in.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @ApiBody({ type: ValidateOtpDto })
  async validateOtp(@Req() req: any, @Res() res: Response, @Body() otpData: ValidateOtpDto) {
    const {userId, otp} = otpData;
    const isValid = await this.authService.validateOTP(userId, otp);
    if (isValid) {
      const oauthUser = await this.authService.retrieveOAuthUserTemporarily(userId);
      const jwt = await this.authService.login(oauthUser);
      res.cookie('access_token', jwt);
      return res.send({message: `OTP validation successful and logged in!`, jwt: jwt});
    } else {
      return res.status(400).send({message: 'Invalid OTP!'});
    }
  }
}
