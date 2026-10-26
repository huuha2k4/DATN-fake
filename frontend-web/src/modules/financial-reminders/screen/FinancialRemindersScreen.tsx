import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import {
  scheduleApi,
  type ScheduleListItem,
  type ScheduleDetail,
  type ScheduleType,
  type TransactionType,
  type CreateSchedulePayload,
  type UpdateSchedulePayload,
} from '../api/scheduleApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import { transactionApi, type CategoryItem } from '../../cash-flow-management/api/transactionApi';
import { formatDate } from '../../core/utils/dateUtils';
import { DatePicker } from '../../core/components/DatePicker';
import './FinancialRemindersScreen.css';

type Props = { onNotify: (message: string) => void };

// Gợi ý cài đặt 1 chạm thiết kế tinh gọn
const PRESETS = [
  { label: 'Tiền lương', icon: 'briefcase', bg: 'bg-[#ecfdf5] text-[#059669]', type: 'TRANSACTION', txType: 'INCOME', desc: 'Nhận lương định kỳ', defaultDay: 5, catKeyword: 'lương' },
  { label: 'Tiền nhà/Trọ', icon: 'home', bg: 'bg-[#fef2f2] text-[#dc2626]', type: 'TRANSACTION', txType: 'EXPENSE', desc: 'Tiền phòng trọ / nhà', defaultDay: 1, catKeyword: 'nhà' },
  { label: 'Điện & Nước', icon: 'bolt', bg: 'bg-[#fffbeb] text-[#d97706]', type: 'TRANSACTION', txType: 'EXPENSE', desc: 'Hóa đơn tiền điện & nước', defaultDay: 15, catKeyword: 'hóa đơn' },
  { label: 'Thẻ tín dụng', icon: 'credit-card', bg: 'bg-[#f5f3ff] text-[#7c3aed]', type: 'TRANSACTION', txType: 'EXPENSE', desc: 'Thanh toán sao kê thẻ tín dụng', defaultDay: 20, catKeyword: 'chi phí khác' },
  { label: 'Netflix / Cloud', icon: 'film', bg: 'bg-[#fff1f2] text-[#e11d48]', type: 'TRANSACTION', txType: 'EXPENSE', desc: 'Gói dịch vụ số định kỳ (Netflix, Spotify, iCloud...)', defaultDay: 10, catKeyword: 'giải trí' },
  { label: 'Nhắc hẹn nợ', icon: 'bell', bg: 'bg-[#fff8e6] text-[#b45309]', type: 'REMINDER', txType: 'EXPENSE', desc: 'Nhắc hẹn trả nợ / thu nợ đến hạn', defaultDay: 25, catKeyword: '' },
];

// Hàm nhận diện icon trực quan phù hợp theo nội dung lịch hoặc danh mục
function getScheduleIconName(item: ScheduleListItem): IconName {
  if (item.schedule_type === 'REMINDER') return 'bell';
  const nameLower = (item.name || '').toLowerCase();
  const catLower = (item.transaction_template?.category || '').toLowerCase();

  // 1. Tiền nhà / Trọ / Thuê phòng / Điện nước
  if (
    nameLower.includes('nhà') ||
    nameLower.includes('trọ') ||
    nameLower.includes('thuê') ||
    catLower.includes('nhà') ||
    catLower.includes('trọ') ||
    catLower.includes('thuê')
  ) {
    return 'home';
  }

  // 2. Ăn uống / Cafe / Trà sữa / Đi chợ / Siêu thị ẩm thực
  if (
    nameLower.includes('ăn') ||
    nameLower.includes('uống') ||
    nameLower.includes('cafe') ||
    nameLower.includes('cà phê') ||
    nameLower.includes('cơm') ||
    nameLower.includes('food') ||
    catLower.includes('ăn') ||
    catLower.includes('uống') ||
    catLower.includes('cafe') ||
    catLower.includes('ẩm thực')
  ) {
    return 'coffee';
  }

  // 3. Tiền lương / Thưởng / Thu nhập công việc
  if (nameLower.includes('lương') || catLower.includes('lương') || nameLower.includes('thưởng')) return 'briefcase';

  // 4. Điện & Nước / Hóa đơn tiện ích
  if (
    nameLower.includes('điện') ||
    nameLower.includes('nước') ||
    catLower.includes('điện') ||
    catLower.includes('nước') ||
    catLower.includes('hóa đơn')
  ) {
    return 'bolt';
  }

  // 5. Thẻ tín dụng / Vay / Trả góp
  if (
    nameLower.includes('thẻ') ||
    nameLower.includes('tín dụng') ||
    catLower.includes('tín dụng') ||
    nameLower.includes('trả góp') ||
    nameLower.includes('vay')
  ) {
    return 'credit-card';
  }

  // 6. Gói giải trí / Xem phim / Netflix / Spotify / Dịch vụ số
  if (
    nameLower.includes('netflix') ||
    nameLower.includes('cloud') ||
    nameLower.includes('spotify') ||
    nameLower.includes('youtube') ||
    catLower.includes('giải trí')
  ) {
    return 'film';
  }

  // 7. Đi lại / Xăng xe / Gửi xe / Grab
  if (
    nameLower.includes('xăng') ||
    nameLower.includes('xe') ||
    nameLower.includes('grab') ||
    catLower.includes('đi lại') ||
    catLower.includes('di chuyển')
  ) {
    return 'car';
  }

  // 8. Mua sắm / Shopee / Quần áo
  if (
    nameLower.includes('mua sắm') ||
    nameLower.includes('shopee') ||
    nameLower.includes('lazada') ||
    catLower.includes('mua sắm')
  ) {
    return 'shopping-bag';
  }

  return item.transaction_template?.type === 'INCOME' ? 'income' : 'expense';
}

export function FinancialRemindersScreen({ onNotify }: Props) {
  // Dữ liệu từ Backend
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Chế độ xem: 'CALENDAR' (Bàn lịch tháng) | 'TIMELINE' (Dòng thời gian)
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TIMELINE'>('CALENDAR');

  // Tháng và Ngày đang chọn trên lịch
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal Tạo / Chỉnh sửa Lịch
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields Tạo Lịch
  const [scheduleType, setScheduleType] = useState<ScheduleType>('TRANSACTION');
  const [name, setName] = useState('');
  const [freq, setFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notifyBeforeHours, setNotifyBeforeHours] = useState('24');

  // Giao dịch mẫu
  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');

  // Nhắc nhở
  const [reminderMessage, setReminderMessage] = useState('');

  // Chi tiết Lịch
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDetail | null>(null);

  // 1. Tải danh sách lịch từ Backend
  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getSchedules({ size: 100 });
      if (res && Array.isArray(res.content)) {
        setSchedules(res.content);
      } else if (Array.isArray(res)) {
        setSchedules(res);
      } else {
        setSchedules([]);
      }
    } catch (err: any) {
      console.error('Lỗi tải lịch:', err);
      onNotify(err?.response?.data?.message || 'Không thể tải danh sách lịch');
    } finally {
      setLoading(false);
    }
  };

  // 2. Tải metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [accList, catRes] = await Promise.all([
          accountApi.getAccounts({ include_inactive: false }),
          transactionApi.getCategories().catch(() => ({ categories: [] })),
        ]);
        setAccounts(accList);
        if (accList.length > 0) setSelectedAccountId(accList[0].id);

        const cats = Array.isArray(catRes) ? catRes : (catRes as any)?.categories || [];
        setCategories(cats);
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);
      } catch (e) {
        console.error('Lỗi tải metadata:', e);
      }
    };
    loadMetadata();
    loadSchedules();
  }, []);

  // Điều khiển tháng
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 3. Tính toán ô ngày trong tháng (Lưới Lịch 7 cột)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: ScheduleListItem[];
    }> = [];

    const padZero = (n: number) => String(n).padStart(2, '0');
    const toLocalDateStr = (y: number, m: number, d: number) => `${y}-${padZero(m + 1)}-${padZero(d)}`;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 1; i--) {
      const d = prevMonthLastDay - i + 1;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      days.push({
        dateStr: toLocalDateStr(prevY, prevM, d),
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    const now = new Date();
    const todayStr = toLocalDateStr(now.getFullYear(), now.getMonth(), now.getDate());

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = toLocalDateStr(year, month, d);

      const dayItems = schedules.filter((s) => {
        if (!s.next_occurrence) return false;
        const occDateOnly = s.next_occurrence.split('T')[0];

        // Nếu khớp đúng ngày chính xác của next_occurrence
        if (occDateOnly === dateStr) return true;

        // Nếu là lịch định kỳ Hàng tháng
        if (s.recurrence_text && (s.recurrence_text.includes('Hàng tháng') || s.recurrence_text.includes('tháng'))) {
          // 1. Kiểm tra ngày trong tháng có khớp không
          const parts = occDateOnly.split('-');
          if (parts.length === 3) {
            const occDay = parseInt(parts[2], 10);
            if (occDay !== d) return false;
          } else {
            return false;
          }

          // 2. Kiểm tra giới hạn start_date (không hiện trước ngày bắt đầu)
          const sStart = s.start_date ? s.start_date.split('T')[0] : occDateOnly;
          if (dateStr < sStart) return false;

          // 3. Kiểm tra giới hạn end_date (nếu có thì không hiện sau ngày kết thúc)
          if (s.end_date) {
            const sEnd = s.end_date.split('T')[0];
            if (dateStr > sEnd) return false;
          }

          // 4. Nếu trong recurrence_rule có COUNT=N (ví dụ COUNT=2)
          if (s.recurrence_rule && s.recurrence_rule.includes('COUNT=')) {
            const countMatch = s.recurrence_rule.match(/COUNT=(\d+)/);
            if (countMatch) {
              const maxCount = parseInt(countMatch[1], 10);
              // Tính số tháng chênh lệch giữa ngày này và start_date
              const [sy, sm] = sStart.split('-').map(Number);
              const monthsDiff = (year - sy) * 12 + (month + 1 - sm);
              if (monthsDiff < 0 || monthsDiff >= maxCount) {
                return false;
              }
            }
          }

          return true;
        }

        return false;
      });

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        items: dayItems,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining && days.length < 42; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      days.push({
        dateStr: toLocalDateStr(nextY, nextM, d),
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        items: [],
      });
    }

    return days;
  }, [currentDate, schedules]);

  // 4. Thống kê dòng tiền theo tháng
  const monthlyCashflow = useMemo(() => {
    let incomeMonth = 0;
    let expenseMonth = 0;
    let activeCount = 0;

    schedules.forEach((s) => {
      if (s.status === 'ACTIVE') {
        activeCount++;
        const amt = Number(s.transaction_template?.amount) || 0;
        const type = s.transaction_template?.type || 'EXPENSE';
        if (type === 'INCOME') incomeMonth += amt;
        if (type === 'EXPENSE') expenseMonth += amt;
      }
    });

    const netCashflow = incomeMonth - expenseMonth;
    return { incomeMonth, expenseMonth, netCashflow, activeCount };
  }, [schedules]);

  // Danh sách sự kiện của ngày đang chọn
  const selectedDateEvents = useMemo(() => {
    const curDay = calendarDays.find((d) => d.dateStr === selectedCalendarDate);
    return curDay ? curDay.items : [];
  }, [calendarDays, selectedCalendarDate]);

  // Chọn nút nhanh (Quick Preset)
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setScheduleType(preset.type as ScheduleType);
    setName(preset.label);
    setDescription(preset.desc);
    setFreq('MONTHLY');
    setDayOfMonth(preset.defaultDay);
    setAmount(''); // Để trống cho người dùng tự nhập số tiền

    if (preset.type === 'TRANSACTION') {
      const currentTxType = preset.txType as TransactionType;
      setTxType(currentTxType);

      // Tự động tìm và chọn danh mục phù hợp theo từ khóa
      if (preset.catKeyword && categories.length > 0) {
        const matchedCat = categories.find(
          (c) =>
            c.name.toLowerCase().includes(preset.catKeyword.toLowerCase()) ||
            (c.code && c.code.toLowerCase().includes(preset.catKeyword.toLowerCase()))
        );
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
        } else {
          // Nếu không tìm thấy theo keyword, chọn danh mục đầu tiên có cùng kind
          const sameKind = categories.find((c) => c.kind === currentTxType);
          if (sameKind) setSelectedCategoryId(sameKind.id);
        }
      }
    } else {
      setReminderMessage(preset.desc);
    }
    setDialogOpen(true);
  };

  // Mở modal chỉnh sửa lịch từ chi tiết
  const handleOpenEditSchedule = (detail: ScheduleDetail) => {
    setEditingScheduleId(detail.id);
    setScheduleType(detail.schedule_type);
    setName(detail.name || '');
    setStartDate(detail.start_date ? detail.start_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    
    // Parse recurrence_rule (FREQ=...;BYMONTHDAY=...)
    const rrule = detail.recurrence_rule || '';
    if (rrule.includes('FREQ=WEEKLY')) setFreq('WEEKLY');
    else if (rrule.includes('FREQ=DAILY')) setFreq('DAILY');
    else if (rrule.includes('FREQ=YEARLY')) setFreq('YEARLY');
    else setFreq('MONTHLY');

    const matchDay = rrule.match(/BYMONTHDAY=(\d+)/);
    if (matchDay) {
      setDayOfMonth(Number(matchDay[1]));
    } else {
      setDayOfMonth(new Date().getDate());
    }

    setNotificationEnabled(detail.notification_enabled ?? true);
    const hours = detail.notification_time_before_minutes ? String(Math.round(detail.notification_time_before_minutes / 60)) : '24';
    setNotifyBeforeHours(hours);

    if (detail.schedule_type === 'TRANSACTION' && detail.transaction_template) {
      const tmpl = detail.transaction_template;
      setTxType(tmpl.transaction_type || 'EXPENSE');
      setAmount(tmpl.amount ? String(Number(tmpl.amount)) : '');
      setSelectedAccountId(tmpl.account_id ? String(tmpl.account_id) : '');
      setToAccountId(tmpl.to_account_id ? String(tmpl.to_account_id) : '');
      setSelectedCategoryId(tmpl.category_id ? String(tmpl.category_id) : '');
      setDescription(tmpl.description || '');
      setReminderMessage(detail.reminder_message || `Nhắc hẹn thực hiện ${detail.name}`);
    } else {
      setReminderMessage(detail.reminder_message || '');
      setAmount('');
      setDescription('');
    }

    setSelectedSchedule(null); // Đóng modal chi tiết
    setDialogOpen(true); // Mở modal form edit
  };

  // 5. Lưu lịch (Tạo mới hoặc Cập nhật)
  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify('Vui lòng nhập tên lịch');
      return;
    }

    try {
      setIsSubmitting(true);
      let rrule = `FREQ=${freq}`;
      if (freq === 'MONTHLY') {
        rrule += `;BYMONTHDAY=${dayOfMonth}`;
      }

      const payload: CreateSchedulePayload = {
        schedule_type: scheduleType,
        name: name.trim(),
        recurrence_rule: rrule,
        start_date: startDate,
        end_date: null,
        auto_execute: scheduleType === 'TRANSACTION',
        notification_enabled: notificationEnabled,
        notification_time_before_minutes: notificationEnabled ? Number(notifyBeforeHours) * 60 : 0,
        notification_channels: ['PUSH'],
      };

      if (scheduleType === 'TRANSACTION') {
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
          onNotify('Vui lòng nhập số tiền hợp lệ');
          setIsSubmitting(false);
          return;
        }

        const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
        payload.transaction_template = {
          transaction_type: txType,
          account_id: selectedAccountId,
          to_account_id: txType === 'TRANSFER' && toAccountId ? toAccountId : null,
          amount: numAmount,
          currency_code: selectedAcc?.currencyCode || 'VND',
          category_id: selectedCategoryId || null,
          description: description.trim() || name.trim(),
        };
      } else {
        if (!reminderMessage.trim()) {
          onNotify('Vui lòng nhập nội dung nhắc nhở');
          setIsSubmitting(false);
          return;
        }
        payload.reminder_message = reminderMessage.trim();
      }

      if (editingScheduleId) {
        await scheduleApi.updateSchedule(editingScheduleId, payload as UpdateSchedulePayload);
        onNotify(`Đã cập nhật lịch thành công: "${name}"`);
      } else {
        await scheduleApi.createSchedule(payload);
        onNotify(`Đã thêm thành công: "${name}"`);
      }

      setDialogOpen(false);
      setEditingScheduleId(null);
      setName('');
      setAmount('');
      setDescription('');
      setReminderMessage('');
      loadSchedules();
    } catch (err: any) {
      onNotify('Thao tác thất bại: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xem chi tiết
  const handleViewDetail = async (id: number) => {
    try {
      const detail = await scheduleApi.getScheduleById(id);
      setSelectedSchedule(detail);
    } catch (err: any) {
      onNotify('Lỗi xem chi tiết: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Tạm dừng / Tiếp tục
  const handleToggleStatus = async (item: ScheduleListItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (item.status === 'ACTIVE') {
        await scheduleApi.pauseSchedule(item.id, 'Tạm dừng từ lịch');
        onNotify(`Đã tạm dừng: ${item.name}`);
      } else {
        await scheduleApi.resumeSchedule(item.id);
        onNotify(`Đã kích hoạt lại: ${item.name}`);
      }
      loadSchedules();
      if (selectedSchedule?.id === item.id) {
        handleViewDetail(item.id);
      }
    } catch (err: any) {
      onNotify('Thao tác thất bại: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Xóa lịch
  const handleDeleteSchedule = async (id: number, scheduleName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lịch "${scheduleName}"?`)) return;
    try {
      await scheduleApi.deleteSchedule(id);
      onNotify(`Đã xóa thành công "${scheduleName}"`);
      setSelectedSchedule(null);
      loadSchedules();
    } catch (err: any) {
      onNotify('Lỗi khi xóa: ' + (err?.response?.data?.message || err.message));
    }
  };

  const monthTitle = `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;

  return (
    <main
      className="financial-schedule-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-3 pb-24 pt-4 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-6"
      aria-label="Lịch tài chính"
    >
      {/* 4 Cards Thống Kê Tổng Quan Đồng Bộ Chuẩn Thiết Kế */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng lịch */}
        <article className="schedule-stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Lịch Đang Theo Dõi</p>
              <p className="mt-1 text-2xl font-bold text-[#14251f]">
                {monthlyCashflow.activeCount} <span className="text-sm font-normal text-[#718078]">lịch</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#eaf0fb] text-[#2563eb]">
              <FinanceIcon name="calendar" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Tổng số: <strong className="text-[#14251f]">{schedules.length}</strong> chu kỳ thiết lập
          </p>
        </article>

        {/* Card 2: Thu nhập (Lương) */}
        <article className="schedule-stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Thu Nhập Dự Kiến / Tháng</p>
              <p className="mt-1 text-2xl font-bold text-[#059669]">
                +{monthlyCashflow.incomeMonth.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669]">
              <FinanceIcon name="income" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#059669]">Tiền lương &amp; thu nhập cố định</p>
        </article>

        {/* Card 3: Chi phí định kỳ */}
        <article className="schedule-stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Cố Định Phải Chi / Tháng</p>
              <p className="mt-1 text-2xl font-bold text-[#dc2626]">
                -{monthlyCashflow.expenseMonth.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#fef2f2] text-[#dc2626]">
              <FinanceIcon name="expense" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#dc2626]">Tiền nhà, hóa đơn, trả góp</p>
        </article>

        {/* Card 4: Dòng tiền tự do còn lại (Gradient Card) */}
        <article className="schedule-hero-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#a7f3d0]">Dòng Tiền Tự Do Dự Kiến</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {monthlyCashflow.netCashflow >= 0 ? '+' : ''}
                {monthlyCashflow.netCashflow.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#a7f3d0]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-white">
              <FinanceIcon name="spark" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#d1fae5]">Số dư an toàn sau khi thanh toán hết các lịch</p>
        </article>
      </section>
      {/* Khối Điều Khiển & Tạo Nhanh Tinh Tế */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#e6ece8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#14251f]">
              {viewMode === 'CALENDAR' ? 'Lịch Theo Tháng' : 'Danh Sách Lịch Định Kỳ'}
            </h2>
            <p className="text-xs text-[#718078]">
              {viewMode === 'CALENDAR'
                ? 'Theo dõi ngày đến hạn và dòng tiền định kỳ trong tháng'
                : 'Quản lý toàn bộ các giao dịch định kỳ và nhắc nhở đang thiết lập'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Chuyển chế độ xem */}
            <div className="inline-flex h-[38px] items-center rounded-xl bg-[#f0f5f2] p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('CALENDAR')}
                className={`h-full rounded-lg px-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'CALENDAR'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <FinanceIcon name="grid" size={14} />
                Lịch tháng
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TIMELINE')}
                className={`h-full rounded-lg px-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'TIMELINE'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <FinanceIcon name="calendar" size={14} />
                Danh sách định kỳ
              </button>
            </div>

            {/* Nút Thêm lịch mới */}
            <button
              type="button"
              onClick={() => {
                setName('');
                setAmount('');
                setDescription('');
                setReminderMessage('');
                setDialogOpen(true);
              }}
              className="inline-flex h-[30px] items-center justify-center rounded-lg bg-[#07543f] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#064232] transition gap-1.5"
            >
              <FinanceIcon name="plus" size={14} />
              Thêm lịch mới
            </button>
          </div>
        </div>

        {/* Hàng Gợi ý Tạo Nhanh được lồng gọn gàng vào cùng khối */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#f1f5f2] pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#718078] mr-1">Tạo nhanh:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="quick-preset-chip"
            >
              <span className={`quick-preset-icon ${p.bg}`}>
                <FinanceIcon name={p.icon as any} size={14} />
              </span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* VIEW CHÍNH: LỊCH THÁNG (CALENDAR) HOẶC TIMELINE */}
      {viewMode === 'CALENDAR' ? (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2.15fr)_minmax(330px,0.85fr)]">
            {/* Cột Trái: Bàn Lịch Tháng */}
            <div className="rounded-2xl border border-[#e6ece8] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-4">
                <h3 className="text-base font-bold text-[#14251f]">{monthTitle}</h3>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Tháng trước"
                    className="grid size-8 place-items-center rounded-lg border border-[#e2e8e4] text-[#34463b] hover:bg-[#f1f5f2]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title="Tháng sau"
                    className="grid size-8 place-items-center rounded-lg border border-[#e2e8e4] text-[#34463b] hover:bg-[#f1f5f2]"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Thứ trong tuần */}
              <div className="grid grid-cols-7 gap-1 border-b border-[#f1f5f2] pb-2 text-center text-xs font-bold text-[#6b7c72]">
                <span>Thứ 2</span>
                <span>Thứ 3</span>
                <span>Thứ 4</span>
                <span>Thứ 5</span>
                <span>Thứ 6</span>
                <span className="text-[#07543f]">Thứ 7</span>
                <span className="text-[#dc2626]">Chủ nhật</span>
              </div>

              {/* Ô ngày */}
              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  const isSelected = selectedCalendarDate === cell.dateStr;
                  return (
                    <div
                      key={`${cell.dateStr}-${idx}`}
                      onClick={() => {
                        if (cell.isCurrentMonth) {
                          setSelectedCalendarDate(cell.dateStr);
                        }
                      }}
                      className={`calendar-cell flex min-h-[92px] flex-col justify-between rounded-xl border p-1.5 cursor-pointer ${
                        cell.isCurrentMonth
                          ? 'border-[#e8eeea] bg-white text-[#1a2e26]'
                          : 'border-transparent bg-[#fafbfb] text-[#c2cbc5] cursor-default'
                      } ${cell.isToday ? 'today' : ''} ${cell.isCurrentMonth && isSelected ? 'selected' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs font-bold ${
                              cell.isToday
                                ? 'grid size-5 place-items-center rounded-full bg-[#07543f] text-white'
                                : ''
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {cell.isToday && (
                            <span className="text-[10px] font-bold text-[#07543f] leading-none">
                              Hôm nay
                            </span>
                          )}
                        </div>

                        {cell.items.length > 0 && (
                          <span className="rounded-full bg-[#e3f4e9] px-1.5 py-0.2 text-[9px] font-bold text-[#07543f]">
                            {cell.items.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                        {cell.items.slice(0, 2).map((item) => {
                          const isIncome = item.transaction_template?.type === 'INCOME';
                          const isReminder = item.schedule_type === 'REMINDER';

                          return (
                            <div
                              key={item.id}
                              className={`event-pill truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                                isReminder
                                  ? 'event-pill-reminder'
                                  : isIncome
                                  ? 'event-pill-income'
                                  : 'event-pill-expense'
                              }`}
                            >
                              {isIncome ? '+' : isReminder ? '🔔' : '-'} {item.name}
                            </div>
                          );
                        })}
                        {cell.items.length > 2 && (
                          <span className="text-[8px] font-bold text-[#718078]">
                            +{cell.items.length - 2} khoản
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cột Phải: Chi tiết ngày đang chọn */}
            <aside className="flex flex-col gap-4">
              <div className="rounded-2xl border border-[#d7e9dd] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#f1f5f2] pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#07543f]">
                      Sự kiện tài chính
                    </span>
                    <h3 className="text-base font-bold text-[#14251f]">
                      {new Date(selectedCalendarDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>
                </div>

                {selectedDateEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="grid size-12 mx-auto place-items-center rounded-full bg-[#f3f7f4] text-[#718078]">
                      <FinanceIcon name="calendar" size={20} />
                    </span>
                    <p className="mt-2 text-xs font-semibold text-[#59675f]">Không có khoản đến hạn ngày này</p>
                    <p className="text-[11px] text-[#829087]">Ngày thảnh thơi không có hóa đơn hay nhắc nhở.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(selectedCalendarDate);
                        setDayOfMonth(new Date(selectedCalendarDate).getDate());
                        setDialogOpen(true);
                      }}
                      className="mt-4 inline-flex h-[30px] items-center justify-center rounded-lg bg-[#07543f] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#064232] transition gap-1.5"
                    >
                      <FinanceIcon name="plus" size={14} />
                      Thêm lịch cho ngày này
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-[#f1f5f2]">
                    {selectedDateEvents.map((item) => {
                      const isIncome = item.transaction_template?.type === 'INCOME';
                      const isReminder = item.schedule_type === 'REMINDER';

                      return (
                        <div key={item.id} className="py-3 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs ${
                                isReminder
                                  ? 'bg-[#fff8e6] text-[#b45309]'
                                  : isIncome
                                  ? 'bg-[#ecfdf5] text-[#059669]'
                                  : 'bg-[#fef2f2] text-[#dc2626]'
                              }`}
                            >
                              <FinanceIcon name={getScheduleIconName(item)} size={15} />
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-[#14251f]">{item.name}</h4>
                              <p className="text-[10px] text-[#718078]">{item.recurrence_text || 'Định kỳ'}</p>
                              {item.transaction_template?.amount && (
                                <p
                                  className={`text-xs font-bold mt-0.5 ${
                                    isIncome ? 'text-[#059669]' : 'text-[#dc2626]'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'}
                                  {Number(item.transaction_template.amount).toLocaleString('vi-VN')} đ
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleViewDetail(item.id)}
                            className="rounded px-2 py-1 text-[10px] font-semibold text-[#07543f] hover:bg-[#eef7f0]"
                          >
                            Chi tiết
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>



              {/* Mẹo Quản lý dòng tiền */}
              <div className="rounded-2xl border border-[#e2e8e4] bg-[#f8faf9] p-4 text-xs text-[#59675f]">
                <div className="flex items-center gap-1.5 font-bold text-[#07543f]">
                  <FinanceIcon name="spark" size={15} />
                  Lưu ý ngày thanh toán
                </div>
                <p className="mt-1.5 leading-relaxed text-[11px]">
                  Nên cài đặt ngày thanh toán hóa đơn sau ngày nhận lương 1-2 ngày để đảm bảo ví luôn có đủ số dư trích nợ tự động.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          /* VIEW DÒNG THỜI GIAN (TIMELINE) */
          <div className="rounded-2xl border border-[#e6ece8] bg-white p-5 shadow-sm">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-[#07543f] border-t-transparent" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#718078]">
                Chưa có lịch nào. Hãy bấm "Thêm lịch mới" để bắt đầu!
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((item) => {
                  const isIncome = item.transaction_template?.type === 'INCOME';
                  const isReminder = item.schedule_type === 'REMINDER';
                  const isPaused = item.status === 'PAUSED';
                  const amountNum = Number(item.transaction_template?.amount) || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleViewDetail(item.id)}
                      className={`schedule-row-card group flex w-full cursor-pointer flex-col justify-between gap-3 sm:flex-row sm:items-center ${
                        isPaused ? 'opacity-70 bg-[#fafafa]' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-xl text-base ${
                            isReminder
                              ? 'bg-[#fff8e6] text-[#b45309]'
                              : isIncome
                              ? 'bg-[#ecfdf5] text-[#059669]'
                              : 'bg-[#fef2f2] text-[#dc2626]'
                          }`}
                        >
                          <FinanceIcon name={getScheduleIconName(item)} size={20} />
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#14251f] group-hover:text-[#07543f]">
                              {item.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isPaused
                                  ? 'bg-[#fee2e2] text-[#991b1b]'
                                  : 'bg-[#e3f4e9] text-[#006c49]'
                              }`}
                            >
                              {isPaused ? 'Tạm dừng' : 'Đang hoạt động'}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#718078]">
                            <span className="font-medium text-[#14251f]">{item.recurrence_text || 'Định kỳ'}</span>
                            {item.next_occurrence && (
                              <>
                                <span>·</span>
                                <span>
                                  Kế tiếp:{' '}
                                  <strong className="text-[#07543f]">
                                    {formatDate(item.next_occurrence)}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        {amountNum > 0 && (
                          <div className="text-right">
                            <span className="block text-[10px] text-[#718078]">Định mức</span>
                            <strong
                              className={`text-base font-bold ${
                                isIncome ? 'text-[#059669]' : 'text-[#dc2626]'
                              }`}
                            >
                              {isIncome ? '+' : '-'}{amountNum.toLocaleString('vi-VN')} đ
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* MODAL CHI TIẾT LỊCH KHI BẤM VÀO ITEM */}
      {selectedSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop-blur p-4"
          onClick={() => setSelectedSchedule(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="border-b border-[#f1f5f2] pb-3">
              <span className="text-[10px] font-bold uppercase text-[#07543f]">Hồ sơ lịch tài chính</span>
              <h3 className="text-base font-bold text-[#14251f]">{selectedSchedule.name}</h3>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#718078]">Loại lịch:</span>
                <span className="font-bold text-[#14251f]">
                  {selectedSchedule.schedule_type === 'TRANSACTION' ? 'Giao dịch định kỳ' : 'Nhắc nhở'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718078]">Chu kỳ lặp:</span>
                <span className="font-semibold text-[#07543f]">{selectedSchedule.recurrence_text}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718078]">Kỳ tới:</span>
                <strong className="text-[#07543f]">
                  {formatDate(selectedSchedule.next_occurrence, 'Không xác định')}
                </strong>
              </div>

              {selectedSchedule.transaction_template && (
                <div className="rounded-xl bg-[#f8faf9] p-3.5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Số tiền:</span>
                    <strong className="text-sm font-bold text-[#07543f]">
                      {Number(selectedSchedule.transaction_template.amount).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  {selectedSchedule.transaction_template.account_name && (
                    <div className="flex justify-between">
                      <span className="text-[#718078]">Tài khoản:</span>
                      <span className="font-medium">{selectedSchedule.transaction_template.account_name}</span>
                    </div>
                  )}
                  {selectedSchedule.transaction_template.category_name && (
                    <div className="flex justify-between">
                      <span className="text-[#718078]">Danh mục:</span>
                      <span className="font-medium">{selectedSchedule.transaction_template.category_name}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedSchedule.reminder_message && (
                <div className="rounded-xl bg-[#fffbeb] p-3 text-[#92400e]">
                  <p className="font-bold">Nội dung nhắc hẹn:</p>
                  <p className="mt-1 text-xs">{selectedSchedule.reminder_message}</p>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-[#718078]">Tự động ghi nhận thu chi:</span>
                <span className="font-semibold">
                  {selectedSchedule.auto_execute ? 'Bật (Tự động thực thi)' : 'Tắt (Chờ xác nhận)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718078]">Số lần đã thực thi:</span>
                <span className="font-semibold">{selectedSchedule.executed_count || 0} lần</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2 border-t border-[#f1f5f2] pt-4">
              <button
                type="button"
                onClick={() => handleOpenEditSchedule(selectedSchedule)}
                className="rounded-xl border border-[#07543f] bg-[#07543f] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#064735] transition shadow-sm flex items-center gap-1.5"
              >
                <span>✏️ Chỉnh sửa</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedSchedule as any)}
                className={`btn-detail-toggle flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                  selectedSchedule.status === 'ACTIVE'
                    ? 'border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d] hover:bg-[#dcfce7]'
                    : 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]'
                }`}
              >
                {selectedSchedule.status === 'ACTIVE' ? 'Tạm dừng lịch' : 'Tiếp tục lịch'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSchedule(selectedSchedule.id, selectedSchedule.name)}
                className="btn-detail-delete rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 text-xs font-semibold text-[#dc2626] hover:bg-[#fee2e2] transition"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="btn-detail-close rounded-xl border border-[#e2e8e4] bg-[#f8faf9] px-4 py-2.5 text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM LỊCH TÀI CHÍNH */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop-blur p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="custom-scrollbar max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#f1f5f2] pb-2.5">
              <div>
                <h2 className="text-base font-bold text-[#14251f]">
                  {editingScheduleId ? 'Chỉnh sửa lịch tài chính' : 'Thêm lịch tài chính mới'}
                </h2>
                <p className="text-[11px] text-[#718078]">
                  {editingScheduleId
                    ? 'Cập nhật lại tần suất, số tiền hoặc nội dung thông báo'
                    : 'Lên kế hoạch giao dịch định kỳ hoặc chuông báo nhắc nợ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingScheduleId(null);
                }}
                className="text-xl text-[#829087] hover:text-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-3.5 space-y-3">
              {/* Chọn loại lịch */}
              <div>
                <label className="text-xs font-semibold text-[#34463b]">Loại lịch</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleType('TRANSACTION')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold ${
                      scheduleType === 'TRANSACTION'
                        ? 'border-[#07543f] bg-[#e6f7ef] text-[#07543f]'
                        : 'border-[#e2e8e4] text-[#6b7c72] hover:bg-[#f8faf9]'
                    }`}
                  >
                    <FinanceIcon name="arrows" size={15} />
                    Giao dịch định kỳ
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleType('REMINDER')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold ${
                      scheduleType === 'REMINDER'
                        ? 'border-[#b45309] bg-[#fff8e6] text-[#b45309]'
                        : 'border-[#e2e8e4] text-[#6b7c72] hover:bg-[#f8faf9]'
                    }`}
                  >
                    <FinanceIcon name="bell" size={15} />
                    Chỉ nhắc nhở
                  </button>
                </div>
              </div>

              {/* Tên lịch */}
              <div>
                <label className="text-xs font-semibold text-[#34463b]">Tên khoản / Nhắc hẹn *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Tiền lương, Tiền nhà tháng 10, Đóng bảo hiểm..."
                  className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-[#f9fbf9] px-3 text-xs outline-none focus:border-[#07543f] focus:bg-white"
                />
              </div>

              {/* Chu kỳ & Ngày lặp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#34463b]">Tần suất lặp lại</label>
                  <select
                    value={freq}
                    onChange={(e) => setFreq(e.target.value as any)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-[#f9fbf9] px-3 text-xs outline-none focus:border-[#07543f]"
                  >
                    <option value="MONTHLY">Hàng tháng</option>
                    <option value="WEEKLY">Hàng tuần</option>
                    <option value="DAILY">Hàng ngày</option>
                    <option value="YEARLY">Hàng năm</option>
                  </select>
                </div>

                {freq === 'MONTHLY' ? (
                  <div>
                    <label className="text-xs font-semibold text-[#34463b]">Vào ngày trong tháng</label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-[#f9fbf9] px-3 text-xs outline-none focus:border-[#07543f]"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Ngày {d} hàng tháng
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-[#34463b]">Bắt đầu từ ngày *</label>
                    <DatePicker
                      required
                      value={startDate}
                      onChange={(val) => setStartDate(val)}
                      className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-[#f9fbf9] px-3 text-xs outline-none focus:border-[#07543f]"
                    />
                  </div>
                )}
              </div>

              {/* CHI TIẾT GIAO DỊCH (Nếu là TRANSACTION) */}
              {scheduleType === 'TRANSACTION' ? (
                <div className="rounded-xl border border-[#e2e8e4] bg-[#fafcfa] p-3.5 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'EXPENSE' as TransactionType, label: 'Chi tiêu' },
                      { key: 'INCOME' as TransactionType, label: 'Thu nhập' },
                      { key: 'TRANSFER' as TransactionType, label: 'Chuyển tiền' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setTxType(t.key);
                          const validCat = categories.find((c) => c.kind === t.key);
                          if (validCat) setSelectedCategoryId(validCat.id);
                        }}
                        className={`rounded-xl py-2 text-center text-xs font-semibold transition ${
                          txType === t.key
                            ? 'bg-[#07543f] text-white shadow-xs'
                            : 'bg-white text-[#52665a] border border-[#e2e8e4] hover:bg-[#f1f5f2]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Số tiền */}
                  <div>
                    <label className="text-xs font-semibold text-[#34463b]">Số tiền (VNĐ) *</label>
                    <input
                      required
                      type="text"
                      value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-white px-3 text-sm font-bold text-[#07543f] outline-none focus:border-[#07543f]"
                    />
                  </div>

                  {/* Tài khoản & Danh mục */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#34463b]">Ví / Tài khoản</label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-white px-2 text-xs outline-none"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {txType === 'TRANSFER' ? (
                      <div>
                        <label className="text-xs font-semibold text-[#34463b]">Đến Ví / TK</label>
                        <select
                          value={toAccountId}
                          onChange={(e) => setToAccountId(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-white px-2 text-xs outline-none"
                        >
                          <option value="">-- Chọn ví đích --</option>
                          {accounts
                            .filter((a) => a.id !== selectedAccountId)
                            .map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold text-[#34463b]">Danh mục</label>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-[#e2e8e4] bg-white px-2 text-xs outline-none"
                        >
                          {categories
                            .filter((cat) => !cat.kind || cat.kind === txType)
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* NỘI DUNG NHẮC HẸN */
                <div>
                  <label className="text-xs font-semibold text-[#34463b]">Nội dung chuông nhắc *</label>
                  <textarea
                    required
                    rows={3}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="Ví dụ: Nhớ thanh toán nợ trước hạn để tránh bị phạt phí trễ..."
                    className="mt-1 w-full rounded-xl border border-[#e2e8e4] bg-[#f9fbf9] p-3 text-xs outline-none focus:border-[#07543f] focus:bg-white"
                  />
                </div>
              )}

              {/* Thông báo trước hạn */}
              <div className="flex items-center justify-between rounded-xl border border-[#e2e8e4] p-3">
                <div>
                  <p className="text-xs font-semibold text-[#34463b]">Thông báo đẩy trước hạn</p>
                  <p className="text-[10px] text-[#718078]">Nhắc nhở qua app trước khi tới ngày thanh toán</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    disabled={!notificationEnabled}
                    value={notifyBeforeHours}
                    onChange={(e) => setNotifyBeforeHours(e.target.value)}
                    className="h-8 rounded-lg border border-[#e2e8e4] bg-white px-2 text-xs text-[#34463b] outline-none disabled:opacity-50"
                  >
                    <option value="0">Đúng ngày đến hạn</option>
                    <option value="1">Trước 1 giờ</option>
                    <option value="3">Trước 3 giờ</option>
                    <option value="12">Trước 12 giờ</option>
                    <option value="24">Trước 1 ngày</option>
                    <option value="48">Trước 2 ngày</option>
                    <option value="72">Trước 3 ngày</option>
                    <option value="120">Trước 5 ngày</option>
                    <option value="168">Trước 1 tuần</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={notificationEnabled}
                    onChange={(e) => setNotificationEnabled(e.target.checked)}
                    className="size-4 rounded accent-[#07543f]"
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-5 flex justify-end gap-2 border-t border-[#f1f5f2] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingScheduleId(null);
                  }}
                  className="rounded-xl bg-[#f1f5f2] px-4 py-2 text-xs font-semibold text-[#59675f] hover:bg-[#e4ede6]"
                >
                  Hủy
                </button>
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#07543f] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#064735] disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : editingScheduleId
                    ? 'Cập nhật thay đổi'
                    : 'Lưu vào lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
