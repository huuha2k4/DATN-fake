import { AppAlert as Alert, useAppDialog } from '../../../context/DialogContext';
import React, { useEffect, useState, useMemo } from 'react';
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
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import { accountApi, type AccountItem } from '../../accounts/api/accountApi';
import { AccountBadge } from '../../accounts/components/AccountBadge';
import {
  debtApi,
  type DebtItem,
  type DebtSummaryData,
  type DebtType,
  type PaymentFrequency,
  type PaymentPlanType,
} from '../api/debtApi';
import { useAppTheme } from '../../../context/ThemeContext';

interface DebtScreenProps {
  onBack?: () => void;
}

const HERO_DEBT_IMG = require('../../../assets/icons/debt_money_bag_3d.png');
const BANNER_BG_IMG = require('../../../assets/icons/groups/family_banner_clean_bg.png');
const BORROWING_3D_IMG = require('../../../assets/images/debt_borrow_icon_3d.png');
const LENDING_3D_IMG = require('../../../assets/images/debt_lend_icon_3d.png');
const DEBT_RED_BANNER_BG = require('../../../assets/images/debt_red_banner_clean.png');
const LENDING_BAG_3D = require('../../../assets/images/lending_bag_detail_3d.png');
const BORROWING_WALLET_3D = require('../../../assets/images/borrowing_wallet_detail_3d.png');

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '--/--/----';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '--:-- --/--/----';
  try {
    // Nếu chỉ có ngày YYYY-MM-DD không có giờ, bổ sung giờ hiện tại hoặc hiển thị ngày chuẩn
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr.trim())) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const parts = isoStr.trim().split('-');
      return `${hours}:${minutes} ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function formatIsoToDDMMYYYY(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return isoStr;
  }
}

// Chuyển chuỗi chỉ chứa số thành dd-mm-yyyy tự động khi gõ
function formatInputDDMMYYYY(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

// Chuyển ngược từ DD-MM-YYYY (hoặc DD/MM/YYYY) sang YYYY-MM-DD để gửi lên API backend
function parseDDMMYYYYtoIso(val?: string): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim();
  const match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  // Nếu đã là YYYY-MM-DD thì giữ nguyên
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

// Chuyển từ ngày hiện tại sang DD-MM-YYYY mặc định
function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getDaysRemaining(dueDateStr?: string, isPaidOff?: boolean): { text: string; color: string; bg: string } | null {
  if (isPaidOff) {
    return {
      text: 'Đã hoàn thành',
      color: '#059669',
      bg: '#DCFCE7',
    };
  }
  if (!dueDateStr) return null;
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Quá hạn ${Math.abs(diffDays)} ngày`,
        color: '#DC2626',
        bg: '#FEE2E2',
      };
    }
    if (diffDays <= 3) {
      return {
        text: diffDays === 0 ? 'Hôm nay' : `Còn ${diffDays} ngày`,
        color: '#DC2626',
        bg: '#FEE2E2',
      };
    }
    if (diffDays <= 15) {
      return {
        text: `Còn ${diffDays} ngày`,
        color: '#16A34A',
        bg: '#DCFCE7',
      };
    }
    return {
      text: `Còn ${diffDays} ngày`,
      color: '#D97706',
      bg: '#FEF3C7',
    };
  } catch {
    return null;
  }
}

function resolveDebtVisual(title: string, debtType: DebtType): { icon?: IconName; image?: any; color: string; bg: string } {
  // Chỉ dùng 2 icon duy nhất: Nợ (BORROWING) và Vay (LENDING)
  if (debtType === 'LENDING') {
    return { image: LENDING_3D_IMG, icon: 'lending', color: '#16A34A', bg: 'transparent' };
  }
  return { image: BORROWING_3D_IMG, icon: 'borrowing', color: '#EF4444', bg: 'transparent' };
}

type TabFilter = 'ALL' | 'BORROWING' | 'LENDING';

// 5 Khoản nợ mẫu chuẩn 100% khớp số liệu trên Banner và ảnh thiết kế
const INITIAL_DEMO_DEBTS: DebtItem[] = [
  {
    id: 'demo-debt-1',
    debtType: 'BORROWING',
    creditorName: 'Trả góp laptop',
    counterpartyName: 'Trả góp laptop',
    principalAmount: 6000000,
    paidAmount: 4500000,
    remainingAmount: 6000000,
    percentagePaid: 75,
    status: 'ACTIVE',
    paymentFrequency: 'MONTHLY',
    startDate: '2026-10-15',
    dueDate: '2026-11-15',
    description: 'Trả góp laptop 0% lãi suất',
    note: 'Trả góp laptop 0% lãi suất',
  },
  {
    id: 'demo-debt-2',
    debtType: 'BORROWING',
    creditorName: 'Vay Minh',
    counterpartyName: 'Vay Minh',
    principalAmount: 2000000,
    paidAmount: 0,
    remainingAmount: 2000000,
    percentagePaid: 0,
    status: 'ACTIVE',
    startDate: '2026-10-10',
    dueDate: '2026-11-11',
    description: 'Vay tiêu dùng ngắn hạn',
  },
  {
    id: 'demo-debt-3',
    debtType: 'BORROWING',
    creditorName: 'Vay mua xe',
    counterpartyName: 'Vay mua xe',
    principalAmount: 2800000,
    paidAmount: 0,
    remainingAmount: 2800000,
    percentagePaid: 0,
    status: 'ACTIVE',
    startDate: '2026-10-01',
    dueDate: '2026-12-01',
    description: 'Trả góp xe máy',
  },
  {
    id: 'demo-debt-4',
    debtType: 'LENDING',
    debtorName: 'Cho Nam vay',
    counterpartyName: 'Cho Nam vay',
    principalAmount: 3000000,
    paidAmount: 0,
    remainingAmount: 3000000,
    percentagePaid: 0,
    status: 'ACTIVE',
    startDate: '2026-10-15',
    dueDate: '2026-11-21',
    description: 'Cho Nam mượn đóng học phí',
  },
  {
    id: 'demo-debt-5',
    debtType: 'LENDING',
    debtorName: 'Cho Lan vay',
    counterpartyName: 'Cho Lan vay',
    principalAmount: 2000000,
    paidAmount: 1000000,
    remainingAmount: 2000000,
    percentagePaid: 50,
    status: 'ACTIVE',
    startDate: '2026-09-01',
    dueDate: '2026-12-01',
    description: 'Cho Lan mượn',
  },
];

export function DebtScreen({ onBack }: DebtScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const { confirmDelete, showSuccess, showError } = useAppDialog();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debts, setDebts] = useState<DebtItem[]>(INITIAL_DEMO_DEBTS);
  const [summary, setSummary] = useState<DebtSummaryData | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  // Tab filter: Tất cả | Đi vay | Cho nợ
  const [selectedTab, setSelectedTab] = useState<TabFilter>('ALL');

  // Ẩn / hiện số dư
  const [showBalance, setShowBalance] = useState(true);

  // ── FORM TẠO KHOẢN NỢ (CHUẨN 100% THEO DATABASE VÀ WEB) ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [submittingDebt, setSubmittingDebt] = useState(false);
  const [formType, setFormType] = useState<DebtType>('BORROWING');
  const [formPartnerName, setFormPartnerName] = useState('');
  const [formPartnerPhone, setFormPartnerPhone] = useState('');
  const [paymentPlanType, setPaymentPlanType] = useState<PaymentPlanType>('ONE_TIME');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formStartDate, setFormStartDate] = useState(getTodayDDMMYYYY());
  const [formDueDate, setFormDueDate] = useState('');
  // Trường trả theo kỳ (INSTALLMENT)
  const [formFrequency, setFormFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [formInstallmentCount, setFormInstallmentCount] = useState('3');
  const [formPeriodicAmount, setFormPeriodicAmount] = useState('');
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(new Date().getDate()); // Ngày trong tháng (1-31)
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1); // Thứ trong tuần (1: Thứ 2 ... 0: CN)
  const [formFirstPaymentDate, setFormFirstPaymentDate] = useState(getTodayDDMMYYYY());

  // Tài khoản & nhắc nhở
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [formNotifyDaysBefore, setFormNotifyDaysBefore] = useState(1);
  const [formNote, setFormNote] = useState('');

  // Dropdown Picker Modals
  const [pickerModalType, setPickerModalType] = useState<'NONE' | 'FREQ' | 'DAY_OF_MONTH' | 'DAY_OF_WEEK' | 'ACCOUNT' | 'NOTIFY_DAYS' | 'EDIT_ACCOUNT' | 'PAY_ACCOUNT'>('NONE');

  // Modal Chi tiết & Thao tác khoản nợ khi bấm vào card (Chuẩn thiết kế ảnh mẫu)
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtItem | null>(null);
  const [debtDetailLoading, setDebtDetailLoading] = useState(false);
  const [detailFullData, setDetailFullData] = useState<any | null>(null);
  const [demoPayments, setDemoPayments] = useState<Record<string, Array<{ id: string; amount: number; paymentDate: string; note?: string }>>>({
    'demo-debt-1': [
      { id: 'pay-1', amount: 1500000, paymentDate: '2026-11-05', note: 'Thanh toán đợt 3' },
      { id: 'pay-2', amount: 1500000, paymentDate: '2026-11-01', note: 'Thanh toán đợt 2' },
      { id: 'pay-3', amount: 1500000, paymentDate: '2026-10-20', note: 'Thanh toán đợt 1' },
    ],
  });

  // Modal Sửa khoản nợ (Sửa full thông tin khoản nợ)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCounterpartyName, setEditCounterpartyName] = useState('');
  const [editPartnerPhone, setEditPartnerPhone] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Ghi nhận trả nợ / thu nợ
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [paySelectedPeriod, setPaySelectedPeriod] = useState<number | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);

  // Modal Chi tiết giao dịch thanh toán trong lịch sử
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<{
    id: string;
    amount: number;
    rawDate: string;
    formattedDate: string;
    note: string;
    accountName?: string;
  } | null>(null);

  // Mở trang chi tiết khoản nợ (kèm tải dữ liệu từ API hoặc dữ liệu demo)
  const handleOpenDebtDetail = async (item: DebtItem) => {
    setSelectedDebtDetail(item);
    setDebtDetailLoading(true);
    setDetailFullData(null);
    try {
      if (item.id && !item.id.startsWith('demo-')) {
        const full = await debtApi.getDebtById(item.id);
        if (full) {
          setDetailFullData(full);
        }
      }
    } catch {
      // fallback to item
    } finally {
      setDebtDetailLoading(false);
    }
  };

  // Mở modal sửa khoản nợ
  const handleOpenEditModal = () => {
    if (!selectedDebtDetail) return;
    setEditCounterpartyName(selectedDebtDetail.counterpartyName || '');
    setEditPartnerPhone(selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone || '');
    setEditPrincipal(selectedDebtDetail.principalAmount ? String(selectedDebtDetail.principalAmount) : '');
    setEditStartDate(formatIsoToDDMMYYYY(selectedDebtDetail.startDate));
    setEditDueDate(formatIsoToDDMMYYYY(selectedDebtDetail.dueDate));
    setEditAccountId(selectedDebtDetail.accountId || '');
    setEditNote(selectedDebtDetail.note || selectedDebtDetail.description || '');
    setEditModalVisible(true);
  };

  // Lưu sửa khoản nợ (Sửa full thông tin)
  const handleSaveUpdateDebt = async () => {
    if (!selectedDebtDetail) return;
    if (!editCounterpartyName.trim()) {
      Alert.alert('Lỗi', 'Tên khoản vay không được để trống.');
      return;
    }
    const principalNum = parseFloat(editPrincipal.replace(/\D/g, '')) || selectedDebtDetail.principalAmount;
    if (!principalNum || principalNum <= 0) {
      Alert.alert('Lỗi', 'Số tiền khoản nợ không hợp lệ.');
      return;
    }
    setSubmittingEdit(true);
    try {
      const isoStartDate = parseDDMMYYYYtoIso(editStartDate);
      const isoDueDate = parseDDMMYYYYtoIso(editDueDate);
      if (!selectedDebtDetail.id.startsWith('demo-')) {
        const isBorrow = selectedDebtDetail.debtType === 'BORROWING';
        const payload: any = {
          principal_amount: principalNum,
          start_date: isoStartDate || undefined,
          due_date: isoDueDate || undefined,
          account_id: editAccountId || undefined,
          note: editNote.trim(),
          description: editNote.trim(),
        };
        if (isBorrow) {
          payload.creditor_name = editCounterpartyName.trim();
          payload.creditor_phone = editPartnerPhone.trim() || undefined;
        } else {
          payload.debtor_name = editCounterpartyName.trim();
          payload.debtor_phone = editPartnerPhone.trim() || undefined;
        }
        await debtApi.updateDebt(selectedDebtDetail.id, payload);
      }

      // Cập nhật state local
      const newPaid = selectedDebtDetail.paidAmount;
      const newRemaining = Math.max(0, principalNum - newPaid);
      const newPercent = principalNum > 0 ? Math.min(100, Math.round((newPaid / principalNum) * 100)) : 0;
      const updatedItem: DebtItem = {
        ...selectedDebtDetail,
        counterpartyName: editCounterpartyName.trim(),
        creditorName: selectedDebtDetail.debtType === 'BORROWING' ? editCounterpartyName.trim() : selectedDebtDetail.creditorName,
        debtorName: selectedDebtDetail.debtType === 'LENDING' ? editCounterpartyName.trim() : selectedDebtDetail.debtorName,
        creditorPhone: selectedDebtDetail.debtType === 'BORROWING' ? editPartnerPhone.trim() : selectedDebtDetail.creditorPhone,
        debtorPhone: selectedDebtDetail.debtType === 'LENDING' ? editPartnerPhone.trim() : selectedDebtDetail.debtorPhone,
        principalAmount: principalNum,
        remainingAmount: newRemaining,
        percentagePaid: newPercent,
        status: newRemaining === 0 ? 'PAID_OFF' : (selectedDebtDetail.status === 'PAID_OFF' ? 'ACTIVE' : selectedDebtDetail.status),
        startDate: isoStartDate || selectedDebtDetail.startDate,
        dueDate: isoDueDate || selectedDebtDetail.dueDate,
        accountId: editAccountId || selectedDebtDetail.accountId,
        note: editNote.trim(),
        description: editNote.trim(),
      };

      setDebts((prev) => prev.map((d) => (d.id === selectedDebtDetail.id ? updatedItem : d)));
      setSelectedDebtDetail(updatedItem);
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin khoản nợ.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi khi cập nhật.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Tải dữ liệu ban đầu
  const loadData = async () => {
    try {
      const [debtList, sum, accList] = await Promise.all([
        debtApi.getDebts(),
        debtApi.getSummary(),
        accountApi.getAccounts().catch(() => []),
      ]);
      if (debtList && debtList.length > 0) {
        setDebts(debtList);
      }
      if (sum) {
        setSummary(sum);
      }
      if (accList && accList.length > 0) {
        setAccounts(accList);
      }
    } catch {
      // Giữ mock data an toàn
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Lọc danh sách theo tab: Tất cả | Đi vay | Cho nợ
  const filteredDebts = useMemo(() => {
    if (selectedTab === 'BORROWING') {
      return debts.filter((d) => d.debtType === 'BORROWING');
    }
    if (selectedTab === 'LENDING') {
      return debts.filter((d) => d.debtType === 'LENDING');
    }
    return debts;
  }, [debts, selectedTab]);

  // Tính toán số dư hiển thị
  const totalBorrowingRemaining = useMemo(() => {
    return debts
      .filter((d) => d.debtType === 'BORROWING' && d.status !== 'PAID_OFF')
      .reduce((acc, cur) => acc + cur.remainingAmount, 0);
  }, [debts]);

  const totalLendingRemaining = useMemo(() => {
    return debts
      .filter((d) => d.debtType === 'LENDING' && d.status !== 'PAID_OFF')
      .reduce((acc, cur) => acc + cur.remainingAmount, 0);
  }, [debts]);

  // Tổng dư nợ = Tôi đang nợ (10.800.000 đ) + Đang cho vay (5.000.000 đ) = 15.800.000 đ
  const totalDebtBalance = totalBorrowingRemaining + totalLendingRemaining;

  // Tính toán ngày trả kỳ đầu tiên mặc định dựa trên tần suất và ngày/thứ đã chọn
  const calculateDefaultFirstPaymentDate = (freq: PaymentFrequency, dayMonth: number, dayWeek: number) => {
    const today = new Date();
    let targetDate: Date;
    if (freq === 'WEEKLY') {
      const currentDay = today.getDay(); // 0: CN, 1: T2,...
      let diffDays = dayWeek - currentDay;
      if (diffDays <= 0) diffDays += 7; // sang tuần sau
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffDays);
    } else {
      const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const nextMonth = (today.getMonth() + 1) % 12;
      targetDate = new Date(nextMonthYear, nextMonth, Math.min(dayMonth, 28));
    }
    const dStr = String(targetDate.getDate()).padStart(2, '0');
    const mStr = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yStr = targetDate.getFullYear();
    return `${dStr}-${mStr}-${yStr}`;
  };

  // Cập nhật ngày trong tháng
  const handleSelectDayOfMonth = (day: number) => {
    setFormDayOfMonth(day);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(formFrequency, day, formDayOfWeek));
  };

  // Cập nhật thứ trong tuần
  const handleSelectDayOfWeek = (dow: number) => {
    setFormDayOfWeek(dow);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(formFrequency, formDayOfMonth, dow));
  };

  // Cập nhật tần suất trả
  const handleSelectFrequency = (freq: PaymentFrequency) => {
    setFormFrequency(freq);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(freq, formDayOfMonth, formDayOfWeek));
  };

  // Tự động tính toán tổng số tiền khi thay đổi số kỳ hoặc tiền kỳ
  const handlePeriodicAmountChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setFormPeriodicAmount(cleaned);
    const count = parseInt(formInstallmentCount, 10) || 1;
    const amountPerPeriod = parseInt(cleaned, 10) || 0;
    if (amountPerPeriod > 0) {
      setFormPrincipal(String(amountPerPeriod * count));
    }
  };

  const handleInstallmentCountChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setFormInstallmentCount(cleaned);
    const count = parseInt(cleaned, 10) || 1;
    const amountPerPeriod = parseInt(formPeriodicAmount, 10) || 0;
    if (amountPerPeriod > 0) {
      setFormPrincipal(String(amountPerPeriod * count));
    }
  };

  // Xử lý tạo khoản nợ mới (Chuẩn DB & Web)
  const handleCreateDebt = async () => {
    const partnerTrimmed = formPartnerName.trim();
    if (!partnerTrimmed) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập tên khoản vay'
      );
      return;
    }

    const principalNum = parseFloat(formPrincipal.replace(/\D/g, ''));
    if (!principalNum || principalNum <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập tổng số tiền nợ hợp lệ');
      return;
    }

    setSubmittingDebt(true);
    try {
      const isBorrowing = formType === 'BORROWING';
      const periodicAmountNum = parseFloat(formPeriodicAmount.replace(/\D/g, '')) || undefined;
      const chosenFreq = paymentPlanType === 'INSTALLMENT' ? formFrequency : 'ONE_TIME';

      // Tính ngày trả nợ cuối cùng (due_date) nếu trả theo kỳ
      const isoStartDate = parseDDMMYYYYtoIso(formStartDate) || new Date().toISOString().split('T')[0];
      const isoFirstPaymentDate = parseDDMMYYYYtoIso(formFirstPaymentDate);
      let computedDueDate = formDueDate ? parseDDMMYYYYtoIso(formDueDate) : undefined;
      if (!computedDueDate && paymentPlanType === 'INSTALLMENT') {
        const count = parseInt(formInstallmentCount, 10) || 1;
        const baseDateStr = isoFirstPaymentDate || isoStartDate;
        const d = new Date(baseDateStr);
        // Nếu trả N kỳ thì kỳ 1 là baseDateStr, kỳ N là sau (count - 1) khoảng thời gian
        const intervals = Math.max(0, count - 1);
        if (formFrequency === 'WEEKLY') {
          d.setDate(d.getDate() + intervals * 7);
        } else if (formFrequency === 'QUARTERLY') {
          d.setMonth(d.getMonth() + intervals * 3);
        } else {
          d.setMonth(d.getMonth() + intervals);
        }
        computedDueDate = d.toISOString().split('T')[0];
      }

      // Gọi API POST /api/v1/debts
      const result = await debtApi.createDebt({
        debt_type: formType,
        creditor_name: isBorrowing ? partnerTrimmed : undefined,
        creditor_phone: isBorrowing ? formPartnerPhone.trim() : undefined,
        debtor_name: !isBorrowing ? partnerTrimmed : undefined,
        debtor_phone: !isBorrowing ? formPartnerPhone.trim() : undefined,
        principal_amount: principalNum,
        currency_code: 'VND',
        interest_rate: 0,
        payment_frequency: chosenFreq,
        payment_amount: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        monthly_payment: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        start_date: isoStartDate,
        due_date: computedDueDate,
        next_payment_date: paymentPlanType === 'INSTALLMENT' ? (isoFirstPaymentDate || computedDueDate) : computedDueDate,
        account_id: selectedAccountId || undefined,
        note: formNote.trim() || undefined,
        description: formNote.trim() || undefined,
        reminder_enabled: true,
        reminder_days_before: formNotifyDaysBefore,
      });

      // Tạo item nợ mới cập nhật vào giao diện
      const newItem: DebtItem = {
        id: result?.data?.id || `local-debt-${Date.now()}`,
        debtType: formType,
        creditorName: isBorrowing ? partnerTrimmed : undefined,
        creditorPhone: isBorrowing ? formPartnerPhone.trim() : undefined,
        debtorName: !isBorrowing ? partnerTrimmed : undefined,
        debtorPhone: !isBorrowing ? formPartnerPhone.trim() : undefined,
        counterpartyName: partnerTrimmed,
        principalAmount: principalNum,
        paidAmount: 0,
        remainingAmount: principalNum,
        percentagePaid: 0,
        status: 'ACTIVE',
        paymentFrequency: chosenFreq,
        monthlyPayment: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        paymentAmount: paymentPlanType === 'INSTALLMENT' ? periodicAmountNum : undefined,
        startDate: isoStartDate,
        dueDate: computedDueDate,
        nextPaymentDate: paymentPlanType === 'INSTALLMENT' ? (isoFirstPaymentDate || computedDueDate) : computedDueDate,
        accountId: selectedAccountId || undefined,
        note: formNote.trim() || undefined,
        description: formNote.trim() || undefined,
      };

      setDebts((prev) => [newItem, ...prev]);
      Alert.alert('Thành công', 'Khoản nợ đã được tạo thành công.');
      setCreateModalVisible(false);

      // Reset form
      setFormPartnerName('');
      setFormPartnerPhone('');
      setFormPrincipal('');
      setFormPeriodicAmount('');
      setFormStartDate(getTodayDDMMYYYY());
      setFormDueDate('');
      setFormFirstPaymentDate(getTodayDDMMYYYY());
      setFormNote('');
      setSelectedAccountId('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi tạo khoản nợ.');
    } finally {
      setSubmittingDebt(false);
    }
  };

  // Xử lý ghi nhận thanh toán / trả nợ
  const handleRecordPayment = async () => {
    if (!selectedDebtForPay) return;

    const numAmount = parseFloat(payAmount.replace(/\D/g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền thanh toán hợp lệ.');
      return;
    }

    setSubmittingPay(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const nowIso = now.toISOString();
      const chosenAccountId = payAccountId || selectedDebtForPay.accountId;
      const chosenAcc = accounts.find((a) => a.id === chosenAccountId);
      const chosenAccName = chosenAcc ? chosenAcc.name : (accounts[0]?.name || 'Ví tiền mặt');

      await debtApi.recordPayment(selectedDebtForPay.id, {
        amount: numAmount,
        payment_date: todayStr,
        account_id: chosenAccountId || undefined,
        note: payNote.trim() || undefined,
      });

      const newPayItem = {
        id: `pay-${Date.now()}`,
        amount: numAmount,
        paymentDate: nowIso,
        account_id: chosenAccountId,
        account_name: chosenAccName,
        note: payNote.trim() || 'Thanh toán nợ',
      };

      setDemoPayments((prev) => ({
        ...prev,
        [selectedDebtForPay.id]: [newPayItem, ...(prev[selectedDebtForPay.id] || [])],
      }));

      let updatedTargetItem: DebtItem | null = null;
      setDebts((prev) =>
        prev.map((item) => {
          if (item.id === selectedDebtForPay.id) {
            const newPaid = item.paidAmount + numAmount;
            const newRemaining = Math.max(0, item.principalAmount - newPaid);
            const newPercentage = Math.min(100, Math.round((newPaid / item.principalAmount) * 100));
            const upd = {
              ...item,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              percentagePaid: newPercentage,
              status: newRemaining === 0 ? 'PAID_OFF' : item.status,
            };
            updatedTargetItem = upd;
            return upd;
          }
          return item;
        })
      );

      Alert.alert('Thành công', 'Đã ghi nhận thanh toán khoản nợ.');
      setPayModalVisible(false);
      if (updatedTargetItem && selectedDebtDetail && selectedDebtDetail.id === (updatedTargetItem as DebtItem).id) {
        setSelectedDebtDetail(updatedTargetItem);
        // Refresh lại chi tiết từ backend nếu có
        if (selectedDebtDetail.id && !selectedDebtDetail.id.startsWith('demo-')) {
          debtApi.getDebtById(selectedDebtDetail.id).then((full) => {
            if (full) setDetailFullData(full);
          }).catch(() => { });
        }
      }
      setSelectedDebtForPay(null);
      setPayAmount('');
      setPayAccountId('');
      setPayNote('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmittingPay(false);
    }
  };

  // Xóa khoản nợ
  const handleDeleteDebt = (debt: DebtItem) => {
    confirmDelete({
      title: 'Xóa khoản nợ',
      message: `Bạn có chắc chắn muốn xóa khoản nợ "${debt.counterpartyName}" không?\nHành động này không thể hoàn tác.`,
      itemName: debt.counterpartyName,
      onConfirm: async () => {
        try {
          await debtApi.deleteDebt(debt.id);
          setDebts((prev) => prev.filter((d) => d.id !== debt.id));
          setSelectedDebtDetail(null);
          showSuccess('Thành công', `Đã xóa khoản nợ "${debt.counterpartyName}" thành công!`);
        } catch (err: any) {
          showError('Lỗi', err?.message || 'Không thể xóa khoản nợ này.');
        }
      },
    });
  };

  // NẾU ĐANG CHỌN XEM CHI TIẾT KHOẢN NỢ -> RENDER TOÀN MÀN HÌNH NHƯ BÊN MỤC TIÊU & TIẾT KIỆM (GoalDetailScreen)
  if (selectedDebtDetail) {
    const isBorrow = selectedDebtDetail.debtType === 'BORROWING';
    const visual = resolveDebtVisual(selectedDebtDetail.counterpartyName, selectedDebtDetail.debtType);
    const isPaidOff = selectedDebtDetail.status === 'PAID_OFF' || selectedDebtDetail.remainingAmount <= 0;
    const displayRemaining = selectedDebtDetail.remainingAmount;
    const displayPaid = selectedDebtDetail.paidAmount;
    const displayPrincipal = selectedDebtDetail.principalAmount;
    const displayPercent = selectedDebtDetail.percentagePaid || (displayPrincipal > 0 ? Math.round((displayPaid / displayPrincipal) * 100) : 0);

    // Lấy lịch sử thanh toán từ API hoặc từ mock demo
    const rawHistory: any[] = detailFullData?.payment_history || demoPayments[selectedDebtDetail.id] || [];
    const historyList = rawHistory.map((pm, idx) => {
      const rawDate = pm.created_at || pm.payment_date || pm.paymentDate || selectedDebtDetail.startDate || new Date().toISOString();
      const matchedAccount = accounts.find((a) => a.id === (pm.account_id || pm.accountId || selectedDebtDetail.accountId));
      const accountName = pm.account_name || pm.accountName || matchedAccount?.name || detailFullData?.account?.name || 'Ví tiền mặt';
      return {
        id: String(pm.id || idx),
        amount: Number(pm.amount || 0),
        rawDate,
        date: formatDateTime(rawDate),
        note: pm.note || 'Thanh toán khoản nợ',
        accountName,
      };
    });

    const debtTypeLabel = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME'
      ? 'Trả góp'
      : (isBorrow ? 'Khoản đi vay' : 'Cho vay');

    return (
      <View
        style={[
          styles.detailScreenContainer,
          isDark && { backgroundColor: themeColors.background },
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? themeColors.background : '#FFFFFF'}
        />

        {/* 1. Header chi tiết: [<] Chi tiết khoản nợ */}
        <View
          style={[
            styles.detailScreenHeaderRow,
            isDark && { backgroundColor: themeColors.background, borderBottomColor: themeColors.cardBorder },
          ]}
        >
          <Pressable
            onPress={() => setSelectedDebtDetail(null)}
            hitSlop={12}
            style={[styles.detailBackCircleBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          >
            <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.accentGreen : '#0E964E'} />
          </Pressable>

          <Text style={[styles.detailScreenHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
            Chi tiết khoản nợ
          </Text>

          {/* Khoảng trống để cân đối header */}
          <View style={{ width: 36, height: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailScreenScrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Banner nền ảnh theo loại nợ (Đỏ: Khoản đang vay, Xanh: Khoản cho vay) */}
          <ImageBackground
            source={isBorrow ? DEBT_RED_BANNER_BG : BANNER_BG_IMG}
            style={styles.detailHeroBanner}
            imageStyle={styles.detailHeroBannerImgStyle}
            resizeMode="cover"
          >
            {/* Cột chữ bên trái */}
            <View style={styles.detailHeroTextCol}>
              <Text style={styles.detailHeroCategoryTitle}>
                {isBorrow ? 'Khoản đang vay' : 'Khoản cho vay'}
              </Text>
              <Text style={styles.detailHeroCategorySub}>
                {isBorrow ? 'Bạn đang vay tiền' : 'Bạn đã cho người khác vay tiền'}
              </Text>
            </View>

            {/* Icon 3D bên phải */}
            <View style={styles.detailHero3dWrap}>
              <Image
                source={isBorrow ? BORROWING_WALLET_3D : LENDING_BAG_3D}
                style={styles.detailHero3dImg}
                resizeMode="contain"
              />
            </View>
          </ImageBackground>

          {/* Card tên khoản vay & Tag trạng thái */}
          <View
            style={[
              styles.detailDebtNameCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.detailDocIconWrap,
                  { backgroundColor: isBorrow ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7') },
                ]}
              >
                <FinanceIcon name="file-text" size={18} color={isBorrow ? '#EF4444' : '#10B981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailDebtNameLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'TÊN KHOẢN VAY' : 'TÊN KHOẢN CHO VAY'}
                </Text>
                <Text style={[styles.detailDebtNameValue, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {selectedDebtDetail.counterpartyName}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.detailDebtStatusPill,
                { backgroundColor: isPaidOff ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') },
              ]}
            >
              <Text
                style={[
                  styles.detailDebtStatusPillText,
                  { color: isPaidOff ? (isDark ? themeColors.accentGreen : '#059669') : '#DC2626' },
                ]}
              >
                {isPaidOff ? 'Đã hoàn thành' : 'Đang thực hiện'}
              </Text>
            </View>
          </View>

          {/* 3. Khối 3 cột số tiền (Tổng nợ - Đã trả - Còn lại) */}
          <View
            style={[
              styles.detailBalanceCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailBalanceThreeCols}>
              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Tiền vay' : 'Cho vay'}
                </Text>
                <Text style={[styles.detailBalanceColPrincipal, isDark && { color: themeColors.textPrimary }]}>
                  {formatVND(displayPrincipal)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Đã trả' : 'Đã thu'}
                </Text>
                <Text style={[styles.detailBalanceColPaid, isDark && { color: themeColors.textSecondary }]}>
                  {formatVND(displayPaid)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  Còn lại
                </Text>
                <Text
                  style={[
                    styles.detailBalanceColRemaining,
                    { color: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E') },
                  ]}
                >
                  {formatVND(displayRemaining)}
                </Text>
              </View>
            </View>

            {/* Thanh tiến trình % trả nợ */}
            <View style={styles.detailProgressBarRow}>
              <View style={[styles.detailProgressBarTrack, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.detailProgressBarFill,
                    {
                      width: `${displayPercent}%`,
                      backgroundColor: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E'),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.detailProgressPercentText,
                  { color: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E') },
                ]}
              >
                {displayPercent}%
              </Text>
            </View>
          </View>

          {/* 4. Khối Thông tin chung */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailSectionTitleRow}>
              <View
                style={[
                  styles.sectionHeaderIconCircle,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                ]}
              >
                <FinanceIcon name="file-text" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
              </View>
              <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                Thông tin chung
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {/* Dòng 1: Loại nợ */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="tag" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Loại giao dịch
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {debtTypeLabel}
              </Text>
            </View>

            {/* Dòng 2: Người liên hệ & SĐT */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="user" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Người cho vay' : 'Người vay'}
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {selectedDebtDetail.counterpartyName}
                {(selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone) ? ` (${selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone})` : ''}
              </Text>
            </View>

            {/* Dòng 3: Thời hạn / Kỳ hạn */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="calendar" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME' ? 'Kỳ hạn thanh toán' : 'Thời hạn'}
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {(() => {
                  const freq = selectedDebtDetail.paymentFrequency;
                  if (freq && freq !== 'ONE_TIME') {
                    const periodic = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
                    const count = (periodic > 0 && selectedDebtDetail.principalAmount)
                      ? Math.max(1, Math.round(selectedDebtDetail.principalAmount / periodic))
                      : 1;

                    // Lấy ngày trong tháng hoặc thứ trong tuần từ nextPaymentDate / startDate
                    const baseDateStr = selectedDebtDetail.nextPaymentDate || selectedDebtDetail.startDate || selectedDebtDetail.dueDate;
                    let schedulePatternText = 'Hàng tháng';
                    if (baseDateStr) {
                      const d = new Date(baseDateStr);
                      if (!isNaN(d.getTime())) {
                        if (freq === 'WEEKLY') {
                          const dowNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                          schedulePatternText = `${dowNames[d.getDay()]} hàng tuần`;
                        } else if (freq === 'QUARTERLY') {
                          schedulePatternText = `Ngày ${d.getDate()} hàng quý`;
                        } else {
                          schedulePatternText = `Ngày ${d.getDate()} hàng tháng`;
                        }
                      }
                    } else {
                      schedulePatternText = freq === 'WEEKLY' ? 'Hàng tuần' : freq === 'QUARTERLY' ? 'Hàng quý' : 'Hàng tháng';
                    }

                    return `${count} kỳ - ${schedulePatternText}`;
                  }
                  return `${formatDate(selectedDebtDetail.startDate)} → ${formatDate(selectedDebtDetail.dueDate)}`;
                })()}
              </Text>
            </View>

            {/* Dòng 4: Ghi chú */}
            <View style={[styles.detailInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="credit-card" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Ghi chú
                </Text>
              </View>
              <Text
                style={[
                  styles.detailInfoValueRegularText,
                  isDark && { color: themeColors.textPrimary },
                  { flex: 1, textAlign: 'right' },
                ]}
                numberOfLines={2}
              >
                {selectedDebtDetail.note || selectedDebtDetail.description || 'Không có ghi chú'}
              </Text>
            </View>
          </View>

          {/* 5. Khối Kế hoạch trả theo kỳ (Liệt kê rõ ràng từng kỳ hạn, ngày đến hạn & trạng thái đã trả / chưa trả) */}
          {(() => {
            const freq = selectedDebtDetail.paymentFrequency;
            if (!freq || freq === 'ONE_TIME') return null;

            const periodicAmt = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
            const totalPrincipal = selectedDebtDetail.principalAmount || 0;
            const totalPaid = selectedDebtDetail.paidAmount || 0;
            const count = (periodicAmt > 0 && totalPrincipal > 0)
              ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
              : 1;

            const baseDateStr = selectedDebtDetail.nextPaymentDate || selectedDebtDetail.startDate || selectedDebtDetail.dueDate;
            const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

            const installmentSchedule: Array<{
              periodNumber: number;
              dueDate: string;
              amount: number;
              isPaid: boolean;
            }> = [];

            let iterDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
            for (let i = 1; i <= count; i++) {
              const dStr = String(iterDate.getDate()).padStart(2, '0');
              const mStr = String(iterDate.getMonth() + 1).padStart(2, '0');
              const yStr = iterDate.getFullYear();
              const dateFormatted = `${dStr}/${mStr}/${yStr}`;

              // Kỳ i được xem là đã trả nếu tổng số tiền đã trả >= số tiền tích lũy đến kỳ này (hoặc trả hết nợ)
              const thresholdForPeriod = periodicAmt * (i - 0.1);
              const isPeriodPaid = totalPaid >= thresholdForPeriod || selectedDebtDetail.remainingAmount <= 0;

              installmentSchedule.push({
                periodNumber: i,
                dueDate: dateFormatted,
                amount: periodicAmt,
                isPaid: isPeriodPaid,
              });

              if (freq === 'WEEKLY') iterDate.setDate(iterDate.getDate() + 7);
              else if (freq === 'QUARTERLY') iterDate.setMonth(iterDate.getMonth() + 3);
              else iterDate.setMonth(iterDate.getMonth() + 1);
            }

            return (
              <View
                style={[
                  styles.detailSectionCard,
                  isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                ]}
              >
                <View style={styles.detailSectionTitleRow}>
                  <View
                    style={[
                      styles.sectionHeaderIconCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="calendar" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                      Kế hoạch trả theo kỳ ({count} kỳ)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? themeColors.accentGreen : '#059669' }}>
                    {installmentSchedule.filter((p) => p.isPaid).length}/{count} đã trả
                  </Text>
                </View>

                <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

                <ScrollView
                  style={count > 3 ? { maxHeight: 195 } : undefined}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={count > 3}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {installmentSchedule.map((p) => (
                    <View
                      key={p.periodNumber}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: p.isPaid
                          ? (isDark ? 'rgba(52, 211, 153, 0.1)' : '#F0FDF4')
                          : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                        borderWidth: 1,
                        borderColor: p.isPaid
                          ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                          : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: p.isPaid
                              ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                              : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
                          }}
                        >
                          {p.isPaid ? (
                            <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                          ) : (
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? themeColors.textMuted : '#64748B' }}>
                              {p.periodNumber}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? themeColors.textPrimary : '#0F172A' }}>
                            Kỳ {p.periodNumber} • {formatVND(p.amount)}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: isDark ? themeColors.textSecondary : '#64748B', marginTop: 1 }}>
                            Hạn trả: {p.dueDate}
                          </Text>
                        </View>
                      </View>

                      {/* Huy hiệu trạng thái ĐÃ TRẢ / CHƯA TRẢ */}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: p.isPaid
                            ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                            : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: p.isPaid
                              ? (isDark ? themeColors.accentGreen : '#059669')
                              : (isDark ? '#FBBF24' : '#D97706'),
                          }}
                        >
                          {p.isPaid ? 'Đã trả' : 'Chưa trả'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })()}

          {/* 5. Khối Thao tác: [Thanh toán] [Cập nhật] [Xóa nợ] */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailSectionTitleRow}>
              <View
                style={[
                  styles.sectionHeaderIconCircle,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                ]}
              >
                <FinanceIcon name="zap" size={18} color={isDark ? themeColors.accentGreen : '#16A34A'} />
              </View>
              <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                Thao tác
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            <View style={styles.detailActionButtonsRow}>
              {/* Nút 1: Thanh toán (Nền xanh đậm, icon ví trắng) */}
              <Pressable
                onPress={() => {
                  setSelectedDebtForPay(selectedDebtDetail);
                  const isInstallment = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME';
                  const periodic = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
                  // Tính kỳ tiếp theo chưa thanh toán
                  const paid = selectedDebtDetail.paidAmount || 0;
                  const nextPeriodIdx = periodic > 0 ? Math.floor(paid / periodic) + 1 : 1;
                  setPaySelectedPeriod(isInstallment ? nextPeriodIdx : null);

                  const defaultPayAmt = isInstallment && periodic > 0
                    ? Math.min(periodic, displayRemaining)
                    : displayRemaining;
                  setPayAmount(defaultPayAmt > 0 ? new Intl.NumberFormat('vi-VN').format(defaultPayAmt) : '');
                  setPayAccountId(selectedDebtDetail.accountId || (accounts[0]?.id || ''));
                  setPayNote(isInstallment ? `Thanh toán kỳ ${nextPeriodIdx}` : '');
                  setPayModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.actionBtnPay,
                  isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="wallet" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnPayText}>Thanh toán</Text>
              </Pressable>

              {/* Nút 2: Sửa khoản nợ (Thiết kế hiện đại, tinh tế) */}
              <Pressable
                onPress={handleOpenEditModal}
                style={({ pressed }) => [
                  styles.actionBtnUpdate,
                  isDark && {
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="edit" size={17} color={isDark ? '#60A5FA' : '#2563EB'} />
                <Text style={[styles.actionBtnUpdateText, isDark && { color: '#60A5FA' }]}>Sửa khoản nợ</Text>
              </Pressable>

              {/* Nút 3: Xóa nợ (Nền hồng pastel viền mỏng, icon thùng rác đỏ) */}
              <Pressable
                onPress={() => handleDeleteDebt(selectedDebtDetail)}
                style={({ pressed }) => [
                  styles.actionBtnDelete,
                  isDark && {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="trash" size={19} color="#EF4444" />
                <Text style={styles.actionBtnDeleteText}>Xóa nợ</Text>
              </Pressable>
            </View>
          </View>

          {/* 6. Khối Lịch sử thanh toán */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailHistoryHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.sectionHeaderIconCircle,
                    isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                  ]}
                >
                  <FinanceIcon name="rotate-ccw" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                </View>
                <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                  Lịch sử thanh toán
                </Text>
              </View>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {historyList.length === 0 ? (
              <View style={styles.detailHistoryEmptyWrap}>
                <Text style={[styles.detailHistoryEmptyText, isDark && { color: themeColors.textMuted }]}>
                  Chưa có lịch sử thanh toán nào cho khoản nợ này.
                </Text>
              </View>
            ) : (
              historyList.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedPaymentDetail(item)}
                  style={({ pressed }) => [
                    styles.historyPaymentRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                    pressed && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#F8FAFC' }),
                    idx === historyList.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                  ]}
                >
                  {/* Vòng tròn xanh lá có dấu tick trắng */}
                  <View
                    style={[
                      styles.historyCheckGreenCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="check" size={13} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                  </View>

                  {/* Cột thông tin: 'Thanh toán' & Giờ + Ngày tháng */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyPaymentTitleText, isDark && { color: themeColors.textPrimary }]}>
                      Thanh toán
                    </Text>
                    <Text style={[styles.historyPaymentDateText, isDark && { color: themeColors.textSecondary }]}>
                      {item.date}
                    </Text>
                  </View>

                  {/* Số tiền thanh toán màu xanh lá: +1.500.000 đ */}
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={[styles.historyPaymentAmountGreen, isDark && { color: themeColors.accentGreen }]}>
                      +{formatVND(item.amount)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>

        {/* MODAL POPUP CHI TIẾT ĐỢT THANH TOÁN (KHI ẤN VÀO DÒNG LỊCH SỬ) */}
        <Modal
          visible={!!selectedPaymentDetail}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPaymentDetail(null)}
        >
          <View style={styles.paymentDetailModalCenterOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setSelectedPaymentDetail(null)}
            />
            <View
              style={[
                styles.paymentDetailPopupBox,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.paymentDetailPopupHeader,
                  isDark && { borderBottomColor: themeColors.cardBorder },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={[
                      styles.historyCheckGreenCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                  </View>
                  <Text
                    style={[
                      styles.paymentDetailPopupTitle,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                  >
                    Chi tiết đợt thanh toán
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedPaymentDetail(null)}
                  hitSlop={10}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              {/* Số tiền thanh toán to nổi bật */}
              <View
                style={[
                  styles.paymentDetailAmountCard,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.25)' },
                ]}
              >
                <Text
                  style={[
                    styles.paymentDetailAmountLabel,
                    isDark && { color: themeColors.accentGreen },
                  ]}
                >
                  SỐ TIỀN ĐÃ THANH TOÁN
                </Text>
                <Text
                  style={[
                    styles.paymentDetailAmountValue,
                    isDark && { color: themeColors.accentGreen },
                  ]}
                >
                  +{formatVND(selectedPaymentDetail?.amount || 0)}
                </Text>
              </View>

              {/* Các dòng thông tin chi tiết */}
              <View style={styles.paymentDetailRowsWrap}>
                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Thời gian:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValBold,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                  >
                    {selectedPaymentDetail?.date}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Khoản nợ:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValBold,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedDebtDetail.counterpartyName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Nguồn tiền trích:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValGreen,
                      isDark && { color: themeColors.accentGreen },
                    ]}
                  >
                    {selectedPaymentDetail?.accountName || 'Ví tiền mặt'}
                  </Text>
                </View>

                <View style={[styles.paymentDetailRowItem, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Ghi chú:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValRegular,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedPaymentDetail?.note || 'Không có ghi chú'}
                  </Text>
                </View>
              </View>

              {/* Nút Đóng */}
              <Pressable
                onPress={() => setSelectedPaymentDetail(null)}
                style={[
                  styles.paymentDetailCloseBtn,
                  isDark && { backgroundColor: themeColors.surfaceSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.paymentDetailCloseBtnText,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  Đóng
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── MODAL SỬA KHOẢN NỢ ── */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
            <View
              style={[
                styles.modalSheet,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                  Sửa khoản nợ
                </Text>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  hitSlop={10}
                  style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TÊN KHOẢN VAY *
                </Text>
                <TextInput
                  value={editCounterpartyName}
                  onChangeText={setEditCounterpartyName}
                  placeholder="Ví dụ: Vay mua xe, Trả góp laptop, Vay anh Long..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  SỐ ĐIỆN THOẠI LIÊN HỆ
                </Text>
                <TextInput
                  value={editPartnerPhone}
                  onChangeText={setEditPartnerPhone}
                  placeholder="0987654321..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="phone-pad"
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TỔNG SỐ TIỀN NỢ (VNĐ) *
                </Text>
                <TextInput
                  value={editPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(editPrincipal.replace(/\D/g, '') || '0', 10)) : ''}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/\D/g, '');
                    setEditPrincipal(cleaned);
                  }}
                  placeholder="Nhập tổng số tiền..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                      NGÀY BẮT ĐẦU
                    </Text>
                    <TextInput
                      value={editStartDate}
                      onChangeText={(val) => setEditStartDate(formatInputDDMMYYYY(val))}
                      placeholder="DD-MM-YYYY"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      keyboardType="numeric"
                      style={[
                        styles.modalTextInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                      HẠN THANH TOÁN
                    </Text>
                    <TextInput
                      value={editDueDate}
                      onChangeText={(val) => setEditDueDate(formatInputDDMMYYYY(val))}
                      placeholder="DD-MM-YYYY"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      keyboardType="numeric"
                      style={[
                        styles.modalTextInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TÀI KHOẢN / VÍ LIÊN KẾT
                </Text>
                <Pressable
                  onPress={() => setPickerModalType('EDIT_ACCOUNT')}
                  style={[
                    styles.modernSelectDropdown,
                    { marginBottom: 14 },
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {(() => {
                      const selAcc = accounts.find((a) => a.id === editAccountId);
                      if (!selAcc) {
                        return (
                          <Text
                            style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                            numberOfLines={1}
                          >
                            Không gắn tài khoản (Chỉ gửi nhắc nợ)
                          </Text>
                        );
                      }
                      return (
                        <>
                          <AccountBadge account={selAcc} size={22} />
                          <Text
                            style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {selAcc.name} (Số dư: {formatVND(selAcc.balance)})
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                  <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
                </Pressable>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  GHI CHÚ / THỎA THUẬN
                </Text>
                <TextInput
                  value={editNote}
                  onChangeText={setEditNote}
                  placeholder="Ví dụ: Vay mua đồ, thỏa thuận trả trước..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Pressable
                  onPress={handleSaveUpdateDebt}
                  disabled={submittingEdit}
                  style={[
                    styles.modalSubmitBtn,
                    isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                    submittingEdit && styles.btnDisabled,
                  ]}
                >
                  {submittingEdit ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Lưu thay đổi</Text>
                  )}
                </Pressable>
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* OVERLAY PICKER CHỌN TÀI KHOẢN KHI SỬA KHOẢN NỢ */}
              {pickerModalType === 'EDIT_ACCOUNT' && (
                <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setPickerModalType('NONE')}
                  />
                  <View
                    style={[
                      styles.pickerModalBox,
                      isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerModalHeader,
                        isDark && { borderBottomColor: themeColors.cardBorder },
                      ]}
                    >
                      <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                        Chọn tài khoản / ví liên kết
                      </Text>
                      <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                        <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                      <Pressable
                        onPress={() => {
                          setEditAccountId('');
                          setPickerModalType('NONE');
                        }}
                        style={[
                          styles.pickerItemRow,
                          isDark && { borderBottomColor: themeColors.cardBorder },
                          !editAccountId && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pickerItemText,
                              isDark && { color: themeColors.textPrimary },
                              !editAccountId && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                            ]}
                          >
                            🔔 Không gắn tài khoản
                          </Text>
                          <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                            Chỉ gửi thông báo nhắc nợ đúng hạn
                          </Text>
                        </View>
                        {!editAccountId && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />}
                      </Pressable>

                      {accounts.map((acc) => (
                        <Pressable
                          key={acc.id}
                          onPress={() => {
                            setEditAccountId(acc.id);
                            setPickerModalType('NONE');
                          }}
                          style={[
                            styles.pickerItemRow,
                            isDark && { borderBottomColor: themeColors.cardBorder },
                            editAccountId === acc.id && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                          ]}
                        >
                          <AccountBadge account={acc} size={34} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                editAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                              Số dư: {formatVND(acc.balance)} · Tự động trừ khi đến hạn
                            </Text>
                          </View>
                          {editAccountId === acc.id && (
                            <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL THANH TOÁN / THU NỢ ── */}
        <Modal
          visible={payModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPayModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setPayModalVisible(false)} />
            <View
              style={[
                styles.modalSheet,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                  {selectedDebtForPay?.debtType === 'BORROWING' ? 'Ghi nhận trả nợ' : 'Ghi nhận thu nợ'}
                </Text>
                <Pressable
                  onPress={() => setPayModalVisible(false)}
                  hitSlop={10}
                  style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              {selectedDebtForPay && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.payTargetNameText, isDark && { color: themeColors.textSecondary }]}>
                    Đối tác:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>
                      {selectedDebtForPay.counterpartyName}
                    </Text>
                  </Text>
                  <Text style={[styles.payTargetRemainingText, isDark && { color: themeColors.textSecondary }]}>
                    Số tiền còn lại:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>
                      {formatVND(selectedDebtForPay.remainingAmount)}
                    </Text>
                  </Text>

                  {/* CHỌN KỲ THANH TOÁN (Nếu là khoản nợ theo kỳ) */}
                  {selectedDebtForPay.paymentFrequency && selectedDebtForPay.paymentFrequency !== 'ONE_TIME' && (() => {
                    const periodic = selectedDebtForPay.monthlyPayment || selectedDebtForPay.paymentAmount || 0;
                    const totalPrincipal = selectedDebtForPay.principalAmount || 0;
                    const totalPaid = selectedDebtForPay.paidAmount || 0;
                    const count = (periodic > 0 && totalPrincipal > 0)
                      ? Math.max(1, Math.round(totalPrincipal / periodic))
                      : 1;

                    return (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.inputSectionLabel, { marginBottom: 6 }, isDark && { color: themeColors.textSecondary }]}>
                          CHỌN KỲ THANH TOÁN
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                          {Array.from({ length: count }, (_, idx) => {
                            const pNum = idx + 1;
                            const threshold = periodic * (pNum - 0.1);
                            const isPaid = totalPaid >= threshold || selectedDebtForPay.remainingAmount <= 0;
                            const isSelected = paySelectedPeriod === pNum;

                            return (
                              <Pressable
                                key={pNum}
                                onPress={() => {
                                  setPaySelectedPeriod(pNum);
                                  const targetAmt = periodic > 0 ? Math.min(periodic, selectedDebtForPay.remainingAmount) : selectedDebtForPay.remainingAmount;
                                  setPayAmount(new Intl.NumberFormat('vi-VN').format(targetAmt));
                                  setPayNote(`Thanh toán kỳ ${pNum}`);
                                }}
                                style={{
                                  paddingVertical: 7,
                                  paddingHorizontal: 12,
                                  borderRadius: 10,
                                  borderWidth: 1.5,
                                  borderColor: isSelected
                                    ? (isDark ? themeColors.accentGreen : '#059669')
                                    : isPaid
                                    ? (isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0')
                                    : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                                  backgroundColor: isSelected
                                    ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                                    : isPaid
                                    ? (isDark ? 'rgba(52, 211, 153, 0.08)' : '#F0FDF4')
                                    : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: isSelected
                                      ? (isDark ? themeColors.accentGreen : '#059669')
                                      : (isDark ? themeColors.textPrimary : '#1E293B'),
                                  }}
                                >
                                  Kỳ {pNum} {isPaid ? '✓' : ''}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '600',
                                    marginTop: 1,
                                    color: isSelected
                                      ? (isDark ? themeColors.accentGreen : '#059669')
                                      : isPaid
                                      ? '#10B981'
                                      : (isDark ? themeColors.textMuted : '#64748B'),
                                  }}
                                >
                                  {isPaid ? 'Đã trả' : formatVND(periodic)}
                                </Text>
                              </Pressable>
                            );
                          })}

                          {/* Lựa chọn trả hết toàn bộ */}
                          <Pressable
                            onPress={() => {
                              setPaySelectedPeriod(null);
                              setPayAmount(new Intl.NumberFormat('vi-VN').format(selectedDebtForPay.remainingAmount));
                              setPayNote('Tất toán toàn bộ khoản nợ');
                            }}
                            style={{
                              paddingVertical: 7,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: paySelectedPeriod === null
                                ? (isDark ? themeColors.accentGreen : '#059669')
                                : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                              backgroundColor: paySelectedPeriod === null
                                ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                                : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: paySelectedPeriod === null
                                  ? (isDark ? themeColors.accentGreen : '#059669')
                                  : (isDark ? themeColors.textPrimary : '#1E293B'),
                              }}
                            >
                              Trả hết nợ
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                marginTop: 1,
                                color: paySelectedPeriod === null
                                  ? (isDark ? themeColors.accentGreen : '#059669')
                                  : (isDark ? themeColors.textMuted : '#64748B'),
                              }}
                            >
                              {formatVND(selectedDebtForPay.remainingAmount)}
                            </Text>
                          </Pressable>
                        </ScrollView>
                      </View>
                    );
                  })()}
                </View>
              )}

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                SỐ TIỀN THANH TOÁN (VNĐ) *
              </Text>
              <TextInput
                value={payAmount}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, '');
                  if (!cleaned) {
                    setPayAmount('');
                    return;
                  }
                  setPayAmount(new Intl.NumberFormat('vi-VN').format(parseInt(cleaned, 10)));
                }}
                keyboardType="numeric"
                placeholder="Nhập số tiền..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.modalTextInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                autoFocus
              />

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                {selectedDebtForPay?.debtType === 'BORROWING' ? 'NGUỒN TIỀN TRÍCH TRẢ *' : 'TÀI KHOẢN NHẬN TIỀN *'}
              </Text>
              <Pressable
                onPress={() => setPickerModalType('PAY_ACCOUNT')}
                style={[
                  styles.modernSelectDropdown,
                  { marginBottom: 14 },
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {(() => {
                    const chosenAcc = accounts.find((a) => a.id === payAccountId);
                    if (!chosenAcc) {
                      return (
                        <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}>
                          Ví tiền mặt (Mặc định)
                        </Text>
                      );
                    }
                    return (
                      <>
                        <AccountBadge account={chosenAcc} size={22} />
                        <Text
                          style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {chosenAcc.name} (Số dư: {formatVND(chosenAcc.balance)})
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
              </Pressable>

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                GHI CHÚ THANH TOÁN
              </Text>
              <TextInput
                value={payNote}
                onChangeText={setPayNote}
                placeholder="Ví dụ: Trả đợt 1, Chuyển khoản qua ngân hàng..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.modalTextInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
              />

              <Pressable
                onPress={handleRecordPayment}
                disabled={submittingPay}
                style={[
                  styles.modalSubmitBtn,
                  isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                  submittingPay && styles.btnDisabled,
                ]}
              >
                {submittingPay ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Xác nhận thanh toán</Text>
                )}
              </Pressable>
              <View style={{ height: 20 }} />

              {/* OVERLAY PICKER CHỌN TÀI KHOẢN KHI THANH TOÁN NỢ */}
              {pickerModalType === 'PAY_ACCOUNT' && (
                <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setPickerModalType('NONE')}
                  />
                  <View
                    style={[
                      styles.pickerModalBox,
                      isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerModalHeader,
                        isDark && { borderBottomColor: themeColors.cardBorder },
                      ]}
                    >
                      <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                        Chọn nguồn tiền thanh toán
                      </Text>
                      <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                        <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                      {accounts.map((acc) => (
                        <Pressable
                          key={acc.id}
                          onPress={() => {
                            setPayAccountId(acc.id);
                            setPickerModalType('NONE');
                          }}
                          style={[
                            styles.pickerItemRow,
                            isDark && { borderBottomColor: themeColors.cardBorder },
                            payAccountId === acc.id && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                          ]}
                        >
                          <AccountBadge account={acc} size={34} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                payAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                              Số dư: {formatVND(acc.balance)}
                            </Text>
                          </View>
                          {payAccountId === acc.id && (
                            <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // NẾU ĐANG CHỌN XEM CHI TIẾT KHOẢN NỢ -> RENDER TOÀN MÀN HÌNH NHƯ BÊN MỤC TIÊU & TIẾT KIỆM (GoalDetailScreen)
  if (selectedDebtDetail) {
    const isBorrow = selectedDebtDetail.debtType === 'BORROWING';
    const visual = resolveDebtVisual(selectedDebtDetail.counterpartyName, selectedDebtDetail.debtType);
    const isPaidOff = selectedDebtDetail.status === 'PAID_OFF' || selectedDebtDetail.remainingAmount <= 0;
    const displayRemaining = selectedDebtDetail.remainingAmount;
    const displayPaid = selectedDebtDetail.paidAmount;
    const displayPrincipal = selectedDebtDetail.principalAmount;
    const displayPercent = selectedDebtDetail.percentagePaid || (displayPrincipal > 0 ? Math.round((displayPaid / displayPrincipal) * 100) : 0);

    // Lấy lịch sử thanh toán từ API hoặc từ mock demo
    const rawHistory: any[] = detailFullData?.payment_history || demoPayments[selectedDebtDetail.id] || [];
    const historyList = rawHistory.map((pm, idx) => {
      const rawDate = pm.created_at || pm.payment_date || pm.paymentDate || selectedDebtDetail.startDate || new Date().toISOString();
      const matchedAccount = accounts.find((a) => a.id === (pm.account_id || pm.accountId || selectedDebtDetail.accountId));
      const accountName = pm.account_name || pm.accountName || matchedAccount?.name || detailFullData?.account?.name || 'Ví tiền mặt';
      return {
        id: String(pm.id || idx),
        amount: Number(pm.amount || 0),
        rawDate,
        date: formatDateTime(rawDate),
        note: pm.note || 'Thanh toán khoản nợ',
        accountName,
      };
    });

    const debtTypeLabel = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME'
      ? 'Trả góp'
      : (isBorrow ? 'Khoản đi vay' : 'Cho vay');

    return (
      <View
        style={[
          styles.detailScreenContainer,
          isDark && { backgroundColor: themeColors.background },
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? themeColors.background : '#FFFFFF'}
        />

        {/* 1. Header chi tiết: [<] Chi tiết khoản nợ */}
        <View
          style={[
            styles.detailScreenHeaderRow,
            isDark && { backgroundColor: themeColors.background, borderBottomColor: themeColors.cardBorder },
          ]}
        >
          <Pressable
            onPress={() => setSelectedDebtDetail(null)}
            hitSlop={12}
            style={[styles.detailBackCircleBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          >
            <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.accentGreen : '#0E964E'} />
          </Pressable>

          <Text style={[styles.detailScreenHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
            Chi tiết khoản nợ
          </Text>

          {/* Khoảng trống để cân đối header */}
          <View style={{ width: 36, height: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailScreenScrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Banner nền ảnh theo loại nợ (Đỏ: Khoản đang vay, Xanh: Khoản cho vay) */}
          <ImageBackground
            source={isBorrow ? DEBT_RED_BANNER_BG : BANNER_BG_IMG}
            style={styles.detailHeroBanner}
            imageStyle={styles.detailHeroBannerImgStyle}
            resizeMode="cover"
          >
            {/* Cột chữ bên trái */}
            <View style={styles.detailHeroTextCol}>
              <Text style={styles.detailHeroCategoryTitle}>
                {isBorrow ? 'Khoản đang vay' : 'Khoản cho vay'}
              </Text>
              <Text style={styles.detailHeroCategorySub}>
                {isBorrow ? 'Bạn đang vay tiền' : 'Bạn đã cho người khác vay tiền'}
              </Text>
            </View>

            {/* Icon 3D bên phải */}
            <View style={styles.detailHero3dWrap}>
              <Image
                source={isBorrow ? BORROWING_WALLET_3D : LENDING_BAG_3D}
                style={styles.detailHero3dImg}
                resizeMode="contain"
              />
            </View>
          </ImageBackground>

          {/* Card tên khoản vay & Tag trạng thái */}
          <View
            style={[
              styles.detailDebtNameCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.detailDocIconWrap,
                  { backgroundColor: isBorrow ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7') },
                ]}
              >
                <FinanceIcon name="file-text" size={18} color={isBorrow ? '#EF4444' : '#10B981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailDebtNameLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'TÊN KHOẢN VAY' : 'TÊN KHOẢN CHO VAY'}
                </Text>
                <Text style={[styles.detailDebtNameValue, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {selectedDebtDetail.counterpartyName}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.detailDebtStatusPill,
                { backgroundColor: isPaidOff ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') },
              ]}
            >
              <Text
                style={[
                  styles.detailDebtStatusPillText,
                  { color: isPaidOff ? (isDark ? themeColors.accentGreen : '#059669') : '#DC2626' },
                ]}
              >
                {isPaidOff ? 'Đã hoàn thành' : 'Đang thực hiện'}
              </Text>
            </View>
          </View>

          {/* 3. Khối 3 cột số tiền (Tổng nợ - Đã trả - Còn lại) */}
          <View
            style={[
              styles.detailBalanceCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailBalanceThreeCols}>
              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Tiền vay' : 'Cho vay'}
                </Text>
                <Text style={[styles.detailBalanceColPrincipal, isDark && { color: themeColors.textPrimary }]}>
                  {formatVND(displayPrincipal)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Đã trả' : 'Đã thu'}
                </Text>
                <Text style={[styles.detailBalanceColPaid, isDark && { color: themeColors.textSecondary }]}>
                  {formatVND(displayPaid)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  Còn lại
                </Text>
                <Text
                  style={[
                    styles.detailBalanceColRemaining,
                    { color: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E') },
                  ]}
                >
                  {formatVND(displayRemaining)}
                </Text>
              </View>
            </View>

            {/* Thanh tiến trình % trả nợ */}
            <View style={styles.detailProgressBarRow}>
              <View style={[styles.detailProgressBarTrack, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.detailProgressBarFill,
                    {
                      width: `${displayPercent}%`,
                      backgroundColor: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E'),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.detailProgressPercentText,
                  { color: isBorrow ? '#EF4444' : (isDark ? themeColors.accentGreen : '#0E964E') },
                ]}
              >
                {displayPercent}%
              </Text>
            </View>
          </View>

          {/* 4. Khối Thông tin chung */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailSectionTitleRow}>
              <View
                style={[
                  styles.sectionHeaderIconCircle,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                ]}
              >
                <FinanceIcon name="file-text" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
              </View>
              <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                Thông tin chung
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {/* Dòng 1: Loại nợ */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="tag" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Loại giao dịch
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {debtTypeLabel}
              </Text>
            </View>

            {/* Dòng 2: Người liên hệ & SĐT */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="user" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Người cho vay' : 'Người vay'}
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {selectedDebtDetail.counterpartyName}
                {(selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone) ? ` (${selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone})` : ''}
              </Text>
            </View>

            {/* Dòng 3: Thời hạn / Kỳ hạn */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="calendar" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME' ? 'Kỳ hạn thanh toán' : 'Thời hạn'}
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {(() => {
                  const freq = selectedDebtDetail.paymentFrequency;
                  if (freq && freq !== 'ONE_TIME') {
                    const periodic = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
                    const count = (periodic > 0 && selectedDebtDetail.principalAmount)
                      ? Math.max(1, Math.round(selectedDebtDetail.principalAmount / periodic))
                      : 1;

                    // Lấy ngày trong tháng hoặc thứ trong tuần từ nextPaymentDate / startDate
                    const baseDateStr = selectedDebtDetail.nextPaymentDate || selectedDebtDetail.startDate || selectedDebtDetail.dueDate;
                    let schedulePatternText = 'Hàng tháng';
                    if (baseDateStr) {
                      const d = new Date(baseDateStr);
                      if (!isNaN(d.getTime())) {
                        if (freq === 'WEEKLY') {
                          const dowNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                          schedulePatternText = `${dowNames[d.getDay()]} hàng tuần`;
                        } else if (freq === 'QUARTERLY') {
                          schedulePatternText = `Ngày ${d.getDate()} hàng quý`;
                        } else {
                          schedulePatternText = `Ngày ${d.getDate()} hàng tháng`;
                        }
                      }
                    } else {
                      schedulePatternText = freq === 'WEEKLY' ? 'Hàng tuần' : freq === 'QUARTERLY' ? 'Hàng quý' : 'Hàng tháng';
                    }

                    return `${count} kỳ - ${schedulePatternText}`;
                  }
                  return `${formatDate(selectedDebtDetail.startDate)} → ${formatDate(selectedDebtDetail.dueDate)}`;
                })()}
              </Text>
            </View>

            {/* Dòng 4: Ghi chú */}
            <View style={[styles.detailInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="credit-card" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Ghi chú
                </Text>
              </View>
              <Text
                style={[
                  styles.detailInfoValueRegularText,
                  isDark && { color: themeColors.textPrimary },
                  { flex: 1, textAlign: 'right' },
                ]}
                numberOfLines={2}
              >
                {selectedDebtDetail.note || selectedDebtDetail.description || 'Không có ghi chú'}
              </Text>
            </View>
          </View>

          {/* 5. Khối Kế hoạch trả theo kỳ (Liệt kê rõ ràng từng kỳ hạn, ngày đến hạn & trạng thái đã trả / chưa trả) */}
          {(() => {
            const freq = selectedDebtDetail.paymentFrequency;
            if (!freq || freq === 'ONE_TIME') return null;

            const periodicAmt = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
            const totalPrincipal = selectedDebtDetail.principalAmount || 0;
            const totalPaid = selectedDebtDetail.paidAmount || 0;
            const count = (periodicAmt > 0 && totalPrincipal > 0)
              ? Math.max(1, Math.round(totalPrincipal / periodicAmt))
              : 1;

            const baseDateStr = selectedDebtDetail.nextPaymentDate || selectedDebtDetail.startDate || selectedDebtDetail.dueDate;
            const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

            const installmentSchedule: Array<{
              periodNumber: number;
              dueDate: string;
              amount: number;
              isPaid: boolean;
            }> = [];

            let iterDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
            for (let i = 1; i <= count; i++) {
              const dStr = String(iterDate.getDate()).padStart(2, '0');
              const mStr = String(iterDate.getMonth() + 1).padStart(2, '0');
              const yStr = iterDate.getFullYear();
              const dateFormatted = `${dStr}/${mStr}/${yStr}`;

              // Kỳ i được xem là đã trả nếu tổng số tiền đã trả >= số tiền tích lũy đến kỳ này (hoặc trả hết nợ)
              const thresholdForPeriod = periodicAmt * (i - 0.1);
              const isPeriodPaid = totalPaid >= thresholdForPeriod || selectedDebtDetail.remainingAmount <= 0;

              installmentSchedule.push({
                periodNumber: i,
                dueDate: dateFormatted,
                amount: periodicAmt,
                isPaid: isPeriodPaid,
              });

              if (freq === 'WEEKLY') iterDate.setDate(iterDate.getDate() + 7);
              else if (freq === 'QUARTERLY') iterDate.setMonth(iterDate.getMonth() + 3);
              else iterDate.setMonth(iterDate.getMonth() + 1);
            }

            return (
              <View
                style={[
                  styles.detailSectionCard,
                  isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                ]}
              >
                <View style={styles.detailSectionTitleRow}>
                  <View
                    style={[
                      styles.sectionHeaderIconCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="calendar" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                      Kế hoạch trả theo kỳ ({count} kỳ)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? themeColors.accentGreen : '#059669' }}>
                    {installmentSchedule.filter((p) => p.isPaid).length}/{count} đã trả
                  </Text>
                </View>

                <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

                <ScrollView
                  style={count > 3 ? { maxHeight: 195 } : undefined}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={count > 3}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {installmentSchedule.map((p) => (
                    <View
                      key={p.periodNumber}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: p.isPaid
                          ? (isDark ? 'rgba(52, 211, 153, 0.1)' : '#F0FDF4')
                          : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                        borderWidth: 1,
                        borderColor: p.isPaid
                          ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                          : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: p.isPaid
                              ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                              : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
                          }}
                        >
                          {p.isPaid ? (
                            <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                          ) : (
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? themeColors.textMuted : '#64748B' }}>
                              {p.periodNumber}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? themeColors.textPrimary : '#0F172A' }}>
                            Kỳ {p.periodNumber} • {formatVND(p.amount)}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: isDark ? themeColors.textSecondary : '#64748B', marginTop: 1 }}>
                            Hạn trả: {p.dueDate}
                          </Text>
                        </View>
                      </View>

                      {/* Huy hiệu trạng thái ĐÃ TRẢ / CHƯA TRẢ */}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: p.isPaid
                            ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                            : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: p.isPaid
                              ? (isDark ? themeColors.accentGreen : '#059669')
                              : (isDark ? '#FBBF24' : '#D97706'),
                          }}
                        >
                          {p.isPaid ? 'Đã trả' : 'Chưa trả'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })()}

          {/* 5. Khối Thao tác: [Thanh toán] [Cập nhật] [Xóa nợ] */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailSectionTitleRow}>
              <View
                style={[
                  styles.sectionHeaderIconCircle,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                ]}
              >
                <FinanceIcon name="zap" size={18} color={isDark ? themeColors.accentGreen : '#16A34A'} />
              </View>
              <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                Thao tác
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            <View style={styles.detailActionButtonsRow}>
              {/* Nút 1: Thanh toán (Nền xanh đậm, icon ví trắng) */}
              <Pressable
                onPress={() => {
                  setSelectedDebtForPay(selectedDebtDetail);
                  const isInstallment = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME';
                  const periodic = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
                  // Tính kỳ tiếp theo chưa thanh toán
                  const paid = selectedDebtDetail.paidAmount || 0;
                  const nextPeriodIdx = periodic > 0 ? Math.floor(paid / periodic) + 1 : 1;
                  setPaySelectedPeriod(isInstallment ? nextPeriodIdx : null);

                  const defaultPayAmt = isInstallment && periodic > 0
                    ? Math.min(periodic, displayRemaining)
                    : displayRemaining;
                  setPayAmount(defaultPayAmt > 0 ? new Intl.NumberFormat('vi-VN').format(defaultPayAmt) : '');
                  setPayAccountId(selectedDebtDetail.accountId || (accounts[0]?.id || ''));
                  setPayNote(isInstallment ? `Thanh toán kỳ ${nextPeriodIdx}` : '');
                  setPayModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.actionBtnPay,
                  isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="wallet" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnPayText}>Thanh toán</Text>
              </Pressable>

              {/* Nút 2: Sửa khoản nợ (Thiết kế hiện đại, tinh tế) */}
              <Pressable
                onPress={handleOpenEditModal}
                style={({ pressed }) => [
                  styles.actionBtnUpdate,
                  isDark && {
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="edit" size={17} color={isDark ? '#60A5FA' : '#2563EB'} />
                <Text style={[styles.actionBtnUpdateText, isDark && { color: '#60A5FA' }]}>Sửa khoản nợ</Text>
              </Pressable>

              {/* Nút 3: Xóa nợ (Nền hồng pastel viền mỏng, icon thùng rác đỏ) */}
              <Pressable
                onPress={() => handleDeleteDebt(selectedDebtDetail)}
                style={({ pressed }) => [
                  styles.actionBtnDelete,
                  isDark && {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="trash" size={19} color="#EF4444" />
                <Text style={styles.actionBtnDeleteText}>Xóa nợ</Text>
              </Pressable>
            </View>
          </View>

          {/* 6. Khối Lịch sử thanh toán */}
          <View
            style={[
              styles.detailSectionCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailHistoryHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.sectionHeaderIconCircle,
                    isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                  ]}
                >
                  <FinanceIcon name="rotate-ccw" size={17} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                </View>
                <Text style={[styles.detailSectionTitleText, isDark && { color: themeColors.textPrimary }]}>
                  Lịch sử thanh toán
                </Text>
              </View>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {historyList.length === 0 ? (
              <View style={styles.detailHistoryEmptyWrap}>
                <Text style={[styles.detailHistoryEmptyText, isDark && { color: themeColors.textMuted }]}>
                  Chưa có lịch sử thanh toán nào cho khoản nợ này.
                </Text>
              </View>
            ) : (
              historyList.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedPaymentDetail(item)}
                  style={({ pressed }) => [
                    styles.historyPaymentRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                    pressed && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#F8FAFC' }),
                    idx === historyList.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                  ]}
                >
                  {/* Vòng tròn xanh lá có dấu tick trắng */}
                  <View
                    style={[
                      styles.historyCheckGreenCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="check" size={13} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                  </View>

                  {/* Cột thông tin: 'Thanh toán' & Giờ + Ngày tháng */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyPaymentTitleText, isDark && { color: themeColors.textPrimary }]}>
                      Thanh toán
                    </Text>
                    <Text style={[styles.historyPaymentDateText, isDark && { color: themeColors.textSecondary }]}>
                      {item.date}
                    </Text>
                  </View>

                  {/* Số tiền thanh toán màu xanh lá: +1.500.000 đ */}
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={[styles.historyPaymentAmountGreen, isDark && { color: themeColors.accentGreen }]}>
                      +{formatVND(item.amount)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>

        {/* MODAL POPUP CHI TIẾT ĐỢT THANH TOÁN (KHI ẤN VÀO DÒNG LỊCH SỬ) */}
        <Modal
          visible={!!selectedPaymentDetail}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPaymentDetail(null)}
        >
          <View style={styles.paymentDetailModalCenterOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setSelectedPaymentDetail(null)}
            />
            <View
              style={[
                styles.paymentDetailPopupBox,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.paymentDetailPopupHeader,
                  isDark && { borderBottomColor: themeColors.cardBorder },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={[
                      styles.historyCheckGreenCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                  </View>
                  <Text
                    style={[
                      styles.paymentDetailPopupTitle,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                  >
                    Chi tiết đợt thanh toán
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedPaymentDetail(null)}
                  hitSlop={10}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              {/* Số tiền thanh toán to nổi bật */}
              <View
                style={[
                  styles.paymentDetailAmountCard,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.25)' },
                ]}
              >
                <Text
                  style={[
                    styles.paymentDetailAmountLabel,
                    isDark && { color: themeColors.accentGreen },
                  ]}
                >
                  SỐ TIỀN ĐÃ THANH TOÁN
                </Text>
                <Text
                  style={[
                    styles.paymentDetailAmountValue,
                    isDark && { color: themeColors.accentGreen },
                  ]}
                >
                  +{formatVND(selectedPaymentDetail?.amount || 0)}
                </Text>
              </View>

              {/* Các dòng thông tin chi tiết */}
              <View style={styles.paymentDetailRowsWrap}>
                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Thời gian:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValBold,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                  >
                    {selectedPaymentDetail?.date}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Khoản nợ:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValBold,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedDebtDetail.counterpartyName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Nguồn tiền trích:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValGreen,
                      isDark && { color: themeColors.accentGreen },
                    ]}
                  >
                    {selectedPaymentDetail?.accountName || 'Ví tiền mặt'}
                  </Text>
                </View>

                <View style={[styles.paymentDetailRowItem, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Ghi chú:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValRegular,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedPaymentDetail?.note || 'Không có ghi chú'}
                  </Text>
                </View>
              </View>

              {/* Nút Đóng */}
              <Pressable
                onPress={() => setSelectedPaymentDetail(null)}
                style={[
                  styles.paymentDetailCloseBtn,
                  isDark && { backgroundColor: themeColors.surfaceSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.paymentDetailCloseBtnText,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  Đóng
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── MODAL SỬA KHOẢN NỢ ── */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
            <View
              style={[
                styles.modalSheet,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                  Sửa khoản nợ
                </Text>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  hitSlop={10}
                  style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TÊN KHOẢN VAY *
                </Text>
                <TextInput
                  value={editCounterpartyName}
                  onChangeText={setEditCounterpartyName}
                  placeholder="Ví dụ: Vay mua xe, Trả góp laptop, Vay anh Long..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  SỐ ĐIỆN THOẠI LIÊN HỆ
                </Text>
                <TextInput
                  value={editPartnerPhone}
                  onChangeText={setEditPartnerPhone}
                  placeholder="0987654321..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="phone-pad"
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TỔNG SỐ TIỀN NỢ (VNĐ) *
                </Text>
                <TextInput
                  value={editPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(editPrincipal.replace(/\D/g, '') || '0', 10)) : ''}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/\D/g, '');
                    setEditPrincipal(cleaned);
                  }}
                  placeholder="Nhập tổng số tiền..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                      NGÀY BẮT ĐẦU
                    </Text>
                    <TextInput
                      value={editStartDate}
                      onChangeText={(val) => setEditStartDate(formatInputDDMMYYYY(val))}
                      placeholder="DD-MM-YYYY"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      keyboardType="numeric"
                      style={[
                        styles.modalTextInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                      HẠN THANH TOÁN
                    </Text>
                    <TextInput
                      value={editDueDate}
                      onChangeText={(val) => setEditDueDate(formatInputDDMMYYYY(val))}
                      placeholder="DD-MM-YYYY"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      keyboardType="numeric"
                      style={[
                        styles.modalTextInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TÀI KHOẢN / VÍ LIÊN KẾT
                </Text>
                <Pressable
                  onPress={() => setPickerModalType('EDIT_ACCOUNT')}
                  style={[
                    styles.modernSelectDropdown,
                    { marginBottom: 14 },
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {(() => {
                      const selAcc = accounts.find((a) => a.id === editAccountId);
                      if (!selAcc) {
                        return (
                          <Text
                            style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                            numberOfLines={1}
                          >
                            Không gắn tài khoản (Chỉ gửi nhắc nợ)
                          </Text>
                        );
                      }
                      return (
                        <>
                          <AccountBadge account={selAcc} size={22} />
                          <Text
                            style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {selAcc.name} (Số dư: {formatVND(selAcc.balance)})
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                  <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
                </Pressable>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  GHI CHÚ / THỎA THUẬN
                </Text>
                <TextInput
                  value={editNote}
                  onChangeText={setEditNote}
                  placeholder="Ví dụ: Vay mua đồ, thỏa thuận trả trước..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.modalTextInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                />

                <Pressable
                  onPress={handleSaveUpdateDebt}
                  disabled={submittingEdit}
                  style={[
                    styles.modalSubmitBtn,
                    isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                    submittingEdit && styles.btnDisabled,
                  ]}
                >
                  {submittingEdit ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Lưu thay đổi</Text>
                  )}
                </Pressable>
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* OVERLAY PICKER CHỌN TÀI KHOẢN KHI SỬA KHOẢN NỢ */}
              {pickerModalType === 'EDIT_ACCOUNT' && (
                <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setPickerModalType('NONE')}
                  />
                  <View
                    style={[
                      styles.pickerModalBox,
                      isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerModalHeader,
                        isDark && { borderBottomColor: themeColors.cardBorder },
                      ]}
                    >
                      <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                        Chọn tài khoản / ví liên kết
                      </Text>
                      <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                        <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                      <Pressable
                        onPress={() => {
                          setEditAccountId('');
                          setPickerModalType('NONE');
                        }}
                        style={[
                          styles.pickerItemRow,
                          isDark && { borderBottomColor: themeColors.cardBorder },
                          !editAccountId && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pickerItemText,
                              isDark && { color: themeColors.textPrimary },
                              !editAccountId && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                            ]}
                          >
                            🔔 Không gắn tài khoản
                          </Text>
                          <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                            Chỉ gửi thông báo nhắc nợ đúng hạn
                          </Text>
                        </View>
                        {!editAccountId && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />}
                      </Pressable>

                      {accounts.map((acc) => (
                        <Pressable
                          key={acc.id}
                          onPress={() => {
                            setEditAccountId(acc.id);
                            setPickerModalType('NONE');
                          }}
                          style={[
                            styles.pickerItemRow,
                            isDark && { borderBottomColor: themeColors.cardBorder },
                            editAccountId === acc.id && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                          ]}
                        >
                          <AccountBadge account={acc} size={34} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                editAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                              Số dư: {formatVND(acc.balance)} · Tự động trừ khi đến hạn
                            </Text>
                          </View>
                          {editAccountId === acc.id && (
                            <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL THANH TOÁN / THU NỢ ── */}
        <Modal
          visible={payModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPayModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setPayModalVisible(false)} />
            <View
              style={[
                styles.modalSheet,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
            >
              <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                  {selectedDebtForPay?.debtType === 'BORROWING' ? 'Ghi nhận trả nợ' : 'Ghi nhận thu nợ'}
                </Text>
                <Pressable
                  onPress={() => setPayModalVisible(false)}
                  hitSlop={10}
                  style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              {selectedDebtForPay && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.payTargetNameText, isDark && { color: themeColors.textSecondary }]}>
                    Đối tác:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>
                      {selectedDebtForPay.counterpartyName}
                    </Text>
                  </Text>
                  <Text style={[styles.payTargetRemainingText, isDark && { color: themeColors.textSecondary }]}>
                    Số tiền còn lại:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>
                      {formatVND(selectedDebtForPay.remainingAmount)}
                    </Text>
                  </Text>

                  {/* CHỌN KỲ THANH TOÁN (Nếu là khoản nợ theo kỳ) */}
                  {selectedDebtForPay.paymentFrequency && selectedDebtForPay.paymentFrequency !== 'ONE_TIME' && (() => {
                    const periodic = selectedDebtForPay.monthlyPayment || selectedDebtForPay.paymentAmount || 0;
                    const totalPrincipal = selectedDebtForPay.principalAmount || 0;
                    const totalPaid = selectedDebtForPay.paidAmount || 0;
                    const count = (periodic > 0 && totalPrincipal > 0)
                      ? Math.max(1, Math.round(totalPrincipal / periodic))
                      : 1;

                    return (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.inputSectionLabel, { marginBottom: 6 }, isDark && { color: themeColors.textSecondary }]}>
                          CHỌN KỲ THANH TOÁN
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                          {Array.from({ length: count }, (_, idx) => {
                            const pNum = idx + 1;
                            const threshold = periodic * (pNum - 0.1);
                            const isPaid = totalPaid >= threshold || selectedDebtForPay.remainingAmount <= 0;
                            const isSelected = paySelectedPeriod === pNum;

                            return (
                              <Pressable
                                key={pNum}
                                onPress={() => {
                                  setPaySelectedPeriod(pNum);
                                  const targetAmt = periodic > 0 ? Math.min(periodic, selectedDebtForPay.remainingAmount) : selectedDebtForPay.remainingAmount;
                                  setPayAmount(new Intl.NumberFormat('vi-VN').format(targetAmt));
                                  setPayNote(`Thanh toán kỳ ${pNum}`);
                                }}
                                style={{
                                  paddingVertical: 7,
                                  paddingHorizontal: 12,
                                  borderRadius: 10,
                                  borderWidth: 1.5,
                                  borderColor: isSelected
                                    ? (isDark ? themeColors.accentGreen : '#059669')
                                    : isPaid
                                    ? (isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0')
                                    : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                                  backgroundColor: isSelected
                                    ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                                    : isPaid
                                    ? (isDark ? 'rgba(52, 211, 153, 0.08)' : '#F0FDF4')
                                    : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: isSelected
                                      ? (isDark ? themeColors.accentGreen : '#059669')
                                      : (isDark ? themeColors.textPrimary : '#1E293B'),
                                  }}
                                >
                                  Kỳ {pNum} {isPaid ? '✓' : ''}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '600',
                                    marginTop: 1,
                                    color: isSelected
                                      ? (isDark ? themeColors.accentGreen : '#059669')
                                      : isPaid
                                      ? '#10B981'
                                      : (isDark ? themeColors.textMuted : '#64748B'),
                                  }}
                                >
                                  {isPaid ? 'Đã trả' : formatVND(periodic)}
                                </Text>
                              </Pressable>
                            );
                          })}

                          {/* Lựa chọn trả hết toàn bộ */}
                          <Pressable
                            onPress={() => {
                              setPaySelectedPeriod(null);
                              setPayAmount(new Intl.NumberFormat('vi-VN').format(selectedDebtForPay.remainingAmount));
                              setPayNote('Tất toán toàn bộ khoản nợ');
                            }}
                            style={{
                              paddingVertical: 7,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: paySelectedPeriod === null
                                ? (isDark ? themeColors.accentGreen : '#059669')
                                : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                              backgroundColor: paySelectedPeriod === null
                                ? (isDark ? 'rgba(52, 211, 153, 0.25)' : '#DCFCE7')
                                : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: paySelectedPeriod === null
                                  ? (isDark ? themeColors.accentGreen : '#059669')
                                  : (isDark ? themeColors.textPrimary : '#1E293B'),
                              }}
                            >
                              Trả hết nợ
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                marginTop: 1,
                                color: paySelectedPeriod === null
                                  ? (isDark ? themeColors.accentGreen : '#059669')
                                  : (isDark ? themeColors.textMuted : '#64748B'),
                              }}
                            >
                              {formatVND(selectedDebtForPay.remainingAmount)}
                            </Text>
                          </Pressable>
                        </ScrollView>
                      </View>
                    );
                  })()}
                </View>
              )}

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                SỐ TIỀN THANH TOÁN (VNĐ) *
              </Text>
              <TextInput
                value={payAmount}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, '');
                  if (!cleaned) {
                    setPayAmount('');
                    return;
                  }
                  setPayAmount(new Intl.NumberFormat('vi-VN').format(parseInt(cleaned, 10)));
                }}
                keyboardType="numeric"
                placeholder="Nhập số tiền..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.modalTextInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                autoFocus
              />

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                {selectedDebtForPay?.debtType === 'BORROWING' ? 'NGUỒN TIỀN TRÍCH TRẢ *' : 'TÀI KHOẢN NHẬN TIỀN *'}
              </Text>
              <Pressable
                onPress={() => setPickerModalType('PAY_ACCOUNT')}
                style={[
                  styles.modernSelectDropdown,
                  { marginBottom: 14 },
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {(() => {
                    const chosenAcc = accounts.find((a) => a.id === payAccountId);
                    if (!chosenAcc) {
                      return (
                        <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}>
                          Ví tiền mặt (Mặc định)
                        </Text>
                      );
                    }
                    return (
                      <>
                        <AccountBadge account={chosenAcc} size={22} />
                        <Text
                          style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {chosenAcc.name} (Số dư: {formatVND(chosenAcc.balance)})
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
              </Pressable>

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                GHI CHÚ THANH TOÁN
              </Text>
              <TextInput
                value={payNote}
                onChangeText={setPayNote}
                placeholder="Ví dụ: Trả đợt 1, Chuyển khoản qua ngân hàng..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.modalTextInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
              />

              <Pressable
                onPress={handleRecordPayment}
                disabled={submittingPay}
                style={[
                  styles.modalSubmitBtn,
                  isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                  submittingPay && styles.btnDisabled,
                ]}
              >
                {submittingPay ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Xác nhận thanh toán</Text>
                )}
              </Pressable>
              <View style={{ height: 20 }} />

              {/* OVERLAY PICKER CHỌN TÀI KHOẢN KHI THANH TOÁN NỢ */}
              {pickerModalType === 'PAY_ACCOUNT' && (
                <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setPickerModalType('NONE')}
                  />
                  <View
                    style={[
                      styles.pickerModalBox,
                      isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.pickerModalHeader,
                        isDark && { borderBottomColor: themeColors.cardBorder },
                      ]}
                    >
                      <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                        Chọn nguồn tiền thanh toán
                      </Text>
                      <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                        <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                      {accounts.map((acc) => (
                        <Pressable
                          key={acc.id}
                          onPress={() => {
                            setPayAccountId(acc.id);
                            setPickerModalType('NONE');
                          }}
                          style={[
                            styles.pickerItemRow,
                            isDark && { borderBottomColor: themeColors.cardBorder },
                            payAccountId === acc.id && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                          ]}
                        >
                          <AccountBadge account={acc} size={34} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text
                              style={[
                                styles.pickerItemText,
                                isDark && { color: themeColors.textPrimary },
                                payAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                              Số dư: {formatVND(acc.balance)}
                            </Text>
                          </View>
                          {payAccountId === acc.id && (
                            <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? themeColors.background : '#FFFFFF'}
      />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.headerContainer,
          isDark && { backgroundColor: themeColors.background },
          { paddingTop: Math.max(insets.top, 16) + 4 },
        ]}
      >
        <View style={styles.headerRow}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={[styles.backBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
            >
              <Text style={[styles.backBtnArrow, isDark && { color: themeColors.textPrimary }]}>‹</Text>
            </Pressable>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Quản lý nợ</Text>
          </View>
        </View>
      </View>

      {/* ── NỘI DUNG CUỘN ── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Đang tải dữ liệu khoản nợ...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#047857']}
              tintColor="#047857"
            />
          }
        >
          {/* ── 1. BANNER TỔNG DƯ NỢ (CHUẨN 100% ẢNH MẪU CỦA BẠN) ── */}
          <ImageBackground
            source={BANNER_BG_IMG}
            style={styles.heroBannerCard}
            imageStyle={styles.heroBannerBgImage}
            resizeMode="cover"
          >
            <View style={styles.heroLeftCol}>
              <View style={styles.heroLabelRow}>
                <Text style={styles.heroLabelText}>Tổng dư nợ</Text>
                <Pressable
                  onPress={() => setShowBalance(!showBalance)}
                  hitSlop={8}
                  style={styles.eyeIconBtn}
                >
                  <FinanceIcon
                    name={showBalance ? 'eye' : 'eye-off'}
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>

              <Text style={styles.heroAmountText}>
                {showBalance ? formatVND(totalDebtBalance) : '****** đ'}
              </Text>

              {/* Pill theo dõi số lượng khoản nợ */}
              <View style={styles.heroTrackingBadge}>
                <FinanceIcon name="grid" size={12} color="#FFFFFF" />
                <Text style={styles.heroTrackingBadgeText}>
                  {debts.length} khoản nợ đang theo dõi
                </Text>
              </View>
            </View>

            {/* Cụm minh họa Túi tiền & Thẻ vàng 3D */}
            <View style={styles.heroIllustrationWrap}>
              <Image
                source={HERO_DEBT_IMG}
                style={styles.heroIllustrationImg}
                resizeMode="contain"
              />
            </View>
          </ImageBackground>

          {/* ── 2. HÀNG 2 CARD TỔNG QUAN: TÔI ĐANG NỢ & ĐANG CHO VAY ── */}
          <View style={styles.summaryTwoCardsRow}>
            {/* Card Đỏ: Tôi đang nợ */}
            <View
              style={[
                styles.debtSummaryCardPayable,
                isDark && {
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                },
              ]}
            >
              <View
                style={[
                  styles.summaryIconCirclePayable,
                  isDark && { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                ]}
              >
                <FinanceIcon name="arrow-down" size={19} color="#DC2626" />
              </View>
              <View style={styles.summaryCardInfoCol}>
                <Text style={[styles.summaryCardLabel, isDark && { color: themeColors.textSecondary }]}>
                  Tôi đang nợ
                </Text>
                <Text style={[styles.summaryCardAmount, isDark && { color: '#F87171' }]}>
                  {showBalance ? formatVND(totalBorrowingRemaining) : '****** đ'}
                </Text>
              </View>
            </View>

            {/* Card Xanh: Đang cho vay */}
            <View
              style={[
                styles.debtSummaryCardReceivable,
                isDark && {
                  backgroundColor: 'rgba(52, 211, 153, 0.12)',
                  borderColor: 'rgba(52, 211, 153, 0.25)',
                },
              ]}
            >
              <View
                style={[
                  styles.summaryIconCircleReceivable,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
                ]}
              >
                <FinanceIcon name="arrow-up" size={19} color={isDark ? themeColors.accentGreen : '#059669'} />
              </View>
              <View style={styles.summaryCardInfoCol}>
                <Text style={[styles.summaryCardLabel, isDark && { color: themeColors.textSecondary }]}>
                  Đang cho vay
                </Text>
                <Text style={[styles.summaryCardAmount, isDark && { color: themeColors.accentGreen }]}>
                  {showBalance ? formatVND(totalLendingRemaining) : '****** đ'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 3. HÀNG BỘ LỌC VÀ NÚT THÊM KHOẢN NỢ TRÊN CÙNG 1 HÀNG ── */}
          <View style={styles.filterAndActionRow}>
            {/* Cụm 3 nút lọc nhỏ gọn: Tất cả | Đi vay | Cho nợ */}
            <View style={[styles.compactFilterGroup, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
              <Pressable
                onPress={() => setSelectedTab('ALL')}
                style={[
                  styles.compactFilterPill,
                  selectedTab === 'ALL' && [styles.compactFilterPillActive, isDark && { backgroundColor: '#10B981' }],
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
                    isDark && { color: themeColors.textSecondary },
                    selectedTab === 'ALL' && styles.compactFilterTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedTab('BORROWING')}
                style={[
                  styles.compactFilterPill,
                  selectedTab === 'BORROWING' && [styles.compactFilterPillActive, isDark && { backgroundColor: '#10B981' }],
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
                    isDark && { color: themeColors.textSecondary },
                    selectedTab === 'BORROWING' && styles.compactFilterTextActive,
                  ]}
                >
                  Đi vay
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedTab('LENDING')}
                style={[
                  styles.compactFilterPill,
                  selectedTab === 'LENDING' && [styles.compactFilterPillActive, isDark && { backgroundColor: '#10B981' }],
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
                    isDark && { color: themeColors.textSecondary },
                    selectedTab === 'LENDING' && styles.compactFilterTextActive,
                  ]}
                >
                  Cho nợ
                </Text>
              </Pressable>
            </View>

            {/* Nút Thêm khoản nợ nhỏ gọn bên cạnh cùng hàng */}
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              style={({ pressed }) => [
                styles.compactAddDebtBtn,
                isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                pressed && styles.btnPressed,
              ]}
            >
              <FinanceIcon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.compactAddDebtBtnText}>Thêm nợ</Text>
            </Pressable>
          </View>

          {/* ── 4. DANH SÁCH KHOẢN NỢ (CHUẨN 100% THEO ẢNH BẠN GỬI) ── */}
          <View style={styles.debtsListSection}>
            {filteredDebts.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    isDark && { backgroundColor: themeColors.surfaceSubtle },
                  ]}
                >
                  <FinanceIcon name="wallet" size={32} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                </View>
                <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>
                  Chưa có khoản nợ nào
                </Text>
                <Text style={[styles.emptySubText, isDark && { color: themeColors.textSecondary }]}>
                  {selectedTab === 'BORROWING'
                    ? 'Bạn không có khoản đi vay nào trong danh mục này.'
                    : selectedTab === 'LENDING'
                      ? 'Bạn không có khoản cho vay/nợ nào trong danh mục này.'
                      : 'Bấm nút "Thêm nợ" phía trên để bắt đầu theo dõi.'}
                </Text>
              </View>
            ) : (
              filteredDebts.map((item) => {
                const isPaidOff = item.status === 'PAID_OFF' || item.status === 'PAID' || item.remainingAmount <= 0;
                const visual = resolveDebtVisual(item.counterpartyName, item.debtType);
                const countdown = getDaysRemaining(item.dueDate, isPaidOff);

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleOpenDebtDetail(item)}
                    style={({ pressed }) => [
                      styles.cleanDebtRowCard,
                      isDark && {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.cardBorder,
                      },
                      pressed && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.cardPressed),
                    ]}
                  >
                    {/* 1. Icon bên trái */}
                    <View style={[styles.cleanDebtIconBox, { backgroundColor: visual.bg }]}>
                      {visual.image ? (
                        <Image
                          source={visual.image}
                          style={styles.debtItem3dImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <FinanceIcon name={visual.icon as IconName} size={26} color={visual.color} />
                      )}
                    </View>

                    {/* 2. Cột thông tin ở giữa */}
                    <View style={styles.cleanDebtCenterCol}>
                      <Text
                        style={[styles.cleanDebtTitleText, isDark && { color: themeColors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.counterpartyName}
                      </Text>

                      {/* Dòng chi tiết phụ */}
                      {item.paidAmount > 0 && item.percentagePaid > 0 && item.id === 'demo-debt-5' ? (
                        <Text
                          style={[styles.cleanDebtSubDetailText, isDark && { color: themeColors.textSecondary }]}
                          numberOfLines={1}
                        >
                          Đã thu: {formatVND(item.paidAmount)} / {formatVND(item.principalAmount)}
                        </Text>
                      ) : (
                        <View style={styles.cleanDebtDueDateRow}>
                          <FinanceIcon name="calendar" size={13} color={isDark ? themeColors.textMuted : '#64748B'} />
                          <Text style={[styles.cleanDebtDueDateText, isDark && { color: themeColors.textSecondary }]}>
                            {item.paymentFrequency && item.paymentFrequency !== 'ONE_TIME'
                              ? `Kỳ tới: ${formatDate(item.nextPaymentDate || item.dueDate)}`
                              : `Đến hạn: ${formatDate(item.dueDate)}`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Cột số tiền & Tiến trình (nhiều kỳ) / Đếm ngược ngày (trả 1 lần) ở bên phải */}
                    {(() => {
                      const isInstallment = item.paymentFrequency && item.paymentFrequency !== 'ONE_TIME';
                      return (
                        <View style={styles.cleanDebtRightCol}>
                          <Text
                            style={[
                              styles.cleanDebtAmountBold,
                              isDark && { color: themeColors.textPrimary },
                            ]}
                          >
                            {formatVND(item.remainingAmount)}
                          </Text>
                          {isInstallment && (item.monthlyPayment || item.paymentAmount) && !isPaidOff ? (
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: isDark ? themeColors.accentGreen : '#059669',
                                textAlign: 'right',
                                marginTop: -2,
                                marginBottom: 3,
                              }}
                            >
                              {formatVND(item.monthlyPayment || item.paymentAmount || 0)}/kỳ
                            </Text>
                          ) : null}

                          {/* Nếu đã thanh toán hết: Luôn hiện huy hiệu Đã hoàn thành */}
                          {isPaidOff ? (
                            <View
                              style={[
                                styles.countdownPill,
                                { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countdownPillText,
                                  { color: isDark ? themeColors.accentGreen : '#059669' },
                                ]}
                              >
                                Đã hoàn thành
                              </Text>
                            </View>
                          ) : isInstallment ? (
                            <View style={styles.miniProgressRow}>
                              <View
                                style={[
                                  styles.miniProgressBarBg,
                                  isDark && { backgroundColor: themeColors.surfaceSubtle },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.miniProgressBarFill,
                                    { width: `${Math.min(100, Math.max(0, item.percentagePaid))}%` },
                                    isDark && { backgroundColor: themeColors.accentGreen },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.miniProgressPercentText,
                                  isDark && { color: themeColors.accentGreen },
                                ]}
                              >
                                {item.percentagePaid}%
                              </Text>
                            </View>
                          ) : countdown ? (
                            <View
                              style={[
                                styles.countdownPill,
                                {
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : countdown.bg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countdownPillText,
                                  { color: isDark && countdown.color === '#059669' ? themeColors.accentGreen : countdown.color },
                                ]}
                              >
                                {countdown.text}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })()}

                    {/* 4. Mũi tên điều hướng > */}
                    <View style={styles.cleanDebtChevronWrap}>
                      <FinanceIcon name="chevron-right" size={16} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ── MODAL 2: THÊM KHOẢN NỢ MỚI (CHUẨN 100% THEO DATABASE VÀ WEB) ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
          <View style={[styles.modalSheet, { position: 'relative' }, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
            <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>Thêm khoản nợ mới</Text>
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                hitSlop={10}
                style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
              >
                <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : "#64748B"} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* 1. Type Switch: Khoản đi vay vs Khoản cho vay */}
              <View style={[styles.webTypeSwitchWrap, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <Pressable
                  onPress={() => setFormType('BORROWING')}
                  style={[
                    styles.webTypeSwitchBtn,
                    formType === 'BORROWING' && styles.webTypeSwitchBtnActiveBorrow,
                    isDark && formType !== 'BORROWING' && { backgroundColor: 'transparent' },
                  ]}
                >
                  <Text
                    style={[
                      styles.webTypeSwitchBtnText,
                      isDark && { color: themeColors.textSecondary },
                      formType === 'BORROWING' && styles.webTypeSwitchBtnTextActiveBorrow,
                    ]}
                  >
                    Khoản đi vay
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setFormType('LENDING')}
                  style={[
                    styles.webTypeSwitchBtn,
                    formType === 'LENDING' && styles.webTypeSwitchBtnActiveLend,
                    isDark && formType !== 'LENDING' && { backgroundColor: 'transparent' },
                  ]}
                >
                  <Text
                    style={[
                      styles.webTypeSwitchBtnText,
                      isDark && { color: themeColors.textSecondary },
                      formType === 'LENDING' && styles.webTypeSwitchBtnTextActiveLend,
                    ]}
                  >
                    Khoản cho vay
                  </Text>
                </Pressable>
              </View>

              {/* 2. Tên khoản vay & Số điện thoại */}
              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                {formType === 'BORROWING' ? 'TÊN KHOẢN VAY *' : 'TÊN KHOẢN CHO VAY *'}
              </Text>
              <TextInput
                value={formPartnerName}
                onChangeText={setFormPartnerName}
                placeholder={formType === 'BORROWING' ? 'Ví dụ: Vay mua xe, Mượn tiền đóng học phí, Vay anh Long...' : 'Ví dụ: Cho Nam vay, Cho mượn tiền...'}
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
              />

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>SỐ ĐIỆN THOẠI LIÊN HỆ (TÙY CHỌN)</Text>
              <TextInput
                value={formPartnerPhone}
                onChangeText={setFormPartnerPhone}
                keyboardType="phone-pad"
                placeholder="Ví dụ: 0912345678"
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
              />

              {/* 3. Khung Hình thức trả nợ: Trả một lần vs Trả theo kỳ */}
              <View style={[styles.webPaymentBoxWrap, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <Text style={[styles.webBoxTitle, isDark && { color: themeColors.textPrimary }]}>HÌNH THỨC & LỊCH TRÌNH THANH TOÁN</Text>

                <View style={[styles.webPlanSwitchRow, isDark && { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9' }]}>
                  <Pressable
                    onPress={() => setPaymentPlanType('ONE_TIME')}
                    style={[
                      styles.webPlanBtn,
                      isDark && { backgroundColor: 'transparent' },
                      paymentPlanType === 'ONE_TIME' && styles.webPlanBtnActive,
                      paymentPlanType === 'ONE_TIME' && isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.accentGreen, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.webPlanBtnText,
                        isDark && { color: themeColors.textSecondary },
                        paymentPlanType === 'ONE_TIME' && styles.webPlanBtnTextActive,
                        paymentPlanType === 'ONE_TIME' && isDark && { color: themeColors.accentGreen },
                      ]}
                    >
                      Trả một lần
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPaymentPlanType('INSTALLMENT')}
                    style={[
                      styles.webPlanBtn,
                      isDark && { backgroundColor: 'transparent' },
                      paymentPlanType === 'INSTALLMENT' && styles.webPlanBtnActive,
                      paymentPlanType === 'INSTALLMENT' && isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.accentGreen, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.webPlanBtnText,
                        isDark && { color: themeColors.textSecondary },
                        paymentPlanType === 'INSTALLMENT' && styles.webPlanBtnTextActive,
                        paymentPlanType === 'INSTALLMENT' && isDark && { color: themeColors.accentGreen },
                      ]}
                    >
                      Trả theo kỳ
                    </Text>
                  </Pressable>
                </View>

                {/* NẾU TRẢ MỘT LẦN */}
                {paymentPlanType === 'ONE_TIME' ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View>
                      <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>TỔNG SỐ TIỀN NỢ (VND) *</Text>
                      <TextInput
                        value={formPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(formPrincipal, 10)) : ''}
                        onChangeText={(val) => setFormPrincipal(val.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                        style={[styles.webBigAmountInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                      />
                    </View>

                    <View style={styles.inputTwoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>NGÀY BẮT ĐẦU</Text>
                        <TextInput
                          value={formStartDate}
                          onChangeText={(val) => setFormStartDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          keyboardType="numeric"
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>NGÀY PHẢI TRẢ *</Text>
                        <TextInput
                          value={formDueDate}
                          onChangeText={(val) => setFormDueDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          keyboardType="numeric"
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  /* NẾU TRẢ THEO KỲ */
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View style={styles.inputTwoColsRow}>
                      {/* Dropdown Chu kỳ trả */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>CHU KỲ TRẢ</Text>
                        <Pressable
                          onPress={() => setPickerModalType('FREQ')}
                          style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                        >
                          <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                            {formFrequency === 'MONTHLY' ? 'Hàng tháng' : formFrequency === 'WEEKLY' ? 'Hàng tuần' : 'Hàng quý (3 tháng)'}
                          </Text>
                          <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                        </Pressable>
                      </View>

                      {/* Số kỳ chia */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>SỐ KỲ CHIA</Text>
                        <TextInput
                          value={formInstallmentCount}
                          onChangeText={handleInstallmentCountChange}
                          keyboardType="numeric"
                          placeholder="Ví dụ: 3, 6, 12..."
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>
                    </View>

                    {/* Dropdown chọn ngày trong tháng hoặc thứ trong tuần */}
                    <View style={[styles.installmentDaySelectCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                      {formFrequency === 'WEEKLY' ? (
                        <View>
                          <Text style={[styles.installmentDayLabel, isDark && { color: themeColors.textSecondary }]}>Trả vào thứ mấy hàng tuần?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_WEEK')}
                            style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                          >
                            <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]}>
                              {formDayOfWeek === 1 ? 'Thứ Hai hàng tuần' :
                                formDayOfWeek === 2 ? 'Thứ Ba hàng tuần' :
                                  formDayOfWeek === 3 ? 'Thứ Tư hàng tuần' :
                                    formDayOfWeek === 4 ? 'Thứ Năm hàng tuần' :
                                      formDayOfWeek === 5 ? 'Thứ Sáu hàng tuần' :
                                        formDayOfWeek === 6 ? 'Thứ Bảy hàng tuần' : 'Chủ Nhật hàng tuần'}
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </View>
                      ) : (
                        <View>
                          <Text style={[styles.installmentDayLabel, isDark && { color: themeColors.textSecondary }]}>Trả vào ngày mấy hàng tháng?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_MONTH')}
                            style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                          >
                            <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]}>
                              Ngày {formDayOfMonth} hàng tháng
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputTwoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>SỐ TIỀN MỖI KỲ (VND) *</Text>
                        <TextInput
                          value={formPeriodicAmount ? new Intl.NumberFormat('vi-VN').format(parseInt(formPeriodicAmount, 10)) : ''}
                          onChangeText={handlePeriodicAmountChange}
                          keyboardType="numeric"
                          placeholder="Ví dụ: 2.000.000"
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>NGÀY TRẢ ĐẦU TIÊN</Text>
                        <TextInput
                          value={formFirstPaymentDate}
                          onChangeText={(val) => setFormFirstPaymentDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          keyboardType="numeric"
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>
                    </View>

                    {/* Tổng số tiền nợ tự động tính */}
                    <View style={[styles.autoCalcTotalBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.08)', borderColor: themeColors.cardBorder }]}>
                      <Text style={[styles.autoCalcLabel, isDark && { color: themeColors.textSecondary }]}>
                        Tổng số tiền nợ (Tự tính theo số kỳ & tiền kỳ):
                      </Text>
                      <Text style={[styles.autoCalcValue, isDark && { color: themeColors.accentGreen }]}>
                        {formPrincipal ? formatVND(parseInt(formPrincipal, 10)) : '0 đ'}
                      </Text>
                      {formPeriodicAmount && (
                        <Text style={[styles.autoCalcSub, isDark && { color: themeColors.textMuted }]}>
                          ≈ {formatVND(parseInt(formPeriodicAmount, 10))} × {formInstallmentCount} kỳ
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Tự động đồng bộ Lịch tài chính & Tài khoản (Chuẩn Web Dropdown) */}
              <View style={[styles.webSyncBoxWrap, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <View style={styles.webSyncBoxHeader}>
                  <FinanceIcon name="calendar" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.webSyncBoxTitle, isDark && { color: themeColors.textPrimary }]}>Tự động đồng bộ Lịch tài chính</Text>
                    <Text style={[styles.webSyncBoxSub, isDark && { color: themeColors.textSecondary }]}>Khoản nợ luôn được theo dõi trên lịch để nhắc nhở và quản lý đúng hạn.</Text>
                  </View>
                </View>

                <View style={[styles.syncCardDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

                {/* Dropdown 1: Chọn tài khoản trích nợ tự động */}
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.dropdownHeaderWithBadge}>
                    <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>
                      {formType === 'BORROWING' ? 'Tài khoản trích nợ tự động (Tùy chọn)' : 'Tài khoản nhận tiền tự động (Tùy chọn)'}
                    </Text>
                    <Text style={[styles.syncStatusBadge, isDark && { backgroundColor: selectedAccountId ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: selectedAccountId ? themeColors.accentGreen : '#FBBF24', borderColor: themeColors.cardBorder }]}>
                      {selectedAccountId ? '⚡ Tự động trừ tiền' : '🔔 Chỉ nhắc nhở'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setPickerModalType('ACCOUNT')}
                    style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      {(() => {
                        const selAcc = accounts.find((a) => a.id === selectedAccountId);
                        if (!selAcc) {
                          return (
                            <Text style={[styles.modernSelectText, isDark && { color: themeColors.textSecondary }]} numberOfLines={1}>
                              Không gắn tài khoản (Chỉ gửi thông báo nhắc nợ)
                            </Text>
                          );
                        }
                        return (
                          <>
                            <AccountBadge account={selAcc} size={22} />
                            <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                              {selAcc.name} (Số dư: {formatVND(selAcc.balance)})
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>
                  <Text style={[styles.syncFieldNoteText, isDark && { color: themeColors.textMuted }]}>
                    {selectedAccountId
                      ? 'Khi đến hạn, hệ thống sẽ tự động trừ số dư ví đã chọn và ghi nhận lịch sử giao dịch.'
                      : 'Nếu không chọn ví, đến ngày hẹn hệ thống chỉ gửi chuông thông báo nhắc nhở mà không trừ tiền.'}
                  </Text>
                </View>

                {/* Dropdown 2: Chọn thời gian gửi thông báo nhắc hẹn */}
                <View>
                  <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>THỜI GIAN GỬI THÔNG BÁO NHẮC HẸN</Text>
                  <Pressable
                    onPress={() => setPickerModalType('NOTIFY_DAYS')}
                    style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                  >
                    <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}>
                      {formNotifyDaysBefore === 0 ? 'Báo đúng ngày đến hạn' :
                        formNotifyDaysBefore === 1 ? 'Nhắc trước 1 ngày (Khuyên dùng)' :
                          formNotifyDaysBefore === 2 ? 'Nhắc trước 2 ngày' :
                            formNotifyDaysBefore === 3 ? 'Nhắc trước 3 ngày' : 'Nhắc trước 1 tuần (7 ngày)'}
                    </Text>
                    <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>
                </View>
              </View>

              {/* 5. Ghi chú / Thỏa thuận */}
              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>GHI CHÚ / THỎA THUẬN</Text>
              <TextInput
                value={formNote}
                onChangeText={setFormNote}
                placeholder="Ghi chú về mục đích vay hoặc điều khoản hẹn trả..."
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, { minHeight: 70, textAlignVertical: 'top' }, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                multiline
              />

              {/* Nút Submit Lưu khoản nợ */}
              <Pressable
                onPress={handleCreateDebt}
                disabled={submittingDebt}
                style={[styles.modalSubmitBtn, submittingDebt && styles.btnDisabled]}
              >
                {submittingDebt ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Lưu khoản nợ</Text>
                )}
              </Pressable>
            </ScrollView>

            {/* OVERLAY POPUP DROPDOWN (Nằm trực tiếp trong Modal tạo nợ để bấm 100% ăn ngay) */}
            {pickerModalType !== 'NONE' && (
              <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => setPickerModalType('NONE')}
                />
                <View style={[styles.pickerModalBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                  <View style={[styles.pickerModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                      {pickerModalType === 'FREQ' && 'Chọn chu kỳ trả nợ'}
                      {pickerModalType === 'DAY_OF_MONTH' && 'Chọn ngày trả trong tháng'}
                      {pickerModalType === 'DAY_OF_WEEK' && 'Chọn thứ trả trong tuần'}
                      {pickerModalType === 'ACCOUNT' && 'Chọn tài khoản trích/nhận nợ'}
                      {pickerModalType === 'NOTIFY_DAYS' && 'Thời gian gửi thông báo nhắc hẹn'}
                    </Text>
                    <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                      <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : "#64748B"} />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                    {/* 1. Chọn Chu kỳ trả */}
                    {pickerModalType === 'FREQ' && (
                      <>
                        {[
                          { key: 'MONTHLY', label: 'Hàng tháng' },
                          { key: 'WEEKLY', label: 'Hàng tuần' },
                          { key: 'QUARTERLY', label: 'Hàng quý (3 tháng)' },
                        ].map((it) => (
                          <Pressable
                            key={it.key}
                            onPress={() => {
                              handleSelectFrequency(it.key as PaymentFrequency);
                              setPickerModalType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formFrequency === it.key && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, formFrequency === it.key && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                              {it.label}
                            </Text>
                            {formFrequency === it.key && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 2. Chọn Ngày trong tháng (1-31) */}
                    {pickerModalType === 'DAY_OF_MONTH' && (
                      <>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <Pressable
                            key={d}
                            onPress={() => {
                              handleSelectDayOfMonth(d);
                              setPickerModalType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formDayOfMonth === d && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, formDayOfMonth === d && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                              Ngày {d} hàng tháng
                            </Text>
                            {formDayOfMonth === d && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 3. Chọn Thứ trong tuần */}
                    {pickerModalType === 'DAY_OF_WEEK' && (
                      <>
                        {[
                          { key: 1, label: 'Thứ Hai hàng tuần' },
                          { key: 2, label: 'Thứ Ba hàng tuần' },
                          { key: 3, label: 'Thứ Tư hàng tuần' },
                          { key: 4, label: 'Thứ Năm hàng tuần' },
                          { key: 5, label: 'Thứ Sáu hàng tuần' },
                          { key: 6, label: 'Thứ Bảy hàng tuần' },
                          { key: 0, label: 'Chủ Nhật hàng tuần' },
                        ].map((it) => (
                          <Pressable
                            key={it.key}
                            onPress={() => {
                              handleSelectDayOfWeek(it.key);
                              setPickerModalType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formDayOfWeek === it.key && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, formDayOfWeek === it.key && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                              {it.label}
                            </Text>
                            {formDayOfWeek === it.key && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 4. Chọn Tài khoản */}
                    {pickerModalType === 'ACCOUNT' && (
                      <>
                        <Pressable
                          onPress={() => {
                            setSelectedAccountId('');
                            setPickerModalType('NONE');
                          }}
                          style={[
                            styles.pickerItemRow,
                            isDark && { borderBottomColor: themeColors.cardBorder },
                            !selectedAccountId && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, !selectedAccountId && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                              🔔 Không gắn tài khoản
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>Chỉ gửi thông báo nhắc nợ đúng hạn</Text>
                          </View>
                          {!selectedAccountId && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                        </Pressable>

                        {accounts.map((acc) => (
                          <Pressable
                            key={acc.id}
                            onPress={() => {
                              setSelectedAccountId(acc.id);
                              setPickerModalType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              selectedAccountId === acc.id && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <AccountBadge account={acc} size={34} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, selectedAccountId === acc.id && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                                {acc.name}
                              </Text>
                              <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                                Số dư: {formatVND(acc.balance)} · Tự động trừ khi đến hạn
                              </Text>
                            </View>
                            {selectedAccountId === acc.id && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 5. Chọn Thời gian thông báo */}
                    {pickerModalType === 'NOTIFY_DAYS' && (
                      <>
                        {[
                          { days: 0, label: 'Báo đúng ngày đến hạn' },
                          { days: 1, label: 'Nhắc trước 1 ngày (Khuyên dùng)' },
                          { days: 2, label: 'Nhắc trước 2 ngày' },
                          { days: 3, label: 'Nhắc trước 3 ngày' },
                          { days: 7, label: 'Nhắc trước 1 tuần (7 ngày)' },
                        ].map((it) => (
                          <Pressable
                            key={it.days}
                            onPress={() => {
                              setFormNotifyDaysBefore(it.days);
                              setPickerModalType('NONE');
                            }}
                            style={[
                              styles.pickerItemRow,
                              isDark && { borderBottomColor: themeColors.cardBorder },
                              formNotifyDaysBefore === it.days && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.pickerItemRowActive),
                            ]}
                          >
                            <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, formNotifyDaysBefore === it.days && (isDark ? { color: themeColors.accentGreen, fontWeight: '700' } : styles.pickerItemTextActive)]}>
                              {it.label}
                            </Text>
                            {formNotifyDaysBefore === it.days && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  /* ── HEADER ── */
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnArrow: {
    fontSize: 24,
    fontWeight: '300',
    color: '#0F172A',
    marginTop: -2,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* ── SCROLL CONTENT ── */
  scrollContent: {
    padding: 18,
  },

  /* ── 1. HERO BANNER CHUẨN 100% ẢNH MẪU ── */
  heroBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E964E',
    borderRadius: 22,
    paddingVertical: 14,
    paddingLeft: 20,
    paddingRight: 10,
    minHeight: 124,
    marginBottom: 16,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  heroBannerBgImage: {
    borderRadius: 22,
    resizeMode: 'cover',
  },
  heroLeftCol: {
    flex: 1,
    zIndex: 2,
    paddingRight: 8,
    justifyContent: 'center',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  heroLabelText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  eyeIconBtn: {
    padding: 2,
  },
  heroAmountText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroTrackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  heroTrackingBadgeText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroIllustrationWrap: {
    width: 155,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
    zIndex: 1,
  },
  heroIllustrationImg: {
    width: 155,
    height: 115,
  },

  /* ── 2. HAI CARD TÓM TẮT ── */
  summaryTwoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  debtSummaryCardPayable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 10,
  },
  debtSummaryCardReceivable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 10,
  },
  summaryIconCirclePayable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  summaryIconCircleReceivable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  summaryCard3dIcon: {
    width: 32,
    height: 32,
  },
  summaryCardInfoCol: {
    flex: 1,
  },
  summaryCardLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryCardAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  /* ── 3. HÀNG BỘ LỌC VÀ NÚT THÊM NỢ CÙNG 1 HÀNG ── */
  filterAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  compactFilterGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 2.5,
    flex: 1,
  },
  compactFilterPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  compactFilterPillActive: {
    backgroundColor: '#006747',
    shadowColor: '#006747',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  compactFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  compactFilterTextActive: {
    color: '#FFFFFF',
  },
  compactAddDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006747',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#006747',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  compactAddDebtBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* ── 4. DANH SÁCH KHOẢN NỢ ── */
  debtsListSection: {
    gap: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },

  /* ROW CARD CHUẨN 100% ẢNH MẪU */
  cleanDebtRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: '#F8FAFC',
  },
  cleanDebtIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtItem3dImg: {
    width: 48,
    height: 48,
  },
  cleanDebtCenterCol: {
    flex: 1,
    justifyContent: 'center',
  },
  cleanDebtTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  cleanDebtDueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanDebtDueDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  cleanDebtSubDetailText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  cleanDebtRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 6,
  },
  cleanDebtAmountBold: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  /* MINI PROGRESS BAR */
  miniProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniProgressBarBg: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  miniProgressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },

  /* COUNTDOWN PILL */
  countdownPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  countdownPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* CHEVRON WRAP */
  cleanDebtChevronWrap: {
    marginLeft: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── MODAL SHEET & DETAIL ── */
  modalKeyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── TRANG CHI TIẾT KHOẢN NỢ (CHUẨN 100% THEO THIẾT KẾ ẢNH MẪU) ── */
  detailScreenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailScreenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailBackCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScreenHeaderTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScreenScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  /* 2. Banner nền ảnh theo loại nợ */
  detailHeroBanner: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 110,
  },
  detailHeroBannerImgStyle: {
    borderRadius: 24,
  },
  detailHeroTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  detailHeroCategoryTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  detailHeroCategorySub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  detailHero3dWrap: {
    width: 130,
    height: 105,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -10,
  },
  detailHero3dImg: {
    width: 128,
    height: 102,
  },

  /* Card Tên khoản vay & Badge trạng thái */
  detailDebtNameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
    gap: 8,
  },
  detailDocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailDebtNameLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  detailDebtNameValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  detailDebtStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  detailDebtStatusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* 3. Khối 3 cột số tiền (Vay/Cho vay - Đã trả/thu - Còn lại) kèm tiến trình */
  detailBalanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailBalanceThreeCols: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBalanceColItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBalanceColDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  detailBalanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailBalanceColPrincipal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  detailBalanceColPaid: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  detailBalanceColRemaining: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  detailProgressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailProgressBarTrack: {
    flex: 1,
    height: 9,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  detailProgressBarFill: {
    height: '100%',
    backgroundColor: '#0E964E',
    borderRadius: 6,
  },
  detailProgressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0E964E',
    minWidth: 32,
    textAlign: 'right',
  },

  /* 4. Khối Thông tin chung / Thao tác / Lịch sử */
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSectionTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailSectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    marginBottom: 10,
  },

  /* Dòng thông tin khoản nợ */
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailInfoLabelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  detailInfoValueBoldText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailInfoValueRegularText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  /* 5. Cụm 3 nút thao tác: [Thanh toán] [Cập nhật] [Xóa nợ] */
  detailActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtnPay: {
    flex: 1.1,
    backgroundColor: '#0E964E',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  actionBtnPayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnUpdate: {
    flex: 1.15,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1.5,
  },
  actionBtnUpdateText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnDelete: {
    flex: 0.9,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionBtnDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },

  /* 6. Lịch sử thanh toán */
  detailHistoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHistoryViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E964E',
  },
  detailHistoryEmptyWrap: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailHistoryEmptyText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  historyPaymentRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyCheckGreenCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPaymentTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyPaymentDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  historyPaymentAmountGreen: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0E964E',
  },

  /* MODAL POPUP CHI TIẾT ĐỢT THANH TOÁN */
  paymentDetailModalCenterOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 20,
  },
  paymentDetailPopupBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
  },
  paymentDetailPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentDetailPopupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentDetailAmountCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  paymentDetailAmountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  paymentDetailAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  paymentDetailRowsWrap: {
    gap: 10,
    marginBottom: 16,
  },
  paymentDetailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  paymentDetailRowLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentDetailRowValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  paymentDetailRowValGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    maxWidth: '65%',
    textAlign: 'right',
  },
  paymentDetailRowValRegular: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  paymentDetailCloseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentDetailCloseBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },

  /* ── FORM THÊM NỢ (CHUẨN 100% WEB & DB) ── */
  webTypeSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webTypeSwitchBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  webTypeSwitchBtnActiveBorrow: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  webTypeSwitchBtnActiveLend: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#006747',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  webTypeSwitchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  webTypeSwitchBtnTextActiveBorrow: {
    color: '#DC2626',
  },
  webTypeSwitchBtnTextActiveLend: {
    color: '#006747',
  },
  inputSectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 14,
  },

  /* KHUNG HÌNH THỨC TRẢ NỢ */
  webPaymentBoxWrap: {
    backgroundColor: '#F8FBF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 14,
    marginBottom: 16,
  },
  webBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  webPlanSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  webPlanBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  webPlanBtnActive: {
    borderColor: '#006747',
    backgroundColor: '#ECFDF5',
  },
  webPlanBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  webPlanBtnTextActive: {
    color: '#006747',
  },
  webBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#14261E',
    marginBottom: 6,
  },
  webBigAmountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#006747',
  },
  inputTwoColsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  webDateInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    height: 40,
  },
  freqSwitchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  freqPillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqPillBtnActive: {
    borderColor: '#006747',
    backgroundColor: '#ECFDF5',
  },
  freqPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  freqPillTextActive: {
    color: '#006747',
  },
  autoCalcTotalBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
  },
  autoCalcLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  autoCalcValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#006747',
    marginTop: 2,
  },
  autoCalcSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },

  /* KHUNG ĐỒNG BỘ LỊCH */
  webSyncBoxWrap: {
    backgroundColor: '#F8FBF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 14,
    marginBottom: 16,
  },
  webSyncBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  webSyncBoxTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#006747',
  },
  accountPickPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  accountPickPillActive: {
    borderColor: '#006747',
    backgroundColor: '#ECFDF5',
  },
  accountPickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  accountPickTextActive: {
    color: '#006747',
  },
  notifyDayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  notifyDayPillActive: {
    borderColor: '#006747',
    backgroundColor: '#ECFDF5',
  },
  notifyDayPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  notifyDayPillTextActive: {
    color: '#006747',
  },

  /* ── DROPDOWN SELECTORS CHO FORM (CHUẨN WEB & MOBILE) ── */
  modernSelectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    height: 40,
  },
  modernSelectDropdownLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    height: 40,
    marginTop: 6,
  },
  modernSelectText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  modernSelectTextBold: {
    fontSize: 13,
    color: '#064E3B',
    fontWeight: '800',
    flex: 1,
  },
  installmentDaySelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 12,
  },
  installmentDayLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  syncCardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  webSyncBoxSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  dropdownHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  syncStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  syncFieldNoteText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    fontStyle: 'italic',
  },

  /* MODAL DROPDOWN PICKER SHEET */
  pickerModalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pickerModalBox: {
    width: '100%',
    maxHeight: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  pickerModalTitle: {
    fontSize: 15.5,
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

  /* NÚT SUBMIT */
  modalSubmitBtn: {
    backgroundColor: '#006747',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#006747',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payTargetNameText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  payTargetRemainingText: {
    fontSize: 14,
    color: '#64748B',
  },
});
