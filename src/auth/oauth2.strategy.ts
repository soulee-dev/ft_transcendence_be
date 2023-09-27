import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

@Injectable()
export class OAuth2Strategy extends PassportStrategy(Strategy, 'oauth2') {
    constructor(private readonly httpService: HttpService) {
        super({
            authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
            tokenURL: 'https://api.intra.42.fr/oauth/token',
            clientID:
                'e320d9ca924a7d25085faade91848a3423c47e9039d1ea193e9b3a954c2fe7b7',
            clientSecret:
                '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',
            callbackURL: 'http://localhost:3000/auth/callback',
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: Function,
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
                name: user.name,
                email: user.email,
            };
        } catch (error) {
            // Handle the error. This can be a logging mechanism or any error handling strategy you have.
            done(error, false);
        }
    }
}