import { useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AdminTrend } from '../components/AdminTrend';
import { AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { MonitoringTable } from '../components/OperationMonitoringPanel';
import { metric } from '../components/monitoringFormat';
import { useMonitoringData } from '../hooks/useMonitoringData';

export function AdminAnalyticsScreen() {
  const overview = useMonitoringData(adminApi.getAnalyticsOverview);
  const data = overview.value;
  const [days, setDays] = useState(14);
  const hasFeatureVolume = data?.featureUsages.some((feature) => feature.totalEvents > 0);

  return (
    <div className="space-y-5">
      {overview.error && (
        <AdminNotice
          tone="rose"
          message={overview.error}
          action={
            <button type="button" className="admin-btn-secondary admin-btn-sm" onClick={overview.reload}>
              Thử lại
            </button>
          }
        />
      )}

      {/* 1. Hoạt động đăng nhập */}
      <AdminSurface
        busy={overview.loading}
        icon="users"
        headerVariant="brand"
        title="Hoạt động đăng nhập"
        subtitle={overview.loading ? 'Đang tải thống kê…' : 'Thống kê tài khoản đăng nhập theo mốc thời gian'}
      >
        <AdminStatStrip
          variant="pastel"
          items={[
            { label: 'Tổng tài khoản', value: metric(data?.totalUsers), icon: 'users', tone: 'emerald' },
            { label: 'Đăng nhập hôm nay (DAU)', value: metric(data?.activeUsersDAU), icon: 'spark', tone: 'sky' },
            { label: 'Đăng nhập 7 ngày (WAU)', value: metric(data?.activeUsersWAU), icon: 'calendar', tone: 'emerald' },
            { label: 'Đăng nhập 30 ngày (MAU)', value: metric(data?.activeUsersMAU), icon: 'calendar', tone: 'amber' },
          ]}
        />
      </AdminSurface>

      {/* 2. Xu hướng theo ngày */}
      <AdminSurface
        icon="chart"
        headerVariant="mint"
        title="Đăng ký và giao dịch theo ngày"
        subtitle="So sánh lượng tài khoản mới và số giao dịch được ghi nhận"
        action={
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--admin-ink-secondary)]">
            <span>Khoảng thời gian</span>
            <select
              className="admin-select"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={7}>7 ngày gần đây</option>
              <option value={14}>14 ngày gần đây</option>
            </select>
          </label>
        }
      >
        <AdminTrend
          days={(data?.activityTrend ?? []).slice(-days).map((day) => ({
            date: day.date,
            values: [day.newUsers, day.transactionCount],
          }))}
          series={['Tài khoản mới', 'Giao dịch']}
        />
      </AdminSurface>

      {/* 3. Khối lượng bản ghi theo phân hệ */}
      <AdminSurface
        noPadding
        icon="wallet"
        headerVariant="mint"
        title="Khối lượng bản ghi theo phân hệ"
        subtitle="Tỷ trọng tính trên tổng số bản ghi hiện có trong các bảng phân hệ"
      >
        <MonitoringTable
          headers={['Phân hệ', 'Số bản ghi', 'Tỷ trọng']}
          rows={(data?.featureUsages ?? []).map((item, idx) => {
            const pct = hasFeatureVolume ? item.percentage : 0;
            const barColors = [
              'bg-[#007f53] dark:bg-emerald-400',
              'bg-sky-600 dark:bg-sky-400',
              'bg-amber-500 dark:bg-amber-400',
              'bg-teal-600 dark:bg-teal-400',
              'bg-rose-500 dark:bg-rose-400',
            ];
            return [
              <span className="font-medium text-[var(--admin-ink)]">{item.featureName}</span>,
              <span className="font-semibold tabular-nums">{metric(item.totalEvents)}</span>,
              <div className="flex items-center gap-3 min-w-[9rem]">
                <div className="h-2 flex-1 rounded-full bg-[var(--admin-surface-subtle)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColors[idx % barColors.length]}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium tabular-nums text-[var(--admin-ink-secondary)]">
                  {hasFeatureVolume ? metric(item.percentage, '%') : 'N/A'}
                </span>
              </div>,
            ];
          })}
        />
      </AdminSurface>
    </div>
  );
}
