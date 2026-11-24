import { useEffect, useState } from 'react';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  debtApi,
  type DebtSummaryItem,
  type DebtListSummary,
  type DebtDetailResponse,
  type DebtType,
  type DebtStatus,
  type DebtScheduleResponse,
  type PaymentFrequency,
} from '../api/debtApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import { formatDate } from '../../core/utils/dateUtils';
import { DatePicker } from '../../core/components/DatePicker';
import { ConfirmDeleteModal } from '../../core/components/ConfirmDeleteModal';
import './DebtManagementScreen.css';

type Props = { onNotify: (message: string) => void };

function formatCurrency(val: number | undefined | null) {
  if (val == null) return '0 ₫';
  return Number(val).toLocaleString('vi-VN') + ' ₫';
}

function ProgressBar({ percent, colorClass = 'lending' }: { percent: number; colorClass?: 'borrowing' | 'lending' }) {
  const bounded = Math.min(100, Math.max(0, percent));
  return (
    <div className="debt-progress-track" role="progressbar">
      <div
        className={`debt-progress-bar ${colorClass}`}
        style={{ width: `${bounded}%` }}
      />
    </div>
  );
}

// Hàm tính ngày đến hạn chuẩn xác từng kỳ, độc lập múi giờ, bảo đảm không bao giờ trùng lặp
function computeInstallmentDate(baseDateStr: string | undefined | null, i: number, freq: string): string {
  if (!baseDateStr) return '';
  let y = 0, m = 0, d = 0;
  const isoMatch = String(baseDateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    y = parseInt(isoMatch[1], 10);
    m = parseInt(isoMatch[2], 10);
    d = parseInt(isoMatch[3], 10);
  } else {
    const vnMatch = String(baseDateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (vnMatch) {
      d = parseInt(vnMatch[1], 10);
      m = parseInt(vnMatch[2], 10);
      y = parseInt(vnMatch[3], 10);
    } else {
      const dt = new Date(baseDateStr);
      if (!isNaN(dt.getTime())) {
        y = dt.getFullYear();
        m = dt.getMonth() + 1;
        d = dt.getDate();
      } else {
        return '';
      }
    }
  }

  const intervals = Math.max(0, i - 1);
  if (intervals === 0) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  if (freq === 'WEEKLY') {
    const temp = new Date(y, m - 1, d + intervals * 7);
    return `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`;
  }

  const monthsToAdd = freq === 'QUARTERLY' ? intervals * 3 : intervals;
  const totalMonths = (m - 1) + monthsToAdd;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(d, maxDays);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

export function DebtManagementScreen({ onNotify }: Props) {
  const [debts, setDebts] = useState<DebtSummaryItem[]>([]);
  const [summary, setSummary] = useState<DebtListSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BORROWING' | 'LENDING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAID' | 'PAID_OFF'>('ALL');

  // Modal Tạo khoản nợ mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formType, setFormType] = useState<DebtType>('BORROWING');
  const [formPartnerName, setFormPartnerName] = useState('');
  const [formPartnerPhone, setFormPartnerPhone] = useState('');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');

  // Chia kỳ trả nợ & Tự động gắn lịch
  const [paymentPlanType, setPaymentPlanType] = useState<'ONE_TIME' | 'INSTALLMENT'>('ONE_TIME');
  const [formFrequency, setFormFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [formInstallmentCount, setFormInstallmentCount] = useState<string>('3'); // Chia thành bao nhiêu kỳ/tháng
  const [formPeriodicAmount, setFormPeriodicAmount] = useState<string>(''); // Số tiền mỗi kỳ
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(new Date().getDate()); // Ngày trong tháng (1-31)
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1); // Thứ trong tuần (1: Thứ 2, ..., 0: CN)
  const [formFirstPaymentDate, setFormFirstPaymentDate] = useState<string>(''); // Ngày bắt đầu trả kỳ đầu
  const [formNotifyDaysBefore, setFormNotifyDaysBefore] = useState<number>(1); // Báo trước bao nhiêu ngày (0: đúng ngày, 1: 1 ngày, 2: 2 ngày, 3: 3 ngày, 7: 1 tuần)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // Tài khoản trích tiền/nhận tiền (nếu có thì auto trừ)

  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Chi tiết & Trả nợ
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtDetailResponse | null>(null);
  const [, setDebtSchedule] = useState<DebtScheduleResponse | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Modal Ghi nhận trả nợ
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal Chỉnh sửa khoản nợ (đồng bộ với bản App)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCounterpartyName, setEditCounterpartyName] = useState('');
  const [editPartnerPhone, setEditPartnerPhone] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal Xác nhận xóa khoản nợ (Custom Confirmation Modal)
  const [debtToDelete, setDebtToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingDebt, setIsDeletingDebt] = useState(false);

  // Hàm format ngày Date sang string YYYY-MM-DD theo local time (tránh lệch timezone UTC)
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Hàm tính ngày trả nợ đầu tiên mặc định:
  // Nếu là Hàng tháng -> ngày formDayOfMonth của tháng sau
  // Nếu là Hàng tuần -> ngày thứ formDayOfWeek của tuần sau
  const calculateDefaultFirstPaymentDate = (freq: PaymentFrequency, dayMonth: number, dayWeek: number) => {
    const today = new Date();
    if (freq === 'WEEKLY') {
      const currentDay = today.getDay(); // 0: CN, 1: T2,...
      let diffDays = dayWeek - currentDay;
      if (diffDays <= 0) diffDays += 7; // sang tuần sau
      const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffDays);
      return formatLocalDate(targetDate);
    } else {
      // MONTHLY hoặc QUARTERLY: tháng sau, đúng ngày dayMonth đã chọn
      // Xử lý overflow nếu tháng sau không có ngày đó (ví dụ 31 vào tháng 30 ngày)
      const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const nextMonth = (today.getMonth() + 1) % 12;
      const targetDate = new Date(nextMonthYear, nextMonth, dayMonth);
      return formatLocalDate(targetDate);
    }
  };

  // Tự động tính Tổng nợ khi ở chế độ Trả theo kỳ (INSTALLMENT): Tổng nợ = Số tiền mỗi kỳ * Số kỳ chia
  const handlePeriodicAmountChange = (val: string) => {
    const rawVal = val.replace(/\D/g, '');
    setFormPeriodicAmount(rawVal);
    const periodicNum = Number(rawVal);
    const countNum = parseInt(formInstallmentCount, 10) || 0;
    if (periodicNum > 0 && countNum > 0) {
      setFormPrincipal(String(periodicNum * countNum));
    }
  };

  const handleInstallmentCountChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    setFormInstallmentCount(cleanVal);
    const countNum = parseInt(cleanVal, 10) || 0;
    const periodicNum = Number(formPeriodicAmount.replace(/\D/g, ''));
    if (periodicNum > 0 && countNum > 0) {
      setFormPrincipal(String(periodicNum * countNum));
    } else {
      const principalNum = Number(formPrincipal.replace(/\D/g, ''));
      if (principalNum > 0 && countNum > 0) {
        setFormPeriodicAmount(String(Math.ceil(principalNum / countNum)));
      }
    }
  };

  // Tự động gợi ý ngày trả nợ đầu tiên (tháng sau / tuần sau) khi đổi hình thức, tần suất hoặc ngày trả
  useEffect(() => {
    if (paymentPlanType === 'INSTALLMENT') {
      const autoDate = calculateDefaultFirstPaymentDate(formFrequency, formDayOfMonth, formDayOfWeek);
      setFormFirstPaymentDate(autoDate);
    }
  }, [paymentPlanType, formFrequency, formDayOfMonth, formDayOfWeek]);

  // Load danh sách khoản nợ
  const loadDebts = async () => {
    setIsLoading(true);
    try {
      const typeParam = activeTab === 'ALL' ? undefined : activeTab;
      const statusParam = statusFilter === 'ALL' ? undefined : (statusFilter as DebtStatus);
      const res = await debtApi.getDebts(typeParam, statusParam);
      setDebts(res.debts || []);
      setSummary(res.summary || null);
    } catch {
      onNotify('Lỗi tải danh sách khoản nợ');
    } finally {
      setIsLoading(false);
    }
  };

  // Load danh sách ví/tài khoản
  useEffect(() => {
    accountApi.getAccounts().then((res) => {
      setAccounts(res || []);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    loadDebts();
  }, [activeTab, statusFilter]);

  // Mở xem chi tiết
  const handleOpenDetail = async (id: number) => {
    try {
      const detail = await debtApi.getDebtById(id);
      setSelectedDebtDetail(detail);

      // Tải lịch trình trả nợ nếu có
      setIsLoadingSchedule(true);
      try {
        const sched = await debtApi.getDebtSchedule(id);
        setDebtSchedule(sched);
      } catch {
        setDebtSchedule(null);
      } finally {
        setIsLoadingSchedule(false);
      }
    } catch {
      onNotify('Không thể tải chi tiết khoản nợ');
    }
  };

  // Submit tạo khoản nợ
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartnerName.trim()) {
      onNotify(formType === 'BORROWING' ? 'Vui lòng nhập tên người cho vay' : 'Vui lòng nhập tên người vay');
      return;
    }
    const principalNum = Number(formPrincipal.replace(/\D/g, ''));
    if (!principalNum || principalNum <= 0) {
      onNotify('Vui lòng nhập tổng số tiền nợ hợp lệ');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const periodicAmountNum = Number(formPeriodicAmount.replace(/\D/g, '')) || undefined;
      const chosenFreq = paymentPlanType === 'INSTALLMENT' ? formFrequency : 'ONE_TIME';

      // Tính ngày trả kỳ đầu tiên dựa trên ngày trong tháng hoặc thứ trong tuần đã chọn
      let firstPayDate = formFirstPaymentDate;
      if (!firstPayDate) {
        if (paymentPlanType === 'INSTALLMENT') {
          firstPayDate = calculateDefaultFirstPaymentDate(formFrequency, formDayOfMonth, formDayOfWeek);
        } else {
          firstPayDate = formDueDate || formStartDate;
        }
      }

      // Tính ngày kết thúc do số kỳ quy định nếu người dùng không nhập ngày phải trả
      let computedDueDateWeb = formDueDate || undefined;
      if (!computedDueDateWeb && paymentPlanType === 'INSTALLMENT') {
        const count = parseInt(formInstallmentCount, 10) || 1;
        const baseDate = new Date(firstPayDate || formStartDate);
        const intervals = Math.max(0, count - 1);
        if (formFrequency === 'WEEKLY') {
          baseDate.setDate(baseDate.getDate() + intervals * 7);
        } else if (formFrequency === 'QUARTERLY') {
          baseDate.setMonth(baseDate.getMonth() + intervals * 3);
        } else {
          baseDate.setMonth(baseDate.getMonth() + intervals);
        }
        computedDueDateWeb = baseDate.toISOString().split('T')[0];
      }

      // 1. Tạo khoản nợ trong Debt API
      await debtApi.createDebt({
        debt_type: formType,
        creditor_name: formType === 'BORROWING' ? formPartnerName.trim() : undefined,
        creditor_phone: formType === 'BORROWING' ? formPartnerPhone.trim() : undefined,
        debtor_name: formType === 'LENDING' ? formPartnerName.trim() : undefined,
        debtor_phone: formType === 'LENDING' ? formPartnerPhone.trim() : undefined,
        principal_amount: principalNum,
        currency_code: 'VND', // Backend yêu cầu @NotBlank currency_code
        interest_rate: 0, // Không cần tính lãi suất phức tạp
        payment_frequency: chosenFreq,
        payment_amount: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        monthly_payment: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        start_date: formStartDate,
        due_date: computedDueDateWeb,
        next_payment_date: paymentPlanType === 'INSTALLMENT' ? firstPayDate : (formDueDate || undefined),
        account_id: selectedAccountId || undefined,
        note: formNote.trim() || undefined,
        reminder_enabled: true, // Luôn bật nhắc nhở / gắn vào lịch
        reminder_days_before: formNotifyDaysBefore,
      });

      onNotify('Tạo khoản nợ mới thành công!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadDebts();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Có lỗi xảy ra khi tạo khoản nợ');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setFormPartnerName('');
    setFormPartnerPhone('');
    setFormPrincipal('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormNote('');
    setPaymentPlanType('ONE_TIME');
    setFormFrequency('MONTHLY');
    setFormInstallmentCount('3');
    setFormPeriodicAmount('');
    setFormDayOfMonth(new Date().getDate());
    setFormDayOfWeek(1);
    setFormFirstPaymentDate('');
    setSyncToCalendar(true);
    setFormNotifyDaysBefore(1);
    setSelectedAccountId('');
  };

  // Mở modal sửa khoản nợ
  const handleOpenEditModal = () => {
    if (!selectedDebtDetail) return;
    const isBorrow = selectedDebtDetail.debt_type === 'BORROWING';
    setEditCounterpartyName((isBorrow ? selectedDebtDetail.creditor_name : selectedDebtDetail.debtor_name) || '');
    setEditPartnerPhone((isBorrow ? selectedDebtDetail.creditor_phone : selectedDebtDetail.debtor_phone) || '');
    setEditPrincipal(selectedDebtDetail.principal_amount ? String(selectedDebtDetail.principal_amount) : '');
    setEditStartDate(selectedDebtDetail.start_date ? selectedDebtDetail.start_date.split('T')[0] : '');
    setEditDueDate(selectedDebtDetail.due_date ? selectedDebtDetail.due_date.split('T')[0] : '');
    setEditAccountId('');
    setEditNote(selectedDebtDetail.note || selectedDebtDetail.description || '');
    setIsEditModalOpen(true);
  };

  // Lưu chỉnh sửa khoản nợ
  const handleSaveEditDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtDetail) return;
    if (!editCounterpartyName.trim()) {
      onNotify('Vui lòng nhập tên người nợ / người cho vay');
      return;
    }
    const principalNum = parseFloat(editPrincipal.replace(/\D/g, ''));
    if (!principalNum || principalNum <= 0) {
      onNotify('Vui lòng nhập tổng số tiền nợ hợp lệ');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const isBorrow = selectedDebtDetail.debt_type === 'BORROWING';
      const payload: any = {
        principal_amount: principalNum,
        start_date: editStartDate || undefined,
        due_date: editDueDate || undefined,
        account_id: editAccountId || undefined,
        note: editNote.trim() || undefined,
        description: editNote.trim() || undefined,
      };
      if (isBorrow) {
        payload.creditor_name = editCounterpartyName.trim();
        payload.creditor_phone = editPartnerPhone.trim() || undefined;
      } else {
        payload.debtor_name = editCounterpartyName.trim();
        payload.debtor_phone = editPartnerPhone.trim() || undefined;
      }

      await debtApi.updateDebt(selectedDebtDetail.id, payload);
      onNotify('Cập nhật khoản nợ thành công!');
      setIsEditModalOpen(false);
      handleOpenDetail(selectedDebtDetail.id);
      loadDebts();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật khoản nợ');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Mở popup xác nhận xóa
  const handleRequestDeleteDebt = (id: number, name: string) => {
    setDebtToDelete({ id, name });
  };

  // Thực hiện xóa khoản nợ khi bấm xác nhận
  const confirmDeleteDebt = async () => {
    if (!debtToDelete) return;
    setIsDeletingDebt(true);
    try {
      await debtApi.deleteDebt(debtToDelete.id);
      onNotify(`Đã xóa khoản nợ "${debtToDelete.name}" thành công!`);
      setDebtToDelete(null);
      setSelectedDebtDetail(null);
      setDebtSchedule(null);
      loadDebts();
    } catch {
      onNotify('Không thể xóa khoản nợ này');
    } finally {
      setIsDeletingDebt(false);
    }
  };

  // Submit trả nợ
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtDetail) return;
    const amountNum = Number(paymentAmount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) {
      onNotify('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }

    setIsSubmittingPayment(true);
    const isBorrowing = selectedDebtDetail.debt_type === 'BORROWING';
    try {
      await debtApi.recordPayment(selectedDebtDetail.id, {
        amount: amountNum,
        payment_date: paymentDate,
        account_id: paymentAccountId || undefined,
        note: paymentNote.trim() || undefined,
      });
      onNotify(isBorrowing ? 'Ghi nhận trả nợ thành công!' : 'Ghi nhận thu nợ thành công! Tiền đã được cộng vào ví.');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      // Reload detail and list
      handleOpenDetail(selectedDebtDetail.id);
      loadDebts();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Lỗi khi ghi nhận giao dịch nợ');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="debt-page-container">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="debt-stat-card border-rose-200 bg-rose-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e11d48]">Khoản nợ (Đi vay)</span>
            <span className="grid size-8 place-items-center rounded-lg bg-rose-100 text-[#e11d48]">
              <FinanceIcon name="expense" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#e11d48]">
            {formatCurrency(summary?.total_borrowing || 0)}
          </p>
          <span className="text-[11px] text-[#64748B]">Tổng số tiền cần trả</span>
        </div>

        <div className="debt-stat-card border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Cho vay (Thu hồi)</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-[#007F53]">
              <FinanceIcon name="income" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#007F53]">
            {formatCurrency(summary?.total_lending || 0)}
          </p>
          <span className="text-[11px] text-[#64748B]">Tổng số tiền sẽ thu về</span>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="debt-filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs Loại nợ */}
          <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`rounded-lg px-3 py-1.5 transition ${activeTab === 'ALL' ? 'bg-white text-[#007F53] shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BORROWING')}
              className={`rounded-lg px-3 py-1.5 transition ${activeTab === 'BORROWING' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Đi vay
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LENDING')}
              className={`rounded-lg px-3 py-1.5 transition ${activeTab === 'LENDING' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Cho vay
            </button>
          </div>

          {/* Trạng thái Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#0F172A] outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang thực hiện (Chưa trả hết)</option>
            <option value="PAID_OFF">Đã hoàn tất (Trả hết)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#007F53] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#009663] transition active:scale-[0.98]"
        >
          <FinanceIcon name="plus" size={14} />
          <span>Thêm khoản nợ mới</span>
        </button>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="grid place-items-center py-20 text-xs font-semibold text-gray-500">
          <FinanceIcon name="refresh" size={24} className="animate-spin text-[#007F53] mb-2" />
          <span>Đang tải dữ liệu công nợ...</span>
        </div>
      ) : debts.length === 0 ? (
        <div className="grid place-items-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#007F53] mb-3">
            <FinanceIcon name="wallet" size={24} />
          </span>
          <h3 className="text-sm font-bold text-[#0F172A]">Chưa có khoản nợ nào</h3>
          <p className="mt-1 text-xs text-[#64748B] max-w-sm">
            Ghi chép lại các khoản bạn đi vay hoặc cho vay, chia theo từng tháng/tuần và tự động nhắc nhở trả nợ đúng hẹn.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 rounded-xl bg-[#007F53] px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            + Tạo khoản nợ đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debts.map((item) => {
            const isBorrowing = item.debt_type === 'BORROWING';
            const partnerName = isBorrowing ? item.creditor_name || 'Người cho vay' : item.debtor_name || 'Người vay';
            const isPaid = item.status === 'PAID_OFF' || item.status === 'PAID' || item.remaining <= 0;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item.id)}
                className="group relative cursor-pointer flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs hover:shadow-md hover:border-[#007F53]/40 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`debt-type-badge-icon ${isBorrowing ? 'borrowing' : 'lending'}`}>
                        <FinanceIcon name={isBorrowing ? 'borrowing' : 'lending'} size={15} />
                      </span>
                      <div className="min-w-0">
                        <span className={`debt-type-label ${isBorrowing ? 'borrowing' : 'lending'}`}>
                          {isBorrowing ? 'Đi vay' : 'Cho vay'}
                        </span>
                        <h4 className="truncate text-sm font-bold text-[#0F172A]">{partnerName}</h4>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-lg px-2.5 py-0.75 text-[10.5px] font-bold border transition ${isPaid
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                      }`}>
                      {isPaid ? 'Đã hoàn tất' : 'Đang nợ'}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="debt-field-label">Tổng nợ:</span>
                      <strong className="debt-field-value">{formatCurrency(item.principal_amount)}</strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="debt-field-label">Còn lại cần thanh toán:</span>
                      <strong className={`debt-amount-highlight ${isBorrowing ? 'borrowing' : 'lending'}`}>
                        {formatCurrency(item.remaining)}
                      </strong>
                    </div>

                    {item.next_payment_amount && item.next_payment_amount > 0 && !isPaid ? (
                      <div className="flex justify-between text-xs rounded-lg bg-emerald-50/50 p-1.5 border border-emerald-100">
                        <span className="text-emerald-800 font-medium">Kỳ tới cần trả:</span>
                        <strong className="text-emerald-800 font-bold">{formatCurrency(item.next_payment_amount)}</strong>
                      </div>
                    ) : null}

                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="debt-field-label">Tiến độ trả:</span>
                        <span className="debt-field-value font-bold">{item.percentage_paid || 0}%</span>
                      </div>
                      <ProgressBar
                        percent={item.percentage_paid || 0}
                        colorClass={isBorrowing ? 'borrowing' : 'lending'}
                      />
                    </div>
                  </div>
                </div>

                <div className="debt-card-footer">
                  <span className="debt-card-footer-due">
                    {item.payment_frequency && item.payment_frequency !== 'ONE_TIME' ? (
                      <>
                        Kỳ tới: <strong>{formatDate(item.next_payment_date || item.due_date, 'Không có')}</strong>
                      </>
                    ) : (
                      <>
                        Hạn trả: <strong>{formatDate(item.due_date, 'Không có')}</strong>
                      </>
                    )}
                  </span>
                  <span className="debt-card-footer-action">Chi tiết →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TẠO KHOẢN NỢ MỚI */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Tạo khoản nợ mới</h3>
                <p className="text-xs text-[#64748B]">Ghi nhận nợ, chia theo kỳ và hẹn ngày trả</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setFormType('BORROWING')}
                  className={`h-9 rounded-lg text-xs font-bold transition ${formType === 'BORROWING' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600'
                    }`}
                >
                  Khoản đi vay
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('LENDING')}
                  className={`h-9 rounded-lg text-xs font-bold transition ${formType === 'LENDING' ? 'bg-white text-[#007F53] shadow-sm' : 'text-gray-600'
                    }`}
                >
                  Khoản cho vay
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#0F172A]">
                    {formType === 'BORROWING' ? 'Tên người / Đơn vị cho vay *' : 'Tên người vay nợ *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Anh Nam, Vietcombank..."
                    value={formPartnerName}
                    onChange={(e) => setFormPartnerName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#0F172A]">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={formPartnerPhone}
                    onChange={(e) => setFormPartnerPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                  />
                </div>
              </div>

              {/* HÌNH THỨC TRẢ NỢ: 1 lần hay Chia theo kỳ (tháng/tuần) */}
              <div className="rounded-2xl border border-emerald-100 bg-[#f8fbf9] p-3.5 space-y-3">
                <label className="block text-xs font-bold text-[#0F172A]">Hình thức trả nợ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentPlanType('ONE_TIME');
                    }}
                    className={`h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center ${paymentPlanType === 'ONE_TIME'
                      ? 'border-[#007F53] bg-emerald-50 text-[#007F53]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Trả một lần
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentPlanType('INSTALLMENT');
                    }}
                    className={`h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center ${paymentPlanType === 'INSTALLMENT'
                      ? 'border-[#007F53] bg-emerald-50 text-[#007F53]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Trả theo kỳ
                  </button>
                </div>

                {/* NẾU CHỌN TRẢ MỘT LẦN */}
                {paymentPlanType === 'ONE_TIME' && (
                  <div className="space-y-3 pt-2 border-t border-emerald-100">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#0F172A]">Tổng số tiền nợ (VND) *</label>
                      <input
                        type="text"
                        required
                        placeholder="0"
                        value={formPrincipal ? Number(formPrincipal).toLocaleString('vi-VN') : ''}
                        onChange={(e) => setFormPrincipal(e.target.value.replace(/\D/g, ''))}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#007F53] outline-none focus:border-[#007F53]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Ngày bắt đầu nợ</label>
                        <DatePicker
                          value={formStartDate}
                          onChange={(val) => setFormStartDate(val)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Ngày cụ thể phải trả *</label>
                        <DatePicker
                          value={formDueDate}
                          onChange={(val) => setFormDueDate(val)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NẾU CHỌN TRẢ THEO KỲ */}
                {paymentPlanType === 'INSTALLMENT' && (
                  <div className="space-y-3 pt-2 border-t border-emerald-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Tần suất trả</label>
                        <select
                          value={formFrequency}
                          onChange={(e) => setFormFrequency(e.target.value as PaymentFrequency)}
                          className="h-9 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#0F172A] outline-none"
                        >
                          <option value="MONTHLY">Hàng tháng</option>
                          <option value="WEEKLY">Hàng tuần</option>
                          <option value="QUARTERLY">Hàng quý (3 tháng)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                          {formFrequency === 'WEEKLY' ? 'Số tuần chia (kỳ)' : 'Số tháng chia (kỳ)'}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Nhập số kỳ (ví dụ: 2, 6, 12...)"
                          value={formInstallmentCount}
                          onChange={(e) => handleInstallmentCountChange(e.target.value)}
                          className="h-9 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#0F172A] outline-none focus:border-[#007F53]"
                        />
                      </div>
                    </div>

                    {/* Lựa chọn ngày cụ thể trong tháng hoặc thứ trong tuần để trả nợ */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white border border-emerald-100">
                      {formFrequency === 'WEEKLY' ? (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs font-bold text-[#007F53]">
                            Trả vào thứ mấy hàng tuần?
                          </label>
                          <select
                            value={formDayOfWeek}
                            onChange={(e) => setFormDayOfWeek(parseInt(e.target.value, 10))}
                            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs font-bold text-[#0F172A] outline-none"
                          >
                            <option value={1}>Thứ Hai hàng tuần</option>
                            <option value={2}>Thứ Ba hàng tuần</option>
                            <option value={3}>Thứ Tư hàng tuần</option>
                            <option value={4}>Thứ Năm hàng tuần</option>
                            <option value={5}>Thứ Sáu hàng tuần</option>
                            <option value={6}>Thứ Bảy hàng tuần</option>
                            <option value={0}>Chủ Nhật hàng tuần</option>
                          </select>
                        </div>
                      ) : (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs font-bold text-[#007F53]">
                            Trả vào ngày mấy hàng tháng?
                          </label>
                          <select
                            value={formDayOfMonth}
                            onChange={(e) => setFormDayOfMonth(parseInt(e.target.value, 10))}
                            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs font-bold text-[#0F172A] outline-none"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Ngày {d} hàng tháng
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-[#0F172A]">Số tiền mỗi kỳ (VND) *</label>
                        <input
                          type="text"
                          required
                          value={formPeriodicAmount ? Number(formPeriodicAmount).toLocaleString('vi-VN') : ''}
                          onChange={(e) => handlePeriodicAmountChange(e.target.value)}
                          placeholder="Ví dụ: 833.334"
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#007F53] outline-none focus:border-[#007F53]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Ngày trả nợ đầu tiên</label>
                        <DatePicker
                          value={formFirstPaymentDate}
                          onChange={(val) => setFormFirstPaymentDate(val)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    {/* Tổng số tiền nợ tự động tính */}
                    <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-950">
                          Tổng số tiền nợ (VND)
                          <span className="ml-1 text-[10px] font-normal text-emerald-700">(Tự tính theo số kỳ & tiền kỳ)</span>
                        </label>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="0"
                          value={formPrincipal ? Number(formPrincipal).toLocaleString('vi-VN') : ''}
                          onChange={(e) => setFormPrincipal(e.target.value.replace(/\D/g, ''))}
                          className="h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-bold text-[#007F53] outline-none focus:border-[#007F53]"
                        />
                      </div>
                      {formPeriodicAmount && Number(formInstallmentCount) > 0 && (
                        <p className="mt-1 text-[11px] text-emerald-800">
                          ≈ {Number(formPeriodicAmount).toLocaleString('vi-VN')} đ × {formInstallmentCount} kỳ
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Thiết lập Lịch tài chính & Trích nợ tự động (Luôn tự động gắn lịch) */}
              <div className="rounded-2xl border border-emerald-100 bg-[#f8fbf9] p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-[#007F53]">
                    <FinanceIcon name="calendar" size={15} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#007F53]">Tự động đồng bộ Lịch tài chính</h4>
                    <p className="text-[11px] text-[#64748B]">Khoản nợ luôn được theo dõi trên lịch để nhắc nhở và quản lý đúng hạn.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2.5 border-t border-emerald-100">
                  {/* Chọn tài khoản trích nợ tự động */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#0F172A]">
                        {formType === 'BORROWING' ? 'Tài khoản trích nợ tự động (Tùy chọn)' : 'Tài khoản nhận tiền tự động (Tùy chọn)'}
                      </label>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {selectedAccountId ? (
                          <span className="text-[#007F53] font-bold">⚡ Tự động trừ tiền</span>
                        ) : (
                          <span>🔔 Chỉ nhắc nhở</span>
                        )}
                      </span>
                    </div>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-[#0F172A] outline-none focus:border-[#007F53]"
                    >
                      <option value="">Không gắn tài khoản (Chỉ gửi thông báo nhắc nợ)</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          💳 {acc.name} (Số dư: {formatCurrency(acc.balance)}) - Tự động trích nợ
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      {selectedAccountId
                        ? 'Khi đến hạn, hệ thống sẽ tự động trừ số dư ví đã chọn và ghi nhận lịch sử giao dịch.'
                        : 'Nếu không chọn ví, đến ngày hẹn hệ thống chỉ hiển thị chuông thông báo nhắc nhở mà không trừ tiền.'}
                    </p>
                  </div>

                  {/* Chọn số ngày thông báo trước */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#0F172A]">
                      Thời gian gửi thông báo nhắc hẹn
                    </label>
                    <select
                      value={formNotifyDaysBefore}
                      onChange={(e) => setFormNotifyDaysBefore(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-[#0F172A] outline-none focus:border-[#007F53]"
                    >
                      <option value={0}>Báo đúng ngày đến hạn</option>
                      <option value={1}>Nhắc trước 1 ngày (Khuyên dùng)</option>
                      <option value={2}>Nhắc trước 2 ngày</option>
                      <option value={3}>Nhắc trước 3 ngày</option>
                      <option value={7}>Nhắc trước 1 tuần (7 ngày)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#0F172A]">Ghi chú / Thỏa thuận</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về mục đích vay hoặc điều khoản hẹn trả..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-[#007F53]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 rounded-xl bg-gray-100 px-4 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="h-10 rounded-xl bg-[#007F53] px-5 text-xs font-bold text-white hover:bg-[#009663] disabled:opacity-50"
                >
                  {isSubmittingCreate ? 'Đang tạo...' : 'Lưu khoản nợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT KHOẢN NỢ & LỊCH TRẢ */}
      {selectedDebtDetail && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`debt-type-badge-icon ${selectedDebtDetail.debt_type === 'BORROWING' ? 'borrowing' : 'lending'}`}>
                  <FinanceIcon name={selectedDebtDetail.debt_type === 'BORROWING' ? 'expense' : 'income'} size={15} />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94a3b8]">
                    {selectedDebtDetail.debt_type === 'BORROWING' ? 'Chi tiết khoản đi vay' : 'Chi tiết khoản cho vay'}
                  </span>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    {selectedDebtDetail.debt_type === 'BORROWING' ? selectedDebtDetail.creditor_name : selectedDebtDetail.debtor_name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDebtDetail(null);
                  setDebtSchedule(null);
                }}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Thẻ tóm tắt số tiền */}
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Tổng nợ ban đầu:</span>
                  <strong className="text-base font-bold text-[#0F172A]">{formatCurrency(selectedDebtDetail.principal_amount)}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Đã thanh toán:</span>
                  <strong className="text-emerald-700 font-bold">{formatCurrency(selectedDebtDetail.paid_amount)}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Còn lại cần trả:</span>
                  <strong className="text-rose-700 font-bold text-sm">{formatCurrency(selectedDebtDetail.remaining_amount)}</strong>
                </div>
                <div className="pt-1">
                  <ProgressBar
                    percent={selectedDebtDetail.percentage_paid || 0}
                    colorClass={selectedDebtDetail.debt_type === 'BORROWING' ? 'borrowing' : 'lending'}
                  />
                </div>
              </div>

              {/* Thông tin hẹn trả và chu kỳ */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-500">Chu kỳ trả:</span>
                  <p className="font-bold text-[#0F172A]">
                    {(() => {
                      const freq = selectedDebtDetail.payment_frequency;
                      const periodicAmt = selectedDebtDetail.payment_amount || selectedDebtDetail.monthly_payment || 0;
                      const totalPrincipal = selectedDebtDetail.principal_amount || 0;
                      const count = (periodicAmt > 0 && totalPrincipal > 0)
                        ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
                        : 1;

                      if (freq && freq !== 'ONE_TIME') {
                        const baseDateStr = selectedDebtDetail.next_payment_date || selectedDebtDetail.start_date || selectedDebtDetail.due_date;
                        let schedulePatternText = freq === 'WEEKLY' ? 'Hàng tuần' : freq === 'QUARTERLY' ? 'Hàng quý' : 'Hàng tháng';
                        if (baseDateStr) {
                          const isoMatch = String(baseDateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                          if (isoMatch) {
                            const d = parseInt(isoMatch[3], 10);
                            const m = parseInt(isoMatch[2], 10);
                            const y = parseInt(isoMatch[1], 10);
                            if (freq === 'WEEKLY') {
                              const dowNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                              const dow = new Date(y, m - 1, d).getDay();
                              schedulePatternText = `${dowNames[dow]} hàng tuần`;
                            } else if (freq === 'QUARTERLY') {
                              schedulePatternText = `Ngày ${d} hàng quý`;
                            } else {
                              schedulePatternText = `Ngày ${d} hàng tháng`;
                            }
                          }
                        }
                        return `${count} kỳ - ${schedulePatternText}`;
                      }
                      return 'Trả một lần';
                    })()}
                  </p>
                  {selectedDebtDetail.payment_amount ? (
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      {formatCurrency(selectedDebtDetail.payment_amount)} / kỳ
                    </span>
                  ) : null}
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-500">Hạn thanh toán:</span>
                  <p className="font-bold text-[#0F172A]">{formatDate(selectedDebtDetail.due_date, 'Không thời hạn')}</p>
                </div>
              </div>

              {/* Lịch trình các kỳ trả nợ dự kiến */}
              {isLoadingSchedule ? (
                <div className="py-4 text-center text-xs text-gray-500">
                  <FinanceIcon name="refresh" size={16} className="animate-spin inline-block mr-1.5 text-[#007F53]" />
                  <span>Đang tải kế hoạch trả nợ...</span>
                </div>
              ) : (() => {
                const freq = selectedDebtDetail.payment_frequency;
                const periodicAmt = selectedDebtDetail.payment_amount || selectedDebtDetail.monthly_payment || 0;
                const totalPrincipal = selectedDebtDetail.principal_amount || 0;
                const totalPaid = selectedDebtDetail.paid_amount || 0;
                const count = (periodicAmt > 0 && totalPrincipal > 0)
                  ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
                  : 1;

                if (!freq || freq === 'ONE_TIME') return null;

                const baseDateStr = selectedDebtDetail.next_payment_date || selectedDebtDetail.start_date || selectedDebtDetail.due_date;
                let scheduleList: Array<{
                  payment_number: number;
                  due_date: string;
                  amount: number;
                  remaining_after: number;
                  status: string;
                }> = [];

                let rem = totalPrincipal;
                for (let i = 1; i <= count; i++) {
                  const threshold = periodicAmt * (i - 0.1);
                  const isPaid = totalPaid >= threshold || selectedDebtDetail.remaining_amount <= 0;
                  const dueStr = computeInstallmentDate(baseDateStr, i, freq);
                  rem = Math.max(0, rem - periodicAmt);

                  // Kiểm tra quá hạn
                  let status = isPaid ? 'PAID' : 'PENDING';
                  if (!isPaid && dueStr) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (dueStr < todayStr) status = 'OVERDUE';
                  }

                  scheduleList.push({
                    payment_number: i,
                    due_date: dueStr,
                    amount: periodicAmt,
                    remaining_after: rem,
                    status,
                  });
                }

                if (scheduleList.length === 0) return null;

                const completedCount = scheduleList.filter((it) => it.status === 'PAID').length;

                return (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-[#0F172A]">Lịch trình trả nợ theo kỳ ({scheduleList.length} kỳ)</h4>
                      <span className="text-[11px] text-[#64748B]">
                        Đã trả {completedCount} / {scheduleList.length} kỳ
                      </span>
                    </div>
                    {/* Chỉ hiện 3 kỳ, từ 4 kỳ trở lên dùng thanh trượt */}
                    <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
                      {scheduleList.map((item) => (
                        <div
                          key={item.payment_number}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs border ${item.status === 'PAID'
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                            : item.status === 'OVERDUE'
                              ? 'bg-rose-50/50 border-rose-100 text-rose-800'
                              : 'bg-gray-50 border-gray-100 text-gray-800'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold shadow-xs">
                              {item.payment_number}
                            </span>
                            <div>
                              <span className="font-semibold">Hạn: {formatDate(item.due_date)}</span>
                              <span className="text-[10px] text-gray-500 block">
                                Còn lại sau kỳ: {formatCurrency(item.remaining_after)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <strong className="block">{formatCurrency(item.amount)}</strong>
                            <span className={`text-[10px] font-bold ${item.status === 'PAID' ? 'text-emerald-700' : item.status === 'OVERDUE' ? 'text-rose-600' : 'text-gray-500'
                              }`}>
                              {item.status === 'PAID' ? 'Đã trả ✓' : item.status === 'OVERDUE' ? 'Quá hạn ⚠' : 'Chưa trả'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Nút hành động: Sửa khoản nợ, Trả nợ & Xóa - Chia đều 3 cột bằng nhau */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const debtName = selectedDebtDetail.debt_type === 'BORROWING'
                      ? (selectedDebtDetail.creditor_name || 'Khoản đi vay')
                      : (selectedDebtDetail.debtor_name || 'Khoản cho vay');
                    handleRequestDeleteDebt(selectedDebtDetail.id, debtName);
                  }}
                  className="h-10 w-full rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FinanceIcon name="trash" size={14} />
                  <span>Xóa nợ</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="h-10 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FinanceIcon name="edit" size={14} />
                  <span>Sửa khoản nợ</span>
                </button>

                {!(selectedDebtDetail.status === 'PAID_OFF' || selectedDebtDetail.status === 'PAID' || selectedDebtDetail.remaining_amount <= 0) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const freq = selectedDebtDetail.payment_frequency;
                      const periodicAmt = selectedDebtDetail.payment_amount || selectedDebtDetail.monthly_payment || 0;
                      const totalPrincipal = selectedDebtDetail.principal_amount || 0;
                      const totalPaid = selectedDebtDetail.paid_amount || 0;
                      const count = (periodicAmt > 0 && totalPrincipal > 0)
                        ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
                        : 1;

                      let targetPeriodNum: number | null = null;
                      let targetDueDate: string = new Date().toISOString().split('T')[0];
                      let targetAmount = selectedDebtDetail.remaining_amount || 0;

                      if (freq && freq !== 'ONE_TIME' && count > 1) {
                        const baseDateStr = selectedDebtDetail.next_payment_date || selectedDebtDetail.start_date || selectedDebtDetail.due_date;
                        for (let i = 1; i <= count; i++) {
                          const threshold = periodicAmt * (i - 0.1);
                          const isPaid = totalPaid >= threshold;
                          if (!isPaid) {
                            targetPeriodNum = i;
                            targetDueDate = computeInstallmentDate(baseDateStr, i, freq);
                            targetAmount = Math.min(periodicAmt, selectedDebtDetail.remaining_amount);
                            break;
                          }
                        }
                      }

                      setSelectedPeriodNumber(targetPeriodNum);
                      setPaymentAmount(String(targetAmount || ''));
                      setPaymentDate(targetDueDate);
                      const noteText = targetPeriodNum
                        ? (selectedDebtDetail.debt_type === 'BORROWING' ? `Trả nợ kỳ ${targetPeriodNum}` : `Thu nợ kỳ ${targetPeriodNum}`)
                        : (selectedDebtDetail.debt_type === 'BORROWING' ? 'Trả nợ' : 'Thu nợ');
                      setPaymentNote(noteText);
                      setIsPaymentModalOpen(true);
                    }}
                    className="h-10 w-full rounded-xl bg-[#007F53] text-white text-xs font-bold hover:bg-[#009663] shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FinanceIcon name="wallet" size={15} />
                    <span>{selectedDebtDetail.debt_type === 'BORROWING' ? 'Trả nợ' : 'Thu nợ'}</span>
                  </button>
                ) : (
                  <div className="h-10 w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs">
                    <span>✓ Đã trả hết</span>
                  </div>
                )}
              </div>

              {/* Lịch sử các lần thanh toán */}
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-[#0F172A] mb-2">Lịch sử thanh toán thực tế ({selectedDebtDetail.payment_history?.length || 0})</h4>
                {(!selectedDebtDetail.payment_history || selectedDebtDetail.payment_history.length === 0) ? (
                  <p className="text-xs text-gray-500 italic py-3 text-center">Chưa có lần trả nợ nào được ghi nhận</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedDebtDetail.payment_history.map((pm) => (
                      <div key={pm.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#0F172A]">{formatCurrency(pm.amount)}</p>
                          <span className="text-[11px] text-gray-500">{formatDate(pm.payment_date)} {pm.note ? `· ${pm.note}` : ''}</span>
                        </div>
                        <span className="text-emerald-700 font-semibold text-[11px]">Đã trả ✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRẢ NỢ */}
      {isPaymentModalOpen && selectedDebtDetail && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ghi nhận Trả nợ' : 'Ghi nhận Thu nợ'}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {selectedDebtDetail.debt_type === 'BORROWING'
                    ? `Thanh toán khoản tiền bạn đã vay từ ${selectedDebtDetail.creditor_name || 'người cho vay'}`
                    : `Thu hồi tiền bạn đã cho ${selectedDebtDetail.debtor_name || 'người vay'} mượn`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3.5">
              {/* Chọn kỳ thanh toán (Gợi ý nhanh theo từng kỳ) */}
              {(() => {
                const freq = selectedDebtDetail.payment_frequency;
                const periodicAmt = selectedDebtDetail.payment_amount || selectedDebtDetail.monthly_payment || 0;
                const totalPrincipal = selectedDebtDetail.principal_amount || 0;
                const totalPaid = selectedDebtDetail.paid_amount || 0;
                const count = (periodicAmt > 0 && totalPrincipal > 0)
                  ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
                  : 1;

                if (!freq || freq === 'ONE_TIME' || count <= 1) return null;

                const baseDateStr = selectedDebtDetail.next_payment_date || selectedDebtDetail.start_date || selectedDebtDetail.due_date;
                const periods = [];
                for (let i = 1; i <= count; i++) {
                  const threshold = periodicAmt * (i - 0.1);
                  const isPaid = totalPaid >= threshold || selectedDebtDetail.remaining_amount <= 0;
                  const dStr = computeInstallmentDate(baseDateStr, i, freq);
                  periods.push({
                    periodNumber: i,
                    amount: periodicAmt,
                    dueDate: dStr,
                    isPaid,
                  });
                }

                return (
                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#0F172A]">Chọn kỳ thanh toán:</label>
                      <span className="text-[10px] text-gray-500">Bấm để tự động điền</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {periods.map((p) => {
                        const isSelected = selectedPeriodNumber === p.periodNumber;
                        return (
                          <button
                            key={p.periodNumber}
                            type="button"
                            disabled={p.isPaid}
                            onClick={() => {
                              setSelectedPeriodNumber(p.periodNumber);
                              setPaymentAmount(String(p.amount));
                              if (p.dueDate) setPaymentDate(p.dueDate);
                              const noteText = selectedDebtDetail.debt_type === 'BORROWING'
                                ? `Trả nợ kỳ ${p.periodNumber}`
                                : `Thu nợ kỳ ${p.periodNumber}`;
                              setPaymentNote(noteText);
                            }}
                            className={`p-2 rounded-xl text-left border transition text-xs ${p.isPaid
                              ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'bg-emerald-50 border-[#007F53] text-[#007F53] ring-1 ring-[#007F53] font-bold shadow-xs'
                                : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-300 hover:bg-emerald-50/30'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">Kỳ {p.periodNumber}</span>
                              {p.isPaid && <span className="text-[9px] text-emerald-600 font-bold">✓</span>}
                            </div>
                            <span className="text-[11px] block mt-0.5">{formatCurrency(p.amount)}</span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">
                              {formatDate(p.dueDate, 'Chưa rõ')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#0F172A]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Số tiền trả nợ (VND) *' : 'Số tiền thu nợ (VND) *'}
                </label>
                <input
                  type="text"
                  required
                  value={paymentAmount ? Number(paymentAmount).toLocaleString('vi-VN') : ''}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#007F53] outline-none focus:border-[#007F53]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#0F172A]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ngày trả nợ' : 'Ngày thu tiền'}
                </label>
                <DatePicker
                  required
                  value={paymentDate}
                  onChange={(val) => setPaymentDate(val)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#007F53]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#0F172A]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ví / Tài khoản nguồn (Trừ tiền)' : 'Ví / Tài khoản nhận tiền (Cộng tiền)'}
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                >
                  <option value="">Không liên kết ví (Chỉ cập nhật số dư nợ)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Số dư hiện tại: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {selectedDebtDetail.debt_type === 'BORROWING'
                    ? '💡 Số tiền trả nợ sẽ được trừ trực tiếp khỏi số dư tài khoản này.'
                    : '💡 Số tiền thu nợ sẽ được cộng trực tiếp vào số dư tài khoản này.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#0F172A]">Ghi chú</label>
                <input
                  type="text"
                  placeholder={selectedDebtDetail.debt_type === 'BORROWING' ? 'Ví dụ: Trả kỳ 1, chuyển khoản Vietcombank...' : 'Ví dụ: Khách trả tiền mặt, nhận chuyển khoản...'}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="h-10 rounded-xl bg-gray-100 px-4 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="h-10 rounded-xl bg-[#007F53] px-5 text-xs font-bold text-white hover:bg-[#009663] disabled:opacity-50"
                >
                  {isSubmittingPayment
                    ? 'Đang lưu...'
                    : selectedDebtDetail.debt_type === 'BORROWING'
                      ? 'Xác nhận trả nợ'
                      : 'Xác nhận thu nợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA KHOẢN NỢ (ĐỒNG BỘ HOÀN TOÀN VỚI BẢN APP) */}
      {isEditModalOpen && selectedDebtDetail && (
        <div className="modal-backdrop">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <FinanceIcon name="edit" size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Sửa khoản nợ</h3>
                  <p className="text-[11px] text-[#64748B]">
                    {selectedDebtDetail.debt_type === 'BORROWING' ? 'Chỉnh sửa thông tin khoản đi vay' : 'Chỉnh sửa thông tin khoản cho vay'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditDebt} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Tên khoản vay / Người cho vay *' : 'Tên khoản vay / Người vay *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Vay mua xe, Trả góp laptop, Vay anh Long..."
                  value={editCounterpartyName}
                  onChange={(e) => setEditCounterpartyName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-medium text-[#0F172A] outline-none focus:border-[#007F53]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  placeholder="0987654321..."
                  value={editPartnerPhone}
                  onChange={(e) => setEditPartnerPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tổng số tiền nợ (VNĐ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tổng số tiền..."
                  value={editPrincipal ? Number(editPrincipal).toLocaleString('vi-VN') : ''}
                  onChange={(e) => setEditPrincipal(e.target.value.replace(/\D/g, ''))}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#007F53] outline-none focus:border-[#007F53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Ngày bắt đầu
                  </label>
                  <DatePicker
                    value={editStartDate}
                    onChange={(val) => setEditStartDate(val)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#007F53]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Hạn thanh toán
                  </label>
                  <DatePicker
                    value={editDueDate}
                    onChange={(val) => setEditDueDate(val)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#007F53]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tài khoản / Ví liên kết
                </label>
                <select
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                >
                  <option value="">Không gắn tài khoản (Chỉ gửi nhắc nợ)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Số dư: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Ghi chú / Thỏa thuận
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vay mua đồ, thỏa thuận trả trước..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#007F53]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 rounded-xl bg-gray-100 px-4 text-xs font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="h-10 rounded-xl bg-[#007F53] px-5 text-xs font-bold text-white hover:bg-[#009663] disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP XÁC NHẬN XÓA KHOẢN NỢ TỰ TẠO (CUSTOM MODAL ĐẸP MẮT) */}
      <ConfirmDeleteModal
        isOpen={Boolean(debtToDelete)}
        title="Xác nhận xóa khoản nợ?"
        subtitle="Hành động này không thể hoàn tác"
        itemName={debtToDelete?.name}
        itemTypeLabel="Khoản nợ"
        message={debtToDelete ? `Bạn có chắc chắn muốn xóa vĩnh viễn khoản nợ "${debtToDelete.name}" khỏi sổ theo dõi không?` : ''}
        isDeleting={isDeletingDebt}
        onConfirm={confirmDeleteDebt}
        onClose={() => setDebtToDelete(null)}
      />
    </div>
  );
}
