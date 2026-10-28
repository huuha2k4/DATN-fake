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
      return { icon: 'bolt', bg: 'bg-rose-50 text-rose-600 border-rose-100', color: '#dc2626', label: 'Ngân sách' };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return { icon: 'spark', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', color: '#059669', label: 'Mục tiêu' };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return { icon: 'credit-card', bg: 'bg-pink-50 text-pink-600 border-pink-100', color: '#e11d48', label: 'Công nợ' };
    case 'TRANSACTION':
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return { icon: 'wallet', bg: 'bg-sky-50 text-sky-600 border-sky-100', color: '#2563eb', label: 'Giao dịch' };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return { icon: 'trend', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', color: '#16a34a', label: 'Báo cáo & Phân tích' };
    case 'SYSTEM':
    default:
      return { icon: 'bell', bg: 'bg-gray-100 text-gray-700 border-gray-200', color: '#4b5563', label: 'Hệ thống' };
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

export function NotificationScreen({ onNotify }: NotificationScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'HIGH' | 'BUDGET' | 'GOAL' | 'DEBT'>('ALL');
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

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.is_read;
    if (activeTab === 'HIGH') return item.priority === 'HIGH';
    if (activeTab === 'BUDGET') return item.type.includes('BUDGET');
    if (activeTab === 'GOAL') return item.type.includes('GOAL');
    if (activeTab === 'DEBT') return item.type.includes('DEBT');
    return true;
  });

  const highPriorityCount = notifications.filter((n) => n.priority === 'HIGH').length;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#07543f] border border-emerald-100">
            <FinanceIcon name="bell" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#14261e] dark:text-slate-100 m-0">Trung tâm Thông báo</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-[#07543f] dark:text-emerald-400">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>
            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 m-0">
              Cập nhật nhắc nhở tài chính, biến động ngân sách, công nợ và mục tiêu tiết kiệm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-xs font-semibold text-[#07543f] dark:text-emerald-300 hover:bg-emerald-100 transition"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e2ece5] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#718579] dark:text-slate-400 font-medium">Tổng thông báo</p>
            <strong className="text-base font-bold text-[#14261e] dark:text-slate-100">{notifications.length}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
            <FinanceIcon name="bell" size={16} />
          </span>
        </div>

        <div className="rounded-xl border border-[#e2ece5] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#718579] dark:text-slate-400 font-medium">Chưa đọc</p>
            <strong className="text-base font-bold text-[#07543f] dark:text-emerald-400">{unreadCount}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-400">
            <FinanceIcon name="spark" size={16} />
          </span>
        </div>

        <div className="rounded-xl border border-[#e2ece5] dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#718579] dark:text-slate-400 font-medium">Ưu tiên cao</p>
            <strong className="text-base font-bold text-rose-600 dark:text-rose-400">{highPriorityCount}</strong>
          </div>
          <span className="grid size-8 place-items-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <FinanceIcon name="bolt" size={16} />
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#e2ece5] dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'ALL'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('UNREAD')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'UNREAD'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HIGH')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'HIGH'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Quan trọng ({highPriorityCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BUDGET')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'BUDGET'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Ngân sách
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('GOAL')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'GOAL'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Mục tiêu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DEBT')}
          className={`h-8 px-3.5 rounded-full text-xs font-semibold transition ${
            activeTab === 'DEBT'
              ? 'bg-[#07543f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
          }`}
        >
          Công nợ
        </button>
      </div>

      {/* Notification List */}
      <div className="flex flex-col gap-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 text-xs">
            <FinanceIcon name="refresh" size={24} className="animate-spin text-[#07543f]" />
            <span className="mt-2">Đang tải thông báo...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-12 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-500 mb-3">
              <FinanceIcon name="bell" size={24} />
            </div>
            <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-200">Không có thông báo nào</h3>
            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1">
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
                    : 'bg-white dark:bg-slate-900 border-[#e5ede7] dark:border-slate-800 hover:bg-[#fafcfa] dark:hover:bg-slate-850'
                } ${item.priority === 'HIGH' ? 'border-l-4 border-l-rose-500' : ''}`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className={`grid size-10 place-items-center rounded-xl shrink-0 border ${visual.bg}`}>
                    <FinanceIcon name={visual.icon} size={18} />
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#718579] dark:text-slate-400">
                        {visual.label}
                      </span>
                      <span className="text-[11px] text-gray-400">·</span>
                      <span className="text-[11px] text-[#718579] dark:text-slate-400">
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {item.priority === 'HIGH' && (
                        <span className="rounded-md bg-rose-100 dark:bg-rose-950 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          Khẩn cấp
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 mt-0.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#516458] dark:text-slate-300 mt-1 leading-relaxed">
                      {item.body}
                    </p>

                    {item.action_text && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-[#07543f] dark:text-emerald-300 hover:bg-emerald-100 transition">
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
