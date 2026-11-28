import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminError } from '../hooks/useAdminPage';
import { adminApi } from '../api/adminApi';
import { metric, monitorTime } from '../components/monitoringFormat';
import { AdminBadge, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { MonitoringTable } from '../components/OperationMonitoringPanel';
import { HealthMatrix, StatusLabel } from '../components/ServiceMonitoring';
import { FinanceIcon } from '../../core/components/FinanceIcon';

type HealthData = Awaited<ReturnType<typeof adminApi.getSystemHealth>>;

function ResourceCard({
  label,
  percent,
  sub,
  tone,
  icon,
}: {
  label: string;
  percent: number | null | undefined;
  sub?: string;
  tone: 'emerald' | 'sky' | 'violet';
  icon: 'settings' | 'layers' | 'wallet' | 'shield';
}) {
  const safePct = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  const styles = {
    emerald: {
      card: 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/90 dark:from-emerald-950/30 dark:via-[var(--admin-surface)] dark:to-emerald-900/20 border-emerald-500/15',
      iconBg: 'bg-emerald-500/14 text-[#007f53] dark:text-emerald-300',
      bar: 'bg-[#00a86b] dark:bg-emerald-400',
    },
    sky: {
      card: 'bg-gradient-to-br from-sky-50/70 via-white to-sky-50/90 dark:from-sky-950/30 dark:via-[var(--admin-surface)] dark:to-sky-900/20 border-sky-500/15',
      iconBg: 'bg-sky-500/14 text-sky-700 dark:text-sky-300',
      bar: 'bg-sky-500 dark:bg-sky-400',
    },
    violet: {
      card: 'bg-gradient-to-br from-violet-50/70 via-white to-violet-50/90 dark:from-violet-950/30 dark:via-[var(--admin-surface)] dark:to-violet-900/20 border-violet-500/15',
      iconBg: 'bg-violet-500/14 text-violet-600 dark:text-violet-300',
      bar: 'bg-violet-500 dark:bg-violet-400',
    },
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${styles.card}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${styles.iconBg}`}>
          <FinanceIcon name={icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[var(--admin-ink-secondary)]">{label}</div>
          <div className="mt-0.5 text-xl font-extrabold tabular-nums text-[var(--admin-ink)]">
            {percent == null ? 'N/A' : metric(percent, '%')}
          </div>
          {sub && <div className="mt-0.5 text-[11px] text-[var(--admin-ink-muted)] tabular-nums">{sub}</div>}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${safePct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceChart({
  samples,
}: {
  samples: { timeLabel: string; cpuPercent: number | null; ramPercent: number | null; latencyMs: number | null }[];
}) {
  if (!samples.length) {
    return (
      <p className="py-10 text-center text-xs text-[var(--admin-ink-muted)]">
        Đang thu thập mẫu hiệu năng theo phút…
      </p>
    );
  }
  const width = 460;
  const height = 140;
  const maxIdx = Math.max(1, samples.length - 1);
  const toPath = (values: (number | null)[], scaleMax: number) =>
    values
      .map((v, i) => {
        const x = samples.length === 1 ? width / 2 : (i / maxIdx) * width;
        const pct = v == null ? 0 : Math.min(100, Math.max(0, (v / scaleMax) * 100));
        const y = height - (pct / 100) * (height - 16) - 8;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const maxLat = Math.max(100, ...samples.map((s) => s.latencyMs ?? 0));
  const cpuPath = toPath(samples.map((s) => s.cpuPercent), 100);
  const ramPath = toPath(samples.map((s) => s.ramPercent), 100);
  const latPath = toPath(samples.map((s) => s.latencyMs), maxLat);

  const labelIndices =
    samples.length <= 6
      ? samples.map((_, i) => i)
      : [0, Math.floor(maxIdx * 0.25), Math.floor(maxIdx * 0.5), Math.floor(maxIdx * 0.75), maxIdx];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[var(--admin-ink-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          CPU
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" />
          RAM
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-violet-500" />
          Response time (ms)
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-between pb-5 text-[10px] tabular-nums text-[var(--admin-ink-muted)] text-right w-8">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className="flex-1 min-w-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((r) => {
              const y = height - r * (height - 16) - 8;
              return (
                <line
                  key={r}
                  x1={0}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="currentColor"
                  className="text-[var(--admin-border)]"
                  strokeDasharray={r === 0 ? undefined : '3 3'}
                />
              );
            })}
            <path d={cpuPath} fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
            <path d={ramPath} fill="none" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" />
            <path d={latPath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-[var(--admin-ink-muted)]">
            {labelIndices.map((idx) => (
              <span key={idx}>{samples[idx]?.timeLabel}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HourlyTrafficChart({
  hourly,
}: {
  hourly: { hourLabel: string; requests: number; failed: number }[];
}) {
  // Chuẩn hóa cố định 24 khung giờ từ 00:00 -> 23:00 để trục thời gian 0h-24h trực quan, dễ đọc
  const byHour = new Map<number, { requests: number; failed: number }>();
  for (const slot of hourly) {
    const match = String(slot.hourLabel || '').match(/^(\d{1,2})/);
    if (!match) continue;
    const h = Number(match[1]);
    if (h >= 0 && h < 24) {
      const prev = byHour.get(h) ?? { requests: 0, failed: 0 };
      byHour.set(h, {
        requests: prev.requests + (slot.requests || 0),
        failed: prev.failed + (slot.failed || 0),
      });
    }
  }
  const ordered = Array.from({ length: 24 }, (_, hour) => {
    const stats = byHour.get(hour) ?? { requests: 0, failed: 0 };
    return {
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      requests: stats.requests,
      failed: stats.failed,
    };
  });

  const maxReq = Math.max(1, ...ordered.map((h) => h.requests));
  const axisLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-3 text-[11px] text-[var(--admin-ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Bình thường
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          Có lỗi
        </span>
      </div>
      <div className="flex items-end gap-1 h-36 pt-2 border-b border-[var(--admin-border)]">
        {ordered.map((slot) => {
          const pct = slot.requests > 0 ? Math.max(8, Math.round((slot.requests / maxReq) * 100)) : 3;
          const nextHour = slot.hour === 23 ? '24:00' : `${String(slot.hour + 1).padStart(2, '0')}:00`;
          return (
            <div
              key={slot.hourLabel}
              title={`${slot.hourLabel} – ${nextHour}: ${metric(slot.requests)} yêu cầu (${metric(slot.failed)} lỗi)`}
              className="flex-1 h-full flex items-end"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  slot.failed > 0
                    ? 'bg-amber-500/85 hover:bg-amber-500'
                    : slot.requests > 0
                    ? 'bg-emerald-500/85 hover:bg-emerald-600'
                    : 'bg-emerald-500/15'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] tabular-nums text-[var(--admin-ink-muted)]">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export const AdminSystemHealthScreen: React.FC = () => {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pending = useRef<AbortController | null>(null);
  const loadHealth = useCallback(async () => {
    if (document.hidden || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    try {
      setLoading(true);
      const res = await adminApi.getSystemHealth(controller.signal);
      if (controller.signal.aborted) return;
      setData(res);
      setError('');
    } catch (err: unknown) {
      if (!controller.signal.aborted) setError(adminError(err, 'Không thể tải tình trạng dịch vụ'));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) void loadHealth();
    };
    queueMicrotask(refresh);
    const interval = window.setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      pending.current?.abort();
      pending.current = null;
    };
  }, [loadHealth]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    return `${m} phút ${s} giây`;
  };

  if (loading && !data) {
    return (
      <AdminSurface title="Kiểm tra hệ thống">
        <div className="flex items-center gap-3 py-8 text-xs text-[var(--admin-ink-muted)]">
          <div className="size-5 border-2 border-[#007f53] border-t-transparent rounded-full animate-spin" />
          <span>Đang kiểm tra tình trạng dịch vụ…</span>
        </div>
      </AdminSurface>
    );
  }

  if (error && !data) {
    return (
      <AdminNotice
        tone="rose"
        message={error}
        action={
          <button type="button" onClick={loadHealth} className="admin-btn-secondary admin-btn-sm">
            Thử lại
          </button>
        }
      />
    );
  }

  if (!data) return null;
  const { serviceHealth, memory, cpu, database, disk, runtime } = data;
  const up = serviceHealth.services.filter((item) => item.status === 'UP').length;
  const incidents = serviceHealth.services.filter(
    (item) => item.status === 'DOWN' || item.status === 'DEGRADED'
  ).length;
  const cpuPct = cpu.systemCpuPercent ?? cpu.processCpuPercent;
  const ramPct = memory.systemUsagePercent ?? memory.heapUsagePercent;
  const ramUsed = memory.systemUsedMB ?? memory.heapUsedMB;
  const ramTotal = memory.systemTotalMB ?? memory.heapMaxMB;
  const hourlyTraffic = data.hourlyTraffic ?? [];
  const perfHistory = data.performanceHistory ?? [];
  const traffic24h = data.traffic24h;
  const recentEvents = data.recentEvents ?? [];

  return (
    <div className="space-y-5">
      {error && (
        <AdminNotice
          tone="amber"
          message={`${error} · Đang hiển thị lần kiểm tra trước.`}
        />
      )}

      {/* 1. Trạng thái tổng hợp */}
      <AdminSurface
        icon="shield"
        headerVariant="mint"
        title="Trạng thái tổng hợp"
        subtitle={
          serviceHealth.stale || error
            ? 'Đang hiển thị kết quả lưu đệm / lần kiểm tra trước'
            : 'Tự động làm mới mỗi 15 giây khi tab đang hiển thị'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={serviceHealth.status === 'UP' ? 'emerald' : 'amber'}>
              {serviceHealth.status === 'UP' ? 'Hoạt động ổn định' : 'Cần chú ý'}
            </AdminBadge>
            <span className="hidden sm:inline text-[11px] text-[var(--admin-ink-muted)] tabular-nums">
              Lần cập nhật: {monitorTime(serviceHealth.checkedAt)}
            </span>
            <button
              type="button"
              onClick={loadHealth}
              disabled={loading}
              className="admin-btn-secondary admin-btn-sm"
            >
              <FinanceIcon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        }
      >
        <AdminStatStrip
          variant="pastel"
          items={[
            {
              label: 'Trạng thái chung',
              icon: 'shield',
              tone: serviceHealth.status === 'UP' ? 'emerald' : serviceHealth.status === 'DOWN' ? 'rose' : 'amber',
              value: <StatusLabel status={serviceHealth.status} />,
            },
            { label: 'Dịch vụ phản hồi', icon: 'layers', value: metric(up), tone: 'violet' },
            {
              label: 'Suy giảm / gián đoạn',
              icon: 'alert',
              value: metric(incidents),
              tone: incidents > 0 ? 'rose' : 'amber',
            },
            {
              label: 'Kiểm tra mới nhất',
              icon: 'calendar',
              tone: 'sky',
              value: (
                <span className="text-sm font-bold tracking-normal text-[var(--admin-ink)] leading-snug">
                  {serviceHealth.checkedAt != null
                    ? (() => {
                        const d = new Date(String(serviceHealth.checkedAt));
                        if (Number.isNaN(d.getTime())) return 'N/A';
                        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                        const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                        return <>{time}<br /><span className="text-xs font-semibold text-[var(--admin-ink-muted)]">{date}</span></>;
                      })()
                    : 'N/A'}
                </span>
              ),
            },
          ]}
        />
      </AdminSurface>

      {/* 2. Tài nguyên hệ thống (Realtime) */}
      <AdminSurface
        icon="settings"
        headerVariant="mint"
        title="Tài nguyên hệ thống (Realtime)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ResourceCard label="CPU" percent={cpuPct} tone="emerald" icon="settings" />
          <ResourceCard
            label="RAM"
            percent={ramPct}
            sub={ramTotal != null ? `${metric(ramUsed)} MB / ${metric(ramTotal)} MB` : undefined}
            tone="sky"
            icon="layers"
          />
          <ResourceCard
            label="Disk"
            percent={disk.diskUsagePercent}
            sub={`${metric(disk.freeSpaceGB)} GB / ${metric(disk.totalSpaceGB)} GB`}
            tone="violet"
            icon="wallet"
          />
          <ResourceCard
            label="JVM Heap"
            percent={memory.heapUsagePercent}
            sub={memory.heapMaxMB != null ? `${metric(memory.heapUsedMB)} MB / ${metric(memory.heapMaxMB)} MB` : undefined}
            tone="emerald"
            icon="shield"
          />
        </div>
      </AdminSurface>

      {/* 3. Hiệu năng 24h & Lưu lượng yêu cầu */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AdminSurface icon="settings" headerVariant="mint" title="Hiệu năng trong 24 giờ">
          <PerformanceChart samples={perfHistory} />
        </AdminSurface>

        <AdminSurface
          icon="chart"
          headerVariant="mint"
          title="Lưu lượng yêu cầu"
          action={<AdminBadge dot={false} tone="slate">0h – 24h</AdminBadge>}
        >
          <div className="space-y-2">
            <div className="text-xs text-[var(--admin-ink-secondary)]">
              Tổng: <strong className="text-sm font-bold text-[var(--admin-ink)] tabular-nums">{metric(traffic24h?.totalRequests ?? 0)} yêu cầu</strong>
            </div>
            <HourlyTrafficChart hourly={hourlyTraffic} />
          </div>
        </AdminSurface>
      </div>

      {/* 4. Ma trận dịch vụ */}
      <HealthMatrix
        health={serviceHealth}
        refresh={loadHealth}
        loading={loading}
        old={Boolean(error)}
        errorRates={data.serviceErrorRates24h}
      />

      {/* 5. Runtime Backend */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AdminSurface icon="settings" headerVariant="mint" title="JVM và tiến trình" noPadding>
          <MonitoringTable
            headers={['Chỉ số JVM', 'Giá trị']}
            rows={[
              ['Thời gian hoạt động (Uptime)', formatUptime(data.uptimeSeconds)],
              ['Khởi động lúc', data.startTime || 'N/A'],
              ['Heap đã dùng / giới hạn', `${metric(memory.heapUsedMB, ' MB')} / ${metric(memory.heapMaxMB, ' MB')}`],
              ['Heap đã cấp', metric(memory.heapCommittedMB, ' MB')],
              ['Tỷ lệ dùng heap', metric(memory.heapUsagePercent, '%')],
              ['Non-heap', metric(memory.nonHeapUsedMB, ' MB')],
              ['CPU tiến trình JVM', metric(cpu.processCpuPercent, '%')],
              ['Bộ xử lý JVM khả dụng', metric(cpu.availableProcessors)],
            ]}
          />
        </AdminSurface>

        <AdminSurface icon="layers" headerVariant="mint" title="PostgreSQL, Hikari & Filesystem" noPadding>
          <MonitoringTable
            headers={['Chỉ số vận hành', 'Giá trị']}
            rows={[
              ['PostgreSQL SELECT 1', metric(database.pingTimeMs, ' ms')],
              ['Hikari đang dùng', metric(database.activeConnections)],
              ['Hikari rảnh', metric(database.idleConnections)],
              ['Hikari đang chờ', metric(database.pendingConnections)],
              ['Giới hạn pool', metric(database.maxPoolSize)],
              ['Filesystem Backend', metric(disk.totalSpaceGB, ' GB')],
              ['Dung lượng trống', metric(disk.freeSpaceGB, ' GB')],
              ['Dung lượng có thể sử dụng', metric(disk.usableSpaceGB, ' GB')],
              ['Tỷ lệ dùng filesystem', metric(disk.diskUsagePercent, '%')],
            ]}
          />
        </AdminSurface>
      </div>

      {/* 6. Garbage Collection & Thông tin hệ điều hành */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AdminSurface icon="refresh" headerVariant="mint" title="Garbage Collection" noPadding>
          <MonitoringTable
            headers={['Bộ thu gom JVM', 'Số đợt', 'Thời gian tích lũy']}
            rows={data.garbageCollectors.map((gc) => [
              gc.name,
              metric(gc.collections),
              metric(gc.timeMs, ' ms'),
            ])}
          />
        </AdminSurface>

        <AdminSurface icon="settings" headerVariant="mint" title="Thông tin hệ điều hành">
          <AdminStatStrip
            variant="pastel"
            columns={2}
            items={[
              {
                label: 'Hệ điều hành',
                value: (
                  <span className="text-sm font-bold tracking-normal text-[var(--admin-ink)] leading-snug break-words">
                    {runtime.osName}
                    {runtime.osArch ? <><br /><span className="text-xs font-semibold text-[var(--admin-ink-muted)]">{runtime.osArch}</span></> : null}
                  </span>
                ),
                icon: 'settings',
                tone: 'sky',
              },
              { label: 'OS load average (1 phút)', value: metric(cpu.systemLoadAverage), icon: 'trend', tone: 'emerald' },
              { label: 'Lớp đã tải', value: metric(cpu.totalLoadedClasses), icon: 'layers', tone: 'amber' },
              { label: 'Luồng hiện tại / cao nhất', value: `${metric(cpu.activeThreadCount)} / ${metric(cpu.peakThreadCount)}`, icon: 'users', tone: 'violet' },
            ]}
          />
        </AdminSurface>
      </div>

      {/* 7. Cảnh báo & sự kiện gần đây + Tỷ lệ lỗi & thời gian phản hồi */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AdminSurface
          icon="bell"
          headerVariant="mint"
          title="Cảnh báo & sự kiện gần đây"
          action={
            <Link to="/admin/audit-logs" className="admin-detail-link">
              Xem tất cả
              <FinanceIcon name="chevron-right" size={13} />
            </Link>
          }
        >
          {recentEvents.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--admin-ink-muted)]">Chưa có sự kiện nào được ghi nhận.</p>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {recentEvents.map((ev, idx) => (
                <li key={`${ev.timestamp}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full ${
                        ev.severity === 'ERROR'
                          ? 'bg-rose-500/15 text-rose-600'
                          : ev.severity === 'WARN'
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      <FinanceIcon name={ev.severity === 'INFO' ? 'check' : 'alert-triangle'} size={12} />
                    </span>
                    <span className="truncate font-medium text-[var(--admin-ink)]">{ev.message}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--admin-ink-muted)]">{ev.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSurface>

        <AdminSurface
          icon="chart"
          headerVariant="mint"
          title="Tỷ lệ lỗi & thời gian phản hồi"
          action={<AdminBadge dot={false} tone="slate">24 giờ</AdminBadge>}
        >
          <AdminStatStrip
            variant="pastel"
            className="!grid-cols-1 sm:!grid-cols-2"
            items={[
              {
                label: 'Tỷ lệ lỗi (Error Rate)',
                value: metric(traffic24h?.errorRatePercent ?? 0, '%'),
                icon: 'alert-triangle',
                tone: 'rose',
              },
              {
                label: 'Thời gian phản hồi TB',
                value: metric(traffic24h?.avgLatencyMs, ' ms'),
                icon: 'clock',
                tone: 'sky',
              },
              {
                label: 'Yêu cầu thành công',
                value: metric(Math.max(0, (traffic24h?.totalRequests ?? 0) - (traffic24h?.failedRequests ?? 0))),
                icon: 'check',
                tone: 'emerald',
              },
              {
                label: 'Yêu cầu thất bại',
                value: metric(traffic24h?.failedRequests ?? 0),
                icon: 'alert-triangle',
                tone: 'amber',
              },
            ]}
          />
        </AdminSurface>
      </div>
    </div>
  );
};
