import { api } from '../../core/api/api';

export interface DailyMetricPoint {
  date: string;
  count: number;
}

export interface AdminDashboardOverview {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  pendingUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  freeUsers: number;
  premiumUsers: number;
  enterpriseUsers: number;
  totalGroups: number;
  totalTransactions: number;
  transactionsToday: number;
  totalReceiptsScanned: number;
  userGrowth: DailyMetricPoint[];
  transactionActivity: DailyMetricPoint[];
  systemHealth: {
    status: string;
    database: string;
    heapMemoryUsedMB: number;
    heapMemoryMaxMB: number;
    uptimeHours: number;
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  fullName: string;
  emailVerified: boolean;
  phone?: string | null;
  userStatus: 'ACTIVE' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'DELETED';
  systemRole: 'USER' | 'ADMIN';
  subscriptionTier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionExpiresAt?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AdminUserPageResponse {
  content: AdminUserItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUpdateUserPayload {
  fullName?: string;
  userStatus?: string;
  systemRole?: string;
  subscriptionTier?: string;
  extendSubscriptionDays?: number;
  emailVerified?: boolean;
}

export const adminApi = {
  // 1. Tổng quan
  async getDashboardOverview(): Promise<AdminDashboardOverview> {
    const res = await api.get('/admin/dashboard/overview');
    return res.data?.data || res.data;
  },

  // 2. Quản lý Người dùng
  async listUsers(params: {
    search?: string;
    status?: string;
    tier?: string;
    page?: number;
    size?: number;
  }): Promise<AdminUserPageResponse> {
    const res = await api.get('/admin/users', { params });
    return res.data?.data || res.data;
  },

  async updateUser(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUserItem> {
    const res = await api.put(`/admin/users/${userId}`, payload);
    return res.data?.data || res.data;
  },

  async toggleBlockUser(userId: string): Promise<AdminUserItem> {
    const res = await api.post(`/admin/users/${userId}/toggle-block`);
    return res.data?.data || res.data;
  },

  // 3. Vai trò & Phân quyền
  async getRoles(): Promise<Array<{
    role: string;
    name: string;
    description: string;
    totalAccounts: number;
    permissions: string[];
    isSystemProtected: boolean;
  }>> {
    const res = await api.get('/admin/roles');
    return res.data?.data || res.data;
  },

  // 4. Danh mục Hệ thống
  async getSystemCategories(): Promise<any[]> {
    const res = await api.get('/admin/categories');
    return res.data?.data || res.data;
  },

  async createSystemCategory(payload: {
    name: string;
    code?: string;
    kind: 'INCOME' | 'EXPENSE';
    icon?: string;
    color?: string;
    parentId?: string | null;
    displayOrder?: number;
  }): Promise<any> {
    const res = await api.post('/admin/categories', payload);
    return res.data?.data || res.data;
  },

  async updateSystemCategory(categoryId: string, payload: {
    name: string;
    code?: string;
    kind?: 'INCOME' | 'EXPENSE';
    icon?: string;
    color?: string;
    parentId?: string | null;
    displayOrder?: number;
  }): Promise<any> {
    const res = await api.put(`/admin/categories/${categoryId}`, payload);
    return res.data?.data || res.data;
  },

  async deleteSystemCategory(categoryId: string): Promise<void> {
    await api.delete(`/admin/categories/${categoryId}`);
  },

  // 5. Quản lý OCR Hóa đơn
  async getOcrOverview(): Promise<{
    totalScanned: number;
    scannedToday: number;
    scannedThisMonth: number;
    needReviewCount: number;
    averageConfidence: number;
    recentReceipts: Array<{
      id: string;
      userId: string;
      userFullName: string;
      userEmail: string;
      merchantName: string;
      totalAmount: number;
      currency: string;
      transactionDate: string;
      confidence: number;
      needsReview: boolean;
      aiCategoryName?: string;
      kind: string;
      createdAt: string;
    }>;
  }> {
    const res = await api.get('/admin/ocr/overview');
    return res.data?.data || res.data;
  },

  // 6. Thống kê sử dụng
  async getAnalyticsOverview(): Promise<{
    totalUsers: number;
    activeUsersDAU: number;
    activeUsersWAU: number;
    activeUsersMAU: number;
    retentionRate: number;
    totalTransactions: number;
    totalGroups: number;
    totalReceipts: number;
    activityTrend: Array<{
      date: string;
      transactionCount: number;
      newUsers: number;
    }>;
    featureUsages: Array<{
      featureName: string;
      icon: string;
      totalEvents: number;
      percentage: number;
    }>;
  }> {
    const res = await api.get('/admin/analytics');
    return res.data?.data || res.data;
  },

  // 7. Phản hồi & Hỗ trợ
  async listFeedbacks(params?: { status?: string; category?: string }): Promise<Array<{
    id: string;
    userId: string;
    userFullName: string;
    userEmail: string;
    userAvatar?: string;
    title: string;
    content: string;
    category: string;
    status: string;
    priority: string;
    adminReply?: string;
    repliedAt?: string;
    createdAt: string;
  }>> {
    const res = await api.get('/admin/feedbacks', { params });
    return res.data?.data || res.data;
  },

  async replyFeedback(feedbackId: string, payload: { reply: string; status?: string }): Promise<any> {
    const res = await api.post(`/admin/feedbacks/${feedbackId}/reply`, payload);
    return res.data?.data || res.data;
  },

  // 8. Thông báo Hệ thống (Broadcast)
  async listBroadcastLogs(): Promise<Array<{
    id: string;
    title: string;
    body: string;
    targetAudience: string;
    priority: string;
    actionUrl?: string;
    actionText?: string;
    recipientCount: number;
    createdBy: string;
    createdAt: string;
  }>> {
    const res = await api.get('/admin/broadcast');
    return res.data?.data || res.data;
  },

  async broadcastNotification(payload: {
    title: string;
    body: string;
    targetAudience?: string;
    priority?: string;
    actionUrl?: string;
    actionText?: string;
  }): Promise<any> {
    const res = await api.post('/admin/broadcast', payload);
    return res.data?.data || res.data;
  },

  // 8.1 Mẫu thông báo tự động (Templates)
  async listNotificationTemplates(): Promise<Array<{
    id: string;
    code: string;
    title: string;
    bodyTemplate: string;
    triggerEvent: string;
    scheduleCron?: string;
    targetAudience: string;
    priority: string;
    isActive: boolean;
    totalDispatched: number;
    lastDispatchedAt?: string;
    createdAt: string;
  }>> {
    const res = await api.get('/admin/notification-templates');
    return res.data?.data || res.data;
  },

  async updateNotificationTemplate(templateId: string, payload: {
    title: string;
    bodyTemplate: string;
    targetAudience?: string;
    priority?: string;
    isActive?: boolean;
  }): Promise<any> {
    const res = await api.put(`/admin/notification-templates/${templateId}`, payload);
    return res.data?.data || res.data;
  },

  async toggleNotificationTemplate(templateId: string): Promise<any> {
    const res = await api.post(`/admin/notification-templates/${templateId}/toggle`);
    return res.data?.data || res.data;
  },

  // 9. Nhật ký Hoạt động (Audit Logs)
  async listAuditLogs(params?: { action?: string; targetEntity?: string }): Promise<Array<{
    id: string;
    adminUsername: string;
    adminFullName: string;
    action: string;
    targetEntity: string;
    targetId: string;
    description: string;
    ipAddress: string;
    status: string;
    createdAt: string;
  }>> {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data?.data || res.data;
  },

  // 10. Giám sát Hệ thống (System Health)
  async getSystemHealth(): Promise<{
    status: string;
    uptimeSeconds: number;
    startTime: string;
    memory: {
      heapUsedMB: number;
      heapMaxMB: number;
      heapCommittedMB: number;
      heapUsagePercent: number;
      nonHeapUsedMB: number;
    };
    cpu: {
      availableProcessors: number;
      systemCpuLoad: number;
      processCpuLoad: number;
      activeThreadCount: number;
      peakThreadCount: number;
      totalLoadedClasses: number;
    };
    database: {
      status: string;
      databaseProductName: string;
      databaseProductVersion: string;
      pingTimeMs: number;
      activeConnections: number;
      maxPoolSize: number;
    };
    disk: {
      totalSpaceGB: number;
      freeSpaceGB: number;
      usableSpaceGB: number;
      diskUsagePercent: number;
    };
    runtime: Record<string, string>;
  }> {
    const res = await api.get('/admin/system-health');
    return res.data?.data || res.data;
  },

  // 11. Cấu hình Hệ thống (System Settings)
  async listSettings(group?: string): Promise<Array<{
    id: string;
    settingKey: string;
    settingValue: string;
    settingGroup: string;
    description: string;
    dataType: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'JSON';
    isEncrypted: boolean;
    updatedAt: string;
    updatedBy?: string | null;
  }>> {
    const res = await api.get('/admin/settings', { params: { group } });
    return res.data?.data || res.data;
  },

  async updateSetting(key: string, value: string): Promise<any> {
    const res = await api.put(`/admin/settings/${key}`, { value });
    return res.data?.data || res.data;
  },
};
