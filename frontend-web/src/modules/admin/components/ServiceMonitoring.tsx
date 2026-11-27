import { Link } from 'react-router-dom';
import { monitoringApi, type ServiceHealth, type ServiceStatus } from '../api/monitoringApi';
import { AdminBadge, AdminNotice, AdminStatStrip, AdminSurface, type BadgeTone } from './AdminPrimitives';
import { MonitoringTable } from './OperationMonitoringPanel';
import { metric, monitorTime } from './monitoringFormat';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { FinanceIcon } from '../../core/components/FinanceIcon';

const labels: Record<string, string> = {
  BACKEND: 'Spring Boot',
  POSTGRESQL: 'PostgreSQL',
  REDIS: 'Redis',
  FINAI: 'FinAI Service',
  OCR: 'OCR Service',
  NGINX: 'Nginx',
  FRONTEND: 'Frontend Web',
};

const states: Record<ServiceStatus, [string, BadgeTone]> = {
  UP: ['Phản hồi', 'emerald'],
  DEGRADED: ['Có cảnh báo', 'amber'],
  DOWN: ['Không khả dụng', 'rose'],
  DISABLED: ['Đã tắt', 'slate'],
  NOT_CONFIGURED: ['Chưa cấu hình', 'slate'],
  UNKNOWN: ['Chưa xác định', 'slate'],
};

export function StatusLabel({ status }: { status: ServiceStatus }) {
  const [label, tone] = states[status];
  return <AdminBadge tone={tone}>{label}</AdminBadge>;
}

export function HealthMatrix({
  health,
  refresh,
  loading,
  old,
  errorRates,
}: {
  health: ServiceHealth;
  refresh: () => void;
  loading: boolean;
  old: boolean;
  errorRates?: Record<string, number | null>;
}) {
  return (
    <AdminSurface
      busy={loading}
      noPadding
      icon="layers"
      headerVariant="mint"
      title="Ma trận dịch vụ"
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusLabel status={health.status} />
          <span>{monitorTime(health.checkedAt)}</span>
          <span>·</span>
          <span>
            {health.stale || old
              ? 'Kết quả cũ'
              : health.cacheHit
                ? 'Kết quả lưu đệm'
                : 'Vừa kiểm tra'}
          </span>
        </span>
      }
      action={
        <button
          className="admin-btn-secondary admin-btn-sm"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <FinanceIcon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới tình trạng
        </button>
      }
    >
      <MonitoringTable
        headers={['Dịch vụ', 'Trạng thái', 'Độ trễ', 'Kiểm tra lúc', 'Thành công gần nhất', 'Tỷ lệ lỗi (24h)', 'Phạm vi']}
        rows={health.services.map((item) => {
          const rate = errorRates?.[item.name];
          return [
            <span className="font-medium text-[var(--admin-ink)]">{labels[item.name] ?? item.name}</span>,
            <StatusLabel status={item.status} />,
            <span className="tabular-nums">{metric(item.latencyMs, ' ms')}</span>,
            <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(item.checkedAt)}</span>,
            <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(item.lastSuccessAt)}</span>,
            item.errorCode ? (
              <code className="rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 px-1.5 py-0.5 text-xs">
                {item.errorCode}
              </code>
            ) : (
              <span className="tabular-nums text-xs font-medium text-[var(--admin-ink)]">
                {rate != null ? metric(rate, '%') : '0,00%'}
              </span>
            ),
            <span className="text-xs text-[var(--admin-ink-muted)]">{item.scope}</span>,
          ];
        })}
      />
    </AdminSurface>
  );
}

export function DashboardOperations() {
  const { value, error, loading, reload } = useMonitoringData(monitoringApi.dashboard);
  return (
    <AdminSurface
      busy={loading}
      icon="shield"
      headerVariant="mint"
      title="Vận hành hôm nay"
      subtitle="Theo giờ Việt Nam – Tỷ lệ lỗi, tình trạng dịch vụ và các yêu cầu đã xử lý"
      action={
        <Link className="admin-detail-link" to="/admin/system-health">
          Chi tiết dịch vụ
          <FinanceIcon name="chevron-right" size={14} />
        </Link>
      }
    >
      <div className="space-y-4">
        {loading && (
          <p role="status" className="text-xs text-[var(--admin-ink-muted)]">
            {value ? 'Đang cập nhật số liệu…' : 'Đang tải chỉ số vận hành…'}
          </p>
        )}
        {error && !loading && (
          <AdminNotice
            tone="rose"
            message={`${error}${value ? ' Đang hiển thị số liệu cũ.' : ''}`}
            action={
              <button type="button" onClick={reload} className="admin-btn-secondary admin-btn-sm">
                Thử lại
              </button>
            }
          />
        )}
        <AdminStatStrip
          variant="pastel"
          items={[
            {
              label: 'Trạng thái dịch vụ',
              icon: 'shield',
              tone: value?.health.status === 'UP' ? 'emerald' : value?.health.status === 'DOWN' ? 'rose' : 'amber',
              value: value ? <StatusLabel status={value.health.status} /> : 'N/A',
              meta: value ? `Kiểm tra lúc: ${monitorTime(value.health.checkedAt)}` : undefined,
            },
            {
              label: 'Trợ lý FinAI hôm nay',
              icon: 'bot',
              tone: 'sky',
              value: metric(value?.finai_requests ?? 0),
              meta: value?.finai_error_rate != null ? `Tỷ lệ lỗi: ${metric(value.finai_error_rate, '%')}` : 'Theo dõi thời gian thực',
            },
            {
              label: 'Quét OCR hôm nay',
              icon: 'receipt',
              tone: 'violet',
              value: metric(value?.ocr_requests ?? 0),
              meta: value?.ocr_error_rate != null ? `Tỷ lệ lỗi: ${metric(value.ocr_error_rate, '%')}` : 'Theo dõi thời gian thực',
            },
            {
              label: 'Feedback chờ xử lý',
              icon: 'message',
              value: metric(value?.open_feedback),
              tone: 'amber',
              meta: 'Chờ tiếp nhận / đang xử lý',
            },
          ]}
        />
      </div>
    </AdminSurface>
  );
}
