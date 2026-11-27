import type { ConfirmDeleteModalProps } from '../../core/components/ConfirmDeleteModal';
import { AdminDialog } from './AdminDialog';

export function AdminConfirmDialog({ isOpen, title = 'Xác nhận thao tác', subtitle, itemName, message,
  confirmText = 'Xác nhận xóa', cancelText = 'Hủy', isDeleting = false, onClose, onConfirm, error }: ConfirmDeleteModalProps & { error?: string }) {
  if (!isOpen) return null;
  return <AdminDialog label={title} pending={isDeleting} onClose={onClose}>
    <div className="admin-dialog-body space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>}
      {itemName && <p className="admin-wrap text-sm font-semibold">{itemName}</p>}
      {message && <p className="admin-wrap text-sm">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="admin-dialog-actions">
        <button type="button" className="admin-secondary" disabled={isDeleting} onClick={onClose} autoFocus>{cancelText}</button>
        <button type="button" className="admin-danger" disabled={isDeleting} onClick={() => void onConfirm()}>
          {isDeleting ? 'Đang xử lý…' : confirmText}
        </button>
      </div>
    </div>
  </AdminDialog>;
}
