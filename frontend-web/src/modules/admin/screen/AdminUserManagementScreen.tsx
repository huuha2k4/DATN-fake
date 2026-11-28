import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminDialog } from '../components/AdminDialog';
import { AdminTabs } from '../components/AdminTabs';
import { AdminAccessPolicy } from '../components/AdminAccessPolicy';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { useAdminPage, adminError } from '../hooks/useAdminPage';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { metric } from '../components/monitoringFormat';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { adminApi, type AdminUserItem } from '../api/adminApi';
import { userApi } from '../../user/api/userApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { AdminConfirmDialog as ConfirmDeleteModal } from '../components/AdminConfirmDialog';

const AVATAR_TONES = [
  'bg-violet-600 text-white',
  'bg-sky-600 text-white',
  'bg-rose-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
] as const;

function AdminUserAvatar({
  avatarUrl,
  name,
  tone,
}: {
  avatarUrl?: string | null;
  name: string;
  tone: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedUrl = avatarUrl && avatarUrl.trim() ? userApi.getAvatarUrl(avatarUrl) : null;
  const showImage = Boolean(resolvedUrl) && !imgFailed;

  return (
    <div
      className={`size-8 rounded-full font-semibold text-xs grid place-items-center shrink-0 overflow-hidden ${
        showImage ? 'bg-[var(--admin-surface-subtle)]' : tone
      }`}
    >
      {showImage ? (
        <img
          src={resolvedUrl!}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        (name || 'U').charAt(0).toUpperCase()
      )}
    </div>
  );
}

function formatDateVN(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

const userTabs = [
  { id: 'users', name: 'Tài khoản' },
  { id: 'access', name: 'Chính sách truy cập' },
] as const;

export function AdminUserManagementScreen() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') === 'access' ? 'access' : 'users';
  return (
    <div className="space-y-5">
      <AdminTabs
        label="Quản lý người dùng"
        items={userTabs}
        value={active}
        onChange={(value) => setParams(value === 'access' ? { tab: value } : {}, { replace: true })}
        render={(value) => (value === 'access' ? <AdminAccessPolicy /> : <UserDirectory active={active === 'users'} />)}
      />
    </div>
  );
}

function UserDirectory({ active }: { active: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const overview = useMonitoringData(adminApi.getDashboardOverview);
  const list = useAdminPage(
    adminApi.listUsers,
    { size: 15, status: statusFilter || undefined, tier: tierFilter || undefined },
    active
  );
  const users = list.data?.content ?? [];
  const { loading, error, search, setSearch, setPage } = list;
  const totalElements = list.data?.totalElements ?? 0;
  const loadUsers = () => {
    list.reload();
    overview.reload();
  };

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRole, setEditRole] = useState('USER');
  const [editTier, setEditTier] = useState('FREE');
  const [extendDays, setExtendDays] = useState(0);
  const [editVerified, setEditVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const [userToToggleBlock, setUserToToggleBlock] = useState<AdminUserItem | null>(null);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditFullName(user.fullName || '');
    setEditStatus(user.userStatus);
    setEditRole(user.systemRole);
    setEditTier(user.subscriptionTier);
    setEditVerified(user.emailVerified);
    setExtendDays(0);
    setFormError('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSubmitting(true);
      setFormError('');
      const updated = await adminApi.updateUser(editingUser.id, {
        fullName: editFullName.trim() || undefined,
        userStatus: editingUser.systemRole === 'ADMIN' ? undefined : editStatus,
        subscriptionTier: editTier,
        extendSubscriptionDays: extendDays > 0 ? extendDays : undefined,
        emailVerified: editVerified,
      });
      setNotice(`Đã cập nhật thông tin cho "${updated.fullName || updated.username}".`);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      setFormError(adminError(err, 'Cập nhật thất bại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmToggleBlockUser = async () => {
    if (!userToToggleBlock) return;
    setIsTogglingBlock(true);
    try {
      const updated = await adminApi.toggleBlockUser(userToToggleBlock.id);
      setNotice(`Đã ${updated.userStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản thành công.`);
      setUserToToggleBlock(null);
      loadUsers();
    } catch (err: unknown) {
      alert(adminError(err, 'Thao tác khóa/mở khóa thất bại'));
    } finally {
      setIsTogglingBlock(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await adminApi.deleteUser(userToDelete.id);
      setNotice(`Đã xóa tài khoản "${userToDelete.fullName || userToDelete.username}".`);
      setUserToDelete(null);
      loadUsers();
    } catch (err: unknown) {
      alert(adminError(err, 'Xóa người dùng thất bại'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice && <AdminNotice tone="emerald" message={notice} onClose={() => setNotice('')} />}

      <AdminStatStrip
        variant="pastel"
        busy={overview.loading}
        items={[
          { label: 'Tổng người dùng', value: metric(overview.value?.totalUsers ?? totalElements), icon: 'users', tone: 'emerald' },
          { label: 'Đang hoạt động', value: metric(overview.value?.activeUsers), icon: 'check', tone: 'sky' },
          { label: 'Chờ xác thực', value: metric(overview.value?.pendingUsers), icon: 'clock', tone: 'amber' },
          { label: 'Đã khóa', value: metric(overview.value?.lockedUsers), icon: 'lock', tone: 'rose' },
        ]}
      />

      <AdminSurface noPadding busy={loading}>
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--admin-border)]">
          <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
                <FinanceIcon name="search" size={14} />
              </span>
              <input
                type="search"
                aria-label="Tìm tài khoản"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, username, số điện thoại…"
                className="admin-input w-full pl-9"
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Trạng thái tài khoản"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="admin-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
              <option value="PENDING">PENDING</option>
            </select>

            <select
              aria-label="Gói tài khoản"
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              className="admin-select"
            >
              <option value="">Tất cả gói</option>
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>

            <span className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 text-xs text-[var(--admin-ink-muted)] tabular-nums">
              Tổng: <strong className="ml-1 text-[var(--admin-ink)]">{totalElements.toLocaleString('vi-VN')}</strong>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Danh sách người dùng">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Gói dịch vụ</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Xác thực Email</th>
                <th>Ngày đăng ký</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && !users.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[var(--admin-ink-muted)]">
                    Đang tải danh sách người dùng…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState
                      icon="users"
                      title="Không tìm thấy người dùng"
                      description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái / gói dịch vụ."
                    />
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isBlocked = u.userStatus === 'LOCKED';
                  const canToggle = u.systemRole !== 'ADMIN' && (u.userStatus === 'ACTIVE' || isBlocked);
                  const avatarTone = AVATAR_TONES[idx % AVATAR_TONES.length];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <AdminUserAvatar
                            avatarUrl={u.avatarUrl}
                            name={u.fullName || u.username || 'U'}
                            tone={avatarTone}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--admin-ink)] truncate">
                              {u.fullName || u.username}
                            </div>
                            <div className="text-xs text-[var(--admin-ink-muted)] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="space-y-0.5">
                          <AdminBadge
                            dot={false}
                            tone={
                              u.subscriptionTier === 'ENTERPRISE'
                                ? 'sky'
                                : u.subscriptionTier === 'PREMIUM'
                                ? 'amber'
                                : 'slate'
                            }
                          >
                            {u.subscriptionTier}
                          </AdminBadge>
                          {u.subscriptionExpiresAt && (
                            <div className="text-[11px] text-[var(--admin-ink-muted)] tabular-nums">
                              Hạn: {formatDateVN(u.subscriptionExpiresAt)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <AdminBadge dot={false} tone={u.systemRole === 'ADMIN' ? 'rose' : 'slate'}>
                          {u.systemRole}
                        </AdminBadge>
                      </td>

                      <td>
                        <AdminBadge
                          tone={isBlocked ? 'rose' : u.userStatus === 'ACTIVE' ? 'emerald' : 'amber'}
                        >
                          {u.userStatus}
                        </AdminBadge>
                      </td>

                      <td>
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <FinanceIcon name="check" size={13} />
                            Đã xác thực
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 dark:text-amber-300">Chưa xác thực</span>
                        )}
                      </td>

                      <td className="text-xs text-[var(--admin-ink-secondary)] whitespace-nowrap tabular-nums">
                        {formatDateVN(u.createdAt)}
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="admin-btn-secondary admin-btn-sm"
                          >
                            <FinanceIcon name="eye" size={13} />
                            Chi tiết
                          </button>

                          {canToggle && (
                            <button
                              type="button"
                              onClick={() => setUserToToggleBlock(u)}
                              className={
                                isBlocked
                                  ? 'admin-btn-primary admin-btn-sm'
                                  : 'admin-btn-secondary admin-btn-sm'
                              }
                            >
                              <FinanceIcon name="lock" size={13} />
                              {isBlocked ? 'Mở khóa' : 'Khóa'}
                            </button>
                          )}

                          {u.systemRole !== 'ADMIN' && (
                            <button
                              type="button"
                              aria-label="Xóa tài khoản"
                              title="Xóa tài khoản"
                              onClick={() => setUserToDelete(u)}
                              className="admin-btn-secondary admin-btn-sm !px-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            >
                              <FinanceIcon name="trash" size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Drawer Cập nhật Người dùng */}
      {editingUser && (
        <AdminDialog
          label="Chi tiết tài khoản"
          onClose={() => setEditingUser(null)}
          pending={isSubmitting}
          drawer
        >
          <div className="admin-dialog-body space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--admin-ink)] m-0">
                  Chi tiết tài khoản
                </h3>
                <p className="text-xs text-[var(--admin-ink-muted)] m-0 mt-0.5 truncate">
                  {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setEditingUser(null)}
                aria-label="Đóng"
                className="admin-icon-button"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            {formError && <AdminNotice tone="rose" message={formError} />}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Họ và tên</span>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  name="fullName"
                  className="admin-input"
                />
              </label>

              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Gói dịch vụ (Subscription Tier)</span>
                <select
                  value={editTier}
                  onChange={(e) => {
                    setEditTier(e.target.value);
                    setExtendDays(0);
                  }}
                  className="admin-select"
                >
                  <option value="FREE">Gói Miễn phí (FREE)</option>
                  <option value="PREMIUM">Gói Cá nhân VIP (PREMIUM)</option>
                  <option value="ENTERPRISE">Gói Doanh nghiệp (ENTERPRISE)</option>
                </select>
              </label>

              {editTier !== 'FREE' && (
                <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>Cộng thêm thời hạn VIP</span>
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="admin-select"
                  >
                    <option value={0}>Không gia hạn thêm</option>
                    <option value={30}>+ 30 ngày (1 tháng)</option>
                    <option value={90}>+ 90 ngày (3 tháng)</option>
                    <option value={365}>+ 365 ngày (1 năm)</option>
                  </select>
                </label>
              )}

              <div className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Vai trò hệ thống</span>
                <div className="h-9 px-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] flex items-center justify-between">
                  <span className="font-semibold text-[var(--admin-ink)]">
                    {editRole === 'ADMIN' ? 'ADMIN (Quản trị viên duy nhất)' : 'USER'}
                  </span>
                  <span className="text-[11px] text-[var(--admin-ink-muted)]">Đã khóa thay đổi quyền</span>
                </div>
              </div>

              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Trạng thái tài khoản</span>
                <select
                  value={editStatus}
                  disabled={editingUser.systemRole === 'ADMIN'}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="admin-select"
                >
                  <option value="ACTIVE">ACTIVE (Bình thường)</option>
                  {['ACTIVE', 'LOCKED'].includes(editingUser.userStatus) && (
                    <option value="LOCKED">LOCKED (Bị khóa đăng nhập)</option>
                  )}
                  {editingUser.userStatus === 'PENDING' && (
                    <option value="PENDING">PENDING (Chờ xác nhận)</option>
                  )}
                  <option value="INACTIVE">INACTIVE (Ngừng hoạt động)</option>
                  <option value="DISABLED">DISABLED (Vô hiệu hóa)</option>
                </select>
              </label>

              <label className="flex items-center gap-2.5 pt-1 text-xs text-[var(--admin-ink)] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  className="size-4 accent-[#007f53]"
                />
                <span>Đánh dấu Email đã xác thực OTP</span>
              </label>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingUser(null)}
                  className="admin-btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary">
                  {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </AdminDialog>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(userToToggleBlock)}
        title={userToToggleBlock?.userStatus === 'ACTIVE' ? 'Khóa tài khoản người dùng?' : 'Mở khóa tài khoản?'}
        subtitle={
          userToToggleBlock?.userStatus === 'ACTIVE'
            ? 'Người dùng sẽ bị chặn truy cập hệ thống ngay lập tức'
            : 'Người dùng có thể đăng nhập lại bình thường'
        }
        itemName={userToToggleBlock?.fullName || userToToggleBlock?.username}
        itemTypeLabel="Tài khoản"
        message={
          userToToggleBlock
            ? userToToggleBlock.userStatus === 'ACTIVE'
              ? `Bạn có chắc chắn muốn KHÓA tài khoản "${userToToggleBlock.fullName || userToToggleBlock.username}" không?`
              : `Bạn có muốn MỞ KHÓA tài khoản "${userToToggleBlock.fullName || userToToggleBlock.username}" không?`
            : ''
        }
        confirmText={userToToggleBlock?.userStatus === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
        iconName={userToToggleBlock?.userStatus === 'ACTIVE' ? 'shield' : 'check'}
        isDeleting={isTogglingBlock}
        onConfirm={confirmToggleBlockUser}
        onClose={() => setUserToToggleBlock(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(userToDelete)}
        title="Xác nhận xóa tài khoản người dùng"
        subtitle="Hành động này sẽ vô hiệu hóa và chuyển tài khoản vào danh sách đã xóa"
        itemName={userToDelete?.fullName || userToDelete?.username}
        itemTypeLabel="Người dùng"
        message={
          userToDelete
            ? `Bạn có chắc chắn muốn XÓA tài khoản "${userToDelete.fullName || userToDelete.username}" (${userToDelete.email}) khỏi hệ thống không?`
            : ''
        }
        confirmText="Xóa tài khoản"
        isDeleting={isDeletingUser}
        onConfirm={confirmDeleteUser}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
}
