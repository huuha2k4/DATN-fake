import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { DashboardOperations } from '../components/ServiceMonitoring';
import { AdminBadge, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { MonitoringTable } from '../components/OperationMonitoringPanel';
import { AdminTrend } from '../components/AdminTrend';
import { metric } from '../components/monitoringFormat';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export function AdminDashboardScreen() {
  const overview = useMonitoringData(adminApi.getDashboardOverview);
  const analytics = useMonitoringData(adminApi.getAnalyticsOverview);
  const data = overview.value;
  const trendDays = (analytics.value?.activityTrend ?? []).slice(-7);

  return (
    <div className="space-y-5">
      {overview.error && (
        <AdminNotice
          tone="rose"
          message={overview.error}
          action={
            <button className="admin-btn-secondary admin-btn-sm" type="button" onClick={overview.reload}>
              Thử lại
            </button>
          }
        />
      )}

      {/* 1. Tài khoản tổng quan */}
      <AdminSurface
        busy={overview.loading}
        icon="users"
        headerVariant="mint"
        title="Tổng quan tài khoản"
        subtitle={
          overview.loading
            ? 'Đang tải số liệu tài khoản…'
            : `Thống kê tài khoản và đăng ký mới trong hệ thống (${metric(data?.newUsersThisMonth)} mới tháng này)`
        }
        action={
          <Link to="/admin/users" className="admin-detail-link">
            Quản lý người dùng
            <FinanceIcon name="chevron-right" size={14} />
          </Link>
        }
      >
        <AdminStatStrip
          items={[
            { label: 'Tổng tài khoản', value: metric(data?.totalUsers), icon: 'users', tone: 'sky' },
            { label: 'Mới hôm nay', value: metric(data?.newUsersToday), icon: 'plus', tone: 'emerald' },
            { label: 'Trạng thái ACTIVE', value: metric(data?.activeUsers), icon: 'check', tone: 'emerald' },
            { label: 'Đã khóa', value: metric(data?.lockedUsers), icon: 'lock', tone: 'rose' },
            { label: 'Chờ kích hoạt', value: metric(data?.pendingUsers), icon: 'bell', tone: 'amber' },
          ]}
        />
      </AdminSurface>

      {/* 2. Vận hành hôm nay */}
      <DashboardOperations />

      {/* 3. Biểu đồ tăng trưởng & Cơ cấu gói + Bản ghi */}
      <div className="grid min-w-0 items-stretch gap-5 xl:grid-cols-[1.35fr_1fr]">
        <AdminSurface
          icon="trend"
          headerVariant="mint"
          className="h-full flex flex-col"
          title="Đăng ký mới trong 7 ngày"
          subtitle="Số tài khoản tạo mới theo ngày"
          action={
            <Link to="/admin/analytics" className="admin-detail-link">
              Xem thống kê
              <FinanceIcon name="chevron-right" size={13} />
            </Link>
          }
        >
          <AdminTrend
            days={
              trendDays.length > 0
                ? trendDays.map((day) => ({ date: day.date, values: [day.newUsers, day.transactionCount] }))
                : (data?.userGrowth ?? []).map((day) => ({ date: day.date, values: [day.count] }))
            }
            series={trendDays.length > 0 ? ['Tài khoản mới', 'Giao dịch'] : ['Tài khoản mới']}
          />
        </AdminSurface>

        <div className="space-y-5 min-w-0">
          <AdminSurface icon="spark" headerVariant="mint" title="Phân bổ gói tài khoản" noPadding>
            <MonitoringTable
              headers={['Gói dịch vụ', 'Tài khoản']}
              rows={[
                [<AdminBadge tone="slate">Free</AdminBadge>, <span className="font-semibold text-[var(--admin-ink)]">{metric(data?.freeUsers)}</span>],
                [<AdminBadge tone="amber">Premium</AdminBadge>, <span className="font-semibold text-amber-600 dark:text-amber-400">{metric(data?.premiumUsers)}</span>],
                [<AdminBadge tone="sky">Enterprise</AdminBadge>, <span className="font-semibold text-sky-700 dark:text-sky-400">{metric(data?.enterpriseUsers)}</span>],
              ]}
            />
          </AdminSurface>

          <AdminSurface icon="wallet" headerVariant="mint" title="Khối lượng bản ghi đã lưu">
            <AdminStatStrip
              variant="tinted"
              items={[
                { label: 'Giao dịch', value: metric(data?.totalTransactions), icon: 'wallet', tone: 'emerald' },
                { label: 'Nhóm chi tiêu', value: metric(data?.totalGroups), icon: 'users', tone: 'sky' },
                { label: 'Hóa đơn OCR', value: metric(data?.totalReceiptsScanned), icon: 'receipt', tone: 'amber' },
              ]}
            />
          </AdminSurface>
        </div>
      </div>
    </div>
  );
}
