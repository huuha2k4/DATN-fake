import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { notificationApi, type AppNotification } from '../api';

interface NotificationsScreenProps {
  onBack?: () => void;
  onNavigate?: (target: {
    tab?: 'home' | 'transactions' | 'group' | 'profile' | 'budget' | 'goals';
    groupTarget?: {
      groupId?: string;
      groupName?: string;
      tab?: 'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS' | 'KIDS' | 'SETTINGS';
      kidWalletId?: string;
      kidSubTab?: 'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS';
    };
    action?:
      | 'periodic-reports'
      | 'reminders'
      | 'spending-analysis'
      | 'security'
      | 'debts'
      | 'add-transaction'
      | 'balance-forecast'
      | string;
    params?: any;
  }) => void;
}

type TabType = 'ALL' | 'GROUP' | 'TRANSACTION' | 'SYSTEM';

const TABS: { key: TabType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'GROUP', label: 'Quỹ nhóm' },
  { key: 'TRANSACTION', label: 'Giao dịch' },
  { key: 'SYSTEM', label: 'Hệ thống' },
];

interface NotificationSection {
  title: string;
  data: AppNotification[];
}

export function NotificationsScreen({ onBack, onNavigate }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  const loadData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.warn('Lỗi tải thông báo:', e);
    } finally {
      if (showLoadingIndicator) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  const handleItemPress = async (item: AppNotification) => {
    setSelectedNotif(item);
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      await notificationApi.markAsRead(item.id);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.some((n) => !n.isRead);
    if (!unread) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationApi.markAllAsRead();
  };

  // Trích xuất tham số từ actionUrl dạng /groups?groupId=...&tab=...&walletId=...&modal=...
  const parseActionUrlParams = (url?: string): Record<string, string> => {
    if (!url || !url.includes('?')) return {};
    const query = url.split('?')[1] || '';
    const result: Record<string, string> = {};
    query.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) {
        result[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    });
    return result;
  };

  // Điều hướng đến tính năng tương ứng với thông báo
  const handleNavigateFromNotif = (notif: AppNotification) => {
    setSelectedNotif(null);
    if (onBack) onBack(); // Đóng màn hình thông báo trước

    const type = (notif.type || '').toUpperCase();
    const title = (notif.title || '').toLowerCase();
    const body = (notif.body || '').toLowerCase();
    const actionUrl = (notif.actionUrl || '').toLowerCase();
    const urlParams = parseActionUrlParams(notif.actionUrl);
    const data = notif.data || {};
    const groupId = data.groupId || data.group_id || urlParams.groupId;
    const walletId = data.walletId || data.childWalletId || urlParams.walletId;

    // Trích xuất tên nhóm từ nội dung hoặc tiêu đề nếu chưa có groupId
    const extractGroupName = (): string | undefined => {
      if (data.groupName || data.group_name) return data.groupName || data.group_name;
      const fullText = `${notif.title || ''} ${notif.body || ''}`;
      const quoteMatch = fullText.match(/(?:nhóm|quỹ)\s*["“]([^"”]+)["”]/i);
      if (quoteMatch && quoteMatch[1]) return quoteMatch[1].trim();
      const plainMatch = fullText.match(/trong nhóm\s+([^.,!?\n]+)/i) || fullText.match(/tham gia nhóm\s+([^.,!?\n"]+)/i);
      if (plainMatch && plainMatch[1]) return plainMatch[1].trim();
      return undefined;
    };
    const groupName = extractGroupName();

    if (!onNavigate) return;

    // 1. Nhóm: Yêu cầu xin tiền / chi tiêu của bé -> Vào thẳng Modal chi tiết ví tab 'REQUESTS'
    if (
      type.includes('KID_SPEND') ||
      type.includes('MONEY_REQUEST') ||
      (type.includes('REQUEST_RESPONDED') && !title.includes('nhiệm vụ')) ||
      title.includes('xin tiền') ||
      body.includes('xin tiền') ||
      title.includes('yêu cầu chi tiêu') ||
      urlParams.modal === 'SPEND_REQUESTS'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'KIDS',
          kidWalletId: walletId,
          kidSubTab: 'REQUESTS',
        },
      });
      return;
    }

    // 2. Nhóm: Nhiệm vụ việc nhà của bé -> Vào thẳng Modal chi tiết ví tab 'CHORES'
    if (
      type.includes('CHORE') ||
      title.includes('nhiệm vụ') ||
      title.includes('việc nhà') ||
      body.includes('nhiệm vụ') ||
      urlParams.modal === 'CHORES'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'KIDS',
          kidWalletId: walletId,
          kidSubTab: 'CHORES',
        },
      });
      return;
    }

    // 3. Nhóm: Bé được cộng tiền / nạp tiền vào ví -> Vào Modal ví bé tab 'DEPOSIT'
    if (
      type.includes('MONEY_RECEIVED') ||
      title.includes('cộng tiền vào ví') ||
      actionUrl.includes('/child-wallet')
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'KIDS',
          kidWalletId: walletId,
          kidSubTab: 'SPENDS',
        },
      });
      return;
    }

    // 4. Nhắc nhở hạn nộp / Lịch tài chính / Giao dịch định kỳ (kiểm tra trước FUND để "Nhắc nhở nộp quỹ" vào Lịch nhắc nhở)
    if (
      type.includes('REMINDER') ||
      type.includes('RECURRING') ||
      title.includes('nhắc nhở') ||
      title.includes('lịch tài chính') ||
      title.includes('sắp đến hạn:') ||
      actionUrl.includes('/schedules') ||
      actionUrl.includes('/reminders')
    ) {
      // Riêng DEBT_REMINDER sẽ xử lý ở mục Công nợ bên dưới nếu có chữ nợ/vay
      if (
        !type.includes('DEBT') &&
        !title.includes('trả nợ') &&
        !title.includes('thu nợ') &&
        !title.includes('khoản nợ') &&
        !actionUrl.includes('/debts')
      ) {
        onNavigate({ action: 'reminders' });
        return;
      }
    }

    // 5. Quản lý Công nợ / Nhắc nợ / Tất toán nợ
    if (
      type.includes('DEBT') ||
      title.includes('trả nợ') ||
      title.includes('thu nợ') ||
      title.includes('khoản nợ') ||
      actionUrl.includes('/debts')
    ) {
      onNavigate({ action: 'debts' });
      return;
    }

    // 6. Cảnh báo Ngân sách / Vượt ngân sách
    if (
      type.includes('BUDGET') ||
      title.includes('ngân sách') ||
      actionUrl.includes('/budget')
    ) {
      onNavigate({ tab: 'budget' });
      return;
    }

    // 7. Mục tiêu tài chính / Mục tiêu nhóm / Cột mốc tiết kiệm
    if (
      type.includes('GOAL') ||
      title.includes('mục tiêu') ||
      body.includes('mục tiêu') ||
      actionUrl.includes('/goals')
    ) {
      onNavigate({ tab: 'goals' });
      return;
    }

    // 8. Nhóm: Nộp quỹ, Quỹ chung, Số dư nhóm
    if (
      type.includes('FUND') ||
      title.includes('nộp quỹ') ||
      title.includes('quỹ') ||
      urlParams.tab === 'BALANCES'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'BALANCES',
        },
      });
      return;
    }

    // 9. Nhóm: Thành viên mới, lời mời tham gia nhóm
    if (
      type.includes('MEMBER') ||
      type.includes('INVITATION') ||
      title.includes('thành viên') ||
      title.includes('lời mời') ||
      urlParams.tab === 'MEMBERS'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'MEMBERS',
        },
      });
      return;
    }

    // 10. Nhóm: Bình luận / Trò chuyện nhóm
    if (
      type.includes('GROUP_COMMENT') ||
      type.includes('COMMENT') ||
      title.includes('bình luận') ||
      urlParams.tab === 'CHAT'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'CHAT',
        },
      });
      return;
    }

    // 11. Nhóm: Chi tiêu nhóm chung
    if (
      type.includes('GROUP_EXPENSE') ||
      title.includes('chi nhóm') ||
      title.includes('trong nhóm') ||
      body.includes('chi nhóm') ||
      urlParams.tab === 'EXPENSES'
    ) {
      onNavigate({
        tab: 'group',
        groupTarget: {
          groupId,
          groupName,
          tab: 'EXPENSES',
        },
      });
      return;
    }

    // 12. Nhắc nhở ghi chép chi tiêu 20:00 tối -> Mở màn hình Thêm giao dịch
    if (
      actionUrl.includes('/add-transaction') ||
      title.includes('chưa ghi nhận chi tiêu')
    ) {
      onNavigate({ action: 'add-transaction' });
      return;
    }

    // 13. Báo cáo định kỳ (Báo cáo tuần / tháng)
    if (
      type.includes('REPORT') ||
      type.includes('WEEKLY_SUMMARY') ||
      title.includes('báo cáo') ||
      actionUrl.includes('/reports')
    ) {
      const isWeeklyReport =
        type.includes('WEEKLY') ||
        title.includes('tuần') ||
        body.includes('tuần qua') ||
        data.periodPreset === 'LAST_WEEK' ||
        actionUrl.includes('last_week');

      onNavigate({
        action: 'periodic-reports',
        params: {
          presetId: data.periodPreset || (isWeeklyReport ? 'LAST_WEEK' : 'LAST_MONTH'),
          fromDate: data.fromDate || urlParams.from,
          toDate: data.toDate || urlParams.to,
        },
      });
      return;
    }

    // 14. Phân tích hành vi / Phát hiện bất thường AI
    if (
      type.includes('ANOMALY') ||
      type.includes('INSIGHT') ||
      title.includes('bất thường') ||
      title.includes('phân tích') ||
      actionUrl.includes('/analysis')
    ) {
      onNavigate({ action: 'spending-analysis' });
      return;
    }

    // 15. Giao dịch cá nhân
    if (
      type.includes('TRANSACTION') ||
      type.includes('EXPENSE') ||
      type.includes('INCOME') ||
      title.includes('giao dịch') ||
      title.includes('chi tiêu') ||
      actionUrl.includes('/transactions')
    ) {
      onNavigate({ tab: 'transactions' });
      return;
    }

    // 16. Đăng nhập, bảo mật
    if (
      type.includes('SECURITY') ||
      type.includes('AUTH') ||
      title.includes('đăng nhập') ||
      title.includes('bảo mật') ||
      actionUrl.includes('/profile')
    ) {
      onNavigate({ action: 'security' });
      return;
    }

    onNavigate({ tab: 'home' });
  };

  // Lấy nhãn của nút điều hướng xem chi tiết chuẩn theo từng nghiệp vụ
  const getActionLabel = (notif: AppNotification) => {
    if (notif.actionText && notif.actionText.trim().length > 0) {
      return notif.actionText.trim();
    }

    const type = (notif.type || '').toUpperCase();
    const title = (notif.title || '').toLowerCase();
    const body = (notif.body || '').toLowerCase();
    const actionUrl = (notif.actionUrl || '').toLowerCase();

    if (
      type.includes('KID_SPEND') ||
      type.includes('MONEY_REQUEST') ||
      title.includes('xin tiền') ||
      body.includes('xin tiền')
    ) {
      return 'Duyệt yêu cầu ngay';
    }
    if (
      type.includes('CHORE') ||
      title.includes('nhiệm vụ') ||
      title.includes('việc nhà') ||
      body.includes('nhiệm vụ')
    ) {
      return 'Duyệt nhiệm vụ & Thưởng';
    }
    if (type.includes('MONEY_RECEIVED') || title.includes('cộng tiền vào ví')) {
      return 'Xem ví của bé';
    }
    if (
      (type.includes('REMINDER') || type.includes('RECURRING') || title.includes('nhắc nhở') || title.includes('lịch tài chính')) &&
      !type.includes('DEBT') &&
      !title.includes('nợ')
    ) {
      return 'Xem lịch tài chính';
    }
    if (type.includes('DEBT') || title.includes('khoản nợ') || title.includes('trả nợ') || title.includes('thu nợ')) {
      return 'Xem sổ nợ';
    }
    if (type.includes('BUDGET') || title.includes('ngân sách')) {
      return 'Xem ngân sách';
    }
    if (type.includes('GOAL') || title.includes('mục tiêu') || body.includes('mục tiêu')) {
      return 'Xem mục tiêu';
    }
    if (type.includes('FUND') || title.includes('nộp quỹ') || title.includes('quỹ')) {
      return 'Xem quỹ nhóm';
    }
    if (type.includes('MEMBER') || type.includes('INVITATION') || title.includes('thành viên') || title.includes('lời mời')) {
      return 'Xem thành viên';
    }
    if (type.includes('COMMENT') || title.includes('bình luận')) {
      return 'Xem bình luận';
    }
    if (type.includes('GROUP_EXPENSE') || title.includes('chi nhóm') || body.includes('chi nhóm')) {
      return 'Xem chi tiêu nhóm';
    }
    if (actionUrl.includes('/add-transaction') || title.includes('chưa ghi nhận chi tiêu')) {
      return 'Thêm giao dịch ngay';
    }
    if (type.includes('REPORT') || type.includes('WEEKLY_SUMMARY') || title.includes('báo cáo')) {
      return 'Xem ngay';
    }
    if (type.includes('ANOMALY') || type.includes('INSIGHT') || title.includes('phân tích')) {
      return 'Xem phân tích';
    }
    if (type.includes('TRANSACTION') || type.includes('EXPENSE') || title.includes('giao dịch') || title.includes('chi tiêu')) {
      return 'Xem giao dịch';
    }
    if (type.includes('SECURITY') || title.includes('đăng nhập') || title.includes('bảo mật')) {
      return 'Kiểm tra bảo mật';
    }
    return 'Khám phá ngay';
  };

  // Lọc thông báo theo tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'ALL') return true;
      const type = (item.type || '').toUpperCase();
      if (activeTab === 'GROUP') {
        return (
          type.includes('GROUP') ||
          type.includes('FUND') ||
          type.includes('MEMBER') ||
          type.includes('KID') ||
          type.includes('CHILD') ||
          type.includes('CHORE')
        );
      }
      if (activeTab === 'TRANSACTION') {
        return (
          type.includes('TRANSACTION') ||
          type.includes('EXPENSE') ||
          type.includes('INCOME') ||
          type.includes('BUDGET') ||
          type.includes('DEBT') ||
          type.includes('GOAL') ||
          type.includes('RECURRING')
        );
      }
      if (activeTab === 'SYSTEM') {
        return (
          type.includes('SYSTEM') ||
          type.includes('ADMIN') ||
          type.includes('BROADCAST') ||
          type.includes('SECURITY') ||
          type.includes('AUTH') ||
          type.includes('REPORT') ||
          type.includes('INSIGHT') ||
          type.includes('FEATURE')
        );
      }
      return true;
    });
  }, [notifications, activeTab]);

  // Gom nhóm theo ngày: Hôm nay, Hôm qua, Trước đó
  const sections = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    filteredNotifications.forEach((item) => {
      const itemTime = new Date(item.createdAt).getTime();
      if (isNaN(itemTime) || itemTime >= todayStart) {
        today.push(item);
      } else if (itemTime >= yesterdayStart) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    const result: NotificationSection[] = [];
    if (today.length > 0) result.push({ title: 'Hôm nay', data: today });
    if (yesterday.length > 0) result.push({ title: 'Hôm qua', data: yesterday });
    if (earlier.length > 0) result.push({ title: 'Trước đó', data: earlier });
    return result;
  }, [filteredNotifications]);

  // Xác định icon & màu sắc chuẩn ngữ nghĩa từ thư viện FinanceIcon (Lucide)
  const getVisual = (item: AppNotification) => {
    const type = (item.type || '').toUpperCase();
    const title = (item.title || '').toLowerCase();

    // 1. Yêu cầu xin tiền / chi tiêu của bé -> Bàn tay đỡ xu (hand-coins)
    if (
      type.includes('KID_SPEND') ||
      type.includes('MONEY_REQUEST') ||
      type.includes('REQUEST_RESPONDED') ||
      title.includes('xin tiền') ||
      title.includes('yêu cầu chi tiêu')
    ) {
      return {
        icon: 'hand-coins' as const,
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
      };
    }

    // 2. Nhiệm vụ việc nhà / tiền thưởng của bé -> Huy chương phần thưởng (award)
    if (
      type.includes('CHORE') ||
      title.includes('nhiệm vụ') ||
      title.includes('việc nhà') ||
      title.includes('tiền thưởng')
    ) {
      return {
        icon: 'award' as const,
        iconBg: '#DCFCE7',
        iconColor: '#15803D',
      };
    }

    // 3. Bé nhận tiền vào ví / lì xì -> Hộp quà (gift)
    if (type.includes('MONEY_RECEIVED') || title.includes('cộng tiền vào ví')) {
      return {
        icon: 'gift' as const,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      };
    }

    // 4. Nhắc nhở hạn nộp quỹ / thanh toán định kỳ (kiểm tra trước FUND để "Nhắc nhở nộp quỹ" hiện đúng icon nhắc hạn) -> Đồng hồ hẹn giờ (clock)
    if (
      type.includes('REMINDER') ||
      type.includes('RECURRING_DUE') ||
      title.includes('nhắc nhở') ||
      title.includes('đến hạn')
    ) {
      return {
        icon: 'clock' as const,
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
      };
    }

    // 5. Nộp quỹ nhóm / Đóng quỹ -> Chồng đồng xu (coin-stack)
    if (type.includes('FUND') || title.includes('nộp quỹ') || title.includes('quỹ')) {
      return {
        icon: 'coin-stack' as const,
        iconBg: '#DCFCE7',
        iconColor: '#15803D',
      };
    }

    // 6. Thành viên mới tham gia / Lời mời nhóm -> Người kèm dấu cộng (user-plus)
    if (
      type.includes('MEMBER') ||
      type.includes('INVITATION') ||
      title.includes('thành viên') ||
      title.includes('lời mời')
    ) {
      return {
        icon: 'user-plus' as const,
        iconBg: '#E0F2FE',
        iconColor: '#0284C7',
      };
    }

    // 7. Bình luận / Thảo luận nhóm -> Khung trò chuyện (message-square)
    if (type.includes('COMMENT') || title.includes('bình luận') || title.includes('thảo luận')) {
      return {
        icon: 'message-square' as const,
        iconBg: '#E0E7FF',
        iconColor: '#4F46E5',
      };
    }

    // 8. Cảnh báo vượt ngân sách / Chi tiêu bất thường -> Tam giác cảnh báo (alert-triangle)
    if (
      type.includes('BUDGET') ||
      type.includes('ANOMALY') ||
      title.includes('vượt ngân sách') ||
      title.includes('ngân sách')
    ) {
      return {
        icon: 'alert-triangle' as const,
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
      };
    }

    // 9. Công nợ / Vay mượn -> Bắt tay cam kết (handshake)
    if (
      type.includes('DEBT') ||
      title.includes('khoản nợ') ||
      title.includes('nhắc nợ') ||
      title.includes('vay')
    ) {
      return {
        icon: 'handshake' as const,
        iconBg: '#FCE7F3',
        iconColor: '#DB2777',
      };
    }

    // 10. Mục tiêu tiết kiệm / Mốc tích lũy -> Hồng tâm mục tiêu (target)
    if (type.includes('GOAL') || title.includes('mục tiêu') || title.includes('tiết kiệm')) {
      return {
        icon: 'target' as const,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      };
    }

    // 11. Tổng kết / Cập nhật chi tiêu nhóm -> Nhóm thành viên (users)
    if (
      type.includes('GROUP_EXPENSE') ||
      title.includes('cập nhật chi tiêu') ||
      title.includes('chi nhóm')
    ) {
      return {
        icon: 'users' as const,
        iconBg: '#CCFBF1',
        iconColor: '#0D9488',
      };
    }

    // 12. Giao dịch mới (Thu nhập / Chi tiêu) -> Hóa đơn (receipt) hoặc Ví tiền (wallet)
    if (
      type.includes('TRANSACTION') ||
      type.includes('EXPENSE') ||
      type.includes('INCOME') ||
      title.includes('giao dịch') ||
      title.includes('chi tiêu')
    ) {
      if (type.includes('INCOME') || title.includes('thu nhập') || title.includes('nhận tiền')) {
        return {
          icon: 'wallet' as const,
          iconBg: '#DCFCE7',
          iconColor: '#059669',
        };
      }
      return {
        icon: 'receipt' as const,
        iconBg: '#FFE4E6',
        iconColor: '#E11D48',
      };
    }

    // 13. Báo cáo tuần / tháng & Phân tích AI -> Biểu đồ cột phân tích (analytics)
    if (
      type.includes('REPORT') ||
      type.includes('SUMMARY') ||
      type.includes('INSIGHT') ||
      title.includes('báo cáo') ||
      title.includes('phân tích')
    ) {
      return {
        icon: 'analytics' as const,
        iconBg: '#F3E8FF',
        iconColor: '#9333EA',
      };
    }

    // 14. Bảo mật / Đăng nhập thiết bị mới -> Khiên bảo mật (shield)
    if (
      type.includes('SECURITY') ||
      type.includes('AUTH') ||
      title.includes('bảo mật') ||
      title.includes('đăng nhập') ||
      title.includes('mật khẩu')
    ) {
      return {
        icon: 'shield' as const,
        iconBg: '#DBEAFE',
        iconColor: '#2563EB',
      };
    }

    // 15. Thông báo từ Admin / Hệ thống / Cập nhật tính năng mới -> Loa thông báo (megaphone)
    if (
      type.includes('ADMIN') ||
      type.includes('SYSTEM') ||
      type.includes('BROADCAST') ||
      type.includes('FEATURE') ||
      title.includes('tính năng') ||
      title.includes('hệ thống') ||
      title.includes('finora') ||
      title.includes('thông báo từ admin')
    ) {
      return {
        icon: 'megaphone' as const,
        iconBg: '#E0F2FE',
        iconColor: '#0284C7',
      };
    }

    // Mặc định: Hình cái chuông (bell)
    return {
      icon: 'bell' as const,
      iconBg: '#E8F5E9',
      iconColor: '#047857',
    };
  };

  const formatItemTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const t = d.getTime();

      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');

      if (t >= yesterdayStart) {
        return `${hours}:${mins}`;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      return '';
    }
  };

  const getCategoryLabel = (item: AppNotification) => {
    const type = (item.type || '').toUpperCase();
    const title = (item.title || '').toLowerCase();

    if (
      type.includes('KID_SPEND') ||
      type.includes('MONEY_REQUEST') ||
      (type.includes('REQUEST_RESPONDED') && !title.includes('nhiệm vụ')) ||
      title.includes('xin tiền')
    ) {
      return 'Yêu cầu của bé';
    }
    if (type.includes('CHORE') || title.includes('nhiệm vụ') || title.includes('việc nhà')) {
      return 'Nhiệm vụ của bé';
    }
    if (type.includes('MONEY_RECEIVED') || title.includes('cộng tiền vào ví')) {
      return 'Ví của bé';
    }
    if (
      (type.includes('REMINDER') || type.includes('RECURRING') || title.includes('nhắc nhở') || title.includes('lịch tài chính')) &&
      !type.includes('DEBT') &&
      !title.includes('nợ')
    ) {
      return 'Lịch nhắc hạn';
    }
    if (type.includes('DEBT') || title.includes('khoản nợ') || title.includes('trả nợ') || title.includes('thu nợ')) {
      return 'Quản lý công nợ';
    }
    if (type.includes('BUDGET') || title.includes('ngân sách')) {
      return 'Cảnh báo ngân sách';
    }
    if (type.includes('GOAL') || title.includes('mục tiêu')) {
      return 'Mục tiêu tài chính';
    }
    if (type.includes('FUND') || title.includes('nộp quỹ') || title.includes('quỹ')) {
      return 'Quỹ nhóm';
    }
    if (type.includes('MEMBER') || type.includes('INVITATION') || title.includes('thành viên') || title.includes('lời mời')) {
      return 'Thành viên nhóm';
    }
    if (type.includes('COMMENT') || title.includes('bình luận')) {
      return 'Thảo luận nhóm';
    }
    if (type.includes('GROUP_EXPENSE') || title.includes('chi nhóm')) {
      return 'Chi tiêu nhóm';
    }
    if (type.includes('REPORT') || type.includes('WEEKLY_SUMMARY') || title.includes('báo cáo')) {
      return 'Báo cáo định kỳ';
    }
    if (type.includes('ANOMALY') || type.includes('INSIGHT') || title.includes('phân tích')) {
      return 'Phân tích AI';
    }
    if (type.includes('TRANSACTION') || type.includes('EXPENSE') || title.includes('giao dịch') || title.includes('chi tiêu')) {
      return 'Biến động giao dịch';
    }
    if (type.includes('SECURITY') || type.includes('AUTH') || title.includes('bảo mật') || title.includes('đăng nhập')) {
      return 'Bảo mật tài khoản';
    }
    return 'Thông báo hệ thống';
  };

  const formatFullDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins} · ${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const paddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 12);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <View style={styles.screen}>
      {/* Làm mờ toàn bộ nội dung xung quanh khi đang mở Modal chi tiết thông báo để người dùng tập trung tối đa */}
      <View
        style={[
          styles.backgroundContentWrap,
          Boolean(selectedNotif) && styles.backgroundDimmedWhenModalOpen,
        ]}
        pointerEvents={selectedNotif ? 'none' : 'auto'}
      >
        {/* Header thanh lịch nền trắng tràn chuẩn tai thỏ/status bar */}
        <View style={[styles.header, { paddingTop }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {onBack && (
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                hitSlop={8}
                accessibilityLabel="Quay lại"
              >
                <FinanceIcon name="chevron-left" size={20} color="#047857" />
              </Pressable>
            )}
            <Text style={styles.headerTitle}>Thông báo</Text>
          </View>

          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FinanceIcon name="check" size={15} color="#059669" />
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </Pressable>
        </View>

        {/* Thanh tab bộ lọc */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Danh sách thông báo chia theo phần (Section) */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <FinanceIcon name="bell" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptySubtitle}>
            Các tin tức, lời nhắc và biến động sẽ xuất hiện tại đây khi phát sinh.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          contentContainerStyle={[styles.listContent, { paddingBottom: paddingBottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#047857']}
              tintColor="#047857"
            />
          }
          renderItem={({ item: section }) => (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((item) => {
                const visual = getVisual(item);
                const timeStr = formatItemTime(item.createdAt);

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [
                      styles.itemCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* Dấu chấm xanh unread nếu chưa đọc */}
                    <View style={styles.statusCol}>
                      {!item.isRead ? (
                        <View style={styles.greenDot} />
                      ) : (
                        <View style={styles.emptyDot} />
                      )}
                    </View>

                    {/* Khung Icon bo tròn màu pastel */}
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: visual.iconBg },
                      ]}
                    >
                      <FinanceIcon
                        name={visual.icon}
                        size={22}
                        color={visual.iconColor}
                      />
                    </View>

                    {/* Nội dung thông báo */}
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {!!timeStr && (
                          <Text style={styles.itemTime}>{timeStr}</Text>
                        )}
                      </View>
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                      {Boolean(item.actionText) && (
                        <Pressable
                          onPress={() => {
                            if (!item.isRead) {
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
                              );
                              notificationApi.markAsRead(item.id);
                            }
                            handleNavigateFromNotif(item);
                          }}
                          style={({ pressed }) => [
                            styles.inlineActionChip,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.inlineActionChipText}>
                            {item.actionText} →
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Mũi tên dẫn tới xem chi tiết */}
                    <View style={styles.arrowBox}>
                      <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}
      </View>

      {/* Modal xem chi tiết thông báo với lớp nền làm mờ sâu toàn bộ xung quanh */}
      <Modal
        visible={Boolean(selectedNotif)}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedNotif(null)}
          >
            <View style={styles.modalBackdropDimLayer} />
          </Pressable>
          {selectedNotif && (
            <View style={styles.modalContainer}>
              {/* Header loại thông báo */}
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalIconBox,
                    { backgroundColor: getVisual(selectedNotif).iconBg },
                  ]}
                >
                  <FinanceIcon
                    name={getVisual(selectedNotif).icon}
                    size={24}
                    color={getVisual(selectedNotif).iconColor}
                  />
                </View>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalCategoryLabel}>
                    {getCategoryLabel(selectedNotif)}
                  </Text>
                  <Text style={styles.modalHeaderSubTitle}>
                    Chi tiết thông báo
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedNotif(null)}
                  style={({ pressed }) => [
                    styles.modalCloseBtn,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={8}
                >
                  <FinanceIcon name="close" size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Dòng thời gian & nhãn trạng thái */}
              <View style={styles.modalMetaRow}>
                <View style={styles.modalTimeWrap}>
                  <FinanceIcon name="clock" size={13} color="#64748B" />
                  <Text style={styles.modalTime}>
                    {formatFullDateTime(selectedNotif.createdAt)}
                  </Text>
                </View>
                <View style={styles.modalBadgesWrap}>
                  {(selectedNotif.priority === 'HIGH' || selectedNotif.priority === 'URGENT') && (
                    <View style={styles.modalUrgentBadge}>
                      <Text style={styles.modalUrgentBadgeText}>Quan trọng</Text>
                    </View>
                  )}
                  <View style={styles.modalReadBadge}>
                    <Text style={styles.modalReadBadgeText}>Đã xem</Text>
                  </View>
                </View>
              </View>

              {/* Tiêu đề chính của thông báo */}
              <Text style={styles.modalSubjectTitle}>
                {selectedNotif.title}
              </Text>

              {/* Khung nội dung chi tiết */}
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>{selectedNotif.body}</Text>
              </View>

              {/* Chân modal: Nút Đóng & Nút Hành động chính */}
              <View style={styles.modalFooter}>
                <Pressable
                  onPress={() => setSelectedNotif(null)}
                  style={({ pressed }) => [
                    styles.modalCloseAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.modalCloseActionText}>Đóng</Text>
                </Pressable>

                {/* Nút hành động chính: Đi đến tính năng tương ứng */}
                <Pressable
                  onPress={() => handleNavigateFromNotif(selectedNotif)}
                  style={({ pressed }) => [
                    styles.modalGoBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.modalGoBtnText}>
                    {getActionLabel(selectedNotif)}
                  </Text>
                  <FinanceIcon name="chevron-right" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundContentWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundDimmedWhenModalOpen: {
    opacity: 0.18,
    transform: [{ scale: 0.985 }],
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  tabItem: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#047857',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
    marginLeft: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statusCol: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  emptyDot: {
    width: 7,
    height: 7,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  itemBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  inlineActionChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inlineActionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  arrowBox: {
    marginLeft: 6,
    paddingRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 16, 13, 0.78)',
  },
  modalBackdropDimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#020617',
    shadowOpacity: 0.42,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalCategoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  modalHeaderSubTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  modalBadgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalUrgentBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  modalUrgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalReadBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  modalReadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  modalSubjectTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCloseAction: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCloseActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  modalGoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#047857',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#047857',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalGoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
