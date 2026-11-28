import { useRef, useState } from 'react';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import {
  groupApi,
  type GroupFundContributionResponse,
  type FundReimbursementResponse,
  type ReimbursementPayment,
} from '../../api/groupApi';

type Props = {
  groupId: string;
  userId?: string;
  canManage: boolean;
  balance: number;
  contributions: GroupFundContributionResponse[];
  reimbursements: FundReimbursementResponse[];
  accounts: { id: string; name: string }[];
  memberName: (id: string) => string;
  expenseName: (id: string) => string;
  refresh: () => Promise<void>;
};

const money = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

const REIMBURSEMENT_STATUS: Record<string, { label: string; badge: string }> = {
  PENDING: {
    label: 'Chờ hoàn trả',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  },
  PARTIAL: {
    label: 'Hoàn một phần',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
  },
  COMPLETED: {
    label: 'Đã hoàn đủ',
    badge: 'bg-emerald-50 text-[#007F53] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

function formatShortDate(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function FundOperations(props: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const paymentAttempt = useRef<{ signature: string; key: string } | null>(null);
  const [history, setHistory] = useState<Record<string, ReimbursementPayment[]>>({});
  const [payment, setPayment] = useState<{ id: string; amount: string; wallet: boolean } | null>(null);

  const openReimbursements = props.reimbursements.filter(
    (r) => r.status === 'PENDING' || r.status === 'PARTIAL'
  ).length;

  const submit = async (action: () => Promise<unknown>, refetch = true) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      if (refetch) await props.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const pay = async (item: FundReimbursementResponse) => {
    if (!payment || payment.id !== item.id) return;
    const amount = Number(payment.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Math.min(props.balance, item.remainingAmount)) {
      setError('Kiểm tra số tiền hoàn trả, nghĩa vụ còn lại và số dư quỹ hiện có.');
      return;
    }
    const signature = JSON.stringify(payment);
    const key =
      paymentAttempt.current?.signature === signature
        ? paymentAttempt.current.key
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    paymentAttempt.current = { signature, key };
    await submit(async () => {
      await groupApi.payReimbursement(
        props.groupId,
        item.id,
        { amount, useAuthorizedWallet: payment.wallet },
        key
      );
      paymentAttempt.current = null;
      setPayment(null);
      setHistory((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    });
  };

  const toggleHistory = (id: string) => {
    if (history[id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    void submit(async () => {
      const rows = await groupApi.getReimbursementHistory(props.groupId, id);
      setHistory((current) => ({ ...current, [id]: rows }));
    }, false);
  };

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
            <FinanceIcon name="wallet" size={18} />
          </span>
          <div>
            <h3 className="m-0 text-sm font-bold text-[#0F172A] dark:text-slate-100">
              Hoàn trả tiền ứng
            </h3>
            <p className="m-0 text-xs text-[#64748B] dark:text-slate-400">
              Theo dõi và hoàn tiền từ quỹ chung cho thành viên đã ứng chi hộ nhóm
            </p>
          </div>
        </div>
        {openReimbursements > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            {openReimbursements} khoản đang chờ
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <FinanceIcon name="alert-triangle" size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {props.reimbursements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="m-0 text-xs font-semibold text-[#475569] dark:text-slate-300">
              Chưa có khoản tiền ứng nào cần hoàn trả
            </p>
            <p className="m-0 mt-1 text-[11px] text-[#64748B] dark:text-slate-400">
              Khi thành viên ứng tiền cá nhân để chi cho nhóm, tiến độ hoàn tiền từ quỹ sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          props.reimbursements.map((item) => {
            const badge = REIMBURSEMENT_STATUS[item.status] ?? REIMBURSEMENT_STATUS.PENDING;
            const pct =
              item.totalAmount > 0
                ? Math.min(100, Math.round((item.reimbursedAmount / item.totalAmount) * 100))
                : 0;
            const isOpen = item.remainingAmount > 0 && item.status !== 'CANCELLED';

            return (
              <div
                key={item.id}
                id={`finance-${item.id}`}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                        {props.expenseName(item.expenseId)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.badge}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                      Người ứng:{' '}
                      <strong className="text-[#334155] dark:text-slate-200">
                        {props.memberName(item.beneficiaryUserId)}
                      </strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-[#007F53] dark:text-emerald-400">
                    {pct}%
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 text-xs dark:bg-slate-900/70">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Đã ứng</span>
                    <strong className="tabular-nums text-[#0F172A] dark:text-slate-100">
                      {money(item.totalAmount)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Đã hoàn</span>
                    <strong className="tabular-nums text-[#007F53] dark:text-emerald-400">
                      {money(item.reimbursedAmount)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Còn lại</span>
                    <strong className="tabular-nums text-amber-600 dark:text-amber-400">
                      {money(item.remainingAmount)}
                    </strong>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-[#007F53] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {item.beneficiaryUserId === props.userId && isOpen && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <span className="text-[11px] font-semibold text-[#004D3B] dark:text-emerald-300">
                      Ví nhận hoàn trả:
                    </span>
                    <select
                      disabled={busy}
                      aria-label="Đồng ý nhận hoàn trả vào ví"
                      value={item.authorizedAccountId ?? ''}
                      onChange={(event) => {
                        const id = event.target.value || null;
                        void submit(() => groupApi.setReimbursementWallet(props.groupId, item.id, id));
                      }}
                      className="h-8 flex-1 min-w-[160px] rounded-lg border border-emerald-300 bg-white px-2.5 text-xs text-[#0F172A] dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Chọn ví nhận hoàn trả</option>
                      {props.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {props.canManage && isOpen && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setPayment(
                          payment?.id === item.id
                            ? null
                            : { id: item.id, amount: String(item.remainingAmount), wallet: Boolean(item.walletAuthorized) }
                        )
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#007F53] px-3 text-xs font-bold text-white transition hover:bg-[#006341] disabled:opacity-50"
                    >
                      <FinanceIcon name="wallet" size={13} />
                      <span>Ghi nhận hoàn trả</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleHistory(item.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#475569] transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <FinanceIcon name="history" size={13} />
                    <span>{history[item.id] ? 'Ẩn lịch sử' : 'Lịch sử hoàn trả'}</span>
                  </button>
                </div>

                {payment?.id === item.id && (
                  <div className="mt-3 space-y-2.5 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900/60 dark:bg-slate-900">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <label className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                        Số tiền hoàn trả (tối đa {money(Math.min(props.balance, item.remainingAmount))})
                        <input
                          aria-label="Số tiền hoàn trả"
                          inputMode="numeric"
                          value={payment.amount}
                          onChange={(e) =>
                            setPayment({ ...payment, amount: e.target.value.replace(/\D/g, '') })
                          }
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-xs font-semibold tabular-nums text-[#0F172A] focus:border-[#007F53] focus:outline-none dark:border-slate-700 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                        Phương thức hoàn trả
                        <select
                          aria-label="Phương thức hoàn trả"
                          value={payment.wallet ? 'wallet' : 'external'}
                          onChange={(e) =>
                            setPayment({ ...payment, wallet: e.target.value === 'wallet' })
                          }
                          className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#0F172A] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {item.walletAuthorized && (
                            <option value="wallet">Chuyển vào ví Finora người nhận</option>
                          )}
                          <option value="external">Ghi nhận đã hoàn trả trực tiếp</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPayment(null)}
                        className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void pay(item)}
                        className="h-8 rounded-lg bg-[#007F53] px-3.5 text-xs font-bold text-white hover:bg-[#006341] disabled:opacity-50"
                      >
                        Xác nhận hoàn {payment.amount ? money(Number(payment.amount)) : ''}
                      </button>
                    </div>
                  </div>
                )}

                {history[item.id] && (
                  <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="mb-1.5 text-[11px] font-bold text-[#475569] dark:text-slate-300">
                      Lịch sử các lần hoàn trả
                    </div>
                    {history[item.id].length === 0 ? (
                      <p className="m-0 text-xs text-[#64748B]">Chưa có lần hoàn trả nào.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-1.5 p-0 text-xs">
                        {history[item.id].map((row) => (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-1.5 first:border-t-0 first:pt-0 dark:border-slate-800"
                          >
                            <span className="font-semibold tabular-nums text-[#007F53] dark:text-emerald-400">
                              {money(row.amount)}
                            </span>
                            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                              {row.wallet ? 'Ví Finora' : 'Trực tiếp'} · {formatShortDate(row.paidAt)}
                              {row.note ? ` · ${row.note}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
