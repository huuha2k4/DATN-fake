import { FinanceIcon, type IconName } from './FinanceIcon';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  itemName?: string;
  itemTypeLabel?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  iconName?: IconName;
}

export function ConfirmDeleteModal({
  isOpen,
  title = 'Xác nhận xóa?',
  subtitle = 'Hành động này không thể hoàn tác',
  itemName,
  itemTypeLabel = 'Mục đã chọn',
  message,
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  isDeleting = false,
  onConfirm,
  onClose,
  iconName = 'trash',
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#14261e] p-6 shadow-2xl border border-gray-100 dark:border-white/10 transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
            <FinanceIcon name={iconName} size={22} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">{title}</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {itemName && (
          <div className="mt-4 rounded-xl bg-[#fafbfa] dark:bg-black/20 p-3.5 border border-[#E2E8F0] dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B] dark:text-slate-400">{itemTypeLabel}:</span>
              <span className="font-bold text-[#0F172A] dark:text-white truncate max-w-[200px]" title={itemName}>
                {itemName}
              </span>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
          {message || (
            <>
              Bạn có chắc chắn muốn xóa vĩnh viễn{' '}
              <strong className="text-[#0F172A] dark:text-white">"{itemName || 'mục này'}"</strong> không?
            </>
          )}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="h-9 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-semibold text-[#495b50] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <FinanceIcon name="refresh" size={14} className="animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <FinanceIcon name={iconName} size={14} />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

