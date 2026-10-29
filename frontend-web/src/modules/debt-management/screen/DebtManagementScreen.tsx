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
import { scheduleApi } from '../../financial-reminders/api/scheduleApi';
import { formatDate } from '../../core/utils/dateUtils';
import { DatePicker } from '../../core/components/DatePicker';
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
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(true); // Tự động gắn với Lịch tài chính
  const [formNotifyDaysBefore, setFormNotifyDaysBefore] = useState<number>(1); // Báo trước bao nhiêu ngày (0: đúng ngày, 1: 1 ngày, 2: 2 ngày, 3: 3 ngày, 7: 1 tuần)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // Tài khoản trích tiền/nhận tiền (nếu có thì auto trừ)

  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Chi tiết & Trả nợ
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtDetailResponse | null>(null);
  const [debtSchedule, setDebtSchedule] = useState<DebtScheduleResponse | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Modal Ghi nhận trả nợ
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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
    }).catch(() => {});
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
        due_date: formDueDate || undefined,
        next_payment_date: paymentPlanType === 'INSTALLMENT' ? firstPayDate : (formDueDate || undefined),
        account_id: selectedAccountId || undefined,
        note: formNote.trim() || undefined,
        reminder_enabled: true, // Luôn bật nhắc nhở / gắn vào lịch
        reminder_days_before: formNotifyDaysBefore,
      });

      // 2. Nếu người dùng chọn gắn với Lịch tài chính tự động
      if (syncToCalendar) {
        try {
          const scheduleName = formType === 'BORROWING' 
            ? `Trả nợ: ${formPartnerName.trim()}` 
            : `Thu nợ: ${formPartnerName.trim()}`;

          const isAutoDebit = !!selectedAccountId; // Có chọn tài khoản -> Lịch trừ/cộng tự động
          const notifyMinutes = formNotifyDaysBefore * 24 * 60; // Số phút báo trước

          if (paymentPlanType === 'INSTALLMENT') {
            const countNum = Math.max(1, Number(formInstallmentCount) || 1);
            const payAmount = periodicAmountNum || Math.ceil(principalNum / countNum);
            
            // Xây dựng Recurrence Rule (RFC5545) chuẩn kèm COUNT để giới hạn đúng số kỳ
            let rrule = `FREQ=${formFrequency}`;
            if (formFrequency === 'MONTHLY') {
              rrule += `;BYMONTHDAY=${formDayOfMonth}`;
            } else if (formFrequency === 'WEEKLY') {
              const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
              rrule += `;BYDAY=${weekDays[formDayOfWeek]}`;
            }
            // Giới hạn đúng số kỳ được tạo
            rrule += `;COUNT=${countNum}`;

            // Tự động tính ngày kỳ trả nợ cuối cùng (end_date)
            // Ví dụ: bắt đầu ngày 24/11/2026, 2 kỳ hàng tháng -> kỳ 1: 24/11/2026, kỳ 2: 24/12/2026 -> kết thúc 24/12/2026
            let calculatedEndDate: string | null = null;
            if (countNum > 1 && firstPayDate) {
              const [fYear, fMonth, fDay] = firstPayDate.split('-').map(Number);
              if (formFrequency === 'MONTHLY') {
                const endMonth = fMonth - 1 + (countNum - 1);
                const eDate = new Date(fYear, endMonth, fDay);
                calculatedEndDate = formatLocalDate(eDate);
              } else if (formFrequency === 'WEEKLY') {
                const eDate = new Date(fYear, fMonth - 1, fDay + (countNum - 1) * 7);
                calculatedEndDate = formatLocalDate(eDate);
              } else if (formFrequency === 'QUARTERLY') {
                const endMonth = fMonth - 1 + (countNum - 1) * 3;
                const eDate = new Date(fYear, endMonth, fDay);
                calculatedEndDate = formatLocalDate(eDate);
              }
            }

            // Backend yêu cầu: nếu có end_date thì end_date PHẢI strictly sau start_date (isAfter)
            const finalEndDate = formDueDate && formDueDate > firstPayDate 
              ? formDueDate 
              : (calculatedEndDate && calculatedEndDate > firstPayDate ? calculatedEndDate : null);

            await scheduleApi.createSchedule({
              schedule_type: isAutoDebit ? 'TRANSACTION' : 'REMINDER',
              name: scheduleName,
              recurrence_rule: rrule,
              start_date: firstPayDate,
              end_date: finalEndDate,
              auto_execute: isAutoDebit,
              transaction_template: isAutoDebit ? {
                transaction_type: formType === 'BORROWING' ? 'EXPENSE' : 'INCOME',
                account_id: selectedAccountId,
                amount: payAmount,
                currency_code: 'VND',
                description: `Tự động ${formType === 'BORROWING' ? 'trả nợ' : 'thu nợ'}: ${formPartnerName.trim()}`,
              } : undefined,
              reminder_message: `Kỳ trả nợ ${formPartnerName.trim()}: ${formatCurrency(payAmount)}. Tổng nợ: ${formatCurrency(principalNum)}`,
              notification_enabled: true,
              notification_time_before_minutes: notifyMinutes,
            });
          } else {
            // Trả 1 lần vào ngày hẹn
            const targetPayDate = formDueDate || formStartDate || new Date().toISOString().split('T')[0];
            await scheduleApi.createSchedule({
              schedule_type: isAutoDebit ? 'TRANSACTION' : 'REMINDER',
              name: scheduleName,
              recurrence_rule: 'FREQ=DAILY;COUNT=1',
              start_date: targetPayDate,
              end_date: null, // Không truyền end_date bằng start_date vì backend yêu cầu endDate.isAfter(startDate)
              auto_execute: isAutoDebit,
              transaction_template: isAutoDebit ? {
                transaction_type: formType === 'BORROWING' ? 'EXPENSE' : 'INCOME',
                account_id: selectedAccountId,
                amount: principalNum,
                currency_code: 'VND',
                description: `Thanh toán khoản ${formType === 'BORROWING' ? 'nợ' : 'cho vay'}: ${formPartnerName.trim()}`,
              } : undefined,
              reminder_message: `Hạn thanh toán khoản ${formType === 'BORROWING' ? 'nợ' : 'cho vay'}: ${formatCurrency(principalNum)} cho ${formPartnerName.trim()}`,
              notification_enabled: true,
              notification_time_before_minutes: notifyMinutes,
            });
          }
        } catch (schedErr: any) {
          console.error('Lỗi khi đồng bộ lên Lịch tài chính:', schedErr);
          const schedMsg = schedErr?.response?.data?.message || 'Không thể tạo lịch nhắc nhở';
          onNotify(`Đã lưu khoản nợ nhưng chưa đồng bộ được vào Lịch: ${schedMsg}`);
          setIsCreateModalOpen(false);
          resetCreateForm();
          loadDebts();
          return;
        }
      }

      onNotify('Tạo khoản nợ mới thành công' + (syncToCalendar ? ' và đã đồng bộ lên Lịch tài chính!' : '!'));
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

  // Xóa khoản nợ
  const handleDeleteDebt = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khoản nợ này không?')) return;
    try {
      await debtApi.deleteDebt(id);
      onNotify('Đã xóa khoản nợ thành công');
      setSelectedDebtDetail(null);
      setDebtSchedule(null);
      loadDebts();
    } catch {
      onNotify('Không thể xóa khoản nợ này');
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
          <span className="text-[11px] text-[#718579]">Tổng số tiền cần trả</span>
        </div>

        <div className="debt-stat-card border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Cho vay (Thu hồi)</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-[#07543f]">
              <FinanceIcon name="income" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#07543f]">
            {formatCurrency(summary?.total_lending || 0)}
          </p>
          <span className="text-[11px] text-[#718579]">Tổng số tiền sẽ thu về</span>
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
              className={`rounded-lg px-3 py-1.5 transition ${activeTab === 'ALL' ? 'bg-white text-[#07543f] shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
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
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#14261e] outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang thực hiện (Chưa trả hết)</option>
            <option value="PAID_OFF">Đã hoàn tất (Trả hết)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#07543f] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#0b6c52] transition active:scale-[0.98]"
        >
          <FinanceIcon name="plus" size={14} />
          <span>Thêm khoản nợ mới</span>
        </button>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="grid place-items-center py-20 text-xs font-semibold text-gray-500">
          <FinanceIcon name="refresh" size={24} className="animate-spin text-[#07543f] mb-2" />
          <span>Đang tải dữ liệu công nợ...</span>
        </div>
      ) : debts.length === 0 ? (
        <div className="grid place-items-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#07543f] mb-3">
            <FinanceIcon name="wallet" size={24} />
          </span>
          <h3 className="text-sm font-bold text-[#14261e]">Chưa có khoản nợ nào</h3>
          <p className="mt-1 text-xs text-[#718579] max-w-sm">
            Ghi chép lại các khoản bạn đi vay hoặc cho vay, chia theo từng tháng/tuần và tự động nhắc nhở trả nợ đúng hẹn.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 rounded-xl bg-[#07543f] px-4 py-2 text-xs font-bold text-white shadow-sm"
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
                className="group relative cursor-pointer flex flex-col justify-between rounded-2xl border border-[#e2ece5] bg-white p-5 shadow-xs hover:shadow-md hover:border-[#07543f]/40 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`debt-type-badge-icon ${isBorrowing ? 'borrowing' : 'lending'}`}>
                        <FinanceIcon name={isBorrowing ? 'expense' : 'income'} size={15} />
                      </span>
                      <div className="min-w-0">
                        <span className={`debt-type-label ${isBorrowing ? 'borrowing' : 'lending'}`}>
                          {isBorrowing ? 'Đi vay' : 'Cho vay'}
                        </span>
                        <h4 className="truncate text-sm font-bold text-[#14261e]">{partnerName}</h4>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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
                    Hạn trả: <strong>{formatDate(item.due_date || item.next_payment_date, 'Không có')}</strong>
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
                <h3 className="text-base font-bold text-[#14261e]">Tạo khoản nợ mới</h3>
                <p className="text-xs text-[#718579]">Ghi nhận nợ, chia theo kỳ và hẹn ngày trả</p>
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
                  className={`h-9 rounded-lg text-xs font-bold transition ${
                    formType === 'BORROWING' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Khoản đi vay
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('LENDING')}
                  className={`h-9 rounded-lg text-xs font-bold transition ${
                    formType === 'LENDING' ? 'bg-white text-[#07543f] shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Khoản cho vay
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#14261e]">
                    {formType === 'BORROWING' ? 'Tên người / Đơn vị cho vay *' : 'Tên người vay nợ *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Anh Nam, Vietcombank..."
                    value={formPartnerName}
                    onChange={(e) => setFormPartnerName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#07543f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#14261e]">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={formPartnerPhone}
                    onChange={(e) => setFormPartnerPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#07543f]"
                  />
                </div>
              </div>

              {/* HÌNH THỨC TRẢ NỢ: 1 lần hay Chia theo kỳ (tháng/tuần) */}
              <div className="rounded-2xl border border-emerald-100 bg-[#f8fbf9] p-3.5 space-y-3">
                <label className="block text-xs font-bold text-[#14261e]">Hình thức trả nợ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentPlanType('ONE_TIME');
                    }}
                    className={`h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center ${
                      paymentPlanType === 'ONE_TIME'
                        ? 'border-[#07543f] bg-emerald-50 text-[#07543f]'
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
                    className={`h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center ${
                      paymentPlanType === 'INSTALLMENT'
                        ? 'border-[#07543f] bg-emerald-50 text-[#07543f]'
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
                      <label className="mb-1 block text-xs font-bold text-[#14261e]">Tổng số tiền nợ (VND) *</label>
                      <input
                        type="text"
                        required
                        placeholder="0"
                        value={formPrincipal ? Number(formPrincipal).toLocaleString('vi-VN') : ''}
                        onChange={(e) => setFormPrincipal(e.target.value.replace(/\D/g, ''))}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#07543f] outline-none focus:border-[#07543f]"
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
                          className="h-9 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#14261e] outline-none"
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
                          className="h-9 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#14261e] outline-none focus:border-[#07543f]"
                        />
                      </div>
                    </div>

                    {/* Lựa chọn ngày cụ thể trong tháng hoặc thứ trong tuần để trả nợ */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white border border-emerald-100">
                      {formFrequency === 'WEEKLY' ? (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs font-bold text-[#07543f]">
                            Trả vào thứ mấy hàng tuần?
                          </label>
                          <select
                            value={formDayOfWeek}
                            onChange={(e) => setFormDayOfWeek(parseInt(e.target.value, 10))}
                            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs font-bold text-[#14261e] outline-none"
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
                          <label className="mb-1 block text-xs font-bold text-[#07543f]">
                            Trả vào ngày mấy hàng tháng?
                          </label>
                          <select
                            value={formDayOfMonth}
                            onChange={(e) => setFormDayOfMonth(parseInt(e.target.value, 10))}
                            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs font-bold text-[#14261e] outline-none"
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
                        <label className="mb-1 block text-xs font-bold text-[#14261e]">Số tiền mỗi kỳ (VND) *</label>
                        <input
                          type="text"
                          required
                          value={formPeriodicAmount ? Number(formPeriodicAmount).toLocaleString('vi-VN') : ''}
                          onChange={(e) => handlePeriodicAmountChange(e.target.value)}
                          placeholder="Ví dụ: 833.334"
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-[#07543f] outline-none focus:border-[#07543f]"
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
                          className="h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-bold text-[#07543f] outline-none focus:border-[#07543f]"
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
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-[#07543f]">
                    <FinanceIcon name="calendar" size={15} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#07543f]">Tự động đồng bộ Lịch tài chính</h4>
                    <p className="text-[11px] text-[#718579]">Khoản nợ luôn được theo dõi trên lịch để nhắc nhở và quản lý đúng hạn.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2.5 border-t border-emerald-100">
                  {/* Chọn tài khoản trích nợ tự động */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#14261e]">
                        {formType === 'BORROWING' ? 'Tài khoản trích nợ tự động (Tùy chọn)' : 'Tài khoản nhận tiền tự động (Tùy chọn)'}
                      </label>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {selectedAccountId ? (
                          <span className="text-[#07543f] font-bold">⚡ Tự động trừ tiền</span>
                        ) : (
                          <span>🔔 Chỉ nhắc nhở</span>
                        )}
                      </span>
                    </div>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-[#14261e] outline-none focus:border-[#07543f]"
                    >
                      <option value="">Không gắn tài khoản (Chỉ gửi thông báo nhắc nợ)</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          💳 {acc.name} (Số dư: {formatCurrency(acc.balance)}) - Tự động trích nợ
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#718579] mt-1">
                      {selectedAccountId
                        ? 'Khi đến hạn, hệ thống sẽ tự động trừ số dư ví đã chọn và ghi nhận lịch sử giao dịch.'
                        : 'Nếu không chọn ví, đến ngày hẹn hệ thống chỉ hiển thị chuông thông báo nhắc nhở mà không trừ tiền.'}
                    </p>
                  </div>

                  {/* Chọn số ngày thông báo trước */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#14261e]">
                      Thời gian gửi thông báo nhắc hẹn
                    </label>
                    <select
                      value={formNotifyDaysBefore}
                      onChange={(e) => setFormNotifyDaysBefore(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-[#14261e] outline-none focus:border-[#07543f]"
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
                <label className="mb-1 block text-xs font-bold text-[#14261e]">Ghi chú / Thỏa thuận</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về mục đích vay hoặc điều khoản hẹn trả..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:border-[#07543f]"
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
                  className="h-10 rounded-xl bg-[#07543f] px-5 text-xs font-bold text-white hover:bg-[#0b6c52] disabled:opacity-50"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#718579] dark:text-[#94a3b8]">
                    {selectedDebtDetail.debt_type === 'BORROWING' ? 'Chi tiết khoản đi vay' : 'Chi tiết khoản cho vay'}
                  </span>
                  <h3 className="text-sm font-bold text-[#14261e]">
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
                  <strong className="text-base font-bold text-[#14261e]">{formatCurrency(selectedDebtDetail.principal_amount)}</strong>
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
                  <p className="font-bold text-[#14261e]">
                    {selectedDebtDetail.payment_frequency === 'MONTHLY'
                      ? 'Hàng tháng'
                      : selectedDebtDetail.payment_frequency === 'WEEKLY'
                      ? 'Hàng tuần'
                      : selectedDebtDetail.payment_frequency === 'QUARTERLY'
                      ? 'Hàng quý'
                      : 'Trả một lần'}
                  </p>
                  {selectedDebtDetail.payment_amount ? (
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      {formatCurrency(selectedDebtDetail.payment_amount)} / kỳ
                    </span>
                  ) : null}
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-500">Hạn thanh toán:</span>
                  <p className="font-bold text-[#14261e]">{formatDate(selectedDebtDetail.due_date, 'Không thời hạn')}</p>
                  {selectedDebtDetail.next_payment_date ? (
                    <span className="text-[11px] text-gray-500">
                      Kỳ tới: {formatDate(selectedDebtDetail.next_payment_date)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Lịch trình các kỳ trả nợ dự kiến */}
              {isLoadingSchedule ? (
                <div className="py-4 text-center text-xs text-gray-500">
                  <FinanceIcon name="refresh" size={16} className="animate-spin inline-block mr-1.5 text-[#07543f]" />
                  <span>Đang tải kế hoạch trả nợ...</span>
                </div>
              ) : debtSchedule && debtSchedule.schedule && debtSchedule.schedule.length > 0 ? (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#14261e]">Lịch trình trả nợ theo kỳ ({debtSchedule.schedule.length} kỳ)</h4>
                    <span className="text-[11px] text-[#718579]">
                      Đã trả {debtSchedule.summary.completed_payments} / {debtSchedule.summary.total_payments} kỳ
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {debtSchedule.schedule.map((item) => (
                      <div
                        key={item.payment_number}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                          item.status === 'PAID'
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
                          <span className={`text-[10px] font-bold ${
                            item.status === 'PAID' ? 'text-emerald-700' : item.status === 'OVERDUE' ? 'text-rose-600' : 'text-gray-500'
                          }`}>
                            {item.status === 'PAID' ? 'Đã trả ✓' : item.status === 'OVERDUE' ? 'Quá hạn ⚠' : 'Chưa trả'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Nút hành động Trả nợ & Xóa */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteDebt(selectedDebtDetail.id)}
                  className="h-9 px-3 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50"
                >
                  Xóa khoản nợ
                </button>

                {!(selectedDebtDetail.status === 'PAID_OFF' || selectedDebtDetail.status === 'PAID' || selectedDebtDetail.remaining_amount <= 0) ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Gợi ý số tiền: nếu có số tiền mỗi kỳ thì điền số tiền kỳ đó, hoặc số tiền còn lại
                      const defaultAmt = selectedDebtDetail.payment_amount && selectedDebtDetail.payment_amount <= selectedDebtDetail.remaining_amount
                        ? selectedDebtDetail.payment_amount
                        : selectedDebtDetail.remaining_amount;
                      setPaymentAmount(String(defaultAmt || ''));
                      setIsPaymentModalOpen(true);
                    }}
                    className="h-10 px-6 rounded-xl bg-[#07543f] text-white text-xs font-bold hover:bg-[#0b6c52] shadow-sm transition"
                  >
                    {selectedDebtDetail.debt_type === 'BORROWING' ? 'Trả nợ' : 'Thu nợ'}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    <span>✓ Đã thanh toán 100%</span>
                  </span>
                )}
              </div>

              {/* Lịch sử các lần thanh toán */}
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-[#14261e] mb-2">Lịch sử thanh toán thực tế ({selectedDebtDetail.payment_history?.length || 0})</h4>
                {(!selectedDebtDetail.payment_history || selectedDebtDetail.payment_history.length === 0) ? (
                  <p className="text-xs text-gray-500 italic py-3 text-center">Chưa có lần trả nợ nào được ghi nhận</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedDebtDetail.payment_history.map((pm) => (
                      <div key={pm.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#14261e]">{formatCurrency(pm.amount)}</p>
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
                <h3 className="text-base font-bold text-[#14261e]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ghi nhận Trả nợ' : 'Ghi nhận Thu nợ'}
                </h3>
                <p className="text-[11px] text-[#718579] mt-0.5">
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
              <div>
                <label className="mb-1 block text-xs font-bold text-[#14261e]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Số tiền trả nợ (VND) *' : 'Số tiền thu nợ (VND) *'}
                </label>
                <input
                  type="text"
                  required
                  value={paymentAmount ? Number(paymentAmount).toLocaleString('vi-VN') : ''}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/\D/g, ''))}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#07543f] outline-none focus:border-[#07543f]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#14261e]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ngày trả nợ' : 'Ngày thu tiền'}
                </label>
                <DatePicker
                  required
                  value={paymentDate}
                  onChange={(val) => setPaymentDate(val)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#07543f]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#14261e]">
                  {selectedDebtDetail.debt_type === 'BORROWING' ? 'Ví / Tài khoản nguồn (Trừ tiền)' : 'Ví / Tài khoản nhận tiền (Cộng tiền)'}
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#07543f]"
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
                <label className="mb-1 block text-xs font-bold text-[#14261e]">Ghi chú</label>
                <input
                  type="text"
                  placeholder={selectedDebtDetail.debt_type === 'BORROWING' ? 'Ví dụ: Trả kỳ 1, chuyển khoản Vietcombank...' : 'Ví dụ: Khách trả tiền mặt, nhận chuyển khoản...'}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-[#07543f]"
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
                  className="h-10 rounded-xl bg-[#07543f] px-5 text-xs font-bold text-white hover:bg-[#0b6c52] disabled:opacity-50"
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
    </div>
  );
}
