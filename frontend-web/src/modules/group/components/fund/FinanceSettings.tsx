import { isAxiosError } from 'axios';
import { useState } from 'react';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { groupApi, type GroupFinanceConfigResponse } from '../../api/groupApi';

type Key =
  | 'useSharedFund'
  | 'useContributionPeriods'
  | 'allowFundReimbursements'
  | 'allowMemberSplits'
  | 'allowDebtSimplification';

type FieldMeta = {
  key: Key;
  label: string;
  description: string;
  indent?: boolean;
};

const GROUPS: { title: string; items: FieldMeta[] }[] = [
  {
    title: 'Quỹ chung & Đóng quỹ',
    items: [
      {
        key: 'useSharedFund',
        label: 'Quỹ chung nhóm',
        description: 'Cho phép thành viên đóng tiền từ ví cá nhân vào quỹ chung và chi tiêu từ quỹ.',
      },
      {
        key: 'useContributionPeriods',
        label: 'Kỳ đóng quỹ định kỳ',
        description: 'Lập đợt thu quỹ theo chu kỳ, phân bổ hạn mức và theo dõi tiến độ từng người.',
        indent: true,
      },
      {
        key: 'allowFundReimbursements',
        label: 'Hoàn trả tiền ứng trước',
        description: 'Theo dõi và hoàn tiền từ quỹ cho thành viên đã ứng tiền cá nhân chi hộ nhóm.',
        indent: true,
      },
    ],
  },
  {
    title: 'Chia tiền & Công nợ chéo',
    items: [
      {
        key: 'allowMemberSplits',
        label: 'Chia tiền giữa thành viên',
        description: 'Hiển thị tab Cân đối & bù trừ và cho phép chia khoản chi theo đầu người, số tiền hoặc tỷ lệ.',
      },
      {
        key: 'allowDebtSimplification',
        label: 'Cân đối bù trừ tự động',
        description: 'Tự động gom nợ chéo thành số lượt chuyển tiền ít nhất giữa các thành viên.',
        indent: true,
      },
    ],
  },
];

type Config = GroupFinanceConfigResponse;
type Props = {
  config: Config;
  canManage: boolean;
  fundBalance?: number;
  onSaved: (config: Config) => void;
};

function extractValues(config: Config): Record<Key, boolean> {
  return {
    useSharedFund: config.useSharedFund,
    useContributionPeriods: config.useContributionPeriods,
    allowMemberSplits: config.allowMemberSplits,
    allowDebtSimplification: config.allowDebtSimplification,
    allowFundReimbursements: config.allowFundReimbursements,
  };
}

export function FinanceSettings({ config, canManage, fundBalance, onSaved }: Props) {
  const [draft, setDraft] = useState(() => extractValues(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const baseline = extractValues(config);
  const hasChanges = (Object.keys(baseline) as Key[]).some((k) => draft[k] !== baseline[k]);

  const toggle = (key: Key, checked: boolean) => {
    setSavedToast(false);
    setDraft((current) => ({
      ...current,
      [key]: checked,
      ...(key === 'useSharedFund' && !checked ? { useContributionPeriods: false, allowFundReimbursements: false } : {}),
      ...(key === 'allowMemberSplits' && !checked ? { allowDebtSimplification: false } : {}),
    }));
  };

  const isDisabled = (key: Key) =>
    busy ||
    !canManage ||
    (!draft.useSharedFund && (key === 'useContributionPeriods' || key === 'allowFundReimbursements')) ||
    (!draft.allowMemberSplits && key === 'allowDebtSimplification');

  const save = async () => {
    if (busy || !canManage) return;
    setError('');
    setSavedToast(false);
    setBusy(true);
    try {
      const saved = await groupApi.updateFinanceConfig(config.groupId, draft);
      setDraft(extractValues(saved));
      onSaved(saved);
      setSavedToast(true);
    } catch (cause) {
      setError(
        isAxiosError(cause)
          ? cause.response?.data?.message || 'Không thể lưu cấu hình tài chính.'
          : 'Không thể lưu cấu hình tài chính.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
            <FinanceIcon name="wallet" size={19} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#0F172A] dark:text-slate-100">
              Tính năng tài chính nhóm
            </h3>
            <p className="m-0 mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
              {canManage
                ? 'Tùy chỉnh bật/tắt các tính năng hiển thị cho nhóm này'
                : 'Chỉ Trưởng nhóm hoặc Quản trị viên mới có thể thay đổi cấu hình này'}
            </p>
          </div>
        </div>
        {savedToast && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-300">
            <FinanceIcon name="check" size={12} />
            Đã lưu
          </span>
        )}
      </div>

      <div className="mt-4 space-y-5">
        {GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="border-b border-[#E2E8F0] py-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:border-slate-700/80 dark:text-slate-400">
              {group.title}
            </div>
            <div className="divide-y divide-[#E2E8F0]/70 dark:divide-slate-800">
              {group.items.map((item) => {
                const disabled = isDisabled(item.key);
                const checked = draft[item.key];
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 py-3.5 transition ${
                      item.indent ? 'pl-4 sm:pl-6' : ''
                    } ${disabled && canManage ? 'opacity-50' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                          {item.label}
                        </span>
                        {item.key === 'useSharedFund' && fundBalance != null && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-300">
                            Số dư: {fundBalance.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                      <p className="m-0 mt-0.5 text-xs leading-relaxed text-[#64748B] dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={item.label}
                      disabled={disabled}
                      onClick={() => toggle(item.key, !checked)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007F53] disabled:cursor-not-allowed ${
                        checked ? 'bg-[#007F53]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-xs transition-transform ${
                          checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <FinanceIcon name="alert-triangle" size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canManage && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
          {hasChanges && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(baseline);
                setError('');
              }}
              className="h-9 rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-xs font-semibold text-[#475569] transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hoàn tác
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !hasChanges}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#007F53] px-4 text-xs font-bold text-white transition hover:bg-[#006341] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FinanceIcon name="check" size={14} />
            <span>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</span>
          </button>
        </div>
      )}
    </section>
  );
}
