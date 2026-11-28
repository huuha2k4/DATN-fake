import { useEffect, useRef, useState } from 'react';
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../../core/components/FinanceIcon';
import { findBankOrWalletPreset } from '../../../account-management/constants/banksData';
import type { AccountItem } from '../../../account-management/api/accountApi';

function getFallbackAccountMeta(accountType?: string): { icon: IconName; bg: string; color: string } {
  switch (accountType) {
    case 'CASH':
      return { icon: 'wallet', bg: '#E8F8F0', color: '#059669' };
    case 'BANK_ACCOUNT':
      return { icon: 'bank', bg: '#E0F2FE', color: '#0284C7' };
    case 'E_WALLET':
      return { icon: 'wallet', bg: '#FEF3C7', color: '#D97706' };
    case 'CREDIT_CARD':
      return { icon: 'receipt', bg: '#FEE2E2', color: '#E11D48' };
    case 'SAVINGS':
      return { icon: 'savings', bg: '#F3E8FF', color: '#7C3AED' };
    case 'INVESTMENT':
      return { icon: 'trend', bg: '#DBEAFE', color: '#2563EB' };
    default:
      return { icon: 'wallet', bg: '#F1F5F9', color: '#475569' };
  }
}

export function AccountBrandBadge({
  account,
  size = 34,
}: {
  account?: Pick<AccountItem, 'name' | 'accountType'> | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const preset = findBankOrWalletPreset(account?.name);

  if (preset?.logoUrl && !imgError) {
    return (
      <span
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-2xs dark:border-slate-700"
      >
        <img
          src={preset.logoUrl}
          alt={preset.shortName}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  if (preset) {
    return (
      <span
        style={{
          width: size,
          height: size,
          backgroundColor: preset.bgColor,
          color: preset.textColor,
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold tracking-tight"
      >
        {preset.shortName.slice(0, 4)}
      </span>
    );
  }

  const meta = getFallbackAccountMeta(account?.accountType);
  return (
    <span
      style={{ width: size, height: size, backgroundColor: meta.bg, color: meta.color }}
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
    >
      <FinanceIcon name={meta.icon} size={Math.round(size * 0.48)} />
    </span>
  );
}

export function AccountDropdown({
  accounts,
  value,
  onChange,
  placeholder = 'Chọn ví / tài khoản',
}: {
  accounts: AccountItem[];
  value: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = accounts.find((a) => a.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
          open
            ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/15 dark:bg-slate-800'
            : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <AccountBrandBadge account={selected} size={34} />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
              {selected ? selected.name : placeholder}
            </div>
            <div className="truncate text-[11px] tabular-nums text-[#64748B] dark:text-slate-400">
              {selected
                ? `Số dư: ${(selected.balance ?? 0).toLocaleString('vi-VN')} đ`
                : 'Bấm để chọn tài khoản ngân hàng / ví'}
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 text-[#64748B] transition-transform duration-150 ${open ? 'rotate-180 text-[#007F53]' : ''}`}
        >
          <FinanceIcon name="chevron-down" size={16} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {accounts.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#64748B]">
              Chưa có ví / tài khoản phù hợp
            </div>
          ) : (
            accounts.map((acc) => {
              const isSelected = acc.id === value;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onChange(acc.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AccountBrandBadge account={acc} size={32} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                        {acc.name}
                      </div>
                      <div className="truncate text-[11px] tabular-nums text-[#64748B] dark:text-slate-400">
                        {(acc.balance ?? 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#007F53] text-white">
                      <FinanceIcon name="check" size={11} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function CategoryDropdown({
  categories,
  value,
  onChange,
  placeholder = 'Chọn danh mục chi',
}: {
  categories: Array<{ id: string; name: string }>;
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between gap-2.5 rounded-2xl border px-3 text-left transition ${
          open
            ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/15 dark:bg-slate-800'
            : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
            <FinanceIcon
              name={selected ? resolveCategoryIconName(undefined, 'EXPENSE', selected.name) : 'tag'}
              size={15}
            />
          </span>
          <span className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
            {selected ? selected.name : placeholder}
          </span>
        </div>
        <span
          className={`shrink-0 text-[#64748B] transition-transform duration-150 ${open ? 'rotate-180 text-[#007F53]' : ''}`}
        >
          <FinanceIcon name="chevron-down" size={16} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {categories.map((cat) => {
            const isSelected = cat.id === value;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                  isSelected
                    ? 'bg-emerald-50/90 text-[#007F53] dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-[#334155] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                      isSelected
                        ? 'bg-[#007F53] text-white'
                        : 'bg-slate-100 text-[#475569] dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <FinanceIcon name={resolveCategoryIconName(undefined, 'EXPENSE', cat.name)} size={14} />
                  </span>
                  <span className="truncate text-xs font-semibold">{cat.name}</span>
                </span>
                {isSelected && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#007F53] text-white">
                    <FinanceIcon name="check" size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PaymentSourceDropdown({
  value,
  onChange,
  showGroupFund,
  groupFundBalance,
}: {
  value: 'GROUP_FUND' | 'PERSONAL_ACCOUNT';
  onChange: (val: 'GROUP_FUND' | 'PERSONAL_ACCOUNT') => void;
  showGroupFund: boolean;
  groupFundBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const options: Array<{
    id: 'GROUP_FUND' | 'PERSONAL_ACCOUNT';
    title: string;
    subtitle: string;
    icon: IconName;
  }> = [
    ...(showGroupFund
      ? [
          {
            id: 'GROUP_FUND' as const,
            title: 'Quỹ chung nhóm',
            subtitle: `Số dư quỹ: ${groupFundBalance.toLocaleString('vi-VN')} đ`,
            icon: 'group' as IconName,
          },
        ]
      : []),
    {
      id: 'PERSONAL_ACCOUNT',
      title: 'Ví cá nhân của tôi',
      subtitle: 'Trích từ tài khoản ngân hàng / ví cá nhân',
      icon: 'wallet',
    },
  ];

  const selected = options.find((o) => o.id === value) ?? options[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
          open
            ? 'border-[#007F53] bg-white ring-2 ring-[#007F53]/15 dark:bg-slate-800'
            : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8.5 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
            <FinanceIcon name={selected.icon} size={16} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
              {selected.title}
            </div>
            <div className="truncate text-[11px] tabular-nums text-[#64748B] dark:text-slate-400">
              {selected.subtitle}
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 text-[#64748B] transition-transform duration-150 ${open ? 'rotate-180 text-[#007F53]' : ''}`}
        >
          <FinanceIcon name="chevron-down" size={16} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                  isSelected
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                      isSelected
                        ? 'bg-[#007F53] text-white'
                        : 'bg-slate-100 text-[#475569] dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <FinanceIcon name={opt.icon} size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                      {opt.title}
                    </div>
                    <div className="truncate text-[11px] tabular-nums text-[#64748B] dark:text-slate-400">
                      {opt.subtitle}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#007F53] text-white">
                    <FinanceIcon name="check" size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
