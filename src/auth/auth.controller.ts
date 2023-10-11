import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('oauth2'))
  oauthlogin() {}

  @Get('callback')
  @UseGuards(AuthGuard('oauth2'))
  async oauthCallback(@Req() req: any, @Res() res: Response) {
    const jwt = await this.authService.login(req.user);
    res.cookie('access_token', jwt, {
      httpOnly: true,
    });
    return res.send({ message: 'logged in successfully' });
  }
}
