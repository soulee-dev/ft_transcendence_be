import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

type DoneFunction = (error: Error | null | undefined, user?: any) => void;

@Injectable()
export class OAuth2Strategy extends PassportStrategy(Strategy, 'oauth2') {
  constructor(private readonly httpService: HttpService) {
    super({
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: process.env.YOUR_CLIENT_ID,
      clientSecret: process.env.YOUR_CLIENT_SECRET,
      callbackURL: `http://${process.env.HOST}:${process.env.BE_PORT}/auth/callback`,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: DoneFunction,
  ): Promise<any> {
    try {
      const result = await this.httpService
        .get('https://api.intra.42.fr/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .toPromise();

      const user = result?.data;
      if (!user) {
        throw new Error('Failed to retrieve user data from 42 API.');
      }

      // Here, you can choose what to return. Often, you'd return a user object that gets set on the request.
      // The following is a basic example; you can add more fields as required.
      return {
        id: user.id,
        name: user.login,
        profile_image: user.image.link,
        email: user.email,
      };
    } catch (error) {
      // Handle the error. This can be a logging mechanism or any error handling strategy you have.
      done(error, false);
    }
  }
}
