export interface NotificationPayload {
  type:
    | 'ADDED_TO_CHANNEL'
    | 'GIVEN_ADMIN'
    | 'REMOVED_ADMIN'
    | 'BANNED'
    | 'UNBANNED'
    | 'KICKED'
    | 'MUTED'
    | 'REQUESTED_FRIEND'
    | 'ACCEPTED_YOUR_REQ'
    | 'DECLINED_YOUR_REQ'
    | 'DELETED_FRIEND'
    | 'BLOCKED_BY_USER'
    | 'UNBLOCKED_BY_USER'
    | 'USER_QUIT_CHANNEL'
    | 'USER_JOIN_CHANNEL'
    | 'CHANNEL_UPDATED'
    | 'SENT_MESSAGE'
    | 'PUBLIC_CHANNEL_CREATED'
    | 'INVITE_CUSTOM_GAME'
    | 'DECLINED_YOUR_INVITE'
    | 'LEFT_GAME';
  channelId: number;
  userId: number;
  message: string;
}
