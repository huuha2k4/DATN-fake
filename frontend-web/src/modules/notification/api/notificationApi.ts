import { api } from '../../core/api/api';

export type NotificationType =
  | 'TRANSACTION'
  | 'BUDGET_ALERT'
  | 'BUDGET_EXCEEDED'
  | 'GOAL_MILESTONE'
  | 'GOAL_ACHIEVED'
  | 'GOAL_REMINDER'
  | 'DEBT_REMINDER'
  | 'DEBT_OVERDUE'
  | 'RECURRING_DUE'
  | 'RECURRING_FAILED'
  | 'ANOMALY_DETECTED'
  | 'INSIGHT_GENERATED'
  | 'WEEKLY_SUMMARY'
  | 'MONTHLY_REPORT'
  | 'SYSTEM';

export type NotificationPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon_url?: string;
  action_url?: string;
  action_text?: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
  by_priority?: Record<string, number>;
  by_type?: Record<string, number>;
}

export interface NotificationFilterParams {
  is_read?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  page?: number;
  page_size?: number;
}

export const notificationApi = {
  // Lấy danh sách thông báo
  async getNotifications(params?: NotificationFilterParams): Promise<NotificationListResponse> {
    try {
      const res = await api.get('/notifications', { params });
      return res.data?.data || { notifications: [], unread_count: 0 };
    } catch {
      return { notifications: [], unread_count: 0 };
    }
  },

  // Lấy số lượng thông báo chưa đọc
  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get('/notifications/unread-count');
      const data: UnreadCountResponse = res.data?.data;
      return data?.unread_count ?? 0;
    } catch {
      return 0;
    }
  },

  // Đánh dấu 1 thông báo là đã đọc
  async markAsRead(id: string): Promise<boolean> {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      return res.data?.success ?? true;
    } catch {
      return false;
    }
  },

  // Đánh dấu tất cả là đã đọc
  async markAllAsRead(): Promise<number> {
    try {
      const res = await api.put('/notifications/read-all');
      return res.data?.data?.marked_count ?? 0;
    } catch {
      return 0;
    }
  },

  // Xóa 1 thông báo
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const res = await api.delete(`/notifications/${id}`);
      return res.data?.success ?? true;
    } catch {
      return false;
    }
  },

  // Xóa toàn bộ thông báo đã đọc
  async clearAllRead(): Promise<number> {
    try {
      const res = await api.delete('/notifications/clear-all');
      return res.data?.data?.deleted_count ?? 0;
    } catch {
      return 0;
    }
  },
};
