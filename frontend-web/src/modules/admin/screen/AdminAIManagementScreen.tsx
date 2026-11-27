import React, { useCallback, useEffect, useState } from 'react';
import { useAdminPage, adminError } from '../hooks/useAdminPage';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { AdminBadge, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { OperationMonitoringPanel } from '../components/OperationMonitoringPanel';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface AlgorithmInfo {
  name: string;
  type: string;
  engine: string;
  status: string;
  desc: string;
}

interface AIAdminStats {
  status: string;
  totalSessions: number;
  totalMessages: number;
  algorithms: AlgorithmInfo[];
}

export function AdminAIManagementScreen() {
  return (
    <div className="space-y-5">
      <OperationMonitoringPanel service="ai" archive={<SessionArchive />} />
    </div>
  );
}

const SessionArchive: React.FC = () => {
  const [data, setData] = useState<AIAdminStats | null>(null);
  const list = useAdminPage(adminApi.listAiSessions, { size: 10 });
  const sessions = list.data?.content ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAiAdminStats();
      setData(res);
    } catch (err: unknown) {
      setError(adminError(err, 'Không thể kết nối đến FinAI Service'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchStats();
    });
    return () => {
      active = false;
    };
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchStats();
    list.reload();
  };

  return (
    <div className="space-y-5">
      {error && (
        <AdminNotice
          tone="rose"
          message={error}
          action={
            <button type="button" onClick={fetchStats} className="admin-btn-secondary admin-btn-sm">
              Thử lại
            </button>
          }
        />
      )}

      <AdminSurface
        icon="message"
        headerVariant="mint"
        title="Phiên hội thoại đã lưu"
        subtitle="Tổng số phiên, tin nhắn đã lưu và danh mục thuật toán FinAI"
        action={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="admin-btn-secondary admin-btn-sm"
          >
            <FinanceIcon name="refresh" size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Đang làm mới…' : 'Làm mới số liệu'}
          </button>
        }
      >
        <AdminStatStrip
          variant="pastel"
          className="!grid-cols-1 sm:!grid-cols-3"
          items={[
            {
              label: 'Cuộc trò chuyện (Sessions)',
              icon: 'message',
              tone: 'emerald',
              value: data?.totalSessions?.toLocaleString('vi-VN') ?? 'N/A',
            },
            {
              label: 'Lượt tương tác (Messages)',
              icon: 'message',
              tone: 'emerald',
              value: data?.totalMessages?.toLocaleString('vi-VN') ?? 'N/A',
            },
            {
              label: 'API thống kê AI',
              icon: 'shield',
              tone: error ? 'rose' : 'emerald',
              value: loading ? (
                <AdminBadge tone="amber">Đang kiểm tra</AdminBadge>
              ) : error ? (
                <AdminBadge tone="rose">Mất kết nối</AdminBadge>
              ) : data ? (
                <AdminBadge tone="emerald">Đã phản hồi</AdminBadge>
              ) : (
                <AdminBadge tone="slate">Không xác định</AdminBadge>
              ),
            },
          ]}
        />
      </AdminSurface>

      <AdminSurface icon="layers" headerVariant="mint" title="Danh mục mô hình & thuật toán AI">
        {loading && !(data?.algorithms?.length) ? (
          <p className="py-6 text-center text-xs text-[var(--admin-ink-muted)]">Đang tải danh mục thuật toán…</p>
        ) : !(data?.algorithms?.length) ? (
          <p className="py-6 text-center text-xs text-[var(--admin-ink-muted)]">Chưa có thuật toán nào được cấu hình.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.algorithms.map((algo, idx) => {
              const cardStyles = [
                {
                  wrap: 'bg-emerald-50/45 dark:bg-emerald-950/20 border-emerald-500/15',
                  iconBg: 'bg-emerald-500/12 text-[#007f53] dark:text-emerald-300',
                  badge: 'emerald' as const,
                  icon: 'message' as const,
                },
                {
                  wrap: 'bg-sky-50/45 dark:bg-sky-950/20 border-sky-500/15',
                  iconBg: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
                  badge: 'sky' as const,
                  icon: 'chart-bar' as const,
                },
                {
                  wrap: 'bg-violet-50/45 dark:bg-violet-950/20 border-violet-500/15',
                  iconBg: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
                  badge: 'slate' as const,
                  icon: 'layers' as const,
                },
                {
                  wrap: 'bg-amber-50/45 dark:bg-amber-950/20 border-amber-500/15',
                  iconBg: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
                  badge: 'amber' as const,
                  icon: 'target' as const,
                },
              ];
              const style = cardStyles[idx % cardStyles.length];
              return (
                <div
                  key={algo.name}
                  className={`flex items-start gap-3.5 rounded-2xl border p-4 ${style.wrap}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.iconBg}`}>
                    <FinanceIcon name={style.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[var(--admin-ink)]">{algo.name}</span>
                      <AdminBadge dot={false} tone={style.badge}>
                        {algo.engine || algo.type}
                      </AdminBadge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--admin-ink-secondary)] leading-relaxed">{algo.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSurface>

      <AdminSurface
        icon="history"
        headerVariant="mint"
        title="Nhật ký phiên hội thoại gần đây"
        subtitle="Dữ liệu ẩn danh theo mã phiên lưu trong database"
        noPadding
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
                <FinanceIcon name="search" size={14} />
              </span>
              <input
                type="search"
                aria-label="Tìm theo mã phiên"
                placeholder="Tìm theo mã phiên…"
                value={list.search}
                onChange={(event) => list.setSearch(event.target.value)}
                className="admin-input w-48 pl-9"
              />
            </div>
            <span className="text-xs font-medium text-[var(--admin-ink-muted)] tabular-nums">
              {list.data?.totalElements ?? '—'} phiên
            </span>
          </div>
        }
      >
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Nhật ký phiên hội thoại gần đây">
          <table className="admin-table w-full table-fixed">
            <thead>
              <tr>
                <th className="w-[48%]">Mã phiên</th>
                <th className="w-[24%] text-center">Số tin nhắn</th>
                <th className="w-[28%] text-right">Thời gian cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-xs text-[var(--admin-ink-muted)]">
                    {list.loading
                      ? 'Đang tải phiên hội thoại…'
                      : list.error
                      ? 'Không thể tải phiên hội thoại.'
                      : 'Chưa có phiên hội thoại.'}
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code className="inline-block max-w-full truncate rounded bg-[var(--admin-surface-subtle)] px-2 py-0.5 text-xs font-mono text-[var(--admin-ink)]" title={s.id}>
                        {s.id}
                      </code>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#007f53] dark:text-emerald-300">
                        {s.messageCount} tin nhắn
                      </span>
                    </td>
                    <td className="text-right text-xs text-[var(--admin-ink-muted)] whitespace-nowrap tabular-nums">
                      {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
};
