import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import {
  notificationApi,
  type NotificationItem,
  type NotificationType,
} from '../api/notificationApi';
import { NotificationDetailModal } from '../components/NotificationDetailModal';

interface NotificationScreenProps {
  onNotify: (message: string) => void;
}

// Visual mapping
function getNotificationVisual(type: NotificationType): { icon: IconName; bg: string; color: string; label: string } {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_EXCEEDED':
      return {
        icon: 'alert-triangle',
        bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60',
        color: '#dc2626',
        label: 'Ngân sách',
      };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return {
        icon: 'target',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
        color: '#059669',
        label: 'Mục tiêu',
      };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return {
        icon: 'handshake',
        bg: 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/60',
        color: '#e11d48',
        label: 'Công nợ',
      };
    case 'TRANSACTION':
      return {
        icon: 'receipt',
        bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/60',
        color: '#2563eb',
        label: 'Giao dịch',
      };
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return {
        icon: 'clock',
        bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60',
        color: '#d97706',
        label: 'Thanh toán định kỳ',
      };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return {
        icon: 'analytics',
        bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/60',
        color: '#16a34a',
        label: 'Báo cáo & Phân tích',
      };
    case 'GROUP_INVITATION':
      return {
        icon: 'user-plus',
        bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/60',
        color: '#0284c7',
        label: 'Lời mời nhóm',
      };
    case 'GROUP_EXPENSE':
      return {
        icon: 'group',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
        color: '#059669',
        label: 'Chi tiêu nhóm',
      };
    case 'GROUP_COMMENT':
      return {
        icon: 'message-square',
        bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60',
        color: '#6366f1',
        label: 'Bình luận nhóm',
      };
    case 'CHILD_MONEY_REQUEST':
      return {
        icon: 'hand-coins',
        bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60',
        color: '#d97706',
        label: 'Yêu cầu của con',
      };
    case 'CHILD_CHORE_COMPLETED':
      return {
        icon: 'award',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
        color: '#059669',
        label: 'Nhiệm vụ của con',
      };
    case 'CHILD_MONEY_RECEIVED':
      return {
        icon: 'gift',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
        color: '#059669',
        label: 'Cộng tiền vào ví',
      };
    case 'CHILD_REQUEST_RESPONDED':
      return {
        icon: 'hand-coins',
        bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60',
        color: '#d97706',
        label: 'Phản hồi yêu cầu',
      };
    case 'CHILD_CHORE_ASSIGNED':
      return {
        icon: 'award',
        bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60',
        color: '#6366f1',
        label: 'Nhiệm vụ mới',
      };
    case 'SYSTEM':
    default:
      return {
        icon: 'megaphone',
        bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
        color: '#4b5563',
        label: 'Hệ thống',
      };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 172800) return 'Hôm qua';
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch {
    return 'Gần đây';
  }
}

type NotificationTab = 'ALL' | 'GROUP' | 'TRANSACTION' | 'SYSTEM';

function matchesNotificationTab(typeRaw: string | undefined, tab: NotificationTab): boolean {
  if (tab === 'ALL') return true;
  const type = (typeRaw || '').toUpperCase();
  if (tab === 'GROUP') {
    return (
      type.includes('GROUP') ||
      type.includes('FUND') ||
      type.includes('MEMBER') ||
      type.includes('KID') ||
      type.includes('CHILD') ||
      type.includes('CHORE')
    );
  }
  if (tab === 'TRANSACTION') {
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
  if (tab === 'SYSTEM') {
    return (
      type.includes('SYSTEM') ||
      type.includes('ADMIN') ||
      type.includes('BROADCAST') ||
      type.includes('SECURITY') ||
      type.includes('AUTH') ||
      type.includes('REPORT') ||
      type.includes('INSIGHT') ||
      type.includes('FEATURE') ||
      type.includes('ANOMALY') ||
      type.includes('SUMMARY')
    );
  }
  return true;
}

export function NotificationScreen({ onNotify }: NotificationScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [viewingItem, setViewingItem] = useState<NotificationItem | null>(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ page_size: 50 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count ?? (res.notifications || []).filter((n) => !n.is_read).length);
    } catch {
      onNotify('Không thể tải danh sách thông báo từ máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await notificationApi.markAsRead(item.id);
    }
    // Open full detail modal
    setViewingItem({ ...item, is_read: true });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await notificationApi.markAllAsRead();
    onNotify('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const filteredNotifications = notifications.filter((item) => matchesNotificationTab(item.type, activeTab));

  const highPriorityCount = notifications.filter((n) => n.priority === 'HIGH').length;
  const groupCount = notifications.filter((n) => matchesNotificationTab(n.type, 'GROUP')).length;
  const transactionCount = notifications.filter((n) => matchesNotificationTab(n.type, 'TRANSACTION')).length;
  const systemCount = notifications.filter((n) => matchesNotificationTab(n.type, 'SYSTEM')).length;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#007F53] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
            <FinanceIcon name="bell" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 m-0">Trung tâm Thông báo</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-[#007F53] dark:text-emerald-400">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 m-0">
              Cập nhật nhắc nhở tài chính, biến động ngân sách, công nợ và mục tiêu tiết kiệm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-xs font-semibold text-[#007F53] dark:text-emerald-300 hover:bg-emerald-100 transition"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">Tổng thông báo</p>
            <strong className="text-base font-bold text-[#0F172A] dark:text-slate-100">{notifications.length}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
            <FinanceIcon name="bell" size={16} />
          </span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">Chưa đọc</p>
            <strong className="text-base font-bold text-[#007F53] dark:text-emerald-400">{unreadCount}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#007F53] dark:text-emerald-400">
            <FinanceIcon name="spark" size={16} />
          </span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">Ưu tiên cao</p>
            <strong className="text-base font-bold text-rose-600 dark:text-rose-400">{highPriorityCount}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <FinanceIcon name="bolt" size={16} />
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] dark:border-slate-800 pb-2">
        {([
          ['ALL', `Tất cả (${notifications.length})`],
          ['GROUP', `Nhóm (${groupCount})`],
          ['TRANSACTION', `Giao dịch (${transactionCount})`],
          ['SYSTEM', `Hệ thống (${systemCount})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
              activeTab === key
                ? 'bg-[#007F53] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="flex flex-col gap-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 text-xs">
            <FinanceIcon name="refresh" size={24} className="animate-spin text-[#007F53]" />
            <span className="mt-2">Đang tải thông báo...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-12 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-500 mb-3">
              <FinanceIcon name="bell" size={24} />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-200">Không có thông báo nào</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Bạn đã xem hết các thông báo trong mục này.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const visual = getNotificationVisual(item.type);
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group flex items-start justify-between gap-4 rounded-2xl border p-4 transition cursor-pointer ${
                  !item.is_read
                    ? 'bg-[#f4fbf6] dark:bg-emerald-950/20 border-[#cde8d5] dark:border-emerald-800/40 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-[#e5ede7] dark:border-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-900'
                } ${item.priority === 'HIGH' ? 'border-l-4 border-l-rose-500' : ''}`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className={`grid size-10 place-items-center rounded-xl shrink-0 border ${visual.bg}`}>
                    <FinanceIcon name={visual.icon} size={18} />
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                        {visual.label}
                      </span>
                      <span className="text-[11px] text-gray-400">·</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {item.priority === 'HIGH' && (
                        <span className="rounded-md bg-rose-100 dark:bg-rose-950 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          Khẩn cấp
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 mt-0.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#516458] dark:text-slate-300 mt-1 leading-relaxed">
                      {item.body}
                    </p>

                    {item.action_text && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-[#007F53] dark:text-emerald-300 hover:bg-emerald-100 transition">
                          {item.action_text} →
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!item.is_read && (
                    <span className="size-2.5 rounded-full bg-emerald-500" title="Chưa đọc" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Xem chi tiết thông báo */}
      <NotificationDetailModal 
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        onNavigateAction={(url) => {
          let target = url;
          if (target.startsWith('app://')) {
            target = target.replace('app://', '/');
          }
          navigate(target);
        }}
      />
    </main>
  );
}
