import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface AuditLogItem {
  id: string;
  adminUsername: string;
  adminFullName: string;
  action: string;
  targetEntity: string;
  targetId: string;
  description: string;
  ipAddress: string;
  status: string;
  createdAt: string;
}

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
  changedFields?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
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

  // Admin Audit Logs state (core.audit_logs)
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  // System Audit Logs state (ops.audit_logs — in-memory unlock token only)
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [sysLogs, setSysLogs] = useState<SystemAuditItem[]>([]);
  const [sysLoading, setSysLoading] = useState(false);
  const [sysError, setSysError] = useState('');
  const [sysCategory, setSysCategory] = useState('');
  const [sysOutcome, setSysOutcome] = useState('');
  const [sysSeverity, setSysSeverity] = useState('');
  const [sysSearch, setSysSearch] = useState('');
  const [sysPage, setSysPage] = useState(0);
  const [sysTotalPages, setSysTotalPages] = useState(0);
  const [sysTotalElements, setSysTotalElements] = useState(0);
  const [selectedSysLog, setSelectedSysLog] = useState<SystemAuditItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listAuditLogs({
        action: actionFilter || undefined,
        targetEntity: entityFilter || undefined,
      });
      setLogs(res || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, entityFilter]);

  const loadSystemAuditLogs = async (tokenOverride?: string, pageOverride?: number) => {
    const token = tokenOverride ?? unlockToken;
    if (!token) return;
    try {
      setSysLoading(true);
      setSysError('');
      const res = await adminApi.listSystemAuditLogs(token, {
        category: sysCategory || undefined,
        outcome: sysOutcome || undefined,
        severity: sysSeverity || undefined,
        search: sysSearch.trim() || undefined,
        page: pageOverride ?? sysPage,
        size: 20,
      });
      setSysLogs(res.content || []);
      setSysTotalPages(res.totalPages || 0);
      setSysTotalElements(res.totalElements || 0);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setUnlockToken(null);
        setUnlockModalOpen(true);
        setUnlockError(err?.response?.data?.message || 'Phiên mở khóa đã hết hạn. Vui lòng nhập lại mật khẩu.');
      } else {
        setSysError(err?.response?.data?.message || 'Không thể tải nhật ký hệ thống');
      }
    } finally {
      setSysLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'SYSTEM' && unlockToken) {
      loadSystemAuditLogs();
    }
  }, [activeMode, unlockToken, sysCategory, sysOutcome, sysSeverity, sysPage]);

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
      await loadSystemAuditLogs(res.unlockToken, 0);
    } catch (err: any) {
      setUnlockError(err?.response?.data?.message || 'Xác thực mật khẩu thất bại.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockSystemAudit = () => {
    setUnlockToken(null);
    setSysLogs([]);
    setSelectedSysLog(null);
    setActiveMode('ADMIN');
  };

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.description ?? '').toLowerCase().includes(q) ||
      (l.action ?? '').toLowerCase().includes(q) ||
      (l.adminFullName ?? '').toLowerCase().includes(q) ||
      (l.targetEntity ?? '').toLowerCase().includes(q) ||
      (l.ipAddress ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 0. THANH CHUYỂN CHẾ ĐỘ: NHẬT KÝ QUẢN TRỊ vs NHẬT KÝ HỆ THỐNG (BẢO MẬT .ENV) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-2xl bg-gray-100/90 dark:bg-slate-800/80 p-1 border border-gray-200/70 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveMode('ADMIN')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMode === 'ADMIN'
                ? 'bg-white dark:bg-slate-900 text-[#007F53] dark:text-emerald-400 shadow-xs'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Nhật ký Quản trị
          </button>
          <button
            type="button"
            onClick={handleOpenSystemAudit}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'SYSTEM'
                ? 'bg-[#007F53] text-white shadow-xs'
                : 'text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
            }`}
          >
            <FinanceIcon name="shield" size={13} />
            <span>Nhật ký hệ thống</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
              {unlockToken ? 'Đã mở' : 'Khóa MK'}
            </span>
          </button>
        </div>

        {activeMode === 'SYSTEM' && unlockToken && (
          <button
            type="button"
            onClick={handleLockSystemAudit}
            className="h-9 px-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
          >
            Khóa lại phiên xem
          </button>
        )}
      </div>

      {activeMode === 'ADMIN' ? (
      <>
      {/* 1. THANH LỌC & TÌM KIẾM ĐỒNG BỘ CHUẨN */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Mô tả hành động, Quản trị viên, Hành vi, Địa chỉ IP..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <FinanceIcon name="search" size={15} />
            </span>
          </div>

          {/* Lọc Hành vi & Đối tượng */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Đối tượng</option>
              <option value="USER">Người dùng (USER)</option>
              <option value="CATEGORY">Danh mục (CATEGORY)</option>
              <option value="NOTIFICATION">Thông báo (NOTIFICATION)</option>
              <option value="SYSTEM">Hệ thống (SYSTEM)</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Hành vi</option>
              <option value="USER_UPDATE">Cập nhật User</option>
              <option value="USER_LOCK">Khóa tài khoản</option>
              <option value="USER_UNLOCK">Mở khóa tài khoản</option>
              <option value="CATEGORY_CREATE">Tạo danh mục</option>
              <option value="BROADCAST_SEND">Phát thông báo</option>
            </select>

            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Tổng: <strong className="text-[#007F53] dark:text-emerald-400 font-bold">{filteredLogs.length}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              className="h-10 px-4 rounded-xl bg-[#007F53] hover:bg-[#004D3B] text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* 2. BẢNG DANH SÁCH NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL TABLE) */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Quản trị viên thực hiện</th>
                <th className="py-3.5 px-4">Hành vi (Action)</th>
                <th className="py-3.5 px-4">Đối tượng tác động</th>
                <th className="py-3.5 px-4">Nội dung chi tiết</th>
                <th className="py-3.5 px-4">Địa chỉ IP</th>
                <th className="py-3.5 px-5 text-right">Thời gian ghi nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="inline-block size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="m-0 text-xs">Đang truy xuất nhật ký bảo mật...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Chưa có nhật ký hoạt động nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isLock = log.action === 'USER_LOCK';
                  const isBroadcast = log.action === 'BROADCAST_SEND';
                  const isCreate = log.action.includes('CREATE');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cột 1: Admin */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="size-8 rounded-full bg-[#007F53] text-white font-bold text-xs grid place-items-center shrink-0">
                            A
                          </span>
                          <div>
                            <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px]">
                              {log.adminFullName}
                            </strong>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                              @{log.adminUsername}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Hành vi */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[11px]">
                        <span
                          className={`px-2 py-1 rounded-md ${
                            isLock
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : isBroadcast
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : isCreate
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Cột 3: Đối tượng tác động */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                          {log.targetEntity}
                        </span>
                      </td>

                      {/* Cột 4: Mô tả */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <span className="text-gray-700 dark:text-slate-300 block line-clamp-2 leading-relaxed">
                          {log.description}
                        </span>
                      </td>

                      {/* Cột 5: IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                        {log.ipAddress}
                      </td>

                      {/* Cột 6: Thời gian */}
                      <td className="py-3.5 px-5 text-right text-gray-400 text-[11px]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="flex flex-col gap-5 w-full">
          {/* Thanh lọc Nhật ký Hệ thống */}
          <div className="overview-main-panel !p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sysSearch}
                  onChange={(e) => setSysSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSysPage(0);
                      loadSystemAuditLogs(undefined, 0);
                    }
                  }}
                  placeholder="Tìm theo Action, Request ID, Endpoint, Reason code..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="absolute left-3 top-3 text-gray-400">
                  <FinanceIcon name="search" size={15} />
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <select
                  value={sysCategory}
                  onChange={(e) => { setSysCategory(e.target.value); setSysPage(0); }}
                  className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Tất cả Nhóm</option>
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
                  value={sysOutcome}
                  onChange={(e) => { setSysOutcome(e.target.value); setSysPage(0); }}
                  className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Tất cả Kết quả</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILURE">FAILURE</option>
                  <option value="DENIED">DENIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <select
                  value={sysSeverity}
                  onChange={(e) => { setSysSeverity(e.target.value); setSysPage(0); }}
                  className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Tất cả Mức độ</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadSystemAuditLogs(undefined, sysPage)}
                  className="h-10 px-4 rounded-xl bg-[#007F53] hover:bg-[#004D3B] text-white text-xs font-bold transition cursor-pointer"
                >
                  Tìm / Làm mới
                </button>
              </div>
            </div>
          </div>

          {sysError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
              {sysError}
            </div>
          )}

          {/* Bảng Nhật ký Hệ thống */}
          <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-50/70 dark:bg-slate-800/40">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Sự kiện</th>
                    <th className="py-3 px-4">Kết quả / Mức độ</th>
                    <th className="py-3 px-4">Nguồn / Actor</th>
                    <th className="py-3 px-4">Đối tượng / Endpoint</th>
                    <th className="py-3 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {sysLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        Đang tải nhật ký hệ thống...
                      </td>
                    </tr>
                  ) : sysLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        Chưa có sự kiện nào phù hợp bộ lọc
                      </td>
                    </tr>
                  ) : (
                    sysLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-[11px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {item.occurredAt ? new Date(item.occurredAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 dark:text-white block">{item.eventType}</span>
                          <span className="text-[10px] text-gray-400">{item.eventCategory}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.outcome === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.outcome === 'DENIED'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {item.outcome}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                              {item.severity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800 dark:text-slate-200 block">
                            {item.source} · {item.actorType}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {item.actorId ? `${item.actorId.slice(0, 8)}...` : 'ANONYMOUS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 block truncate">
                            {item.resourceType || '—'} {item.resourceId ? `(${item.resourceId.slice(0, 8)}...)` : ''}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 block truncate">
                            {item.httpMethod ? `${item.httpMethod} ${item.endpoint || ''}` : item.reasonCode || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSysLog(item)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-[#007F53] dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500">
              <span>Tổng: <strong>{sysTotalElements}</strong> sự kiện</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sysPage <= 0}
                  onClick={() => setSysPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  Trước
                </button>
                <span>Trang {sysPage + 1} / {Math.max(1, sysTotalPages)}</span>
                <button
                  type="button"
                  disabled={sysPage + 1 >= sysTotalPages}
                  onClick={() => setSysPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập mật khẩu .env để mở khóa Nhật ký Hệ thống */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleUnlockSubmit}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-[#007F53] dark:text-emerald-400 grid place-items-center">
                  <FinanceIcon name="shield" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Mở khóa Nhật ký Hệ thống
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Nhập mật khẩu bảo mật để tiếp tục
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            <input
              type="password"
              autoFocus
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#007F53]"
            />

            {unlockError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 m-0">{unlockError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={unlocking}
                className="h-9 px-4 rounded-xl bg-[#007F53] hover:bg-[#004D3B] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
              >
                {unlocking ? 'Đang xác thực...' : 'Xác nhận mở khóa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xem chi tiết 1 sự kiện System Audit */}
      {selectedSysLog && (() => {
        const payloadObj = selectedSysLog.newValues || selectedSysLog.oldValues || selectedSysLog.metadata || {};
        const payloadTitle = selectedSysLog.newValues
          ? 'Chi tiết dữ liệu (New Values)'
          : selectedSysLog.oldValues
          ? 'Chi tiết dữ liệu (Old Values)'
          : 'Chi tiết dữ liệu (Metadata)';
        const jsonString = JSON.stringify(payloadObj, null, 2);
        const jsonLines = jsonString.split('\n');
        const hasBeforeAfter =
          payloadObj.balanceBefore != null && payloadObj.balanceAfter != null;
        const delta = hasBeforeAfter
          ? Number(payloadObj.balanceAfter) - Number(payloadObj.balanceBefore)
          : null;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            onClick={() => setSelectedSysLog(null)}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-2xl flex flex-col gap-4 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`size-11 rounded-xl grid place-items-center shrink-0 ${
                    selectedSysLog.outcome === 'SUCCESS'
                      ? 'bg-emerald-50 text-[#007F53] dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
                      : selectedSysLog.outcome === 'DENIED'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                  }`}>
                    <FinanceIcon name={selectedSysLog.eventCategory === 'SECURITY' || selectedSysLog.eventCategory === 'AUTH' ? 'shield' : 'receipt'} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                      {EVENT_TITLE_MAP[selectedSysLog.eventType] || selectedSysLog.eventType}
                    </h3>
                    <span className="mt-1 inline-block rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-[#007F53] dark:text-emerald-300 font-mono">
                      {selectedSysLog.eventType}
                    </span>
                    <p className="mt-1.5 text-[11px] text-gray-500 dark:text-slate-400 font-mono truncate">
                      Request ID: {selectedSysLog.requestId || '—'} • Correlation ID: {selectedSysLog.correlationId || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    selectedSysLog.outcome === 'SUCCESS'
                      ? 'bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-300'
                      : selectedSysLog.outcome === 'DENIED'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {selectedSysLog.outcome === 'SUCCESS' ? '✓ Thành công' : selectedSysLog.outcome === 'DENIED' ? '✕ Bị từ chối' : selectedSysLog.outcome}
                  </span>
                  <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-gray-600 dark:text-slate-300">
                    {selectedSysLog.severity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSysLog(null)}
                    className="ml-1 size-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-white grid place-items-center cursor-pointer"
                  >
                    <FinanceIcon name="close" size={16} />
                  </button>
                </div>
              </div>

              {/* Card Thông tin chung */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-slate-700/80 bg-gray-50/40 dark:bg-slate-800/30 p-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-800 dark:text-white">
                  <FinanceIcon name="receipt" size={14} className="text-[#007F53] dark:text-emerald-400" />
                  <span>Thông tin chung</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Danh mục</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      {CATEGORY_LABEL_MAP[selectedSysLog.eventCategory] || selectedSysLog.eventCategory}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Người thực hiện</span>
                    <span className="font-semibold text-gray-900 dark:text-white font-mono text-right truncate max-w-[240px]">
                      {selectedSysLog.actorType} {selectedSysLog.actorId ? `(${selectedSysLog.actorId})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Đối tượng</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      {selectedSysLog.resourceType || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Nguồn</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      {SOURCE_LABEL_MAP[selectedSysLog.source] || selectedSysLog.source}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">ID đối tượng</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200 text-right truncate max-w-[240px]">
                      {selectedSysLog.resourceId || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Thời gian</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">
                      {selectedSysLog.occurredAt ? new Date(selectedSysLog.occurredAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  {selectedSysLog.endpoint && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-slate-400">Endpoint</span>
                      <span className="font-mono text-gray-800 dark:text-slate-200 text-right truncate max-w-[240px]">
                        {selectedSysLog.httpMethod ? `${selectedSysLog.httpMethod} ` : ''}{selectedSysLog.endpoint}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-slate-400">Nguyên nhân / Lỗi</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200 text-right">
                      {selectedSysLog.reasonCode || selectedSysLog.errorCode || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 cột: Dữ liệu tóm tắt + Chi tiết JSON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trái: Dữ liệu tóm tắt */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-800 dark:text-white">
                    <FinanceIcon name="wallet" size={14} className="text-[#007F53] dark:text-emerald-400" />
                    <span>Dữ liệu nghiệp vụ</span>
                  </div>
                  {Object.keys(payloadObj).length === 0 ? (
                    <p className="text-gray-400 py-6 text-center m-0">Không có dữ liệu chi tiết kèm theo</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                      {Object.entries(payloadObj).map(([k, v]) => (
                        <div key={k} className="py-2.5 flex items-center justify-between gap-3">
                          <span className="text-gray-500 dark:text-slate-400">
                            {FIELD_LABEL_MAP[k] || k}
                          </span>
                          {k === 'type' ? (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              v === 'EXPENSE'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : v === 'INCOME'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                            }`}>
                              {v === 'EXPENSE' ? 'Chi tiêu' : v === 'INCOME' ? 'Thu nhập' : v === 'TRANSFER' ? 'Chuyển ví' : String(v)}
                            </span>
                          ) : MONEY_FIELDS.has(k) ? (
                            <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                              {formatAuditMoney(v)}
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-800 dark:text-slate-200 font-mono text-right truncate max-w-[210px]">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          )}
                        </div>
                      ))}

                      {delta !== null && !Number.isNaN(delta) && (
                        <div className="py-2.5 flex items-center justify-between gap-3">
                          <span className="text-gray-500 dark:text-slate-400">Biến động</span>
                          <span className={`font-bold tabular-nums ${
                            delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {delta >= 0 ? `+${delta.toLocaleString('vi-VN')} ₫` : `${delta.toLocaleString('vi-VN')} ₫`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Phải: Chi tiết JSON có số dòng + Copy */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">
                      {'{}'} {payloadTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(jsonString);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 1500);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-[11px] font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {copiedJson ? 'Đã copy' : 'Copy JSON'}
                    </button>
                  </div>
                  <div className="rounded-xl border border-gray-200/70 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3 font-mono text-[11px] overflow-x-auto flex-1">
                    {jsonLines.map((line, i) => (
                      <div key={i} className="flex gap-3 leading-5">
                        <span className="text-gray-400 select-none w-4 text-right shrink-0">{i + 1}</span>
                        <span className="text-gray-800 dark:text-slate-200 whitespace-pre">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedSysLog(null)}
                  className="h-9 px-5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

