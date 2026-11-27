import { AdminTabs } from './AdminTabs';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminStatStrip, AdminSurface, type BadgeTone } from './AdminPrimitives';
import { useCallback, useState, type ReactNode } from 'react';
import { monitoringApi, type MetricRow, type OperationService, type Period } from '../api/monitoringApi';
import { useAdminPage } from '../hooks/useAdminPage';
import { AdminPageFooter } from './AdminPageFooter';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { dateOnly, metric, monitorTime, periodFor } from './monitoringFormat';
import { FinanceIcon } from '../../core/components/FinanceIcon';

const operations = {
  FINAI_ASSISTANT: 'Trợ lý FinAI', AI_BALANCE_FORECAST: 'Dự báo số dư',
  AI_FINANCIAL_FORECAST: 'Dự báo tài chính', AI_ANOMALY: 'Phát hiện bất thường',
  AI_BEHAVIOR: 'Phân tích hành vi', AI_RECOMMENDATIONS: 'Gợi ý tài chính',
  OCR_SCAN: 'Quét hóa đơn', OCR_TRANSACTION: 'Tạo giao dịch từ hóa đơn',
};
const outcomes: Record<string, [string, BadgeTone]> = {
  SUCCESS: ['Thành công', 'emerald'],
  FAILED: ['Thất bại', 'rose'],
  REJECTED: ['Từ chối đầu vào', 'amber'],
};
function feature(value: MetricRow[string]) {
  return operations[value as keyof typeof operations] ?? metric(value);
}
function outcome(value: MetricRow[string]) {
  const entry = outcomes[String(value)];
  return entry ? <AdminBadge tone={entry[1]}>{entry[0]}</AdminBadge> : metric(value);
}
function confidence(value: MetricRow[string]) {
  return typeof value === 'number' ? metric(value * 100, '%') : 'N/A';
}

export function MonitoringFacts({ items }: { items: [string, ReactNode][] }) {
  return <AdminStatStrip items={items.map(([label, value]) => ({ label, value }))} />;
}

export function MonitoringTable({ headers, rows, empty = 'Chưa có dữ liệu trong khoảng đã chọn.' }: {
  headers: string[]; rows: ReactNode[][]; empty?: string;
}) {
  if (!rows.length) return <AdminEmptyState icon="info" title={empty} />;
  return <div className="admin-table-wrap" role="region" aria-label={`Bảng ${headers[0]}`} tabIndex={0}>
    <table className="admin-table">
      <thead><tr>
        {headers.map(header => <th key={header} scope="col">{header}</th>)}
      </tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>
        {row.map((value, column) => <td key={headers[column]}>{value}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function Trend({ rows }: { rows: MetricRow[] }) {
  const groups = new Map<string, { requests: number; failed: number }>();
  for (const row of rows) {
    if (row.operation === 'OCR_TRANSACTION') continue;
    const day = String(row.local_date);
    const counts = groups.get(day) ?? { requests: 0, failed: 0 };
    counts.requests += Number(row.requests);
    counts.failed += Number(row.failed);
    groups.set(day, counts);
  }
  if (!groups.size) return <p className="text-sm text-slate-600 dark:text-slate-300">Chưa có mẫu để vẽ xu hướng.</p>;
  const scale = Math.max(...Array.from(groups.values(), point => point.requests));
  return <div className="max-h-80 overflow-auto" tabIndex={0} role="region" aria-label="Xu hướng theo ngày">
    <ul className="space-y-2 text-xs">
      {Array.from(groups, ([day, point]) => <li key={day} className="grid grid-cols-[5rem_minmax(3rem,1fr)_auto] items-center gap-3">
        <time dateTime={day}>{dateOnly.format(new Date(day))}</time>
        <span aria-hidden="true" className="h-2 rounded bg-slate-100 dark:bg-slate-800">
          <span className="block h-full rounded bg-emerald-600 dark:bg-emerald-400" style={{ width: `${point.requests / scale * 100}%` }} />
        </span>
        <span className="tabular-nums">{metric(point.requests)} yêu cầu · {metric(point.failed)} lỗi</span>
      </li>)}
    </ul>
  </div>;
}

const actionLabels: [string, string][] = [
  ['proposals', 'Đề xuất tạo'], ['pending_now', 'Đang chờ hiện tại'], ['confirmed', 'Đã xác nhận'],
  ['committed', 'Thực thi đã commit'], ['cancelled', 'Đã hủy'], ['expired', 'Đã hết hạn'], ['failed', 'Thực thi thất bại'],
];
const toolMetricLabels: Record<string, string> = {
  read_ok: 'READ thành công', read_error: 'READ thất bại', read_ms: 'Tổng thời gian READ (ms)', write_selected: 'WRITE được chọn',
};

type MonitoringTab = 'overview' | 'provider' | 'actions' | 'logs' | 'archive';
const commonTabs = [
  { id: 'overview', name: 'Tổng quan' },
  { id: 'logs', name: 'Nhật ký vận hành' },
] as const;

export function OperationMonitoringPanel({ service, archive }: { service: OperationService; archive: ReactNode }) {
  const ai = service === 'ai';
  const [tab, setTab] = useState<MonitoringTab>('archive');
  const tabs: { id: MonitoringTab; name: string }[] = [
    { id: 'archive', name: ai ? 'Phiên hội thoại' : 'Lịch sử hóa đơn' },
    commonTabs[0],
    ...(ai ? [{ id: 'provider', name: 'Provider & Model' }, { id: 'actions', name: 'Action Agent' }] as const : []),
    commonTabs[1],
  ];
  const [period, setPeriod] = useState(() => periodFor(7));
  const [custom, setCustom] = useState(period);
  const [preset, setPreset] = useState('7');
  const [selectedOutcome, setOutcome] = useState('');
  const [operation, setOperation] = useState('');
  const [model, setModel] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [validation, setValidation] = useState('');
  const load = useCallback((signal: AbortSignal) => monitoringApi.summary(service, period, signal), [service, period]);
  const summary = useMonitoringData(load);
  const list = useAdminPage(ai ? monitoringApi.aiRequests : monitoringApi.ocrRequests, {
    ...period, size: 15, sort, outcome: selectedOutcome, operation, model, error: errorCode,
  }, tab === 'logs');
  const aggregate = summary.value?.aggregate;
  const data = summary.value;
  const status = data?.health?.services.find(item => item.name === (ai ? 'FINAI' : 'OCR'));
  const updatePeriod = (next: Period) => {
    setValidation('');
    setPeriod(next);
    setErrorCode('');
    setModel('');
    list.setPage(0);
  };

  const hasTelemetry = Boolean(data?.firstObservedAt);
  const rawFacts: [string, string | number | null | undefined, string?][] = [
    ['Yêu cầu trong kỳ', aggregate?.requests as number | null],
    ['Yêu cầu hôm nay', data?.todayRequests],
    ['Người dùng trong kỳ', aggregate?.unique_users as number | null],
    ['Thành công', aggregate?.succeeded as number | null],
    ['Thất bại', aggregate?.failed as number | null],
    ['Từ chối đầu vào', aggregate?.rejected as number | null],
    ['Tỷ lệ thành công', aggregate?.success_rate as number | null, '%'],
    ['Trung bình', aggregate?.average_ms as number | null, ' ms'],
    ...(ai ? [
      ['Input token', aggregate?.input_tokens as number | null],
      ['Output token', aggregate?.output_tokens as number | null],
      ['Tổng token', aggregate?.total_tokens as number | null],
      ['Lượt gọi Gemini', aggregate?.provider_calls as number | null],
      ['Vòng gọi model', aggregate?.rounds as number | null],
      ['Retry Gemini', aggregate?.provider_retries as number | null],
    ] : [
      ['Hóa đơn lưu từ lượt quét', aggregate?.receipts_saved as number | null],
      ['Cần kiểm tra', aggregate?.needs_review as number | null],
      ['Độ tin cậy trung bình', aggregate?.average_confidence != null ? Number(aggregate.average_confidence) * 100 : null, '%'],
      ['Lượt xử lý engine', aggregate?.engine_calls as number | null],
      ['Thời gian engine TB', aggregate?.engine_average_ms as number | null, ' ms'],
    ]) as [string, string | number | null | undefined, string?][],
  ];
  const visibleFacts: [string, ReactNode][] = rawFacts
    .filter(([, val]) => val != null)
    .map(([label, val, suffix]) => [label, metric(val, suffix ?? '')]);
  if (aggregate?.p50_ms != null || aggregate?.p95_ms != null) {
    visibleFacts.push(['P50 / P95', `${metric(aggregate?.p50_ms, ' ms')} / ${metric(aggregate?.p95_ms, ' ms')}`]);
  }
  const models = [...new Set((data?.providers ?? []).flatMap(row => typeof row.model === 'string' ? [row.model] : []))];
  const errors = [...new Set((data?.errors ?? []).map(row => String(row.error_code)))];
  const headers = ['Request ID', 'Thời điểm', 'Chức năng', 'Kết quả', 'Thời gian', 'Mã lỗi',
    ...(ai ? ['Provider / model', 'Phản hồi', 'Input / output', 'Vòng model', 'Lượt gọi tool'] : ['OCR engine', 'Số lượt engine', 'Tổng thời gian engine', 'Tin cậy', 'Cần kiểm tra'])];

  return <div className="space-y-5">
    {hasTelemetry && (
      <AdminSurface
        busy={summary.loading}
        title={ai ? 'Vận hành FinAI' : 'Vận hành OCR'}
        subtitle={`Asia/Ho_Chi_Minh · Bắt đầu ghi nhận từ ${monitorTime(data?.firstObservedAt)}${status ? ` · Dịch vụ ${status.status}` : ''}${data?.health?.stale ? ' (kết quả kiểm tra cũ)' : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Khoảng thời gian"
              className="admin-select"
              value={preset}
              onChange={event => {
                const value = event.target.value;
                setPreset(value);
                if (value !== 'custom') {
                  const next = periodFor(Number(value));
                  setCustom(next);
                  updatePeriod(next);
                }
              }}
            >
              <option value="1">Hôm nay</option>
              <option value="7">7 ngày gần đây</option>
              <option value="30">30 ngày gần đây</option>
              <option value="custom">Tùy chọn ngày</option>
            </select>
            <button
              className="admin-btn-secondary"
              type="button"
              disabled={summary.loading || list.loading}
              onClick={() => { summary.reload(); list.reload(); }}
            >
              <FinanceIcon name="refresh" size={14} className={summary.loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {preset === 'custom' && (
            <form
              className="flex flex-wrap items-end gap-3 pb-1"
              onSubmit={event => {
                event.preventDefault();
                const days = (Date.parse(custom.to) - Date.parse(custom.from)) / 86_400_000;
                if (!Number.isFinite(days) || days < 0 || days >= 90) {
                  setValidation('Chọn khoảng thời gian từ 1 đến 90 ngày.');
                  return;
                }
                updatePeriod(custom);
              }}
            >
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Từ ngày</span>
                <input className="admin-input" type="date" required max={periodFor(1).to}
                  value={custom.from} onChange={event => setCustom({ ...custom, from: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Đến ngày</span>
                <input className="admin-input" type="date" required max={periodFor(1).to}
                  value={custom.to} onChange={event => setCustom({ ...custom, to: event.target.value })} />
              </label>
              <button type="submit" className="admin-btn-primary">Áp dụng</button>
            </form>
          )}
          {validation && <AdminNotice tone="rose" message={validation} />}
          {summary.error && !summary.loading && (
            <AdminNotice
              tone="rose"
              message={`${summary.error}${data ? ' Đang hiển thị số liệu cũ.' : ''}`}
              action={<button type="button" className="admin-btn-secondary admin-btn-sm" onClick={summary.reload}>Thử lại</button>}
            />
          )}
          <MonitoringFacts items={visibleFacts.slice(0, 6)} />
        </div>
      </AdminSurface>
    )}

    <AdminTabs<MonitoringTab> label={ai ? 'Dữ liệu FinAI' : 'Dữ liệu OCR'} items={tabs} value={tab} onChange={setTab}
      render={section => {
        if (section === 'archive') return archive;
        if (section === 'overview') return (
          <div className="space-y-5">
            {!hasTelemetry ? (
              <AdminSurface title={ai ? 'Telemetry vận hành FinAI' : 'Telemetry vận hành OCR'}>
                <AdminEmptyState
                  icon={ai ? 'bot' : 'receipt'}
                  title="Chưa có dữ liệu telemetry mới"
                  description={`Hệ thống sẽ tự động ghi nhận độ trễ, tỷ lệ thành công và nhật ký chi tiết ngay khi có lượt gọi ${ai ? 'FinAI' : 'OCR'} mới.`}
                />
              </AdminSurface>
            ) : (
              <>
                <AdminSurface
                  title="Chỉ số chi tiết & Xu hướng theo ngày"
                  subtitle={`Tỷ lệ tính trên yêu cầu thành công và thất bại · Percentile yêu cầu ≥ 20 mẫu${!ai ? ' · Điểm tin cậy do engine trả về' : ''}`}
                >
                  <div className="space-y-5">
                    {visibleFacts.length > 6 && <MonitoringFacts items={visibleFacts.slice(6)} />}
                    <Trend rows={data?.trend ?? []} />
                  </div>
                </AdminSurface>

                <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <AdminSurface title="Yêu cầu theo chức năng" noPadding>
                    <MonitoringTable
                      headers={['Chức năng', 'Yêu cầu', 'Thành công', 'Thất bại', 'Từ chối', 'Trung bình', 'Gần nhất']}
                      rows={(data?.operations ?? []).map(row => [
                        <span className="font-medium">{feature(row.operation)}</span>,
                        metric(row.requests), metric(row.succeeded), metric(row.failed), metric(row.rejected),
                        metric(row.average_ms, ' ms'),
                        <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(row.last_seen)}</span>,
                      ])}
                    />
                  </AdminSurface>

                  <AdminSurface title="Lỗi theo mã" noPadding>
                    <MonitoringTable
                      headers={['Mã lỗi', 'Kết quả', 'Số lần']}
                      rows={(data?.errors ?? []).map(row => [
                        <code className="rounded bg-[var(--admin-surface-subtle)] px-1.5 py-0.5 text-xs">{metric(row.error_code)}</code>,
                        outcome(row.outcome),
                        metric(row.occurrences),
                      ])}
                    />
                  </AdminSurface>
                </div>
              </>
            )}
          </div>
        );
        if (section === 'provider') return (
          <div className="space-y-5">
            <AdminSurface title="Gemini và Model" noPadding>
              <MonitoringTable
                headers={['Provider', 'Model', 'Lượt gọi', 'Retry', 'Vòng', 'Input', 'Output', 'Trung bình', 'Thành công gần nhất']}
                rows={(data?.providers ?? []).map(row => [
                  row.provider, metric(row.model), row.calls, row.retries, row.rounds,
                  metric(row.input_tokens), metric(row.output_tokens), metric(row.average_ms, ' ms'),
                  <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(row.last_success)}</span>,
                ])}
              />
            </AdminSurface>
            {(data?.providerErrors?.length ?? 0) > 0 && (
              <AdminSurface title="Mã lỗi Provider" noPadding>
                <MonitoringTable
                  headers={['Mã lỗi provider', 'Model', 'Số lần']}
                  rows={(data?.providerErrors ?? []).map(row => [row.code, metric(row.model), row.occurrences])}
                />
              </AdminSurface>
            )}
          </div>
        );
        if (section === 'actions') return (
          <div className="space-y-5">
            <AdminSurface title="Vòng đời Action Agent">
              <MonitoringFacts items={actionLabels.map(([key, label]) => [label, metric(data?.actions?.[key])])} />
            </AdminSurface>
            <AdminSurface title="Phản hồi FinAI & Chi tiết Tool" noPadding>
              <MonitoringTable
                headers={['Loại phản hồi FinAI', 'Số lượt']}
                rows={(data?.responses ?? []).map(row => [row.response_type, row.occurrences])}
              />
              {((data?.tools?.length ?? 0) > 0 || (data?.actionExecution?.length ?? 0) > 0) && (
                <div className="p-4 border-t border-[var(--admin-border)] space-y-4">
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--admin-ink)]">
                      Thống kê chi tiết theo từng Tool
                    </summary>
                    <div className="mt-3 space-y-4">
                      <MonitoringTable
                        headers={['Tool', 'Chỉ số', 'Giá trị']}
                        rows={(data?.tools ?? []).map(row => [row.tool, toolMetricLabels[String(row.metric)] ?? row.metric, metric(row.value)])}
                      />
                      <MonitoringTable
                        headers={['Tool đã thực thi', 'Trạng thái', 'Số lần', 'Xác nhận → Thực thi']}
                        rows={(data?.actionExecution ?? []).map(row => [row.tool_name, row.status, row.occurrences, metric(row.confirmation_to_commit_ms, ' ms')])}
                      />
                    </div>
                  </details>
                </div>
              )}
            </AdminSurface>
          </div>
        );
        return (
          <AdminSurface title="Nhật ký yêu cầu" noPadding busy={list.loading}>
            <div className="flex flex-wrap items-end gap-2.5 p-4 border-b border-[var(--admin-border)]">
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Tiền tố Request ID</span>
                <input className="admin-input w-44" type="search" maxLength={64} placeholder="VD: req_…" value={list.search}
                  onChange={event => list.setSearch(event.target.value.replace(/[^A-Za-z0-9_-]/g, ''))} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Kết quả</span>
                <select className="admin-select" value={selectedOutcome} onChange={event => { setOutcome(event.target.value); list.setPage(0); }}>
                  <option value="">Tất cả</option>
                  {Object.entries(outcomes).map(([key, [name]]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Chức năng</span>
                <select className="admin-select" value={operation} onChange={event => { setOperation(event.target.value); list.setPage(0); }}>
                  <option value="">Tất cả</option>
                  {Object.entries(operations).filter(([key]) => key.startsWith('OCR_') !== ai)
                    .map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </label>
              {ai && (
                <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                  <span>Model</span>
                  <select className="admin-select" value={model} onChange={event => { setModel(event.target.value); list.setPage(0); }}>
                    <option value="">Tất cả</option>{models.map(key => <option key={key}>{key}</option>)}
                  </select>
                </label>
              )}
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Mã lỗi</span>
                <select className="admin-select" value={errorCode} onChange={event => { setErrorCode(event.target.value); list.setPage(0); }}>
                  <option value="">Tất cả</option>{errors.map(key => <option key={key}>{key}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--admin-ink-secondary)]">
                <span>Sắp xếp</span>
                <select className="admin-select" value={sort} onChange={event => { setSort(event.target.value as typeof sort); list.setPage(0); }}>
                  <option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option>
                </select>
              </label>
            </div>
            {(list.loading || list.error) && list.data && (
              <p role="status" className="px-4 py-2 text-xs text-[var(--admin-ink-muted)] border-b border-[var(--admin-border)] m-0">
                Đang hiển thị dữ liệu lần tải trước.
              </p>
            )}
            <MonitoringTable
              headers={headers}
              empty={list.loading ? 'Đang tải yêu cầu…' : list.error ? 'Không thể tải yêu cầu.' : undefined}
              rows={(list.data?.content ?? []).map(row => [
                <code className="break-all text-xs">{row.request_id}</code>,
                <span className="text-xs text-[var(--admin-ink-muted)]">{monitorTime(row.started_at)}</span>,
                feature(row.operation),
                outcome(row.outcome),
                metric(row.duration_ms, ' ms'),
                row.error_code ? <code className="text-xs">{metric(row.error_code)}</code> : '—',
                ...(ai ? [
                  `${metric(row.provider)} / ${metric(row.model)}`,
                  metric(row.response_type),
                  `${metric(row.input_tokens)} / ${metric(row.output_tokens)}`,
                  metric(row.model_rounds),
                  metric(row.tool_call_count),
                ] : [
                  metric(row.engine),
                  metric(row.engine_calls),
                  metric(row.engine_ms, ' ms'),
                  confidence(row.confidence),
                  row.needs_review == null ? 'N/A' : row.needs_review ? 'Có' : 'Không',
                ]),
              ])}
            />
            <AdminPageFooter page={list.page} totalPages={list.data?.totalPages ?? 0} loading={list.loading}
              error={list.error} onPage={list.setPage} onRetry={list.reload} />
          </AdminSurface>
        );
      }} />
  </div>;
}
