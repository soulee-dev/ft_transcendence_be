// jwt-ws.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Socket }  from "socket.io";
import { ExtendedSocket } from "./jwtWsGuard.interface"

@Injectable()
export class JwtWsGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client = context.switchToWs().getClient<ExtendedSocket>();
        const rawToken = client.handshake.query.token;
        const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

        if (!token) {
            throw new WsException('No token found');
        }

        try {
            const decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
            client.user = decoded;
            return true;
        } catch (e) {
            throw new WsException('Invalid token');
        }
    }
}
