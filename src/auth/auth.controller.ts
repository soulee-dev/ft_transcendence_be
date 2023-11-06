import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('oauth2'))
  oauthlogin() {}

  @Get('callback')
  @UseGuards(AuthGuard('oauth2'))
  async oauthCallback(@Req() req: any, @Res() res: Response) {
    // TODO: 여기서 2fa on off 처리해야할듯
    try {
      const id = req.user.id;
      const user = await this.userService.getUser(id);
      if (user.is_2fa === true) {
        const otp = this.authService.generateOTP(req.user.id);
        await this.authService.sendOtpEmail(req.user.email, otp);
        const jwt = await this.authService.login(req.user, id); // JWT with '2fa': 'pending'
        return res
          .cookie('access_token', jwt)
          .redirect(
            `http://${process.env.HOST}:${process.env.FE_PORT}/2fa/${req.user.id}`,
          );
      }
      const jwt = await this.authService.login(req.user, id);
      return res
        .cookie('access_token', jwt)
        .redirect(`http://${process.env.HOST}:${process.env.FE_PORT}/`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const jwt = await this.authService.login(req.user, req.user.id);
        return res
          .cookie('access_token', jwt)
          .redirect(
            `http://${process.env.HOST}:${process.env.FE_PORT}/edit_profile/?newUser=true`,
          );
      }
      return error;
    }
  }

  @Post('validate-otp')
  @ApiOperation({ summary: 'Validate OTP and log in the user' })
  @ApiResponse({
    status: 200,
    description: 'OTP validation successful and logged in.',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @ApiBody({ type: ValidateOtpDto })
  async validateOtp(
    @Req() req: any,
    @Res() res: Response,
    @Body() otpData: ValidateOtpDto,
  ) {
    const { userId, otp } = otpData;
    const isValid = await this.authService.validateOTP(userId, otp);
    if (isValid) {
      const jwt = await this.authService.complete2fa(parseInt(userId, 10));
      return res.cookie('access_token', jwt).send({
        redirectURI: `http://${process.env.HOST}:${process.env.FE_PORT}/`,
      });
    } else {
      return res.status(400).send({ message: 'Invalid OTP!' });
    }
  }
}
