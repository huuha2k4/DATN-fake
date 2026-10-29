import { useEffect, useMemo, useState } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import {
  goalApi,
  type GoalResponse,
  type GoalSummaryResponse,
  type GoalType,
  type GoalPriority,
} from '../api/goalApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import './GoalsManagementScreen.css';

type Props = { onNotify: (message: string) => void };

// Danh sách các loại mục tiêu thân thiện với người dùng
const goalTypeOptions: { value: GoalType; label: string; icon: IconName; color: string }[] = [
  { value: 'PURCHASE', label: 'Mua sắm lớn (xe, nhà, máy tính...)', icon: 'wallet', color: '#06b6d4' },
  { value: 'SAVINGS' as any, label: 'Tích lũy & Tiết kiệm', icon: 'trend', color: '#10b981' },
  { value: 'EMERGENCY_FUND', label: 'Quỹ dự phòng khẩn cấp', icon: 'shield', color: '#3b82f6' },
  { value: 'VACATION', label: 'Du lịch & Nghỉ dưỡng', icon: 'calendar', color: '#f59e0b' },
  { value: 'EDUCATION', label: 'Học tập & Phát triển bản thân', icon: 'book', color: '#8b5cf6' },
  { value: 'INVESTMENT', label: 'Đầu tư sinh lời', icon: 'chart', color: '#059669' },
  { value: 'DEBT_PAYOFF', label: 'Thanh toán nợ', icon: 'bank', color: '#ec4899' },
  { value: 'OTHER', label: 'Mục tiêu khác', icon: 'spark', color: '#64748b' },
];

function ProgressBar({ percent, color = 'bg-[#006c49]', height = 'h-2' }: { percent: number; color?: string; height?: string }) {
  const bounded = Math.min(100, Math.max(0, percent));
  return (
    <div className={`relative w-full ${height} overflow-hidden rounded-full bg-[#e2e8f0] goal-progress-track`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${bounded}%` }} />
    </div>
  );
}

export function GoalsManagementScreen({ onNotify }: Props) {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [summaryData, setSummaryData] = useState<GoalSummaryResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [goalFilter, setGoalFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Modal Tạo mục tiêu mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<GoalType>('PURCHASE');
  const [newTarget, setNewTarget] = useState('');
  const [newAccumulated, setNewAccumulated] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState<GoalPriority>('MEDIUM');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Nạp thêm tiền (Đóng góp)
  const [depositGoal, setDepositGoal] = useState<GoalResponse | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSourceId, setDepositSourceId] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Modal Chi tiết mục tiêu
  const [detailGoal, setDetailGoal] = useState<GoalResponse | null>(null);

  // Tải danh sách mục tiêu & tổng quan từ backend
  const loadGoalsData = async () => {
    try {
      setIsLoading(true);
      const [listRes, sumRes] = await Promise.all([
        goalApi.getGoals(),
        goalApi.getGoalsSummary().catch(() => null),
      ]);
      setGoals(listRes.goals || []);
      if (sumRes) setSummaryData(sumRes);
    } catch {
      onNotify('Không thể tải danh sách mục tiêu tài chính');
    } finally {
      setIsLoading(false);
    }
  };

  // Tải danh sách ví/tài khoản để chọn nguồn nạp
  const loadAccounts = async () => {
    try {
      const res = await accountApi.getAccounts();
      setAccounts(res || []);
      if (res && res.length > 0) {
        setDepositSourceId(res[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadGoalsData();
    loadAccounts();
  }, []);

  // Lọc mục tiêu theo tab
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'completed') {
      return goals.filter((g) => g.status === 'COMPLETED' || (g.percentageComplete || 0) >= 100);
    }
    if (goalFilter === 'in_progress') {
      return goals.filter((g) => g.status !== 'COMPLETED' && (g.percentageComplete || 0) < 100);
    }
    return goals;
  }, [goals, goalFilter]);

  // Tổng hợp số liệu
  const totalTargetSum = useMemo(() => {
    if (summaryData?.summary?.totalTargetAmount != null) {
      return Number(summaryData.summary.totalTargetAmount);
    }
    return goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  }, [summaryData, goals]);

  const totalAccumulatedSum = useMemo(() => {
    if (summaryData?.summary?.totalSaved != null) {
      return Number(summaryData.summary.totalSaved);
    }
    return goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  }, [summaryData, goals]);

  const overallPercent = totalTargetSum > 0 ? Math.min(100, Math.round((totalAccumulatedSum / totalTargetSum) * 100)) : 0;
  const missingSum = Math.max(0, totalTargetSum - totalAccumulatedSum);

  // Tạo mục tiêu mới
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(newTarget.replace(/\D/g, ''));
    const accNum = parseFloat(newAccumulated.replace(/\D/g, '')) || 0;

    if (!newName.trim()) {
      onNotify('Vui lòng nhập tên mục tiêu');
      return;
    }
    if (!targetNum || targetNum <= 0) {
      onNotify('Vui lòng nhập số tiền mục tiêu hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const selectedTypeConfig = goalTypeOptions.find((o) => o.value === newType);
      await goalApi.createGoal({
        name: newName.trim(),
        goalType: newType,
        targetAmount: targetNum,
        currentAmount: accNum,
        targetDate: newDeadline || undefined,
        priority: newPriority,
        description: newDesc.trim() || undefined,
        icon: selectedTypeConfig?.icon || 'trend',
        color: selectedTypeConfig?.color || '#10b981',
      });

      onNotify('Tạo mục tiêu tài chính mới thành công!');
      setIsModalOpen(false);
      setNewName('');
      setNewTarget('');
      setNewAccumulated('');
      setNewDeadline('');
      setNewDesc('');
      loadGoalsData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tạo mục tiêu thất bại. Vui lòng thử lại';
      onNotify(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Nạp thêm tiền vào mục tiêu
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const addNum = parseFloat(depositAmount.replace(/\D/g, ''));
    if (!addNum || addNum <= 0) {
      onNotify('Vui lòng nhập số tiền nạp hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmittingDeposit(true);
      await goalApi.contribute(depositGoal.id, {
        amount: addNum,
        note: depositNote.trim() || undefined,
        sourceAccountId: depositSourceId || undefined,
      });

      onNotify(`Đã nạp ${addNum.toLocaleString('vi-VN')} đ vào mục tiêu "${depositGoal.name}"!`);
      setDepositGoal(null);
      setDepositAmount('');
      setDepositNote('');
      loadGoalsData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Nạp tiền vào mục tiêu thất bại';
      onNotify(msg);
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Xóa mục tiêu
  const handleDeleteGoal = async (goal: GoalResponse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mục tiêu "${goal.name}"?`)) return;
    try {
      await goalApi.deleteGoal(goal.id);
      onNotify('Đã xóa mục tiêu thành công!');
      setDetailGoal(null);
      loadGoalsData();
    } catch {
      onNotify('Xóa mục tiêu thất bại');
    }
  };

  // Mở modal chi tiết mục tiêu (fetch đầy đủ lịch sử đóng góp)
  const handleOpenDetailGoal = async (g: GoalResponse) => {
    setDetailGoal(g);
    try {
      const fullGoal = await goalApi.getGoalById(g.id);
      if (fullGoal) {
        setDetailGoal(fullGoal);
      }
    } catch {
      // Dùng dữ liệu hiện tại
    }
  };

  // Lấy icon hợp lệ và màu sắc cho mục tiêu
  const getGoalVisual = (goal: GoalResponse) => {
    const matched = goalTypeOptions.find((o) => o.value === goal.goalType);
    const color = goal.color || matched?.color || '#10b981';
    const icon: IconName = (goal.icon as IconName) || matched?.icon || 'trend';
    const label = matched?.label || 'Tích lũy tài chính';
    return { color, icon, label };
  };

  return (
    <main className="goals-management-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-3 pb-24 pt-4 text-[#14251f] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-6" aria-label="Quản lý mục tiêu tài chính">
      {/* 3 Cards thống kê tổng quan */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Thống kê mục tiêu">
        {/* Card 1: Tổng mục tiêu */}
        <article className="goal-stat-card flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Tổng Mục Tiêu Cần Tích Lũy</p>
              <p className="mt-1 text-2xl font-bold text-[#14251f]">
                {totalTargetSum.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#eaf0fb] text-[#2563eb]">
              <FinanceIcon name="chart" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Tổng cộng <strong className="text-[#14251f]">{goals.length}</strong> mục tiêu đang theo dõi
          </p>
        </article>

        {/* Card 2: Đã tích lũy */}
        <article className="goal-stat-card flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Đã Tích Lũy Được</p>
              <p className="goal-saved-amount mt-1 text-2xl font-bold text-[#10b981]">
                {totalAccumulatedSum.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#e3f4e9] text-[#10b981]">
              <FinanceIcon name="trend" size={20} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#718078]">
              <span>Tiến độ hoàn thành</span>
              <span className="font-semibold text-[#10b981]">{overallPercent}%</span>
            </div>
            <ProgressBar percent={overallPercent} color="bg-[#10b981]" />
          </div>
        </article>

        {/* Card 3: Còn thiếu */}
        <article className="goal-hero-card flex min-h-[140px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#063d31] via-[#07543f] to-[#063d31] p-5 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8ebca]">Còn Thiếu Cần Phấn Đấu</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {missingSum.toLocaleString('vi-VN')} <span className="text-sm text-[#a8ebca]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-[#a8ebca]">
              <FinanceIcon name="spark" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#d1fae5]">FinAI khuyến nghị tích lũy định kỳ để sớm về đích.</p>
        </article>
      </section>

      {/* Thanh công cụ: Tiêu đề, Bộ lọc, Nút Tạo mục tiêu */}
      <section className="flex flex-col gap-4" aria-label="Danh sách mục tiêu">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-[#14251f]">Danh Sách Mục Tiêu Tài Chính</h2>
            <p className="text-xs text-[#718078]">Bấm &quot;Nạp thêm tiền&quot; khi bạn vừa trích tiền vào quỹ tích lũy</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bộ lọc trạng thái kiểu pill */}
            <div className="goal-filter-box inline-flex h-[38px] items-center rounded-xl bg-[#f0f5f2] p-1 gap-1">
              {([
                ['all', 'Tất cả'],
                ['in_progress', 'Đang thực hiện'],
                ['completed', 'Đã hoàn thành'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGoalFilter(val)}
                  className={`h-full rounded-lg px-3.5 text-xs font-bold transition flex items-center justify-center whitespace-nowrap ${goalFilter === val
                      ? 'is-active bg-[#07543f] text-white shadow-xs'
                      : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Nút Tạo mục tiêu mới */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-goal-create inline-flex h-[38px] items-center justify-center rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#064232] transition"
            >
              Tạo mục tiêu mới
            </button>
          </div>
        </div>

        {/* Danh sách mục tiêu */}
        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-[#e7ece8] bg-white py-16 text-sm text-[#718078]">
            <span className="inline-block size-6 animate-spin rounded-full border-2 border-[#07543f] border-t-transparent" />
            <p className="mt-2">Đang tải mục tiêu tài chính...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#f1f5f2] text-[#718078]">
              <FinanceIcon name="trend" size={24} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#14251f]">Chưa có mục tiêu nào trong nhóm này</p>
            <p className="mt-1 text-xs text-[#718078]">Bấm &quot;Tạo mục tiêu mới&quot; để thiết lập mục tiêu tích lũy.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredGoals.map((g) => {
              const current = Number(g.currentAmount) || 0;
              const target = Number(g.targetAmount) || 0;
              const remaining = Math.max(0, target - current);
              const pct = Math.min(100, Math.round(g.percentageComplete ?? (target > 0 ? (current / target) * 100 : 0)));
              const isDone = g.status === 'COMPLETED' || pct >= 100;
              const visual = getGoalVisual(g);

              return (
                <article
                  key={g.id}
                  className="goal-item-card group flex flex-col justify-between gap-4 rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer"
                  onClick={() => handleOpenDetailGoal(g)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-2xl transition"
                        style={{
                          backgroundColor: `${visual.color}15`,
                          borderColor: `${visual.color}35`,
                          color: visual.color,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        <FinanceIcon name={visual.icon} size={22} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="goal-item-title truncate text-base font-bold text-[#14251f] group-hover:text-[#07543f]">
                          {g.name}
                        </h3>
                        <p className="goal-item-sub mt-0.5 text-xs text-[#718078]">
                          {g.targetDate ? `Hạn chót: ${g.targetDate}` : 'Không thời hạn'} ·{' '}
                          <span className="font-semibold" style={{ color: visual.color }}>
                            {visual.label}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-[#10b981]">{pct}%</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#718078]">
                      <span>
                        Đã tích lũy: <strong className="text-[#14251f] font-bold">{current.toLocaleString('vi-VN')} đ</strong>
                      </span>
                      <span>
                        Mục tiêu: <strong className="text-[#14251f] font-bold">{target.toLocaleString('vi-VN')} đ</strong>
                      </span>
                    </div>
                    <ProgressBar percent={pct} color={isDone ? 'bg-[#10b981]' : 'bg-[#07543f]'} height="h-2.5" />
                    <p className="goal-item-sub text-[11px] text-[#718078] flex justify-between">
                      <span>
                        Còn thiếu: <strong className="text-[#f43f5e] font-semibold">{remaining.toLocaleString('vi-VN')} đ</strong>
                      </span>
                      {g.suggestedMonthlySaving && (
                        <span>Gợi ý: ~{Number(g.suggestedMonthlySaving).toLocaleString('vi-VN')} đ/tháng</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-[#f1f5f2] pt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailGoal(g)}
                      className="btn-goal-detail rounded-xl border border-[#d2dcd5] bg-[#f8fafc] px-3.5 py-1.5 text-xs font-semibold text-[#52665a] hover:bg-[#edf2f7] transition"
                    >
                      Chi tiết
                    </button>
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          setDepositGoal(g);
                          setDepositAmount('');
                          setDepositNote('');
                        }}
                        className="btn-goal-deposit rounded-xl bg-[#07543f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#064232] transition"
                      >
                        + Nạp thêm tiền
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Nạp thêm tiền vào mục tiêu */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDepositGoal(null)}>
          <div className="goal-modal-card w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e7ece8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14251f]">Nạp Tiền Vào Mục Tiêu</h3>
                <p className="text-xs text-[#718078]">
                  Mục tiêu: <strong>{depositGoal.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDepositGoal(null)}
                className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#f1f5f2]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Số tiền nạp (VND) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1,000,000"
                  value={depositAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDepositAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                  }}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  required
                />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Nguồn tiền trích nạp</label>
                  <select
                    value={depositSourceId}
                    onChange={(e) => setDepositSourceId(e.target.value)}
                    className="w-full rounded-xl border border-[#d2dcd5] bg-white px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance.toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trích từ lương tháng 10"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e7ece8]">
                <button
                  type="button"
                  onClick={() => setDepositGoal(null)}
                  className="rounded-xl border border-[#d2dcd5] px-4 py-2 text-xs font-semibold text-[#53645a] hover:bg-[#f1f5f2]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="rounded-xl bg-[#07543f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#064232] disabled:opacity-50"
                >
                  {isSubmittingDeposit ? 'Đang nạp...' : 'Xác nhận nạp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo mục tiêu mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="goal-modal-card w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e7ece8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14251f]">Tạo Mục Tiêu Tài Chính Mới</h3>
                <p className="text-xs text-[#718078]">Thiết lập kế hoạch tích lũy rõ ràng cùng FinAI</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#f1f5f2]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Tên mục tiêu *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua Macbook Pro M3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Phân loại mục tiêu *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as GoalType)}
                  className="w-full rounded-xl border border-[#d2dcd5] bg-white px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                >
                  {goalTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Mục tiêu (VND) *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 30,000,000"
                    value={newTarget}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewTarget(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3 py-1.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Đã có sẵn (VND)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 5,000,000"
                    value={newAccumulated}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewAccumulated(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3 py-1.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Hạn chót</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3 py-1.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Mức độ ưu tiên</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as GoalPriority)}
                    className="w-full rounded-xl border border-[#d2dcd5] bg-white px-3 py-1.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao (Khẩn cấp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Mô tả thêm (Tùy chọn)</label>
                <textarea
                  placeholder="Ghi chú về kế hoạch tiết kiệm..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-1.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e7ece8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#d2dcd5] px-4 py-2 text-xs font-semibold text-[#53645a] hover:bg-[#f1f5f2]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-xl bg-[#07543f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#064232] disabled:opacity-50"
                >
                  {isSubmittingCreate ? 'Đang tạo...' : 'Tạo mục tiêu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết mục tiêu */}
      {detailGoal && (() => {
        const visual = getGoalVisual(detailGoal);
        const current = Number(detailGoal.currentAmount) || 0;
        const target = Number(detailGoal.targetAmount) || 0;
        const remaining = Math.max(0, target - current);
        const pct = Math.min(100, Math.round(detailGoal.percentageComplete ?? (target > 0 ? (current / target) * 100 : 0)));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDetailGoal(null)}>
            <div className="goal-modal-card w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-12 place-items-center rounded-2xl"
                    style={{
                      backgroundColor: `${visual.color}15`,
                      borderColor: `${visual.color}35`,
                      color: visual.color,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <FinanceIcon name={visual.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#14251f]">{detailGoal.name}</h3>
                    <p className="text-xs text-[#718078] font-semibold" style={{ color: visual.color }}>
                      {visual.label}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailGoal(null)}
                  className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#f1f5f2]"
                >
                  ✕
                </button>
              </div>

              <div className="goal-modal-box mt-4 rounded-xl bg-[#f8fafc] p-3.5 border border-[#e2e8f0] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#718078]">Mục tiêu tích lũy:</span>
                  <strong className="text-[#14251f]">{target.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718078]">Đã tích lũy:</span>
                  <strong className="text-[#10b981]">{current.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718078]">Còn thiếu:</span>
                  <strong className="text-[#f43f5e]">{remaining.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718078]">Hạn chót:</span>
                  <strong className="text-[#14251f]">{detailGoal.targetDate || 'Không thời hạn'}</strong>
                </div>
                {detailGoal.suggestedMonthlySaving && (
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Gợi ý tiết kiệm:</span>
                    <strong className="text-[#10b981]">~{Number(detailGoal.suggestedMonthlySaving).toLocaleString('vi-VN')} đ/tháng</strong>
                  </div>
                )}
                <div className="pt-1">
                  <ProgressBar percent={pct} color={pct >= 100 ? 'bg-[#10b981]' : 'bg-[#07543f]'} />
                </div>
              </div>

              {detailGoal.description && (
                <p className="mt-3 text-xs text-[#718078] italic bg-[#f8fafc] p-2.5 rounded-xl border border-[#e2e8f0]">
                  &quot;{detailGoal.description}&quot;
                </p>
              )}

              {/* Lịch sử nạp tiền / tích lũy thực tế vào mục tiêu */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-[#14261e] dark:text-gray-200 mb-2">
                  Lịch sử nạp tiền ({detailGoal.contributions?.length || 0})
                </h4>

                {(!detailGoal.contributions || detailGoal.contributions.length === 0) ? (
                  <p className="text-xs text-gray-400 italic py-2 text-center">Chưa có giao dịch nạp tiền nào được ghi nhận</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1">
                    {detailGoal.contributions.map((ct) => (
                      <div key={ct.id || Math.random()} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-[#10b981]">
                            +{Number(ct.amount || 0).toLocaleString('vi-VN')} đ
                          </p>
                          <span className="text-[10.5px] text-gray-500">
                            {ct.contributedAt ? ct.contributedAt.split('T')[0] : 'Vừa xong'} {ct.note ? `· ${ct.note}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold shrink-0">Đã nạp ✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteGoal(detailGoal)}
                  className="btn-goal-delete flex-1 rounded-xl border border-[#fecaca] bg-[#fff1f2] py-2.5 text-xs font-semibold text-[#dc2626] hover:bg-[#ffe4e6] transition flex items-center justify-center gap-1.5"
                >
                  <FinanceIcon name="delete" size={14} />
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const g = detailGoal;
                    setDetailGoal(null);
                    setDepositGoal(g);
                  }}
                  className="flex-1 rounded-xl bg-[#07543f] py-2.5 text-xs font-semibold text-white hover:bg-[#064232] transition"
                >
                  + Nạp tiền
                </button>
                <button
                  type="button"
                  onClick={() => setDetailGoal(null)}
                  className="btn-goal-detail flex-1 rounded-xl border border-[#d2dcd5] bg-white py-2.5 text-xs font-semibold text-[#52665a] hover:bg-[#f1f5f2] transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
