import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
        if (formFrequency === 'WEEKLY') {
          d.setDate(d.getDate() + count * 7);
        } else if (formFrequency === 'QUARTERLY') {
          d.setMonth(d.getMonth() + count * 3);
        } else {
          d.setMonth(d.getMonth() + count);
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
        startDate: isoStartDate,
        dueDate: computedDueDate,
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
          }).catch(() => {});
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
    Alert.alert(
      'Xóa khoản nợ',
      `Bạn có chắc chắn muốn xóa khoản nợ "${debt.counterpartyName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await debtApi.deleteDebt(debt.id);
            setDebts((prev) => prev.filter((d) => d.id !== debt.id));
            setSelectedDebtDetail(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── HEADER ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerRow}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.backBtnArrow}>‹</Text>
            </Pressable>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Quản lý nợ</Text>
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
            <View style={styles.debtSummaryCardPayable}>
              <View style={styles.summaryIconCirclePayable}>
                <FinanceIcon name="arrow-down" size={19} color="#DC2626" />
              </View>
              <View style={styles.summaryCardInfoCol}>
                <Text style={styles.summaryCardLabel}>Tôi đang nợ</Text>
                <Text style={styles.summaryCardAmount}>
                  {showBalance ? formatVND(totalBorrowingRemaining) : '****** đ'}
                </Text>
              </View>
            </View>

            {/* Card Xanh: Đang cho vay */}
            <View style={styles.debtSummaryCardReceivable}>
              <View style={styles.summaryIconCircleReceivable}>
                <FinanceIcon name="arrow-up" size={19} color="#059669" />
              </View>
              <View style={styles.summaryCardInfoCol}>
                <Text style={styles.summaryCardLabel}>Đang cho vay</Text>
                <Text style={styles.summaryCardAmount}>
                  {showBalance ? formatVND(totalLendingRemaining) : '****** đ'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 3. HÀNG BỘ LỌC VÀ NÚT THÊM KHOẢN NỢ TRÊN CÙNG 1 HÀNG ── */}
          <View style={styles.filterAndActionRow}>
            {/* Cụm 3 nút lọc nhỏ gọn: Tất cả | Đi vay | Cho nợ */}
            <View style={styles.compactFilterGroup}>
              <Pressable
                onPress={() => setSelectedTab('ALL')}
                style={[
                  styles.compactFilterPill,
                  selectedTab === 'ALL' && styles.compactFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
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
                  selectedTab === 'BORROWING' && styles.compactFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
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
                  selectedTab === 'LENDING' && styles.compactFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.compactFilterText,
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
              style={({ pressed }) => [styles.compactAddDebtBtn, pressed && styles.btnPressed]}
            >
              <FinanceIcon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.compactAddDebtBtnText}>Thêm nợ</Text>
            </Pressable>
          </View>

          {/* ── 4. DANH SÁCH KHOẢN NỢ (CHUẨN 100% THEO ẢNH BẠN GỬI) ── */}
          <View style={styles.debtsListSection}>
            {filteredDebts.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <FinanceIcon name="wallet" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>Chưa có khoản nợ nào</Text>
                <Text style={styles.emptySubText}>
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
                    style={({ pressed }) => [styles.cleanDebtRowCard, pressed && styles.cardPressed]}
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
                      <Text style={styles.cleanDebtTitleText} numberOfLines={1}>
                        {item.counterpartyName}
                      </Text>

                      {/* Dòng chi tiết phụ */}
                      {item.paidAmount > 0 && item.percentagePaid > 0 && item.id === 'demo-debt-5' ? (
                        <Text style={styles.cleanDebtSubDetailText} numberOfLines={1}>
                          Đã thu: {formatVND(item.paidAmount)} / {formatVND(item.principalAmount)}
                        </Text>
                      ) : (
                        <View style={styles.cleanDebtDueDateRow}>
                          <FinanceIcon name="calendar" size={13} color="#64748B" />
                          <Text style={styles.cleanDebtDueDateText}>
                            Đến hạn: {formatDate(item.dueDate)}
                          </Text>
                        </View>
                      )}
                    </View>

                      {/* 3. Cột số tiền & Tiến trình (nhiều kỳ) / Đếm ngược ngày (trả 1 lần) ở bên phải */}
                      {(() => {
                        const isInstallment = item.paymentFrequency && item.paymentFrequency !== 'ONE_TIME';
                        return (
                          <View style={styles.cleanDebtRightCol}>
                            <Text style={styles.cleanDebtAmountBold}>
                              {formatVND(item.remainingAmount)}
                            </Text>

                            {/* Nếu đã thanh toán hết: Luôn hiện huy hiệu Đã hoàn thành */}
                            {isPaidOff ? (
                              <View style={[styles.countdownPill, { backgroundColor: '#DCFCE7' }]}>
                                <Text style={[styles.countdownPillText, { color: '#059669' }]}>
                                  Đã hoàn thành
                                </Text>
                              </View>
                            ) : isInstallment ? (
                              <View style={styles.miniProgressRow}>
                                <View style={styles.miniProgressBarBg}>
                                  <View
                                    style={[
                                      styles.miniProgressBarFill,
                                      { width: `${Math.min(100, Math.max(0, item.percentagePaid))}%` },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.miniProgressPercentText}>
                                  {item.percentagePaid}%
                                </Text>
                              </View>
                            ) : countdown ? (
                              <View style={[styles.countdownPill, { backgroundColor: countdown.bg }]}>
                                <Text style={[styles.countdownPillText, { color: countdown.color }]}>
                                  {countdown.text}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })()}

                    {/* 4. Mũi tên điều hướng > */}
                    <View style={styles.cleanDebtChevronWrap}>
                      <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ── MODAL 1: CHI TIẾT KHOẢN NỢ (CHUẨN 100% THEO THIẾT KẾ ẢNH MẪU) ── */}
      <Modal
        visible={!!selectedDebtDetail}
        animationType="slide"
        onRequestClose={() => setSelectedDebtDetail(null)}
      >
        {selectedDebtDetail && (() => {
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

          // Loại nợ hiển thị
          const debtTypeLabel = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME'
            ? 'Trả góp'
            : (isBorrow ? 'Khoản đi vay' : 'Cho vay');

          return (
            <View style={[styles.detailScreenContainer, { paddingTop: Math.max(insets.top, 16) }]}>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

              {/* 1. Header chi tiết: [<] Chi tiết khoản nợ   [...] */}
              <View style={styles.detailScreenHeaderRow}>
                <Pressable
                  onPress={() => setSelectedDebtDetail(null)}
                  hitSlop={12}
                  style={styles.detailBackCircleBtn}
                >
                  <FinanceIcon name="chevron-left" size={22} color="#0E964E" />
                </Pressable>

                <Text style={styles.detailScreenHeaderTitle}>Chi tiết khoản nợ</Text>

                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Tùy chọn khoản nợ',
                      selectedDebtDetail.counterpartyName,
                      [
                        { text: 'Chỉnh sửa', onPress: handleOpenEditModal },
                        { text: 'Xóa khoản nợ', style: 'destructive', onPress: () => handleDeleteDebt(selectedDebtDetail) },
                        { text: 'Đóng', style: 'cancel' },
                      ]
                    );
                  }}
                  hitSlop={12}
                  style={styles.detailMoreBtn}
                >
                  <FinanceIcon name="more-horizontal" size={22} color="#047857" />
                </Pressable>
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
                <View style={styles.detailDebtNameCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={[
                        styles.detailDocIconWrap,
                        { backgroundColor: isBorrow ? '#FEE2E2' : '#DCFCE7' },
                      ]}
                    >
                      <FinanceIcon
                        name="file-text"
                        size={20}
                        color={isBorrow ? '#DC2626' : '#16A34A'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailDebtNameLabel}>
                        {isBorrow ? 'Tên khoản vay' : 'Tên khoản cho vay'}
                      </Text>
                      <Text style={styles.detailDebtNameValue} numberOfLines={1}>
                        {selectedDebtDetail.counterpartyName}
                      </Text>
                    </View>
                  </View>

                  {/* Pill trạng thái */}
                  <View
                    style={[
                      styles.detailDebtStatusPill,
                      { backgroundColor: isPaidOff ? '#DCFCE7' : (isBorrow ? '#FFF1F2' : '#F0FDF4') },
                    ]}
                  >
                    <FinanceIcon
                      name={isPaidOff ? 'check' : 'coin-stack'}
                      size={14}
                      color={isPaidOff ? '#059669' : (isBorrow ? '#E11D48' : '#059669')}
                    />
                    <Text
                      style={[
                        styles.detailDebtStatusPillText,
                        { color: isPaidOff ? '#059669' : (isBorrow ? '#E11D48' : '#059669') },
                      ]}
                    >
                      {isPaidOff ? 'Đã hoàn thành' : (isBorrow ? 'Đang vay' : 'Đang cho vay')}
                    </Text>
                  </View>
                </View>

                {/* 3. Khối 3 cột: Số tiền vay/cho vay - Đã trả/thu - Còn lại kèm thanh tiến trình */}
                <View style={styles.detailBalanceCard}>
                  <View style={styles.detailBalanceThreeCols}>
                    {/* Cột 1: Số tiền vay / Số tiền cho vay */}
                    <View style={styles.detailBalanceColItem}>
                      <Text style={styles.detailBalanceLabel}>
                        {isBorrow ? 'Số tiền vay' : 'Số tiền cho vay'}
                      </Text>
                      <Text style={styles.detailBalanceColPrincipal}>
                        {formatVND(displayPrincipal)}
                      </Text>
                    </View>

                    {/* Vạch phân cách 1 */}
                    <View style={styles.detailBalanceColDivider} />

                    {/* Cột 2: Đã trả / Đã thu */}
                    <View style={styles.detailBalanceColItem}>
                      <Text style={styles.detailBalanceLabel}>
                        {isBorrow ? 'Đã trả' : 'Đã thu'}
                      </Text>
                      <Text style={styles.detailBalanceColPaid}>
                        {formatVND(displayPaid)}
                      </Text>
                    </View>

                    {/* Vạch phân cách 2 */}
                    <View style={styles.detailBalanceColDivider} />

                    {/* Cột 3: Còn lại */}
                    <View style={styles.detailBalanceColItem}>
                      <Text style={styles.detailBalanceLabel}>Còn lại</Text>
                      <Text
                        style={[
                          styles.detailBalanceColRemaining,
                          { color: isBorrow ? '#DC2626' : '#059669' },
                        ]}
                      >
                        {formatVND(displayRemaining)}
                      </Text>
                    </View>
                  </View>

                  {/* Thanh tiến trình % chuẩn màu đỏ khi vay hoặc xanh khi cho vay */}
                  <View style={styles.detailProgressBarRow}>
                    <View style={styles.detailProgressBarTrack}>
                      <View
                        style={[
                          styles.detailProgressBarFill,
                          {
                            width: `${Math.min(100, Math.max(0, displayPercent))}%`,
                            backgroundColor: isBorrow ? '#DC2626' : '#059669',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.detailProgressPercentText,
                        { color: isBorrow ? '#DC2626' : '#059669' },
                      ]}
                    >
                      {displayPercent}%
                    </Text>
                  </View>
                </View>

                {/* 4. Khối Thông tin khoản nợ */}
                <View style={styles.detailSectionCard}>
                  {/* Tiêu đề section: Icon tài liệu xanh + 'Thông tin khoản nợ' */}
                  <View style={styles.detailSectionTitleRow}>
                    <View style={styles.sectionHeaderIconCircle}>
                      <FinanceIcon name="file-text" size={18} color="#16A34A" />
                    </View>
                    <Text style={styles.detailSectionTitleText}>Thông tin khoản nợ</Text>
                  </View>

                  <View style={styles.detailSectionDivider} />

                  {/* Dòng 1: Tổng số tiền */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.detailInfoLeft}>
                      <FinanceIcon name="layers" size={16} color="#64748B" />
                      <Text style={styles.detailInfoLabelText}>Tổng số tiền</Text>
                    </View>
                    <Text style={styles.detailInfoValueBoldText}>
                      {formatVND(displayPrincipal)}
                    </Text>
                  </View>

                  {/* Dòng 2: Ngày vay */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.detailInfoLeft}>
                      <FinanceIcon name="calendar" size={16} color="#64748B" />
                      <Text style={styles.detailInfoLabelText}>Ngày vay</Text>
                    </View>
                    <Text style={styles.detailInfoValueBoldText}>
                      {formatDate(selectedDebtDetail.startDate)}
                    </Text>
                  </View>

                  {/* Dòng 3: Hạn thanh toán */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.detailInfoLeft}>
                      <FinanceIcon name="calendar" size={16} color="#64748B" />
                      <Text style={styles.detailInfoLabelText}>Hạn thanh toán</Text>
                    </View>
                    <Text style={[styles.detailInfoValueBoldText, { color: '#0E964E' }]}>
                      {formatDate(selectedDebtDetail.dueDate)}
                    </Text>
                  </View>

                  {/* Dòng 4: Ghi chú */}
                  <View style={[styles.detailInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={styles.detailInfoLeft}>
                      <FinanceIcon name="credit-card" size={16} color="#64748B" />
                      <Text style={styles.detailInfoLabelText}>Ghi chú</Text>
                    </View>
                    <Text style={[styles.detailInfoValueRegularText, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                      {selectedDebtDetail.note || selectedDebtDetail.description || 'Không có ghi chú'}
                    </Text>
                  </View>
                </View>

                {/* 5. Khối Thao tác: [Thanh toán] [Cập nhật] [Xóa nợ] */}
                <View style={styles.detailSectionCard}>
                  <View style={styles.detailSectionTitleRow}>
                    <View style={styles.sectionHeaderIconCircle}>
                      <FinanceIcon name="zap" size={18} color="#16A34A" />
                    </View>
                    <Text style={styles.detailSectionTitleText}>Thao tác</Text>
                  </View>

                  <View style={styles.detailSectionDivider} />

                  <View style={styles.detailActionButtonsRow}>
                    {/* Nút 1: Thanh toán (Nền xanh đậm, icon ví trắng) */}
                    <Pressable
                      onPress={() => {
                        setSelectedDebtForPay(selectedDebtDetail);
                        setPayAmount(String(displayRemaining));
                        setPayAccountId(selectedDebtDetail.accountId || (accounts[0]?.id || ''));
                        setPayModalVisible(true);
                      }}
                      style={({ pressed }) => [styles.actionBtnPay, pressed && styles.cardPressed]}
                    >
                      <FinanceIcon name="wallet" size={20} color="#FFFFFF" />
                      <Text style={styles.actionBtnPayText}>Thanh toán</Text>
                    </Pressable>

                    {/* Nút 2: Sửa khoản nợ (Thiết kế hiện đại, tinh tế) */}
                    <Pressable
                      onPress={handleOpenEditModal}
                      style={({ pressed }) => [styles.actionBtnUpdate, pressed && styles.cardPressed]}
                    >
                      <FinanceIcon name="edit" size={17} color="#2563EB" />
                      <Text style={styles.actionBtnUpdateText}>Sửa khoản nợ</Text>
                    </Pressable>

                    {/* Nút 3: Xóa nợ (Nền hồng pastel viền mỏng, icon thùng rác đỏ) */}
                    <Pressable
                      onPress={() => handleDeleteDebt(selectedDebtDetail)}
                      style={({ pressed }) => [styles.actionBtnDelete, pressed && styles.cardPressed]}
                    >
                      <FinanceIcon name="trash" size={19} color="#EF4444" />
                      <Text style={styles.actionBtnDeleteText}>Xóa nợ</Text>
                    </Pressable>
                  </View>
                </View>

                {/* 6. Khối Lịch sử thanh toán */}
                <View style={styles.detailSectionCard}>
                  <View style={styles.detailHistoryHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.sectionHeaderIconCircle}>
                        <FinanceIcon name="rotate-ccw" size={17} color="#16A34A" />
                      </View>
                      <Text style={styles.detailSectionTitleText}>Lịch sử thanh toán</Text>
                    </View>
                  </View>

                  <View style={styles.detailSectionDivider} />

                  {historyList.length === 0 ? (
                    <View style={styles.detailHistoryEmptyWrap}>
                      <Text style={styles.detailHistoryEmptyText}>
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
                          pressed && { backgroundColor: '#F8FAFC' },
                          idx === historyList.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                        ]}
                      >
                        {/* Vòng tròn xanh lá có dấu tick trắng */}
                        <View style={styles.historyCheckGreenCircle}>
                          <FinanceIcon name="check" size={13} color="#0E964E" />
                        </View>

                        {/* Cột thông tin: 'Thanh toán' & Giờ + Ngày tháng */}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyPaymentTitleText}>Thanh toán</Text>
                          <Text style={styles.historyPaymentDateText}>{item.date}</Text>
                        </View>

                        {/* Số tiền thanh toán màu xanh lá: +1.500.000 đ */}
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text style={styles.historyPaymentAmountGreen}>
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
                  <View style={styles.paymentDetailPopupBox}>
                    {/* Header */}
                    <View style={styles.paymentDetailPopupHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.historyCheckGreenCircle}>
                          <FinanceIcon name="check" size={14} color="#0E964E" />
                        </View>
                        <Text style={styles.paymentDetailPopupTitle}>Chi tiết đợt thanh toán</Text>
                      </View>
                      <Pressable
                        onPress={() => setSelectedPaymentDetail(null)}
                        hitSlop={10}
                      >
                        <FinanceIcon name="close" size={18} color="#64748B" />
                      </Pressable>
                    </View>

                    {/* Số tiền thanh toán to nổi bật */}
                    <View style={styles.paymentDetailAmountCard}>
                      <Text style={styles.paymentDetailAmountLabel}>SỐ TIỀN ĐÃ THANH TOÁN</Text>
                      <Text style={styles.paymentDetailAmountValue}>
                        +{formatVND(selectedPaymentDetail?.amount || 0)}
                      </Text>
                    </View>

                    {/* Các dòng thông tin chi tiết */}
                    <View style={styles.paymentDetailRowsWrap}>
                      <View style={styles.paymentDetailRowItem}>
                        <Text style={styles.paymentDetailRowLabel}>Thời gian:</Text>
                        <Text style={styles.paymentDetailRowValBold}>
                          {selectedPaymentDetail?.date}
                        </Text>
                      </View>

                      <View style={styles.paymentDetailRowItem}>
                        <Text style={styles.paymentDetailRowLabel}>Khoản nợ:</Text>
                        <Text style={styles.paymentDetailRowValBold} numberOfLines={1}>
                          {selectedDebtDetail.counterpartyName}
                        </Text>
                      </View>

                      <View style={styles.paymentDetailRowItem}>
                        <Text style={styles.paymentDetailRowLabel}>Nguồn tiền trích:</Text>
                        <Text style={styles.paymentDetailRowValGreen}>
                          {selectedPaymentDetail?.accountName || 'Ví tiền mặt'}
                        </Text>
                      </View>

                      <View style={[styles.paymentDetailRowItem, { borderBottomWidth: 0 }]}>
                        <Text style={styles.paymentDetailRowLabel}>Ghi chú:</Text>
                        <Text style={styles.paymentDetailRowValRegular} numberOfLines={2}>
                          {selectedPaymentDetail?.note || 'Không có ghi chú'}
                        </Text>
                      </View>
                    </View>

                    {/* Nút Đóng */}
                    <Pressable
                      onPress={() => setSelectedPaymentDetail(null)}
                      style={styles.paymentDetailCloseBtn}
                    >
                      <Text style={styles.paymentDetailCloseBtnText}>Đóng</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>

              {/* ── MODAL SỬA KHOẢN NỢ (LỒNG TRỰC TIẾP TRONG CHI TIẾT ĐỂ BẬT NGAY LẬP TỨC) ── */}
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
                  <View style={styles.modalSheet}>
                    <View style={styles.modalDragBar} />

                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalHeaderTitle}>Sửa khoản nợ</Text>
                      <Pressable
                        onPress={() => setEditModalVisible(false)}
                        hitSlop={10}
                        style={styles.modalCloseBtn}
                      >
                        <FinanceIcon name="close" size={18} color="#64748B" />
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      <Text style={styles.inputSectionLabel}>TÊN KHOẢN VAY *</Text>
                      <TextInput
                        value={editCounterpartyName}
                        onChangeText={setEditCounterpartyName}
                        placeholder="Ví dụ: Vay mua xe, Trả góp laptop, Vay anh Long..."
                        placeholderTextColor="#94A3B8"
                        style={styles.modalTextInput}
                      />

                      <Text style={styles.inputSectionLabel}>SỐ ĐIỆN THOẠI LIÊN HỆ</Text>
                      <TextInput
                        value={editPartnerPhone}
                        onChangeText={setEditPartnerPhone}
                        placeholder="0987654321..."
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        style={styles.modalTextInput}
                      />

                      <Text style={styles.inputSectionLabel}>TỔNG SỐ TIỀN NỢ (VNĐ) *</Text>
                      <TextInput
                        value={editPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(editPrincipal.replace(/\D/g, '') || '0', 10)) : ''}
                        onChangeText={(val) => {
                          const cleaned = val.replace(/\D/g, '');
                          setEditPrincipal(cleaned);
                        }}
                        placeholder="Nhập tổng số tiền..."
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={styles.modalTextInput}
                      />

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputSectionLabel}>NGÀY BẮT ĐẦU</Text>
                          <TextInput
                            value={editStartDate}
                            onChangeText={(val) => setEditStartDate(formatInputDDMMYYYY(val))}
                            placeholder="DD-MM-YYYY"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            style={styles.modalTextInput}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputSectionLabel}>HẠN THANH TOÁN</Text>
                          <TextInput
                            value={editDueDate}
                            onChangeText={(val) => setEditDueDate(formatInputDDMMYYYY(val))}
                            placeholder="DD-MM-YYYY"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            style={styles.modalTextInput}
                          />
                        </View>
                      </View>

                      <Text style={styles.inputSectionLabel}>TÀI KHOẢN / VÍ LIÊN KẾT</Text>
                      <Pressable
                        onPress={() => setPickerModalType('EDIT_ACCOUNT')}
                        style={[styles.modernSelectDropdown, { marginBottom: 14 }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          {(() => {
                            const selAcc = accounts.find((a) => a.id === editAccountId);
                            if (!selAcc) {
                              return (
                                <Text style={styles.modernSelectText} numberOfLines={1}>
                                  Không gắn tài khoản (Chỉ gửi nhắc nợ)
                                </Text>
                              );
                            }
                            return (
                              <>
                                <AccountBadge account={selAcc} size={22} />
                                <Text style={styles.modernSelectText} numberOfLines={1}>
                                  {selAcc.name} (Số dư: {formatVND(selAcc.balance)})
                                </Text>
                              </>
                            );
                          })()}
                        </View>
                        <FinanceIcon name="chevron-down" size={16} color="#047857" />
                      </Pressable>

                      <Text style={styles.inputSectionLabel}>GHI CHÚ / THỎA THUẬN</Text>
                      <TextInput
                        value={editNote}
                        onChangeText={setEditNote}
                        placeholder="Ví dụ: Vay mua đồ, thỏa thuận trả trước..."
                        placeholderTextColor="#94A3B8"
                        style={styles.modalTextInput}
                      />

                      <Pressable
                        onPress={handleSaveUpdateDebt}
                        disabled={submittingEdit}
                        style={[styles.modalSubmitBtn, submittingEdit && styles.btnDisabled]}
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
                        <View style={styles.pickerModalBox}>
                          <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>Chọn tài khoản / ví liên kết</Text>
                            <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                              <FinanceIcon name="close" size={18} color="#64748B" />
                            </Pressable>
                          </View>

                          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                            <Pressable
                              onPress={() => {
                                setEditAccountId('');
                                setPickerModalType('NONE');
                              }}
                              style={[styles.pickerItemRow, !editAccountId && styles.pickerItemRowActive]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.pickerItemText, !editAccountId && styles.pickerItemTextActive]}>
                                  🔔 Không gắn tài khoản
                                </Text>
                                <Text style={styles.pickerItemSub}>Chỉ gửi thông báo nhắc nợ đúng hạn</Text>
                              </View>
                              {!editAccountId && <FinanceIcon name="check" size={16} color="#0E964E" />}
                            </Pressable>

                            {accounts.map((acc) => (
                              <Pressable
                                key={acc.id}
                                onPress={() => {
                                  setEditAccountId(acc.id);
                                  setPickerModalType('NONE');
                                }}
                                style={[styles.pickerItemRow, editAccountId === acc.id && styles.pickerItemRowActive]}
                              >
                                <AccountBadge account={acc} size={34} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text style={[styles.pickerItemText, editAccountId === acc.id && styles.pickerItemTextActive]}>
                                    {acc.name}
                                  </Text>
                                  <Text style={styles.pickerItemSub}>
                                    Số dư: {formatVND(acc.balance)} · Tự động trừ khi đến hạn
                                  </Text>
                                </View>
                                {editAccountId === acc.id && <FinanceIcon name="check" size={16} color="#0E964E" />}
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                </KeyboardAvoidingView>
              </Modal>

              {/* ── MODAL THANH TOÁN / THU NỢ (LỒNG TRỰC TIẾP TRONG CHI TIẾT ĐỂ BẬT NGAY LẬP TỨC) ── */}
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
                  <View style={styles.modalSheet}>
                    <View style={styles.modalDragBar} />

                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalHeaderTitle}>
                        {selectedDebtForPay?.debtType === 'BORROWING' ? 'Ghi nhận trả nợ' : 'Ghi nhận thu nợ'}
                      </Text>
                      <Pressable
                        onPress={() => setPayModalVisible(false)}
                        hitSlop={10}
                        style={styles.modalCloseBtn}
                      >
                        <FinanceIcon name="close" size={18} color="#64748B" />
                      </Pressable>
                    </View>

                    {selectedDebtForPay && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={styles.payTargetNameText}>
                          Đối tác: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{selectedDebtForPay.counterpartyName}</Text>
                        </Text>
                        <Text style={styles.payTargetRemainingText}>
                          Số tiền còn lại: <Text style={{ fontWeight: '800', color: '#059669' }}>{formatVND(selectedDebtForPay.remainingAmount)}</Text>
                        </Text>
                      </View>
                    )}

                    <Text style={styles.inputSectionLabel}>SỐ TIỀN THANH TOÁN (VNĐ) *</Text>
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
                      placeholderTextColor="#94A3B8"
                      style={styles.modalTextInput}
                      autoFocus
                    />

                    <Text style={styles.inputSectionLabel}>
                      {selectedDebtForPay?.debtType === 'BORROWING' ? 'NGUỒN TIỀN TRÍCH TRẢ *' : 'TÀI KHOẢN NHẬN TIỀN *'}
                    </Text>
                    <Pressable
                      onPress={() => setPickerModalType('PAY_ACCOUNT')}
                      style={[styles.modernSelectDropdown, { marginBottom: 14 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        {(() => {
                          const chosenAcc = accounts.find((a) => a.id === payAccountId);
                          if (!chosenAcc) {
                            return <Text style={styles.modernSelectText}>Ví tiền mặt (Mặc định)</Text>;
                          }
                          return (
                            <>
                              <AccountBadge account={chosenAcc} size={22} />
                              <Text style={styles.modernSelectText} numberOfLines={1}>
                                {chosenAcc.name} (Số dư: {formatVND(chosenAcc.balance)})
                              </Text>
                            </>
                          );
                        })()}
                      </View>
                      <FinanceIcon name="chevron-down" size={16} color="#047857" />
                    </Pressable>

                    <Text style={styles.inputSectionLabel}>GHI CHÚ THANH TOÁN</Text>
                    <TextInput
                      value={payNote}
                      onChangeText={setPayNote}
                      placeholder="Ví dụ: Trả đợt 1, Chuyển khoản qua ngân hàng..."
                      placeholderTextColor="#94A3B8"
                      style={styles.modalTextInput}
                    />

                    <Pressable
                      onPress={handleRecordPayment}
                      disabled={submittingPay}
                      style={[styles.modalSubmitBtn, submittingPay && styles.btnDisabled]}
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
                        <View style={styles.pickerModalBox}>
                          <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>Chọn nguồn tiền thanh toán</Text>
                            <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                              <FinanceIcon name="close" size={18} color="#64748B" />
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
                                style={[styles.pickerItemRow, payAccountId === acc.id && styles.pickerItemRowActive]}
                              >
                                <AccountBadge account={acc} size={34} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text style={[styles.pickerItemText, payAccountId === acc.id && styles.pickerItemTextActive]}>
                                    {acc.name}
                                  </Text>
                                  <Text style={styles.pickerItemSub}>
                                    Số dư: {formatVND(acc.balance)}
                                  </Text>
                                </View>
                                {payAccountId === acc.id && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
        })()}
      </Modal>

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
          <View style={[styles.modalSheet, { position: 'relative' }]}>
            <View style={styles.modalDragBar} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Thêm khoản nợ mới</Text>
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <FinanceIcon name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* 1. Type Switch: Khoản đi vay vs Khoản cho vay */}
              <View style={styles.webTypeSwitchWrap}>
                <Pressable
                  onPress={() => setFormType('BORROWING')}
                  style={[
                    styles.webTypeSwitchBtn,
                    formType === 'BORROWING' && styles.webTypeSwitchBtnActiveBorrow,
                  ]}
                >
                  <Text
                    style={[
                      styles.webTypeSwitchBtnText,
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
                  ]}
                >
                  <Text
                    style={[
                      styles.webTypeSwitchBtnText,
                      formType === 'LENDING' && styles.webTypeSwitchBtnTextActiveLend,
                    ]}
                  >
                    Khoản cho vay
                  </Text>
                </Pressable>
              </View>

              {/* 2. Tên khoản vay & Số điện thoại */}
              <Text style={styles.inputSectionLabel}>
                {formType === 'BORROWING' ? 'TÊN KHOẢN VAY *' : 'TÊN KHOẢN CHO VAY *'}
              </Text>
              <TextInput
                value={formPartnerName}
                onChangeText={setFormPartnerName}
                placeholder={formType === 'BORROWING' ? 'Ví dụ: Vay mua xe, Mượn tiền đóng học phí, Vay anh Long...' : 'Ví dụ: Cho Nam vay, Cho mượn tiền...'}
                placeholderTextColor="#94A3B8"
                style={styles.modalTextInput}
              />

              <Text style={styles.inputSectionLabel}>SỐ ĐIỆN THOẠI LIÊN HỆ (TÙY CHỌN)</Text>
              <TextInput
                value={formPartnerPhone}
                onChangeText={setFormPartnerPhone}
                keyboardType="phone-pad"
                placeholder="Ví dụ: 0912345678"
                placeholderTextColor="#94A3B8"
                style={styles.modalTextInput}
              />

              {/* 3. Khung Hình thức trả nợ: Trả một lần vs Trả theo kỳ */}
              <View style={styles.webPaymentBoxWrap}>
                <Text style={styles.webBoxTitle}>HÌNH THỨC & LỊCH TRÌNH THANH TOÁN</Text>

                <View style={styles.webPlanSwitchRow}>
                  <Pressable
                    onPress={() => setPaymentPlanType('ONE_TIME')}
                    style={[
                      styles.webPlanBtn,
                      paymentPlanType === 'ONE_TIME' && styles.webPlanBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.webPlanBtnText,
                        paymentPlanType === 'ONE_TIME' && styles.webPlanBtnTextActive,
                      ]}
                    >
                      Trả một lần
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPaymentPlanType('INSTALLMENT')}
                    style={[
                      styles.webPlanBtn,
                      paymentPlanType === 'INSTALLMENT' && styles.webPlanBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.webPlanBtnText,
                        paymentPlanType === 'INSTALLMENT' && styles.webPlanBtnTextActive,
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
                      <Text style={styles.webBoxLabel}>TỔNG SỐ TIỀN NỢ (VND) *</Text>
                      <TextInput
                        value={formPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(formPrincipal, 10)) : ''}
                        onChangeText={(val) => setFormPrincipal(val.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        style={styles.webBigAmountInput}
                      />
                    </View>

                    <View style={styles.inputTwoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.webBoxLabel}>NGÀY BẮT ĐẦU</Text>
                        <TextInput
                          value={formStartDate}
                          onChangeText={(val) => setFormStartDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.webDateInput}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.webBoxLabel}>NGÀY PHẢI TRẢ *</Text>
                        <TextInput
                          value={formDueDate}
                          onChangeText={(val) => setFormDueDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.webDateInput}
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
                        <Text style={styles.webBoxLabel}>CHU KỲ TRẢ</Text>
                        <Pressable
                          onPress={() => setPickerModalType('FREQ')}
                          style={styles.modernSelectDropdown}
                        >
                          <Text style={styles.modernSelectText} numberOfLines={1}>
                            {formFrequency === 'MONTHLY' ? 'Hàng tháng' : formFrequency === 'WEEKLY' ? 'Hàng tuần' : 'Hàng quý (3 tháng)'}
                          </Text>
                          <FinanceIcon name="chevron-down" size={16} color="#047857" />
                        </Pressable>
                      </View>

                      {/* Số kỳ chia */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.webBoxLabel}>SỐ KỲ CHIA</Text>
                        <TextInput
                          value={formInstallmentCount}
                          onChangeText={handleInstallmentCountChange}
                          keyboardType="numeric"
                          placeholder="Ví dụ: 3, 6, 12..."
                          placeholderTextColor="#94A3B8"
                          style={styles.webDateInput}
                        />
                      </View>
                    </View>

                    {/* Dropdown chọn ngày trong tháng hoặc thứ trong tuần */}
                    <View style={styles.installmentDaySelectCard}>
                      {formFrequency === 'WEEKLY' ? (
                        <View>
                          <Text style={styles.installmentDayLabel}>Trả vào thứ mấy hàng tuần?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_WEEK')}
                            style={styles.modernSelectDropdownLight}
                          >
                            <Text style={styles.modernSelectTextBold}>
                              {formDayOfWeek === 1 ? 'Thứ Hai hàng tuần' :
                               formDayOfWeek === 2 ? 'Thứ Ba hàng tuần' :
                               formDayOfWeek === 3 ? 'Thứ Tư hàng tuần' :
                               formDayOfWeek === 4 ? 'Thứ Năm hàng tuần' :
                               formDayOfWeek === 5 ? 'Thứ Sáu hàng tuần' :
                               formDayOfWeek === 6 ? 'Thứ Bảy hàng tuần' : 'Chủ Nhật hàng tuần'}
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color="#047857" />
                          </Pressable>
                        </View>
                      ) : (
                        <View>
                          <Text style={styles.installmentDayLabel}>Trả vào ngày mấy hàng tháng?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_MONTH')}
                            style={styles.modernSelectDropdownLight}
                          >
                            <Text style={styles.modernSelectTextBold}>
                              Ngày {formDayOfMonth} hàng tháng
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color="#047857" />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputTwoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.webBoxLabel}>SỐ TIỀN MỖI KỲ (VND) *</Text>
                        <TextInput
                          value={formPeriodicAmount ? new Intl.NumberFormat('vi-VN').format(parseInt(formPeriodicAmount, 10)) : ''}
                          onChangeText={handlePeriodicAmountChange}
                          keyboardType="numeric"
                          placeholder="Ví dụ: 2.000.000"
                          placeholderTextColor="#94A3B8"
                          style={styles.webDateInput}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.webBoxLabel}>NGÀY TRẢ ĐẦU TIÊN</Text>
                        <TextInput
                          value={formFirstPaymentDate}
                          onChangeText={(val) => setFormFirstPaymentDate(formatInputDDMMYYYY(val))}
                          placeholder="DD-MM-YYYY"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.webDateInput}
                        />
                      </View>
                    </View>

                    {/* Tổng số tiền nợ tự động tính */}
                    <View style={styles.autoCalcTotalBox}>
                      <Text style={styles.autoCalcLabel}>
                        Tổng số tiền nợ (Tự tính theo số kỳ & tiền kỳ):
                      </Text>
                      <Text style={styles.autoCalcValue}>
                        {formPrincipal ? formatVND(parseInt(formPrincipal, 10)) : '0 đ'}
                      </Text>
                      {formPeriodicAmount && (
                        <Text style={styles.autoCalcSub}>
                          ≈ {formatVND(parseInt(formPeriodicAmount, 10))} × {formInstallmentCount} kỳ
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Tự động đồng bộ Lịch tài chính & Tài khoản (Chuẩn Web Dropdown) */}
              <View style={styles.webSyncBoxWrap}>
                <View style={styles.webSyncBoxHeader}>
                  <FinanceIcon name="calendar" size={16} color="#047857" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.webSyncBoxTitle}>Tự động đồng bộ Lịch tài chính</Text>
                    <Text style={styles.webSyncBoxSub}>Khoản nợ luôn được theo dõi trên lịch để nhắc nhở và quản lý đúng hạn.</Text>
                  </View>
                </View>

                <View style={styles.syncCardDivider} />

                {/* Dropdown 1: Chọn tài khoản trích nợ tự động */}
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.dropdownHeaderWithBadge}>
                    <Text style={styles.webBoxLabel}>
                      {formType === 'BORROWING' ? 'Tài khoản trích nợ tự động (Tùy chọn)' : 'Tài khoản nhận tiền tự động (Tùy chọn)'}
                    </Text>
                    <Text style={styles.syncStatusBadge}>
                      {selectedAccountId ? '⚡ Tự động trừ tiền' : '🔔 Chỉ nhắc nhở'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setPickerModalType('ACCOUNT')}
                    style={styles.modernSelectDropdown}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      {(() => {
                        const selAcc = accounts.find((a) => a.id === selectedAccountId);
                        if (!selAcc) {
                          return (
                            <Text style={styles.modernSelectText} numberOfLines={1}>
                              Không gắn tài khoản (Chỉ gửi thông báo nhắc nợ)
                            </Text>
                          );
                        }
                        return (
                          <>
                            <AccountBadge account={selAcc} size={22} />
                            <Text style={styles.modernSelectText} numberOfLines={1}>
                              {selAcc.name} (Số dư: {formatVND(selAcc.balance)})
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    <FinanceIcon name="chevron-down" size={16} color="#047857" />
                  </Pressable>
                  <Text style={styles.syncFieldNoteText}>
                    {selectedAccountId
                      ? 'Khi đến hạn, hệ thống sẽ tự động trừ số dư ví đã chọn và ghi nhận lịch sử giao dịch.'
                      : 'Nếu không chọn ví, đến ngày hẹn hệ thống chỉ gửi chuông thông báo nhắc nhở mà không trừ tiền.'}
                  </Text>
                </View>

                {/* Dropdown 2: Chọn thời gian gửi thông báo nhắc hẹn */}
                <View>
                  <Text style={styles.webBoxLabel}>THỜI GIAN GỬI THÔNG BÁO NHẮC HẸN</Text>
                  <Pressable
                    onPress={() => setPickerModalType('NOTIFY_DAYS')}
                    style={styles.modernSelectDropdown}
                  >
                    <Text style={styles.modernSelectText}>
                      {formNotifyDaysBefore === 0 ? 'Báo đúng ngày đến hạn' :
                       formNotifyDaysBefore === 1 ? 'Nhắc trước 1 ngày (Khuyên dùng)' :
                       formNotifyDaysBefore === 2 ? 'Nhắc trước 2 ngày' :
                       formNotifyDaysBefore === 3 ? 'Nhắc trước 3 ngày' : 'Nhắc trước 1 tuần (7 ngày)'}
                    </Text>
                    <FinanceIcon name="chevron-down" size={16} color="#047857" />
                  </Pressable>
                </View>
              </View>

              {/* 5. Ghi chú / Thỏa thuận */}
              <Text style={styles.inputSectionLabel}>GHI CHÚ / THỎA THUẬN</Text>
              <TextInput
                value={formNote}
                onChangeText={setFormNote}
                placeholder="Ghi chú về mục đích vay hoặc điều khoản hẹn trả..."
                placeholderTextColor="#94A3B8"
                style={[styles.modalTextInput, { minHeight: 70, textAlignVertical: 'top' }]}
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
                <View style={styles.pickerModalBox}>
                  <View style={styles.pickerModalHeader}>
                    <Text style={styles.pickerModalTitle}>
                      {pickerModalType === 'FREQ' && 'Chọn chu kỳ trả nợ'}
                      {pickerModalType === 'DAY_OF_MONTH' && 'Chọn ngày trả trong tháng'}
                      {pickerModalType === 'DAY_OF_WEEK' && 'Chọn thứ trả trong tuần'}
                      {pickerModalType === 'ACCOUNT' && 'Chọn tài khoản trích/nhận nợ'}
                      {pickerModalType === 'NOTIFY_DAYS' && 'Thời gian gửi thông báo nhắc hẹn'}
                    </Text>
                    <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                      <FinanceIcon name="close" size={18} color="#64748B" />
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
                            style={[styles.pickerItemRow, formFrequency === it.key && styles.pickerItemRowActive]}
                          >
                            <Text style={[styles.pickerItemText, formFrequency === it.key && styles.pickerItemTextActive]}>
                              {it.label}
                            </Text>
                            {formFrequency === it.key && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
                            style={[styles.pickerItemRow, formDayOfMonth === d && styles.pickerItemRowActive]}
                          >
                            <Text style={[styles.pickerItemText, formDayOfMonth === d && styles.pickerItemTextActive]}>
                              Ngày {d} hàng tháng
                            </Text>
                            {formDayOfMonth === d && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
                            style={[styles.pickerItemRow, formDayOfWeek === it.key && styles.pickerItemRowActive]}
                          >
                            <Text style={[styles.pickerItemText, formDayOfWeek === it.key && styles.pickerItemTextActive]}>
                              {it.label}
                            </Text>
                            {formDayOfWeek === it.key && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
                          style={[styles.pickerItemRow, !selectedAccountId && styles.pickerItemRowActive]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickerItemText, !selectedAccountId && styles.pickerItemTextActive]}>
                              🔔 Không gắn tài khoản
                            </Text>
                            <Text style={styles.pickerItemSub}>Chỉ gửi thông báo nhắc nợ đúng hạn</Text>
                          </View>
                          {!selectedAccountId && <FinanceIcon name="check" size={16} color="#0E964E" />}
                        </Pressable>

                        {accounts.map((acc) => (
                          <Pressable
                            key={acc.id}
                            onPress={() => {
                              setSelectedAccountId(acc.id);
                              setPickerModalType('NONE');
                            }}
                            style={[styles.pickerItemRow, selectedAccountId === acc.id && styles.pickerItemRowActive]}
                          >
                            <AccountBadge account={acc} size={34} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.pickerItemText, selectedAccountId === acc.id && styles.pickerItemTextActive]}>
                                {acc.name}
                              </Text>
                              <Text style={styles.pickerItemSub}>
                                Số dư: {formatVND(acc.balance)} · Tự động trừ khi đến hạn
                              </Text>
                            </View>
                            {selectedAccountId === acc.id && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
                            style={[styles.pickerItemRow, formNotifyDaysBefore === it.days && styles.pickerItemRowActive]}
                          >
                            <Text style={[styles.pickerItemText, formNotifyDaysBefore === it.days && styles.pickerItemTextActive]}>
                              {it.label}
                            </Text>
                            {formNotifyDaysBefore === it.days && <FinanceIcon name="check" size={16} color="#0E964E" />}
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
