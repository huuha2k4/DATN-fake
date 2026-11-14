import React, { useEffect, useMemo, useState } from 'react';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  goalApi,
  type GoalResponse,
  type GoalType,
  type GoalPriority,
} from '../api/goalApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import './GoalsManagementScreen.css';

type Props = { onNotify: (message: string) => void };

// Danh mục Mục tiêu 3D chuẩn như bản App
export const GOAL_TYPES = [
  {
    label: 'Mua sắm lớn',
    value: 'PURCHASE' as GoalType,
    iconKey: 'shopping',
    image: '/goal_cat_shopping_3d.png',
    desc: 'Mua xe, điện thoại, máy tính, sắm đồ gia dụng...',
  },
  {
    label: 'Du lịch & Nghỉ dưỡng',
    value: 'VACATION' as GoalType,
    iconKey: 'travel',
    image: '/goal_cat_travel_3d.png',
    desc: 'Nghỉ dưỡng, khám phá, vé máy bay, tour...',
  },
  {
    label: 'Học tập & Tri thức',
    value: 'EDUCATION' as GoalType,
    iconKey: 'education',
    image: '/goal_cat_education_3d.png',
    desc: 'Học phí, chứng chỉ ngoại ngữ, sách vở, laptop...',
  },
  {
    label: 'Đầu tư sinh lời',
    value: 'INVESTMENT' as GoalType,
    iconKey: 'investment',
    image: '/goal_cat_investment_3d.png',
    desc: 'Chứng khoán, vàng, bất động sản, tích sản...',
  },
  {
    label: 'Thanh toán nợ',
    value: 'DEBT_PAYOFF' as GoalType,
    iconKey: 'debt',
    image: '/goal_cat_debt_3d.png',
    desc: 'Tất toán thẻ tín dụng, nợ ngân hàng, nợ người thân...',
  },
  {
    label: 'Gia đình & Nhà cửa',
    value: 'EMERGENCY_FUND' as GoalType,
    iconKey: 'family',
    image: '/goal_cat_family_3d.png',
    desc: 'Chăm sóc ba mẹ, con cái, sửa sang nhà cửa...',
  },
  {
    label: 'Mục tiêu khác',
    value: 'OTHER' as GoalType,
    iconKey: 'other',
    image: '/goal_cat_other_3d.png',
    desc: 'Các kế hoạch tài chính và ước mơ khác...',
  },
];

// Danh mục Tiết kiệm 3D chuẩn như bản App
export const SAVING_TYPES = [
  {
    label: 'Quỹ dự phòng khẩn cấp',
    value: 'Quỹ dự phòng khẩn cấp',
    iconKey: 'saving_emergency',
    image: '/saving_cat_emergency_3d.png',
    desc: 'Dành cho các tình huống khẩn cấp, y tế, bất khả kháng...',
  },
  {
    label: 'Tiết kiệm tự do',
    value: 'Tiết kiệm tự do',
    iconKey: 'saving_free',
    image: '/saving_cat_free_3d.png',
    desc: 'Tích lũy linh hoạt, không gò bó mục đích hay thời hạn...',
  },
  {
    label: 'Tiết kiệm có kỳ hạn',
    value: 'Tiết kiệm có kỳ hạn',
    iconKey: 'saving_term',
    image: '/saving_cat_term_3d.png',
    desc: 'Gửi định kỳ hàng tuần, hàng tháng có lãi suất...',
  },
  {
    label: 'Tiết kiệm dài hạn',
    value: 'Tiết kiệm dài hạn',
    iconKey: 'saving_longterm',
    image: '/saving_cat_longterm_3d.png',
    desc: 'Kế hoạch hưu trí, mua nhà, tương lai lâu dài...',
  },
  {
    label: 'Khoản tiết kiệm khác',
    value: 'Khác',
    iconKey: 'saving_other',
    image: '/saving_cat_other_3d.png',
    desc: 'Các quỹ và mục đích tiết kiệm linh hoạt khác...',
  },
];

function formatVND(amount?: number | null): string {
  if (amount == null) return '0 đ';
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

function getGoalIconSrc(iconKey?: string, name?: string) {
  const key = (iconKey || name || '').toLowerCase();
  if (key.includes('travel') || key.includes('du lịch') || key.includes('vacation')) return '/goal_cat_travel_3d.png';
  if (key.includes('education') || key.includes('học') || key.includes('cap')) return '/goal_cat_education_3d.png';
  if (key.includes('investment') || key.includes('đầu tư')) return '/goal_cat_investment_3d.png';
  if (key.includes('debt') || key.includes('nợ')) return '/goal_cat_debt_3d.png';
  if (key.includes('family') || key.includes('gia đình')) return '/goal_cat_family_3d.png';
  if (key.includes('other') || key.includes('khác')) return '/goal_cat_other_3d.png';
  return '/goal_cat_shopping_3d.png';
}

function getSavingIconSrc(iconKey?: string, name?: string) {
  const key = (iconKey || name || '').toLowerCase();
  if (key.includes('emergency') || key.includes('khẩn cấp') || key.includes('dự phòng')) return '/saving_cat_emergency_3d.png';
  if (key.includes('term') || key.includes('kỳ hạn') || key.includes('kì hạn')) return '/saving_cat_term_3d.png';
  if (key.includes('longterm') || key.includes('dài hạn')) return '/saving_cat_longterm_3d.png';
  if (key.includes('other') || key.includes('khác')) return '/saving_cat_other_3d.png';
  return '/saving_cat_free_3d.png';
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  // Nếu đã ở dạng dd/mm/yyyy hoặc d/m/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
  try {
    // Nếu dạng yyyy-mm-dd
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatGoalDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function GoalsManagementScreen({ onNotify }: Props) {
  const [activeTab, setActiveTab] = useState<'goals' | 'savings'>('goals');
  const [allGoals, setAllGoals] = useState<GoalResponse[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals Tạo mới
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showCreateSavingModal, setShowCreateSavingModal] = useState(false);

  // Form tạo Goal
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('PURCHASE');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalInitialAmount, setGoalInitialAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Form tạo Saving
  const [savingName, setSavingName] = useState('');
  const [savingCategory, setSavingCategory] = useState(SAVING_TYPES[1].value);
  const [savingInitialAmount, setSavingInitialAmount] = useState('');
  const [savingDesc, setSavingDesc] = useState('');
  const [isSubmittingSaving, setIsSubmittingSaving] = useState(false);

  // Modal Chi tiết & Nạp / Rút & Chỉnh sửa & Chi tiết giao dịch
  const [selectedGoal, setSelectedGoal] = useState<GoalResponse | null>(null);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<GoalResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedTxItem, setSelectedTxItem] = useState<{
    title: string;
    date: string;
    amount: number;
    type: 'deposit' | 'withdraw';
    accountName?: string;
    note?: string;
  } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txAccount, setTxAccount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Mở modal sửa với dữ liệu khởi tạo
  const handleOpenEdit = (g: GoalResponse) => {
    setEditName(g.name || '');
    setEditTargetAmount(g.targetAmount ? Number(g.targetAmount).toLocaleString('vi-VN') : '');
    setEditTargetDate(g.targetDate ? g.targetDate.split('T')[0] : '');
    setEditDesc(g.description || '');
    setShowEditModal(true);
  };

  // Submit cập nhật mục tiêu
  const handleUpdateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    if (!editName.trim()) {
      onNotify('Vui lòng nhập tên mục tiêu.');
      return;
    }
    const isSaving = (Number(selectedGoal.targetAmount) || 0) <= 0;
    const targetAmt = isSaving ? 0 : parseFloat(editTargetAmount.replace(/\D/g, ''));
    if (!isSaving && (!targetAmt || targetAmt <= 0)) {
      onNotify('Vui lòng nhập số tiền mục tiêu hợp lệ (> 0).');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      await goalApi.updateGoal(selectedGoal.id, {
        name: editName.trim(),
        targetAmount: targetAmt,
        targetDate: editTargetDate || undefined,
        description: editDesc.trim() || undefined,
      });

      onNotify('Đã cập nhật thông tin thành công!');
      setShowEditModal(false);

      // Refresh lại chi tiết và danh sách
      const updated = await goalApi.getGoalById(selectedGoal.id);
      setSelectedGoal(updated);
      setSelectedGoalDetail(updated);
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Mở modal chi tiết + tải đầy đủ contributions từ API
  const openGoalDetail = async (g: GoalResponse) => {
    setSelectedGoal(g);
    setSelectedGoalDetail(null);
    setIsLoadingDetail(true);
    try {
      const detail = await goalApi.getGoalById(g.id);
      setSelectedGoalDetail(detail);
    } catch {
      // fallback: dùng dữ liệu list
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Tải dữ liệu từ backend
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [goalRes, accRes] = await Promise.all([
        goalApi.getGoals(),
        accountApi.getAccounts().catch(() => []),
      ]);
      setAllGoals(goalRes.goals || []);
      setAccounts(accRes || []);
      if (accRes && accRes.length > 0 && !txAccount) {
        setTxAccount(accRes[0].id);
      }
    } catch {
      onNotify('Không thể tải dữ liệu mục tiêu & tiết kiệm.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Phân loại Mục tiêu vs Tiết kiệm theo chuẩn giống App
  // Tiết kiệm: targetAmount == 0 hoặc icon/description chứa saving
  const { goalsList, savingsList } = useMemo(() => {
    const goals: GoalResponse[] = [];
    const savings: GoalResponse[] = [];

    allGoals.forEach((g) => {
      const target = Number(g.targetAmount) || 0;
      const desc = (g.description || '').toLowerCase();
      const icon = (g.icon || '').toLowerCase();
      const isSaving = target <= 0 || icon.includes('saving') || desc.includes('tiết kiệm') || desc.includes('quỹ dự phòng');

      if (isSaving) {
        savings.push(g);
      } else {
        goals.push(g);
      }
    });

    return { goalsList: goals, savingsList: savings };
  }, [allGoals]);

  // Tổng số liệu
  const totalTargetAmount = useMemo(() => {
    return goalsList.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  }, [goalsList]);

  const totalGoalsAmount = useMemo(() => {
    return goalsList.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  }, [goalsList]);

  const totalSavingsAmount = useMemo(() => {
    return savingsList.reduce((sum, s) => sum + (Number(s.currentAmount) || 0), 0);
  }, [savingsList]);

  const totalAccumulated = totalGoalsAmount + totalSavingsAmount;
  const missingAmount = Math.max(0, totalTargetAmount - totalGoalsAmount);
  const completionPercent = totalTargetAmount > 0
    ? Math.min(100, Math.round((totalGoalsAmount / totalTargetAmount) * 100))
    : 0;

  // Xử lý tạo Mục tiêu
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetAmount.replace(/\D/g, ''));
    const initial = parseFloat(goalInitialAmount.replace(/\D/g, '')) || 0;

    if (!goalName.trim()) {
      onNotify('Vui lòng nhập tên mục tiêu');
      return;
    }
    if (!target || target <= 0) {
      onNotify('Vui lòng nhập số tiền mục tiêu hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmittingGoal(true);
      const selectedTypeObj = GOAL_TYPES.find((t) => t.value === goalType) || GOAL_TYPES[0];
      await goalApi.createGoal({
        name: goalName.trim(),
        goalType,
        targetAmount: target,
        currentAmount: initial,
        targetDate: goalDeadline || undefined,
        description: goalDesc.trim() || undefined,
        icon: selectedTypeObj.iconKey,
        priority: 'MEDIUM',
      });

      onNotify('Tạo mục tiêu tài chính mới thành công!');
      setShowCreateGoalModal(false);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalInitialAmount('');
      setGoalDeadline('');
      setGoalDesc('');
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Tạo mục tiêu thất bại.');
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  // Xử lý tạo Tiết kiệm
  const handleCreateSaving = async (e: React.FormEvent) => {
    e.preventDefault();
    const initial = parseFloat(savingInitialAmount.replace(/\D/g, '')) || 0;

    if (!savingName.trim()) {
      onNotify('Vui lòng nhập tên khoản tiết kiệm');
      return;
    }

    try {
      setIsSubmittingSaving(true);
      const selectedTypeObj = SAVING_TYPES.find((t) => t.value === savingCategory) || SAVING_TYPES[1];
      await goalApi.createGoal({
        name: savingName.trim(),
        goalType: 'EMERGENCY_FUND',
        targetAmount: 0,
        currentAmount: initial,
        description: savingDesc.trim() ? `${savingCategory} • ${savingDesc.trim()}` : savingCategory,
        icon: selectedTypeObj.iconKey,
        priority: 'MEDIUM',
      });

      onNotify('Thêm khoản tiết kiệm mới thành công!');
      setShowCreateSavingModal(false);
      setSavingName('');
      setSavingInitialAmount('');
      setSavingDesc('');
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Tạo khoản tiết kiệm thất bại.');
    } finally {
      setIsSubmittingSaving(false);
    }
  };

  // Nạp tiền
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(txAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      onNotify('Vui lòng nhập số tiền nạp hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmittingTx(true);
      await goalApi.contribute(selectedGoal.id, {
        amount,
        note: txNote.trim() || undefined,
        sourceAccountId: txAccount || undefined,
      });

      onNotify(`Đã nạp ${formatVND(amount)} vào "${selectedGoal.name}" thành công!`);
      setShowDepositModal(false);
      setTxAmount('');
      setTxNote('');

      // Refresh lại chi tiết
      const updated = await goalApi.getGoalById(selectedGoal.id);
      setSelectedGoal(updated);
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Nạp tiền thất bại.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Rút tiền
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(txAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      onNotify('Vui lòng nhập số tiền rút hợp lệ (> 0)');
      return;
    }
    const current = Number(selectedGoal.currentAmount) || 0;
    if (amount > current) {
      onNotify(`Số tiền rút không được vượt quá số dư hiện tại (${formatVND(current)})`);
      return;
    }

    try {
      setIsSubmittingTx(true);
      await goalApi.withdraw(selectedGoal.id, {
        amount,
        note: txNote.trim() || undefined,
        targetAccountId: txAccount || undefined,
      });

      onNotify(`Đã rút ${formatVND(amount)} từ "${selectedGoal.name}" về tài khoản!`);
      setShowWithdrawModal(false);
      setTxAmount('');
      setTxNote('');

      // Refresh lại chi tiết
      const updated = await goalApi.getGoalById(selectedGoal.id);
      setSelectedGoal(updated);
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Rút tiền thất bại.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Xóa
  const handleDelete = async (g: GoalResponse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${g.name}" không?`)) return;
    try {
      await goalApi.deleteGoal(g.id);
      onNotify('Đã xóa thành công!');
      setSelectedGoal(null);
      loadData();
    } catch {
      onNotify('Xóa thất bại. Vui lòng thử lại sau.');
    }
  };

  return (
    <main className="goals-management-page mx-auto w-full max-w-6xl space-y-6 pb-12 pt-2">
      {/* 2. 3 Ô THỐNG KÊ TRÊN CÙNG: Tổng tích lũy, Theo mục tiêu, Tiết kiệm tự do (Chuẩn 100% theo ảnh) */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Thống kê mục tiêu & tích lũy">
        {/* Ô 1: Tổng tiền đã tích lũy */}
        <article className="flex min-h-[105px] items-center justify-between rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6f9f0] text-[#00a86b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <FinanceIcon name="wallet" size={22} color="#00a86b" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Tổng tiền đã tích lũy
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-[#006747] dark:text-emerald-400 tracking-tight">
                  {totalAccumulated.toLocaleString('vi-VN')} <span className="text-sm font-bold text-[#006747] dark:text-emerald-400">đ</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00a86b] bg-[#e6f9f0] dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                  <FinanceIcon name="trend" size={11} color="#00a86b" />
                  +12,4%
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* Ô 2: Theo mục tiêu đã tích lũy */}
        <article className="flex min-h-[105px] items-center justify-between rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6f9f0] text-[#00a86b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <FinanceIcon name="target" size={22} color="#00a86b" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Theo mục tiêu đã tích lũy
              </p>
              <p className="mt-0.5 text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {totalGoalsAmount.toLocaleString('vi-VN')} <span className="text-sm font-bold text-gray-800 dark:text-gray-200">đ</span>
              </p>
            </div>
          </div>
        </article>

        {/* Ô 3: Tiết kiệm tự do & Quỹ dự phòng */}
        <article className="flex min-h-[105px] items-center justify-between rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6f9f0] text-[#00a86b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <FinanceIcon name="piggy-bank" size={22} color="#00a86b" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Tiết kiệm tự do &amp; Quỹ dự phòng
              </p>
              <p className="mt-0.5 text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {totalSavingsAmount.toLocaleString('vi-VN')} <span className="text-sm font-bold text-gray-800 dark:text-gray-200">đ</span>
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* 3. BÊN DƯỚI CHIA ĐÔI CÓ ĐƯỜNG PHÂN CÁCH Ở GIỮA */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">
          {/* CỘT TRÁI: MỤC TIÊU TÀI CHÍNH */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Mục tiêu ({goalsList.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#006747] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#005238] transition cursor-pointer"
              >
                <FinanceIcon name="plus" size={14} color="#FFFFFF" />
                <span>Thêm mục tiêu</span>
              </button>
            </div>

            {goalsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-850 py-12 text-center p-4">
                <img src="/goal_cat_shopping_3d.png" alt="Mục tiêu trống" className="size-14 object-contain mb-2.5 opacity-80" />
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Chưa có mục tiêu nào</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Đặt mục tiêu mua sắm, du lịch, học tập...</p>
                <button
                  type="button"
                  onClick={() => setShowCreateGoalModal(true)}
                  className="px-3.5 py-1.5 bg-[#006747] text-white rounded-xl text-xs font-bold hover:bg-[#005238] transition cursor-pointer"
                >
                  + Thêm mục tiêu
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {goalsList.map((g) => {
                  const current = Number(g.currentAmount) || 0;
                  const target = Number(g.targetAmount) || 0;
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                  const imgSrc = getGoalIconSrc(g.icon, g.name);

                  return (
                    <div
                      key={g.id}
                      onClick={() => openGoalDetail(g)}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="size-16 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden">
                        <img src={imgSrc} alt={g.name} className="size-full object-contain" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                            {g.name}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full">
                              {pct}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoalDetail(g);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                              title="Tùy chọn"
                            >
                              <FinanceIcon name="more" size={16} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                          <FinanceIcon name="calendar" size={13} color="#64748B" />
                          <span>{g.targetDate ? `Hạn: ${formatDisplayDate(g.targetDate)}` : 'Không giới hạn thời gian'}</span>
                        </p>

                        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2.5">
                          <div
                            className="h-full bg-[#006747] dark:bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="text-xs font-medium">
                          <strong className="text-[#006747] dark:text-emerald-400 font-extrabold text-[13px]">
                            {formatVND(current)}
                          </strong>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-400 dark:text-gray-400">
                            {formatVND(target)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* CỘT PHẢI: KHOẢN TIẾT KIỆM (CÓ ĐƯỜNG KẺ CHIA Ở GIỮA TRÊN MÀN HÌNH LỚN) */}
          <section className="space-y-4 lg:pl-8 lg:border-l lg:border-gray-200 dark:lg:border-slate-800">
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Tiết kiệm ({savingsList.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCreateSavingModal(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#006747] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#005238] transition cursor-pointer"
              >
                <FinanceIcon name="plus" size={14} color="#FFFFFF" />
                <span>Thêm tiết kiệm</span>
              </button>
            </div>

            {savingsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-850 py-12 text-center p-4">
                <img src="/saving_cat_free_3d.png" alt="Tiết kiệm trống" className="size-14 object-contain mb-2.5 opacity-80" />
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Chưa có khoản tiết kiệm nào</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Tạo quỹ dự phòng khẩn cấp, tiết kiệm tự do...</p>
                <button
                  type="button"
                  onClick={() => setShowCreateSavingModal(true)}
                  className="px-3.5 py-1.5 bg-[#006747] text-white rounded-xl text-xs font-bold hover:bg-[#005238] transition cursor-pointer"
                >
                  + Thêm tiết kiệm
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savingsList.map((s) => {
                  const current = Number(s.currentAmount) || 0;
                  const imgSrc = getSavingIconSrc(s.icon, s.name);

                  return (
                    <div
                      key={s.id}
                      onClick={() => openGoalDetail(s)}
                      className="goal-app-card flex items-center gap-3.5 group"
                    >
                      <div className="goal-3d-box">
                        <img src={imgSrc} alt={s.name} className="goal-3d-img" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#006747] transition">
                            {s.name}
                          </h4>
                          <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 truncate">
                          {s.description || 'Tiết kiệm tự do'}
                        </p>

                        <p className="text-base font-extrabold text-[#006747] dark:text-emerald-400">
                          {formatVND(current)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= MODAL TẠO MỤC TIÊU ================= */}
      {showCreateGoalModal && (
        <div className="goal-modal-backdrop" onClick={() => setShowCreateGoalModal(false)}>
          <div className="goal-modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Thêm mục tiêu mới</h3>
                <p className="text-xs text-gray-500">Kế hoạch mua sắm hoặc chi tiêu lớn trong tương lai</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tên mục tiêu *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua Macbook Pro, Du lịch Nhật Bản..."
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Loại mục tiêu</label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {GOAL_TYPES.map((t) => (
                    <div
                      key={t.value}
                      onClick={() => setGoalType(t.value)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 transition ${
                        goalType === t.value
                          ? 'border-[#006747] bg-emerald-50/50 dark:bg-emerald-950/40 text-[#006747] font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <img src={t.image} alt={t.label} className="size-7 object-contain shrink-0" />
                      <span className="text-xs truncate">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Số tiền mục tiêu *</label>
                  <input
                    type="text"
                    placeholder="20,000,000"
                    value={goalTargetAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGoalTargetAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Đã có sẵn (nếu có)</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={goalInitialAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGoalInitialAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hạn chót hoàn thành</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Kế hoạch trích lương hàng tháng, mục đích tiết kiệm..."
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGoalModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  className="px-5 py-2 rounded-xl bg-[#006747] text-white text-xs font-bold hover:bg-[#005238] transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingGoal ? 'Đang tạo...' : 'Tạo mục tiêu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL TẠO KHOẢN TIẾT KIỆM ================= */}
      {showCreateSavingModal && (
        <div className="goal-modal-backdrop" onClick={() => setShowCreateSavingModal(false)}>
          <div className="goal-modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Thêm khoản tiết kiệm mới</h3>
                <p className="text-xs text-gray-500">Tích lũy tự do, quỹ khẩn cấp không giới hạn hạn mức</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSavingModal(false)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSaving} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tên khoản tiết kiệm *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quỹ dự phòng cá nhân, Tiết kiệm tự do..."
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Phân loại quỹ</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAVING_TYPES.map((t) => (
                    <div
                      key={t.value}
                      onClick={() => setSavingCategory(t.value)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 transition ${
                        savingCategory === t.value
                          ? 'border-[#006747] bg-emerald-50/50 dark:bg-emerald-950/40 text-[#006747] font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <img src={t.image} alt={t.label} className="size-7 object-contain shrink-0" />
                      <span className="text-xs truncate">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Số tiền khởi điểm (VND)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={savingInitialAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSavingInitialAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về mục đích khoản tiết kiệm..."
                  value={savingDesc}
                  onChange={(e) => setSavingDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateSavingModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSaving}
                  className="px-5 py-2 rounded-xl bg-[#006747] text-white text-xs font-bold hover:bg-[#005238] transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingSaving ? 'Đang tạo...' : 'Lưu khoản tiết kiệm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHI TIẾT MỤC TIÊU / TIẾT KIỆM ================= */}
      {selectedGoal && (() => {
        const activeGoal = selectedGoalDetail || selectedGoal;
        const current = Number(activeGoal.currentAmount) || 0;
        const target = Number(activeGoal.targetAmount) || 0;
        const isSaving = target <= 0;
        const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const pctDisplay = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        const imgSrc = isSaving
          ? getSavingIconSrc(activeGoal.icon, activeGoal.name)
          : getGoalIconSrc(activeGoal.icon, activeGoal.name);

        // SVG gauge: 150x150 chuẩn như bản app: Center (75, 75), radius = 56, strokeWidth = 11
        // Start: 135 deg (bottom-left) -> End: 45 deg (bottom-right)
        // Arc length = 2 * PI * 56 * (270 / 360) = 263.89
        const totalArcLen = 263.89;
        const pctRatio = Math.min(1, Math.max(0, pct / 100));
        const strokeDashoffset = totalArcLen * (1 - pctRatio);

        // Days remaining
        let daysRemaining: number | null = null;
        if (activeGoal.targetDate) {
          const deadline = new Date(activeGoal.targetDate);
          const today = new Date();
          const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          daysRemaining = diff > 0 ? diff : 0;
        }

        const historyItems = activeGoal.contributions || [];

        return (
          <div className="goal-modal-backdrop" onClick={() => setSelectedGoal(null)}>
            <div
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── HEADER ── */}
              <div className="flex items-start gap-4 p-6 pb-4">
                <div className="size-16 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center">
                  <img src={imgSrc} alt={selectedGoal.name} className="size-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">{selectedGoal.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/40">
                      <FinanceIcon name="target" size={12} color="#16a34a" />
                      {isSaving ? 'Tiết kiệm' : 'Mục tiêu Tiết kiệm'}
                    </span>
                    {!isSaving && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2.5 py-1 rounded-full">
                        {pctDisplay}%
                      </span>
                    )}
                  </div>
                  {selectedGoal.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{selectedGoal.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="size-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0 transition"
                >
                  <FinanceIcon name="close" size={18} />
                </button>
              </div>

              {/* ── BODY: 2-column ── */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 px-6 pb-6">
                {/* ── LEFT ── */}
                <div className="space-y-4 lg:pr-6">
                  {isSaving ? (
                    /* GIAO DIỆN KHOẢN TIẾT KIỆM (KHÔNG CÓ TIẾN ĐỘ, MỤC TIÊU HAY HẠN CHÓT) */
                    <div className="rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 p-6 relative overflow-hidden">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                            <span>Tổng số dư đang tích lũy</span>
                          </p>
                          <p className="text-3xl font-black text-[#006747] dark:text-emerald-400 mb-3 tracking-tight">
                            {formatVND(current)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
                            {activeGoal.description || 'Khoản tiết kiệm tự do không giới hạn thời gian và số tiền mục tiêu. Bạn có thể nộp thêm hoặc rút ra bất cứ khi nào.'}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 dark:bg-emerald-900/50 dark:text-emerald-300 px-3 py-1 rounded-full">
                            <FinanceIcon name="bell" size={13} color="#006747" />
                            Đang tích lũy
                          </span>
                          <img
                            src="/saving_detail_piggy_3d.png"
                            alt="Heo tiết kiệm"
                            className="size-28 object-contain mt-1 drop-shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/saving_cat_free_3d.png'; }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* GIAO DIỆN MỤC TIÊU TÀI CHÍNH (CÓ GAUGE TRÒN, 3 CHỈ SỐ, HẠN CHÓT & TẦN SUẤT) */
                    <>
                      {/* Gauge + 3 Metrics */}
                      <div className="flex items-center gap-6">
                        {/* SVG Circular Gauge chuẩn 100% như bản App */}
                        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 150, height: 150 }}>
                          <svg width={150} height={150} viewBox="0 0 150 150">
                            {/* Background Track (Màu xám nhạt) */}
                            <path
                              d="M 35.4 114.6 A 56 56 0 1 1 114.6 114.6"
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth={11}
                              strokeLinecap="round"
                            />
                            {/* Active Progress Track (Màu xanh lá thương hiệu) */}
                            {pct > 0 && (
                              <path
                                d="M 35.4 114.6 A 56 56 0 1 1 114.6 114.6"
                                fill="none"
                                stroke="#006747"
                                strokeWidth={11}
                                strokeLinecap="round"
                                strokeDasharray={`${totalArcLen}`}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                              />
                            )}
                          </svg>

                          {/* Center overlay — hình con lợn tiết kiệm + số tiền */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 pb-5">
                            <img
                              src="/gauge_pouch_icon.png"
                              alt="Tiết kiệm"
                              className="size-7 object-contain mb-1"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/saving_cat_free_3d.png'; }}
                            />
                            <p className="text-sm font-extrabold text-[#006747] dark:text-emerald-400 leading-tight">{formatVND(current)}</p>
                            <p className="text-[11px] text-gray-400 font-medium">/{formatVND(target)}</p>
                          </div>

                          {/* % label — nằm ở giữa khoảng trống 2 đầu cung arc */}
                          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 118 }}>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {pctDisplay.toFixed(1).replace('.', ',')}%
                            </span>
                          </div>
                        </div>

                        {/* 3 Metric rows */}
                        <div className="flex-1 space-y-2.5">
                          {[
                            { label: 'Mục tiêu', value: formatVND(target), icon: 'target' as const, color: '#006747', bold: false },
                            { label: 'Đã tiết kiệm', value: formatVND(current), icon: 'wallet' as const, color: '#006747', bold: true },
                            { label: 'Còn thiếu', value: formatVND(Math.max(0, target - current)), icon: 'trend' as const, color: '#DC2626', bold: true },
                          ].map((m) => (
                            <div key={m.label} className="flex items-center gap-3">
                              <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                                <FinanceIcon name={m.icon} size={15} color="#006747" />
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{m.label}</p>
                                <p className={`text-sm font-extrabold leading-tight ${m.label === 'Còn thiếu' ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
                                  {m.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hạn chót + Tần suất (2 cols gọn gàng hơn) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                              <FinanceIcon name="calendar" size={14} color="#006747" />
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Hạn chót</span>
                          </div>
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {selectedGoal.targetDate ? formatDisplayDate(selectedGoal.targetDate) : 'Không thời hạn'}
                          </p>
                          {daysRemaining !== null && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Còn {daysRemaining} ngày</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                              <FinanceIcon name="layers" size={14} color="#006747" />
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Tần suất đóng góp</span>
                          </div>
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {(() => {
                              const freq = selectedGoal.autoSave?.frequency;
                              if (!freq) return 'Hàng tháng';
                              const f = freq.toUpperCase();
                              if (f === 'DAILY') return 'Hàng ngày';
                              if (f === 'WEEKLY') return 'Hàng tuần';
                              if (f === 'BI_WEEKLY') return 'Hai tuần/lần';
                              if (f === 'MONTHLY') return 'Hàng tháng';
                              return 'Hàng tháng';
                            })()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons — hàng 1: Nạp + Rút | hàng 2: Sửa + Xóa */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDepositModal(true)}
                        className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#006747] text-white hover:bg-[#005238] text-sm font-bold transition cursor-pointer shadow-sm"
                      >
                        <FinanceIcon name="plus" size={15} color="#fff" />
                        Nạp thêm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWithdrawModal(true)}
                        className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                      >
                        <FinanceIcon name="arrow-up" size={15} color="#374151" />
                        Rút tiền
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(activeGoal)}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
                      >
                        <FinanceIcon name="edit" size={13} color="#006747" />
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedGoal)}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                      >
                        <FinanceIcon name="trash" size={13} color="#DC2626" />
                        Xóa mục tiêu
                      </button>
                    </div>
                  </div>
                </div>

                  {/* ── RIGHT: Lịch sử nạp & rút tiền ── */}
                <div className="lg:border-l lg:border-gray-100 dark:lg:border-slate-800 lg:pl-6 mt-6 lg:mt-0">
                  <div className="flex items-center gap-2 mb-4">
                    <FinanceIcon name="file-text" size={18} color="#006747" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Lịch sử nạp &amp; rút tiền ({historyItems.length})
                    </h4>
                    {isLoadingDetail && (
                      <span className="text-[10px] text-gray-400 italic animate-pulse">Đang tải...</span>
                    )}
                  </div>

                  {historyItems.length === 0 ? (
                    current > 0 ? (
                      <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#006747]">+{formatVND(current)}</p>
                          <span className="text-[11px] text-gray-500">Số tiền tích lũy ban đầu</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600">Khởi điểm ✓</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-6">Chưa có giao dịch nào</p>
                    )
                  ) : (
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800 pr-1">
                      {historyItems.map((ct, idx) => {
                        // Map đúng như bản app: amount luôn >= 0, phân biệt qua sign của raw
                        const rawAmt = Number(ct.amount || 0);
                        const isWd = rawAmt < 0;
                        const absAmt = Math.abs(rawAmt);

                        // Title: c.note nếu có, else default theo type
                        const title = ct.note
                          ? ct.note
                          : isWd ? 'Rút tiền mục tiêu' : 'Tiết kiệm định kỳ';

                        // Date: HH:mm • DD/MM/YYYY (chuẩn app dùng •)
                        let dateLabel = '';
                        if (ct.contributedAt) {
                          try {
                            const d = new Date(ct.contributedAt);
                            if (!isNaN(d.getTime())) {
                              dateLabel = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} • ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                            }
                          } catch { /* ignore */ }
                        }

                        // Account name
                        const accName = (ct as any).sourceAccountName
                          || (ct as any).accountName
                          || ((ct as any).sourceAccountId
                            ? `Tài khoản (${String((ct as any).sourceAccountId).substring(0, 8)})`
                            : '');

                        return (
                          <div
                            key={ct.id || idx}
                            onClick={() => setSelectedTxItem({
                              title,
                              date: dateLabel || 'Giao dịch gần đây',
                              amount: absAmt,
                              type: isWd ? 'withdraw' : 'deposit',
                              accountName: accName,
                              note: ct.note,
                            })}
                            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-slate-800/40 rounded-xl px-1.5 transition"
                          >
                            {/* Circle icon (giống app) */}
                            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${isWd ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40'}`}>
                              <FinanceIcon
                                name={isWd ? 'arrow-up' : 'arrow-down'}
                                size={15}
                                color={isWd ? '#DC2626' : '#006747'}
                              />
                            </div>

                            {/* Info col */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {dateLabel}
                                {accName ? ` · ${accName}` : ''}
                              </p>
                            </div>

                            {/* Amount + chevron */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-xs font-extrabold ${isWd ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isWd ? '-' : '+'}{formatVND(absAmt)}
                              </span>
                              <FinanceIcon name="chevron-right" size={13} color="#94A3B8" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL NẠP TIỀN ================= */}
      {showDepositModal && selectedGoal && (
        <div className="goal-modal-backdrop" onClick={() => setShowDepositModal(false)}>
          <div className="goal-modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nạp tiền vào quỹ</h3>
                <p className="text-xs text-gray-500">Mục: <strong>{selectedGoal.name}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Số tiền nạp (VND) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1,000,000"
                  value={txAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTxAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Trích từ ví / tài khoản</label>
                  <select
                    value={txAccount}
                    onChange={(e) => setTxAccount(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatVND(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trích từ lương tháng này..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-5 py-2 rounded-xl bg-[#006747] text-white text-xs font-bold hover:bg-[#005238] transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingTx ? 'Đang nạp...' : 'Xác nhận nạp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL RÚT TIỀN ================= */}
      {showWithdrawModal && selectedGoal && (
        <div className="goal-modal-backdrop" onClick={() => setShowWithdrawModal(false)}>
          <div className="goal-modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Rút tiền về ví</h3>
                <p className="text-xs text-gray-500">Mục: <strong>{selectedGoal.name}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Số tiền rút (Tối đa: {formatVND(selectedGoal.currentAmount)}) *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 500,000"
                  value={txAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTxAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nhận vào ví / tài khoản</label>
                  <select
                    value={txAccount}
                    onChange={(e) => setTxAccount(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatVND(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Lý do / Ghi chú rút tiền</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cần chi tiêu đột xuất, thanh toán học phí..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingTx ? 'Đang xử lý...' : 'Xác nhận rút'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHỈNH SỬA MỤC TIÊU / TIẾT KIỆM ================= */}
      {showEditModal && selectedGoal && (
        <div className="goal-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="goal-modal-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Chỉnh sửa {(Number(selectedGoal.targetAmount) || 0) <= 0 ? 'khoản tiết kiệm' : 'mục tiêu'}
                </h3>
                <p className="text-xs text-gray-500">Cập nhật thông tin và kế hoạch tài chính của bạn</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tên mục tiêu / khoản tiết kiệm *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ví dụ: Mua nhà, Mua xe..."
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {(Number(selectedGoal.targetAmount) || 0) > 0 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Số tiền mục tiêu cần tích lũy (VND) *
                    </label>
                    <input
                      type="text"
                      value={editTargetAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEditTargetAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                      }}
                      placeholder="Ví dụ: 50,000,000"
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Hạn chót hoàn thành (Ngày kết thúc)
                    </label>
                    <input
                      type="date"
                      value={editTargetDate}
                      onChange={(e) => setEditTargetDate(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Mô tả / Ghi chú kế hoạch
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Ghi chú thêm về mục tiêu này..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-[#006747] text-white text-xs font-bold hover:bg-[#005238] transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XEM CHI TIẾT GIAO DỊCH NẠP / RÚT TIỀN (CHUẨN BẢN APP) ================= */}
      {selectedTxItem && (
        <div className="goal-modal-backdrop" onClick={() => setSelectedTxItem(null)}>
          <div className="goal-modal-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Chi tiết giao dịch</h3>
              <button
                type="button"
                onClick={() => setSelectedTxItem(null)}
                className="size-8 rounded-lg text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Khối hiển thị số tiền lớn */}
            <div className={`p-4 rounded-2xl text-center mb-4 ${selectedTxItem.type === 'withdraw' ? 'bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40' : 'bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40'}`}>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {selectedTxItem.type === 'withdraw' ? 'Số tiền đã rút' : 'Số tiền đã nộp'}
              </p>
              <p className={`text-2xl font-black ${selectedTxItem.type === 'withdraw' ? 'text-rose-600' : 'text-[#006747] dark:text-emerald-400'}`}>
                {selectedTxItem.type === 'withdraw' ? '-' : '+'}{formatVND(selectedTxItem.amount)}
              </p>
            </div>

            {/* Các hàng thông tin chi tiết */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500">Loại giao dịch</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedTxItem.type === 'withdraw' ? 'Rút tiền từ mục tiêu' : 'Nộp tiền vào mục tiêu'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500">Thời gian</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedTxItem.date}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500">Mục tiêu</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedGoal?.name}</span>
              </div>
              {selectedTxItem.accountName && (
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">
                    {selectedTxItem.type === 'withdraw' ? 'Tài khoản nhận' : 'Tài khoản trích'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedTxItem.accountName}</span>
                </div>
              )}
              {selectedTxItem.note && (
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Ghi chú</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 italic">&ldquo;{selectedTxItem.note}&rdquo;</span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedTxItem(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
