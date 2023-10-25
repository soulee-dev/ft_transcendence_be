import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly jwtService: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.YOUR_SECRET_KEY, // Use the same secret key as you used in the AuthModule
    });
  }

  async validate(payload: any) {
    // Here, you could potentially fetch the user from the database using the payload.sub (user ID)
    // For now, we'll just pass the payload directly
    if (!payload) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      twofa: payload['2fa'],
  };
  }
}
