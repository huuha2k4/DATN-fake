import { adminApi } from '../api/adminApi';
import { AdminBadge, AdminNotice, AdminSurface } from './AdminPrimitives';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export function AdminAccessPolicy() {
  const roles = useMonitoringData(adminApi.getRoles);

  return (
    <AdminSurface
      busy={roles.loading}
      title="Chính sách truy cập"
      subtitle="Quyền truy cập được định nghĩa sẵn cho từng vai trò hệ thống"
    >
      <div className="space-y-4">
        {roles.loading && (
          <p role="status" className="text-xs text-[var(--admin-ink-muted)]">
            Đang tải chính sách truy cập…
          </p>
        )}
        {roles.error && (
          <AdminNotice
            tone="rose"
            message={roles.error}
            action={
              <button type="button" className="admin-btn-secondary admin-btn-sm" onClick={roles.reload}>
                Thử lại
              </button>
            }
          />
        )}
        {roles.value?.length === 0 && (
          <p className="text-xs text-[var(--admin-ink-muted)]">Chưa có thông tin vai trò.</p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          {roles.value?.map((role) => (
            <article
              key={role.role}
              className="min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--admin-ink)] m-0">{role.name}</h3>
                  <code className="rounded bg-[var(--admin-surface)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--admin-ink-secondary)] border border-[var(--admin-border)]">
                    {role.role}
                  </code>
                </div>
                {role.isSystemProtected && <AdminBadge tone="emerald">Bảo vệ hệ thống</AdminBadge>}
              </div>
              <p className="text-xs text-[var(--admin-ink-secondary)] m-0">{role.description}</p>
              <div className="text-xs font-semibold tabular-nums text-[var(--admin-ink)]">
                {role.totalAccounts.toLocaleString('vi-VN')} tài khoản
              </div>
              <ul className="space-y-1.5 border-t border-[var(--admin-border)] pt-3 text-xs text-[var(--admin-ink-secondary)]">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-start gap-2">
                    <FinanceIcon name="check" size={14} className="mt-0.5 shrink-0 text-[#007f53] dark:text-emerald-400" />
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </AdminSurface>
  );
}
