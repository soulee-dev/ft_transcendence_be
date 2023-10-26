// jwt-ws.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import {Socket} from "socket.io";


interface ExtendedSocket extends Socket {
    user?: any; // or specify a more detailed type if you know the structure of `decoded`
}

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your JWT secret
            client.user = decoded.sub; // Assign the decoded payload to the client for further use

            return true;
        } catch (e) {
            throw new WsException('Invalid token');
        }
    }
}
