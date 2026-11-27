import React, { useCallback, useEffect, useState } from 'react';
import { AdminDialog } from '../components/AdminDialog';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminSurface } from '../components/AdminPrimitives';
import { useAdminPage, adminError } from '../hooks/useAdminPage';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface SystemAuditItem {
  id: string;
  occurredAt: string;
  eventType: string;
  eventCategory: string;
  action: string;
  severity: string;
  outcome: string;
  actorId?: string;
  actorType: string;
  actorRole?: string;
  subjectUserId?: string;
  source: string;
  resourceType?: string;
  resourceId?: string;
  relatedResourceId?: string;
  groupId?: string;
  requestId?: string;
  correlationId?: string;
  httpMethod?: string;
  endpoint?: string;
  changedFields?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reasonCode?: string;
  errorCode?: string;
}

const EVENT_TITLE_MAP: Record<string, string> = {
  TRANSACTION_CREATED: 'Tạo giao dịch',
  TRANSACTION_UPDATED: 'Cập nhật giao dịch',
  TRANSACTION_DELETED: 'Xóa giao dịch',
  TRANSACTION_TRANSFER_COMPLETED: 'Chuyển tiền giữa ví',
  ACCOUNT_CREATED: 'Tạo tài khoản / ví',
  ACCOUNT_UPDATED: 'Cập nhật tài khoản / ví',
  ACCOUNT_DELETED: 'Xóa tài khoản / ví',
  ACCOUNT_BALANCE_ADJUSTED: 'Điều chỉnh số dư ví',
  BUDGET_CREATED: 'Tạo ngân sách',
  BUDGET_UPDATED: 'Cập nhật ngân sách',
  BUDGET_DELETED: 'Xóa ngân sách',
  GOAL_CREATED: 'Tạo mục tiêu tiết kiệm',
  GOAL_UPDATED: 'Cập nhật mục tiêu',
  GOAL_CONTRIBUTION_ADDED: 'Đóng góp mục tiêu',
  GOAL_WITHDRAWAL_COMPLETED: 'Rút tiền từ mục tiêu',
  GOAL_COMPLETED: 'Hoàn thành mục tiêu',
  DEBT_CREATED: 'Tạo khoản nợ',
  DEBT_UPDATED: 'Cập nhật khoản nợ',
  DEBT_DELETED: 'Xóa khoản nợ',
  DEBT_PAYMENT_RECORDED: 'Thanh toán khoản nợ',
  DEBT_SETTLED: 'Tất toán khoản nợ',
  AUTH_LOGIN_SUCCESS: 'Đăng nhập thành công',
  AUTH_LOGIN_FAILURE: 'Đăng nhập thất bại',
  AUTH_LOGOUT: 'Đăng xuất',
  AUTH_REGISTER_SUCCESS: 'Đăng ký tài khoản',
  AUTH_GOOGLE_LOGIN_SUCCESS: 'Đăng nhập Google thành công',
  AUTH_GOOGLE_LOGIN_FAILURE: 'Đăng nhập Google thất bại',
  AUTH_PASSWORD_CHANGED: 'Đổi mật khẩu',
  AUTH_PASSWORD_RESET_COMPLETED: 'Đặt lại mật khẩu',
  AUTH_ACCOUNT_LOCKED: 'Khóa tài khoản tự động',
  AUTH_2FA_ENABLED: 'Bật xác thực 2FA',
  AUTH_2FA_DISABLED: 'Tắt xác thực 2FA',
  AUTH_2FA_VERIFY_SUCCESS: 'Xác thực 2FA thành công',
  AUTH_2FA_VERIFY_FAILURE: 'Xác thực 2FA thất bại',
  ACCESS_DENIED: 'Từ chối truy cập trái phép',
  INVALID_ROLE_ACCESS: 'Vi phạm phân quyền hệ thống',
  ADMIN_SYSTEM_AUDIT_UNLOCKED: 'Mở khóa Nhật ký hệ thống',
  ADMIN_RESOURCE_MUTATION: 'Thao tác quản trị',
  ADMIN_USER_SUSPENDED: 'Admin khóa tài khoản',
  ADMIN_USER_REACTIVATED: 'Admin mở khóa tài khoản',
  ADMIN_ROLE_CHANGED: 'Admin thay đổi vai trò',
  ADMIN_SUBSCRIPTION_CHANGED: 'Admin cập nhật gói dịch vụ',
  OCR_TRANSACTION_CREATED: 'Tạo giao dịch từ hóa đơn OCR',
  FINAI_ACTION_PROPOSED: 'FinAI đề xuất hành động',
  FINAI_ACTION_EXECUTED: 'FinAI thực thi hành động',
  FINAI_ACTION_CANCELLED: 'Hủy hành động FinAI',
  FINAI_ACTION_EXECUTION_FAILED: 'FinAI thực thi thất bại',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  TRANSACTION: 'Giao dịch (TRANSACTION)',
  ACCOUNT: 'Tài khoản / Ví (ACCOUNT)',
  AUTH: 'Xác thực (AUTH)',
  SECURITY: 'Bảo mật (SECURITY)',
  BUDGET: 'Ngân sách (BUDGET)',
  GOAL: 'Mục tiêu (GOAL)',
  DEBT: 'Công nợ (DEBT)',
  SCHEDULE: 'Lịch định kỳ (SCHEDULE)',
  GROUP: 'Chi tiêu nhóm (GROUP)',
  KIDS_WALLET: 'Ví của bé (KIDS_WALLET)',
  FINAI: 'Trợ lý FinAI (FINAI)',
  OCR: 'Quét hóa đơn (OCR)',
  ADMIN: 'Quản trị (ADMIN)',
  USER: 'Người dùng (USER)',
  CATEGORY: 'Danh mục (CATEGORY)',
};

const SOURCE_LABEL_MAP: Record<string, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  ADMIN_PORTAL: 'Admin Portal',
  FINAI: 'FinAI',
  OCR: 'OCR',
  SYSTEM_JOB: 'System Job',
  INTERNAL_SERVICE: 'Internal Service',
  UNKNOWN: 'Không xác định',
};

const MONEY_FIELDS = new Set([
  'amount',
  'balanceBefore',
  'balanceAfter',
  'adjustmentAmount',
  'totalAmount',
  'targetAmount',
  'currentAmount',
  'withdrawAmount',
  'principalAmount',
  'remainingAmount',
  'rewardAmount',
]);

const FIELD_LABEL_MAP: Record<string, string> = {
  type: 'Loại giao dịch',
  amount: 'Số tiền',
  accountId: 'Tài khoản',
  balanceBefore: 'Số dư trước',
  balanceAfter: 'Số dư sau',
  adjustmentAmount: 'Số tiền điều chỉnh',
  totalAmount: 'Tổng hạn mức',
  targetAmount: 'Mục tiêu',
  currentAmount: 'Hiện có',
  withdrawAmount: 'Số tiền rút',
  principalAmount: 'Số tiền gốc',
  remainingAmount: 'Còn lại',
  rewardAmount: 'Tiền thưởng',
  status: 'Trạng thái',
  accountType: 'Loại ví',
  groupType: 'Loại nhóm',
  currency: 'Tiền tệ',
  splitMethod: 'Cách chia',
  role: 'Vai trò',
  toolName: 'Công cụ FinAI',
  mfaEnabled: 'Xác thực 2FA',
  isNewUser: 'Người dùng mới',
  allDevices: 'Tất cả thiết bị',
  ttlSeconds: 'Thời hạn mở khóa (giây)',
  failures: 'Số lần sai',
  loginHmac: 'Định danh (HMAC)',
};

function formatAuditMoney(val: unknown): string {
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return `${num.toLocaleString('vi-VN')} ₫`;
}

export const AdminAuditLogsScreen: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'ADMIN' | 'SYSTEM'>('ADMIN');

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const list = useAdminPage(
    adminApi.listAuditLogs,
    { size: 15, action: actionFilter || undefined, targetEntity: entityFilter || undefined },
    activeMode === 'ADMIN'
  );
  const { search, setSearch, loading, error } = list;
  const logs = list.data?.content ?? [];

  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [sysCategory, setSysCategory] = useState('');
  const [sysOutcome, setSysOutcome] = useState('');
  const [sysSeverity, setSysSeverity] = useState('');
  const fetchSystemPage = useCallback(
    (params: Parameters<typeof adminApi.listSystemAuditLogs>[1], signal?: AbortSignal) =>
      adminApi.listSystemAuditLogs(unlockToken ?? '', params, signal),
    [unlockToken]
  );
  const sysList = useAdminPage(
    fetchSystemPage,
    {
      size: 20,
      category: sysCategory || undefined,
      outcome: sysOutcome || undefined,
      severity: sysSeverity || undefined,
    },
    activeMode === 'SYSTEM' && Boolean(unlockToken)
  );
  const sysLoading = sysList.loading;
  const sysError = sysList.error;
  const sysPage = sysList.page;
  const sysTotalPages = sysList.data?.totalPages ?? 0;
  const sysTotalElements = sysList.data?.totalElements ?? 0;
  const sysLogs = unlockToken && !sysLoading ? sysList.data?.content ?? [] : [];
  const { search: sysSearch, setSearch: setSysSearch } = sysList;
  const setSysPage = sysList.setPage;
  const [selectedSysLog, setSelectedSysLog] = useState<SystemAuditItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    if (sysList.errorStatus !== 401 && sysList.errorStatus !== 403) return;
    const timer = window.setTimeout(() => {
      setUnlockToken(null);
      setSelectedSysLog(null);
      setUnlockModalOpen(true);
      setUnlockError('Phiên mở khóa đã hết hạn. Vui lòng nhập lại mật khẩu.');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sysList.errorStatus]);

  const handleOpenSystemAudit = () => {
    if (unlockToken) {
      setActiveMode('SYSTEM');
    } else {
      setUnlockPassword('');
      setUnlockError('');
      setUnlockModalOpen(true);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      setUnlockError('Vui lòng nhập mật khẩu bảo mật.');
      return;
    }
    try {
      setUnlocking(true);
      setUnlockError('');
      const res = await adminApi.unlockSystemAudit(unlockPassword);
      setUnlockToken(res.unlockToken);
      setUnlockPassword('');
      setUnlockModalOpen(false);
      setActiveMode('SYSTEM');
      setSysPage(0);
      sysList.reload();
    } catch (err: unknown) {
      setUnlockError(adminError(err, 'Xác thực mật khẩu thất bại.'));
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockSystemAudit = () => {
    setUnlockToken(null);
    setSelectedSysLog(null);
    setActiveMode('ADMIN');
  };

  return (
    <div className="space-y-5">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-tabs" role="tablist" aria-label="Nguồn nhật ký hệ thống">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'ADMIN'}
            onClick={() => setActiveMode('ADMIN')}
          >
            Nhật ký quản trị viên
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'SYSTEM'}
            onClick={() => setActiveMode('SYSTEM')}
            className="inline-flex items-center gap-2"
          >
            <FinanceIcon name="shield" size={14} />
            <span>Nhật ký hệ thống</span>
            <AdminBadge dot={false} tone={unlockToken ? 'emerald' : 'slate'}>
              {unlockToken ? 'Đã mở' : 'Khóa'}
            </AdminBadge>
          </button>
        </div>

        {activeMode === 'SYSTEM' && unlockToken && (
          <button
            type="button"
            onClick={handleLockSystemAudit}
            className="admin-btn-secondary admin-btn-sm text-rose-600 dark:text-rose-400"
          >
            <FinanceIcon name="shield" size={13} />
            Khóa lại phiên xem
          </button>
        )}
      </div>

      {/* Locked State */}
      {activeMode === 'SYSTEM' && !unlockToken && (
        <AdminSurface>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--admin-selected)] text-[var(--admin-selected-text)]">
                <FinanceIcon name="shield" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--admin-ink)] m-0">
                  Nhật ký hệ thống
                </h2>
                <p className="text-xs text-[var(--admin-ink-muted)] m-0 mt-1">
                  Yêu cầu xác thực mật khẩu cấp 2 để truy cập chi tiết sự kiện bảo mật và thay đổi dữ liệu toàn hệ thống.
                </p>
              </div>
            </div>
            <button type="button" className="admin-btn-primary shrink-0" onClick={handleOpenSystemAudit}>
              Mở khóa nhật ký
            </button>
          </div>
        </AdminSurface>
      )}

      {activeMode === 'ADMIN' ? (
        <div className="space-y-4">
          <AdminSurface noPadding busy={loading}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--admin-border)]">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
                  <FinanceIcon name="search" size={14} />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Tìm nhật ký cũ"
                  placeholder="Tìm theo mô tả, quản trị viên, hành vi, IP…"
                  className="admin-input w-full pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  aria-label="Đối tượng tác động"
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value);
                    list.setPage(0);
                  }}
                  className="admin-select"
                >
                  <option value="">Tất cả đối tượng</option>
                  <option value="USER">USER</option>
                  <option value="CATEGORY">CATEGORY</option>
                  <option value="NOTIFICATION">NOTIFICATION</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>

                <select
                  aria-label="Hành vi"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    list.setPage(0);
                  }}
                  className="admin-select"
                >
                  <option value="">Tất cả hành vi</option>
                  <option value="USER_UPDATE">Cập nhật User</option>
                  <option value="USER_LOCK">Khóa tài khoản</option>
                  <option value="USER_UNLOCK">Mở khóa tài khoản</option>
                  <option value="CATEGORY_CREATE">Tạo danh mục</option>
                  <option value="BROADCAST_SEND">Phát thông báo</option>
                </select>

                <span className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 text-xs text-[var(--admin-ink-muted)] tabular-nums">
                  Tổng: <strong className="ml-1 text-[var(--admin-ink)]">{list.data?.totalElements ?? 0}</strong>
                </span>

                <button type="button" onClick={list.reload} className="admin-btn-secondary">
                  <FinanceIcon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>
            </div>

            <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bảng nhật ký cũ">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Quản trị viên</th>
                    <th>Hành vi</th>
                    <th>Đối tượng</th>
                    <th>Nội dung chi tiết</th>
                    <th>Địa chỉ IP</th>
                    <th className="text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !logs.length ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[var(--admin-ink-muted)]">
                        Đang truy xuất nhật ký…
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-rose-600 dark:text-rose-400">
                        {error}
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <AdminEmptyState icon="calendar" title="Chưa có nhật ký phù hợp" />
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isLock = log.action === 'USER_LOCK';
                      const isBroadcast = log.action === 'BROADCAST_SEND';
                      const isCreate = log.action.includes('CREATE');

                      return (
                        <tr key={log.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <span className="size-7 rounded-full bg-[var(--admin-selected)] text-[var(--admin-selected-text)] font-semibold text-xs grid place-items-center shrink-0">
                                A
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-[var(--admin-ink)]">{log.adminFullName}</div>
                                <div className="text-[11px] text-[var(--admin-ink-muted)] font-mono">
                                  @{log.adminUsername}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <AdminBadge
                              dot={false}
                              tone={isLock ? 'rose' : isBroadcast ? 'sky' : isCreate ? 'emerald' : 'slate'}
                            >
                              {log.action}
                            </AdminBadge>
                          </td>

                          <td>
                            <code className="rounded bg-[var(--admin-surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--admin-ink-secondary)] border border-[var(--admin-border)]">
                              {log.targetEntity}
                            </code>
                          </td>

                          <td className="max-w-sm">
                            <span className="text-xs text-[var(--admin-ink-secondary)] line-clamp-2">
                              {log.description}
                            </span>
                          </td>

                          <td className="font-mono text-xs text-[var(--admin-ink-muted)]">{log.ipAddress}</td>

                          <td className="text-right text-xs text-[var(--admin-ink-muted)] whitespace-nowrap tabular-nums">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
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
        </div>
      ) : (
        unlockToken && (
          <div className="space-y-4">
            {sysError && <AdminNotice tone="rose" message={sysError} />}

            <AdminSurface noPadding busy={sysLoading}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--admin-border)]">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
                    <FinanceIcon name="search" size={14} />
                  </span>
                  <input
                    type="search"
                    aria-label="Tìm mã yêu cầu hoặc sự kiện"
                    value={sysSearch}
                    onChange={(e) => setSysSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sysList.reload();
                    }}
                    placeholder="Tìm theo Action, Request ID, Endpoint, Reason code…"
                    className="admin-input w-full pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    aria-label="Nhóm sự kiện"
                    value={sysCategory}
                    onChange={(e) => {
                      setSysCategory(e.target.value);
                      setSysPage(0);
                    }}
                    className="admin-select"
                  >
                    <option value="">Tất cả nhóm</option>
                    <option value="AUTH">AUTH</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="TRANSACTION">TRANSACTION</option>
                    <option value="ACCOUNT">ACCOUNT</option>
                    <option value="BUDGET">BUDGET</option>
                    <option value="GOAL">GOAL</option>
                    <option value="DEBT">DEBT</option>
                    <option value="SCHEDULE">SCHEDULE</option>
                    <option value="GROUP">GROUP</option>
                    <option value="KIDS_WALLET">KIDS_WALLET</option>
                    <option value="FINAI">FINAI</option>
                    <option value="OCR">OCR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>

                  <select
                    aria-label="Kết quả kiểm toán"
                    value={sysOutcome}
                    onChange={(e) => {
                      setSysOutcome(e.target.value);
                      setSysPage(0);
                    }}
                    className="admin-select"
                  >
                    <option value="">Tất cả kết quả</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILURE">FAILURE</option>
                    <option value="DENIED">DENIED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>

                  <select
                    aria-label="Mức độ sự kiện"
                    value={sysSeverity}
                    onChange={(e) => {
                      setSysSeverity(e.target.value);
                      setSysPage(0);
                    }}
                    className="admin-select"
                  >
                    <option value="">Tất cả mức độ</option>
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>

                  <button type="button" onClick={sysList.reload} className="admin-btn-primary">
                    <FinanceIcon name="refresh" size={14} className={sysLoading ? 'animate-spin' : ''} />
                    Làm mới
                  </button>
                </div>
              </div>

              <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bảng nhật ký hệ thống">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Sự kiện</th>
                      <th>Kết quả / Mức độ</th>
                      <th>Nguồn / Actor</th>
                      <th>Đối tượng / Endpoint</th>
                      <th className="text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sysLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-[var(--admin-ink-muted)]">
                          Đang tải nhật ký hệ thống…
                        </td>
                      </tr>
                    ) : sysLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <AdminEmptyState icon="shield" title="Chưa có sự kiện nào khớp bộ lọc" />
                        </td>
                      </tr>
                    ) : (
                      sysLogs.map((item) => (
                        <tr key={item.id}>
                          <td className="text-xs text-[var(--admin-ink-muted)] whitespace-nowrap tabular-nums">
                            {item.occurredAt ? new Date(item.occurredAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td>
                            <div className="font-semibold text-[var(--admin-ink)]">
                              {EVENT_TITLE_MAP[item.eventType] || item.eventType}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--admin-ink-muted)]">
                              {item.eventType} · {item.eventCategory}
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <AdminBadge
                                tone={
                                  item.outcome === 'SUCCESS'
                                    ? 'emerald'
                                    : item.outcome === 'DENIED' || item.outcome === 'FAILURE'
                                    ? 'rose'
                                    : 'amber'
                                }
                              >
                                {item.outcome}
                              </AdminBadge>
                              <AdminBadge dot={false} tone="slate">
                                {item.severity}
                              </AdminBadge>
                            </div>
                          </td>
                          <td>
                            <div className="font-medium text-[var(--admin-ink)]">
                              {item.source} · {item.actorType}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--admin-ink-muted)]">
                              {item.actorId ? `${item.actorId.slice(0, 8)}…` : 'ANONYMOUS'}
                            </div>
                          </td>
                          <td className="max-w-xs">
                            <div className="text-xs font-medium text-[var(--admin-ink)] truncate">
                              {item.resourceType || '—'}{' '}
                              {item.resourceId ? `(${item.resourceId.slice(0, 8)}…)` : ''}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--admin-ink-muted)] truncate">
                              {item.httpMethod
                                ? `${item.httpMethod} ${item.endpoint || ''}`
                                : item.reasonCode || '—'}
                            </div>
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedSysLog(item)}
                              className="admin-btn-secondary admin-btn-sm"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-5 py-3 text-xs text-[var(--admin-ink-muted)]">
                <span className="tabular-nums">
                  Tổng: <strong className="text-[var(--admin-ink)]">{sysTotalElements.toLocaleString('vi-VN')}</strong> sự kiện · Trang{' '}
                  {sysPage + 1} / {Math.max(1, sysTotalPages)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sysPage <= 0}
                    onClick={() => setSysPage(Math.max(0, sysPage - 1))}
                    className="admin-btn-secondary admin-btn-sm"
                  >
                    <FinanceIcon name="chevron-left" size={13} />
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={sysPage + 1 >= sysTotalPages}
                    onClick={() => setSysPage(sysPage + 1)}
                    className="admin-btn-secondary admin-btn-sm"
                  >
                    Sau
                    <FinanceIcon name="chevron-right" size={13} />
                  </button>
                </div>
              </div>
            </AdminSurface>
          </div>
        )
      )}

      {/* Modal mở khóa */}
      {unlockModalOpen && (
        <AdminDialog
          label="Mở khóa nhật ký hệ thống"
          onClose={() => setUnlockModalOpen(false)}
          pending={unlocking}
        >
          <form onSubmit={handleUnlockSubmit} className="admin-dialog-body space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-[var(--admin-selected)] text-[var(--admin-selected-text)] grid place-items-center">
                  <FinanceIcon name="shield" size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--admin-ink)] m-0">
                    Mở khóa Nhật ký Hệ thống
                  </h3>
                  <p className="text-xs text-[var(--admin-ink-muted)] m-0 mt-0.5">
                    Nhập mật khẩu bảo mật để tiếp tục
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={unlocking}
                onClick={() => setUnlockModalOpen(false)}
                aria-label="Đóng"
                className="admin-icon-button"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            <input
              type="password"
              aria-label="Mật khẩu nhật ký kiểm toán"
              autoFocus
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Nhập mật khẩu…"
              className="admin-input w-full"
            />

            {unlockError && <AdminNotice tone="rose" message={unlockError} />}

            <div className="admin-dialog-actions">
              <button
                type="button"
                disabled={unlocking}
                onClick={() => setUnlockModalOpen(false)}
                className="admin-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" disabled={unlocking} className="admin-btn-primary">
                {unlocking ? 'Đang xác thực…' : 'Xác nhận mở khóa'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}

      {/* Drawer xem chi tiết System Audit */}
      {selectedSysLog &&
        (() => {
          const payloadObj = selectedSysLog.newValues || selectedSysLog.oldValues || selectedSysLog.metadata || {};
          const payloadTitle = selectedSysLog.newValues
            ? 'New Values'
            : selectedSysLog.oldValues
            ? 'Old Values'
            : 'Metadata';
          const jsonString = JSON.stringify(payloadObj, null, 2);
          const jsonLines = jsonString.split('\n');
          const hasBeforeAfter = payloadObj.balanceBefore != null && payloadObj.balanceAfter != null;
          const delta = hasBeforeAfter
            ? Number(payloadObj.balanceAfter) - Number(payloadObj.balanceBefore)
            : null;

          return (
            <AdminDialog
              drawer
              label="Chi tiết nhật ký kiểm toán"
              onClose={() => setSelectedSysLog(null)}
            >
              <div className="admin-dialog-body space-y-5 text-xs">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge
                        tone={
                          selectedSysLog.outcome === 'SUCCESS'
                            ? 'emerald'
                            : selectedSysLog.outcome === 'DENIED' || selectedSysLog.outcome === 'FAILURE'
                            ? 'rose'
                            : 'amber'
                        }
                      >
                        {selectedSysLog.outcome}
                      </AdminBadge>
                      <AdminBadge dot={false} tone="slate">
                        {selectedSysLog.severity}
                      </AdminBadge>
                    </div>
                    <h3 className="text-base font-bold text-[var(--admin-ink)] m-0">
                      {EVENT_TITLE_MAP[selectedSysLog.eventType] || selectedSysLog.eventType}
                    </h3>
                    <div className="font-mono text-[11px] text-[var(--admin-ink-muted)]">
                      {selectedSysLog.eventType}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSysLog(null)}
                    aria-label="Đóng"
                    className="admin-icon-button"
                  >
                    <FinanceIcon name="close" size={16} />
                  </button>
                </div>

                {/* Thông tin chung */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)] m-0">
                    Thông tin sự kiện
                  </h4>
                  <dl className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 m-0">
                    {[
                      ['Danh mục', CATEGORY_LABEL_MAP[selectedSysLog.eventCategory] || selectedSysLog.eventCategory],
                      [
                        'Người thực hiện',
                        `${selectedSysLog.actorType}${selectedSysLog.actorId ? ` (${selectedSysLog.actorId})` : ''}`,
                      ],
                      ['Đối tượng', selectedSysLog.resourceType || '—'],
                      ['ID đối tượng', selectedSysLog.resourceId || '—'],
                      ['Nguồn', SOURCE_LABEL_MAP[selectedSysLog.source] || selectedSysLog.source],
                      [
                        'Thời gian',
                        selectedSysLog.occurredAt
                          ? new Date(selectedSysLog.occurredAt).toLocaleString('vi-VN')
                          : '—',
                      ],
                      ...(selectedSysLog.endpoint
                        ? [
                            [
                              'Endpoint',
                              `${selectedSysLog.httpMethod ? `${selectedSysLog.httpMethod} ` : ''}${selectedSysLog.endpoint}`,
                            ],
                          ]
                        : []),
                      ['Request ID', selectedSysLog.requestId || '—'],
                      ['Correlation ID', selectedSysLog.correlationId || '—'],
                      ['Nguyên nhân / Lỗi', selectedSysLog.reasonCode || selectedSysLog.errorCode || '—'],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex items-start justify-between gap-4">
                        <dt className="text-[var(--admin-ink-muted)] shrink-0">{k}</dt>
                        <dd className="m-0 font-mono text-right text-[var(--admin-ink)] break-all">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Dữ liệu nghiệp vụ */}
                {Object.keys(payloadObj).length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)] m-0">
                      Dữ liệu nghiệp vụ
                    </h4>
                    <div className="divide-y divide-[var(--admin-border)] rounded-lg border border-[var(--admin-border)] px-3.5">
                      {Object.entries(payloadObj).map(([k, v]) => (
                        <div key={k} className="py-2 flex items-center justify-between gap-3">
                          <span className="text-[var(--admin-ink-muted)]">{FIELD_LABEL_MAP[k] || k}</span>
                          {k === 'type' ? (
                            <AdminBadge
                              dot={false}
                              tone={v === 'EXPENSE' ? 'rose' : v === 'INCOME' ? 'emerald' : 'sky'}
                            >
                              {v === 'EXPENSE'
                                ? 'Chi tiêu'
                                : v === 'INCOME'
                                ? 'Thu nhập'
                                : v === 'TRANSFER'
                                ? 'Chuyển ví'
                                : String(v)}
                            </AdminBadge>
                          ) : MONEY_FIELDS.has(k) ? (
                            <span className="font-semibold tabular-nums text-[var(--admin-ink)]">
                              {formatAuditMoney(v)}
                            </span>
                          ) : (
                            <span className="font-mono text-right text-[var(--admin-ink)] break-all">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          )}
                        </div>
                      ))}
                      {delta !== null && !Number.isNaN(delta) && (
                        <div className="py-2 flex items-center justify-between gap-3">
                          <span className="text-[var(--admin-ink-muted)]">Biến động</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              delta >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {delta >= 0
                              ? `+${delta.toLocaleString('vi-VN')} ₫`
                              : `${delta.toLocaleString('vi-VN')} ₫`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* JSON */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)] m-0">
                      Payload ({payloadTitle})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(jsonString);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 1500);
                      }}
                      className="admin-btn-secondary admin-btn-sm"
                    >
                      {copiedJson ? 'Đã sao chép' : 'Sao chép JSON'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3 font-mono text-[11px] overflow-x-auto">
                    {jsonLines.map((line, i) => (
                      <div key={i} className="flex gap-3 leading-5">
                        <span className="text-[var(--admin-ink-muted)] select-none w-4 text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-[var(--admin-ink)] whitespace-pre">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-dialog-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedSysLog(null)}
                    className="admin-btn-secondary"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </AdminDialog>
          );
        })()}
    </div>
  );
};
