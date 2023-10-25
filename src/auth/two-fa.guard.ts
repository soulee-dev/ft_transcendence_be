import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TwoFaGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && user.hasOwnProperty('twofa') && user['twofa'] === false) {
            if (request.path.startsWith('/auth/validate-otp')) {
                return true;
            }
            return false;
        }

        return true;
    }
}
