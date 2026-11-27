import { FinanceIcon } from '../../core/components/FinanceIcon';

type PageFooterProps = {
  page: number;
  totalPages: number;
  loading: boolean;
  error?: string;
  onPage: (page: number) => void;
  onRetry: () => void;
};

export function AdminPageFooter({ page, totalPages, loading, error, onPage, onRetry }: PageFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-5 py-3 text-xs text-[var(--admin-ink-muted)]">
      <span role="status" className="tabular-nums">
        {loading ? 'Đang tải dữ liệu…' : error ?? (totalPages > 0 ? `Trang ${page + 1} / ${totalPages}` : '')}
      </span>
      <div className="flex items-center gap-2">
        {error && (
          <button type="button" onClick={onRetry} className="admin-btn-secondary admin-btn-sm">
            <FinanceIcon name="refresh" size={13} />
            Thử lại
          </button>
        )}
        {totalPages > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={loading || page <= 0}
              className="admin-btn-secondary admin-btn-sm"
            >
              <FinanceIcon name="chevron-left" size={13} />
              Trước
            </button>
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={loading || page >= totalPages - 1}
              className="admin-btn-secondary admin-btn-sm"
            >
              Sau
              <FinanceIcon name="chevron-right" size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
