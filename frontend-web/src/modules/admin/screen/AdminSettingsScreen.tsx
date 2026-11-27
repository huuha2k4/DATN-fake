import React, { useState, useEffect, useCallback } from 'react';
import { AdminDialog } from '../components/AdminDialog';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminSurface } from '../components/AdminPrimitives';
import { adminError } from '../hooks/useAdminPage';
import { adminApi, type AdminSetting as SystemSettingItem } from '../api/adminApi';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';

const SETTING_METADATA: Record<
  string,
  { label: string; unit?: string; icon: IconName; hint: string; type: 'BOOLEAN' | 'NUMBER' | 'STRING' }
> = {
  MAINTENANCE_MODE: {
    label: 'Chế độ Bảo trì Hệ thống',
    icon: 'shield',
    type: 'BOOLEAN',
    hint: 'Khi bật, người dùng thông thường sẽ không thể đăng nhập hoặc thực hiện giao dịch mới.',
  },
  ALLOW_REGISTRATION: {
    label: 'Cho phép Đăng ký Tài khoản mới',
    icon: 'users',
    type: 'BOOLEAN',
    hint: 'Bật/Tắt tính năng tạo tài khoản mới từ trang đăng nhập ứng dụng.',
  },
  FREE_TIER_MAX_WALLETS: {
    label: 'Số ví tối đa (Gói Miễn phí)',
    unit: 'Ví',
    icon: 'wallet',
    type: 'NUMBER',
    hint: 'Số lượng ví tài khoản tối đa mà người dùng gói Free được phép tạo.',
  },
  FREE_TIER_OCR_LIMIT: {
    label: 'Hạn mức quét OCR / tháng (Gói Free)',
    unit: 'Lượt/tháng',
    icon: 'receipt',
    type: 'NUMBER',
    hint: 'Số lượt quét hóa đơn bằng công nghệ OCR miễn phí mỗi tháng.',
  },
  PREMIUM_TIER_PRICE_MONTHLY: {
    label: 'Giá gói Hội viên Premium',
    unit: 'VNĐ/tháng',
    icon: 'spark',
    type: 'NUMBER',
    hint: 'Mức phí gia hạn gói Premium hàng tháng thanh toán qua cổng thanh toán.',
  },
  ENTERPRISE_TIER_PRICE_MONTHLY: {
    label: 'Giá gói Doanh nghiệp (Enterprise)',
    unit: 'VNĐ/tháng',
    icon: 'trend',
    type: 'NUMBER',
    hint: 'Mức phí hàng tháng cho tài khoản quy mô tổ chức và công ty.',
  },
  AI_RESPONSE_TEMPERATURE: {
    label: 'Độ sáng tạo FinAI (Temperature)',
    unit: '0.0 - 1.0',
    icon: 'bot',
    type: 'NUMBER',
    hint: 'Chỉ số từ 0.0 (chính xác, logic toán) đến 1.0 (sáng tạo, giàu biểu cảm).',
  },
  SESSION_TIMEOUT_HOURS: {
    label: 'Thời gian hết hạn phiên đăng nhập',
    unit: 'Giờ',
    icon: 'calendar',
    type: 'NUMBER',
    hint: 'Thời lượng duy trì JWT token trước khi bắt buộc đăng nhập lại.',
  },
};

export const AdminSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [maintenanceChange, setMaintenanceChange] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('ALL');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const items = await adminApi.listSettings();
      setSettings(items);
      setFormValues(Object.fromEntries(items.map((item) => [item.key, item.value])));
    } catch (err: unknown) {
      setErrorMsg(adminError(err, 'Không thể tải cấu hình'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchSettings();
    });
    return () => {
      active = false;
    };
  }, [fetchSettings]);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = async (item: SystemSettingItem) => {
    const currentVal = item.value === 'true' || item.value === '1';
    const nextVal = (!currentVal).toString();
    if (item.key === 'MAINTENANCE_MODE') {
      setErrorMsg(null);
      setMaintenanceChange(nextVal);
      return;
    }
    await handleSave(item.key, nextVal);
  };

  const handleSave = async (key: string, customVal?: string) => {
    try {
      setSavingKey(key);
      setSuccessMsg(null);
      setErrorMsg(null);
      const valToSave = customVal !== undefined ? customVal : formValues[key] ?? '';
      const saved = await adminApi.updateSetting(key, valToSave);
      const label = SETTING_METADATA[key]?.label || key;
      setMaintenanceChange(null);
      setSuccessMsg(`Đã cập nhật [${label}] thành công.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setSettings((prev) => prev.map((item) => (item.key === key ? saved : item)));
      setFormValues((prev) => ({ ...prev, [key]: saved.value }));
    } catch (err: unknown) {
      setErrorMsg(adminError(err, `Lỗi khi lưu cấu hình [${key}]`));
    } finally {
      setSavingKey(null);
    }
  };

  const sectionDefs: { id: string; title: string; icon: IconName; groupKeys: string[] }[] = [
    { id: 'AI', title: 'FinAI', icon: 'layers', groupKeys: ['AI'] },
    { id: 'AUTH', title: 'Tài khoản', icon: 'users', groupKeys: ['AUTH'] },
    { id: 'TIERS', title: 'Gói cước & Hạn mức', icon: 'layers', groupKeys: ['SUBSCRIPTION', 'PRICING'] },
    { id: 'SYSTEM', title: 'Hệ thống', icon: 'settings', groupKeys: ['SYSTEM'] },
    { id: 'SECURITY', title: 'Bảo mật & Phiên', icon: 'shield', groupKeys: ['SECURITY'] },
  ];

  const groups = [
    { id: 'ALL', label: 'Tất cả', groupKeys: [] as string[] },
    { id: 'SYSTEM', label: 'Hệ thống', groupKeys: ['SYSTEM'] },
    { id: 'AUTH', label: 'Tài khoản', groupKeys: ['AUTH'] },
    { id: 'TIERS', label: 'Gói cước & Hạn mức', groupKeys: ['SUBSCRIPTION', 'PRICING'] },
    { id: 'AI', label: 'FinAI', groupKeys: ['AI'] },
    { id: 'SECURITY', label: 'Bảo mật & Phiên', groupKeys: ['SECURITY'] },
  ];

  const visibleSections = (activeGroup === 'ALL'
    ? sectionDefs
    : sectionDefs.filter((sec) => sec.id === activeGroup)
  )
    .map((sec) => ({
      ...sec,
      items: settings.filter((s) => sec.groupKeys.includes(s.group)),
    }))
    .filter((sec) => sec.items.length > 0);

  const renderSettingRow = (item: SystemSettingItem) => {
    const meta = SETTING_METADATA[item.key] || {
      label: item.key,
      icon: 'filter' as IconName,
      type: 'STRING' as const,
      hint: item.description,
    };
    const isSaving = savingKey === item.key;
    const currentVal = formValues[item.key] ?? item.value;
    const isBool = item.type === 'BOOLEAN';
    const validNumber =
      /^\d+$/.test(currentVal) &&
      Number(currentVal) >= (item.min ?? 0) &&
      Number(currentVal) <= (item.max ?? Number.MAX_SAFE_INTEGER);
    const hasChanged = currentVal !== item.value;

    return (
      <div
        key={item.key}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:px-5"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--admin-ink)]">{meta.label}</span>
            <code className="rounded bg-[var(--admin-surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--admin-ink-muted)] border border-[var(--admin-border)]">
              {item.key}
            </code>
            <AdminBadge dot={false} tone="slate">
              {item.group}
            </AdminBadge>
          </div>
          <p className="text-xs text-[var(--admin-ink-muted)] m-0 max-w-2xl">
            {item.effect || meta.hint}
          </p>
        </div>

        <div className="shrink-0 md:min-w-[16rem] flex items-center justify-end">
          {!item.editable ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-1.5 text-xs text-[var(--admin-ink-secondary)]">
              <span>Chỉ đọc:</span>
              <strong className="text-[var(--admin-ink)] tabular-nums">{item.value || 'N/A'}</strong>
            </div>
          ) : isBool ? (
            <div className="flex items-center gap-3">
              <AdminBadge tone={currentVal === 'true' ? 'emerald' : 'slate'}>
                {currentVal === 'true' ? 'Đang bật' : 'Đang tắt'}
              </AdminBadge>
              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={savingKey !== null}
                role="switch"
                aria-label={meta.label}
                aria-checked={currentVal === 'true' || currentVal === '1'}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  currentVal === 'true' ? 'bg-[#007f53]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition-transform ${
                    currentVal === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-44">
                <input
                  type="number"
                  aria-label={meta.label}
                  min={item.min ?? undefined}
                  max={item.max ?? undefined}
                  step={1}
                  value={currentVal}
                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                  className="admin-input w-full pr-16 font-semibold tabular-nums"
                />
                {meta.unit && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--admin-ink-muted)]">
                    {meta.unit}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(item.key)}
                disabled={savingKey !== null || !hasChanged || !validNumber}
                className={hasChanged ? 'admin-btn-primary' : 'admin-btn-secondary'}
              >
                <FinanceIcon name="check" size={14} />
                {isSaving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Group Filter Tabs */}
      <div className="admin-tabs" role="tablist" aria-label="Nhóm cấu hình hệ thống">
        {groups.map((g) => {
          const isActive = activeGroup === g.id;
          const count =
            g.id === 'ALL'
              ? settings.length
              : settings.filter((s) => g.groupKeys.includes(s.group)).length;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveGroup(g.id)}
              className="inline-flex items-center gap-2"
            >
              <span>{g.label}</span>
              <span className="text-[11px] opacity-75 tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      {successMsg && <AdminNotice tone="emerald" message={successMsg} onClose={() => setSuccessMsg(null)} />}
      {errorMsg && (
        <AdminNotice
          tone="rose"
          message={errorMsg}
          action={
            !settings.length ? (
              <button type="button" className="admin-btn-secondary admin-btn-sm" onClick={fetchSettings}>
                Thử lại
              </button>
            ) : undefined
          }
        />
      )}

      {loading ? (
        <AdminSurface noPadding busy>
          <div className="flex items-center gap-3 p-8 text-xs text-[var(--admin-ink-muted)]">
            <div className="size-5 border-2 border-[#007f53] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải danh sách tham số cấu hình…</span>
          </div>
        </AdminSurface>
      ) : visibleSections.length === 0 ? (
        <AdminSurface noPadding>
          <AdminEmptyState icon="filter" title="Chưa có tham số trong nhóm này" />
        </AdminSurface>
      ) : (
        <div className="space-y-4">
          {visibleSections.map((sec) => (
            <AdminSurface key={sec.id} noPadding icon={sec.icon} headerVariant="mint" title={sec.title}>
              <div className="divide-y divide-[var(--admin-border)]">
                {sec.items.map(renderSettingRow)}
              </div>
            </AdminSurface>
          ))}
        </div>
      )}

      {maintenanceChange !== null && (
        <AdminDialog
          label="Xác nhận chế độ bảo trì"
          pending={savingKey !== null}
          onClose={() => setMaintenanceChange(null)}
        >
          <div className="admin-dialog-body space-y-4">
            <h2 className="text-base font-bold text-[var(--admin-ink)] m-0">
              {maintenanceChange === 'true' ? 'Bật chế độ bảo trì?' : 'Tắt chế độ bảo trì?'}
            </h2>
            <p className="text-xs text-[var(--admin-ink-secondary)] m-0 leading-relaxed">
              {maintenanceChange === 'true'
                ? 'Tài khoản thường sẽ tạm thời không thể đăng nhập hoặc sử dụng ứng dụng. Quản trị viên vẫn truy cập được.'
                : 'Tài khoản thường sẽ có thể đăng nhập và sử dụng ứng dụng trở lại.'}
            </p>
            {errorMsg && <AdminNotice tone="rose" message={errorMsg} />}
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                autoFocus
                disabled={savingKey !== null}
                onClick={() => setMaintenanceChange(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                disabled={savingKey !== null}
                onClick={() => void handleSave('MAINTENANCE_MODE', maintenanceChange)}
              >
                {savingKey ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
};
