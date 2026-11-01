import { createPortal } from 'react-dom';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import type { NotificationItem, NotificationType } from '../api/notificationApi';
import './NotificationDetailModal.css';

interface NotificationDetailModalProps {
  item: NotificationItem | null;
  onClose: () => void;
  onNavigateAction?: (url: string) => void;
}

function getNotificationVisual(type: NotificationType): { icon: IconName; bgClass: string; colorClass: string; label: string } {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_EXCEEDED':
      return {
        icon: 'bolt',
        bgClass: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60',
        colorClass: 'text-rose-600 dark:text-rose-400',
        label: 'Cảnh báo ngân sách',
      };
    case 'GOAL_MILESTONE':
    case 'GOAL_ACHIEVED':
    case 'GOAL_REMINDER':
      return {
        icon: 'spark',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        label: 'Mục tiêu tài chính',
      };
    case 'DEBT_REMINDER':
    case 'DEBT_OVERDUE':
      return {
        icon: 'credit-card',
        bgClass: 'bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900/60',
        colorClass: 'text-pink-600 dark:text-pink-400',
        label: 'Quản lý công nợ',
      };
    case 'TRANSACTION':
    case 'RECURRING_DUE':
    case 'RECURRING_FAILED':
      return {
        icon: 'wallet',
        bgClass: 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60',
        colorClass: 'text-sky-600 dark:text-sky-400',
        label: 'Giao dịch thu & chi',
      };
    case 'ANOMALY_DETECTED':
    case 'INSIGHT_GENERATED':
    case 'WEEKLY_SUMMARY':
    case 'MONTHLY_REPORT':
      return {
        icon: 'trend',
        bgClass: 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60',
        colorClass: 'text-teal-600 dark:text-teal-400',
        label: 'Báo cáo & Phân tích',
      };
    case 'SYSTEM':
    default:
      return {
        icon: 'bell',
        bgClass: 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
        colorClass: 'text-gray-700 dark:text-slate-300',
        label: 'Hệ thống FinAI',
      };
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
              className={`notif-modal-icon-badge ${visual.bgClass} ${visual.colorClass}`}
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
