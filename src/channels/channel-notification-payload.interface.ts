export interface ChannelNotificationPayload {
    type: 'USER_QUIT' | 'USER_JOIN' | 'USER_ADMIN' | 'CHANNEL_UPDATED';
    channelId: number;
    userId: number;
    message: string;
}