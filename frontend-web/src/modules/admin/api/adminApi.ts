import { api } from '../../core/api/api';
import type { ServiceHealth } from './monitoringApi';

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
  totalReceiptsScanned: number;
  userGrowth: DailyMetricPoint[];
  systemHealth: {
    heapMemoryUsedMB: number;
    heapMemoryMaxMB: number | null;
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
  userStatus: 'ACTIVE' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'INACTIVE' | 'DELETED';
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

export interface AdminPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type AdminPageParams = { page: number; size: number; search?: string; sort?: 'newest' | 'oldest' };

export interface AdminFeedbackItem {
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
  updatedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface AdminBroadcastItem {
  id: string;
  title: string;
  body: string | null;
  targetAudience: string | null;
  priority: string | null;
  actionUrl?: string;
  actionText?: string;
  recipientCount: number | null;
  expectedCount: number | null;
  readCount: number | null;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'LEGACY';
  legacy: boolean;
  createdBy: string | null;
  createdAt: string | null;
}

export interface LegacyAuditItem {
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
}

export interface AdminOcrItem {
  id: string;
  confidence: number | null;
  needsReview: boolean;
  createdAt: string;
}

export interface AdminAiSession {
  id: string;
  messageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminAiStats {
  status: string;
  totalSessions: number;
  totalMessages: number;
  algorithms: Array<{ name: string; type: string; engine: string; status: string; desc: string }>;
}

export interface AdminCategoryItem {
  id: string;
  name: string;
  code?: string;
  kind: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
  parentId: string | null;
  displayOrder: number;
  isSystem: boolean;
}

export interface AdminSetting {
  key: string;
  value: string;
  group: string;
  description: string;
  updatedAt: string;
  type: 'BOOLEAN' | 'INTEGER' | 'DECIMAL' | 'DURATION';
  min: number | null;
  max: number | null;
  editable: boolean;
  applies: 'IMMEDIATE' | 'READ_ONLY';
  effect: string;
}

export interface AdminNotificationTemplate {
  id: string;
  code: string;
  title: string;
  bodyTemplate: string;
  triggerEvent: string;
  scheduleCron: string | null;
  targetAudience: string | null;
  priority: string | null;
  isActive: boolean | null;
  editable: boolean;
  totalDispatched: number | null;
  lastDispatchedAt: string | null;
  createdAt: string;
}

async function getAdminPage<T>(path: string, params: AdminPageParams, signal?: AbortSignal): Promise<AdminPage<T>> {
  const response = await api.get(path, { params, signal });
  return response.data?.data ?? response.data;
}

export const adminApi = {
  // 1. Tổng quan
  async getDashboardOverview(): Promise<AdminDashboardOverview> {
    const res = await api.get('/admin/dashboard/overview');
    return res.data?.data || res.data;
  },

  // 2. Quản lý Người dùng
  listUsers(params: AdminPageParams & { status?: string; tier?: string }, signal?: AbortSignal) {
    return getAdminPage<AdminUserItem>('/admin/users', params, signal);
  },

  async updateUser(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUserItem> {
    const res = await api.put(`/admin/users/${userId}`, payload);
    return res.data?.data || res.data;
  },

  async toggleBlockUser(userId: string): Promise<AdminUserItem> {
    const res = await api.post(`/admin/users/${userId}/toggle-block`);
    return res.data?.data || res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await api.delete(`/admin/users/${userId}`);
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
  async getSystemCategories(): Promise<AdminCategoryItem[]> {
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
  }): Promise<AdminCategoryItem> {
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
  }): Promise<AdminCategoryItem> {
    const res = await api.put(`/admin/categories/${categoryId}`, payload);
    return res.data?.data || res.data;
  },

  async deleteSystemCategory(categoryId: string): Promise<void> {
    await api.delete(`/admin/categories/${categoryId}`);
  },

  // 5. Quản lý OCR Hóa đơn
  async getOcrOverview(signal?: AbortSignal): Promise<{
    totalScanned: number;
    scannedToday: number;
    scannedThisMonth: number;
    needReviewCount: number;
    averageConfidence: number | null;
    linkedTransactions: number;
  }> {
    const res = await api.get('/admin/ocr/overview', { signal });
    return res.data?.data || res.data;
  },

  listOcrReceipts(params: AdminPageParams & { review?: boolean }, signal?: AbortSignal) {
    return getAdminPage<AdminOcrItem>('/admin/ocr/receipts', params, signal);
  },

  listAiSessions(params: AdminPageParams, signal?: AbortSignal) {
    return getAdminPage<AdminAiSession>('/admin/ai/sessions', params, signal);
  },

  // 6. Thống kê sử dụng
  async getAnalyticsOverview(): Promise<{
    totalUsers: number;
    activeUsersDAU: number;
    activeUsersWAU: number;
    activeUsersMAU: number;
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
  listFeedbacks(params: AdminPageParams & { status?: string; category?: string }, signal?: AbortSignal) {
    return getAdminPage<AdminFeedbackItem>('/admin/feedbacks', params, signal);
  },

  async replyFeedback(feedbackId: string, payload: { reply: string; status: string; expectedUpdatedAt: string }, requestId: string): Promise<AdminFeedbackItem> {
    const res = await api.post(`/admin/feedbacks/${feedbackId}/reply`, payload, { headers: { 'Idempotency-Key': requestId } });
    return res.data?.data ?? res.data;
  },

  // 8. Thông báo Hệ thống (Broadcast)
  listBroadcastLogs(params: AdminPageParams & { legacy?: boolean }, signal?: AbortSignal) {
    return getAdminPage<AdminBroadcastItem>('/admin/broadcast', params, signal);
  },

  async broadcastNotification(payload: {
    title: string;
    body: string;
    targetAudience?: string;
    priority?: string;
    actionUrl?: string;
    actionText?: string;
  }, requestId: string): Promise<AdminBroadcastItem> {
    const res = await api.post('/admin/broadcast', payload, { headers: { 'Idempotency-Key': requestId } });
    return res.data?.data || res.data;
  },

  // 8.1 Mẫu thông báo tự động (Templates)
  async listNotificationTemplates(): Promise<AdminNotificationTemplate[]> {
    const res = await api.get('/admin/notification-templates');
    return res.data?.data || res.data;
  },

  async updateNotificationTemplate(templateId: string, payload: {
    title: string;
    bodyTemplate: string;
    targetAudience?: string;
    priority?: string;
    isActive?: boolean;
  }): Promise<AdminNotificationTemplate> {
    const res = await api.put(`/admin/notification-templates/${templateId}`, payload);
    return res.data?.data || res.data;
  },

  async toggleNotificationTemplate(templateId: string): Promise<AdminNotificationTemplate> {
    const res = await api.post(`/admin/notification-templates/${templateId}/toggle`);
    return res.data?.data || res.data;
  },

  // 9. Nhật ký Hoạt động (Audit Logs)
  listAuditLogs(params: AdminPageParams & { action?: string; targetEntity?: string }, signal?: AbortSignal) {
    return getAdminPage<LegacyAuditItem>('/admin/audit-logs', params, signal);
  },

  // 9b. Nhật ký Hệ thống (ops.audit_logs — yêu cầu mật khẩu .env tại Backend)
  async unlockSystemAudit(password: string): Promise<{
    unlockToken: string;
    expiresInSeconds: number;
    expiresAt: string;
  }> {
    const res = await api.post('/admin/system-audit/unlock', { password });
    return res.data?.data || res.data;
  },

  async listSystemAuditLogs(
    unlockToken: string,
    params: AdminPageParams & { category?: string; outcome?: string; severity?: string },
    signal?: AbortSignal,
  ): Promise<{
    content: Array<{
      id: string;
      occurredAt: string;
      eventType: string;
      eventCategory: string;
      action: string;
      severity: string;
      outcome: string;
      actorId?: string;
      actorType: string;
      actorRole?: string;
      subjectUserId?: string;
      source: string;
      resourceType?: string;
      resourceId?: string;
      relatedResourceId?: string;
      groupId?: string;
      requestId?: string;
      correlationId?: string;
      httpMethod?: string;
      endpoint?: string;
      changedFields?: Record<string, unknown>;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      reasonCode?: string;
      errorCode?: string;
    }>;
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }> {
    const res = await api.get('/admin/system-audit/logs', {
      params,
      signal,
      headers: {
        'X-System-Audit-Token': unlockToken,
      },
    });
    return res.data?.data || res.data;
  },

  // 10. Giám sát Hệ thống (System Health)
  async getSystemHealth(signal?: AbortSignal): Promise<{
    status: string;
    serviceHealth: ServiceHealth;
    garbageCollectors: { name: string; collections: number | null; timeMs: number | null }[];
    uptimeSeconds: number;
    startTime: string;
    hourlyTraffic?: { hourLabel: string; requests: number; failed: number; avgLatencyMs: number | null }[];
    performanceHistory?: { timeLabel: string; cpuPercent: number | null; ramPercent: number | null; latencyMs: number | null }[];
    traffic24h?: { totalRequests: number; failedRequests: number; errorRatePercent: number | null; avgLatencyMs: number | null };
    serviceErrorRates24h?: Record<string, number | null>;
    recentEvents?: { severity: string; message: string; timestamp: string }[];
    memory: {
      heapUsedMB: number;
      heapMaxMB: number | null;
      heapCommittedMB: number;
      heapUsagePercent: number | null;
      nonHeapUsedMB: number;
      systemTotalMB?: number | null;
      systemUsedMB?: number | null;
      systemUsagePercent?: number | null;
    };
    cpu: {
      availableProcessors: number;
      systemLoadAverage: number | null;
      processCpuPercent: number | null;
      systemCpuPercent?: number | null;
      activeThreadCount: number;
      peakThreadCount: number;
      totalLoadedClasses: number;
    };
    database: {
      status: string;
      databaseProductName: string | null;
      databaseProductVersion: string | null;
      pingTimeMs: number | null;
      activeConnections: number | null;
      idleConnections: number | null;
      pendingConnections: number | null;
      maxPoolSize: number | null;
    };
    disk: {
      totalSpaceGB: number;
      freeSpaceGB: number;
      usableSpaceGB: number;
      diskUsagePercent: number | null;
    };
    runtime: Record<string, string>;
  }> {
    const res = await api.get('/admin/system-health', { signal });
    return res.data?.data || res.data;
  },

  // 11. Cấu hình Hệ thống (System Settings)
  async listSettings(group?: string): Promise<AdminSetting[]> {
    const res = await api.get('/admin/settings', { params: { group } });
    return res.data?.data || res.data;
  },

  async updateSetting(key: string, value: string): Promise<AdminSetting> {
    const res = await api.put(`/admin/settings/${key}`, { value });
    return res.data?.data || res.data;
  },

  // 12. Thống kê FinAI Engine
  async getAiAdminStats(): Promise<AdminAiStats> {
    const res = await api.get('/admin/ai/stats');
    return res.data?.data || res.data;
  },
};
