import { Socket } from "socket.io";

export interface ExtendedSocket extends Socket {
    user?: any; // or specify a more detailed type if you know the structure of `decoded`
}