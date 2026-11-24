export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  kind: 'budget' | 'reminder' | 'goal' | 'security';
  unread: boolean;
};

export const notifications: NotificationItem[] = [];