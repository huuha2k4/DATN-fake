import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Baby, CheckCircle2, Coins, Flag, Hourglass, TrendingDown, WalletCards } from 'lucide-react';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userApi } from '../../../user/api/userApi';
import type {
  ContributionPeriodResponse,
  GroupMemberResponse,
} from '../../api/groupApi';

interface GroupOverviewHeaderAndPeriodProps {
  currentUserId?: string;
  groupType: string;
  useContributionPeriods: boolean;
  isLeader: boolean;
  periodActionBusy: boolean;
  activeContributionPeriod: ContributionPeriodResponse | null;
  fundBalance: number;
  totalExpenses: number;
  expensesCount: number;
  members: GroupMemberResponse[];
  memberName: (userId: string) => string;
  childWalletsCount: number;
  childWalletsTotal: number;
  isFullySettled: boolean;
  simplifiedDebtsCount: number;
  onOpenDepositNow: () => void;
  onOpenCreatePeriod: () => void;
  onOpenHistory: () => void;
  onRemindPeriod: () => void;
  onClosePeriod: () => void;
  onAdjustObligation: (payload: {
    userId: string;
    amount: number;
    exempt: boolean;
    reason: string;
  }) => Promise<void>;
}

function formatViDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function GroupOverviewHeaderAndPeriod({
  currentUserId,
  groupType,
  useContributionPeriods,
  isLeader,
  periodActionBusy,
  activeContributionPeriod,
  fundBalance,
  totalExpenses,
  expensesCount,
  members,
  memberName,
  childWalletsCount,
  childWalletsTotal,
  isFullySettled,
  simplifiedDebtsCount,
  onOpenDepositNow,
  onOpenCreatePeriod,
  onOpenHistory,
  onRemindPeriod,
  onClosePeriod,
  onAdjustObligation,
}: GroupOverviewHeaderAndPeriodProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustState, setAdjustState] = useState({
    userId: '',
    amount: '',
    reason: '',
    exempt: false,
  });
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMoreMenu]);

  const liableMembers = activeContributionPeriod
    ? activeContributionPeriod.members.filter((m) => !m.exempt && m.status !== 'EXEMPT')
    : [];
  const completedMembersCount = liableMembers.filter(
    (m) => m.status === 'PAID' || m.status === 'OVERPAID'
  ).length;
  const totalRequired = activeContributionPeriod
    ? activeContributionPeriod.requiredTotal ??
    activeContributionPeriod.confirmedAmount + activeContributionPeriod.outstandingAmount
    : 0;

  const myObligation =
    activeContributionPeriod && currentUserId
      ? activeContributionPeriod.members.find(
          (m) => String(m.userId).toLowerCase() === String(currentUserId).toLowerCase()
        )
      : undefined;
  const isMyObligationDone = Boolean(
    myObligation &&
      (myObligation.status === 'PAID' ||
        myObligation.status === 'OVERPAID' ||
        myObligation.status === 'EXEMPT' ||
        (myObligation.requiredAmount > 0 && myObligation.outstandingAmount <= 0))
  );
  const isMyObligationPending = Boolean(
    !isMyObligationDone &&
      myObligation &&
      myObligation.pendingAmount > 0 &&
      myObligation.outstandingAmount <= myObligation.pendingAmount
  );

  return (
    <div
      id={activeContributionPeriod ? `finance-${activeContributionPeriod.id}` : undefined}
      className="flex flex-col gap-4"
    >
      {/* 1. Row of 4 Tinted KPI Summary Cards (Lên trên cùng) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Quỹ chung nhóm */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-3 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#007F53] dark:bg-emerald-900/60 dark:text-emerald-300">
            <WalletCards size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-[#475569] dark:text-emerald-200/80">
              Quỹ chung nhóm
            </span>
            <strong className="mt-0.5 block truncate text-[15px] font-extrabold tabular-nums text-[#007F53] dark:text-emerald-400">
              {fundBalance.toLocaleString('vi-VN')} đ
            </strong>
            <span className="block truncate text-[10.5px] text-[#64748B] dark:text-slate-400">
              Số dư có thể chi
            </span>
          </div>
        </div>

        {/* Card 2: Tổng chi tiêu */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200/70 bg-rose-50/60 p-3 shadow-2xs dark:border-rose-900/50 dark:bg-rose-950/25">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300">
            <TrendingDown size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-[#475569] dark:text-rose-200/80">
              Tổng chi tiêu
            </span>
            <strong className="mt-0.5 block truncate text-[15px] font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
              {totalExpenses.toLocaleString('vi-VN')} đ
            </strong>
            <span className="block truncate text-[10.5px] text-[#64748B] dark:text-slate-400">
              {expensesCount} khoản chi
            </span>
          </div>
        </div>

        {/* Card 3: Thành viên */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <FinanceIcon name="users" size={16} />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-[#475569] dark:text-slate-400">
              Thành viên
            </span>
            <strong className="mt-0.5 block truncate text-[15px] font-extrabold text-[#0F172A] dark:text-slate-100">
              {members.length} người
            </strong>
            <span className="block truncate text-[10.5px] text-[#64748B] dark:text-slate-400">
              Đang hoạt động
            </span>
          </div>
        </div>

        {/* Card 4: Ví trẻ em / Trạng thái nợ */}
        {groupType === 'FAMILY' ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/25">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
              <Baby size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-[#475569] dark:text-amber-200/80">
                Ví trẻ em ({childWalletsCount})
              </span>
              <strong className="mt-0.5 block truncate text-[15px] font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                {childWalletsTotal.toLocaleString('vi-VN')} đ
              </strong>
              <span className="block truncate text-[10.5px] text-[#64748B] dark:text-slate-400">
                Tổng quỹ các bé
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-sky-200/70 bg-sky-50/60 p-3 shadow-2xs dark:border-sky-900/50 dark:bg-sky-950/25">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
              <FinanceIcon name="check" size={16} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-[#475569] dark:text-sky-200/80">
                Trạng thái nợ
              </span>
              <strong className="mt-0.5 block truncate text-[15px] font-extrabold text-sky-700 dark:text-sky-400">
                {isFullySettled ? 'Sòng phẳng' : 'Có công nợ'}
              </strong>
              <span className="block truncate text-[10.5px] text-[#64748B] dark:text-slate-400">
                {simplifiedDebtsCount} khoản bù trừ
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Unified Card: Kỳ đóng quỹ + Tiến độ đóng quỹ */}
      {useContributionPeriods && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          {/* Header kỳ đóng quỹ */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#007F53] dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-400">
                <FinanceIcon name="calendar" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    id="contribution-period-title"
                    className="m-0 truncate text-sm font-bold tracking-tight text-[#0F172A] dark:text-slate-100"
                  >
                    {activeContributionPeriod?.name || 'Kỳ đóng quỹ'}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${activeContributionPeriod
                      ? 'border-emerald-200 bg-emerald-50 text-[#007F53] dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${activeContributionPeriod ? 'bg-[#007F53] dark:bg-emerald-400' : 'bg-slate-400'
                        }`}
                    />
                    {activeContributionPeriod ? 'Đang hoạt động' : 'Chưa có kỳ hoạt động'}
                  </span>
                </div>
                <p className="m-0 mt-0.5 text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                  {activeContributionPeriod
                    ? `Hạn đóng: ${formatViDate(activeContributionPeriod.dueDate)}`
                    : 'Tạo kỳ đóng quỹ để thu quỹ định kỳ, thiết lập mức đóng và theo dõi tiến độ của từng thành viên.'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={periodActionBusy}
                onClick={onOpenHistory}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[11.5px] font-semibold text-[#334155] transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FinanceIcon name="history" size={14} />
                <span>Lịch sử kỳ</span>
              </button>

              {activeContributionPeriod &&
                (isMyObligationDone ? (
                  <span
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11.5px] font-bold text-[#007F53] dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                    title="Bạn đã hoàn thành nghĩa vụ đóng quỹ kỳ này"
                  >
                    <CheckCircle2 size={14} strokeWidth={2.3} />
                    <span>{myObligation?.status === 'EXEMPT' ? 'Miễn đóng kỳ này' : 'Đã đóng quỹ'}</span>
                  </span>
                ) : isMyObligationPending ? (
                  <span
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11.5px] font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                    title="Khoản đóng quỹ của bạn đang chờ trưởng nhóm duyệt"
                  >
                    <Hourglass size={14} strokeWidth={2.2} />
                    <span>Chờ duyệt đóng quỹ</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenDepositNow}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-[#007F53] px-3.5 text-[11.5px] font-bold text-white shadow-2xs transition hover:bg-[#006341]"
                  >
                    <FinanceIcon name="wallet" size={14} />
                    <span>{myObligation?.status === 'PARTIAL' ? 'Đóng nốt kỳ này' : 'Đóng quỹ ngay'}</span>
                  </button>
                ))}

              {isLeader && !activeContributionPeriod && (
                <button
                  type="button"
                  onClick={onOpenCreatePeriod}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-[#007F53] px-3.5 text-[11.5px] font-bold text-white shadow-2xs transition hover:bg-[#006341]"
                >
                  <FinanceIcon name="plus" size={14} />
                  <span>Tạo kỳ đóng quỹ</span>
                </button>
              )}

              {isLeader && activeContributionPeriod && (
                <div ref={moreRef} className="relative">
                  <button
                    type="button"
                    aria-label="Thao tác kỳ đóng quỹ"
                    onClick={() => setShowMoreMenu((prev) => !prev)}
                    className="grid size-8.5 place-items-center rounded-xl border border-[#CBD5E1] bg-white text-[#475569] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <FinanceIcon name="more" size={15} />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowAdjustModal(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#334155] transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <FinanceIcon name="edit" size={13} className="text-[#007F53]" />
                        <span>Điều chỉnh hạn mức</span>
                      </button>
                      <button
                        type="button"
                        disabled={periodActionBusy}
                        onClick={() => {
                          setShowMoreMenu(false);
                          onClosePeriod();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <FinanceIcon name="check" size={13} />
                        <span>Kết thúc kỳ</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tiến độ đóng quỹ (gộp liền trong cùng thẻ) */}
          {activeContributionPeriod && (
            <div className="mt-4 border-t border-[#F1F5F9] pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8.5 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Coins size={16} strokeWidth={2} />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                      Tiến độ đóng quỹ
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-1 tabular-nums">
                      <strong className="text-lg font-extrabold text-[#007F53] dark:text-emerald-400">
                        {activeContributionPeriod.confirmedAmount.toLocaleString('vi-VN')} đ
                      </strong>
                      <span className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                        / {totalRequired.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>
                <strong className="text-sm font-extrabold tabular-nums text-[#007F53] dark:text-emerald-400">
                  {activeContributionPeriod.obligationProgressPercent.toLocaleString('vi-VN')}%
                </strong>
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={Math.min(100, activeContributionPeriod.obligationProgressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#007F53] transition-all"
                  style={{ width: `${Math.min(100, activeContributionPeriod.obligationProgressPercent)}%` }}
                />
              </div>

              <div className="mt-1.5 text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                {completedMembersCount}/{liableMembers.length} thành viên hoàn thành nghĩa vụ
              </div>

              {/* 4 Tinted Status Strip with circular icons */}
              <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#007F53] dark:bg-emerald-900/60 dark:text-emerald-300">
                    <FinanceIcon name="check" size={14} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[10.5px] font-medium text-[#475569] dark:text-slate-400">
                      Đã xác nhận
                    </span>
                    <strong className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-[#007F53] dark:text-emerald-400">
                      {activeContributionPeriod.confirmedAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/70 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
                    <Hourglass size={14} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[10.5px] font-medium text-[#475569] dark:text-slate-400">
                      Đang chờ duyệt
                    </span>
                    <strong className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                      {activeContributionPeriod.pendingAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/70 p-2.5 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                    <AlertCircle size={15} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[10.5px] font-medium text-[#475569] dark:text-slate-400">
                      Còn thiếu
                    </span>
                    <strong className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                      {activeContributionPeriod.outstandingAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-sky-200/70 bg-sky-50/70 p-2.5 dark:border-sky-900/50 dark:bg-sky-950/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-300">
                    <Flag size={14} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[10.5px] font-medium text-[#475569] dark:text-slate-400">
                      Đóng vượt
                    </span>
                    <strong className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-sky-600 dark:text-sky-400">
                      {activeContributionPeriod.excessAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Đóng quỹ thành viên (nối liền trong cùng 1 thẻ) */}
              <div className="mt-4 border-t border-[#F1F5F9] pt-4 dark:border-slate-800">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
                      <FinanceIcon name="users" size={16} />
                    </span>
                    <div>
                      <h4 className="m-0 text-[13px] font-bold text-[#0F172A] dark:text-slate-100">
                        Đóng quỹ thành viên
                      </h4>
                      <p className="m-0 mt-0.5 text-[11px] text-[#64748B] dark:text-slate-400">
                        {liableMembers.length} thành viên có nghĩa vụ đóng quỹ
                      </p>
                    </div>
                  </div>

                  {isLeader && (
                    <button
                      type="button"
                      disabled={periodActionBusy}
                      onClick={onRemindPeriod}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 text-[11.5px] font-semibold text-[#334155] transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <FinanceIcon name="bell" size={13} />
                      <span>Nhắc đóng quỹ</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeContributionPeriod.members.map((member) => {
              const avatar = member.avatarUrl ? userApi.getAvatarUrl(member.avatarUrl) : null;
              const mPct =
                member.requiredAmount > 0
                  ? Math.min(
                    100,
                    Math.round(
                      ((member.requiredAmount - member.outstandingAmount) / member.requiredAmount) * 100
                    )
                  )
                  : member.status === 'EXEMPT'
                    ? 100
                    : 0;
              const statusMeta = (
                {
                  UNPAID: {
                    label: 'Chưa đóng',
                    cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
                  },
                  PARTIAL: {
                    label: 'Đóng một phần',
                    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
                  },
                  PAID: {
                    label: 'Đã đủ',
                    cls: 'border-emerald-200 bg-emerald-50 text-[#007F53] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
                  },
                  OVERPAID: {
                    label: 'Đóng vượt',
                    cls: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
                  },
                  EXEMPT: {
                    label: 'Miễn đóng',
                    cls: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                  },
                } as const
              )[member.status];

              return (
                <div
                  key={member.userId}
                  className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-[#007F53] dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        {member.fullName.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#0F172A] dark:text-slate-100">
                      {member.fullName}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusMeta.cls}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11.5px] tabular-nums text-[#475569] dark:text-slate-300">
                    <span>
                      Đã đóng:{' '}
                      <strong className="text-[#0F172A] dark:text-slate-100">
                        {member.confirmedAmount.toLocaleString('vi-VN')} đ
                      </strong>{' '}
                      / {member.requiredAmount.toLocaleString('vi-VN')} đ
                    </span>
                    {member.outstandingAmount > 0 && (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        Thiếu {member.outstandingAmount.toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>

                  {member.pendingAmount > 0 && (
                    <div className="mt-0.5 text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                      Đang chờ xác nhận: {member.pendingAmount.toLocaleString('vi-VN')} đ
                    </div>
                  )}

                  {member.requiredAmount > 0 && (
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${member.status === 'PAID' || member.status === 'OVERPAID'
                          ? 'bg-[#007F53]'
                          : member.status === 'PARTIAL'
                            ? 'bg-amber-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        style={{ width: `${mPct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Popup Modal: Điều chỉnh hạn mức thành viên */}
      {showAdjustModal && activeContributionPeriod && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowAdjustModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-[#007F53] dark:bg-emerald-950/60 dark:text-emerald-400">
                  <FinanceIcon name="edit" size={18} />
                </span>
                <div>
                  <h3 className="m-0 text-base font-bold text-[#0F172A] dark:text-slate-100">
                    Điều chỉnh hạn mức
                  </h3>
                  <p className="m-0 text-xs text-[#64748B] dark:text-slate-400">
                    Thay đổi số tiền hoặc đánh dấu miễn đóng kỳ này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form
              className="mt-5 space-y-3.5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!adjustState.userId || !adjustState.reason.trim()) return;
                await onAdjustObligation({
                  userId: adjustState.userId,
                  amount: Number(adjustState.amount || '0'),
                  exempt: adjustState.exempt,
                  reason: adjustState.reason.trim(),
                });
                setAdjustState({ userId: '', amount: '', reason: '', exempt: false });
                setShowAdjustModal(false);
              }}
            >
              <div>
                <label className="mb-1 block text-xs font-bold text-[#334155] dark:text-slate-300">
                  Thành viên <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  value={adjustState.userId}
                  onChange={(event) => {
                    const row = activeContributionPeriod.members.find(
                      (item) => item.userId === event.target.value
                    );
                    setAdjustState({
                      userId: event.target.value,
                      amount: String(row?.requiredAmount ?? ''),
                      reason: '',
                      exempt: row?.exempt ?? false,
                    });
                  }}
                >
                  <option value="">Chọn thành viên</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {memberName(member.userId)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#334155] dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={adjustState.exempt}
                  onChange={(event) =>
                    setAdjustState({ ...adjustState, exempt: event.target.checked })
                  }
                  className="accent-[#007F53]"
                />
                Miễn đóng kỳ này
              </label>

              {!adjustState.exempt && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#334155] dark:text-slate-300">
                    Mức đóng mới (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={adjustState.amount ? Number(adjustState.amount).toLocaleString('vi-VN') : ''}
                    onChange={(event) =>
                      setAdjustState({
                        ...adjustState,
                        amount: event.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="VD: 500.000"
                    className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-bold tabular-nums dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#334155] dark:text-slate-300">
                  Lý do điều chỉnh <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  maxLength={300}
                  value={adjustState.reason}
                  onChange={(event) =>
                    setAdjustState({ ...adjustState, reason: event.target.value })
                  }
                  placeholder="VD: Miễn đóng do đi công tác..."
                  className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="h-10 rounded-xl border border-[#CBD5E1] bg-white px-4 text-xs font-semibold text-[#475569] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={periodActionBusy || !adjustState.userId || !adjustState.reason.trim()}
                  className="h-10 rounded-xl bg-[#007F53] px-5 text-xs font-bold text-white hover:bg-[#006341] disabled:opacity-50"
                >
                  Lưu điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
