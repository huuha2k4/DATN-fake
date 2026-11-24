import { AppAlert as Alert } from '../../../context/DialogContext';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../core/components/FinanceIcon';
import { AppDateTimePicker } from '../../core/components/AppDateTimePicker';
import {
  transactionApi,
  type CategoryItem,
  type TransactionType,
} from '../../add-transaction/api/transactionApi';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { finAiSyncEmitter } from '../../ai-assistant/api/finAiSyncEmitter';
import { accountApi, type AccountItem, type AccountTypeCode } from '../../accounts/api/accountApi';
import { findBankOrWalletPreset } from '../../accounts/constants/banksData';
import { exportTransactionHistoryToExcel } from '../utils/exportTransactionHistoryHelper';
import { ocrApi } from '../../scan-invoice/api';
import { useAppTheme } from '../../../context/ThemeContext';

type Props = {
  onBack: () => void;
  onAddTransaction: () => void;
};

export interface TransactionItem {
  id: string;
  transactionType: TransactionType;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  amount: number;
  currencyCode: string;
  description: string;
  transactionDate: string;
  transactionTime?: string;
  receiptId?: string;
  receiptUrl?: string;
  note?: string;
  notes?: string;
  version?: number;
  createdAt?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
}

export function TransactionsScreen({ onBack, onAddTransaction }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const currentUser = authStorage.getUser();
  const isChildAccount = Boolean(currentUser?.childAccount && currentUser?.childWalletGroupId);

  // Tab lọc: Tất cả | Chi tiêu | Thu nhập | Chuyển khoản
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<CashflowSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    transactionCount: 0,
  });

  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<TransactionItem | null>(null);
  const [fullReceiptUri, setFullReceiptUri] = useState<string | null>(null);

  // Chế độ chỉnh sửa & xóa giao dịch ngay trong Modal Chi tiết
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDateObj, setEditDateObj] = useState<Date | null>(new Date());
  const [editTime, setEditTime] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editToAccountId, setEditToAccountId] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [editPickerType, setEditPickerType] = useState<'NONE' | 'CATEGORY' | 'ACCOUNT' | 'TO_ACCOUNT'>('NONE');

  // Bộ lọc theo Ví / Nguồn tiền cụ thể (ALL hoặc accountId)
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  // Tải danh sách tài khoản/ví và danh mục người dùng
  const reloadAccountsAndCategories = () => {
    const user = authStorage.getUser();
    if (user?.childAccount && user?.childWalletGroupId && user?.childWalletId) {
      // Nếu là tài khoản trẻ em: ví hiển thị là ví của bé
      const childAcc: AccountItem = {
        id: user.childWalletId,
        name: user.childWalletName || 'Ví của em',
        accountType: 'CASH',
        currencyCode: 'VND',
        balance: 0,
      };
      setAccounts([childAcc]);
      transactionApi.getCategories().then((catList) => {
        setCategories(catList || []);
      });
      return;
    }

    accountApi.getAccounts().then((accList) => {
      setAccounts(accList || []);
    });
    transactionApi.getCategories().then((catList) => {
      setCategories(catList || []);
    });
  };

  useEffect(() => {
    reloadAccountsAndCategories();
  }, []);

  // Mở chế độ chỉnh sửa cho giao dịch đang chọn
  const handleStartEditTx = (tx: TransactionItem) => {
    setEditAmount(new Intl.NumberFormat('vi-VN').format(tx.amount || 0));
    setEditDescription(tx.description || '');
    setEditNote(tx.note || tx.notes || '');
    // Tạo đối tượng Date cho AppDateTimePicker
    let dateObj = new Date();
    if (tx.transactionDate) {
      try {
        const timePart = tx.transactionTime ? tx.transactionTime.slice(0, 5) : '12:00';
        const d = new Date(`${tx.transactionDate}T${timePart}:00`);
        if (!isNaN(d.getTime())) {
          dateObj = d;
        }
      } catch {
        dateObj = new Date();
      }
    }
    setEditDateObj(dateObj);
    setEditTime(tx.transactionTime ? tx.transactionTime.slice(0, 5) : '12:00');
    setEditCategoryId(tx.category?.id || '');
    setEditAccountId(tx.accountId || '');
    setEditToAccountId(tx.toAccountId || '');
    setIsEditingTx(true);
  };

  // Lưu thay đổi giao dịch
  const handleSaveEditTx = async () => {
    if (!selectedTxDetail) return;
    const numericAmount = parseInt(editAmount.replace(/\D/g, ''), 10) || 0;
    if (numericAmount <= 0) {
      Alert.alert('Số tiền chưa hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    let isoDate = selectedTxDetail.transactionDate;
    let formattedTime = selectedTxDetail.transactionTime;
    if (editDateObj) {
      const y = editDateObj.getFullYear();
      const m = String(editDateObj.getMonth() + 1).padStart(2, '0');
      const d = String(editDateObj.getDate()).padStart(2, '0');
      const hh = String(editDateObj.getHours()).padStart(2, '0');
      const mm = String(editDateObj.getMinutes()).padStart(2, '0');
      isoDate = `${y}-${m}-${d}`;
      formattedTime = `${hh}:${mm}:00`;
    }

    setEditSubmitting(true);
    try {
      const res = await transactionApi.updateTransaction(selectedTxDetail.id, {
        amount: numericAmount,
        description: editDescription.trim() || 'Giao dịch',
        note: editNote.trim(),
        transactionDate: isoDate,
        transactionTime: formattedTime,
        categoryId:
          selectedTxDetail.transactionType !== 'TRANSFER' && editCategoryId
            ? editCategoryId
            : undefined,
        accountId: editAccountId || selectedTxDetail.accountId,
        toAccountId:
          selectedTxDetail.transactionType === 'TRANSFER' && editToAccountId
            ? editToAccountId
            : undefined,
        version: selectedTxDetail.version,
      });

      if (!res.success) {
        Alert.alert('Không thể cập nhật', res.message || 'Vui lòng thử lại.');
        return;
      }

      const updatedCat = categories.find((c) => c.id === editCategoryId) || selectedTxDetail.category;
      const updatedAcc = accounts.find((a) => a.id === editAccountId);
      const updatedToAcc = accounts.find((a) => a.id === editToAccountId);

      const updatedItem: TransactionItem = {
        ...selectedTxDetail,
        ...(res.data || {}),
        amount: numericAmount,
        description: editDescription.trim() || 'Giao dịch',
        note: editNote.trim(),
        notes: editNote.trim(),
        transactionDate: isoDate,
        transactionTime: formattedTime ? formattedTime.slice(0, 5) : editTime.slice(0, 5),
        accountId: editAccountId || selectedTxDetail.accountId,
        accountName: updatedAcc?.name || selectedTxDetail.accountName,
        toAccountId: editToAccountId || selectedTxDetail.toAccountId,
        toAccountName: updatedToAcc?.name || selectedTxDetail.toAccountName,
        category: updatedCat
          ? {
              id: updatedCat.id,
              name: updatedCat.name,
              icon: updatedCat.icon,
              color: updatedCat.color,
            }
          : selectedTxDetail.category,
      };

      setSelectedTxDetail(updatedItem);
      setIsEditingTx(false);
      await fetchTransactions(true);
      reloadAccountsAndCategories();
      Alert.alert('Thành công', 'Đã cập nhật thông tin giao dịch và đồng bộ số dư ví.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu thay đổi.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Xác nhận và xóa giao dịch
  const handleConfirmDeleteTx = (tx: TransactionItem) => {
    Alert.alert(
      'Xóa giao dịch?',
      `Bạn có chắc chắn muốn xóa giao dịch "${tx.description || tx.category?.name || 'Giao dịch'}" (${formatVND(tx.amount)} đ)?\n\nSố dư ví liên quan sẽ được hoàn trả tự động.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa giao dịch',
          style: 'destructive',
          onPress: async () => {
            setDeleteSubmitting(true);
            try {
              const res = await transactionApi.deleteTransaction(tx.id, tx.version);
              if (!res.success) {
                Alert.alert('Không thể xóa', res.message || 'Vui lòng thử lại.');
                return;
              }
              setFullReceiptUri(null);
              setIsEditingTx(false);
              setSelectedTxDetail(null);
              await fetchTransactions(true);
              reloadAccountsAndCategories();
              Alert.alert('Đã xóa', 'Giao dịch đã được xóa và hoàn lại số dư ví.');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa giao dịch.');
            } finally {
              setDeleteSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Map accountId -> AccountItem để tra cứu nhanh thông tin ví
  const accountMap = useMemo(() => {
    const map = new Map<string, AccountItem>();
    accounts.forEach((acc) => {
      map.set(acc.id, acc);
    });
    return map;
  }, [accounts]);

  // Lấy meta hiển thị cho loại tài khoản (đồng bộ AccountsScreen)
  const getAccountTypeMeta = (type?: AccountTypeCode) => {
    switch (type) {
      case 'CASH':
        return { label: 'Tiền mặt', icon: 'wallet', color: '#059669', bg: '#E8F8F0' };
      case 'BANK_ACCOUNT':
        return { label: 'Ngân hàng', icon: 'bank', color: '#0284C7', bg: '#E0F2FE' };
      case 'E_WALLET':
        return { label: 'Ví điện tử', icon: 'wallet', color: '#D97706', bg: '#FEF3C7' };
      case 'CREDIT_CARD':
        return { label: 'Thẻ tín dụng', icon: 'card', color: '#E11D48', bg: '#FEE2E2' };
      case 'SAVINGS':
        return { label: 'Tiết kiệm', icon: 'savings', color: '#7C3AED', bg: '#F3E8FF' };
      case 'INVESTMENT':
        return { label: 'Đầu tư', icon: 'analytics', color: '#2563EB', bg: '#DBEAFE' };
      case 'CRYPTO':
        return { label: 'Tiền mã hóa', icon: 'wallet', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { label: 'Khác', icon: 'wallet', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  // Render Icon hoặc Logo thương hiệu của ví (Vietcombank, MB, MoMo, ZaloPay...)
  const renderWalletBadge = (acc?: AccountItem, size = 38) => {
    if (!acc) {
      return (
        <View style={[styles.walletOptionIconBox, { width: size, height: size, backgroundColor: '#E8F8F0' }]}>
          <FinanceIcon name="wallet" size={size * 0.48} color="#059669" />
        </View>
      );
    }

    const brand = findBankOrWalletPreset(acc.name);
    const meta = getAccountTypeMeta(acc.accountType);

    if (brand?.logoUrl) {
      return (
        <View style={[styles.walletBrandLogoBox, { width: size, height: size }]}>
          <Image source={{ uri: brand.logoUrl }} style={styles.walletBrandLogoImg} resizeMode="contain" />
        </View>
      );
    }

    if (brand) {
      return (
        <View style={[styles.walletBrandLogoBox, { width: size, height: size, backgroundColor: brand.bgColor }]}>
          <Text style={[styles.walletBrandLogoText, { color: brand.textColor, fontSize: size * 0.32 }]}>
            {brand.shortName.slice(0, 3)}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.walletOptionIconBox, { width: size, height: size, backgroundColor: meta.bg }]}>
        <FinanceIcon name={meta.icon as any} size={size * 0.48} color={meta.color} />
      </View>
    );
  };

  const selectedAccountLabel = selectedAccount === 'ALL'
    ? 'Tất cả ví'
    : accounts.find((a) => a.id === selectedAccount)?.name || 'Tất cả ví';

  // Danh sách kỳ báo cáo: "Tất cả thời gian" ở trên cùng + 12 tháng gần nhất
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [
      { key: 'ALL', label: 'Tất cả thời gian' },
    ];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
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

  // Fetch dữ liệu giao dịch từ API thực tế Backend (/api/v1/transactions hoặc child spend-requests)
  const fetchTransactions = async (isRefresh = false) => {
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (user?.childAccount && user?.childWalletGroupId && user?.childWalletId) {
        // Tài khoản trẻ em: lấy danh sách giao dịch từ spend-requests
        const res = await fetch(`${API_BASE_URL}/groups/${user.childWalletGroupId}/child-wallets/${user.childWalletId}/spend-requests?size=100`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          const rawItems: any[] = Array.isArray(json) ? json : (json?.content || json?.data || []);
          const approved = rawItems.filter((i: any) => i.status === 'APPROVED');

          let inc = 0;
          let exp = 0;
          const mapped: TransactionItem[] = approved.map((item: any) => {
            const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
            const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
            const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
            const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
            const income = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

            let displayDesc = item.description || 'Giao dịch';
            if (isDeposit) displayDesc = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
            else if (isChoreReward) displayDesc = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
            else if (isGiftIncome) displayDesc = item.description.replace('[INCOME_GIFT] ', '');
            else if (isMoneyReq) displayDesc = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;

            const amt = Math.abs(Number(item.amount || 0));
            if (income) inc += amt;
            else exp += amt;

            const dateStr = item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
            const timeStr = item.createdAt ? item.createdAt.slice(11, 16) : '12:00';

            let catIcon = income ? 'gift' : 'utensils';
            let catColor = income ? '#15803D' : '#E11D48';
            let catName = income ? 'Khoản thu' : 'Chi tiêu';

            if (item.category?.name) {
              catName = item.category.name;
              catIcon = item.category.icon || resolveCategoryIconName(item.category.icon, income ? 'INCOME' : 'EXPENSE', item.category.name);
              catColor = item.category.color || catColor;
            } else if (isDeposit) {
              catName = 'Bố mẹ nạp ví';
              catIcon = 'wallet';
            } else if (isChoreReward) {
              catName = 'Thưởng việc nhà';
              catIcon = 'award';
            } else if (isGiftIncome) {
              catName = 'Lì xì / Quà tặng';
              catIcon = 'gift';
            } else if (isMoneyReq) {
              catName = 'Bố mẹ cấp';
              catIcon = 'coins';
            } else {
              // Chi tiêu thường của bé: tự động đoán icon từ tên mô tả (vd: Ăn uống -> utensils, Mua sắm -> shopping-bag)
              catIcon = resolveCategoryIconName(undefined, 'EXPENSE', displayDesc);
            }

            return {
              id: item.id,
              transactionType: income ? 'INCOME' : 'EXPENSE',
              accountId: user.childWalletId!,
              accountName: user.childWalletName || 'Ví của em',
              amount: amt,
              currencyCode: 'VND',
              description: displayDesc,
              transactionDate: dateStr,
              transactionTime: timeStr,
              category: {
                id: item.categoryId || 'child_cat',
                name: catName,
                icon: catIcon,
                color: catColor,
              },
            };
          });

          // Lọc theo tháng nếu đang chọn tháng cụ thể
          let finalFiltered = mapped;
          if (selectedMonth && selectedMonth !== 'ALL') {
            finalFiltered = mapped.filter((t) => t.transactionDate.startsWith(selectedMonth));
          }

          setTransactions(finalFiltered);
          setSummary({
            totalIncome: inc,
            totalExpense: exp,
            netCashFlow: inc - exp,
            transactionCount: finalFiltered.length,
          });
        }
        return;
      }

      const url = new URL(`${API_BASE_URL}/transactions`);
      url.searchParams.append('pageSize', '100');

      if (selectedMonth && selectedMonth !== 'ALL') {
        const [year, month] = selectedMonth.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        url.searchParams.append('fromDate', `${selectedMonth}-01`);
        url.searchParams.append('toDate', `${selectedMonth}-${String(lastDay).padStart(2, '0')}`);
      }

      const res = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const json = await res.json();
        const txList = json?.transactions || json?.data?.transactions || [];
        const sum = json?.summary || json?.data?.summary;

        setTransactions(txList);
        if (sum) {
          setSummary({
            totalIncome: sum.totalIncome || 0,
            totalExpense: sum.totalExpense || 0,
            netCashFlow: (sum.totalIncome || 0) - (sum.totalExpense || 0),
            transactionCount: sum.transactionCount || txList.length,
          });
        } else {
          // Tính toán thủ công nếu backend không trả summary
          let inc = 0;
          let exp = 0;
          txList.forEach((t: TransactionItem) => {
            if (t.transactionType === 'INCOME') inc += t.amount;
            else if (t.transactionType === 'EXPENSE') exp += t.amount;
          });
          setSummary({
            totalIncome: inc,
            totalExpense: exp,
            netCashFlow: inc - exp,
            transactionCount: txList.length,
          });
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const unsubscribe = finAiSyncEmitter.subscribe(() => {
      fetchTransactions(true);
      reloadAccountsAndCategories();
    });
    return () => unsubscribe();
  }, [selectedMonth]);

  // Lọc giao dịch theo Tab, Tìm kiếm & Ví cụ thể
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      // 1. Lọc theo Ví cụ thể mà người dùng sở hữu (đồng bộ bản Web)
      if (selectedAccount !== 'ALL') {
        const matchesFromAcc = t.accountId === selectedAccount;
        const matchesToAcc = t.toAccountId === selectedAccount;
        if (!matchesFromAcc && !matchesToAcc) return false;
      }

      // 2. Lọc tab
      if (activeTab !== 'ALL' && t.transactionType !== activeTab) return false;

      // 3. Lọc tìm kiếm
      if (query) {
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchCat = t.category?.name?.toLowerCase().includes(query);
        const matchAcc = t.accountName?.toLowerCase().includes(query);
        return matchDesc || matchCat || matchAcc;
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery, selectedAccount]);

  // Tính lại tổng dòng tiền dựa trên danh sách giao dịch đã lọc theo ví
  const displayedSummary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      if (t.transactionType === 'INCOME') inc += t.amount;
      else if (t.transactionType === 'EXPENSE') exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netCashFlow: inc - exp,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Gom nhóm giao dịch theo Ngày (DD/MM/YYYY)
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.transactionDate || 'Chưa xác định';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(tx);
    });

    return Array.from(map.entries()).map(([dateStr, items]) => {
      // Chuyển đổi định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
      let displayDate = dateStr;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Tính tổng dòng tiền trong ngày
      let dayTotal = 0;
      items.forEach((item) => {
        if (item.transactionType === 'INCOME') dayTotal += item.amount;
        else if (item.transactionType === 'EXPENSE') dayTotal -= item.amount;
      });

      return {
        dateStr,
        displayDate,
        dayTotal,
        items,
      };
    });
  }, [filteredTransactions]);

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const selectedMonthLabel = availableMonths.find((m) => m.key === selectedMonth)?.label || 'Tháng này';

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? themeColors.background : '#FFFFFF'} />
      {/* ── 1. HEADER THANH LỊCH NỀN TRẮNG ĐỒNG BỘ ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
            borderBottomColor: isDark ? themeColors.cardBorder : '#F1F5F9',
          },
        ]}
      >
        <View style={styles.headerLeftGroup}>
          <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>
            Quản lý Thu & Chi
          </Text>
        </View>

        {/* Nút chọn tháng lọc nhanh đồng bộ phong cách Ngân sách */}
        <Pressable
          onPress={() => setMonthModalVisible(true)}
          style={[
            styles.monthBadgeBtn,
            isDark && {
              backgroundColor: 'rgba(52, 211, 153, 0.12)',
              borderColor: 'rgba(52, 211, 153, 0.25)',
            },
          ]}
          hitSlop={8}
        >
          <FinanceIcon name="calendar" size={15} color={isDark ? '#34D399' : '#047857'} />
          <Text style={[styles.monthBadgeText, isDark && { color: '#34D399' }]}>
            {selectedMonthLabel}
          </Text>
          <FinanceIcon name="chevron-down" size={13} color={isDark ? '#34D399' : '#047857'} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTransactions(true)}
            colors={['#00A86B']}
            tintColor="#00A86B"
          />
        }
      >
        {/* ── 2. CARDS TỔNG KẾT DÒNG TIỀN (THU NHẬP - CHI TIÊU - SỐ DƯ RÒNG) ── */}
        <View style={styles.summaryRibbon}>
          {/* Card Thu nhập */}
          <View
            style={[
              styles.summaryCard,
              styles.summaryCardIncome,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <View style={styles.summaryCardTop}>
              <View
                style={[
                  styles.summaryIconBox,
                  { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : '#E6F4EA' },
                ]}
              >
                <FinanceIcon name="income" size={16} color={isDark ? '#34D399' : '#137333'} />
              </View>
              <Text style={[styles.summaryCardBadgeText, isDark && { color: '#34D399' }]}>
                Dòng tiền vào
              </Text>
            </View>
            <Text style={[styles.summaryCardLabel, isDark && { color: themeColors.textSecondary }]}>
              TỔNG THU
            </Text>
            <Text
              style={[
                styles.summaryCardValueIncome,
                isDark && { color: '#34D399' },
              ]}
              numberOfLines={1}
            >
              +{formatVND(displayedSummary.totalIncome)} <Text style={styles.unitSmall}>đ</Text>
            </Text>
          </View>

          {/* Card Chi tiêu */}
          <View
            style={[
              styles.summaryCard,
              styles.summaryCardExpense,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <View style={styles.summaryCardTop}>
              <View
                style={[
                  styles.summaryIconBox,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FCE8E6' },
                ]}
              >
                <FinanceIcon name="expense" size={16} color={isDark ? '#F87171' : '#C5221F'} />
              </View>
              <Text style={[styles.summaryCardBadgeText, { color: isDark ? '#F87171' : '#C5221F' }]}>
                Dòng tiền ra
              </Text>
            </View>
            <Text style={[styles.summaryCardLabel, isDark && { color: themeColors.textSecondary }]}>
              TỔNG CHI
            </Text>
            <Text
              style={[
                styles.summaryCardValueExpense,
                isDark && { color: '#F87171' },
              ]}
              numberOfLines={1}
            >
              -{formatVND(displayedSummary.totalExpense)} <Text style={styles.unitSmall}>đ</Text>
            </Text>
          </View>
        </View>

        {/* Thẻ Thặng dư ròng */}
        <View
          style={[
            styles.netCashflowCard,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.netCashflowLabel, isDark && { color: themeColors.textSecondary }]}>
            THẶNG DƯ RÒNG (THU - CHI)
          </Text>
          <Text
            style={[
              styles.netCashflowValue,
              displayedSummary.netCashFlow >= 0
                ? isDark
                  ? { color: '#34D399' }
                  : styles.netPositive
                : isDark
                ? { color: '#F87171' }
                : styles.netNegative,
            ]}
          >
            {displayedSummary.netCashFlow >= 0 ? '+' : ''}
            {formatVND(displayedSummary.netCashFlow)} đ
          </Text>
        </View>

        {/* ── 3. HÀNG TÌM KIẾM, BỘ LỌC VÍ & NÚT XUẤT EXCEL ── */}
        <View style={styles.filterRowContainer}>
          {/* Thanh tìm kiếm */}
          <View
            style={[
              styles.searchBarBox,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <FinanceIcon name="search" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm giao dịch..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={[
                styles.searchBarInput,
                isDark && { color: themeColors.textPrimary },
              ]}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <FinanceIcon name="close" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
              </Pressable>
            ) : null}
          </View>

          {/* Nút thả xuống chọn ví / nguồn tiền */}
          {!isChildAccount && (
            <Pressable
              onPress={() => setWalletModalVisible(true)}
              style={[
                styles.walletFilterDropdownBtn,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                },
                selectedAccount !== 'ALL' && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: '#10B981' } : styles.walletFilterDropdownBtnActive),
              ]}
            >
              <View style={styles.walletFilterBtnContent}>
                {renderWalletBadge(selectedAccount !== 'ALL' ? accountMap.get(selectedAccount) : undefined, 20)}
                <Text
                  style={[
                    styles.walletFilterBtnText,
                    isDark && { color: themeColors.textSecondary },
                    selectedAccount !== 'ALL' && (isDark ? { color: '#34D399', fontWeight: '800' } : styles.walletFilterBtnTextActive),
                  ]}
                  numberOfLines={1}
                >
                  {selectedAccount === 'ALL' ? 'Nguồn tiền' : selectedAccountLabel}
                </Text>
                <Text style={[styles.walletFilterDropdownChevron, isDark && { color: themeColors.textMuted }]}>▾</Text>
              </View>
            </Pressable>
          )}

          {/* Nút Xuất Excel */}
          <Pressable
            onPress={() => {
              const tabLabels: Record<string, string> = {
                ALL: 'Tất cả',
                EXPENSE: 'Tiền chi',
                INCOME: 'Tiền thu',
                TRANSFER: 'Chuyển khoản',
              };
              exportTransactionHistoryToExcel(filteredTransactions, {
                monthLabel: selectedMonthLabel,
                walletLabel: selectedAccount === 'ALL' ? 'Tất cả ví' : selectedAccountLabel,
                tabLabel: tabLabels[activeTab] || 'Tất cả',
                searchQuery: searchQuery.trim(),
                activeTab,
                selectedMonth,
                summary: displayedSummary,
              });
            }}
            style={[
              styles.exportExcelBtn,
              isDark && {
                backgroundColor: 'rgba(52, 211, 153, 0.12)',
                borderColor: '#059669',
              },
            ]}
          >
            <Text style={[styles.exportExcelIcon, isDark && { color: '#34D399' }]}>⤓</Text>
            <Text style={[styles.exportExcelText, isDark && { color: '#34D399' }]}>Xuất Excel</Text>
          </Pressable>
        </View>

        {/* ── 4. TAB PHÂN LOẠI: TẤT CẢ | CHI TIÊU | THU NHẬP | CHUYỂN KHOẢN ── */}
        <View style={styles.tabsRow}>
          {(
            [
              ['ALL', 'Tất cả'],
              ['EXPENSE', 'Tiền chi'],
              ['INCOME', 'Tiền thu'],
              ['TRANSFER', 'Chuyển khoản'],
            ] as const
          ).map(([key, label]) => {
            const isSelected = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[
                  styles.tabButton,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                  isSelected && (isDark ? { backgroundColor: '#10B981', borderColor: '#10B981' } : styles.tabButtonActive),
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isDark && { color: themeColors.textSecondary },
                    isSelected && (isDark ? { color: '#FFFFFF', fontWeight: '800' } : styles.tabButtonTextActive),
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── 5. DANH SÁCH GIAO DỊCH GOM THEO NGÀY (GIAO DIỆN CHUẨN ĐẸP) ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={styles.loadingText}>Đang nạp danh sách giao dịch...</Text>
          </View>
        ) : groupedTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <Text style={styles.emptyIcon}>📋</Text>
            <Text
              style={[
                styles.emptyTitle,
                isDark && { color: themeColors.textPrimary },
              ]}
            >
              Chưa có giao dịch phù hợp
            </Text>
            <Text
              style={[
                styles.emptySub,
                isDark && { color: themeColors.textSecondary },
              ]}
            >
              Không tìm thấy khoản thu chi nào trong {selectedMonthLabel}.
            </Text>
          </View>
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.dateStr} style={styles.dateGroupContainer}>
              {/* Header ngày */}
              <View style={styles.dateGroupHeader}>
                <Text
                  style={[
                    styles.dateGroupTitle,
                    isDark && { color: themeColors.textSecondary },
                  ]}
                >
                  {group.displayDate}
                </Text>
                <Text
                  style={[
                    styles.dateGroupTotal,
                    group.dayTotal >= 0
                      ? (isDark ? { color: '#34D399' } : styles.colorIncome)
                      : (isDark ? { color: '#F87171' } : styles.colorExpense),
                  ]}
                >
                  {group.dayTotal >= 0 ? '+' : ''}
                  {formatVND(group.dayTotal)} đ
                </Text>
              </View>

              {/* Danh sách các item trong ngày */}
              <View
                style={[
                  styles.dayItemsCard,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                {group.items.map((tx, idx) => {
                  const isIncome = tx.transactionType === 'INCOME';
                  const isTransfer = tx.transactionType === 'TRANSFER';
                  const descLower = (tx.description || '').toLowerCase();
                  const catNameLower = (tx.category?.name || '').toLowerCase();
                  let iconName: IconName = 'utensils';

                  if (
                    descLower.includes('tiết kiệm') ||
                    descLower.includes('đầu tư') ||
                    descLower.includes('mục tiêu') ||
                    descLower.includes('quỹ') ||
                    descLower.includes('tích lũy') ||
                    descLower.includes('heo đất') ||
                    catNameLower.includes('tiết kiệm') ||
                    catNameLower.includes('đầu tư') ||
                    catNameLower.includes('mục tiêu')
                  ) {
                    iconName = 'piggy-bank';
                  } else if (descLower.includes('nạp ví') || descLower.includes('[income_deposit]')) {
                    iconName = 'wallet';
                  } else if (descLower.includes('cấp tiền') || descLower.includes('[money_request]') || descLower.includes('xin tiền')) {
                    iconName = 'coins';
                  } else if (descLower.includes('thưởng') || descLower.includes('nhiệm vụ') || descLower.includes('[income_chore]')) {
                    iconName = 'award';
                  } else if (descLower.includes('lì xì') || descLower.includes('quà') || descLower.includes('[income_gift]')) {
                    iconName = 'gift';
                  } else if (tx.category?.icon && tx.category.icon !== 'shopping' && tx.category.icon !== 'money') {
                    iconName = resolveCategoryIconName(
                      tx.category.icon,
                      tx.transactionType,
                      `${tx.category?.name || ''} ${tx.description || ''}`
                    );
                  } else {
                    iconName = resolveCategoryIconName(
                      tx.category?.icon,
                      tx.transactionType,
                      `${tx.category?.name || ''} ${tx.description || ''}`
                    );
                  }

                  return (
                    <View key={tx.id || idx}>
                      <Pressable
                        onPress={() => setSelectedTxDetail(tx)}
                        style={({ pressed }) => [
                          styles.txRow,
                          pressed && (isDark ? { backgroundColor: 'rgba(255,255,255,0.04)' } : styles.txRowPressed),
                        ]}
                      >
                        {/* Icon vuông bo góc mềm mại */}
                        <View
                          style={[
                            styles.txIconBox,
                            isIncome
                              ? isDark
                                ? { backgroundColor: 'rgba(52, 211, 153, 0.16)' }
                                : styles.txIconBoxIncome
                              : isTransfer
                              ? isDark
                                ? { backgroundColor: 'rgba(56, 189, 248, 0.16)' }
                                : styles.txIconBoxTransfer
                              : isDark
                              ? { backgroundColor: 'rgba(239, 68, 68, 0.16)' }
                              : styles.txIconBoxExpense,
                          ]}
                        >
                          <FinanceIcon
                            name={iconName}
                            size={18}
                            color={
                              isIncome
                                ? isDark
                                  ? '#34D399'
                                  : '#00A86B'
                                : isTransfer
                                ? isDark
                                  ? '#38BDF8'
                                  : '#0284C7'
                                : isDark
                                ? '#F87171'
                                : '#E53E3E'
                            }
                          />
                        </View>

                        {/* Nội dung diễn giải + Nguồn ví */}
                        <View style={styles.txInfoCol}>
                          <Text
                            style={[
                              styles.txTitle,
                              isDark && { color: themeColors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {tx.description || tx.category?.name || 'Giao dịch'}
                          </Text>
                          <View style={styles.txSubRow}>
                            <View
                              style={[
                                styles.txCatPill,
                                isIncome
                                  ? isDark
                                    ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' }
                                    : styles.txCatPillIncome
                                  : isTransfer
                                  ? isDark
                                    ? { backgroundColor: 'rgba(56, 189, 248, 0.15)' }
                                    : styles.txCatPillTransfer
                                  : isDark
                                  ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                                  : styles.txCatPillExpense,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txCatPillText,
                                  isIncome
                                    ? isDark
                                      ? { color: '#6EE7B7' }
                                      : styles.colorIncome
                                    : isTransfer
                                    ? { color: '#0284C7' }
                                    : styles.colorExpense,
                                ]}
                              >
                                {isTransfer
                                  ? 'Chuyển khoản'
                                  : tx.category?.name || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                              </Text>
                            </View>
                            {tx.receiptUrl ? (
                              <View
                                style={[
                                  styles.txReceiptBadge,
                                  isDark && {
                                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                    borderColor: 'rgba(52, 211, 153, 0.3)',
                                  },
                                ]}
                              >
                                <FinanceIcon name="receipt" size={10} color={isDark ? '#34D399' : '#059669'} />
                                <Text
                                  style={[
                                    styles.txReceiptBadgeText,
                                    isDark && { color: '#34D399' },
                                  ]}
                                >
                                  Hóa đơn
                                </Text>
                              </View>
                            ) : null}
                            <Text
                              style={[
                                styles.txAccountName,
                                isDark && { color: themeColors.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {isTransfer
                                ? `${tx.accountName} → ${tx.toAccountName || 'Ví nhận'}`
                                : tx.accountName || 'Ví tiền mặt'}
                            </Text>
                          </View>
                        </View>

                        {/* Số tiền & giờ */}
                        <View style={styles.txAmountCol}>
                          <Text
                            style={[
                              styles.txAmountText,
                              isIncome
                                ? isDark
                                  ? { color: '#34D399' }
                                  : styles.colorIncome
                                : isTransfer
                                ? isDark
                                  ? { color: '#38BDF8' }
                                  : { color: '#0284C7' }
                                : isDark
                                ? { color: '#F87171' }
                                : styles.colorExpense,
                            ]}
                          >
                            {isIncome ? '+' : isTransfer ? '' : '-'}
                            {formatVND(tx.amount)} đ
                          </Text>
                          {tx.transactionTime ? (
                            <Text
                              style={[
                                styles.txTimeText,
                                isDark && { color: themeColors.textMuted },
                              ]}
                            >
                              {tx.transactionTime.slice(0, 5)}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>

                      {idx < group.items.length - 1 && (
                        <View
                          style={[
                            styles.itemDivider,
                            isDark && { backgroundColor: themeColors.divider },
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── NÚT TẠO GIAO DỊCH MỚI NỔI NỔI BẬT GÓC DƯỚI ── */}
      <Pressable
        onPress={onAddTransaction}
        style={({ pressed }) => [
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom, 16) + 65 },
          pressed && styles.floatingAddBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Thêm giao dịch mới"
      >
        <Text style={styles.floatingAddIcon}>+</Text>
        <Text style={styles.floatingAddText}>Thêm giao dịch</Text>
      </Pressable>

      {/* ── MODAL CHỌN THÁNG LỌC ── */}
      <Modal visible={monthModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              isDark && {
                backgroundColor: themeColors.surface,
                borderTopColor: themeColors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.modalTopBar,
                isDark && { borderBottomColor: themeColors.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.modalTopTitle,
                  isDark && { color: themeColors.textPrimary },
                ]}
              >
                Chọn kỳ báo cáo / Tháng
              </Text>
              <Pressable onPress={() => setMonthModalVisible(false)} hitSlop={10}>
                <Text style={[styles.modalCloseText, isDark && { color: '#34D399' }]}>
                  Đóng
                </Text>
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }}>
              {availableMonths.map((m) => {
                const isSelected = selectedMonth === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setSelectedMonth(m.key);
                      setMonthModalVisible(false);
                    }}
                    style={[
                      styles.monthOptionRow,
                      isDark && { borderBottomColor: themeColors.divider },
                      isSelected && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderRadius: 12, paddingHorizontal: 8 } : styles.monthOptionRowActive),
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthOptionLabel,
                        isDark && { color: themeColors.textPrimary },
                        isSelected && (isDark ? { color: '#34D399', fontWeight: '800' } : styles.monthOptionLabelActive),
                      ]}
                    >
                      {m.label}
                    </Text>
                    {isSelected && <Text style={[styles.checkmarkIcon, isDark && { color: '#34D399' }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL THẢ XUỐNG CHỌN VÍ / NGUỒN TIỀN (CHUẨN BẢN WEB) ── */}
      <Modal visible={walletModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              isDark && {
                backgroundColor: themeColors.surface,
                borderTopColor: themeColors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.modalTopBar,
                isDark && { borderBottomColor: themeColors.cardBorder },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.modalTopTitle,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  Chọn Ví / Nguồn tiền
                </Text>
                <Text
                  style={[
                    styles.modalTopSub,
                    isDark && { color: themeColors.textMuted },
                  ]}
                >
                  Lọc các giao dịch phát sinh từ ví này
                </Text>
              </View>
              <Pressable onPress={() => setWalletModalVisible(false)} hitSlop={10}>
                <Text style={[styles.modalCloseText, isDark && { color: '#34D399' }]}>
                  Đóng
                </Text>
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 16, maxHeight: 420 }}>
              {/* Lựa chọn: Tất cả tài khoản / Ví */}
              <Pressable
                onPress={() => {
                  setSelectedAccount('ALL');
                  setWalletModalVisible(false);
                }}
                style={[
                  styles.walletOptionRow,
                  isDark && { borderBottomColor: themeColors.divider },
                  selectedAccount === 'ALL' && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.walletOptionRowActive),
                ]}
              >
                <View style={styles.walletOptionLeft}>
                  <View
                    style={[
                      styles.walletOptionIconBox,
                      { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' },
                    ]}
                  >
                    <FinanceIcon name="wallet" size={18} color={isDark ? '#34D399' : '#00A86B'} />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.walletOptionLabel,
                        isDark && { color: themeColors.textPrimary },
                        selectedAccount === 'ALL' && (isDark ? { color: '#34D399', fontWeight: '800' } : styles.walletOptionLabelActive),
                      ]}
                    >
                      Tất cả tài khoản / Ví
                    </Text>
                    <Text
                      style={[
                        styles.walletOptionCountText,
                        isDark && { color: themeColors.textMuted },
                      ]}
                    >
                      {transactions.length} giao dịch
                    </Text>
                  </View>
                </View>
                {selectedAccount === 'ALL' && <Text style={[styles.checkmarkIcon, isDark && { color: '#34D399' }]}>✓</Text>}
              </Pressable>

              {/* Danh sách các ví người dùng thực tế đang có */}
              {accounts.map((acc) => {
                const isSelected = selectedAccount === acc.id;
                // Đếm số lượng giao dịch của ví này
                const count = transactions.filter(
                  (t) => t.accountId === acc.id || t.toAccountId === acc.id
                ).length;

                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      setSelectedAccount(acc.id);
                      setWalletModalVisible(false);
                    }}
                    style={[
                      styles.walletOptionRow,
                      isDark && { borderBottomColor: themeColors.divider },
                      isSelected && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.walletOptionRowActive),
                    ]}
                  >
                    <View style={styles.walletOptionLeft}>
                      {renderWalletBadge(acc, 40)}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.walletOptionLabel,
                            isDark && { color: themeColors.textPrimary },
                            isSelected && (isDark ? { color: '#34D399', fontWeight: '800' } : styles.walletOptionLabelActive),
                          ]}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                        <Text
                          style={[
                            styles.walletOptionCountText,
                            isDark && { color: themeColors.textMuted },
                          ]}
                        >
                          {count} giao dịch · Số dư: {formatVND(acc.balance || 0)} đ
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Text style={[styles.checkmarkIcon, isDark && { color: '#34D399' }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHI TIẾT GIAO DỊCH (HỖ TRỢ XEM, CHỈNH SỬA & XÓA GIAO DỊCH) ── */}
      <Modal visible={Boolean(selectedTxDetail)} transparent animationType="slide">
        {selectedTxDetail && (() => {
          const isIncome = selectedTxDetail.transactionType === 'INCOME';
          const isTransfer = selectedTxDetail.transactionType === 'TRANSFER';
          const descLower = (selectedTxDetail.description || '').toLowerCase();
          const catNameLower = (selectedTxDetail.category?.name || '').toLowerCase();
          let iconName: IconName = 'utensils';

          if (
            descLower.includes('tiết kiệm') ||
            descLower.includes('đầu tư') ||
            descLower.includes('mục tiêu') ||
            descLower.includes('quỹ') ||
            descLower.includes('tích lũy') ||
            descLower.includes('heo đất') ||
            catNameLower.includes('tiết kiệm') ||
            catNameLower.includes('đầu tư') ||
            catNameLower.includes('mục tiêu')
          ) {
            iconName = 'piggy-bank';
          } else if (descLower.includes('nạp ví') || descLower.includes('[income_deposit]')) {
            iconName = 'wallet';
          } else if (descLower.includes('cấp tiền') || descLower.includes('[money_request]') || descLower.includes('xin tiền')) {
            iconName = 'coins';
          } else if (descLower.includes('thưởng') || descLower.includes('nhiệm vụ') || descLower.includes('[income_chore]')) {
            iconName = 'award';
          } else if (descLower.includes('lì xì') || descLower.includes('quà') || descLower.includes('[income_gift]')) {
            iconName = 'gift';
          } else {
            iconName = resolveCategoryIconName(
              selectedTxDetail.category?.icon,
              selectedTxDetail.transactionType,
              selectedTxDetail.category?.name || selectedTxDetail.description
            );
          }
          const fromAccount = accountMap.get(isEditingTx ? editAccountId : selectedTxDetail.accountId);
          const toAccount = selectedTxDetail.toAccountId
            ? accountMap.get(isEditingTx ? editToAccountId : selectedTxDetail.toAccountId)
            : undefined;
          const editCategories = categories.filter((c) => c.kind === selectedTxDetail.transactionType);
          const selectedEditCategory =
            categories.find((c) => c.id === editCategoryId) || selectedTxDetail.category;

          // Format ngày tháng DD/MM/YYYY
          let displayDate = selectedTxDetail.transactionDate || '';
          if (displayDate.includes('-')) {
            const parts = displayDate.split('-');
            if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }

          return (
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View
                style={[
                  styles.detailSheet,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderTopColor: themeColors.cardBorder,
                    borderTopWidth: 1,
                  },
                ]}
              >
                {/* Header sheet */}
                <View
                  style={[
                    styles.detailTopBar,
                    isDark && { borderBottomColor: themeColors.cardBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailTopTitle,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                  >
                    {isEditingTx ? 'Chỉnh sửa giao dịch' : 'Chi tiết giao dịch'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setFullReceiptUri(null);
                      setIsEditingTx(false);
                      setEditPickerType('NONE');
                      setSelectedTxDetail(null);
                    }}
                    hitSlop={12}
                  >
                    <Text
                      style={[
                        styles.modalCloseText,
                        isDark && { color: themeColors.accentGreen },
                      ]}
                    >
                      Đóng
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.detailScrollBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Card số tiền to nổi bật */}
                  <View
                    style={[
                      styles.detailHeroCard,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.detailBigIconBox,
                        isIncome
                          ? (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.18)' } : styles.txIconBoxIncome)
                          : isTransfer
                          ? (isDark ? { backgroundColor: 'rgba(56, 189, 248, 0.18)' } : styles.txIconBoxTransfer)
                          : (isDark ? { backgroundColor: 'rgba(248, 113, 113, 0.18)' } : styles.txIconBoxExpense),
                      ]}
                    >
                      <FinanceIcon
                        name={iconName}
                        size={28}
                        color={
                          isIncome
                            ? (isDark ? '#34D399' : '#00A86B')
                            : isTransfer
                            ? (isDark ? '#38BDF8' : '#0284C7')
                            : (isDark ? '#F87171' : '#E53E3E')
                        }
                      />
                    </View>

                    {isEditingTx ? (
                      <View style={styles.editHeroInputsWrap}>
                        <Text
                          style={[
                            styles.editFieldLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          SỐ TIỀN GIAO DỊCH
                        </Text>
                        <TextInput
                          value={editAmount}
                          onChangeText={(txt) => {
                            const raw = txt.replace(/\D/g, '');
                            setEditAmount(raw ? formatVND(parseInt(raw, 10)) : '');
                          }}
                          keyboardType="numeric"
                          placeholder="Nhập số tiền..."
                          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                          style={[
                            styles.editAmountInput,
                            isIncome
                              ? (isDark ? { color: '#34D399' } : styles.colorIncome)
                              : isTransfer
                              ? { color: isDark ? '#38BDF8' : '#0284C7' }
                              : (isDark ? { color: '#F87171' } : styles.colorExpense),
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        />
                      </View>
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.detailDescriptionText,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          {selectedTxDetail.description || selectedTxDetail.category?.name || 'Giao dịch'}
                        </Text>

                        <Text
                          style={[
                            styles.detailAmountText,
                            isIncome
                              ? (isDark ? { color: '#34D399' } : styles.colorIncome)
                              : isTransfer
                              ? { color: isDark ? '#38BDF8' : '#0284C7' }
                              : (isDark ? { color: '#F87171' } : styles.colorExpense),
                          ]}
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}
                          {formatVND(selectedTxDetail.amount)} đ
                        </Text>
                      </>
                    )}

                    <View
                      style={[
                        styles.detailTypeBadge,
                        isIncome
                          ? (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.16)' } : styles.txCatPillIncome)
                          : isTransfer
                          ? (isDark ? { backgroundColor: 'rgba(56, 189, 248, 0.16)' } : styles.txCatPillTransfer)
                          : (isDark ? { backgroundColor: 'rgba(239, 68, 68, 0.16)' } : styles.txCatPillExpense),
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailTypeBadgeText,
                          isIncome
                            ? (isDark ? { color: '#34D399' } : styles.colorIncome)
                            : isTransfer
                            ? { color: isDark ? '#38BDF8' : '#0284C7' }
                            : (isDark ? { color: '#F87171' } : styles.colorExpense),
                        ]}
                      >
                        {isTransfer
                          ? 'Giao dịch chuyển khoản'
                          : isIncome
                          ? 'Khoản tiền thu vào'
                          : 'Khoản tiền chi ra'}
                      </Text>
                    </View>
                  </View>

                  {isEditingTx ? (
                    /* ── BIỂU MẪU CHỈNH SỬA GIAO DỊCH TRỰC TIẾP ── */
                    <View
                      style={[
                        styles.editFormCard,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      {/* Tên / Mô tả giao dịch */}
                      <View style={styles.editFieldGroup}>
                        <Text
                          style={[
                            styles.editFieldLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          TÊN / NỘI DUNG GIAO DỊCH
                        </Text>
                        <TextInput
                          value={editDescription}
                          onChangeText={setEditDescription}
                          placeholder="Nhập mô tả giao dịch..."
                          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                          style={[
                            styles.editTextInput,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                              color: themeColors.textPrimary,
                            },
                          ]}
                        />
                      </View>

                      {/* Danh mục thu / chi (Dropdown chuẩn theo phong cách Sổ nợ) */}
                      {!isTransfer && (
                        <View style={styles.editFieldGroup}>
                          <Text
                            style={[
                              styles.editFieldLabel,
                              isDark && { color: themeColors.textSecondary },
                            ]}
                          >
                            HẠNG MỤC / DANH MỤC
                          </Text>
                          <Pressable
                            onPress={() => setEditPickerType('CATEGORY')}
                            style={[
                              styles.modernSelectDropdown,
                              isDark && {
                                backgroundColor: themeColors.surface,
                                borderColor: themeColors.cardBorder,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View
                                style={[
                                  styles.pickerCategoryBadge,
                                  {
                                    backgroundColor: isIncome
                                      ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                                      : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'),
                                  },
                                ]}
                              >
                                <FinanceIcon
                                  name={resolveCategoryIconName(
                                    selectedEditCategory?.icon,
                                    selectedTxDetail.transactionType,
                                    selectedEditCategory?.name
                                  )}
                                  size={15}
                                  color={
                                    isIncome
                                      ? (isDark ? '#34D399' : '#059669')
                                      : (isDark ? '#F87171' : '#E11D48')
                                  }
                                />
                              </View>
                              <Text
                                style={[
                                  styles.modernSelectText,
                                  isDark && { color: themeColors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {selectedEditCategory?.name || (isIncome ? 'Thu nhập chung' : 'Chi tiêu chung')}
                              </Text>
                            </View>
                            <FinanceIcon
                              name="chevron-down"
                              size={16}
                              color={isDark ? themeColors.accentGreen : '#047857'}
                            />
                          </Pressable>
                        </View>
                      )}

                      {/* Ví / Nguồn tiền (Dropdown chuẩn theo phong cách Sổ nợ) */}
                      <View style={styles.editFieldGroup}>
                        <Text
                          style={[
                            styles.editFieldLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          {isTransfer ? 'VÍ CHUYỂN ĐI' : 'NGUỒN TIỀN / VÍ'}
                        </Text>
                        <Pressable
                          onPress={() => setEditPickerType('ACCOUNT')}
                          style={[
                            styles.modernSelectDropdown,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            {renderWalletBadge(fromAccount, 22)}
                            <Text
                              style={[
                                styles.modernSelectText,
                                isDark && { color: themeColors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {fromAccount
                                ? `${fromAccount.name} (Số dư: ${formatVND(fromAccount.balance || 0)} đ)`
                                : selectedTxDetail.accountName || 'Ví tiền mặt'}
                            </Text>
                          </View>
                          <FinanceIcon
                            name="chevron-down"
                            size={16}
                            color={isDark ? themeColors.accentGreen : '#047857'}
                          />
                        </Pressable>
                      </View>

                      {/* Ví nhận nếu là giao dịch chuyển khoản */}
                      {isTransfer && (
                        <View style={styles.editFieldGroup}>
                          <Text
                            style={[
                              styles.editFieldLabel,
                              isDark && { color: themeColors.textSecondary },
                            ]}
                          >
                            VÍ NHẬN
                          </Text>
                          <Pressable
                            onPress={() => setEditPickerType('TO_ACCOUNT')}
                            style={[
                              styles.modernSelectDropdown,
                              isDark && {
                                backgroundColor: themeColors.surface,
                                borderColor: themeColors.cardBorder,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              {renderWalletBadge(toAccount, 22)}
                              <Text
                                style={[
                                  styles.modernSelectText,
                                  isDark && { color: themeColors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {toAccount
                                  ? `${toAccount.name} (Số dư: ${formatVND(toAccount.balance || 0)} đ)`
                                  : selectedTxDetail.toAccountName || 'Ví thụ hưởng'}
                              </Text>
                            </View>
                            <FinanceIcon
                              name="chevron-down"
                              size={16}
                              color={isDark ? themeColors.accentGreen : '#047857'}
                            />
                          </Pressable>
                        </View>
                      )}

                      {/* Ngày & Giờ giao dịch */}
                      <View style={{ marginBottom: 12 }}>
                        <AppDateTimePicker
                          value={editDateObj}
                          onChange={(d) => {
                            setEditDateObj(d);
                            if (d) {
                              const hh = String(d.getHours()).padStart(2, '0');
                              const mm = String(d.getMinutes()).padStart(2, '0');
                              setEditTime(`${hh}:${mm}`);
                            }
                          }}
                          label="THỜI GIAN GIAO DỊCH"
                        />
                      </View>

                      {/* Ghi chú */}
                      <View style={styles.editFieldGroup}>
                        <Text
                          style={[
                            styles.editFieldLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          GHI CHÚ THÊM
                        </Text>
                        <TextInput
                          value={editNote}
                          onChangeText={setEditNote}
                          placeholder="Nhập ghi chú (không bắt buộc)..."
                          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                          multiline
                          style={[
                            styles.editTextInput,
                            { minHeight: 64, textAlignVertical: 'top' },
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                              color: themeColors.textPrimary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    /* ── CHẾ ĐỘ XEM THÔNG TIN CHI TIẾT ── */
                    <View
                      style={[
                        styles.detailInfoGroup,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      {/* Danh mục */}
                      {!isTransfer && (
                        <View
                          style={[
                            styles.detailInfoRow,
                            isDark && { borderBottomColor: themeColors.divider },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailInfoLabel,
                              isDark && { color: themeColors.textSecondary },
                            ]}
                          >
                            Hạng mục / Danh mục
                          </Text>
                          <View style={styles.detailInfoValueRow}>
                            <Text
                              style={[
                                styles.detailInfoValueText,
                                isDark && { color: themeColors.textPrimary },
                              ]}
                            >
                              {selectedTxDetail.category?.name || (isIncome ? 'Thu nhập chung' : 'Chi tiêu chung')}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Nguồn tiền / Ví chuyển */}
                      <View
                        style={[
                          styles.detailInfoRow,
                          isDark && { borderBottomColor: themeColors.divider },
                        ]}
                      >
                        <Text
                          style={[
                            styles.detailInfoLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          {isTransfer ? 'Ví chuyển đi' : 'Nguồn tiền / Ví'}
                        </Text>
                        <View style={styles.detailInfoValueRow}>
                          {renderWalletBadge(fromAccount, 22)}
                          <Text
                            style={[
                              styles.detailInfoValueText,
                              isDark && { color: themeColors.textPrimary },
                            ]}
                          >
                            {selectedTxDetail.accountName || fromAccount?.name || 'Ví tiền mặt'}
                          </Text>
                        </View>
                      </View>

                      {/* Ví nhận (nếu chuyển khoản) */}
                      {isTransfer && (
                        <View
                          style={[
                            styles.detailInfoRow,
                            isDark && { borderBottomColor: themeColors.divider },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailInfoLabel,
                              isDark && { color: themeColors.textSecondary },
                            ]}
                          >
                            Ví nhận
                          </Text>
                          <View style={styles.detailInfoValueRow}>
                            {renderWalletBadge(toAccount, 22)}
                            <Text
                              style={[
                                styles.detailInfoValueText,
                                isDark && { color: themeColors.textPrimary },
                              ]}
                            >
                              {selectedTxDetail.toAccountName || toAccount?.name || 'Ví thụ hưởng'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Thời gian giao dịch (Giờ trước, ngày sau: HH:mm ngày DD/MM/YYYY) */}
                      <View
                        style={[
                          styles.detailInfoRow,
                          isDark && { borderBottomColor: themeColors.divider },
                        ]}
                      >
                        <Text
                          style={[
                            styles.detailInfoLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          Thời gian ghi nhận
                        </Text>
                        <Text
                          style={[
                            styles.detailInfoValueText,
                            isDark && { color: themeColors.textPrimary },
                          ]}
                        >
                          {selectedTxDetail.transactionTime
                            ? `${selectedTxDetail.transactionTime.slice(0, 5)} ngày ${displayDate}`
                            : displayDate}
                        </Text>
                      </View>

                      {/* Ghi chú */}
                      {selectedTxDetail.note || selectedTxDetail.notes ? (
                        <View
                          style={[
                            styles.detailInfoRow,
                            isDark && { borderBottomColor: themeColors.divider },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailInfoLabel,
                              isDark && { color: themeColors.textSecondary },
                            ]}
                          >
                            Ghi chú thêm
                          </Text>
                          <Text
                            style={[
                              styles.detailInfoValueText,
                              isDark && { color: themeColors.textPrimary },
                            ]}
                          >
                            {selectedTxDetail.note || selectedTxDetail.notes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Mã giao dịch */}
                      <View style={[styles.detailInfoRow, { borderBottomWidth: 0 }]}>
                        <Text
                          style={[
                            styles.detailInfoLabel,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          Mã giao dịch
                        </Text>
                        <Text
                          style={[
                            styles.detailCodeText,
                            isDark && { color: themeColors.accentGreen },
                          ]}
                        >
                          #{selectedTxDetail.id ? selectedTxDetail.id.slice(0, 10).toUpperCase() : 'TXN'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Ảnh hóa đơn đính kèm (nếu có) */}
                  {(() => {
                    const resolvedReceiptUri = ocrApi.formatReceiptImageUrl(selectedTxDetail.receiptUrl);
                    if (!resolvedReceiptUri) return null;
                    return (
                      <View
                        style={[
                          styles.receiptContainer,
                          isDark && {
                            backgroundColor: themeColors.surfaceSubtle,
                            borderColor: themeColors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.receiptHeaderRow}>
                          <View style={styles.receiptHeaderLeft}>
                            <FinanceIcon
                              name="receipt"
                              size={16}
                              color={isDark ? themeColors.accentGreen : '#008B62'}
                            />
                            <Text
                              style={[
                                styles.receiptHeaderText,
                                isDark && { color: themeColors.textPrimary },
                              ]}
                            >
                              Hóa đơn đính kèm
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => setFullReceiptUri(resolvedReceiptUri)}
                            style={[
                              styles.receiptZoomBtn,
                              isDark && {
                                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                borderColor: 'rgba(52, 211, 153, 0.3)',
                              },
                            ]}
                            hitSlop={8}
                          >
                            <FinanceIcon
                              name="eye"
                              size={14}
                              color={isDark ? themeColors.accentGreen : '#008B62'}
                            />
                            <Text
                              style={[
                                styles.receiptZoomBtnText,
                                isDark && { color: themeColors.accentGreen },
                              ]}
                            >
                              Xem rõ toàn màn hình
                            </Text>
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => setFullReceiptUri(resolvedReceiptUri)}
                          style={[
                            styles.receiptImageWrapper,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: resolvedReceiptUri }}
                            style={styles.receiptImage}
                            resizeMode="contain"
                          />
                        </Pressable>
                      </View>
                    );
                  })()}

                  {/* ── THANH HÀNH ĐỘNG SỬA & XÓA GIAO DỊCH ── */}
                  {isEditingTx ? (
                    <View style={styles.detailActionRow}>
                      <Pressable
                        onPress={() => {
                          setIsEditingTx(false);
                          setEditPickerType('NONE');
                        }}
                        disabled={editSubmitting}
                        style={[
                          styles.detailSecondaryBtn,
                          isDark && {
                            backgroundColor: themeColors.surfaceSubtle,
                            borderColor: themeColors.cardBorder,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.detailSecondaryBtnText,
                            isDark && { color: themeColors.textSecondary },
                          ]}
                        >
                          Hủy
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={handleSaveEditTx}
                        disabled={editSubmitting}
                        style={[styles.detailPrimarySaveBtn, editSubmitting && { opacity: 0.7 }]}
                      >
                        {editSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <FinanceIcon name="check" size={16} color="#FFFFFF" />
                            <Text style={styles.detailPrimarySaveBtnText}>Lưu thay đổi</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.detailActionRow}>
                      <Pressable
                        onPress={() => handleStartEditTx(selectedTxDetail)}
                        disabled={deleteSubmitting}
                        style={[
                          styles.detailEditBtn,
                          isDark && {
                            backgroundColor: 'rgba(52, 211, 153, 0.15)',
                            borderColor: themeColors.accentGreen,
                          },
                        ]}
                      >
                        <FinanceIcon
                          name="edit"
                          size={16}
                          color={isDark ? themeColors.accentGreen : '#047857'}
                        />
                        <Text
                          style={[
                            styles.detailEditBtnText,
                            isDark && { color: themeColors.accentGreen },
                          ]}
                        >
                          Sửa giao dịch
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleConfirmDeleteTx(selectedTxDetail)}
                        disabled={deleteSubmitting}
                        style={[
                          styles.detailDeleteBtn,
                          isDark && {
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                          },
                          deleteSubmitting && { opacity: 0.7 },
                        ]}
                      >
                        {deleteSubmitting ? (
                          <ActivityIndicator size="small" color="#E11D48" />
                        ) : (
                          <>
                            <FinanceIcon name="delete" size={16} color="#E11D48" />
                            <Text style={styles.detailDeleteBtnText}>Xóa giao dịch</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </ScrollView>

                {/* ── OVERLAY PICKER CHỌN DANH MỤC / TÀI KHOẢN (ĐỒNG BỘ CHUẨN SỔ NỢ) ── */}
                {editPickerType !== 'NONE' && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.pickerModalBackdrop,
                      { zIndex: 9999, elevation: 9999 },
                    ]}
                  >
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={() => setEditPickerType('NONE')}
                    />
                    <View
                      style={[
                        styles.pickerModalBox,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.pickerModalHeader,
                          isDark && { borderBottomColor: themeColors.cardBorder },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerModalTitle,
                            isDark && { color: themeColors.textPrimary },
                          ]}
                        >
                          {editPickerType === 'CATEGORY'
                            ? 'Chọn hạng mục giao dịch'
                            : editPickerType === 'TO_ACCOUNT'
                            ? 'Chọn ví nhận'
                            : 'Chọn nguồn tiền / ví'}
                        </Text>
                        <Pressable onPress={() => setEditPickerType('NONE')} hitSlop={10}>
                          <FinanceIcon
                            name="close"
                            size={18}
                            color={isDark ? themeColors.textSecondary : '#64748B'}
                          />
                        </Pressable>
                      </View>

                      <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                        {editPickerType === 'CATEGORY' &&
                          editCategories.map((cat) => {
                            const active = cat.id === editCategoryId;
                            return (
                              <Pressable
                                key={cat.id}
                                onPress={() => {
                                  setEditCategoryId(cat.id);
                                  setEditPickerType('NONE');
                                }}
                                style={[
                                  styles.pickerItemRow,
                                  isDark && { borderBottomColor: themeColors.divider },
                                  active && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.16)' } : styles.pickerItemRowActive),
                                ]}
                              >
                                <View
                                  style={[
                                    styles.pickerCategoryBadge,
                                    {
                                      width: 34,
                                      height: 34,
                                      borderRadius: 17,
                                      backgroundColor: isIncome
                                        ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7')
                                        : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'),
                                    },
                                  ]}
                                >
                                  <FinanceIcon
                                    name={resolveCategoryIconName(
                                      cat.icon,
                                      selectedTxDetail.transactionType,
                                      cat.name
                                    )}
                                    size={17}
                                    color={
                                      isIncome
                                        ? (isDark ? '#34D399' : '#059669')
                                        : (isDark ? '#F87171' : '#E11D48')
                                    }
                                  />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text
                                    style={[
                                      styles.pickerItemText,
                                      isDark && { color: themeColors.textPrimary },
                                      active && (isDark ? { color: themeColors.accentGreen } : styles.pickerItemTextActive),
                                    ]}
                                  >
                                    {cat.name}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.pickerItemSub,
                                      isDark && { color: themeColors.textSecondary },
                                    ]}
                                  >
                                    {isIncome ? 'Hạng mục thu nhập' : 'Hạng mục chi tiêu'}
                                  </Text>
                                </View>
                                {active && (
                                  <FinanceIcon
                                    name="check"
                                    size={16}
                                    color={isDark ? themeColors.accentGreen : '#0E964E'}
                                  />
                                )}
                              </Pressable>
                            );
                          })}

                        {(editPickerType === 'ACCOUNT' || editPickerType === 'TO_ACCOUNT') &&
                          accounts.map((acc) => {
                            const active =
                              editPickerType === 'TO_ACCOUNT'
                                ? acc.id === editToAccountId
                                : acc.id === editAccountId;
                            return (
                              <Pressable
                                key={acc.id}
                                onPress={() => {
                                  if (editPickerType === 'TO_ACCOUNT') {
                                    setEditToAccountId(acc.id);
                                  } else {
                                    setEditAccountId(acc.id);
                                  }
                                  setEditPickerType('NONE');
                                }}
                                style={[
                                  styles.pickerItemRow,
                                  isDark && { borderBottomColor: themeColors.divider },
                                  active && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.16)' } : styles.pickerItemRowActive),
                                ]}
                              >
                                {renderWalletBadge(acc, 34)}
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text
                                    style={[
                                      styles.pickerItemText,
                                      isDark && { color: themeColors.textPrimary },
                                      active && (isDark ? { color: themeColors.accentGreen } : styles.pickerItemTextActive),
                                    ]}
                                  >
                                    {acc.name}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.pickerItemSub,
                                      isDark && { color: themeColors.textSecondary },
                                    ]}
                                  >
                                    Số dư: {formatVND(acc.balance || 0)} đ
                                  </Text>
                                </View>
                                {active && (
                                  <FinanceIcon
                                    name="check"
                                    size={16}
                                    color={isDark ? themeColors.accentGreen : '#0E964E'}
                                  />
                                )}
                              </Pressable>
                            );
                          })}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>

              {/* ── LỚP PHÓNG TO ẢNH HÓA ĐƠN TOÀN MÀN HÌNH NGAY TRONG MODAL ── */}
              {fullReceiptUri ? (
                <View style={styles.fullReceiptOverlay}>
                  <Pressable
                    style={[styles.fullReceiptCloseBtn, { top: Math.max(insets.top, 20) + 12 }]}
                    onPress={() => setFullReceiptUri(null)}
                    hitSlop={14}
                  >
                    <FinanceIcon name="close" size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={styles.fullReceiptBackdropPress}
                    onPress={() => setFullReceiptUri(null)}
                  >
                    <Image
                      source={{ uri: fullReceiptUri }}
                      style={styles.fullReceiptImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                </View>
              ) : null}
            </KeyboardAvoidingView>
          );
        })()}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
  },
  monthBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  monthBadgeText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
    gap: 12,
  },
  summaryRibbon: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardIncome: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#10B981',
  },
  summaryCardExpense: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#F43F5E',
  },
  summaryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#137333',
  },
  summaryCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  summaryCardValueIncome: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 2,
  },
  summaryCardValueExpense: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#F43F5E',
    marginTop: 2,
  },
  unitSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  netCashflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netCashflowLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  netCashflowValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  netPositive: {
    color: '#059669',
  },
  netNegative: {
    color: '#DC2626',
  },
  filterRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginRight: 6,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  walletFilterDropdownBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
    maxWidth: 145,
  },
  walletFilterDropdownBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  walletFilterBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    flexShrink: 1,
  },
  walletFilterBtnTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  walletFilterDropdownChevron: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 2,
  },
  exportExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 16,
    height: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  exportExcelIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
  },
  exportExcelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  modalTopSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  walletOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 14,
  },
  walletOptionRowActive: {
    backgroundColor: '#F0FDF4',
  },
  walletOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBrandLogoBox: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  walletBrandLogoImg: {
    width: '100%',
    height: '100%',
  },
  walletBrandLogoText: {
    fontWeight: '800',
  },
  walletOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  walletOptionLabelActive: {
    color: '#00A86B',
    fontWeight: '800',
  },
  walletOptionCountText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 2,
  },
  tabButton: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabButtonActive: {
    backgroundColor: '#074838',
    borderColor: '#074838',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  dateGroupContainer: {
    marginTop: 4,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  dateGroupTotal: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayItemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconBoxIncome: {
    backgroundColor: '#E8F8F0',
  },
  txIconBoxExpense: {
    backgroundColor: '#FEE2E2',
  },
  txIconBoxTransfer: {
    backgroundColor: '#E0F2FE',
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCatPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCatPillIncome: {
    backgroundColor: '#E6F4EA',
  },
  txCatPillExpense: {
    backgroundColor: '#FCE8E6',
  },
  txCatPillTransfer: {
    backgroundColor: '#E0F2FE',
  },
  txCatPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  txAccountName: {
    fontSize: 11,
    color: '#64748B',
    flexShrink: 1,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  txTimeText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
  colorIncome: {
    color: '#00A86B',
  },
  colorExpense: {
    color: '#E53E3E',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 54,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 80,
    backgroundColor: '#00A86B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#00A86B',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 9998,
  },
  floatingAddBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  floatingAddIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: -2,
  },
  floatingAddText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 26,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A86B',
  },
  monthOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  monthOptionRowActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  monthOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthOptionLabelActive: {
    color: '#00A86B',
    fontWeight: '800',
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00A86B',
  },
  txRowPressed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  detailTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTopTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailHeroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  detailBigIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailDescriptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 6,
  },
  detailAmountText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  detailTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailTypeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailInfoGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailInfoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '65%',
  },
  detailInfoValueText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  detailCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#008B62',
    fontFamily: 'monospace',
  },
  receiptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  receiptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptZoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  receiptZoomBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#008B62',
  },
  receiptImageWrapper: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  txReceiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  txReceiptBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  fullReceiptOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullReceiptBackdropPress: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullReceiptCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1000,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullReceiptImage: {
    width: '100%',
    height: '84%',
    borderRadius: 16,
  },
  editHeroInputsWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  editAmountInput: {
    width: '90%',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  editFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  editFieldGroup: {
    gap: 6,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  editTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
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
    minHeight: 42,
  },
  modernSelectText: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  pickerCategoryBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  editRowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 13,
  },
  detailEditBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
  },
  detailDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 16,
    paddingVertical: 13,
  },
  detailDeleteBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  detailSecondaryBtn: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 13,
  },
  detailSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  detailPrimarySaveBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#047857',
    borderRadius: 16,
    paddingVertical: 13,
  },
  detailPrimarySaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
