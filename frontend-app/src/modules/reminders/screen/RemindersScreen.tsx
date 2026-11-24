import { AppAlert as Alert } from '../../../context/DialogContext';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { AppDatePicker } from '../../core/components/AppDatePicker';
import { accountApi, type AccountItem } from '../../accounts/api/accountApi';
import { AccountBadge } from '../../accounts/components/AccountBadge';
import { transactionApi, type CategoryItem } from '../../add-transaction/api/transactionApi';
import { debtApi, type DebtItem } from '../../debts/api/debtApi';
import {
  scheduleApi,
  type ScheduleListItem,
  type CalendarEventItem,
  type CreateSchedulePayload,
  type ScheduleType,
  type TransactionType,
} from '../api/scheduleApi';
import { useAppTheme } from '../../../context/ThemeContext';

interface RemindersScreenProps {
  onBack: () => void;
  onNavigateToDebts?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_HERO_BG = require('../../../assets/icons/groups/family_banner_bg.png');
const CALENDAR_MASCOT_3D = require('../../../assets/icons/financial_calendar_mascot_3d.png');

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
}

function formatDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  // Nếu là dạng yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  // Nếu có dạng Date hợp lệ
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

function parseAmount(val?: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // Nếu chuỗi chứa dấu phẩy phân tách nghìn kiểu VN: "2.000.000" hoặc "2,000,000"
  // hoặc chuỗi thập phân backend: "2000000.00"
  if (str.includes('.') && str.includes(',')) {
    // Có cả chấm lẫn phẩy
    const cleaned = str.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return !isNaN(num) ? Math.round(num) : 0;
  }

  // Nếu có dạng thập phân của backend (chỉ có 1 dấu chấm và phần sau có 2 chữ số: VD "9000000.00" hoặc "2000000.00")
  if (/^\d+\.\d{1,4}$/.test(str)) {
    const num = parseFloat(str);
    return !isNaN(num) ? Math.round(num) : 0;
  }

  // Các trường hợp còn lại (như "2.000.000" do toLocaleString('vi-VN') sinh ra trong input)
  const cleaned = str.replace(/[^\d]/g, '');
  return Number(cleaned) || 0;
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

// Hàm nhận diện icon trực quan phù hợp theo nội dung lịch hoặc danh mục
function getScheduleIconName(itemName: string, rawItem?: any, isIncome?: boolean, isReminder?: boolean): any {
  if (isReminder) return 'bell';
  const nameLower = (itemName || '').toLowerCase();

  // Khoản vay nợ / Cho vay
  if (nameLower.startsWith('thu nợ') || nameLower.includes('cho vay') || rawItem?.debtType === 'LENDING') {
    return 'lending';
  }
  if (nameLower.startsWith('trả nợ') || nameLower.includes('vay') || rawItem?.debtType === 'BORROWING') {
    return 'borrowing';
  }

  // Tiền lương / Thưởng
  if (nameLower.includes('lương') || nameLower.includes('thưởng')) {
    return 'briefcase';
  }

  // Tiền nhà / Trọ / Thuê phòng
  if (nameLower.includes('nhà') || nameLower.includes('trọ') || nameLower.includes('thuê') || nameLower.includes('phòng')) {
    return 'home';
  }

  // Điện & Nước / Hóa đơn tiện ích
  if (nameLower.includes('điện') || nameLower.includes('nước') || nameLower.includes('hóa đơn')) {
    return 'bolt';
  }

  // Thẻ tín dụng / Ngân hàng
  if (nameLower.includes('thẻ') || nameLower.includes('tín dụng') || nameLower.includes('ngân hàng')) {
    return 'credit-card';
  }

  // Dịch vụ số / Giải trí
  if (nameLower.includes('netflix') || nameLower.includes('spotify') || nameLower.includes('youtube') || nameLower.includes('giải trí')) {
    return 'film';
  }

  return isIncome ? 'banknote' : 'receipt';
}

const DAY_OF_WEEKS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function RemindersScreen({ onBack, onNavigateToDebts }: RemindersScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();

  // Tab chính: Lịch tháng vs Danh sách
  const [activeMainTab, setActiveMainTab] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  // Tháng và năm đang xem
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // Ngày được chọn trong lịch (mặc định hôm nay)
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // Tháng được chọn cho tab Danh sách (mặc định tháng hiện tại dạng YYYY-MM)
  const [listSelectedMonth, setListSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthPickerModal, setShowMonthPickerModal] = useState<boolean>(false);

  // Filter trong tab Danh sách: 'ALL' | 'INCOME' | 'EXPENSE' | 'GOAL' | 'REMINDER'
  const [listFilter, setListFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'GOAL' | 'REMINDER'>('ALL');

  // Dữ liệu từ API
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Modal tạo / chỉnh sửa lịch
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Xem chi tiết sự kiện / lịch định kỳ
  const [selectedDetailItem, setSelectedDetailItem] = useState<CalendarEventItem | null>(null);

  // Form State tạo lịch
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [formScheduleType, setFormScheduleType] = useState<ScheduleType>('TRANSACTION');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formAccountId, setFormAccountId] = useState<string>('');
  const [formToAccountId, setFormToAccountId] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formFreq, setFormFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1); // 1 = Thứ 2, ..., 7 = Chủ nhật
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(() => new Date().getDate());
  const [formStartDate, setFormStartDate] = useState<Date | null>(new Date());
  const [formNote, setFormNote] = useState<string>('');
  const [formNotificationEnabled, setFormNotificationEnabled] = useState<boolean>(true);
  const [formNotifyBeforeHours, setFormNotifyBeforeHours] = useState<string>('24');

  // Dropdown Picker Modal trong tạo lịch
  const [schedulePickerType, setSchedulePickerType] = useState<
    'NONE' | 'FREQ' | 'DAY_OF_WEEK' | 'DAY_OF_MONTH' | 'ACCOUNT' | 'TO_ACCOUNT' | 'CATEGORY' | 'NOTIFY_TIME'
  >('NONE');

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [schedList, debtList, accList, catList] = await Promise.all([
        scheduleApi.getSchedules().catch(() => []),
        debtApi.getDebts().catch(() => []), // Lấy tất cả khoản nợ (không giới hạn status)
        accountApi.getAccounts().catch(() => []),
        transactionApi.getCategories().catch(() => []),
      ]);

      setSchedules(Array.isArray(schedList) ? schedList : []);
      setDebts(Array.isArray(debtList) ? debtList : []);
      setAccounts(Array.isArray(accList) ? accList : []);
      setCategories(Array.isArray(catList) ? catList : []);

      if (Array.isArray(accList) && accList.length > 0 && !formAccountId) {
        setFormAccountId(accList[0].id);
      }
      if (Array.isArray(catList) && catList.length > 0 && !formCategoryId) {
        setFormCategoryId(catList[0].id);
      }
    } catch (e) {
      console.warn('Lỗi loadAllData:', e);
      setSchedules([]);
      setDebts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Chuyển đổi tháng
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Tổng hợp các sự kiện định kỳ & nợ thành CalendarEventItem
  const allEvents = useMemo(() => {
    const events: CalendarEventItem[] = [];

    // 1. Thêm từ schedules backend (bỏ qua nếu tên là "Trả nợ:" hoặc "Thu nợ:" đã được lấy từ debts để không bị trùng lặp)
    if (Array.isArray(schedules)) {
      schedules.forEach((item) => {
        const itemName = (item.name || '').trim();
        if (itemName.startsWith('Trả nợ:') || itemName.startsWith('Thu nợ:')) {
          return; // Đã được lấy trực tiếp từ bảng debts với đầy đủ dữ liệu chính xác
        }

        const tmpl = (item as any)?.transaction_template || (item as any)?.transactionTemplate;
        const amount = parseAmount(tmpl?.amount);
        const isIncome = tmpl?.type === 'INCOME' || tmpl?.transaction_type === 'INCOME';
        const isReminder = item.schedule_type === 'REMINDER';
        const eventType: 'INCOME' | 'EXPENSE' | 'REMINDER' =
          isReminder
            ? 'REMINDER'
            : isIncome
              ? 'INCOME'
              : 'EXPENSE';

        // Trích xuất ngày nếu có next_occurrence hoặc start_date
        let eventDate = item.next_occurrence || (item as any)?.nextOccurrence || item.start_date || (item as any)?.startDate || '';
        if (typeof eventDate === 'string' && eventDate.includes('T')) eventDate = eventDate.split('T')[0];

        const iconName = getScheduleIconName(item.name, item, isIncome, isReminder);

        events.push({
          id: `sched_${item.id}`,
          title: item.name,
          subtitle: item.recurrence_text || (item as any)?.recurrenceText || (isIncome ? 'Hàng tháng • Thu nhập' : 'Hàng tháng • Chi phí'),
          amount: amount,
          type: eventType,
          date: String(eventDate),
          status: item.status,
          icon: iconName,
          rawItem: item,
        });
      });
    }

    // 2. Thêm từ debts (Khoản vay / Cho vay có ngày hẹn)
    if (Array.isArray(debts)) {
      debts.forEach((debt) => {
        const isLend = debt.debtType === 'LENDING';
        const isPaid = debt.status === 'PAID' || debt.status === 'PAID_OFF' || debt.remainingAmount === 0;
        const iconName = isLend ? 'lending' : 'borrowing';
        const partnerName = debt.counterpartyName || debt.creditorName || debt.debtorName || (debt as any)?.creditor_name || (debt as any)?.debtor_name || 'Khoản nợ';

        const freq = (debt.paymentFrequency || (debt as any)?.payment_frequency || 'ONE_TIME').toUpperCase();
        const isPeriodic = freq === 'MONTHLY' || freq === 'WEEKLY' || freq === 'QUARTERLY' || freq === 'BIWEEKLY' || freq === 'YEARLY';

        let startDateStr = debt.startDate || (debt as any)?.start_date || '';
        if (typeof startDateStr === 'string' && startDateStr.includes('T')) startDateStr = startDateStr.split('T')[0];

        let dueDateStr = debt.dueDate || (debt as any)?.due_date || '';
        if (typeof dueDateStr === 'string' && dueDateStr.includes('T')) dueDateStr = dueDateStr.split('T')[0];

        let nextPaymentDateStr = debt.nextPaymentDate || (debt as any)?.next_payment_date || '';
        if (typeof nextPaymentDateStr === 'string' && nextPaymentDateStr.includes('T')) nextPaymentDateStr = nextPaymentDateStr.split('T')[0];

        const periodicAmt = debt.monthlyPayment || debt.paymentAmount || (debt as any)?.monthly_payment || (debt as any)?.payment_amount || (debt.remainingAmount || debt.principalAmount || 0);

        if (isPeriodic) {
          // Xác định ngày bắt đầu kỳ trả đầu tiên
          const startPeriodDateStr = nextPaymentDateStr || startDateStr || dueDateStr;
          if (!startPeriodDateStr) return;

          let subtitleText = 'Hàng tháng';
          if (freq === 'WEEKLY') subtitleText = 'Hàng tuần';
          else if (freq === 'QUARTERLY') subtitleText = 'Hàng quý';
          else if (freq === 'BIWEEKLY') subtitleText = '2 tuần một lần';
          else if (freq === 'YEARLY') subtitleText = 'Hàng năm';

          // Nếu có dueDate và startPeriodDate, ta có thể sinh chuỗi các kỳ từ startPeriodDate đến dueDate
          // Hoặc sinh các kỳ hiển thị cho khoảng thời gian hợp lý (tối đa 36 kỳ)
          const baseDate = new Date(startPeriodDateStr);
          const limitDate = dueDateStr ? new Date(dueDateStr) : null;
          let iterDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
          let count = 0;

          // Tính số kỳ ước tính nếu có tổng số tiền và tiền mỗi kỳ
          const maxAllowedPeriods = (periodicAmt > 0 && debt.principalAmount)
            ? Math.max(1, Math.round(debt.principalAmount / periodicAmt))
            : 60;

          while (count < maxAllowedPeriods) {
            // Nếu đã vượt dueDate (nếu có dueDate) thì dừng
            if (limitDate && iterDate.getTime() > limitDate.getTime()) {
              break;
            }

            const yStr = iterDate.getFullYear();
            const mStr = String(iterDate.getMonth() + 1).padStart(2, '0');
            const dStr = String(iterDate.getDate()).padStart(2, '0');
            const currentPeriodDate = `${yStr}-${mStr}-${dStr}`;

            events.push({
              id: `debt_${debt.id}_p${count}`,
              title: `${isLend ? 'Thu nợ' : 'Trả nợ'}: ${partnerName} (Kỳ ${count + 1})`,
              subtitle: subtitleText,
              amount: periodicAmt,
              type: isLend ? 'INCOME' : 'EXPENSE',
              date: currentPeriodDate,
              status: isPaid ? 'COMPLETED' : debt.status,
              icon: iconName,
              rawItem: debt,
            });

            count++;
            // Tăng ngày theo tần suất
            if (freq === 'WEEKLY') {
              iterDate.setDate(iterDate.getDate() + 7);
            } else if (freq === 'BIWEEKLY') {
              iterDate.setDate(iterDate.getDate() + 14);
            } else if (freq === 'QUARTERLY') {
              iterDate.setMonth(iterDate.getMonth() + 3);
            } else if (freq === 'YEARLY') {
              iterDate.setFullYear(iterDate.getFullYear() + 1);
            } else {
              // Mặc định MONTHLY
              iterDate.setMonth(iterDate.getMonth() + 1);
            }

            // Nếu không có dueDate thì chỉ sinh 12 kỳ tiếp theo
            if (!limitDate && count >= 12) break;
          }
        } else {
          // Trả một lần
          let dDate = dueDateStr || nextPaymentDateStr || startDateStr;
          if (!dDate) return;

          const debtAmount = debt.principalAmount || debt.remainingAmount || debt.paidAmount || 0;
          events.push({
            id: `debt_${debt.id}`,
            title: `${isLend ? 'Thu nợ' : 'Trả nợ'}: ${partnerName}`,
            subtitle: 'Một lần',
            amount: debtAmount,
            type: isLend ? 'INCOME' : 'EXPENSE',
            date: String(dDate),
            status: isPaid ? 'COMPLETED' : debt.status,
            icon: iconName,
            rawItem: debt,
          });
        }
      });
    }

    return events;
  }, [schedules, debts]);

  // Lọc sự kiện cho ngày được chọn (selectedDay)
  const selectedDateStr = useMemo(() => {
    const y = selectedDay.getFullYear();
    const m = String(selectedDay.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDay]);

  const eventsOnSelectedDay = useMemo(() => {
    const dayNum = selectedDay.getDate();
    const selYear = selectedDay.getFullYear();
    const selMonth = selectedDay.getMonth() + 1;

    return allEvents.filter((ev) => {
      if (ev.date) {
        // Khớp chính xác ngày YYYY-MM-DD
        if (ev.date === selectedDateStr) return true;

        // Nếu chuỗi ngày dạng YYYY-MM-DD
        const parts = ev.date.split('-');
        if (parts.length === 3) {
          const evYear = parseInt(parts[0], 10);
          const evMonth = parseInt(parts[1], 10);
          const evDay = parseInt(parts[2], 10);

          // Nếu là sự kiện phát sinh từ nợ (đã được tính toán chính xác ngày date theo chuỗi kỳ)
          const isDebtEvent = ev.id.startsWith('debt_');
          if (isDebtEvent) {
            if (evYear === selYear && evMonth === selMonth && evDay === dayNum) return true;
          } else {
            // Nếu là lịch định kỳ HÀNG THÁNG từ schedule: chỉ lặp khi ngày trong tháng khớp
            const isMonthly = (ev.subtitle || '').toLowerCase().includes('hàng tháng') || (ev.subtitle || '').toLowerCase().includes('monthly');
            if (isMonthly && evDay === dayNum) return true;

            // Nếu là sự kiện 1 LẦN: bắt buộc phải đúng Năm, Tháng và Ngày
            if (!isMonthly && evYear === selYear && evMonth === selMonth && evDay === dayNum) return true;
          }
        }

        // Hoặc kiểm tra qua Date object
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth && d.getDate() === dayNum) {
            return true;
          }
        }
      }
      return false;
    });
  }, [allEvents, selectedDateStr, selectedDay]);

  // Tạo ma trận các ngày trong tháng hiện tại
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // new Date(year, month, 1).getDay(): 0 (CN), 1 (T2), ..., 6 (T7)
    // Thiết kế: Cột hiển thị lần lượt T2(0), T3(1), T4(2), T5(3), T6(4), T7(5), CN(6)
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      hasIncome: boolean;
      hasExpense: boolean;
      hasGoal: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // 1. Các ngày của tháng trước để lấp đầy hàng đầu tiên
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dNum);
      days.push({
        date: d,
        dayNumber: dNum,
        isCurrentMonth: false,
        hasIncome: false,
        hasExpense: false,
        hasGoal: false,
        isSelected: false,
        isToday: false,
      });
    }

    const today = new Date();

    // 2. Các ngày của tháng hiện tại
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const isSelected =
        selectedDay.getDate() === i &&
        selectedDay.getMonth() === month &&
        selectedDay.getFullYear() === year;

      const isToday =
        today.getDate() === i &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      // Kiểm tra có sự kiện nào vào ngày này không
      let hasIncome = false;
      let hasExpense = false;
      let hasGoal = false;

      if (Array.isArray(allEvents)) {
        allEvents.forEach((ev) => {
          if (ev.date) {
            const parts = ev.date.split('-');
            let evDay = 0;
            let evMonth = 0;
            let evYear = 0;
            if (parts.length === 3) {
              evYear = parseInt(parts[0], 10);
              evMonth = parseInt(parts[1], 10) - 1;
              evDay = parseInt(parts[2], 10);
            } else {
              const evDate = new Date(ev.date);
              if (!isNaN(evDate.getTime())) {
                evYear = evDate.getFullYear();
                evMonth = evDate.getMonth();
                evDay = evDate.getDate();
              }
            }

            const isDebtEvent = ev.id.startsWith('debt_');
            const isMonthly = !isDebtEvent && ((ev.subtitle || '').toLowerCase().includes('hàng tháng') || (ev.subtitle || '').toLowerCase().includes('monthly'));
            const isMatchMonthYear = evYear === year && evMonth === month;

            // Nếu là nợ hoặc 1 lần thì bắt buộc phải đúng tháng & năm; nếu là lịch hàng tháng thì hiện đúng ngày i
            if ((isMonthly && evDay === i) || (!isMonthly && isMatchMonthYear && evDay === i)) {
              if (ev.type === 'INCOME') hasIncome = true;
              else if (ev.type === 'EXPENSE') hasExpense = true;
              else hasGoal = true;
            }
          }
        });
      }

      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        hasIncome,
        hasExpense,
        hasGoal,
        isSelected,
        isToday,
      });
    }

    // 3. Các ngày của tháng sau để làm đầy hàng cuối cùng thành bội số của 7
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const nextDaysCount = 7 - remainder;
      for (let i = 1; i <= nextDaysCount; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d,
          dayNumber: i,
          isCurrentMonth: false,
          hasIncome: false,
          hasExpense: false,
          hasGoal: false,
          isSelected: false,
          isToday: false,
        });
      }
    }

    return days;
  }, [currentDate, selectedDay, allEvents]);

  // 12 tháng gần nhất cho bộ lọc tháng
  const availableMonthsList = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    // 3 tháng tương lai + tháng hiện tại + 8 tháng quá khứ
    for (let i = -3; i <= 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        key: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    return list;
  }, []);

  // Danh sách sự kiện đã lọc trong tab "Danh sách" (Lọc theo tháng và sắp xếp từ ngày 1 -> 31)
  const filteredList = useMemo(() => {
    let result = [...allEvents];

    // Lọc theo loại
    if (listFilter === 'INCOME') result = result.filter((e) => e.type === 'INCOME');
    else if (listFilter === 'EXPENSE') result = result.filter((e) => e.type === 'EXPENSE');
    else if (listFilter === 'GOAL') result = result.filter((e) => e.type === 'GOAL');
    else if (listFilter === 'REMINDER') result = result.filter((e) => e.type === 'REMINDER');

    // Lọc theo tháng đã chọn (listSelectedMonth: YYYY-MM)
    const [targetYearStr, targetMonthStr] = listSelectedMonth.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthStr, 10);

    result = result.filter((item) => {
      if (!item.date) return false;
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const itemYear = parseInt(parts[0], 10);
        const itemMonth = parseInt(parts[1], 10);
        const isMonthly = (item.subtitle || '').toLowerCase().includes('hàng tháng') || (item.subtitle || '').toLowerCase().includes('monthly');
        // Chỉ các lịch thực sự lặp HÀNG THÁNG thì mới lặp qua các tháng
        if (isMonthly) return true;
        // Các khoản nợ/hóa đơn 1 LẦN thì bắt buộc phải đúng tháng và đúng năm
        return itemYear === targetYear && itemMonth === targetMonth;
      }
      return false;
    });

    // Sắp xếp tăng dần theo ngày trong tháng (từ ngày 1 đến ngày 30/31)
    result.sort((a, b) => {
      let dayA = 0;
      let dayB = 0;
      if (a.date) {
        const p = a.date.split('-');
        if (p.length === 3) dayA = parseInt(p[2], 10);
      }
      if (b.date) {
        const p = b.date.split('-');
        if (p.length === 3) dayB = parseInt(p[2], 10);
      }
      return dayA - dayB;
    });

    return result;
  }, [allEvents, listFilter, listSelectedMonth]);

  // Thống kê tháng hiển thị (theo tháng đang chọn trên tab Danh sách, tính trên toàn bộ các khoản trong tháng)
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    // Lọc tất cả sự kiện thuộc tháng đang chọn (không phụ thuộc vào tab con Tất cả/Thu nhập/Chi tiêu)
    const [targetYearStr, targetMonthStr] = listSelectedMonth.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthStr, 10);

    const monthEvents = allEvents.filter((item) => {
      if (!item.date) return false;
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const itemYear = parseInt(parts[0], 10);
        const itemMonth = parseInt(parts[1], 10);
        const isMonthly = (item.subtitle || '').toLowerCase().includes('hàng tháng') || (item.subtitle || '').toLowerCase().includes('monthly');
        if (isMonthly) return true;
        return itemYear === targetYear && itemMonth === targetMonth;
      }
      return false;
    });

    monthEvents.forEach((ev) => {
      if (ev.type === 'INCOME') {
        income += (ev.amount || 0);
      } else if (ev.type === 'EXPENSE') {
        expense += (ev.amount || 0);
      }
    });

    return {
      count: monthEvents.length,
      income,
      expense,
      cashflow: income - expense,
    };
  }, [allEvents, listSelectedMonth]);

  // Xử lý tạo lịch mới
  const handleSaveSchedule = async () => {
    if (!formName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên lịch tài chính');
      return;
    }
    const amt = parseAmount(formAmount);
    if (amt <= 0 && formScheduleType === 'TRANSACTION') {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    // Chuyển format sang yyyy-mm-dd
    let startDateIso = new Date().toISOString().split('T')[0];
    if (formStartDate) {
      const y = formStartDate.getFullYear();
      const m = String(formStartDate.getMonth() + 1).padStart(2, '0');
      const d = String(formStartDate.getDate()).padStart(2, '0');
      startDateIso = `${y}-${m}-${d}`;
    }

    const dayOfWeekCodes = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    let rrule = `FREQ=MONTHLY;BYMONTHDAY=${formDayOfMonth || 1}`;
    if (formFreq === 'DAILY') {
      rrule = 'FREQ=DAILY';
    } else if (formFreq === 'WEEKLY') {
      const code = dayOfWeekCodes[formDayOfWeek] || 'MO';
      rrule = `FREQ=WEEKLY;BYDAY=${code}`;
    } else if (formFreq === 'YEARLY') {
      rrule = 'FREQ=YEARLY';
    }

    const notifyMinutes = Number(formNotifyBeforeHours) * 60;

    const payload: CreateSchedulePayload = {
      schedule_type: formScheduleType,
      name: formName.trim(),
      recurrence_rule: rrule,
      start_date: startDateIso,
      end_date: null,
      auto_execute: formScheduleType === 'TRANSACTION',
      notification_enabled: formNotificationEnabled,
      notification_time_before_minutes: notifyMinutes,
    };

    if (formScheduleType === 'TRANSACTION') {
      const selectedAcc = accounts.find((a) => a.id === formAccountId) || accounts[0];
      payload.transaction_template = {
        transaction_type: formType,
        account_id: selectedAcc?.id || formAccountId || '1',
        to_account_id: formType === 'TRANSFER' ? formToAccountId : undefined,
        amount: amt,
        currency_code: selectedAcc?.currencyCode || 'VND',
        category_id: formType === 'TRANSFER' ? null : (formCategoryId || (categories[0]?.id ?? null)),
        description: formName.trim(),
        note: formNote.trim(),
      };
    } else {
      payload.reminder_message = formNote.trim() || `Nhắc hẹn: ${formName.trim()}`;
    }

    try {
      setIsSubmitting(true);
      if (editingScheduleId) {
        const res = await scheduleApi.updateSchedule(editingScheduleId, payload);
        if (res.success) {
          Alert.alert('Thành công', 'Đã cập nhật lịch tài chính!');
          setShowAddModal(false);
          setEditingScheduleId(null);
          // Reset form
          setFormName('');
          setFormAmount('');
          setFormNote('');
          setFormFreq('MONTHLY');
          setFormDayOfMonth(new Date().getDate());
          loadAllData();
        } else {
          Alert.alert('Lỗi', res.message || 'Không thể cập nhật lịch định kỳ');
        }
      } else {
        const res = await scheduleApi.createSchedule(payload);
        if (res.success) {
          Alert.alert('Thành công', 'Đã tạo lịch tài chính định kỳ thành công!');
          setShowAddModal(false);
          setEditingScheduleId(null);
          // Reset form
          setFormName('');
          setFormAmount('');
          setFormNote('');
          setFormFreq('MONTHLY');
          setFormDayOfMonth(new Date().getDate());
          loadAllData();
        } else {
          Alert.alert('Lỗi', res.message || 'Không thể tạo lịch định kỳ');
        }
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Đã có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format tiêu đề ngày
  const formatDayTitle = (d: Date) => {
    const dayOfWeek = DAY_OF_WEEKS[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayOfWeek}, ${day} Tháng ${month}, ${year}`;
  };

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* TOP HEADER: Tiêu đề lệch trái + Nút Thêm lịch bên phải */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }, isDark && { backgroundColor: themeColors.background }]}>
        <Pressable
          onPress={onBack}
          style={[styles.headerIconButton, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          hitSlop={12}
          accessibilityLabel="Quay lại"
        >
          <FinanceIcon name="chevron-left" size={24} color={isDark ? themeColors.textPrimary : "#0F172A"} />
        </Pressable>

        <Text style={[styles.headerTitleLeft, isDark && { color: themeColors.textPrimary }]}>Lịch tài chính</Text>

        <Pressable
          onPress={() => {
            setEditingScheduleId(null);
            setFormName('');
            setFormAmount('');
            setFormNote('');
            setFormFreq('MONTHLY');
            setFormDayOfMonth(new Date().getDate());
            setShowAddModal(true);
          }}
          style={styles.addScheduleButton}
          hitSlop={8}
          accessibilityLabel="Thêm lịch"
        >
          <FinanceIcon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addScheduleButtonText}>Thêm lịch</Text>
        </Pressable>
      </View>

      {/* TAB SELECTOR (Lịch tháng vs Danh sách) */}
      <View style={[styles.tabBarWrapper, isDark && { backgroundColor: themeColors.background }]}>
        <View style={[styles.tabBarPill, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
          <Pressable
            style={[
              styles.tabButton,
              activeMainTab === 'CALENDAR' && styles.tabButtonActive,
              activeMainTab === 'CALENDAR' && isDark && { backgroundColor: themeColors.surface, shadowOpacity: 0 },
            ]}
            onPress={() => setActiveMainTab('CALENDAR')}
          >
            <FinanceIcon
              name="calendar"
              size={18}
              color={activeMainTab === 'CALENDAR' ? (isDark ? themeColors.textPrimary : '#0F172A') : (isDark ? themeColors.textMuted : '#64748B')}
            />
            <Text
              style={[
                styles.tabButtonText,
                isDark && { color: themeColors.textSecondary },
                activeMainTab === 'CALENDAR' && styles.tabButtonTextActive,
                activeMainTab === 'CALENDAR' && isDark && { color: themeColors.textPrimary },
              ]}
            >
              Lịch tháng
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,
              activeMainTab === 'LIST' && (isDark ? { backgroundColor: themeColors.surface, shadowOpacity: 0 } : styles.tabButtonActiveDark),
            ]}
            onPress={() => setActiveMainTab('LIST')}
          >
            <FinanceIcon
              name="grid"
              size={18}
              color={activeMainTab === 'LIST' ? (isDark ? themeColors.textPrimary : '#FFFFFF') : (isDark ? themeColors.textMuted : '#64748B')}
            />
            <Text
              style={[
                styles.tabButtonText,
                isDark && { color: themeColors.textSecondary },
                activeMainTab === 'LIST' && (isDark ? { color: themeColors.textPrimary } : styles.tabButtonTextActiveDark),
              ]}
            >
              Danh sách
            </Text>
          </Pressable>
        </View>
      </View>

      {/* NỘI DUNG CHÍNH */}
      {loading ? (
        <View style={[styles.centerLoading, isDark && { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={themeColors.accentGreen} />
          <Text style={[styles.loadingText, isDark && { color: themeColors.textSecondary }]}>Đang tải lịch tài chính...</Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.scrollContent, isDark && { backgroundColor: themeColors.background }]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? themeColors.accentGreen : undefined} />}
        >
          {/* 4 CARD THỐNG KÊ TỔNG QUAN (Chỉ hiển thị ở tab Danh sách định kỳ) */}
          {activeMainTab === 'LIST' && (
            <View style={styles.summaryContainerWrap}>
              <View style={styles.summaryGrid2x2}>
                {/* Hàng 1: Đang theo dõi + Dòng tiền dự kiến */}
                <View style={styles.summaryGridRow}>
                  {/* Card 1: Số lịch */}
                  <View style={[styles.statCardGrid, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : '#F0F9FF', borderColor: isDark ? themeColors.cardBorder : '#E0F2FE' }]}>
                    <View style={styles.statCardHeader}>
                      <FinanceIcon name="calendar" size={18} color="#38BDF8" />
                      <Text style={[styles.statCardLabel, isDark && { color: themeColors.textSecondary }]}>Đang theo dõi</Text>
                    </View>
                    <Text style={[styles.statCardNumber, isDark && { color: themeColors.textPrimary }]}>{stats.count} lịch</Text>
                  </View>

                  {/* Card 2: Dòng tiền dự kiến */}
                  <View style={[styles.statCardGrid, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.12)' : '#FAF5FF', borderColor: isDark ? themeColors.cardBorder : '#F3E8FF' }]}>
                    <View style={styles.statCardHeader}>
                      <FinanceIcon name="spark" size={18} color="#C084FC" />
                      <Text style={[styles.statCardLabel, isDark && { color: themeColors.textSecondary }]}>Dòng tiền dự kiến</Text>
                    </View>
                    <Text style={[styles.statCardNumber, { color: stats.cashflow >= 0 ? (isDark ? '#C084FC' : '#9333EA') : '#F87171' }]} numberOfLines={1}>
                      {stats.cashflow >= 0 ? '+' : ''}{formatVND(stats.cashflow)}
                    </Text>
                  </View>
                </View>

                {/* Hàng 2: Thu nhập dự kiến + Chi tiêu cố định */}
                <View style={styles.summaryGridRow}>
                  {/* Card 3: Thu nhập dự kiến */}
                  <View style={[styles.statCardGrid, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4', borderColor: isDark ? themeColors.cardBorder : '#DCFCE7' }]}>
                    <View style={styles.statCardHeader}>
                      <FinanceIcon name="arrow-up" size={18} color="#34D399" />
                      <Text style={[styles.statCardLabel, isDark && { color: themeColors.textSecondary }]}>Thu nhập dự kiến</Text>
                    </View>
                    <Text style={[styles.statCardNumber, { color: isDark ? '#34D399' : '#059669' }]} numberOfLines={1}>
                      +{formatVND(stats.income)}
                    </Text>
                  </View>

                  {/* Card 4: Chi tiêu cố định */}
                  <View style={[styles.statCardGrid, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: isDark ? themeColors.cardBorder : '#FEE2E2' }]}>
                    <View style={styles.statCardHeader}>
                      <FinanceIcon name="arrow-down" size={18} color="#F87171" />
                      <Text style={[styles.statCardLabel, isDark && { color: themeColors.textSecondary }]}>Chi tiêu cố định</Text>
                    </View>
                    <Text style={[styles.statCardNumber, { color: isDark ? '#F87171' : '#DC2626' }]} numberOfLines={1}>
                      -{formatVND(stats.expense)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeMainTab === 'CALENDAR' ? (
            /* ================= VIEW 1: LỊCH THÁNG ================= */
            <View style={styles.tabContentContainer}>
              {/* BANNER XANH LÁ CHUẨN GROUP / FINORA */}
              <ImageBackground
                source={CALENDAR_HERO_BG}
                style={styles.heroBannerWrap}
                imageStyle={styles.heroBannerBg}
                resizeMode="cover"
              >
                <View style={styles.heroTextContainer}>
                  <View style={styles.heroTitleRow}>
                    <FinanceIcon name="calendar" size={18} color="#FFFFFF" />
                    <Text style={styles.heroTitle}>Lịch tài chính của bạn</Text>
                  </View>
                  <Text style={styles.heroSubtitle}>
                    Theo dõi các khoản thu, chi, hóa đơn{'\n'}và mục tiêu sắp tới để không bỏ lỡ.
                  </Text>
                </View>
                <Image
                  source={CALENDAR_MASCOT_3D}
                  style={styles.heroBannerImage}
                  resizeMode="contain"
                />
              </ImageBackground>

              {/* CARD CALENDAR VIEW */}
              <View style={[styles.calendarCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                {/* Thanh chuyển tháng */}
                <View style={styles.monthSelectorRow}>
                  <Pressable onPress={prevMonth} hitSlop={12} style={[styles.monthNavBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                    <FinanceIcon name="chevron-left" size={20} color={isDark ? themeColors.textPrimary : "#334155"} />
                  </Pressable>

                  <View style={styles.monthDisplayWrap}>
                    <Text style={[styles.monthYearTitle, isDark && { color: themeColors.textPrimary }]}>
                      {MONTH_NAMES[currentDate.getMonth()]}, {currentDate.getFullYear()}
                    </Text>
                  </View>

                  <Pressable onPress={nextMonth} hitSlop={12} style={[styles.monthNavBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                    <FinanceIcon name="chevron-right" size={20} color={isDark ? themeColors.textPrimary : "#334155"} />
                  </Pressable>
                </View>

                {/* Thứ trong tuần */}
                <View style={[styles.weekDaysHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                    <Text key={idx} style={[styles.weekDayText, isDark && { color: themeColors.textMuted }]}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Grid Ngày */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((item, idx) => {
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setSelectedDay(item.date)}
                        style={[
                          styles.dayCell,
                          item.isSelected && styles.dayCellSelected,
                          item.isToday && !item.isSelected && isDark && { backgroundColor: themeColors.surfaceSubtle, borderRadius: 10 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            isDark && { color: themeColors.textPrimary },
                            !item.isCurrentMonth && (isDark ? { color: 'rgba(255, 255, 255, 0.2)' } : styles.dayNumberDimmed),
                            item.isSelected && styles.dayNumberSelected,
                            item.isToday && !item.isSelected && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.dayNumberToday),
                          ]}
                        >
                          {item.dayNumber}
                        </Text>

                        {/* Chấm tròn sự kiện */}
                        <View style={styles.dotsRow}>
                          {item.hasIncome && (
                            <View
                              style={[
                                styles.eventDot,
                                { backgroundColor: item.isSelected ? '#FFFFFF' : '#10B981' },
                              ]}
                            />
                          )}
                          {item.hasExpense && (
                            <View
                              style={[
                                styles.eventDot,
                                { backgroundColor: item.isSelected ? '#FFFFFF' : '#EF4444' },
                              ]}
                            />
                          )}
                          {item.hasGoal && (
                            <View
                              style={[
                                styles.eventDot,
                                { backgroundColor: item.isSelected ? '#FFFFFF' : '#F59E0B' },
                              ]}
                            />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Ghi chú màu (Legend) */}
                <View style={[styles.legendRow, isDark && { borderTopColor: themeColors.cardBorder }]}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, isDark && { color: themeColors.textSecondary }]}>Thu nhập</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, isDark && { color: themeColors.textSecondary }]}>Chi tiêu / Hóa đơn</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, isDark && { color: themeColors.textSecondary }]}>Sự kiện / Mục tiêu</Text>
                  </View>
                </View>
              </View>

              {/* DANH SÁCH SỰ KIỆN TRONG NGÀY */}
              <View style={styles.dayEventsSection}>
                <View style={styles.dayEventsHeaderRow}>
                  <Text style={[styles.dayEventsTitle, isDark && { color: themeColors.textPrimary }]}>Các sự kiện trong ngày</Text>
                  <Text style={[styles.dayEventsDateSub, isDark && { color: themeColors.textSecondary }]}>{formatDayTitle(selectedDay)}</Text>
                </View>

                {eventsOnSelectedDay.length === 0 ? (
                  <View style={[styles.emptyDayWrap, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                    <FinanceIcon name="calendar" size={40} color={isDark ? themeColors.textMuted : "#94A3B8"} />
                    <Text style={[styles.emptyDayTitle, isDark && { color: themeColors.textPrimary }]}>Không có lịch nào cho ngày này</Text>
                    <Text style={[styles.emptyDaySub, isDark && { color: themeColors.textSecondary }]}>Bấm "+ Thêm sự kiện" bên dưới để tạo mới.</Text>
                  </View>
                ) : (
                  <View style={styles.dayEventsList}>
                    {eventsOnSelectedDay.map((ev) => {
                      const isIncome = ev.type === 'INCOME';
                      const isGoal = ev.type === 'GOAL';
                      const bgCard = isDark
                        ? (isIncome ? 'rgba(16, 185, 129, 0.12)' : isGoal ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)')
                        : (isIncome ? '#ECFDF5' : isGoal ? '#FFFBEB' : '#FEF2F2');
                      const iconBg = isDark
                        ? (isIncome ? 'rgba(16, 185, 129, 0.22)' : isGoal ? 'rgba(245, 158, 11, 0.22)' : 'rgba(239, 68, 68, 0.22)')
                        : (isIncome ? '#D1FAE5' : isGoal ? '#FEF3C7' : '#FEE2E2');
                      const iconColor = isDark
                        ? (isIncome ? '#34D399' : isGoal ? '#FBBF24' : '#F87171')
                        : (isIncome ? '#059669' : isGoal ? '#D97706' : '#DC2626');
                      const amountColor = isDark
                        ? (isIncome ? '#34D399' : '#F87171')
                        : (isIncome ? '#059669' : '#DC2626');
                      const cardBorderColor = isDark
                        ? (isIncome ? 'rgba(52, 211, 153, 0.35)' : isGoal ? 'rgba(251, 191, 36, 0.35)' : 'rgba(239, 68, 68, 0.4)')
                        : (isIncome ? '#A7F3D0' : isGoal ? '#FDE68A' : '#FECACA');

                      return (
                        <Pressable
                          key={ev.id}
                          style={[
                            styles.eventCard,
                            { backgroundColor: bgCard, borderColor: cardBorderColor, borderWidth: 1 },
                          ]}
                          onPress={() => setSelectedDetailItem(ev)}
                        >
                          <View style={[styles.eventIconBox, { backgroundColor: iconBg }]}>
                            <FinanceIcon
                              name={(ev.icon as any) || (isIncome ? 'banknote' : isGoal ? 'target' : 'receipt')}
                              size={20}
                              color={iconColor}
                            />
                          </View>

                          <View style={styles.eventInfoBox}>
                            <Text style={[styles.eventTitle, isDark && { color: themeColors.textPrimary }]}>
                              {ev.title}
                            </Text>
                            <Text style={[styles.eventSubtitle, isDark && { color: themeColors.textSecondary }]}>
                              {ev.subtitle}
                            </Text>
                          </View>

                          <Text style={[styles.eventAmountText, { color: amountColor }]}>
                            {isIncome ? '+' : '-'} {formatVND(ev.amount)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* NÚT THÊM SỰ KIỆN */}
                <Pressable
                  style={styles.primaryActionButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <FinanceIcon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Thêm sự kiện</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* ================= VIEW 2: DANH SÁCH ĐỊNH KỲ ================= */
            <View style={styles.tabContentContainer}>
              {/* BỘ LỌC CHIPS */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                <Pressable
                  style={[
                    styles.chipButton,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    listFilter === 'ALL' && styles.chipButtonActive,
                  ]}
                  onPress={() => setListFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isDark && { color: themeColors.textSecondary },
                      listFilter === 'ALL' && styles.chipTextActive,
                    ]}
                  >
                    Tất cả
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.chipButton,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    listFilter === 'INCOME' && styles.chipButtonActive,
                  ]}
                  onPress={() => setListFilter('INCOME')}
                >
                  <FinanceIcon
                    name="banknote"
                    size={15}
                    color={listFilter === 'INCOME' ? '#FFFFFF' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isDark && { color: themeColors.textSecondary },
                      listFilter === 'INCOME' && styles.chipTextActive,
                    ]}
                  >
                    Thu nhập
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.chipButton,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    listFilter === 'EXPENSE' && styles.chipButtonActive,
                  ]}
                  onPress={() => setListFilter('EXPENSE')}
                >
                  <FinanceIcon
                    name="trending-up"
                    size={15}
                    color={listFilter === 'EXPENSE' ? '#FFFFFF' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isDark && { color: themeColors.textSecondary },
                      listFilter === 'EXPENSE' && styles.chipTextActive,
                    ]}
                  >
                    Chi tiêu
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.chipButton,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    listFilter === 'GOAL' && styles.chipButtonActive,
                  ]}
                  onPress={() => setListFilter('GOAL')}
                >
                  <FinanceIcon
                    name="target"
                    size={15}
                    color={listFilter === 'GOAL' ? '#FFFFFF' : '#A855F7'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isDark && { color: themeColors.textSecondary },
                      listFilter === 'GOAL' && styles.chipTextActive,
                    ]}
                  >
                    Mục tiêu
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.chipButton,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    listFilter === 'REMINDER' && styles.chipButtonActive,
                  ]}
                  onPress={() => setListFilter('REMINDER')}
                >
                  <FinanceIcon
                    name="bell"
                    size={15}
                    color={listFilter === 'REMINDER' ? '#FFFFFF' : '#F59E0B'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isDark && { color: themeColors.textSecondary },
                      listFilter === 'REMINDER' && styles.chipTextActive,
                    ]}
                  >
                    Nhắc hẹn
                  </Text>
                </Pressable>
              </ScrollView>

              {/* HEADER DANH SÁCH ĐỊNH KỲ + BỘ LỌC THEO THÁNG */}
              <View style={styles.listSectionHeader}>
                <Text style={[styles.listSectionTitle, isDark && { color: themeColors.textPrimary }]}>
                  Danh sách lịch định kỳ
                </Text>

                <Pressable
                  style={[styles.monthFilterButton, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                  onPress={() => setShowMonthPickerModal(true)}
                >
                  <FinanceIcon name="calendar" size={14} color={isDark ? themeColors.accentGreen : "#00875A"} />
                  <Text style={[styles.monthFilterText, isDark && { color: themeColors.textPrimary }]}>
                    {(() => {
                      const parts = listSelectedMonth.split('-');
                      return `Tháng ${parts[1]}/${parts[0]}`;
                    })()}
                  </Text>
                  <FinanceIcon name="chevron-down" size={14} color={isDark ? themeColors.textMuted : "#64748B"} />
                </Pressable>
              </View>

              {/* ITEMS DANH SÁCH */}
              {filteredList.length === 0 ? (
                <View style={[styles.emptyDayWrap, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                  <FinanceIcon name="bell" size={40} color={isDark ? themeColors.textMuted : "#94A3B8"} />
                  <Text style={[styles.emptyDayTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có lịch định kỳ nào</Text>
                  <Text style={[styles.emptyDaySub, isDark && { color: themeColors.textSecondary }]}>
                    Bấm "+ Thêm lịch mới" để lên kế hoạch thu chi định kỳ.
                  </Text>
                </View>
              ) : (
                <View style={styles.listCardsWrap}>
                  {filteredList.map((item) => {
                    const isIncome = item.type === 'INCOME';

                    // Tính trạng thái theo tháng đang xem:
                    const isMonthly =
                      (item.subtitle || '').toLowerCase().includes('hàng tháng') ||
                      (item.subtitle || '').toLowerCase().includes('monthly');
                    const [selYear, selMonth] = listSelectedMonth.split('-').map(Number);
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                    let eventDateInMonth = '';
                    if (isMonthly) {
                      let dayNum = 1;
                      if (item.date) {
                        const p = item.date.split('-');
                        if (p.length === 3) dayNum = parseInt(p[2], 10);
                      }
                      eventDateInMonth = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    } else {
                      eventDateInMonth = item.date ? item.date.split('T')[0] : '';
                    }

                    const isPast = eventDateInMonth && eventDateInMonth < todayStr;
                    const isPaidOffDebt = item.status === 'COMPLETED' || item.status === 'PAID' || item.status === 'PAID_OFF';
                    const isCompleted = isPaidOffDebt || Boolean(isPast);

                    const iconBg = isDark
                      ? (item.type === 'INCOME'
                          ? 'rgba(16, 185, 129, 0.16)'
                          : item.type === 'REMINDER'
                            ? 'rgba(245, 158, 11, 0.16)'
                            : 'rgba(239, 68, 68, 0.16)')
                      : (item.type === 'INCOME'
                          ? '#ECFDF5'
                          : item.type === 'REMINDER'
                            ? '#FFF8E6'
                            : (item.icon === 'borrowing' || item.icon === 'lending')
                              ? '#FEF2F2'
                              : '#F8FAFC');

                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.recurringItemCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                        onPress={() => setSelectedDetailItem(item)}
                      >
                        {/* Icon nhận diện trực quan theo loại sự kiện */}
                        <View
                          style={[
                            styles.recurringIconBox,
                            { backgroundColor: iconBg },
                          ]}
                        >
                          <FinanceIcon
                            name={(item.icon as any) || (isIncome ? 'banknote' : 'bell')}
                            size={20}
                            color={
                              item.type === 'INCOME'
                                ? (isDark ? '#34D399' : '#059669')
                                : item.type === 'REMINDER'
                                  ? (isDark ? '#FBBF24' : '#D97706')
                                  : (isDark ? '#F87171' : '#DC2626')
                            }
                          />
                        </View>

                        {/* Thông tin chính */}
                        <View style={styles.recurringMainInfo}>
                          <View style={styles.recurringTitleRow}>
                            <Text style={[styles.recurringTitle, isDark && { color: themeColors.textPrimary }]}>
                              {item.title}
                            </Text>
                          </View>

                          <View style={styles.recurringMetaRow}>
                            <Text style={[styles.recurringSubtitle, isDark && { color: themeColors.textSecondary }]}>{item.subtitle}</Text>
                            <Text style={[styles.recurringDot, isDark && { color: themeColors.textMuted }]}>•</Text>
                            {(() => {
                              if (isMonthly) {
                                let dayDisplay = 'Hàng tháng';
                                if (item.date) {
                                  const p = item.date.split('-');
                                  if (p.length === 3) {
                                    const [targetYearStr, targetMonthStr] = listSelectedMonth.split('-');
                                    dayDisplay = `${p[2]}/${targetMonthStr}/${targetYearStr}`;
                                  }
                                }
                                return (
                                  <Text style={[styles.recurringNextDate, isDark && { color: themeColors.textSecondary }]}>
                                    Kế tiếp: <Text style={{ fontWeight: '700', color: isDark ? themeColors.textPrimary : undefined }}>{dayDisplay}</Text>
                                  </Text>
                                );
                              }

                              // Khoản nợ hoặc giao dịch 1 lần
                              return (
                                <Text style={[styles.recurringNextDate, isDark && { color: themeColors.textSecondary }]}>
                                  Ngày: <Text style={{ fontWeight: '700', color: isDark ? themeColors.textPrimary : undefined }}>{formatDDMMYYYY(item.date) || '—'}</Text>
                                </Text>
                              );
                            })()}
                          </View>
                        </View>

                        {/* Bên phải: Trạng thái Đang hoạt động / Đã hoàn thành & Số tiền */}
                        <View style={styles.recurringRightSide}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isCompleted
                                  ? (isDark ? themeColors.surfaceSubtle : '#F1F5F9')
                                  : (isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5'),
                                marginBottom: 4,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color: isCompleted
                                    ? (isDark ? themeColors.textMuted : '#64748B')
                                    : (isDark ? '#34D399' : '#059669'),
                                },
                              ]}
                            >
                              {isCompleted ? 'Đã hoàn thành' : 'Đang hoạt động'}
                            </Text>
                          </View>
                          {item.amount > 0 && (
                            <Text
                              style={[
                                styles.recurringAmountText,
                                { color: isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
                              ]}
                            >
                              {isIncome ? '+' : '-'}{formatVND(item.amount)}
                            </Text>
                          )}
                        </View>
                        <FinanceIcon name="chevron-right" size={18} color={isDark ? themeColors.textMuted : "#94A3B8"} />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* NÚT THÊM LỊCH MỚI */}
              <Pressable
                style={styles.primaryActionButton}
                onPress={() => {
                  setEditingScheduleId(null);
                  setFormName('');
                  setFormAmount('');
                  setFormNote('');
                  setFormFreq('MONTHLY');
                  setFormDayOfMonth(new Date().getDate());
                  setShowAddModal(true);
                }}
              >
                <FinanceIcon name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Thêm lịch mới</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* ================= MODAL TẠO LỊCH ĐỊNH KỲ MỚI ================= */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
            {/* Header Modal */}
            <View style={[styles.modalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                {editingScheduleId ? 'Chỉnh sửa lịch tài chính' : 'Tạo lịch tài chính mới'}
              </Text>
              <Pressable
                onPress={() => setShowAddModal(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
              >
                <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : "#64748B"} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 1. Loại lịch: 2 nút Pill to */}
              <View style={styles.webFormGroup}>
                <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Loại lịch</Text>
                <View style={[styles.webTypePillRow, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <Pressable
                    style={[
                      styles.webTypePillBtn,
                      isDark && { backgroundColor: 'transparent' },
                      formScheduleType === 'TRANSACTION'
                        ? (isDark ? { backgroundColor: themeColors.surface, borderColor: themeColors.accentGreen, borderWidth: 1 } : styles.webTypePillBtnTxActive)
                        : styles.webTypePillBtnInactive,
                    ]}
                    onPress={() => setFormScheduleType('TRANSACTION')}
                  >
                    <FinanceIcon
                      name="arrows"
                      size={16}
                      color={formScheduleType === 'TRANSACTION' ? (isDark ? themeColors.accentGreen : '#07543F') : (isDark ? themeColors.textMuted : '#64748B')}
                    />
                    <Text
                      style={[
                        styles.webTypePillText,
                        isDark && { color: themeColors.textSecondary },
                        formScheduleType === 'TRANSACTION'
                          ? (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.webTypePillTextTxActive)
                          : styles.webTypePillTextInactive,
                      ]}
                    >
                      Giao dịch định kỳ
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.webTypePillBtn,
                      isDark && { backgroundColor: 'transparent' },
                      formScheduleType === 'REMINDER'
                        ? (isDark ? { backgroundColor: themeColors.surface, borderColor: '#F59E0B', borderWidth: 1 } : styles.webTypePillBtnRemActive)
                        : styles.webTypePillBtnInactive,
                    ]}
                    onPress={() => setFormScheduleType('REMINDER')}
                  >
                    <FinanceIcon
                      name="bell"
                      size={16}
                      color={formScheduleType === 'REMINDER' ? '#F59E0B' : (isDark ? themeColors.textMuted : '#64748B')}
                    />
                    <Text
                      style={[
                        styles.webTypePillText,
                        isDark && { color: themeColors.textSecondary },
                        formScheduleType === 'REMINDER'
                          ? (isDark ? { color: '#F59E0B', fontWeight: '700' } : styles.webTypePillTextRemActive)
                          : styles.webTypePillTextInactive,
                      ]}
                    >
                      Chỉ nhắc nhở
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2. Tên khoản / Nhắc hẹn * */}
              <View style={styles.webFormGroup}>
                <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Tên khoản / Nhắc hẹn *</Text>
                <TextInput
                  style={[styles.webFormInput, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                  placeholder="Ví dụ: Tiền lương, Tiền nhà tháng 10, Đóng bảo hiểm..."
                  placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* 3. Tần suất lặp lại & Thiết lập thời gian (2 Cột với Dropdown Select) */}
              <View style={styles.webTwoColRow}>
                {/* Cột trái: Tần suất (Dropdown Thả Xuống) */}
                <View style={styles.webColHalf}>
                  <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Tần suất lặp lại</Text>
                  <Pressable
                    onPress={() => setSchedulePickerType('FREQ')}
                    style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                  >
                    <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {formFreq === 'DAILY'
                        ? 'Hàng ngày'
                        : formFreq === 'WEEKLY'
                          ? 'Hàng tuần'
                          : formFreq === 'MONTHLY'
                            ? 'Hàng tháng'
                            : 'Hàng năm'}
                    </Text>
                    <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>
                </View>

                {/* Cột phải */}
                <View style={styles.webColHalf}>
                  {formFreq === 'WEEKLY' ? (
                    <>
                      <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Vào thứ trong tuần *</Text>
                      <Pressable
                        onPress={() => setSchedulePickerType('DAY_OF_WEEK')}
                        style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                      >
                        <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                          {formDayOfWeek === 1
                            ? 'Thứ Hai hàng tuần'
                            : formDayOfWeek === 2
                              ? 'Thứ Ba hàng tuần'
                              : formDayOfWeek === 3
                                ? 'Thứ Tư hàng tuần'
                                : formDayOfWeek === 4
                                  ? 'Thứ Năm hàng tuần'
                                  : formDayOfWeek === 5
                                    ? 'Thứ Sáu hàng tuần'
                                    : formDayOfWeek === 6
                                      ? 'Thứ Bảy hàng tuần'
                                      : 'Chủ Nhật hàng tuần'}
                        </Text>
                        <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                      </Pressable>
                    </>
                  ) : formFreq === 'MONTHLY' ? (
                    <>
                      <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Vào ngày trong tháng *</Text>
                      <Pressable
                        onPress={() => setSchedulePickerType('DAY_OF_MONTH')}
                        style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                      >
                        <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                          Ngày {formDayOfMonth} hàng tháng
                        </Text>
                        <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                      </Pressable>
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <AppDatePicker
                        value={formStartDate}
                        onChange={setFormStartDate}
                        label="Bắt đầu từ ngày *"
                        placeholder="DD/MM/YYYY"
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* 4. Khối giao dịch định kỳ (nếu là TRANSACTION) */}
              {formScheduleType === 'TRANSACTION' ? (
                <View style={[styles.webTxCardBox, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  {/* 3 Tabs: Chi tiêu | Thu nhập | Chuyển tiền */}
                  <View style={[styles.webTxTabRow, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                    {[
                      { key: 'EXPENSE' as TransactionType, label: 'Chi tiêu' },
                      { key: 'INCOME' as TransactionType, label: 'Thu nhập' },
                      { key: 'TRANSFER' as TransactionType, label: 'Chuyển tiền' },
                    ].map((t) => (
                      <Pressable
                        key={t.key}
                        style={[
                          styles.webTxTabBtn,
                          isDark && { backgroundColor: 'transparent' },
                          formType === t.key && styles.webTxTabBtnActive,
                          formType === t.key && isDark && { backgroundColor: themeColors.surfaceSubtle, shadowOpacity: 0 },
                        ]}
                        onPress={() => {
                          setFormType(t.key);
                          const validCat = categories.find((c) => (c as any).kind === t.key);
                          if (validCat) setFormCategoryId(validCat.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.webTxTabBtnText,
                            isDark && { color: themeColors.textSecondary },
                            formType === t.key && styles.webTxTabBtnTextActive,
                            formType === t.key && isDark && { color: themeColors.accentGreen, fontWeight: '700' },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Số tiền (VNĐ) * */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Số tiền (VNĐ) *</Text>
                    <TextInput
                      style={[styles.webAmountInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                      placeholder="0"
                      placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                      keyboardType="numeric"
                      value={formAmount}
                      onChangeText={(val) => {
                        const clean = val.replace(/[^\d]/g, '');
                        setFormAmount(clean ? Number(clean).toLocaleString('vi-VN') : '');
                      }}
                    />
                  </View>

                  {/* Ví / Tài khoản & Danh mục (2 cột - Chọn bằng Dropdown thả xuống) */}
                  <View style={[styles.webTwoColRow, { marginTop: 12 }]}>
                    <View style={styles.webColHalf}>
                      <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Ví / Tài khoản</Text>
                      <Pressable
                        onPress={() => setSchedulePickerType('ACCOUNT')}
                        style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          {(() => {
                            const selAcc = accounts.find((a) => a.id === formAccountId);
                            if (!selAcc) return <Text style={[styles.modernSelectText, isDark && { color: themeColors.textSecondary }]}>Chọn ví tài khoản</Text>;
                            return (
                              <>
                                <AccountBadge account={selAcc} size={20} />
                                <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                                  {selAcc.name}
                                </Text>
                              </>
                            );
                          })()}
                        </View>
                        <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                      </Pressable>
                    </View>

                    <View style={styles.webColHalf}>
                      {formType === 'TRANSFER' ? (
                        <>
                          <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Đến ví / TK</Text>
                          <Pressable
                            onPress={() => setSchedulePickerType('TO_ACCOUNT')}
                            style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              {(() => {
                                const selAcc = accounts.find((a) => a.id === formToAccountId);
                                if (!selAcc) return <Text style={[styles.modernSelectText, isDark && { color: themeColors.textSecondary }]}>Chọn ví đích</Text>;
                                return (
                                  <>
                                    <AccountBadge account={selAcc} size={20} />
                                    <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                                      {selAcc.name}
                                    </Text>
                                  </>
                                );
                              })()}
                            </View>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Danh mục</Text>
                          <Pressable
                            onPress={() => setSchedulePickerType('CATEGORY')}
                            style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                          >
                            <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                              {(() => {
                                const selCat = categories.find((c) => c.id === formCategoryId);
                                if (!selCat) return 'Chọn danh mục';
                                return selCat.name;
                              })()}
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                /* NỘI DUNG CHỈ NHẮC NHỞ */
                <View style={styles.webFormGroup}>
                  <Text style={[styles.webFormLabel, isDark && { color: themeColors.textSecondary }]}>Nội dung chuông nhắc *</Text>
                  <TextInput
                    style={[styles.webFormInput, { height: 74, textAlignVertical: 'top' }, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                    placeholder="Ví dụ: Nhớ thanh toán nợ trước hạn để tránh bị phạt phí trễ..."
                    placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                    multiline
                    value={formNote}
                    onChangeText={setFormNote}
                  />
                </View>
              )}

              {/* 5. Khối Thông báo đẩy trước hạn (Dropdown Thả Xuống) */}
              <View style={[styles.webNotifyCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.webNotifyTitle, isDark && { color: themeColors.textPrimary }]}>Thông báo đẩy trước hạn</Text>
                  <Text style={[styles.webNotifySub, isDark && { color: themeColors.textSecondary }]}>
                    Nhắc nhở qua app trước khi tới ngày thanh toán
                  </Text>
                </View>

                <View style={styles.webNotifyRightWrap}>
                  <Pressable
                    disabled={!formNotificationEnabled}
                    onPress={() => setSchedulePickerType('NOTIFY_TIME')}
                    style={[
                      styles.modernSelectDropdownLight,
                      { height: 36, minWidth: 120, paddingHorizontal: 10 },
                      isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                      !formNotificationEnabled && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {formNotifyBeforeHours === '0'
                        ? 'Đúng ngày'
                        : formNotifyBeforeHours === '24'
                          ? 'Trước 1 ngày'
                          : formNotifyBeforeHours === '48'
                            ? 'Trước 2 ngày'
                            : formNotifyBeforeHours === '72'
                              ? 'Trước 3 ngày'
                              : 'Trước 1 tuần'}
                    </Text>
                    <FinanceIcon name="chevron-down" size={14} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>

                  {/* Checkbox toggle */}
                  <Pressable
                    style={[
                      styles.webCheckbox,
                      isDark && { borderColor: themeColors.cardBorder, backgroundColor: themeColors.surface },
                      formNotificationEnabled && styles.webCheckboxActive,
                    ]}
                    onPress={() => setFormNotificationEnabled(!formNotificationEnabled)}
                  >
                    {formNotificationEnabled && (
                      <FinanceIcon name="check" size={14} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            {/* Nút lưu */}
            <View style={[styles.modalFooter, isDark && { borderTopColor: themeColors.cardBorder }]}>
              <Pressable
                style={[styles.webModalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveSchedule}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.webModalSubmitText}>
                    {editingScheduleId ? 'Lưu thay đổi' : 'Lưu vào lịch'}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* ========================================================
               DROPDOWN PICKER OVERLAY SHEET (Học từ DebtScreen)
               ======================================================== */}
            {schedulePickerType !== 'NONE' && (
              <View style={[StyleSheet.absoluteFill, styles.pickerModalBackdrop]}>
                <View style={[styles.pickerModalBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                  {/* Header Picker */}
                  <View style={[styles.pickerModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                      {schedulePickerType === 'FREQ' && 'Chọn tần suất lặp lại'}
                      {schedulePickerType === 'DAY_OF_WEEK' && 'Chọn thứ lặp lại hàng tuần'}
                      {schedulePickerType === 'DAY_OF_MONTH' && 'Chọn ngày lặp lại trong tháng'}
                      {schedulePickerType === 'ACCOUNT' && 'Chọn ví / tài khoản nguồn'}
                      {schedulePickerType === 'TO_ACCOUNT' && 'Chọn ví / tài khoản đích'}
                      {schedulePickerType === 'CATEGORY' && 'Chọn danh mục'}
                      {schedulePickerType === 'NOTIFY_TIME' && 'Thời gian gửi thông báo nhắc'}
                    </Text>
                    <Pressable
                      onPress={() => setSchedulePickerType('NONE')}
                      hitSlop={12}
                    >
                      <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : "#64748B"} />
                    </Pressable>
                  </View>

                  <ScrollView style={{ marginTop: 10, maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                    {/* 1. Chọn Tần suất */}
                    {schedulePickerType === 'FREQ' && (
                      <>
                        {[
                          { key: 'WEEKLY', label: 'Hàng tuần' },
                          { key: 'MONTHLY', label: 'Hàng tháng' },
                          { key: 'DAILY', label: 'Hàng ngày' },
                          { key: 'YEARLY', label: 'Hàng năm' },
                        ].map((item) => (
                          <Pressable
                            key={item.key}
                            onPress={() => {
                              setFormFreq(item.key as any);
                              setSchedulePickerType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formFreq === item.key && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                formFreq === item.key && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {item.label}
                            </Text>
                            {formFreq === item.key && (
                              <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                            )}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 2. Chọn Thứ trong tuần */}
                    {schedulePickerType === 'DAY_OF_WEEK' && (
                      <>
                        {[
                          { key: 1, label: 'Thứ Hai hàng tuần' },
                          { key: 2, label: 'Thứ Ba hàng tuần' },
                          { key: 3, label: 'Thứ Tư hàng tuần' },
                          { key: 4, label: 'Thứ Năm hàng tuần' },
                          { key: 5, label: 'Thứ Sáu hàng tuần' },
                          { key: 6, label: 'Thứ Bảy hàng tuần' },
                          { key: 7, label: 'Chủ Nhật hàng tuần' },
                        ].map((it) => (
                          <Pressable
                            key={it.key}
                            onPress={() => {
                              setFormDayOfWeek(it.key);
                              setSchedulePickerType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formDayOfWeek === it.key && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                formDayOfWeek === it.key && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {it.label}
                            </Text>
                            {formDayOfWeek === it.key && (
                              <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                            )}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 3. Chọn Ngày trong tháng (1 - 31) */}
                    {schedulePickerType === 'DAY_OF_MONTH' && (
                      <>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <Pressable
                            key={d}
                            onPress={() => {
                              setFormDayOfMonth(d);
                              setSchedulePickerType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formDayOfMonth === d && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                formDayOfMonth === d && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                              ]}
                            >
                              Ngày {d} hàng tháng
                            </Text>
                            {formDayOfMonth === d && (
                              <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                            )}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 4. Chọn Ví / Tài khoản */}
                    {schedulePickerType === 'ACCOUNT' && (
                      <>
                        {accounts.map((acc) => (
                          <Pressable
                            key={acc.id}
                            onPress={() => {
                              setFormAccountId(acc.id);
                              setSchedulePickerType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formAccountId === acc.id && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <AccountBadge account={acc} size={34} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[
                                  styles.pickerItemText,
                                  isDark && { color: themeColors.textPrimary },
                                  formAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                                ]}
                              >
                                {acc.name}
                              </Text>
                              <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                                Số dư: {formatVND(acc.balance)}
                              </Text>
                            </View>
                            {formAccountId === acc.id && (
                              <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                            )}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 5. Chọn Ví đích (Chuyển tiền) */}
                    {schedulePickerType === 'TO_ACCOUNT' && (
                      <>
                        {accounts
                          .filter((a) => a.id !== formAccountId)
                          .map((acc) => (
                            <Pressable
                              key={acc.id}
                              onPress={() => {
                                setFormToAccountId(acc.id);
                                setSchedulePickerType('NONE');
                              }}
                              style={[
                                styles.pickerItemRow,
                                isDark && { borderBottomColor: themeColors.cardBorder },
                                formToAccountId === acc.id && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                              ]}
                            >
                              <AccountBadge account={acc} size={34} />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text
                                  style={[
                                    styles.pickerItemText,
                                    isDark && { color: themeColors.textPrimary },
                                    formToAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                                  ]}
                                >
                                  {acc.name}
                                </Text>
                                <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                                  Số dư: {formatVND(acc.balance)}
                                </Text>
                              </View>
                              {formToAccountId === acc.id && (
                                <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                              )}
                            </Pressable>
                          ))}
                      </>
                    )}

                    {/* 6. Chọn Danh mục */}
                    {schedulePickerType === 'CATEGORY' && (
                      <>
                        {categories
                          .filter((c) => !(c as any).kind || (c as any).kind === formType)
                          .map((cat) => (
                            <Pressable
                              key={cat.id}
                              onPress={() => {
                                setFormCategoryId(cat.id);
                                setSchedulePickerType('NONE');
                              }}
                              style={[
                                styles.pickerItemRow,
                                isDark && { borderBottomColor: themeColors.cardBorder },
                                formCategoryId === cat.id && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pickerItemText,
                                  isDark && { color: themeColors.textPrimary },
                                  formCategoryId === cat.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                                ]}
                              >
                                {cat.name}
                              </Text>
                              {formCategoryId === cat.id && (
                                <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                              )}
                            </Pressable>
                          ))}
                      </>
                    )}

                    {/* 7. Chọn Thời gian thông báo */}
                    {schedulePickerType === 'NOTIFY_TIME' && (
                      <>
                        {[
                          { val: '0', label: 'Báo đúng ngày đến hạn' },
                          { val: '24', label: 'Nhắc trước 1 ngày (Khuyên dùng)' },
                          { val: '48', label: 'Nhắc trước 2 ngày' },
                          { val: '72', label: 'Nhắc trước 3 ngày' },
                          { val: '168', label: 'Nhắc trước 1 tuần (7 ngày)' },
                        ].map((it) => (
                          <Pressable
                            key={it.val}
                            onPress={() => {
                              setFormNotifyBeforeHours(it.val);
                              setSchedulePickerType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formNotifyBeforeHours === it.val && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                formNotifyBeforeHours === it.val && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {it.label}
                            </Text>
                            {formNotifyBeforeHours === it.val && (
                              <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />
                            )}
                          </Pressable>
                        ))}
                      </>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL CHỌN THÁNG LỌC ================= */}
      <Modal
        visible={showMonthPickerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMonthPickerModal(false)}
      >
        <Pressable
          style={styles.monthPickerOverlay}
          onPress={() => setShowMonthPickerModal(false)}
        >
          <View style={[styles.monthPickerCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
            <View style={[styles.monthPickerHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <Text style={[styles.monthPickerTitle, isDark && { color: themeColors.textPrimary }]}>Chọn tháng hiển thị</Text>
              <Pressable
                onPress={() => setShowMonthPickerModal(false)}
                hitSlop={8}
                style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
              >
                <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : "#64748B"} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {availableMonthsList.map((m) => {
                const isSelected = listSelectedMonth === m.key;
                return (
                  <Pressable
                    key={m.key}
                    style={[
                      styles.monthPickerItem,
                      isDark && { borderBottomColor: themeColors.cardBorder },
                      isSelected && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.monthPickerItemActive),
                    ]}
                    onPress={() => {
                      setListSelectedMonth(m.key);
                      setShowMonthPickerModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthPickerItemText,
                        isDark && { color: themeColors.textPrimary },
                        isSelected && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.monthPickerItemTextActive),
                      ]}
                    >
                      {m.label}
                    </Text>
                    {isSelected && (
                      <FinanceIcon name="check" size={18} color={isDark ? themeColors.accentGreen : "#00875A"} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ================= MODAL XEM CHI TIẾT SỰ KIỆN / LỊCH ================= */}
      <Modal
        visible={!!selectedDetailItem}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDetailItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
            {/* Header Modal Chi tiết */}
            <View style={[styles.modalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>Chi tiết lịch tài chính</Text>
              <Pressable
                onPress={() => setSelectedDetailItem(null)}
                hitSlop={12}
                style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
              >
                <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : "#64748B"} />
              </Pressable>
            </View>

            {selectedDetailItem && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Hero Box Tiền & Trạng thái */}
                <View
                  style={[
                    styles.detailHeroBox,
                    isDark
                      ? {
                          backgroundColor:
                            selectedDetailItem.type === 'INCOME'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : selectedDetailItem.type === 'REMINDER'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                          borderColor: themeColors.cardBorder,
                          borderWidth: 1,
                        }
                      : {
                          backgroundColor:
                            selectedDetailItem.type === 'INCOME'
                              ? '#ECFDF5'
                              : selectedDetailItem.type === 'REMINDER'
                                ? '#FFF8E6'
                                : '#FEF2F2',
                        },
                  ]}
                >
                  <View
                    style={[
                      styles.detailHeroIcon,
                      isDark
                        ? {
                            backgroundColor:
                              selectedDetailItem.type === 'INCOME'
                                ? 'rgba(16, 185, 129, 0.22)'
                                : selectedDetailItem.type === 'REMINDER'
                                  ? 'rgba(245, 158, 11, 0.22)'
                                  : 'rgba(239, 68, 68, 0.22)',
                          }
                        : {
                            backgroundColor:
                              selectedDetailItem.type === 'INCOME'
                                ? '#D1FAE5'
                                : selectedDetailItem.type === 'REMINDER'
                                  ? '#FEF3C7'
                                  : '#FEE2E2',
                          },
                    ]}
                  >
                    <FinanceIcon
                      name={(selectedDetailItem.icon as any) || 'calendar'}
                      size={28}
                      color={
                        selectedDetailItem.type === 'INCOME'
                          ? (isDark ? '#34D399' : '#059669')
                          : selectedDetailItem.type === 'REMINDER'
                            ? (isDark ? '#FBBF24' : '#D97706')
                            : (isDark ? '#F87171' : '#DC2626')
                      }
                    />
                  </View>

                  <Text style={[styles.detailHeroTitle, isDark && { color: themeColors.textPrimary }]}>{selectedDetailItem.title}</Text>

                  {selectedDetailItem.amount > 0 ? (
                    <Text
                      style={[
                        styles.detailHeroAmount,
                        {
                          color:
                            selectedDetailItem.type === 'INCOME'
                              ? (isDark ? '#34D399' : '#059669')
                              : (isDark ? '#F87171' : '#DC2626'),
                        },
                      ]}
                    >
                      {selectedDetailItem.type === 'INCOME' ? '+' : '-'}
                      {formatVND(selectedDetailItem.amount)}
                    </Text>
                  ) : (
                    <Text style={[styles.detailHeroAmount, { color: isDark ? '#FBBF24' : '#B45309', fontSize: 18 }]}>
                      Chỉ gửi thông báo nhắc nhở
                    </Text>
                  )}

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        marginTop: 8,
                        backgroundColor:
                          selectedDetailItem.status === 'COMPLETED' ||
                          selectedDetailItem.status === 'PAID' ||
                          selectedDetailItem.status === 'PAID_OFF'
                            ? (isDark ? themeColors.surfaceSubtle : '#F1F5F9')
                            : (isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            selectedDetailItem.status === 'COMPLETED' ||
                            selectedDetailItem.status === 'PAID' ||
                            selectedDetailItem.status === 'PAID_OFF'
                              ? (isDark ? themeColors.textMuted : '#64748B')
                              : (isDark ? '#34D399' : '#059669'),
                        },
                      ]}
                    >
                      {selectedDetailItem.status === 'COMPLETED' ||
                      selectedDetailItem.status === 'PAID' ||
                      selectedDetailItem.status === 'PAID_OFF'
                        ? 'Đã hoàn thành'
                        : 'Đang hoạt động'}
                    </Text>
                  </View>
                </View>

                {/* Danh sách thông tin chi tiết */}
                <View style={[styles.detailInfoCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Hình thức:</Text>
                    <Text style={[styles.detailInfoValue, isDark && { color: themeColors.textPrimary }]}>
                      {selectedDetailItem.type === 'INCOME'
                        ? 'Thu nhập định kỳ'
                        : selectedDetailItem.type === 'EXPENSE'
                          ? 'Chi tiêu / Khoản nợ'
                          : 'Nhắc nhở hẹn'}
                    </Text>
                  </View>

                  <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Chu kỳ lặp:</Text>
                    <Text style={[styles.detailInfoValue, { color: isDark ? themeColors.accentGreen : '#07543F' }]}>
                      {selectedDetailItem.subtitle || 'Định kỳ'}
                    </Text>
                  </View>

                  <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Ngày đến hạn / Kế tiếp:</Text>
                    <Text style={[styles.detailInfoValue, { fontWeight: '800', color: isDark ? themeColors.textPrimary : undefined }]}>
                      {formatDDMMYYYY(selectedDetailItem.date) || selectedDetailItem.date || 'Không xác định'}
                    </Text>
                  </View>

                  {/* Nếu là lịch từ backend schedules */}
                  {selectedDetailItem.rawItem?.transaction_template?.account && (
                    <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                      <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Ví / Tài khoản:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AccountBadge
                          account={{ name: selectedDetailItem.rawItem.transaction_template.account }}
                          size={18}
                        />
                        <Text style={[styles.detailInfoValue, isDark && { color: themeColors.textPrimary }]}>
                          {selectedDetailItem.rawItem.transaction_template.account}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedDetailItem.rawItem?.transaction_template?.category && (
                    <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                      <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Danh mục:</Text>
                      <Text style={[styles.detailInfoValue, isDark && { color: themeColors.textPrimary }]}>
                        {selectedDetailItem.rawItem.transaction_template.category}
                      </Text>
                    </View>
                  )}

                  {/* Nếu có ghi chú hoặc reminder_message */}
                  {(selectedDetailItem.rawItem?.reminder_message || selectedDetailItem.rawItem?.note || selectedDetailItem.rawItem?.description) && (
                    <View style={[styles.detailInfoRow, { flexDirection: 'column', gap: 4 }, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                      <Text style={[styles.detailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Ghi chú / Nội dung chuông nhắc:</Text>
                      <Text style={[styles.detailInfoValue, { fontWeight: '400', color: isDark ? themeColors.textPrimary : '#475569', marginTop: 2 }]}>
                        {selectedDetailItem.rawItem?.reminder_message || selectedDetailItem.rawItem?.note || selectedDetailItem.rawItem?.description}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Hộp chỉ dẫn nếu là khoản nợ từ Quản lý nợ */}
                {selectedDetailItem.id.startsWith('debt_') && (
                  <View style={[styles.debtGuideBox, isDark && { backgroundColor: 'rgba(2, 132, 199, 0.12)', borderColor: themeColors.cardBorder }]}>
                    <View style={styles.debtGuideIconWrap}>
                      <FinanceIcon name="info" size={18} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.debtGuideTitle, isDark && { color: '#38BDF8' }]}>Khoản nợ liên kết</Text>
                      <Text style={[styles.debtGuideDesc, isDark && { color: themeColors.textSecondary }]}>
                        Lịch này được tự động đồng bộ từ mục Quản lý nợ. Để chỉnh sửa số tiền, hạn trả hoặc xóa khoản nợ, vui lòng vào màn hình Quản lý nợ.
                      </Text>
                      {onNavigateToDebts && (
                        <Pressable
                          style={styles.debtGuideActionLink}
                          onPress={() => {
                            setSelectedDetailItem(null);
                            onNavigateToDebts();
                          }}
                        >
                          <Text style={[styles.debtGuideActionText, isDark && { color: '#38BDF8' }]}>Mở Quản lý nợ</Text>
                          <FinanceIcon name="arrow-right" size={14} color="#38BDF8" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {/* Các nút hành động: Xóa, Sửa, Đóng */}
                <View style={styles.detailActionButtonsRow}>
                  {/* Nút XÓA */}
                  <Pressable
                    style={[styles.detailActionBtn, styles.detailBtnDelete, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.16)' }]}
                    onPress={async () => {
                      if (selectedDetailItem.id.startsWith('debt_')) {
                        Alert.alert(
                          'Khoản nợ liên kết',
                          'Khoản nợ này được liên kết từ Quản lý nợ. Bạn vui lòng vào màn hình Quản lý nợ để xóa.',
                          [
                            { text: 'Đóng', style: 'cancel' },
                            onNavigateToDebts
                              ? {
                                  text: 'Đến Quản lý nợ',
                                  onPress: () => {
                                    setSelectedDetailItem(null);
                                    onNavigateToDebts();
                                  },
                                }
                              : { text: 'OK' },
                          ]
                        );
                        return;
                      }

                      const schedId = Number(selectedDetailItem.id.replace('sched_', ''));
                      Alert.alert('Xác nhận xóa', `Bạn có chắc chắn muốn xóa lịch "${selectedDetailItem.title}"?`, [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await scheduleApi.deleteSchedule(schedId);
                              Alert.alert('Thành công', 'Đã xóa lịch tài chính');
                              setSelectedDetailItem(null);
                              loadAllData();
                            } catch (err: any) {
                              Alert.alert('Lỗi', err.message || 'Không thể xóa lịch');
                            }
                          },
                        },
                      ]);
                    }}
                  >
                    <FinanceIcon name="trash" size={16} color="#EF4444" />
                    <Text style={[styles.detailBtnDeleteText, isDark && { color: '#EF4444' }]}>Xóa</Text>
                  </Pressable>

                  {/* Nút SỬA */}
                  <Pressable
                    style={[styles.detailActionBtn, styles.detailBtnEdit, isDark && { backgroundColor: 'rgba(13, 148, 136, 0.16)' }]}
                    onPress={() => {
                      if (selectedDetailItem.id.startsWith('debt_')) {
                        Alert.alert(
                          'Khoản nợ liên kết',
                          'Khoản nợ này được quản lý riêng. Bạn vui lòng vào màn hình Quản lý nợ để sửa.',
                          [
                            { text: 'Đóng', style: 'cancel' },
                            onNavigateToDebts
                              ? {
                                  text: 'Đến Quản lý nợ',
                                  onPress: () => {
                                    setSelectedDetailItem(null);
                                    onNavigateToDebts();
                                  },
                                }
                              : { text: 'OK' },
                          ]
                        );
                        return;
                      }

                      // Mở form chỉnh sửa lịch tài chính
                      const schedItem = selectedDetailItem.rawItem;
                      const schedId = Number(selectedDetailItem.id.replace('sched_', ''));
                      setEditingScheduleId(schedId);

                      setFormName(schedItem?.name || selectedDetailItem.title);
                      setFormScheduleType(schedItem?.schedule_type || 'TRANSACTION');

                      const tmpl = schedItem?.transaction_template || schedItem?.transactionTemplate;
                      if (tmpl) {
                        setFormType(tmpl.transaction_type || tmpl.type || 'INCOME');
                        setFormAmount(tmpl.amount ? String(tmpl.amount) : '');
                        if (tmpl.account_id || tmpl.accountId) setFormAccountId(tmpl.account_id || tmpl.accountId);
                        if (tmpl.to_account_id || tmpl.toAccountId) setFormToAccountId(tmpl.to_account_id || tmpl.toAccountId);
                        if (tmpl.category_id || tmpl.categoryId) setFormCategoryId(tmpl.category_id || tmpl.categoryId);
                        setFormNote(tmpl.note || tmpl.description || '');
                      } else {
                        setFormAmount(selectedDetailItem.amount ? String(selectedDetailItem.amount) : '');
                        setFormNote(schedItem?.reminder_message || '');
                      }

                      // Parse rrule
                      const rrule = schedItem?.recurrence_rule || '';
                      if (rrule.includes('FREQ=DAILY')) {
                        setFormFreq('DAILY');
                      } else if (rrule.includes('FREQ=WEEKLY')) {
                        setFormFreq('WEEKLY');
                      } else if (rrule.includes('FREQ=YEARLY')) {
                        setFormFreq('YEARLY');
                      } else {
                        setFormFreq('MONTHLY');
                        const m = rrule.match(/BYMONTHDAY=(\d+)/);
                        if (m) setFormDayOfMonth(parseInt(m[1], 10));
                      }

                      if (schedItem?.start_date || schedItem?.startDate) {
                        const d = schedItem.start_date || schedItem.startDate;
                        setFormStartDate(d ? new Date(d) : null);
                      }

                      setSelectedDetailItem(null);
                      setShowAddModal(true);
                    }}
                  >
                    <FinanceIcon name="edit" size={16} color={isDark ? '#2DD4BF' : "#0D9488"} />
                    <Text style={[styles.detailBtnEditText, isDark && { color: '#2DD4BF' }]}>Sửa</Text>
                  </Pressable>

                  {/* Nút ĐÓNG */}
                  <Pressable
                    style={[styles.detailActionBtn, styles.detailBtnClose, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                    onPress={() => setSelectedDetailItem(null)}
                  >
                    <FinanceIcon name="close" size={16} color={isDark ? themeColors.textSecondary : "#475569"} />
                    <Text style={[styles.detailBtnCloseText, isDark && { color: themeColors.textSecondary }]}>Đóng</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFCFB',
    minHeight: 52,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleLeft: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 12,
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006B46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#006B46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addScheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabBarPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 30,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 26,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonActiveDark: {
    backgroundColor: '#0F5132',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  tabButtonTextActiveDark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    flex: 1,
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroBannerWrap: {
    backgroundColor: '#0E964E',
    borderRadius: 22,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 96,
    overflow: 'visible',
    marginBottom: 16,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBannerBg: {
    borderRadius: 22,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 8,
    zIndex: 2,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 10,
    color: '#D1FAE5',
    lineHeight: 14,
    fontWeight: '500',
  },
  heroBannerImage: {
    width: 135,
    height: 104,
    zIndex: 1,
    marginRight: -6,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 16,
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  monthYearTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekDayText: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#00875A',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayNumberDimmed: {
    color: '#CBD5E1',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: '#00875A',
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    marginTop: 1.5,
    minHeight: 5,
  },
  eventDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dayEventsSection: {
    marginBottom: 20,
  },
  dayEventsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayEventsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayEventsDateSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyDayWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  emptyDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDaySub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dayEventsList: {
    gap: 10,
    marginBottom: 16,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  eventIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfoBox: {
    flex: 1,
    paddingRight: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  eventAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionButton: {
    height: 50,
    backgroundColor: '#006B46',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006B46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryContainerWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  summaryGrid2x2: {
    marginBottom: 14,
    gap: 10,
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCardGrid: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'space-between',
    minHeight: 74,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardHeroGrid: {
    backgroundColor: '#006B46',
    borderColor: '#005537',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statCardNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statCardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  chipButtonActive: {
    backgroundColor: '#006B46',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  monthPickerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  monthPickerItemActive: {
    backgroundColor: '#ECFDF5',
  },
  monthPickerItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  monthPickerItemTextActive: {
    color: '#00875A',
    fontWeight: '700',
  },
  listCardsWrap: {
    gap: 10,
    marginBottom: 20,
  },
  recurringItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recurringIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recurringMainInfo: {
    flex: 1,
    paddingRight: 10,
  },
  recurringTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  recurringTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recurringMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  recurringSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  recurringDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  recurringNextDate: {
    fontSize: 12,
    color: '#475569',
  },
  recurringRightSide: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 6,
    minWidth: 90,
  },
  recurringQuotaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  recurringAmountText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginTop: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  typeOptionBtnExpense: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  typeOptionBtnIncome: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeOptionTextActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
  freqSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  freqChipActive: {
    borderColor: '#00875A',
    backgroundColor: '#00875A',
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  freqChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  accSelectChipActive: {
    borderColor: '#00875A',
    backgroundColor: '#00875A',
  },
  accSelectText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  accSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    marginTop: 14,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#006B46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ==========================================
  // WEB-MATCHING FORM STYLES (Đúng 100% Ảnh Web)
  // ==========================================
  webFormGroup: {
    marginBottom: 14,
  },
  webFormLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#34463B',
    marginBottom: 6,
  },
  webFormInput: {
    height: 44,
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#14251F',
  },
  webTypePillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  webTypePillBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  webTypePillBtnTxActive: {
    backgroundColor: '#EAF5F0',
    borderColor: '#07543F',
  },
  webTypePillBtnRemActive: {
    backgroundColor: '#FFF8E6',
    borderColor: '#B45309',
  },
  webTypePillBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8E4',
  },
  webTypePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  webTypePillTextTxActive: {
    color: '#07543F',
  },
  webTypePillTextRemActive: {
    color: '#B45309',
  },
  webTypePillTextInactive: {
    color: '#64748B',
  },
  webTwoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  webColHalf: {
    flex: 1,
  },
  webFreqPills: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  webFreqChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    backgroundColor: '#F9FBF9',
  },
  webFreqChipActive: {
    borderColor: '#07543F',
    backgroundColor: '#EAF5F0',
  },
  webFreqChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  webFreqChipTextActive: {
    color: '#07543F',
    fontWeight: '700',
  },
  webDateInputWrap: {
    height: 44,
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  webDateInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#14251F',
    padding: 0,
  },
  webTxCardBox: {
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  webTxTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  webTxTabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTxTabBtnActive: {
    backgroundColor: '#07543F',
    borderColor: '#07543F',
  },
  webTxTabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#52665A',
  },
  webTxTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webAmountInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#07543F',
  },
  webChipSelect: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    marginRight: 6,
  },
  webChipSelectActive: {
    borderColor: '#07543F',
    backgroundColor: '#EAF5F0',
  },
  webChipSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  webChipSelectTextActive: {
    color: '#07543F',
    fontWeight: '700',
  },
  webNotifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  webNotifyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#34463B',
  },
  webNotifySub: {
    fontSize: 10.5,
    color: '#718078',
    marginTop: 2,
  },
  webNotifyRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webNotifyTimeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  webNotifyTimeChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    backgroundColor: '#FFFFFF',
  },
  webNotifyTimeChipActive: {
    borderColor: '#07543F',
    backgroundColor: '#EAF5F0',
  },
  webNotifyTimeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  webNotifyTimeTextActive: {
    color: '#07543F',
    fontWeight: '700',
  },
  webCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCheckboxActive: {
    backgroundColor: '#07543F',
    borderColor: '#07543F',
  },
  webModalSubmitBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#07543F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#07543F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  webModalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* MODAL DROPDOWN PICKER SHEET (Chuẩn DebtScreen) */
  modernSelectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingHorizontal: 12,
    height: 44,
  },
  modernSelectDropdownLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FBF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingHorizontal: 12,
    height: 44,
  },
  modernSelectText: {
    fontSize: 13,
    color: '#14251F',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  modernSelectTextBold: {
    fontSize: 13,
    color: '#07543F',
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  pickerModalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 999,
  },
  pickerModalBox: {
    width: '100%',
    maxHeight: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 8,
  },
  pickerItemRowActive: {
    backgroundColor: '#F0FDF4',
  },
  pickerItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  /* STYLES MODAL CHI TIẾT LỊCH TÀI CHÍNH */
  detailHeroBox: {
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  detailHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  detailHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailHeroAmount: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  detailInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  /* STYLES HỘP HƯỚNG DẪN KHOẢN NỢ VÀ CỤM NÚT XÓA / SỬA / ĐÓNG */
  debtGuideBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  debtGuideIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  debtGuideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 2,
  },
  debtGuideDesc: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 17,
  },
  debtGuideActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  debtGuideActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  detailActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  detailBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  detailBtnDeleteText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  detailBtnEdit: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
  },
  detailBtnEditText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  detailBtnClose: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  detailBtnCloseText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  detailDeleteText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  detailCloseBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#07543F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
