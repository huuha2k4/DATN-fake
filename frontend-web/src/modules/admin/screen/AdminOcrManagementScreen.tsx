import { useState } from 'react';
import { useAdminPage } from '../hooks/useAdminPage';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { adminApi } from '../api/adminApi';
import { AdminBadge, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { MonitoringTable, OperationMonitoringPanel } from '../components/OperationMonitoringPanel';
import { metric, monitorTime } from '../components/monitoringFormat';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export function AdminOcrManagementScreen() {
  return (
    <div className="space-y-5">
      <OperationMonitoringPanel service="ocr" archive={<ReceiptHistory />} />
    </div>
  );
}

function ReceiptHistory() {
  const overview = useMonitoringData(adminApi.getOcrOverview);
  const [review, setReview] = useState('');
  const list = useAdminPage(adminApi.listOcrReceipts, {
    size: 15,
    review: review === '' ? undefined : review === 'true',
  });
  const data = overview.value;

  return (
    <div className="space-y-5">
      {overview.error && !overview.loading && (
        <AdminNotice
          tone="rose"
          message={`${overview.error}${data ? ' Đang hiển thị số liệu cũ.' : ''}`}
          action={
            <button type="button" className="admin-btn-secondary admin-btn-sm" onClick={overview.reload}>
              Thử lại
            </button>
          }
        />
      )}

      <AdminSurface
        busy={overview.loading}
        headerVariant="mint"
        icon="receipt"
        title="Tổng hợp hóa đơn đã lưu"
        subtitle="Số liệu từ bảng hóa đơn (bao gồm dữ liệu trước khi có nhật ký vận hành, theo giờ Việt Nam)"
        action={
          <button
            type="button"
            className="admin-btn-secondary admin-btn-sm"
            disabled={overview.loading || list.loading}
            onClick={() => {
              overview.reload();
              list.reload();
            }}
          >
            <FinanceIcon name="refresh" size={14} className={overview.loading ? 'animate-spin' : ''} />
            Làm mới lịch sử
          </button>
        }
      >
        <AdminStatStrip
          variant="pastel"
          className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-3"
          items={[
            { label: 'Đã lưu', value: metric(data?.totalScanned), icon: 'receipt', tone: 'sky' },
            { label: 'Lưu hôm nay', value: metric(data?.scannedToday), icon: 'layers', tone: 'violet' },
            { label: 'Lưu tháng này', value: metric(data?.scannedThisMonth), icon: 'calendar', tone: 'emerald' },
            { label: 'Cần kiểm tra', value: metric(data?.needReviewCount), icon: 'search', tone: 'amber' },
            { label: 'Đã liên kết giao dịch', value: metric(data?.linkedTransactions), icon: 'wallet', tone: 'sky' },
            {
              label: 'Tỉ lệ chính xác trung bình',
              icon: 'check',
              tone: 'violet',
              value: data?.averageConfidence == null ? 'N/A' : metric(data.averageConfidence * 100, '%'),
            },
          ]}
        />
      </AdminSurface>

      <AdminSurface
        noPadding
        busy={list.loading}
        headerVariant="mint"
        icon="receipt"
        title="Danh sách hóa đơn"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
                <FinanceIcon name="search" size={14} />
              </span>
              <input
                aria-label="Tìm kiếm mã hóa đơn"
                placeholder="Tìm kiếm mã hóa đơn…"
                className="admin-input w-52 pl-9"
                type="search"
                value={list.search}
                maxLength={36}
                onChange={(event) => list.setSearch(event.target.value.replace(/[^a-fA-F0-9-]/g, ''))}
              />
            </div>
            <select
              aria-label="Kiểm tra thủ công"
              className="admin-select"
              value={review}
              onChange={(event) => {
                setReview(event.target.value);
                list.setPage(0);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="false">Đạt</option>
              <option value="true">Cần kiểm tra</option>
            </select>
          </div>
        }
      >
        {(list.loading || list.error) && list.data && (
          <p role="status" className="px-4 py-2 text-xs text-[var(--admin-ink-muted)] border-b border-[var(--admin-border)] m-0">
            Đang hiển thị dữ liệu lần tải trước.
          </p>
        )}
        <MonitoringTable
          headers={['Mã hóa đơn', 'Thời điểm lưu', 'Độ tin cậy', 'Kiểm tra thủ công']}
          empty={
            list.loading
              ? 'Đang tải hóa đơn…'
              : list.error
              ? 'Không thể tải hóa đơn.'
              : 'Chưa có hóa đơn khớp bộ lọc.'
          }
          rows={(list.data?.content ?? []).map((row) => [
            <code className="break-all text-xs">{row.id}</code>,
            <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(row.createdAt)}</span>,
            <span className="tabular-nums font-medium">
              {row.confidence == null ? 'N/A' : metric(row.confidence * 100, '%')}
            </span>,
            row.needsReview ? (
              <AdminBadge tone="amber">Cần kiểm tra</AdminBadge>
            ) : (
              <AdminBadge tone="emerald">Đạt</AdminBadge>
            ),
          ])}
        />
        <AdminPageFooter
          page={list.page}
          totalPages={list.data?.totalPages ?? 0}
          loading={list.loading}
          error={list.error}
          onPage={list.setPage}
          onRetry={list.reload}
        />
      </AdminSurface>
    </div>
  );
}
