import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import {
  notificationApi,
  type NotificationItem,
  type NotificationType,
} from '../api/notificationApi';
import { NotificationDetailModal } from './NotificationDetailModal';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  onNotify?: (message: string) => void;
}



// Helper to map notification type to icon & color with dark mode classes
interface VisualConfig {
  icon: IconName;
  bgClass: string;
  colorClass: string;
}

function getNotificationVisual(type: NotificationType): VisualConfig {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_EXCEEDED':
      return {
        icon: 'alert-triangle',
        bgClass: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60',
        colorClass: 'text-rose-600 dark:text-rose-400',
      };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return {
        icon: 'target',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return {
        icon: 'handshake',
        bgClass: 'bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/60',
        colorClass: 'text-pink-600 dark:text-pink-400',
      };
    case 'TRANSACTION':
      return {
        icon: 'receipt',
        bgClass: 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60',
        colorClass: 'text-sky-600 dark:text-sky-400',
      };
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return {
        icon: 'clock',
        bgClass: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60',
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return {
        icon: 'analytics',
        bgClass: 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60',
        colorClass: 'text-teal-600 dark:text-teal-400',
      };
    case 'GROUP_INVITATION':
      return {
        icon: 'user-plus',
        bgClass: 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60',
        colorClass: 'text-sky-600 dark:text-sky-400',
      };
    case 'GROUP_EXPENSE':
      return {
        icon: 'group',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'GROUP_COMMENT':
      return {
        icon: 'message-square',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
      };
    case 'CHILD_MONEY_REQUEST':
    case 'CHILD_REQUEST_RESPONDED':
      return {
        icon: 'hand-coins',
        bgClass: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60',
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'CHILD_CHORE_COMPLETED':
    case 'CHILD_CHORE_ASSIGNED':
      return {
        icon: 'award',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'CHILD_MONEY_RECEIVED':
      return {
        icon: 'gift',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'SYSTEM':
    default:
      return {
        icon: 'megaphone',
        bgClass: 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
        colorClass: 'text-gray-700 dark:text-slate-300',
      };
  }
}

// Relative time in Vietnamese
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

export function NotificationDropdown({ onNotify }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'HIGH'>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [viewingItem, setViewingItem] = useState<NotificationItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load real notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ page_size: 30 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count ?? (res.notifications || []).filter((n) => !n.is_read).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time polling for notifications (every 10 seconds)
    const interval = setInterval(async () => {
      try {
        const res = await notificationApi.getNotifications({ page_size: 15 });
        if (res.notifications) {
          setNotifications(res.notifications);
          setUnreadCount(res.unread_count ?? res.notifications.filter((n) => !n.is_read).length);
        }
      } catch {
        // Silently ignore background polling failure
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter list by tab
  const filteredList = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.is_read;
    if (activeTab === 'HIGH') return item.priority === 'HIGH';
    return true;
  });

  // Mark 1 as read & open detail modal
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await notificationApi.markAsRead(item.id);
    }

    // Open detail modal to read full content
    setViewingItem({ ...item, is_read: true });
    setIsOpen(false);
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await notificationApi.markAllAsRead();
    if (onNotify) onNotify('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  return (
    <div className="notification-container" ref={containerRef}>
      {/* Bell Button with Unread Badge */}
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'is-active' : ''}`}
        aria-label="Thông báo"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Trung tâm thông báo"
      >
        <FinanceIcon name="bell" size={19} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Pop-over Dropdown Panel */}
      {isOpen && (
        <div className="notification-panel" role="dialog" aria-label="Hộp thư thông báo">
          {/* Header */}
          <div className="notification-panel-header">
            <div className="notification-title-wrap">
              <h3 className="notification-title">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="notification-count-tag">{unreadCount} mới</span>
              )}
            </div>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-action-link"
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả là đã đọc"
                >
                  Đã đọc tất cả
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notification-tabs">
            <button
              type="button"
              className={`notification-tab-btn ${activeTab === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              className={`notification-tab-btn ${activeTab === 'UNREAD' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('UNREAD')}
            >
              Chưa đọc ({notifications.filter((n) => !n.is_read).length})
            </button>
            <button
              type="button"
              className={`notification-tab-btn ${activeTab === 'HIGH' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('HIGH')}
            >
              Quan trọng ({notifications.filter((n) => n.priority === 'HIGH').length})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="notification-list">
            {filteredList.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <FinanceIcon name="bell" size={24} />
                </div>
                <p className="notification-empty-title">Không có thông báo nào</p>
                <p className="notification-empty-desc">
                  {activeTab === 'UNREAD'
                    ? 'Bạn đã đọc hết tất cả thông báo.'
                    : activeTab === 'HIGH'
                    ? 'Không có thông báo mức độ ưu tiên cao.'
                    : 'Hộp thư thông báo của bạn hiện đang trống.'}
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const visual = getNotificationVisual(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`notification-item ${!item.is_read ? 'is-unread' : ''} ${
                      item.priority === 'HIGH' ? 'is-high' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`notification-icon-box ${visual.bgClass} ${visual.colorClass}`}
                    >
                      <FinanceIcon name={visual.icon} size={17} />
                    </div>

                    {/* Content */}
                    <div className="notification-content">
                      <div className="notification-item-title-row">
                        <h4 className="notification-item-title">{item.title}</h4>
                        <span className="notification-item-time">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="notification-item-body">{item.body}</p>

                      {/* Action CTA link if available */}
                      {item.action_text && (
                        <div className="notification-action-btn-row">
                          <span className="notification-cta-btn">
                            {item.action_text} →
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {!item.is_read && <span className="notification-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="notification-panel-footer">
            <span>FinAI Notification Center</span>
            <button
              type="button"
              className="notification-action-link"
              onClick={fetchNotifications}
              disabled={loading}
              title="Làm mới danh sách"
            >
              {loading ? 'Đang tải...' : 'Làm mới ↻'}
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
    </div>
  );
}
