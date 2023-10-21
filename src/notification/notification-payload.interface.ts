export interface NotificationPayload {
    type: 'ADDED_TO_CHANNEL' | 'GIVEN_ADMIN' | 'BANNED' | 'UNBANNED' | 'KICKED' | 'MUTED' | 'REQUESTED_FRIEND' | 'ACCEPTED_YOUR_REQ' | 'DECLINED_YOUR_REQ' | 'DELETED_FRIEND'
    | 'BLOCKED_BY_USER' | 'UNBLOCKED_BY_USER';
    channelId: number;
    userId: number;
    message: string;
}
