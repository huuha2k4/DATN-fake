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



// Helper to map notification type to icon & color
function getNotificationVisual(type: NotificationType): { icon: IconName; bg: string; color: string } {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_EXCEEDED':
      return { icon: 'bolt', bg: '#fef2f2', color: '#dc2626' };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return { icon: 'spark', bg: '#ecfdf5', color: '#059669' };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return { icon: 'credit-card', bg: '#fff1f2', color: '#e11d48' };
    case 'TRANSACTION':
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return { icon: 'wallet', bg: '#eff6ff', color: '#2563eb' };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return { icon: 'trend', bg: '#f0fdf4', color: '#16a34a' };
    case 'SYSTEM':
    default:
      return { icon: 'bell', bg: '#f3f4f6', color: '#4b5563' };
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
                      className="notification-icon-box"
                      style={{ backgroundColor: visual.bg, color: visual.color }}
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
