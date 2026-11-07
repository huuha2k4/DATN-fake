import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  accountApi,
  type AccountItem,
  type AccountSummaryResponse,
  type AccountTypeCode,
} from '../api/accountApi';
import {
  POPULAR_BANKS_AND_WALLETS,
  findBankOrWalletPreset,
  type BankOrWalletPreset,
} from '../constants/banksData';

type Props = {
  onBack: () => void;
  onAddTransaction?: () => void;
};

// Loại tài khoản theo danh mục chính giống web
type ModalCategory = 'CASH' | 'BANK_ACCOUNT' | 'E_WALLET' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'SAVINGS' | 'OTHER';

const ACCOUNT_CATEGORIES: Array<{ code: ModalCategory; label: string; icon: string; color: string; bg: string }> = [
  { code: 'CASH', label: 'Tiền mặt', icon: 'wallet', color: '#059669', bg: '#E8F8F0' },
  { code: 'BANK_ACCOUNT', label: 'Tài khoản ngân hàng', icon: 'bank', color: '#0284C7', bg: '#E0F2FE' },
  { code: 'E_WALLET', label: 'Ví điện tử', icon: 'credit-card', color: '#D97706', bg: '#FEF3C7' },
  { code: 'DEBIT_CARD', label: 'Thẻ ghi nợ (ATM)', icon: 'bank', color: '#0891B2', bg: '#ECFEFF' },
  { code: 'CREDIT_CARD', label: 'Thẻ tín dụng', icon: 'credit-card', color: '#E11D48', bg: '#FEE2E2' },
  { code: 'SAVINGS', label: 'Sổ tiết kiệm', icon: 'piggy-bank', color: '#7C3AED', bg: '#F3E8FF' },
  { code: 'OTHER', label: 'Khác', icon: 'wallet', color: '#64748B', bg: '#F1F5F9' },
];

// Tabs lọc chuẩn web
const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả nguồn tiền' },
  { key: 'CASH', label: 'Tiền mặt' },
  { key: 'BANK_ACCOUNT', label: 'Tài khoản ngân hàng' },
  { key: 'E_WALLET', label: 'Ví điện tử' },
  { key: 'DEBIT_CARD', label: 'Thẻ ghi nợ' },
  { key: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
  { key: 'CRYPTO', label: 'Ví mã hóa' },
] as const;

type FilterKey = typeof FILTER_TABS[number]['key'];

export function AccountsScreen({ onBack, onAddTransaction }: Props) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [summaryData, setSummaryData] = useState<AccountSummaryResponse | null>(null);

  // Tab lọc: ALL | CASH | BANK_ACCOUNT | E_WALLET | DEBIT_CARD | CREDIT_CARD | CRYPTO
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  // Modal tạo tài khoản mới
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [modalCategory, setModalCategory] = useState<ModalCategory>('BANK_ACCOUNT');
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);

  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Xem chi tiết ví
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<AccountItem | null>(null);

  // Modal Chỉnh sửa ví
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<AccountItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Modal Xác nhận xóa ví
  const [accountToDelete, setAccountToDelete] = useState<AccountItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Định dạng số có dấu chấm ngăn cách hàng nghìn
  const formatNumberWithDots = (val: string | number) => {
    if (val == null || val === '') return '';
    const cleanStr = String(val).replace(/\D/g, '');
    if (!cleanStr) return '';
    return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Nạp dữ liệu tài khoản
  const loadAccounts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [accs, sum] = await Promise.all([
        accountApi.getAccounts().catch(() => []),
        accountApi.getSummary().catch(() => null),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setSummaryData(sum);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Tính tổng tài sản thực tế và dư nợ (chuẩn web)
  const totalAssets = useMemo(() => {
    if (summaryData?.summary?.totalAssets !== undefined) {
      return summaryData.summary.totalAssets;
    }
    return accounts
      .filter((a) => a.isActive !== false && a.accountType !== 'CREDIT_CARD')
      .reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  }, [accounts, summaryData]);

  const totalLiabilities = useMemo(() => {
    if (summaryData?.summary?.totalLiabilities !== undefined) {
      return summaryData.summary.totalLiabilities;
    }
    return accounts
      .filter((a) => a.isActive !== false && a.accountType === 'CREDIT_CARD')
      .reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  }, [accounts, summaryData]);

  // Lọc tài khoản theo Tab chuẩn Web
  const filteredAccounts = useMemo(() => {
    if (activeFilter === 'ALL') return accounts;
    if (activeFilter === 'DEBIT_CARD') {
      return accounts.filter(
        (a) =>
          a.accountType === 'BANK_ACCOUNT' &&
          (Boolean(a.cardNumberLast4) ||
            a.name.toLowerCase().includes('thẻ ghi nợ') ||
            a.name.toLowerCase().includes('thẻ atm'))
      );
    }
    if (activeFilter === 'BANK_ACCOUNT') {
      return accounts.filter(
        (a) =>
          a.accountType === 'BANK_ACCOUNT' &&
          !a.cardNumberLast4 &&
          !a.name.toLowerCase().includes('thẻ ghi nợ') &&
          !a.name.toLowerCase().includes('thẻ atm')
      );
    }
    return accounts.filter((a) => a.accountType === activeFilter);
  }, [accounts, activeFilter]);

  const getAccountTypeMeta = (type: AccountTypeCode, item?: AccountItem) => {
    switch (type) {
      case 'CASH':
        return { label: 'Tiền mặt', icon: 'wallet', color: '#059669', bg: '#E8F8F0' };
      case 'BANK_ACCOUNT': {
        const isDebit = Boolean(
          item?.cardNumberLast4 ||
            item?.name?.toLowerCase().includes('thẻ ghi nợ') ||
            item?.name?.toLowerCase().includes('thẻ atm')
        );
        if (isDebit) {
          return { label: 'Thẻ ghi nợ', icon: 'bank', color: '#0891B2', bg: '#ECFEFF' };
        }
        return { label: 'Ngân hàng', icon: 'bank', color: '#0284C7', bg: '#E0F2FE' };
      }
      case 'E_WALLET':
        return { label: 'Ví điện tử', icon: 'credit-card', color: '#D97706', bg: '#FEF3C7' };
      case 'CREDIT_CARD':
        return { label: 'Thẻ tín dụng', icon: 'credit-card', color: '#E11D48', bg: '#FEE2E2' };
      case 'SAVINGS':
        return { label: 'Tiết kiệm', icon: 'piggy-bank', color: '#7C3AED', bg: '#F3E8FF' };
      case 'INVESTMENT':
        return { label: 'Đầu tư', icon: 'trending-up', color: '#2563EB', bg: '#DBEAFE' };
      case 'CRYPTO':
        return { label: 'Tiền mã hóa', icon: 'spark', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { label: 'Khác', icon: 'wallet', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  // Mở modal tạo mới
  const handleOpenAddModal = () => {
    setModalCategory('BANK_ACCOUNT');
    setSelectedPreset(null);
    setBankSearchQuery('');
    setIsBankPickerOpen(false);
    setNewAccName('');
    setNewAccBalance('');
    setNewAccountNumber('');
    setCreateModalVisible(true);
  };

  // Khi chọn danh mục thêm mới
  const handleSelectCategory = (cat: ModalCategory) => {
    setModalCategory(cat);
    setSelectedPreset(null);
    setBankSearchQuery('');
    setIsBankPickerOpen(false);

    if (cat === 'CASH') {
      setNewAccName('Tiền mặt');
    } else {
      setNewAccName('');
    }
  };

  // Khi chọn một preset ngân hàng / ví điện tử (có logo)
  const handleSelectPreset = (preset: BankOrWalletPreset) => {
    setSelectedPreset(preset);
    setIsBankPickerOpen(false);
    setBankSearchQuery('');

    let autoName = '';
    if (preset.kind === 'BANK') {
      if (modalCategory === 'DEBIT_CARD') {
        autoName = `Thẻ ghi nợ ${preset.shortName}`;
      } else if (modalCategory === 'CREDIT_CARD') {
        autoName = `Thẻ tín dụng ${preset.shortName}`;
      } else {
        autoName = `Ngân hàng ${preset.shortName}`;
      }
    } else {
      autoName = `Ví ${preset.shortName}`;
    }
    setNewAccName(autoName);
  };

  // Danh sách gợi ý ngân hàng / ví khi tìm kiếm
  const filteredPresets = useMemo(() => {
    const isWallet = modalCategory === 'E_WALLET';
    const targetKind = isWallet ? 'E_WALLET' : 'BANK';
    let list = POPULAR_BANKS_AND_WALLETS.filter((p) => p.kind === targetKind);

    if (bankSearchQuery.trim()) {
      const q = bankSearchQuery.trim().toUpperCase();
      list = list.filter(
        (p) =>
          p.code.toUpperCase().includes(q) ||
          p.shortName.toUpperCase().includes(q) ||
          p.name.toUpperCase().includes(q)
      );
    }
    return list;
  }, [modalCategory, bankSearchQuery]);

  // Xử lý tạo tài khoản gửi Backend
  const handleCreateAccount = async () => {
    if (!newAccName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên ví hoặc chọn ngân hàng');
      return;
    }

    try {
      setSubmitting(true);
      const cleanBalance = newAccBalance ? parseInt(newAccBalance.replace(/\D/g, '') || '0', 10) : 0;

      let backendType: AccountTypeCode = 'BANK_ACCOUNT';
      if (modalCategory === 'CASH') backendType = 'CASH';
      else if (modalCategory === 'E_WALLET') backendType = 'E_WALLET';
      else if (modalCategory === 'CREDIT_CARD') backendType = 'CREDIT_CARD';
      else if (modalCategory === 'SAVINGS') backendType = 'SAVINGS';
      else if (modalCategory === 'OTHER') backendType = 'OTHER';

      await accountApi.createAccount({
        name: newAccName.trim(),
        accountType: backendType,
        initialBalance: cleanBalance,
        currencyCode: 'VND',
      });

      setCreateModalVisible(false);
      loadAccounts();
      Alert.alert('Thành công', `Đã thêm "${newAccName.trim()}" vào danh sách tài khoản!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tạo tài khoản vào lúc này.';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal Sửa ví
  const handleOpenEdit = (acc: AccountItem) => {
    setSelectedAccountForEdit(acc);
    setEditName(acc.name || '');
    setEditBalance(formatNumberWithDots(acc.balance ?? 0));
    setEditAccountNumber(acc.accountNumberMasked || acc.accountNumber || '');
    setEditDescription(acc.description || '');
    setEditIsActive(acc.isActive !== false);
    setIsEditModalOpen(true);
  };

  // Lưu chỉnh sửa ví
  const handleSaveEdit = async () => {
    if (!selectedAccountForEdit) return;
    if (!editName.trim()) {
      Alert.alert('Thông báo', 'Tên ví không được để trống');
      return;
    }

    try {
      setEditSubmitting(true);
      const newCleanBalance = editBalance ? parseInt(editBalance.replace(/\D/g, '') || '0', 10) : 0;
      const isBalanceChanged = Math.abs(newCleanBalance - (selectedAccountForEdit.balance ?? 0)) > 0.001;

      // Cập nhật thông tin cơ bản
      const updatePayload: any = {
        name: editName.trim(),
        description: editDescription.trim(),
        isActive: editIsActive,
      };

      const res = await accountApi.updateAccount(selectedAccountForEdit.id, updatePayload);
      if (!res.success) {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật ví');
        return;
      }

      // Nếu có đổi số dư -> gọi adjustBalance
      if (isBalanceChanged) {
        await accountApi.adjustBalance(selectedAccountForEdit.id, {
          newBalance: newCleanBalance,
          reason: 'Cập nhật lại số dư từ quản lý ví',
          createAdjustmentTransaction: false,
        });
      }

      setIsEditModalOpen(false);
      // Cập nhật lại modal chi tiết nếu đang mở
      if (selectedAccountDetail?.id === selectedAccountForEdit.id) {
        setSelectedAccountDetail({
          ...selectedAccountDetail,
          name: editName.trim(),
          balance: newCleanBalance,
          description: editDescription.trim(),
          isActive: editIsActive,
        });
      }
      setSelectedAccountForEdit(null);
      await loadAccounts();
      Alert.alert('Thành công', 'Đã lưu thông tin ví thành công!');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi lưu ví');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Xử lý Xóa ví
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      setIsDeleting(true);
      const res = await accountApi.deleteAccount(accountToDelete.id);
      if (res.success) {
        Alert.alert('Thành công', `Đã xóa ví "${accountToDelete.name}" thành công!`);
        setAccountToDelete(null);
        setSelectedAccountDetail(null);
        await loadAccounts();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể xóa ví này.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi xóa ví.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* ── 1. HEADER XANH RỪNG SANG TRỌNG PHỦ TRÀN TAI THỎ ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ví & Tài khoản</Text>
        <Pressable onPress={handleOpenAddModal} style={styles.addNavBtn} hitSlop={8}>
          <Text style={styles.addNavBtnText}>+ Thêm ví</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAccounts(true)}
            colors={['#00A86B']}
            tintColor="#00A86B"
          />
        }
      >
        {/* ── 2. HERO CARD TỔNG SỐ DƯ TÀI SẢN ── */}
        <View style={styles.heroTotalCard}>
          <View style={styles.heroTotalTop}>
            <View>
              <Text style={styles.heroTotalLabel}>TỔNG TÀI SẢN KHẢ DỤNG</Text>
              <Text style={styles.heroTotalValue} numberOfLines={1}>
                {formatVND(totalAssets)} <Text style={styles.unitSuffix}>₫</Text>
              </Text>
            </View>
            <View style={styles.heroWalletIconWrap}>
              <FinanceIcon name="wallet" size={26} color="#059669" />
            </View>
          </View>

          {totalLiabilities > 0 && (
            <View style={styles.liabilitiesRow}>
              <Text style={styles.liabilitiesLabel}>Dư nợ thẻ tín dụng:</Text>
              <Text style={styles.liabilitiesValue}>-{formatVND(totalLiabilities)} ₫</Text>
            </View>
          )}

          <View style={styles.heroTotalFooter}>
            <Text style={styles.heroFooterLeft}>
              Đang quản lý{' '}
              <Text style={{ fontWeight: '800', color: '#1E293B' }}>{accounts.length} nguồn tiền</Text>
            </Text>
            <Text style={styles.heroFooterRight}>● Sẵn sàng chi tiêu</Text>
          </View>
        </View>

        {/* ── 3. TABS PHÂN LOẠI NGUỒN TIỀN (CHUẨN WEB: 7 MỤC) ── */}
        <View style={styles.filterTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 4. DANH SÁCH CÁC TÀI KHOẢN / VÍ (ẤN VÀO CARD ĐỂ XEM CHI TIẾT & SỬA / XÓA) ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={styles.loadingText}>Đang nạp danh sách tài khoản...</Text>
          </View>
        ) : filteredAccounts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>Chưa có tài khoản trong mục này</Text>
            <Text style={styles.emptySub}>Nhấn nút "+ Thêm ví" ở góc trên để bổ sung nguồn tiền mới.</Text>
          </View>
        ) : (
          filteredAccounts.map((acc) => {
            const meta = getAccountTypeMeta(acc.accountType, acc);
            const brandPreset = findBankOrWalletPreset(acc.name);
            const isCredit = acc.accountType === 'CREDIT_CARD';

            return (
              <Pressable
                key={acc.id}
                onPress={() => setSelectedAccountDetail(acc)}
                style={({ pressed }) => [
                  styles.accountCard,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  acc.isActive === false && styles.accountCardInactive,
                ]}
              >
                <View style={styles.cardMainRow}>
                  {/* LOGO NGÂN HÀNG / VÍ ĐIỆN TỬ */}
                  {brandPreset?.logoUrl ? (
                    <View style={styles.brandLogoBox}>
                      <Image
                        source={{ uri: brandPreset.logoUrl }}
                        style={styles.brandLogoImg}
                        resizeMode="contain"
                      />
                    </View>
                  ) : brandPreset ? (
                    <View style={[styles.brandLogoBox, { backgroundColor: brandPreset.bgColor }]}>
                      <Text style={[styles.brandLogoFallbackText, { color: brandPreset.textColor }]}>
                        {brandPreset.shortName.slice(0, 3)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.accountTypeIconBox, { backgroundColor: meta.bg }]}>
                      <FinanceIcon name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                  )}

                  {/* Thông tin tên & phân loại */}
                  <View style={styles.cardInfoCol}>
                    <Text style={styles.accName} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <View style={styles.accBadgeRow}>
                      <View style={[styles.badgeTag, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.badgeTagText, { color: meta.color }]}>
                          {brandPreset?.shortName || meta.label}
                        </Text>
                      </View>
                      {acc.accountNumberMasked ? (
                        <Text style={styles.maskedNumText}>• {acc.accountNumberMasked}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Số dư to rõ ràng */}
                  <View style={styles.cardBalanceCol}>
                    <Text style={[styles.cardBalanceValue, isCredit && { color: '#E11D48' }]}>
                      {formatVND(acc.balance)} <Text style={styles.currencySmall}>₫</Text>
                    </Text>
                    <Text style={[styles.cardStatusText, isCredit && { color: '#E11D48' }]}>
                      {isCredit ? 'Dư nợ' : 'Khả dụng'}
                    </Text>
                  </View>
                </View>

                {/* Footer thẻ: Trạng thái & Xem chi tiết */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.statusIndicator}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: acc.isActive !== false ? '#10B981' : '#F43F5E' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: acc.isActive !== false ? '#059669' : '#E11D48' },
                      ]}
                    >
                      {acc.isActive !== false ? 'Đang hoạt động' : 'Tạm tắt'}
                    </Text>
                  </View>

                  <Text style={styles.tapToDetailText}>Xem chi tiết ›</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── 5. MODAL XEM CHI TIẾT VÍ: CÓ NÚT SỬA VÍ & NÚT XÓA VÍ ── */}
      {selectedAccountDetail && (() => {
        const isCredit = selectedAccountDetail.accountType === 'CREDIT_CARD';
        const brandPreset = findBankOrWalletPreset(selectedAccountDetail.name);
        const meta = getAccountTypeMeta(selectedAccountDetail.accountType, selectedAccountDetail);

        return (
          <Modal visible transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.detailSheet}>
                {/* Header chi tiết */}
                <View style={styles.detailHeader}>
                  <View style={styles.detailHeaderLeft}>
                    {brandPreset?.logoUrl ? (
                      <View style={styles.detailLogoWrap}>
                        <Image
                          source={{ uri: brandPreset.logoUrl }}
                          style={styles.brandLogoImg}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={[styles.detailLogoWrap, { backgroundColor: meta.bg }]}>
                        <FinanceIcon name={meta.icon as any} size={24} color={meta.color} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle} numberOfLines={1}>
                        {selectedAccountDetail.name}
                      </Text>
                      <Text style={styles.detailSub}>
                        {selectedAccountDetail.accountNumberMasked
                          ? `STK: ${selectedAccountDetail.accountNumberMasked}`
                          : selectedAccountDetail.phoneNumber || meta.label}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setSelectedAccountDetail(null)}
                    hitSlop={10}
                    style={styles.modalCloseBtn}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </Pressable>
                </View>

                {/* Nội dung thông tin số dư & hạn mức */}
                <View style={styles.detailBody}>
                  <View style={styles.detailCardBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>
                        {isCredit ? 'Dư nợ hiện tại:' : 'Số dư khả dụng:'}
                      </Text>
                      <Text
                        style={[
                          styles.detailRowValueHighlight,
                          isCredit && { color: '#E11D48' },
                        ]}
                      >
                        {formatVND(selectedAccountDetail.balance)} ₫
                      </Text>
                    </View>

                    {isCredit && selectedAccountDetail.creditLimit && selectedAccountDetail.creditLimit > 0 && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailRowLabel}>Hạn mức thẻ:</Text>
                          <Text style={styles.detailRowValue}>
                            {formatVND(selectedAccountDetail.creditLimit)} ₫
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailRowLabel}>Hạn mức còn lại:</Text>
                          <Text style={[styles.detailRowValue, { color: '#059669' }]}>
                            {formatVND(
                              Math.max(0, selectedAccountDetail.creditLimit - selectedAccountDetail.balance)
                            )}{' '}
                            ₫
                          </Text>
                        </View>
                      </>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Phân loại nguồn tiền:</Text>
                      <View style={[styles.badgeTag, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.badgeTagText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>

                    {selectedAccountDetail.description ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Ghi chú:</Text>
                        <Text style={[styles.detailRowValue, { maxWidth: '60%' }]} numberOfLines={2}>
                          {selectedAccountDetail.description}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Trạng thái:</Text>
                      <Text
                        style={{
                          fontWeight: '800',
                          fontSize: 13,
                          color: selectedAccountDetail.isActive !== false ? '#059669' : '#E11D48',
                        }}
                      >
                        {selectedAccountDetail.isActive !== false
                          ? 'Đang hoạt động ✓'
                          : 'Đang tạm tắt'}
                      </Text>
                    </View>
                  </View>

                  {/* Nút hành động ở chân modal: Sửa ví & Xóa ví & Đóng */}
                  <View style={styles.detailActionRow}>
                    <Pressable
                      onPress={() => {
                        const acc = selectedAccountDetail;
                        setSelectedAccountDetail(null);
                        handleOpenEdit(acc);
                      }}
                      style={styles.editActionBtn}
                    >
                      <FinanceIcon name="edit" size={16} color="#074838" />
                      <Text style={styles.editActionBtnText}>Sửa ví</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const acc = selectedAccountDetail;
                        if (!acc) return;
                        Alert.alert(
                          'Xác nhận xóa ví',
                          `Bạn có chắc chắn muốn xóa ví "${acc.name}" không?\nHành động này không thể hoàn tác.`,
                          [
                            { text: 'Hủy', style: 'cancel' },
                            {
                              text: 'Xóa ví',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  setSelectedAccountDetail(null);
                                  const res = await accountApi.deleteAccount(acc.id);
                                  if (res.success) {
                                    Alert.alert('Thành công', `Đã xóa ví "${acc.name}" thành công!`);
                                    await loadAccounts();
                                  } else {
                                    Alert.alert('Lỗi', res.message || 'Không thể xóa ví này.');
                                  }
                                } catch (err: any) {
                                  Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi xóa ví.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      style={styles.deleteActionBtn}
                    >
                      <FinanceIcon name="delete" size={16} color="#DC2626" />
                      <Text style={styles.deleteActionBtnText}>Xóa</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setSelectedAccountDetail(null)}
                      style={styles.closeActionBtn}
                    >
                      <Text style={styles.closeActionBtnText}>Đóng</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* ── 6. MODAL CHỈNH SỬA VÍ (ĐỔI TÊN, SỐ DƯ, BẬT TẮT) ── */}
      {isEditModalOpen && selectedAccountForEdit && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.modalIconWrap, { backgroundColor: '#E0F2FE' }]}>
                    <FinanceIcon name="edit" size={18} color="#0284C7" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Sửa thông tin ví</Text>
                    <Text style={styles.modalSubTitle}>{selectedAccountForEdit.name}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setIsEditModalOpen(false)}
                  hitSlop={10}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Tên ví */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Tên hiển thị ví / tài khoản *</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nhập tên ví..."
                    placeholderTextColor="#94A3B8"
                    style={styles.modalTextInput}
                  />
                </View>

                {/* Số dư hiện tại */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>
                    {selectedAccountForEdit.accountType === 'CREDIT_CARD'
                      ? 'Dư nợ hiện tại (VNĐ) *'
                      : 'Số dư hiện tại (VNĐ) *'}
                  </Text>
                  <TextInput
                    value={editBalance}
                    onChangeText={(t) => setEditBalance(formatNumberWithDots(t))}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={[styles.modalTextInput, { fontSize: 16, fontWeight: '800', color: '#059669' }]}
                  />
                  <Text style={styles.inputHelperText}>
                    Hệ thống sẽ tự động cập nhật số dư mới vào lịch sử ví.
                  </Text>
                </View>

                {/* Ghi chú / Mô tả */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Mô tả / Ghi chú ví</Text>
                  <TextInput
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Ghi chú ví (ví dụ: Ví tiền tiêu vặt, tài khoản nhận lương...)"
                    placeholderTextColor="#94A3B8"
                    style={styles.modalTextInput}
                  />
                </View>

                {/* Trạng thái hoạt động */}
                <View style={styles.switchRowGroup}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Trạng thái hoạt động</Text>
                    <Text style={styles.switchSub}>Bật hoặc tắt ghi nhận giao dịch của ví này</Text>
                  </View>
                  <Switch
                    value={editIsActive}
                    onValueChange={setEditIsActive}
                    trackColor={{ false: '#CBD5E1', true: '#00A86B' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Nút lưu */}
                <View style={styles.editModalButtonsRow}>
                  <Pressable
                    onPress={() => setIsEditModalOpen(false)}
                    style={styles.editCancelBtn}
                  >
                    <Text style={styles.editCancelBtnText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={editSubmitting}
                    style={[styles.editSubmitBtn, editSubmitting && styles.disabled]}
                  >
                    {editSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.editSubmitBtnText}>Lưu thay đổi</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ── 7. MODAL THÊM VÍ / TÀI KHOẢN MỚI CÓ BỘ CHỌN LOGO ── */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <FinanceIcon name="wallet" size={20} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Thêm ví / Nguồn tiền mới</Text>
                  <Text style={styles.modalSubTitle}>Tạo tài khoản quản lý chi tiêu</Text>
                </View>
              </View>
              <Pressable onPress={() => setCreateModalVisible(false)} hitSlop={10} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 1. Chọn loại tài khoản */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Loại tài khoản / ví *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {ACCOUNT_CATEGORIES.map((cat) => {
                    const isSelected = modalCategory === cat.code;
                    return (
                      <Pressable
                        key={cat.code}
                        onPress={() => handleSelectCategory(cat.code)}
                        style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      >
                        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. Bộ chọn Ngân hàng / Ví điện tử có Logo chuẩn web */}
              {(modalCategory === 'BANK_ACCOUNT' ||
                modalCategory === 'DEBIT_CARD' ||
                modalCategory === 'CREDIT_CARD' ||
                modalCategory === 'E_WALLET') && (
                <View style={styles.modalInputGroup}>
                  <View style={styles.presetLabelRow}>
                    <Text style={styles.modalInputLabel}>
                      {modalCategory === 'E_WALLET' ? 'Chọn ví điện tử *' : 'Chọn ngân hàng *'}
                    </Text>
                    {selectedPreset && (
                      <Pressable
                        onPress={() => {
                          setSelectedPreset(null);
                          setIsBankPickerOpen(true);
                        }}
                      >
                        <Text style={styles.changePresetLink}>Đổi ngân hàng/ví</Text>
                      </Pressable>
                    )}
                  </View>

                  {selectedPreset ? (
                    <View style={styles.selectedPresetCard}>
                      <View style={styles.selectedPresetLeft}>
                        <View style={styles.presetLogoSmall}>
                          {selectedPreset.logoUrl ? (
                            <Image
                              source={{ uri: selectedPreset.logoUrl }}
                              style={styles.brandLogoImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={{ fontSize: 11, fontWeight: '800', color: selectedPreset.textColor }}>
                              {selectedPreset.shortName.slice(0, 3)}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.selectedPresetName}>{selectedPreset.shortName}</Text>
                            <View style={styles.codeTag}>
                              <Text style={styles.codeTagText}>{selectedPreset.code}</Text>
                            </View>
                          </View>
                          <Text style={styles.selectedPresetFullName} numberOfLines={1}>
                            {selectedPreset.name}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.searchPresetBox}>
                        <FinanceIcon name="search" size={16} color="#94A3B8" />
                        <TextInput
                          value={bankSearchQuery}
                          onChangeText={(t) => {
                            setBankSearchQuery(t);
                            setIsBankPickerOpen(true);
                          }}
                          onFocus={() => setIsBankPickerOpen(true)}
                          placeholder={
                            modalCategory === 'E_WALLET'
                              ? 'Tìm ví: MoMo, ZaloPay, ShopeePay...'
                              : 'Tìm ngân hàng: VCB, MB, Techcombank...'
                          }
                          placeholderTextColor="#94A3B8"
                          style={styles.searchPresetInput}
                        />
                        {bankSearchQuery ? (
                          <Pressable onPress={() => setBankSearchQuery('')}>
                            <Text style={styles.clearSearchBtn}>✕</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      <View style={styles.presetListWrap}>
                        <Text style={styles.presetListTitle}>Phổ biến nhất:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.popularPresetsRow}
                        >
                          {filteredPresets.slice(0, 8).map((preset) => (
                            <Pressable
                              key={preset.code}
                              onPress={() => handleSelectPreset(preset)}
                              style={styles.popularPresetItem}
                            >
                              <View style={styles.popularPresetLogo}>
                                {preset.logoUrl ? (
                                  <Image
                                    source={{ uri: preset.logoUrl }}
                                    style={styles.brandLogoImg}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: preset.textColor }}>
                                    {preset.shortName.slice(0, 3)}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.popularPresetName} numberOfLines={1}>
                                {preset.shortName}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* 3. Tên ví / tài khoản hiển thị */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Tên tài khoản / ví *</Text>
                <TextInput
                  value={newAccName}
                  onChangeText={setNewAccName}
                  placeholder="Ví dụ: MB Bank, MoMo, Tiền mặt..."
                  placeholderTextColor="#94A3B8"
                  style={styles.modalTextInput}
                />
              </View>

              {/* 4. Số tài khoản (Nếu là Bank/Card) */}
              {(modalCategory === 'BANK_ACCOUNT' ||
                modalCategory === 'DEBIT_CARD' ||
                modalCategory === 'CREDIT_CARD') && (
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Số tài khoản / Số thẻ (Tùy chọn)</Text>
                  <TextInput
                    value={newAccountNumber}
                    onChangeText={setNewAccountNumber}
                    placeholder="Ví dụ: 1903... hoặc 9704..."
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    style={styles.modalTextInput}
                  />
                </View>
              )}

              {/* 5. Số dư ban đầu */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Số dư ban đầu (VNĐ)</Text>
                <TextInput
                  value={newAccBalance ? formatNumberWithDots(newAccBalance) : ''}
                  onChangeText={setNewAccBalance}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={styles.modalTextInput}
                />
              </View>

              {/* Nút lưu */}
              <Pressable
                onPress={handleCreateAccount}
                disabled={submitting}
                style={({ pressed }) => [styles.submitModalBtn, pressed && styles.pressed, submitting && styles.disabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Xác nhận thêm ví</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
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
    backgroundColor: '#074838',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addNavBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroTotalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  heroTotalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  heroTotalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  unitSuffix: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '800',
  },
  heroWalletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liabilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  liabilitiesLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E11D48',
  },
  liabilitiesValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  heroTotalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
    paddingTop: 12,
  },
  heroFooterLeft: {
    fontSize: 12,
    color: '#64748B',
  },
  heroFooterRight: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700',
  },
  filterTabsContainer: {
    marginVertical: 2,
  },
  filterPillsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillActive: {
    backgroundColor: '#074838',
    borderColor: '#074838',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  accountCardInactive: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
  },
  brandLogoFallbackText: {
    fontSize: 12,
    fontWeight: '800',
  },
  accountTypeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  accName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  accBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  maskedNumText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardBalanceCol: {
    alignItems: 'flex-end',
  },
  cardBalanceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  currencySmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  cardStatusText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapToDetailText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '90%',
    paddingBottom: 26,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalBody: {
    padding: 18,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#074838',
    borderColor: '#074838',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  presetLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changePresetLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  selectedPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F8F0',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedPresetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  presetLogoSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPresetName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  codeTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  selectedPresetFullName: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  searchPresetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchPresetInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearSearchBtn: {
    fontSize: 13,
    color: '#94A3B8',
    padding: 4,
  },
  presetListWrap: {
    marginTop: 10,
  },
  presetListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  popularPresetsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  popularPresetItem: {
    alignItems: 'center',
    width: 66,
  },
  popularPresetLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 4,
  },
  popularPresetName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
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
  },
  inputHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  switchRowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  editModalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  editCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  editSubmitBtn: {
    flex: 2,
    backgroundColor: '#074838',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  editSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  submitModalBtn: {
    backgroundColor: '#00A86B',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00A86B',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
  /* ── CHI TIẾT VÍ MODAL ── */
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 26,
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  detailLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  detailBody: {
    padding: 20,
    gap: 16,
  },
  detailCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  detailRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailRowValueHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  editActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F8F0',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#074838',
  },
  deleteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  closeActionBtn: {
    flex: 1,
    backgroundColor: '#074838',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* ── MODAL XÁC NHẬN XÓA ── */
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  deleteIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  confirmModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
