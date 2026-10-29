import { createPortal } from 'react-dom';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import type { NotificationItem, NotificationType } from '../api/notificationApi';
import './NotificationDetailModal.css';

interface NotificationDetailModalProps {
  item: NotificationItem | null;
  onClose: () => void;
  onNavigateAction?: (url: string) => void;
}

function getNotificationVisual(type: NotificationType): { icon: IconName; bg: string; color: string; label: string } {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_EXCEEDED':
      return { icon: 'bolt', bg: 'bg-rose-50 text-rose-600 border-rose-100', color: '#dc2626', label: 'Cảnh báo ngân sách' };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return { icon: 'spark', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', color: '#059669', label: 'Mục tiêu tài chính' };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return { icon: 'credit-card', bg: 'bg-pink-50 text-pink-600 border-pink-100', color: '#e11d48', label: 'Quản lý công nợ' };
    case 'TRANSACTION':
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return { icon: 'wallet', bg: 'bg-sky-50 text-sky-600 border-sky-100', color: '#2563eb', label: 'Giao dịch thu & chi' };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return { icon: 'trend', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', color: '#16a34a', label: 'Báo cáo & Phân tích' };
    case 'SYSTEM':
    default:
      return { icon: 'bell', bg: 'bg-emerald-50 text-[#07543f] border-emerald-100', color: '#07543f', label: 'Hệ thống FinAI' };
  }
}

function formatFullTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function NotificationDetailModal({
  item,
  onClose,
  onNavigateAction,
}: NotificationDetailModalProps) {
  if (!item) return null;

  const visual = getNotificationVisual(item.type);

  const modalContent = (
    <div
      className="notif-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="notif-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notif-modal-header">
          <div className="notif-modal-header-left">
            <div
              className="notif-modal-icon-badge"
              style={{ backgroundColor: visual.bg, color: visual.color }}
            >
              <FinanceIcon name={visual.icon} size={22} />
            </div>
            <div>
              <span className="notif-modal-category">
                {visual.label}
              </span>
              <h3 className="notif-modal-title">
                Chi tiết thông báo
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="notif-modal-close-btn"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="notif-modal-body">
          <div className="notif-modal-meta-row">
            <span className="notif-modal-time">
              {formatFullTime(item.created_at)}
            </span>
            {item.priority === 'HIGH' && (
              <span className="notif-modal-badge is-high">
                Ưu tiên cao
              </span>
            )}
            {item.is_read ? (
              <span className="notif-modal-badge is-read">
                Đã đọc
              </span>
            ) : (
              <span className="notif-modal-badge is-unread">
                Chưa đọc
              </span>
            )}
          </div>

          <h4 className="notif-modal-subject">
            {item.title}
          </h4>

          <div className="notif-modal-message-box">
            {item.body}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="notif-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="notif-btn-secondary"
          >
            Đóng
          </button>

          {item.action_url && onNavigateAction && (
            <button
              type="button"
              onClick={() => {
                onNavigateAction(item.action_url!);
                onClose();
              }}
              className="notif-btn-primary"
            >
              {item.action_text || 'Khám phá ngay'} →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
