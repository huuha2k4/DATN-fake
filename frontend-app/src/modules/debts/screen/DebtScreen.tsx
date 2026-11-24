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
import { AppDatePicker } from '../../core/components/AppDatePicker';
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
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' Ä‘';
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
    // Náº¿u chá»‰ cÃ³ ngÃ y YYYY-MM-DD khÃ´ng cÃ³ giá», bá»• sung giá» hiá»‡n táº¡i hoáº·c hiá»ƒn thá»‹ ngÃ y chuáº©n
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

// Chuyá»ƒn chuá»—i chá»‰ chá»©a sá»‘ thÃ nh dd-mm-yyyy tá»± Ä‘á»™ng khi gÃµ
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

// Chuyá»ƒn ngÆ°á»£c tá»« DD-MM-YYYY (hoáº·c DD/MM/YYYY) sang YYYY-MM-DD Ä‘á»ƒ gá»­i lÃªn API backend
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
  // Náº¿u Ä‘Ã£ lÃ  YYYY-MM-DD thÃ¬ giá»¯ nguyÃªn
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

// Chuyá»ƒn tá»« ngÃ y hiá»‡n táº¡i sang DD-MM-YYYY máº·c Ä‘á»‹nh
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
      text: 'ÄÃ£ hoÃ n thÃ nh',
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
        text: `QuÃ¡ háº¡n ${Math.abs(diffDays)} ngÃ y`,
        color: '#DC2626',
        bg: '#FEE2E2',
      };
    }
    if (diffDays <= 3) {
      return {
        text: diffDays === 0 ? 'HÃ´m nay' : `CÃ²n ${diffDays} ngÃ y`,
        color: '#DC2626',
        bg: '#FEE2E2',
      };
    }
    if (diffDays <= 15) {
      return {
        text: `CÃ²n ${diffDays} ngÃ y`,
        color: '#16A34A',
        bg: '#DCFCE7',
      };
    }
    return {
      text: `CÃ²n ${diffDays} ngÃ y`,
      color: '#D97706',
      bg: '#FEF3C7',
    };
  } catch {
    return null;
  }
}

function resolveDebtVisual(title: string, debtType: DebtType): { icon?: IconName; image?: any; color: string; bg: string } {
  // Chá»‰ dÃ¹ng 2 icon duy nháº¥t: Ná»£ (BORROWING) vÃ  Vay (LENDING)
  if (debtType === 'LENDING') {
    return { image: LENDING_3D_IMG, icon: 'lending', color: '#16A34A', bg: 'transparent' };
  }
  return { image: BORROWING_3D_IMG, icon: 'borrowing', color: '#EF4444', bg: 'transparent' };
}

type TabFilter = 'ALL' | 'BORROWING' | 'LENDING';

export function DebtScreen({ onBack }: DebtScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const { confirmDelete, showSuccess, showError } = useAppDialog();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [summary, setSummary] = useState<DebtSummaryData | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  // Tab filter: Táº¥t cáº£ | Äi vay | Cho ná»£
  const [selectedTab, setSelectedTab] = useState<TabFilter>('ALL');

  // áº¨n / hiá»‡n sá»‘ dÆ°
  const [showBalance, setShowBalance] = useState(true);

  // â”€â”€ FORM Táº O KHOáº¢N Ná»¢ (CHUáº¨N 100% THEO DATABASE VÃ€ WEB) â”€â”€
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [submittingDebt, setSubmittingDebt] = useState(false);
  const [formType, setFormType] = useState<DebtType>('BORROWING');
  const [formPartnerName, setFormPartnerName] = useState('');
  const [formPartnerPhone, setFormPartnerPhone] = useState('');
  const [paymentPlanType, setPaymentPlanType] = useState<PaymentPlanType>('ONE_TIME');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date | null>(new Date());
  const [formDueDate, setFormDueDate] = useState<Date | null>(null);
  // TrÆ°á»ng tráº£ theo ká»³ (INSTALLMENT)
  const [formFrequency, setFormFrequency] = useState<PaymentFrequency>('MONTHLY');
  const [formInstallmentCount, setFormInstallmentCount] = useState('3');
  const [formPeriodicAmount, setFormPeriodicAmount] = useState('');
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(new Date().getDate()); // NgÃ y trong thÃ¡ng (1-31)
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1); // Thá»© trong tuáº§n (1: Thá»© 2 ... 0: CN)
  const [formFirstPaymentDate, setFormFirstPaymentDate] = useState<Date | null>(new Date());

  // TÃ i khoáº£n & nháº¯c nhá»Ÿ
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [formNotifyDaysBefore, setFormNotifyDaysBefore] = useState(1);
  const [formNote, setFormNote] = useState('');

  // Dropdown Picker Modals
  const [pickerModalType, setPickerModalType] = useState<'NONE' | 'FREQ' | 'DAY_OF_MONTH' | 'DAY_OF_WEEK' | 'ACCOUNT' | 'NOTIFY_DAYS' | 'EDIT_ACCOUNT' | 'PAY_ACCOUNT'>('NONE');

  // Modal Chi tiáº¿t & Thao tÃ¡c khoáº£n ná»£ khi báº¥m vÃ o card (Chuáº©n thiáº¿t káº¿ áº£nh máº«u)
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtItem | null>(null);
  const [debtDetailLoading, setDebtDetailLoading] = useState(false);
  const [detailFullData, setDetailFullData] = useState<any | null>(null);
  const [demoPayments, setDemoPayments] = useState<Record<string, Array<{ id: string; amount: number; paymentDate: string; note?: string }>>>({
    'demo-debt-1': [
      { id: 'pay-1', amount: 1500000, paymentDate: '2026-11-05', note: 'Thanh toÃ¡n Ä‘á»£t 3' },
      { id: 'pay-2', amount: 1500000, paymentDate: '2026-11-01', note: 'Thanh toÃ¡n Ä‘á»£t 2' },
      { id: 'pay-3', amount: 1500000, paymentDate: '2026-10-20', note: 'Thanh toÃ¡n Ä‘á»£t 1' },
    ],
  });

  // Modal Sá»­a khoáº£n ná»£ (Sá»­a full thÃ´ng tin khoáº£n ná»£)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCounterpartyName, setEditCounterpartyName] = useState('');
  const [editPartnerPhone, setEditPartnerPhone] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [editAccountId, setEditAccountId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Ghi nháº­n tráº£ ná»£ / thu ná»£
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
    formattedDate?: string;
    date?: string;
    note: string;
    accountName?: string;
  } | null>(null);

  // Má»Ÿ trang chi tiáº¿t khoáº£n ná»£ (kÃ¨m táº£i dá»¯ liá»‡u tá»« API hoáº·c dá»¯ liá»‡u demo)
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

  // Má»Ÿ modal sá»­a khoáº£n ná»£
  const handleOpenEditModal = () => {
    if (!selectedDebtDetail) return;
    setEditCounterpartyName(selectedDebtDetail.counterpartyName || '');
    setEditPartnerPhone(selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone || '');
    setEditPrincipal(selectedDebtDetail.principalAmount ? String(selectedDebtDetail.principalAmount) : '');
    setEditStartDate(selectedDebtDetail.startDate ? new Date(selectedDebtDetail.startDate) : null);
    setEditDueDate(selectedDebtDetail.dueDate ? new Date(selectedDebtDetail.dueDate) : null);
    setEditAccountId(selectedDebtDetail.accountId || '');
    setEditNote(selectedDebtDetail.note || selectedDebtDetail.description || '');
    setEditModalVisible(true);
  };

  // LÆ°u sá»­a khoáº£n ná»£ (Sá»­a full thÃ´ng tin)
  const handleSaveUpdateDebt = async () => {
    if (!selectedDebtDetail) return;
    if (!editCounterpartyName.trim()) {
      Alert.alert('Lá»—i', 'TÃªn khoáº£n vay khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
      return;
    }
    const principalNum = parseFloat(editPrincipal.replace(/\D/g, '')) || selectedDebtDetail.principalAmount;
    if (!principalNum || principalNum <= 0) {
      Alert.alert('Lá»—i', 'Sá»‘ tiá»n khoáº£n ná»£ khÃ´ng há»£p lá»‡.');
      return;
    }
    setSubmittingEdit(true);
    try {
      const isoStartDate = editStartDate ? editStartDate.toISOString().split('T')[0] : undefined;
      const isoDueDate = editDueDate ? editDueDate.toISOString().split('T')[0] : undefined;
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

      // Cáº­p nháº­t state local
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
      Alert.alert('ThÃ nh cÃ´ng', 'ÄÃ£ cáº­p nháº­t thÃ´ng tin khoáº£n ná»£.');
    } catch (err: any) {
      Alert.alert('Lá»—i', err?.message || 'CÃ³ lá»—i khi cáº­p nháº­t.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Táº£i dá»¯ liá»‡u ban Ä‘áº§u
  const loadData = async () => {
    try {
      const [debtList, sum, accList] = await Promise.all([
        debtApi.getDebts().catch(() => []),
        debtApi.getSummary().catch(() => null),
        accountApi.getAccounts().catch(() => []),
      ]);
      setDebts(debtList || []);
      setSummary(sum || null);
      if (accList && accList.length > 0) {
        setAccounts(accList);
      }
    } catch {
      // Giá»¯ mock data an toÃ n
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

  // Lá»c danh sÃ¡ch theo tab: Táº¥t cáº£ | Äi vay | Cho ná»£
  const filteredDebts = useMemo(() => {
    if (selectedTab === 'BORROWING') {
      return debts.filter((d) => d.debtType === 'BORROWING');
    }
    if (selectedTab === 'LENDING') {
      return debts.filter((d) => d.debtType === 'LENDING');
    }
    return debts;
  }, [debts, selectedTab]);

  // TÃ­nh toÃ¡n sá»‘ dÆ° hiá»ƒn thá»‹
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

  // Tá»•ng dÆ° ná»£ = TÃ´i Ä‘ang ná»£ (10.800.000 Ä‘) + Äang cho vay (5.000.000 Ä‘) = 15.800.000 Ä‘
  const totalDebtBalance = totalBorrowingRemaining + totalLendingRemaining;

  // TÃ­nh toÃ¡n ngÃ y tráº£ ká»³ Ä‘áº§u tiÃªn máº·c Ä‘á»‹nh dá»±a trÃªn táº§n suáº¥t vÃ  ngÃ y/thá»© Ä‘Ã£ chá»n
  const calculateDefaultFirstPaymentDate = (freq: PaymentFrequency, dayMonth: number, dayWeek: number): Date => {
    const today = new Date();
    let targetDate: Date;
    if (freq === 'WEEKLY') {
      const currentDay = today.getDay(); // 0: CN, 1: T2,...
      let diffDays = dayWeek - currentDay;
      if (diffDays <= 0) diffDays += 7; // sang tuáº§n sau
      targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffDays);
    } else {
      const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const nextMonth = (today.getMonth() + 1) % 12;
      targetDate = new Date(nextMonthYear, nextMonth, Math.min(dayMonth, 28));
    }
    return targetDate;
  };

  // Cáº­p nháº­t ngÃ y trong thÃ¡ng
  const handleSelectDayOfMonth = (day: number) => {
    setFormDayOfMonth(day);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(formFrequency, day, formDayOfWeek));
  };

  // Cáº­p nháº­t thá»© trong tuáº§n
  const handleSelectDayOfWeek = (dow: number) => {
    setFormDayOfWeek(dow);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(formFrequency, formDayOfMonth, dow));
  };

  // Cáº­p nháº­t táº§n suáº¥t tráº£
  const handleSelectFrequency = (freq: PaymentFrequency) => {
    setFormFrequency(freq);
    setFormFirstPaymentDate(calculateDefaultFirstPaymentDate(freq, formDayOfMonth, formDayOfWeek));
  };

  // Tá»± Ä‘á»™ng tÃ­nh toÃ¡n tá»•ng sá»‘ tiá»n khi thay Ä‘á»•i sá»‘ ká»³ hoáº·c tiá»n ká»³
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

  // Xá»­ lÃ½ táº¡o khoáº£n ná»£ má»›i (Chuáº©n DB & Web)
  const handleCreateDebt = async () => {
    const partnerTrimmed = formPartnerName.trim();
    if (!partnerTrimmed) {
      Alert.alert(
        'Thiáº¿u thÃ´ng tin',
        'Vui lÃ²ng nháº­p tÃªn khoáº£n vay'
      );
      return;
    }

    const principalNum = parseFloat(formPrincipal.replace(/\D/g, ''));
    if (!principalNum || principalNum <= 0) {
      Alert.alert('Sá»‘ tiá»n khÃ´ng há»£p lá»‡', 'Vui lÃ²ng nháº­p tá»•ng sá»‘ tiá»n ná»£ há»£p lá»‡');
      return;
    }

    setSubmittingDebt(true);
    try {
      const isBorrowing = formType === 'BORROWING';
      const periodicAmountNum = parseFloat(formPeriodicAmount.replace(/\D/g, '')) || undefined;
      const chosenFreq = paymentPlanType === 'INSTALLMENT' ? formFrequency : 'ONE_TIME';

      // TÃ­nh ngÃ y tráº£ ná»£ cuá»‘i cÃ¹ng (due_date) náº¿u tráº£ theo ká»³
      const isoStartDate = formStartDate ? formStartDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const isoFirstPaymentDate = formFirstPaymentDate ? formFirstPaymentDate.toISOString().split('T')[0] : undefined;
      let computedDueDate = formDueDate ? formDueDate.toISOString().split('T')[0] : undefined;
      if (!computedDueDate && paymentPlanType === 'INSTALLMENT') {
        const count = parseInt(formInstallmentCount, 10) || 1;
        const baseDateStr = isoFirstPaymentDate || isoStartDate;
        const d = new Date(baseDateStr);
        // Náº¿u tráº£ N ká»³ thÃ¬ ká»³ 1 lÃ  baseDateStr, ká»³ N lÃ  sau (count - 1) khoáº£ng thá»i gian
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

      // Gá»i API POST /api/v1/debts
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

      // Táº¡o item ná»£ má»›i cáº­p nháº­t vÃ o giao diá»‡n
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
      Alert.alert('ThÃ nh cÃ´ng', 'Khoáº£n ná»£ Ä‘Ã£ Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng.');
      setCreateModalVisible(false);

      // Reset form
      setFormPartnerName('');
      setFormPartnerPhone('');
      setFormPrincipal('');
      setFormPeriodicAmount('');
      setFormStartDate(new Date());
      setFormDueDate(null);
      setFormFirstPaymentDate(new Date());
      setFormNote('');
      setSelectedAccountId('');
    } catch (err: any) {
      Alert.alert('Lá»—i', err?.message || 'CÃ³ lá»—i xáº£y ra khi táº¡o khoáº£n ná»£.');
    } finally {
      setSubmittingDebt(false);
    }
  };

  // Xá»­ lÃ½ ghi nháº­n thanh toÃ¡n / tráº£ ná»£
  const handleRecordPayment = async () => {
    if (!selectedDebtForPay) return;

    const numAmount = parseFloat(payAmount.replace(/\D/g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Sá»‘ tiá»n khÃ´ng há»£p lá»‡', 'Vui lÃ²ng nháº­p sá»‘ tiá»n thanh toÃ¡n há»£p lá»‡.');
      return;
    }

    setSubmittingPay(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const nowIso = now.toISOString();
      const chosenAccountId = payAccountId || selectedDebtForPay.accountId;
      const chosenAcc = accounts.find((a) => a.id === chosenAccountId);
      const chosenAccName = chosenAcc ? chosenAcc.name : (accounts[0]?.name || 'VÃ­ tiá»n máº·t');

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
        note: payNote.trim() || 'Thanh toÃ¡n ná»£',
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

      Alert.alert('ThÃ nh cÃ´ng', 'ÄÃ£ ghi nháº­n thanh toÃ¡n khoáº£n ná»£.');
      setPayModalVisible(false);
      if (updatedTargetItem && selectedDebtDetail && selectedDebtDetail.id === (updatedTargetItem as DebtItem).id) {
        setSelectedDebtDetail(updatedTargetItem);
        // Refresh láº¡i chi tiáº¿t tá»« backend náº¿u cÃ³
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
      Alert.alert('Lá»—i', err?.message || 'CÃ³ lá»—i xáº£y ra.');
    } finally {
      setSubmittingPay(false);
    }
  };

  // XÃ³a khoáº£n ná»£
  const handleDeleteDebt = (debt: DebtItem) => {
    confirmDelete({
      title: 'XÃ³a khoáº£n ná»£',
      message: `Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a khoáº£n ná»£ "${debt.counterpartyName}" khÃ´ng?\nHÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.`,
      itemName: debt.counterpartyName,
      onConfirm: async () => {
        try {
          await debtApi.deleteDebt(debt.id);
          setDebts((prev) => prev.filter((d) => d.id !== debt.id));
          setSelectedDebtDetail(null);
          showSuccess('ThÃ nh cÃ´ng', `ÄÃ£ xÃ³a khoáº£n ná»£ "${debt.counterpartyName}" thÃ nh cÃ´ng!`);
        } catch (err: any) {
          showError('Lá»—i', err?.message || 'KhÃ´ng thá»ƒ xÃ³a khoáº£n ná»£ nÃ y.');
        }
      },
    });
  };

  // Náº¾U ÄANG CHá»ŒN XEM CHI TIáº¾T KHOáº¢N Ná»¢ -> RENDER TOÃ€N MÃ€N HÃŒNH NHÆ¯ BÃŠN Má»¤C TIÃŠU & TIáº¾T KIá»†M (GoalDetailScreen)
  if (selectedDebtDetail) {
    const isBorrow = selectedDebtDetail.debtType === 'BORROWING';
    const visual = resolveDebtVisual(selectedDebtDetail.counterpartyName, selectedDebtDetail.debtType);
    const isPaidOff = selectedDebtDetail.status === 'PAID_OFF' || selectedDebtDetail.remainingAmount <= 0;
    const displayRemaining = selectedDebtDetail.remainingAmount;
    const displayPaid = selectedDebtDetail.paidAmount;
    const displayPrincipal = selectedDebtDetail.principalAmount;
    const displayPercent = selectedDebtDetail.percentagePaid || (displayPrincipal > 0 ? Math.round((displayPaid / displayPrincipal) * 100) : 0);

    // Láº¥y lá»‹ch sá»­ thanh toÃ¡n tá»« API hoáº·c tá»« mock demo
    const rawHistory: any[] = detailFullData?.payment_history || demoPayments[selectedDebtDetail.id] || [];
    const historyList = rawHistory.map((pm, idx) => {
      const rawDate = pm.created_at || pm.payment_date || pm.paymentDate || selectedDebtDetail.startDate || new Date().toISOString();
      const matchedAccount = accounts.find((a) => a.id === (pm.account_id || pm.accountId || selectedDebtDetail.accountId));
      const accountName = pm.account_name || pm.accountName || matchedAccount?.name || detailFullData?.account?.name || 'VÃ­ tiá»n máº·t';
      return {
        id: String(pm.id || idx),
        amount: Number(pm.amount || 0),
        rawDate,
        date: formatDateTime(rawDate),
        note: pm.note || 'Thanh toÃ¡n khoáº£n ná»£',
        accountName,
      };
    });

    const debtTypeLabel = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME'
      ? 'Tráº£ gÃ³p'
      : (isBorrow ? 'Khoáº£n Ä‘i vay' : 'Cho vay');

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
        />

        {/* 1. Header chi tiáº¿t: [<] Chi tiáº¿t khoáº£n ná»£ */}
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
            Chi tiáº¿t khoáº£n ná»£
          </Text>

          {/* Khoáº£ng trá»‘ng Ä‘á»ƒ cÃ¢n Ä‘á»‘i header */}
          <View style={{ width: 36, height: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailScreenScrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Banner ná»n áº£nh theo loáº¡i ná»£ (Äá»: Khoáº£n Ä‘ang vay, Xanh: Khoáº£n cho vay) */}
          <ImageBackground
            source={isBorrow ? DEBT_RED_BANNER_BG : BANNER_BG_IMG}
            style={styles.detailHeroBanner}
            imageStyle={styles.detailHeroBannerImgStyle}
            resizeMode="cover"
          >
            {/* Cá»™t chá»¯ bÃªn trÃ¡i */}
            <View style={styles.detailHeroTextCol}>
              <Text style={styles.detailHeroCategoryTitle}>
                {isBorrow ? 'Khoáº£n Ä‘ang vay' : 'Khoáº£n cho vay'}
              </Text>
              <Text style={styles.detailHeroCategorySub}>
                {isBorrow ? 'Báº¡n Ä‘ang vay tiá»n' : 'Báº¡n Ä‘Ã£ cho ngÆ°á»i khÃ¡c vay tiá»n'}
              </Text>
            </View>

            {/* Icon 3D bÃªn pháº£i */}
            <View style={styles.detailHero3dWrap}>
              <Image
                source={isBorrow ? BORROWING_WALLET_3D : LENDING_BAG_3D}
                style={styles.detailHero3dImg}
                resizeMode="contain"
              />
            </View>
          </ImageBackground>

          {/* Card tÃªn khoáº£n vay & Tag tráº¡ng thÃ¡i */}
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
                  {isBorrow ? 'TÃŠN KHOáº¢N VAY' : 'TÃŠN KHOáº¢N CHO VAY'}
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
                {isPaidOff ? 'ÄÃ£ hoÃ n thÃ nh' : 'Äang thá»±c hiá»‡n'}
              </Text>
            </View>
          </View>

          {/* 3. Khá»‘i 3 cá»™t sá»‘ tiá»n (Tá»•ng ná»£ - ÄÃ£ tráº£ - CÃ²n láº¡i) */}
          <View
            style={[
              styles.detailBalanceCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.detailBalanceThreeCols}>
              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'Tiá»n vay' : 'Cho vay'}
                </Text>
                <Text style={[styles.detailBalanceColPrincipal, isDark && { color: themeColors.textPrimary }]}>
                  {formatVND(displayPrincipal)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'ÄÃ£ tráº£' : 'ÄÃ£ thu'}
                </Text>
                <Text style={[styles.detailBalanceColPaid, isDark && { color: themeColors.textSecondary }]}>
                  {formatVND(displayPaid)}
                </Text>
              </View>

              <View style={[styles.detailBalanceColDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.detailBalanceColItem}>
                <Text style={[styles.detailBalanceLabel, isDark && { color: themeColors.textSecondary }]}>
                  CÃ²n láº¡i
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

            {/* Thanh tiáº¿n trÃ¬nh % tráº£ ná»£ */}
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

          {/* 4. Khá»‘i ThÃ´ng tin chung */}
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
                ThÃ´ng tin chung
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {/* DÃ²ng 1: Loáº¡i ná»£ */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="tag" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Loáº¡i giao dá»‹ch
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {debtTypeLabel}
              </Text>
            </View>

            {/* DÃ²ng 2: NgÆ°á»i liÃªn há»‡ & SÄT */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="user" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {isBorrow ? 'NgÆ°á»i cho vay' : 'NgÆ°á»i vay'}
                </Text>
              </View>
              <Text style={[styles.detailInfoValueBoldText, isDark && { color: themeColors.textPrimary }]}>
                {selectedDebtDetail.counterpartyName}
                {(selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone) ? ` (${selectedDebtDetail.creditorPhone || selectedDebtDetail.debtorPhone})` : ''}
              </Text>
            </View>

            {/* DÃ²ng 3: Thá»i háº¡n / Ká»³ háº¡n */}
            <View style={[styles.detailInfoRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="calendar" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  {selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME' ? 'Ká»³ háº¡n thanh toÃ¡n' : 'Thá»i háº¡n'}
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

                    // Láº¥y ngÃ y trong thÃ¡ng hoáº·c thá»© trong tuáº§n tá»« nextPaymentDate / startDate
                    const baseDateStr = selectedDebtDetail.nextPaymentDate || selectedDebtDetail.startDate || selectedDebtDetail.dueDate;
                    let schedulePatternText = 'HÃ ng thÃ¡ng';
                    if (baseDateStr) {
                      const d = new Date(baseDateStr);
                      if (!isNaN(d.getTime())) {
                        if (freq === 'WEEKLY') {
                          const dowNames = ['Chá»§ nháº­t', 'Thá»© 2', 'Thá»© 3', 'Thá»© 4', 'Thá»© 5', 'Thá»© 6', 'Thá»© 7'];
                          schedulePatternText = `${dowNames[d.getDay()]} hÃ ng tuáº§n`;
                        } else if (freq === 'QUARTERLY') {
                          schedulePatternText = `NgÃ y ${d.getDate()} hÃ ng quÃ½`;
                        } else {
                          schedulePatternText = `NgÃ y ${d.getDate()} hÃ ng thÃ¡ng`;
                        }
                      }
                    } else {
                      schedulePatternText = freq === 'WEEKLY' ? 'HÃ ng tuáº§n' : freq === 'QUARTERLY' ? 'HÃ ng quÃ½' : 'HÃ ng thÃ¡ng';
                    }

                    return `${count} ká»³ - ${schedulePatternText}`;
                  }
                  return `${formatDate(selectedDebtDetail.startDate)} â†’ ${formatDate(selectedDebtDetail.dueDate)}`;
                })()}
              </Text>
            </View>

            {/* DÃ²ng 4: Ghi chÃº */}
            <View style={[styles.detailInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.detailInfoLeft}>
                <FinanceIcon name="credit-card" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                <Text style={[styles.detailInfoLabelText, isDark && { color: themeColors.textSecondary }]}>
                  Ghi chÃº
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
                {selectedDebtDetail.note || selectedDebtDetail.description || 'KhÃ´ng cÃ³ ghi chÃº'}
              </Text>
            </View>
          </View>

          {/* 5. Khá»‘i Káº¿ hoáº¡ch tráº£ theo ká»³ (Liá»‡t kÃª rÃµ rÃ ng tá»«ng ká»³ háº¡n, ngÃ y Ä‘áº¿n háº¡n & tráº¡ng thÃ¡i Ä‘Ã£ tráº£ / chÆ°a tráº£) */}
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

              // Ká»³ i Ä‘Æ°á»£c xem lÃ  Ä‘Ã£ tráº£ náº¿u tá»•ng sá»‘ tiá»n Ä‘Ã£ tráº£ >= sá»‘ tiá»n tÃ­ch lÅ©y Ä‘áº¿n ká»³ nÃ y (hoáº·c tráº£ háº¿t ná»£)
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
                      Káº¿ hoáº¡ch tráº£ theo ká»³ ({count} ká»³)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? themeColors.accentGreen : '#059669' }}>
                    {installmentSchedule.filter((p) => p.isPaid).length}/{count} Ä‘Ã£ tráº£
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
                            Ká»³ {p.periodNumber} â€¢ {formatVND(p.amount)}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: isDark ? themeColors.textSecondary : '#64748B', marginTop: 1 }}>
                            Háº¡n tráº£: {p.dueDate}
                          </Text>
                        </View>
                      </View>

                      {/* Huy hiá»‡u tráº¡ng thÃ¡i ÄÃƒ TRáº¢ / CHÆ¯A TRáº¢ */}
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
                          {p.isPaid ? 'ÄÃ£ tráº£' : 'ChÆ°a tráº£'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })()}

          {/* 5. Khá»‘i Thao tÃ¡c: [Thanh toÃ¡n] [Cáº­p nháº­t] [XÃ³a ná»£] */}
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
                Thao tÃ¡c
              </Text>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            <View style={styles.detailActionButtonsRow}>
              {/* NÃºt 1: Thanh toÃ¡n (Ná»n xanh Ä‘áº­m, icon vÃ­ tráº¯ng) */}
              <Pressable
                onPress={() => {
                  setSelectedDebtForPay(selectedDebtDetail);
                  const isInstallment = selectedDebtDetail.paymentFrequency && selectedDebtDetail.paymentFrequency !== 'ONE_TIME';
                  const periodic = selectedDebtDetail.monthlyPayment || selectedDebtDetail.paymentAmount || 0;
                  // TÃ­nh ká»³ tiáº¿p theo chÆ°a thanh toÃ¡n
                  const paid = selectedDebtDetail.paidAmount || 0;
                  const nextPeriodIdx = periodic > 0 ? Math.floor(paid / periodic) + 1 : 1;
                  setPaySelectedPeriod(isInstallment ? nextPeriodIdx : null);

                  const defaultPayAmt = isInstallment && periodic > 0
                    ? Math.min(periodic, displayRemaining)
                    : displayRemaining;
                  setPayAmount(defaultPayAmt > 0 ? new Intl.NumberFormat('vi-VN').format(defaultPayAmt) : '');
                  setPayAccountId(selectedDebtDetail.accountId || (accounts[0]?.id || ''));
                  setPayNote(isInstallment ? `Thanh toÃ¡n ká»³ ${nextPeriodIdx}` : '');
                  setPayModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.actionBtnPay,
                  isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                  pressed && styles.cardPressed,
                ]}
              >
                <FinanceIcon name="wallet" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnPayText}>Thanh toÃ¡n</Text>
              </Pressable>

              {/* NÃºt 2: Sá»­a khoáº£n ná»£ (Thiáº¿t káº¿ hiá»‡n Ä‘áº¡i, tinh táº¿) */}
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
                <Text style={[styles.actionBtnUpdateText, isDark && { color: '#60A5FA' }]}>Sá»­a khoáº£n ná»£</Text>
              </Pressable>

              {/* NÃºt 3: XÃ³a ná»£ (Ná»n há»“ng pastel viá»n má»ng, icon thÃ¹ng rÃ¡c Ä‘á») */}
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
                <Text style={styles.actionBtnDeleteText}>XÃ³a ná»£</Text>
              </Pressable>
            </View>
          </View>

          {/* 6. Khá»‘i Lá»‹ch sá»­ thanh toÃ¡n */}
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
                  Lá»‹ch sá»­ thanh toÃ¡n
                </Text>
              </View>
            </View>

            <View style={[styles.detailSectionDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

            {historyList.length === 0 ? (
              <View style={styles.detailHistoryEmptyWrap}>
                <Text style={[styles.detailHistoryEmptyText, isDark && { color: themeColors.textMuted }]}>
                  ChÆ°a cÃ³ lá»‹ch sá»­ thanh toÃ¡n nÃ o cho khoáº£n ná»£ nÃ y.
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
                  {/* VÃ²ng trÃ²n xanh lÃ¡ cÃ³ dáº¥u tick tráº¯ng */}
                  <View
                    style={[
                      styles.historyCheckGreenCircle,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                    ]}
                  >
                    <FinanceIcon name="check" size={13} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                  </View>

                  {/* Cá»™t thÃ´ng tin: 'Thanh toÃ¡n' & Giá» + NgÃ y thÃ¡ng */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyPaymentTitleText, isDark && { color: themeColors.textPrimary }]}>
                      Thanh toÃ¡n
                    </Text>
                    <Text style={[styles.historyPaymentDateText, isDark && { color: themeColors.textSecondary }]}>
                      {item.date}
                    </Text>
                  </View>

                  {/* Sá»‘ tiá»n thanh toÃ¡n mÃ u xanh lÃ¡: +1.500.000 Ä‘ */}
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

        {/* MODAL POPUP CHI TIáº¾T Äá»¢T THANH TOÃN (KHI áº¤N VÃ€O DÃ’NG Lá»ŠCH Sá»¬) */}
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
                    Chi tiáº¿t Ä‘á»£t thanh toÃ¡n
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedPaymentDetail(null)}
                  hitSlop={10}
                >
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                </Pressable>
              </View>

              {/* Sá»‘ tiá»n thanh toÃ¡n to ná»•i báº­t */}
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
                  Sá» TIá»€N ÄÃƒ THANH TOÃN
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

              {/* CÃ¡c dÃ²ng thÃ´ng tin chi tiáº¿t */}
              <View style={styles.paymentDetailRowsWrap}>
                <View
                  style={[
                    styles.paymentDetailRowItem,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Thá»i gian:
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
                    Khoáº£n ná»£:
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
                    Nguá»“n tiá»n trÃ­ch:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValGreen,
                      isDark && { color: themeColors.accentGreen },
                    ]}
                  >
                    {selectedPaymentDetail?.accountName || 'VÃ­ tiá»n máº·t'}
                  </Text>
                </View>

                <View style={[styles.paymentDetailRowItem, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.paymentDetailRowLabel, isDark && { color: themeColors.textSecondary }]}>
                    Ghi chÃº:
                  </Text>
                  <Text
                    style={[
                      styles.paymentDetailRowValRegular,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedPaymentDetail?.note || 'KhÃ´ng cÃ³ ghi chÃº'}
                  </Text>
                </View>
              </View>

              {/* NÃºt ÄÃ³ng */}
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
                  ÄÃ³ng
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* â”€â”€ MODAL Sá»¬A KHOáº¢N Ná»¢ â”€â”€ */}
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
                  Sá»­a khoáº£n ná»£
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
                  TÃŠN KHOáº¢N VAY *
                </Text>
                <TextInput
                  value={editCounterpartyName}
                  onChangeText={setEditCounterpartyName}
                  placeholder="VÃ­ dá»¥: Vay mua xe, Tráº£ gÃ³p laptop, Vay anh Long..."
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
                  Sá» ÄIá»†N THOáº I LIÃŠN Há»†
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
                  Tá»”NG Sá» TIá»€N Ná»¢ (VNÄ) *
                </Text>
                <TextInput
                  value={editPrincipal ? new Intl.NumberFormat('vi-VN').format(parseInt(editPrincipal.replace(/\D/g, '') || '0', 10)) : ''}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/\D/g, '');
                    setEditPrincipal(cleaned);
                  }}
                  placeholder="Nháº­p tá»•ng sá»‘ tiá»n..."
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
                    <AppDatePicker
                      value={editStartDate}
                      onChange={setEditStartDate}
                      label="NGÃ€Y Báº®T Äáº¦U"
                      placeholder="DD/MM/YYYY"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppDatePicker
                      value={editDueDate}
                      onChange={setEditDueDate}
                      label="Háº N THANH TOÃN"
                      placeholder="DD/MM/YYYY"
                    />
                  </View>
                </View>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  TÃ€I KHOáº¢N / VÃ LIÃŠN Káº¾T
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
                            KhÃ´ng gáº¯n tÃ i khoáº£n (Chá»‰ gá»­i nháº¯c ná»£)
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
                            {selAcc.name} (Sá»‘ dÆ°: {formatVND(selAcc.balance)})
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                  <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
                </Pressable>

                <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                  GHI CHÃš / THá»ŽA THUáº¬N
                </Text>
                <TextInput
                  value={editNote}
                  onChangeText={setEditNote}
                  placeholder="VÃ­ dá»¥: Vay mua Ä‘á»“, thá»a thuáº­n tráº£ trÆ°á»›c..."
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
                    <Text style={styles.modalSubmitBtnText}>LÆ°u thay Ä‘á»•i</Text>
                  )}
                </Pressable>
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* OVERLAY PICKER CHá»ŒN TÃ€I KHOáº¢N KHI Sá»¬A KHOáº¢N Ná»¢ */}
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
                        Chá»n tÃ i khoáº£n / vÃ­ liÃªn káº¿t
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
                            ðŸ”” KhÃ´ng gáº¯n tÃ i khoáº£n
                          </Text>
                          <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                            Chá»‰ gá»­i thÃ´ng bÃ¡o nháº¯c ná»£ Ä‘Ãºng háº¡n
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
                              Sá»‘ dÆ°: {formatVND(acc.balance)} Â· Tá»± Ä‘á»™ng trá»« khi Ä‘áº¿n háº¡n
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

        {/* â”€â”€ MODAL THANH TOÃN / THU Ná»¢ â”€â”€ */}
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
                  {selectedDebtForPay?.debtType === 'BORROWING' ? 'Ghi nháº­n tráº£ ná»£' : 'Ghi nháº­n thu ná»£'}
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
                    Äá»‘i tÃ¡c:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>
                      {selectedDebtForPay.counterpartyName}
                    </Text>
                  </Text>
                  <Text style={[styles.payTargetRemainingText, isDark && { color: themeColors.textSecondary }]}>
                    Sá»‘ tiá»n cÃ²n láº¡i:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>
                      {formatVND(selectedDebtForPay.remainingAmount)}
                    </Text>
                  </Text>

                  {/* CHá»ŒN Ká»² THANH TOÃN (Náº¿u lÃ  khoáº£n ná»£ theo ká»³) */}
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
                          CHá»ŒN Ká»² THANH TOÃN
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
                                  setPayNote(`Thanh toÃ¡n ká»³ ${pNum}`);
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
                                  Ká»³ {pNum} {isPaid ? 'âœ“' : ''}
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
                                  {isPaid ? 'ÄÃ£ tráº£' : formatVND(periodic)}
                                </Text>
                              </Pressable>
                            );
                          })}

                          {/* Lá»±a chá»n tráº£ háº¿t toÃ n bá»™ */}
                          <Pressable
                            onPress={() => {
                              setPaySelectedPeriod(null);
                              setPayAmount(new Intl.NumberFormat('vi-VN').format(selectedDebtForPay.remainingAmount));
                              setPayNote('Táº¥t toÃ¡n toÃ n bá»™ khoáº£n ná»£');
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
                              Tráº£ háº¿t ná»£
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
                Sá» TIá»€N THANH TOÃN (VNÄ) *
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
                placeholder="Nháº­p sá»‘ tiá»n..."
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
                {selectedDebtForPay?.debtType === 'BORROWING' ? 'NGUá»’N TIá»€N TRÃCH TRáº¢ *' : 'TÃ€I KHOáº¢N NHáº¬N TIá»€N *'}
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
                          VÃ­ tiá»n máº·t (Máº·c Ä‘á»‹nh)
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
                          {chosenAcc.name} (Sá»‘ dÆ°: {formatVND(chosenAcc.balance)})
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
              </Pressable>

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                GHI CHÃš THANH TOÃN
              </Text>
              <TextInput
                value={payNote}
                onChangeText={setPayNote}
                placeholder="VÃ­ dá»¥: Tráº£ Ä‘á»£t 1, Chuyá»ƒn khoáº£n qua ngÃ¢n hÃ ng..."
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
                  <Text style={styles.modalSubmitBtnText}>XÃ¡c nháº­n thanh toÃ¡n</Text>
                )}
              </Pressable>
              <View style={{ height: 20 }} />

              {/* OVERLAY PICKER CHá»ŒN TÃ€I KHOáº¢N KHI THANH TOÃN Ná»¢ */}
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
                        Chá»n nguá»“n tiá»n thanh toÃ¡n
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
                              Sá»‘ dÆ°: {formatVND(acc.balance)}
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
      />

      {/* â”€â”€ HEADER â”€â”€ */}
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
              <Text style={[styles.backBtnArrow, isDark && { color: themeColors.textPrimary }]}>â€¹</Text>
            </Pressable>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Quáº£n lÃ½ ná»£</Text>
          </View>
        </View>
      </View>

      {/* â”€â”€ Ná»˜I DUNG CUá»˜N â”€â”€ */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Äang táº£i dá»¯ liá»‡u khoáº£n ná»£...</Text>
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
          {/* â”€â”€ 1. BANNER Tá»”NG DÆ¯ Ná»¢ (CHUáº¨N 100% áº¢NH MáºªU Cá»¦A Báº N) â”€â”€ */}
          <ImageBackground
            source={BANNER_BG_IMG}
            style={styles.heroBannerCard}
            imageStyle={styles.heroBannerBgImage}
            resizeMode="cover"
          >
            <View style={styles.heroLeftCol}>
              <View style={styles.heroLabelRow}>
                <Text style={styles.heroLabelText}>Tá»•ng dÆ° ná»£</Text>
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
                {showBalance ? formatVND(totalDebtBalance) : '****** Ä‘'}
              </Text>

              {/* Pill theo dÃµi sá»‘ lÆ°á»£ng khoáº£n ná»£ */}
              <View style={styles.heroTrackingBadge}>
                <FinanceIcon name="grid" size={12} color="#FFFFFF" />
                <Text style={styles.heroTrackingBadgeText}>
                  {debts.length} khoáº£n ná»£ Ä‘ang theo dÃµi
                </Text>
              </View>
            </View>

            {/* Cá»¥m minh há»a TÃºi tiá»n & Tháº» vÃ ng 3D */}
            <View style={styles.heroIllustrationWrap}>
              <Image
                source={HERO_DEBT_IMG}
                style={styles.heroIllustrationImg}
                resizeMode="contain"
              />
            </View>
          </ImageBackground>

          {/* â”€â”€ 2. HÃ€NG 2 CARD Tá»”NG QUAN: TÃ”I ÄANG Ná»¢ & ÄANG CHO VAY â”€â”€ */}
          <View style={styles.summaryTwoCardsRow}>
            {/* Card Äá»: TÃ´i Ä‘ang ná»£ */}
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
                  TÃ´i Ä‘ang ná»£
                </Text>
                <Text style={[styles.summaryCardAmount, isDark && { color: '#F87171' }]}>
                  {showBalance ? formatVND(totalBorrowingRemaining) : '****** Ä‘'}
                </Text>
              </View>
            </View>

            {/* Card Xanh: Äang cho vay */}
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
                  Äang cho vay
                </Text>
                <Text style={[styles.summaryCardAmount, isDark && { color: themeColors.accentGreen }]}>
                  {showBalance ? formatVND(totalLendingRemaining) : '****** Ä‘'}
                </Text>
              </View>
            </View>
          </View>

          {/* â”€â”€ 3. HÃ€NG Bá»˜ Lá»ŒC VÃ€ NÃšT THÃŠM KHOáº¢N Ná»¢ TRÃŠN CÃ™NG 1 HÃ€NG â”€â”€ */}
          <View style={styles.filterAndActionRow}>
            {/* Cá»¥m 3 nÃºt lá»c nhá» gá»n: Táº¥t cáº£ | Äi vay | Cho ná»£ */}
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
                  Táº¥t cáº£
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
                  Äi vay
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
                  Cho ná»£
                </Text>
              </Pressable>
            </View>

            {/* NÃºt ThÃªm khoáº£n ná»£ nhá» gá»n bÃªn cáº¡nh cÃ¹ng hÃ ng */}
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              style={({ pressed }) => [
                styles.compactAddDebtBtn,
                isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                pressed && styles.btnPressed,
              ]}
            >
              <FinanceIcon name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.compactAddDebtBtnText}>ThÃªm ná»£</Text>
            </Pressable>
          </View>

          {/* â”€â”€ 4. DANH SÃCH KHOáº¢N Ná»¢ (CHUáº¨N 100% THEO áº¢NH Báº N Gá»¬I) â”€â”€ */}
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
                  ChÆ°a cÃ³ khoáº£n ná»£ nÃ o
                </Text>
                <Text style={[styles.emptySubText, isDark && { color: themeColors.textSecondary }]}>
                  {selectedTab === 'BORROWING'
                    ? 'Báº¡n khÃ´ng cÃ³ khoáº£n Ä‘i vay nÃ o trong danh má»¥c nÃ y.'
                    : selectedTab === 'LENDING'
                      ? 'Báº¡n khÃ´ng cÃ³ khoáº£n cho vay/ná»£ nÃ o trong danh má»¥c nÃ y.'
                      : 'Báº¥m nÃºt "ThÃªm ná»£" phÃ­a trÃªn Ä‘á»ƒ báº¯t Ä‘áº§u theo dÃµi.'}
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
                    {/* 1. Icon bÃªn trÃ¡i */}
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

                    {/* 2. Cá»™t thÃ´ng tin á»Ÿ giá»¯a */}
                    <View style={styles.cleanDebtCenterCol}>
                      <Text
                        style={[styles.cleanDebtTitleText, isDark && { color: themeColors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.counterpartyName}
                      </Text>

                      {/* DÃ²ng chi tiáº¿t phá»¥ */}
                      {item.paidAmount > 0 && item.percentagePaid > 0 && item.id === 'demo-debt-5' ? (
                        <Text
                          style={[styles.cleanDebtSubDetailText, isDark && { color: themeColors.textSecondary }]}
                          numberOfLines={1}
                        >
                          ÄÃ£ thu: {formatVND(item.paidAmount)} / {formatVND(item.principalAmount)}
                        </Text>
                      ) : (
                        <View style={styles.cleanDebtDueDateRow}>
                          <FinanceIcon name="calendar" size={13} color={isDark ? themeColors.textMuted : '#64748B'} />
                          <Text style={[styles.cleanDebtDueDateText, isDark && { color: themeColors.textSecondary }]}>
                            {item.paymentFrequency && item.paymentFrequency !== 'ONE_TIME'
                              ? `Ká»³ tá»›i: ${formatDate(item.nextPaymentDate || item.dueDate)}`
                              : `Äáº¿n háº¡n: ${formatDate(item.dueDate)}`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Cá»™t sá»‘ tiá»n & Tiáº¿n trÃ¬nh (nhiá»u ká»³) / Äáº¿m ngÆ°á»£c ngÃ y (tráº£ 1 láº§n) á»Ÿ bÃªn pháº£i */}
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
                              {formatVND(item.monthlyPayment || item.paymentAmount || 0)}/ká»³
                            </Text>
                          ) : null}

                          {/* Náº¿u Ä‘Ã£ thanh toÃ¡n háº¿t: LuÃ´n hiá»‡n huy hiá»‡u ÄÃ£ hoÃ n thÃ nh */}
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
                                ÄÃ£ hoÃ n thÃ nh
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

                    {/* 4. MÅ©i tÃªn Ä‘iá»u hÆ°á»›ng > */}
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

      {/* â”€â”€ MODAL 2: THÃŠM KHOáº¢N Ná»¢ Má»šI (CHUáº¨N 100% THEO DATABASE VÃ€ WEB) â”€â”€ */}
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
              <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>ThÃªm khoáº£n ná»£ má»›i</Text>
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
              {/* 1. Type Switch: Khoáº£n Ä‘i vay vs Khoáº£n cho vay */}
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
                    Khoáº£n Ä‘i vay
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
                    Khoáº£n cho vay
                  </Text>
                </Pressable>
              </View>

              {/* 2. TÃªn khoáº£n vay & Sá»‘ Ä‘iá»‡n thoáº¡i */}
              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>
                {formType === 'BORROWING' ? 'TÃŠN KHOáº¢N VAY *' : 'TÃŠN KHOáº¢N CHO VAY *'}
              </Text>
              <TextInput
                value={formPartnerName}
                onChangeText={setFormPartnerName}
                placeholder={formType === 'BORROWING' ? 'VÃ­ dá»¥: Vay mua xe, MÆ°á»£n tiá»n Ä‘Ã³ng há»c phÃ­, Vay anh Long...' : 'VÃ­ dá»¥: Cho Nam vay, Cho mÆ°á»£n tiá»n...'}
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
              />

              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>Sá» ÄIá»†N THOáº I LIÃŠN Há»† (TÃ™Y CHá»ŒN)</Text>
              <TextInput
                value={formPartnerPhone}
                onChangeText={setFormPartnerPhone}
                keyboardType="phone-pad"
                placeholder="VÃ­ dá»¥: 0912345678"
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
              />

              {/* 3. Khung HÃ¬nh thá»©c tráº£ ná»£: Tráº£ má»™t láº§n vs Tráº£ theo ká»³ */}
              <View style={[styles.webPaymentBoxWrap, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <Text style={[styles.webBoxTitle, isDark && { color: themeColors.textPrimary }]}>HÃŒNH THá»¨C & Lá»ŠCH TRÃŒNH THANH TOÃN</Text>

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
                      Tráº£ má»™t láº§n
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
                      Tráº£ theo ká»³
                    </Text>
                  </Pressable>
                </View>

                {/* Náº¾U TRáº¢ Má»˜T Láº¦N */}
                {paymentPlanType === 'ONE_TIME' ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View>
                      <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>Tá»”NG Sá» TIá»€N Ná»¢ (VND) *</Text>
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
                        <AppDatePicker
                          value={formStartDate}
                          onChange={setFormStartDate}
                          label="NGÃ€Y Báº®T Äáº¦U"
                          placeholder="DD/MM/YYYY"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppDatePicker
                          value={formDueDate}
                          onChange={setFormDueDate}
                          label="NGÃ€Y PHáº¢I TRáº¢ *"
                          placeholder="DD/MM/YYYY"
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Náº¾U TRáº¢ THEO Ká»² */
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View style={styles.inputTwoColsRow}>
                      {/* Dropdown Chu ká»³ tráº£ */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>CHU Ká»² TRáº¢</Text>
                        <Pressable
                          onPress={() => setPickerModalType('FREQ')}
                          style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                        >
                          <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                            {formFrequency === 'MONTHLY' ? 'HÃ ng thÃ¡ng' : formFrequency === 'WEEKLY' ? 'HÃ ng tuáº§n' : 'HÃ ng quÃ½ (3 thÃ¡ng)'}
                          </Text>
                          <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                        </Pressable>
                      </View>

                      {/* Sá»‘ ká»³ chia */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>Sá» Ká»² CHIA</Text>
                        <TextInput
                          value={formInstallmentCount}
                          onChangeText={handleInstallmentCountChange}
                          keyboardType="numeric"
                          placeholder="VÃ­ dá»¥: 3, 6, 12..."
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>
                    </View>

                    {/* Dropdown chá»n ngÃ y trong thÃ¡ng hoáº·c thá»© trong tuáº§n */}
                    <View style={[styles.installmentDaySelectCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                      {formFrequency === 'WEEKLY' ? (
                        <View>
                          <Text style={[styles.installmentDayLabel, isDark && { color: themeColors.textSecondary }]}>Tráº£ vÃ o thá»© máº¥y hÃ ng tuáº§n?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_WEEK')}
                            style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                          >
                            <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]}>
                              {formDayOfWeek === 1 ? 'Thá»© Hai hÃ ng tuáº§n' :
                                formDayOfWeek === 2 ? 'Thá»© Ba hÃ ng tuáº§n' :
                                  formDayOfWeek === 3 ? 'Thá»© TÆ° hÃ ng tuáº§n' :
                                    formDayOfWeek === 4 ? 'Thá»© NÄƒm hÃ ng tuáº§n' :
                                      formDayOfWeek === 5 ? 'Thá»© SÃ¡u hÃ ng tuáº§n' :
                                        formDayOfWeek === 6 ? 'Thá»© Báº£y hÃ ng tuáº§n' : 'Chá»§ Nháº­t hÃ ng tuáº§n'}
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </View>
                      ) : (
                        <View>
                          <Text style={[styles.installmentDayLabel, isDark && { color: themeColors.textSecondary }]}>Tráº£ vÃ o ngÃ y máº¥y hÃ ng thÃ¡ng?</Text>
                          <Pressable
                            onPress={() => setPickerModalType('DAY_OF_MONTH')}
                            style={[styles.modernSelectDropdownLight, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}
                          >
                            <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]}>
                              NgÃ y {formDayOfMonth} hÃ ng thÃ¡ng
                            </Text>
                            <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    <View style={styles.inputTwoColsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputSectionLabel, { fontSize: 13, fontWeight: '600', color: '#334155' }, isDark && { color: '#94A3B8' }]}>
                          Sá» TIá»€N Má»–I Ká»² (VND) <Text style={{ color: '#EF4444' }}>*</Text>
                        </Text>
                        <TextInput
                          value={formPeriodicAmount ? new Intl.NumberFormat('vi-VN').format(parseInt(formPeriodicAmount, 10)) : ''}
                          onChangeText={handlePeriodicAmountChange}
                          keyboardType="numeric"
                          placeholder="VÃ­ dá»¥: 2.000.000"
                          placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                          style={[styles.webDateInput, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <AppDatePicker
                          value={formFirstPaymentDate}
                          onChange={setFormFirstPaymentDate}
                          label="NGÃ€Y TRáº¢ Äáº¦U TIÃŠN"
                          placeholder="DD/MM/YYYY"
                        />
                      </View>
                    </View>

                    {/* Tá»•ng sá»‘ tiá»n ná»£ tá»± Ä‘á»™ng tÃ­nh */}
                    <View style={[styles.autoCalcTotalBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.08)', borderColor: themeColors.cardBorder }]}>
                      <Text style={[styles.autoCalcLabel, isDark && { color: themeColors.textSecondary }]}>
                        Tá»•ng sá»‘ tiá»n ná»£ (Tá»± tÃ­nh theo sá»‘ ká»³ & tiá»n ká»³):
                      </Text>
                      <Text style={[styles.autoCalcValue, isDark && { color: themeColors.accentGreen }]}>
                        {formPrincipal ? formatVND(parseInt(formPrincipal, 10)) : '0 Ä‘'}
                      </Text>
                      {formPeriodicAmount && (
                        <Text style={[styles.autoCalcSub, isDark && { color: themeColors.textMuted }]}>
                          â‰ˆ {formatVND(parseInt(formPeriodicAmount, 10))} Ã— {formInstallmentCount} ká»³
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ Lá»‹ch tÃ i chÃ­nh & TÃ i khoáº£n (Chuáº©n Web Dropdown) */}
              <View style={[styles.webSyncBoxWrap, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                <View style={styles.webSyncBoxHeader}>
                  <FinanceIcon name="calendar" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.webSyncBoxTitle, isDark && { color: themeColors.textPrimary }]}>Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ Lá»‹ch tÃ i chÃ­nh</Text>
                    <Text style={[styles.webSyncBoxSub, isDark && { color: themeColors.textSecondary }]}>Khoáº£n ná»£ luÃ´n Ä‘Æ°á»£c theo dÃµi trÃªn lá»‹ch Ä‘á»ƒ nháº¯c nhá»Ÿ vÃ  quáº£n lÃ½ Ä‘Ãºng háº¡n.</Text>
                  </View>
                </View>

                <View style={[styles.syncCardDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

                {/* Dropdown 1: Chá»n tÃ i khoáº£n trÃ­ch ná»£ tá»± Ä‘á»™ng */}
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.dropdownHeaderWithBadge}>
                    <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>
                      {formType === 'BORROWING' ? 'TÃ i khoáº£n trÃ­ch ná»£ tá»± Ä‘á»™ng (TÃ¹y chá»n)' : 'TÃ i khoáº£n nháº­n tiá»n tá»± Ä‘á»™ng (TÃ¹y chá»n)'}
                    </Text>
                    <Text style={[styles.syncStatusBadge, isDark && { backgroundColor: selectedAccountId ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: selectedAccountId ? themeColors.accentGreen : '#FBBF24', borderColor: themeColors.cardBorder }]}>
                      {selectedAccountId ? 'âš¡ Tá»± Ä‘á»™ng trá»« tiá»n' : 'ðŸ”” Chá»‰ nháº¯c nhá»Ÿ'}
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
                              KhÃ´ng gáº¯n tÃ i khoáº£n (Chá»‰ gá»­i thÃ´ng bÃ¡o nháº¯c ná»£)
                            </Text>
                          );
                        }
                        return (
                          <>
                            <AccountBadge account={selAcc} size={22} />
                            <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                              {selAcc.name} (Sá»‘ dÆ°: {formatVND(selAcc.balance)})
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>
                  <Text style={[styles.syncFieldNoteText, isDark && { color: themeColors.textMuted }]}>
                    {selectedAccountId
                      ? 'Khi Ä‘áº¿n háº¡n, há»‡ thá»‘ng sáº½ tá»± Ä‘á»™ng trá»« sá»‘ dÆ° vÃ­ Ä‘Ã£ chá»n vÃ  ghi nháº­n lá»‹ch sá»­ giao dá»‹ch.'
                      : 'Náº¿u khÃ´ng chá»n vÃ­, Ä‘áº¿n ngÃ y háº¹n há»‡ thá»‘ng chá»‰ gá»­i chuÃ´ng thÃ´ng bÃ¡o nháº¯c nhá»Ÿ mÃ  khÃ´ng trá»« tiá»n.'}
                  </Text>
                </View>

                {/* Dropdown 2: Chá»n thá»i gian gá»­i thÃ´ng bÃ¡o nháº¯c háº¹n */}
                <View>
                  <Text style={[styles.webBoxLabel, isDark && { color: themeColors.textSecondary }]}>THá»œI GIAN Gá»¬I THÃ”NG BÃO NHáº®C Háº¸N</Text>
                  <Pressable
                    onPress={() => setPickerModalType('NOTIFY_DAYS')}
                    style={[styles.modernSelectDropdown, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
                  >
                    <Text style={[styles.modernSelectText, isDark && { color: themeColors.textPrimary }]}>
                      {formNotifyDaysBefore === 0 ? 'BÃ¡o Ä‘Ãºng ngÃ y Ä‘áº¿n háº¡n' :
                        formNotifyDaysBefore === 1 ? 'Nháº¯c trÆ°á»›c 1 ngÃ y (KhuyÃªn dÃ¹ng)' :
                          formNotifyDaysBefore === 2 ? 'Nháº¯c trÆ°á»›c 2 ngÃ y' :
                            formNotifyDaysBefore === 3 ? 'Nháº¯c trÆ°á»›c 3 ngÃ y' : 'Nháº¯c trÆ°á»›c 1 tuáº§n (7 ngÃ y)'}
                    </Text>
                    <FinanceIcon name="chevron-down" size={16} color={isDark ? themeColors.accentGreen : "#047857"} />
                  </Pressable>
                </View>
              </View>

              {/* 5. Ghi chÃº / Thá»a thuáº­n */}
              <Text style={[styles.inputSectionLabel, isDark && { color: themeColors.textSecondary }]}>GHI CHÃš / THá»ŽA THUáº¬N</Text>
              <TextInput
                value={formNote}
                onChangeText={setFormNote}
                placeholder="Ghi chÃº vá» má»¥c Ä‘Ã­ch vay hoáº·c Ä‘iá»u khoáº£n háº¹n tráº£..."
                placeholderTextColor={isDark ? themeColors.textMuted : "#94A3B8"}
                style={[styles.modalTextInput, { minHeight: 70, textAlignVertical: 'top' }, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary }]}
                multiline
              />

              {/* NÃºt Submit LÆ°u khoáº£n ná»£ */}
              <Pressable
                onPress={handleCreateDebt}
                disabled={submittingDebt}
                style={[styles.modalSubmitBtn, submittingDebt && styles.btnDisabled]}
              >
                {submittingDebt ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>LÆ°u khoáº£n ná»£</Text>
                )}
              </Pressable>
            </ScrollView>

            {/* OVERLAY POPUP DROPDOWN (Náº±m trá»±c tiáº¿p trong Modal táº¡o ná»£ Ä‘á»ƒ báº¥m 100% Äƒn ngay) */}
            {pickerModalType !== 'NONE' && (
              <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPress={() => setPickerModalType('NONE')}
                />
                <View style={[styles.pickerModalBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                  <View style={[styles.pickerModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                    <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                      {pickerModalType === 'FREQ' && 'Chá»n chu ká»³ tráº£ ná»£'}
                      {pickerModalType === 'DAY_OF_MONTH' && 'Chá»n ngÃ y tráº£ trong thÃ¡ng'}
                      {pickerModalType === 'DAY_OF_WEEK' && 'Chá»n thá»© tráº£ trong tuáº§n'}
                      {pickerModalType === 'ACCOUNT' && 'Chá»n tÃ i khoáº£n trÃ­ch/nháº­n ná»£'}
                      {pickerModalType === 'NOTIFY_DAYS' && 'Thá»i gian gá»­i thÃ´ng bÃ¡o nháº¯c háº¹n'}
                    </Text>
                    <Pressable onPress={() => setPickerModalType('NONE')} hitSlop={10}>
                      <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : "#64748B"} />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                    {/* 1. Chá»n Chu ká»³ tráº£ */}
                    {pickerModalType === 'FREQ' && (
                      <>
                        {[
                          { key: 'MONTHLY', label: 'HÃ ng thÃ¡ng' },
                          { key: 'WEEKLY', label: 'HÃ ng tuáº§n' },
                          { key: 'QUARTERLY', label: 'HÃ ng quÃ½ (3 thÃ¡ng)' },
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

                    {/* 2. Chá»n NgÃ y trong thÃ¡ng (1-31) */}
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
                              NgÃ y {d} hÃ ng thÃ¡ng
                            </Text>
                            {formDayOfMonth === d && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 3. Chá»n Thá»© trong tuáº§n */}
                    {pickerModalType === 'DAY_OF_WEEK' && (
                      <>
                        {[
                          { key: 1, label: 'Thá»© Hai hÃ ng tuáº§n' },
                          { key: 2, label: 'Thá»© Ba hÃ ng tuáº§n' },
                          { key: 3, label: 'Thá»© TÆ° hÃ ng tuáº§n' },
                          { key: 4, label: 'Thá»© NÄƒm hÃ ng tuáº§n' },
                          { key: 5, label: 'Thá»© SÃ¡u hÃ ng tuáº§n' },
                          { key: 6, label: 'Thá»© Báº£y hÃ ng tuáº§n' },
                          { key: 0, label: 'Chá»§ Nháº­t hÃ ng tuáº§n' },
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

                    {/* 4. Chá»n TÃ i khoáº£n */}
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
                              ðŸ”” KhÃ´ng gáº¯n tÃ i khoáº£n
                            </Text>
                            <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>Chá»‰ gá»­i thÃ´ng bÃ¡o nháº¯c ná»£ Ä‘Ãºng háº¡n</Text>
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
                                Sá»‘ dÆ°: {formatVND(acc.balance)} Â· Tá»± Ä‘á»™ng trá»« khi Ä‘áº¿n háº¡n
                              </Text>
                            </View>
                            {selectedAccountId === acc.id && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : "#0E964E"} />}
                          </Pressable>
                        ))}
                      </>
                    )}

                    {/* 5. Chá»n Thá»i gian thÃ´ng bÃ¡o */}
                    {pickerModalType === 'NOTIFY_DAYS' && (
                      <>
                        {[
                          { days: 0, label: 'BÃ¡o Ä‘Ãºng ngÃ y Ä‘áº¿n háº¡n' },
                          { days: 1, label: 'Nháº¯c trÆ°á»›c 1 ngÃ y (KhuyÃªn dÃ¹ng)' },
                          { days: 2, label: 'Nháº¯c trÆ°á»›c 2 ngÃ y' },
                          { days: 3, label: 'Nháº¯c trÆ°á»›c 3 ngÃ y' },
                          { days: 7, label: 'Nháº¯c trÆ°á»›c 1 tuáº§n (7 ngÃ y)' },
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

  /* â”€â”€ HEADER â”€â”€ */
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

  /* â”€â”€ SCROLL CONTENT â”€â”€ */
  scrollContent: {
    padding: 18,
  },

  /* â”€â”€ 1. HERO BANNER CHUáº¨N 100% áº¢NH MáºªU â”€â”€ */
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

  /* â”€â”€ 2. HAI CARD TÃ“M Táº®T â”€â”€ */
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

  /* â”€â”€ 3. HÃ€NG Bá»˜ Lá»ŒC VÃ€ NÃšT THÃŠM Ná»¢ CÃ™NG 1 HÃ€NG â”€â”€ */
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

  /* â”€â”€ 4. DANH SÃCH KHOáº¢N Ná»¢ â”€â”€ */
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

  /* ROW CARD CHUáº¨N 100% áº¢NH MáºªU */
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

  /* â”€â”€ MODAL SHEET & DETAIL â”€â”€ */
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

  /* â”€â”€ TRANG CHI TIáº¾T KHOáº¢N Ná»¢ (CHUáº¨N 100% THEO THIáº¾T Káº¾ áº¢NH MáºªU) â”€â”€ */
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

  /* 2. Banner ná»n áº£nh theo loáº¡i ná»£ */
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

  /* Card TÃªn khoáº£n vay & Badge tráº¡ng thÃ¡i */
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

  /* 3. Khá»‘i 3 cá»™t sá»‘ tiá»n (Vay/Cho vay - ÄÃ£ tráº£/thu - CÃ²n láº¡i) kÃ¨m tiáº¿n trÃ¬nh */
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

  /* 4. Khá»‘i ThÃ´ng tin chung / Thao tÃ¡c / Lá»‹ch sá»­ */
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

  /* DÃ²ng thÃ´ng tin khoáº£n ná»£ */
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

  /* 5. Cá»¥m 3 nÃºt thao tÃ¡c: [Thanh toÃ¡n] [Cáº­p nháº­t] [XÃ³a ná»£] */
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

  /* 6. Lá»‹ch sá»­ thanh toÃ¡n */
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

  /* MODAL POPUP CHI TIáº¾T Äá»¢T THANH TOÃN */
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

  /* â”€â”€ FORM THÃŠM Ná»¢ (CHUáº¨N 100% WEB & DB) â”€â”€ */
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

  /* KHUNG HÃŒNH THá»¨C TRáº¢ Ná»¢ */
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    height: 48,
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

  /* KHUNG Äá»’NG Bá»˜ Lá»ŠCH */
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

  /* â”€â”€ DROPDOWN SELECTORS CHO FORM (CHUáº¨N WEB & MOBILE) â”€â”€ */
  modernSelectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 48,
  },
  modernSelectDropdownLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 48,
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

  /* NÃšT SUBMIT */
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
