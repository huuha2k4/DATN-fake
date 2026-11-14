import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

export interface AppNotification {
  id: string;
  type: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  body: string;
  iconUrl?: string;
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationFilterParams {
  isRead?: boolean;
  type?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

export const notificationApi = {
  /**
   * Lấy danh sách thông báo của người dùng
   */
  async getNotifications(params?: NotificationFilterParams): Promise<AppNotification[]> {
    try {
      const token = await authStorage.getToken();
      if (!token) return getMockNotifications();

      const queryParams = new URLSearchParams();
      if (params?.isRead !== undefined) queryParams.append('is_read', String(params.isRead));
      if (params?.type) queryParams.append('type', params.type);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));

      const url = `${API_BASE_URL}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        return await buildFallbackNotificationsWithRealWeeklyReport(token);
      }

      const json = await res.json();
      const list = json?.data?.notifications || json?.data || [];
      if (!Array.isArray(list) || list.length === 0) {
        return await buildFallbackNotificationsWithRealWeeklyReport(token);
      }

      const mapped: AppNotification[] = list.map((item: any) => ({
        id: item.id || String(Math.random()),
        type: item.type || 'SYSTEM',
        priority: item.priority || 'MEDIUM',
        title: item.title || 'Thông báo',
        body: item.body || item.message || '',
        iconUrl: item.iconUrl || item.icon_url,
        actionUrl: item.actionUrl || item.action_url,
        actionText: item.actionText || item.action_text,
        data: item.data,
        isRead: Boolean(item.isRead ?? item.is_read ?? false),
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        readAt: item.readAt || item.read_at,
      }));

      // Nếu danh sách từ server chưa có thông báo báo cáo tuần hoặc cần đồng bộ số liệu thật của tuần trước
      const hasWeekly = mapped.some(
        (n) =>
          (n.type || '').toUpperCase().includes('WEEKLY') ||
          (n.title || '').toLowerCase().includes('báo cáo tài chính tuần')
      );
      if (!hasWeekly) {
        const dynamicWeekly = await buildDynamicWeeklyNotification(token);
        if (dynamicWeekly) {
          mapped.unshift(dynamicWeekly);
        }
      }

      return mapped;
    } catch (e) {
      const token = await authStorage.getToken();
      return await buildFallbackNotificationsWithRealWeeklyReport(token);
    }
  },

  /**
   * Đếm số thông báo chưa đọc
   */
  async getUnreadCount(): Promise<number> {
    try {
      const token = await authStorage.getToken();
      if (!token) return 3;

      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        return json?.data?.unread_count ?? json?.data?.unreadCount ?? 0;
      }
    } catch (e) {
      // ignore
    }
    return 3;
  },

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Đánh dấu toàn bộ đã đọc
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Xóa 1 thông báo
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Xóa tất cả thông báo đã đọc
   */
  async clearAllRead(): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const res = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },
};

function getWeekRanges() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const currentDay = now.getDay(); // 0 = CN, 1 = Thứ 2...
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const mondayThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
  const sundayLastWeek = new Date(mondayLastWeek);
  sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);

  const mondayTwoWeeksAgo = new Date(mondayLastWeek);
  mondayTwoWeeksAgo.setDate(mondayLastWeek.getDate() - 7);
  const sundayTwoWeeksAgo = new Date(mondayTwoWeeksAgo);
  sundayTwoWeeksAgo.setDate(mondayTwoWeeksAgo.getDate() + 6);

  // Thời điểm 08:00 sáng Thứ 2 tuần này
  const mondayMorning8AM = new Date(
    mondayThisWeek.getFullYear(),
    mondayThisWeek.getMonth(),
    mondayThisWeek.getDate(),
    8,
    0,
    0
  );

  return {
    lastWeekFrom: toYMD(mondayLastWeek),
    lastWeekTo: toYMD(sundayLastWeek),
    prevWeekFrom: toYMD(mondayTwoWeeksAgo),
    prevWeekTo: toYMD(sundayTwoWeeksAgo),
    mondayMorningIso: mondayMorning8AM.toISOString(),
  };
}

async function buildDynamicWeeklyNotification(token?: string | null): Promise<AppNotification | null> {
  const { lastWeekFrom, lastWeekTo, prevWeekFrom, prevWeekTo, mondayMorningIso } = getWeekRanges();

  let lastWeekExpense = 0;
  let prevWeekExpense = 0;

  if (token) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      const [lastWeekRes, prevWeekRes] = await Promise.all([
        fetch(`${API_BASE_URL}/transactions/summary?fromDate=${lastWeekFrom}&toDate=${lastWeekTo}`, { headers }),
        fetch(`${API_BASE_URL}/transactions/summary?fromDate=${prevWeekFrom}&toDate=${prevWeekTo}`, { headers }),
      ]);

      if (lastWeekRes.ok) {
        const lwJson = await lastWeekRes.json();
        const rawSummary = lwJson?.data?.summary || lwJson?.summary || {};
        lastWeekExpense = Number(rawSummary.totalExpense || 0);
      }
      if (prevWeekRes.ok) {
        const pwJson = await prevWeekRes.json();
        const rawPrevSummary = pwJson?.data?.summary || pwJson?.summary || {};
        prevWeekExpense = Number(rawPrevSummary.totalExpense || 0);
      }
    } catch {
      // ignore network error and fallback below
    }
  }

  const formattedSpent = Math.round(lastWeekExpense).toLocaleString('vi-VN') + 'đ';
  let comparisonText = '';

  if (prevWeekExpense > 0) {
    const diff = lastWeekExpense - prevWeekExpense;
    const pct = Math.round((Math.abs(diff) / prevWeekExpense) * 100);
    if (diff < 0) {
      comparisonText = `, giảm ${pct}% so với tuần trước`;
    } else if (diff > 0) {
      comparisonText = `, tăng ${pct}% so với tuần trước`;
    } else {
      comparisonText = ', giữ nguyên mức chi so với tuần trước';
    }
  } else if (lastWeekExpense > 0) {
    comparisonText = ' trong tuần vừa qua';
  } else {
    comparisonText = ' (tuần qua chưa phát sinh khoản chi tiêu nào)';
  }

  return {
    id: `weekly-report-${lastWeekFrom}`,
    type: 'WEEKLY_REPORT',
    priority: 'MEDIUM',
    title: '📊 Báo cáo tài chính tuần của bạn đã sẵn sàng!',
    body: `Tuần qua bạn đã chi ${formattedSpent}${comparisonText}. Xem ngay báo cáo nhé!`,
    actionUrl: `/reports?period=last_week&from=${lastWeekFrom}&to=${lastWeekTo}`,
    actionText: 'Xem ngay',
    data: {
      periodPreset: 'LAST_WEEK',
      fromDate: lastWeekFrom,
      toDate: lastWeekTo,
    },
    isRead: false,
    createdAt: mondayMorningIso,
  };
}

async function buildFallbackNotificationsWithRealWeeklyReport(token?: string | null): Promise<AppNotification[]> {
  const mocks = getMockNotifications();
  const dynamicWeekly = await buildDynamicWeeklyNotification(token);
  if (!dynamicWeekly) return mocks;
  return mocks.map((item) => (item.type === 'WEEKLY_REPORT' ? dynamicWeekly : item));
}

function getMockNotifications(): AppNotification[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    // --- HÔM NAY ---
    {
      id: 'mock-req-0',
      type: 'KID_SPEND_REQUEST',
      priority: 'HIGH',
      title: 'Bé gửi yêu cầu xin tiền',
      body: 'Bé Nam đã gửi yêu cầu xin tiền "Mua bút chì và tập vở mới" 45.000 đ. Nhấn để duyệt ngay.',
      actionUrl: '/groups?tab=CHILD_WALLETS&modal=SPEND_REQUESTS',
      actionText: 'Duyệt yêu cầu ngay',
      isRead: false,
      createdAt: new Date(today.getTime() + 9 * 3600000 + 15 * 60000).toISOString(), // 09:15
      data: { tab: 'KIDS', subTab: 'REQUESTS' },
    },
    {
      id: 'mock-0',
      type: 'CHORE_COMPLETED',
      priority: 'HIGH',
      title: 'Bé hoàn thành nhiệm vụ',
      body: 'Bé Nam đã hoàn thành nhiệm vụ "Rửa bát sau bữa tối". Nhấn để duyệt thưởng 20.000 đ.',
      actionUrl: '/groups?tab=CHILD_WALLETS&modal=CHORES',
      actionText: 'Duyệt nhiệm vụ & Thưởng',
      isRead: false,
      createdAt: new Date(today.getTime() + 9 * 3600000).toISOString(), // 09:00
      data: { tab: 'KIDS', subTab: 'CHORES' },
    },
    {
      id: 'mock-1',
      type: 'GROUP_FUND_DEPOSIT',
      priority: 'MEDIUM',
      title: 'Thành viên đã nộp quỹ',
      body: 'Nguyễn Văn Nam đã nộp 100.000 đ vào quỹ "Đại gia đình".',
      actionUrl: '/groups?tab=BALANCES',
      actionText: 'Xem quỹ nhóm',
      isRead: false,
      createdAt: new Date(today.getTime() + 8 * 3600000 + 45 * 60000).toISOString(), // 08:45
      data: { tab: 'BALANCES' },
    },
    {
      id: 'mock-2',
      type: 'TRANSACTION_NEW',
      priority: 'MEDIUM',
      title: 'Giao dịch mới',
      body: 'Đã thêm giao dịch "Ăn cơm tối" - 100.000 đ.',
      actionUrl: '/transactions',
      actionText: 'Xem giao dịch',
      isRead: false,
      createdAt: new Date(today.getTime() + 8 * 3600000 + 20 * 60000).toISOString(), // 08:20
    },
    {
      id: 'mock-3',
      type: 'GROUP_MEMBER_JOIN',
      priority: 'LOW',
      title: 'Thành viên mới',
      body: 'Trần Thị Linh đã tham gia nhóm "Đại gia đình".',
      actionUrl: '/groups?tab=MEMBERS',
      actionText: 'Xem thành viên',
      isRead: false,
      createdAt: new Date(today.getTime() + 7 * 3600000 + 55 * 60000).toISOString(), // 07:55
    },

    // --- HÔM QUA ---
    {
      id: 'mock-4',
      type: 'FUND_REMINDER',
      priority: 'HIGH',
      title: 'Nhắc nhở nộp quỹ',
      body: 'Đã đến hạn nộp quỹ tháng 11. Vui lòng hoàn thành trước 23:59.',
      actionUrl: '/schedules',
      actionText: 'Xem lịch tài chính',
      isRead: true,
      createdAt: new Date(today.getTime() - 86400000 + 20 * 3600000).toISOString(), // 20:00 hôm qua
    },
    {
      id: 'mock-5',
      type: 'GROUP_EXPENSE_SUMMARY',
      priority: 'MEDIUM',
      title: 'Cập nhật chi tiêu nhóm',
      body: 'Tổng chi nhóm hôm nay: 120.000 đ (vượt 20% so với trung bình).',
      actionUrl: '/groups?tab=EXPENSES',
      actionText: 'Xem chi tiêu nhóm',
      isRead: true,
      createdAt: new Date(today.getTime() - 86400000 + 18 * 3600000 + 30 * 60000).toISOString(), // 18:30 hôm qua
    },

    // --- TRƯỚC ĐÓ ---
    {
      id: 'mock-6',
      type: 'WEEKLY_REPORT',
      priority: 'MEDIUM',
      title: '📊 Báo cáo tài chính tuần của bạn đã sẵn sàng!',
      body: 'Tuần qua bạn đã chi 1.250.000đ, giảm 12% so với tuần trước. Xem ngay báo cáo nhé!',
      actionUrl: '/reports?period=last_week',
      actionText: 'Xem ngay',
      data: { periodPreset: 'LAST_WEEK' },
      isRead: false,
      createdAt: new Date(today.getTime() - 86400000 * 2 + 8 * 3600000).toISOString(), // 08:00 sáng Thứ 2
    },
    {
      id: 'mock-7',
      type: 'SYSTEM_FEATURE',
      priority: 'LOW',
      title: 'Cập nhật tính năng mới',
      body: 'Finora đã ra mắt tính năng "Mục tiêu nhóm". Khám phá ngay!',
      actionUrl: '/goals',
      actionText: 'Xem mục tiêu',
      isRead: true,
      createdAt: new Date(today.getTime() - 86400000 * 4).toISOString(), // 05/11
    },
  ];
}
