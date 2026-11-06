import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import {
  transactionApi,
  type AccountItem,
  type CategoryItem,
  type TransactionType,
} from '../api/transactionApi';
import { findBankOrWalletPreset } from '../../accounts/constants/banksData';

type Props = {
  onBack: () => void;
  onSaved: () => void;
  onOpenInvoiceScanner?: () => void;
};

// Preset phím tắt cộng tiền nhanh đơn giản
const presets = [
  { label: '+10k', value: 10_000 },
  { label: '+20k', value: 20_000 },
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+200k', value: 200_000 },
  { label: '+500k', value: 500_000 },
];

export function AddTransactionScreen({ onBack, onSaved, onOpenInvoiceScanner }: Props) {
  const insets = useSafeAreaInsets();

  // Tab: Chi tiêu | Thu nhập | Chuyển khoản
  const [type, setType] = useState<TransactionType>('EXPENSE');

  // Backend Data
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isCustomDateTime, setIsCustomDateTime] = useState<boolean>(false);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  });

  // Modal pickers
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [toAccountModalVisible, setToAccountModalVisible] = useState(false);

  // Fetch dữ liệu từ backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [cats, accs] = await Promise.all([
          transactionApi.getCategories(),
          transactionApi.getAccounts(),
        ]);
        if (isMounted) {
          setCategories(cats);
          setAccounts(accs);
          if (accs.length > 0) {
            setSelectedAccountId(accs[0].id);
            if (accs.length > 1) {
              setToAccountId(accs[1].id);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    if (type === 'TRANSFER') return [];
    return categories.filter((c) => c.kind === type);
  }, [categories, type]);

  useEffect(() => {
    if (type === 'TRANSFER') {
      setSelectedCategoryId('');
      return;
    }
    if (filteredCategories.length > 0) {
      const exists = filteredCategories.some((c) => c.id === selectedCategoryId);
      if (!exists) setSelectedCategoryId(filteredCategories[0].id);
    } else {
      setSelectedCategoryId('');
    }
  }, [type, filteredCategories]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId);
  const toAccountObj = accounts.find((a) => a.id === toAccountId);

  const numericAmount = useMemo(() => {
    const clean = amount.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  }, [amount]);

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const handleAmountChange = (text: string) => {
    const raw = text.replace(/\D/g, '');
    setAmount(raw ? formatVND(parseInt(raw, 10)) : '');
  };

  const handleAddPreset = (val: number) => {
    const nextVal = numericAmount + val;
    setAmount(formatVND(nextVal));
  };

  // Submit form
  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Chưa chọn tài khoản', 'Vui lòng chọn tài khoản nguồn.');
      return;
    }
    if (type !== 'TRANSFER' && !selectedCategoryId) {
      Alert.alert('Chưa chọn danh mục', 'Vui lòng chọn danh mục thu chi.');
      return;
    }
    if (type === 'TRANSFER' && (!toAccountId || toAccountId === selectedAccountId)) {
      Alert.alert('Tài khoản nhận không hợp lệ', 'Vui lòng chọn ví nhận khác với ví gửi.');
      return;
    }
    if ((type === 'EXPENSE' || type === 'TRANSFER') && selectedAccountObj) {
      if (numericAmount > selectedAccountObj.balance) {
        Alert.alert(
          'Số dư không đủ',
          `Số dư trong ${selectedAccountObj.name} (${formatVND(selectedAccountObj.balance)} ₫) không đủ để thực hiện.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const now = new Date();

      // Xử lý chuẩn hóa định dạng ngày từ dd/MM/yyyy sang YYYY-MM-DD cho Backend API
      let finalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (isCustomDateTime && date) {
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            // dd/MM/yyyy -> yyyy-MM-dd
            finalDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else if (date.includes('-')) {
          finalDate = date;
        }
      }

      const finalTime = isCustomDateTime
        ? `${time}:00`
        : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const res = await transactionApi.createTransaction({
        transactionType: type,
        accountId: selectedAccountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
        amount: numericAmount,
        currencyCode: selectedAccountObj?.currencyCode || 'VND',
        description: description.trim() || (type === 'INCOME' ? 'Khoản thu' : type === 'TRANSFER' ? 'Chuyển tiền nội bộ' : 'Khoản chi'),
        transactionDate: finalDate,
        transactionTime: finalTime,
        categoryId: type !== 'TRANSFER' ? selectedCategoryId : undefined,
      });

      if (!res.success) {
        Alert.alert('Lỗi tạo giao dịch', res.message || 'Không thể ghi nhận giao dịch.');
        return;
      }

      Alert.alert('Thành công', `Đã lưu ${type === 'EXPENSE' ? 'khoản chi' : type === 'INCOME' ? 'khoản thu' : 'chuyển khoản'} ${formatVND(numericAmount)} ₫`, [
        { text: 'Xong', onPress: onSaved },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── 1. HEADER XANH RỪNG GỌN GÀNG, PHỦ LÊN MÀN HÌNH TAI THỎ ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Thêm giao dịch</Text>
        {onOpenInvoiceScanner ? (
          <Pressable onPress={onOpenInvoiceScanner} hitSlop={10} style={styles.scanBtn}>
            <FinanceIcon name="receipt" size={13} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Quét</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. TAB PHÂN LOẠI 3 NÚT VIÊN THUỐC ĐƠN GIẢN ── */}
        <View style={styles.pillTabGroup}>
          <Pressable
            onPress={() => setType('EXPENSE')}
            style={[styles.pillBtn, type === 'EXPENSE' && styles.pillBtnExpense]}
          >
            <Text style={[styles.pillText, type === 'EXPENSE' && styles.pillTextActive]}>
              Chi tiêu
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setType('INCOME')}
            style={[styles.pillBtn, type === 'INCOME' && styles.pillBtnIncome]}
          >
            <Text style={[styles.pillText, type === 'INCOME' && styles.pillTextActive]}>
              Thu nhập
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setType('TRANSFER')}
            style={[styles.pillBtn, type === 'TRANSFER' && styles.pillBtnTransfer]}
          >
            <Text style={[styles.pillText, type === 'TRANSFER' && styles.pillTextActive]}>
              Chuyển khoản
            </Text>
          </Pressable>
        </View>

        {/* ── 3. KHỐI NHẬP SỐ TIỀN CĂN GIỮA (CENTER ALIGNED) ── */}
        <View style={styles.simpleAmountCard}>
          <Text style={styles.inputSectionLabel}>SỐ TIỀN GIAO DỊCH</Text>
          <View style={styles.centerAmountInputBox}>
            <View style={styles.centerAmountRow}>
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                textAlign="center"
                style={[
                  styles.amountTextInputCenter,
                  type === 'EXPENSE' && { color: '#E11D48' },
                  type === 'INCOME' && { color: '#059669' },
                  type === 'TRANSFER' && { color: '#0284C7' },
                ]}
                autoFocus={true}
              />
              <Text style={styles.currencySuffix}>đ</Text>
            </View>
          </View>

          {/* Dải phím tắt +10k, +20k,... căn giữa */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScrollCenter}
          >
            {presets.map((p) => (
              <Pressable
                key={p.label}
                onPress={() => handleAddPreset(p.value)}
                style={({ pressed }) => [styles.presetItem, pressed && styles.pressed]}
              >
                <Text style={styles.presetItemText}>{p.label}</Text>
              </Pressable>
            ))}
            {numericAmount > 0 && (
              <Pressable onPress={() => setAmount('')} style={styles.presetClearItem}>
                <Text style={styles.presetClearItemText}>Xóa</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* ── 4. CHỌN DANH MỤC THU / CHI: CARD BẤM THẢ DANH SÁCH DỌC ── */}
        {type !== 'TRANSFER' && (
          <View style={styles.formRowSection}>
            <View style={styles.rowLabelBar}>
              <Text style={styles.formRowLabel}>
                Danh mục {type === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}
              </Text>
            </View>

            <Pressable
              onPress={() => setCategoryModalVisible(true)}
              style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}
            >
              <View style={styles.selectLeft}>
                <View
                  style={[
                    styles.selectIconWrap,
                    { backgroundColor: type === 'EXPENSE' ? '#FEE2E2' : '#E8F8F0' },
                  ]}
                >
                  <FinanceIcon
                    name={resolveCategoryIconName(
                      selectedCategoryObj?.icon,
                      type,
                      selectedCategoryObj?.name
                    )}
                    size={18}
                    color={type === 'EXPENSE' ? '#E11D48' : '#059669'}
                  />
                </View>
                <Text style={styles.selectTitle} numberOfLines={1}>
                  {selectedCategoryObj?.name || 'Chọn danh mục'}
                </Text>
              </View>
              <Text style={styles.chevronIcon}>⌄</Text>
            </Pressable>
          </View>
        )}

        {/* ── 5. BỘ CHỌN NGUỒN TIỀN / VÍ KÈM SỐ DƯ TO RÕ RÀNG ── */}
        <View style={styles.formRowSection}>
          <Text style={styles.formRowLabel}>
            {type === 'TRANSFER' ? 'Từ tài khoản (Nguồn)' : 'Tài khoản thanh toán'}
          </Text>

          <Pressable
            onPress={() => setAccountModalVisible(true)}
            style={({ pressed }) => [styles.accountSelectCard, pressed && styles.pressed]}
          >
            <View style={styles.accountCardTop}>
              <View style={styles.selectLeft}>
                {(() => {
                  const preset = findBankOrWalletPreset(selectedAccountObj?.name);
                  if (preset?.logoUrl) {
                    return (
                      <View style={styles.accountBrandLogoWrap}>
                        <Image source={{ uri: preset.logoUrl }} style={styles.brandLogoImg} resizeMode="contain" />
                      </View>
                    );
                  }
                  return (
                    <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                      <FinanceIcon name="wallet" size={20} color="#0284C7" />
                    </View>
                  );
                })()}
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.accountCardName}>
                    {selectedAccountObj?.name || 'Chọn tài khoản'}
                  </Text>
                  <Text style={styles.accountCardType}>
                    {selectedAccountObj?.accountType || 'VÍ / TÀI KHOẢN'}
                  </Text>
                </View>
              </View>
              <Text style={styles.chevronIcon}>⌄</Text>
            </View>

            {/* Khối hiển thị số dư to, đậm và nổi bật */}
            <View style={styles.accountBalanceHeroRow}>
              <Text style={styles.balanceHeroLabel}>Số dư khả dụng:</Text>
              <Text style={styles.balanceHeroValue}>
                {formatVND(selectedAccountObj?.balance || 0)} <Text style={styles.balanceHeroUnit}>₫</Text>
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Nếu TRANSFER: Chọn ví nhận */}
        {type === 'TRANSFER' && (
          <View style={styles.formRowSection}>
            <Text style={styles.formRowLabel}>Đến tài khoản (Đích)</Text>

            <Pressable
              onPress={() => setToAccountModalVisible(true)}
              style={({ pressed }) => [styles.accountSelectCard, pressed && styles.pressed]}
            >
              <View style={styles.accountCardTop}>
                <View style={styles.selectLeft}>
                  {(() => {
                    const preset = findBankOrWalletPreset(toAccountObj?.name);
                    if (preset?.logoUrl) {
                      return (
                        <View style={styles.accountBrandLogoWrap}>
                          <Image source={{ uri: preset.logoUrl }} style={styles.brandLogoImg} resizeMode="contain" />
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.selectIconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <FinanceIcon name="bank" size={20} color="#D97706" />
                      </View>
                    );
                  })()}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.accountCardName}>
                      {toAccountObj?.name || 'Chọn tài khoản nhận'}
                    </Text>
                    <Text style={styles.accountCardType}>
                      {toAccountObj?.accountType || 'VÍ / TÀI KHOẢN'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevronIcon}>⌄</Text>
              </View>

              <View style={styles.accountBalanceHeroRow}>
                <Text style={styles.balanceHeroLabel}>Số dư hiện tại:</Text>
                <Text style={[styles.balanceHeroValue, { color: '#0284C7' }]}>
                  {formatVND(toAccountObj?.balance || 0)} <Text style={styles.balanceHeroUnit}>₫</Text>
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── 6. THỜI GIAN: GIỜ TRƯỚC - NGÀY SAU ── */}
        <View style={styles.formRowSection}>
          <View style={styles.timeSwitchHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formRowLabel}>Thời gian giao dịch</Text>
              <Text style={styles.timeSubLabel}>
                {isCustomDateTime ? 'Đang chỉnh giờ & ngày thủ công' : `Tự động: ${time} hôm nay`}
              </Text>
            </View>
            <Switch
              value={isCustomDateTime}
              onValueChange={setIsCustomDateTime}
              trackColor={{ false: '#CBD5E1', true: '#00A86B' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isCustomDateTime && (
            <View style={styles.timeDateRow}>
              {/* Giờ trước */}
              <View style={styles.timeCol}>
                <Text style={styles.microLabel}>Giờ thực hiện</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:mm"
                  style={styles.timeDateInput}
                />
              </View>

              {/* Ngày sau */}
              <View style={styles.dateCol}>
                <Text style={styles.microLabel}>Ngày giao dịch</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="DD/MM/YYYY"
                  style={styles.timeDateInput}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── 7. GHI CHÚ ── */}
        <View style={styles.formRowSection}>
          <Text style={styles.formRowLabel}>Ghi chú (Tùy chọn)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              type === 'EXPENSE'
                ? 'Ví dụ: Ăn trưa phở bò, Mua quà...'
                : type === 'INCOME'
                ? 'Ví dụ: Lương tháng, Thưởng...'
                : 'Ví dụ: Chuyển tiền tiết kiệm...'
            }
            placeholderTextColor="#94A3B8"
            style={styles.simpleNoteInput}
          />
        </View>

        {/* ── 8. NÚT LƯU GIAO DỊCH ── */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || loading}
          style={({ pressed }) => [
            styles.saveButton,
            type === 'EXPENSE' && styles.saveBtnExpense,
            type === 'INCOME' && styles.saveBtnIncome,
            type === 'TRANSFER' && styles.saveBtnTransfer,
            pressed && styles.pressed,
            (submitting || loading) && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Lưu {type === 'EXPENSE' ? 'khoản chi' : type === 'INCOME' ? 'khoản thu' : 'chuyển khoản'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* ── MODAL CHỌN DANH MỤC THẢ XUỐNG DỌC (VERTICAL LIST) ── */}
      <Modal visible={categoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>
                Chọn danh mục {type === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}
              </Text>
              <Pressable onPress={() => setCategoryModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseLink}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.verticalModalList} showsVerticalScrollIndicator={false}>
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setCategoryModalVisible(false);
                    }}
                    style={[
                      styles.categoryVerticalItem,
                      isSelected && styles.categoryVerticalItemSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.catVerticalIconWrap,
                        { backgroundColor: type === 'EXPENSE' ? '#FEE2E2' : '#E8F8F0' },
                      ]}
                    >
                      <FinanceIcon
                        name={resolveCategoryIconName(cat.icon, type, cat.name)}
                        size={19}
                        color={type === 'EXPENSE' ? '#E11D48' : '#059669'}
                      />
                    </View>
                    <Text style={styles.catVerticalName}>{cat.name}</Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHỌN TÀI KHOẢN NGUỒN (DỌC) ── */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>Chọn tài khoản thanh toán</Text>
              <Pressable onPress={() => setAccountModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseLink}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.verticalModalList} showsVerticalScrollIndicator={false}>
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                const preset = findBankOrWalletPreset(acc.name);
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      setSelectedAccountId(acc.id);
                      setAccountModalVisible(false);
                    }}
                    style={[styles.accountItemRow, isSelected && styles.accountItemRowActive]}
                  >
                    {preset?.logoUrl ? (
                      <View style={styles.modalAccountBrandLogo}>
                        <Image source={{ uri: preset.logoUrl }} style={styles.brandLogoImg} resizeMode="contain" />
                      </View>
                    ) : (
                      <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                        <FinanceIcon name="wallet" size={18} color="#0284C7" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.accName}>{acc.name}</Text>
                      <Text style={styles.accSub}>Số dư: {formatVND(acc.balance)} đ</Text>
                    </View>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHỌN TÀI KHOẢN ĐÍCH (TRANSFER) (DỌC) ── */}
      <Modal visible={toAccountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>Chọn tài khoản nhận tiền</Text>
              <Pressable onPress={() => setToAccountModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseLink}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.verticalModalList} showsVerticalScrollIndicator={false}>
              {accounts
                .filter((a) => a.id !== selectedAccountId)
                .map((acc) => {
                  const isSelected = toAccountId === acc.id;
                  const preset = findBankOrWalletPreset(acc.name);
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setToAccountId(acc.id);
                        setToAccountModalVisible(false);
                      }}
                      style={[styles.accountItemRow, isSelected && styles.accountItemRowActive]}
                    >
                      {preset?.logoUrl ? (
                        <View style={styles.modalAccountBrandLogo}>
                          <Image source={{ uri: preset.logoUrl }} style={styles.brandLogoImg} resizeMode="contain" />
                        </View>
                      ) : (
                        <View style={[styles.selectIconWrap, { backgroundColor: '#FEF3C7' }]}>
                          <FinanceIcon name="bank" size={18} color="#D97706" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.accName}>{acc.name}</Text>
                        <Text style={styles.accSub}>Số dư: {formatVND(acc.balance)} đ</Text>
                      </View>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  pillTabGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  pillBtnExpense: {
    backgroundColor: '#E11D48',
  },
  pillBtnIncome: {
    backgroundColor: '#059669',
  },
  pillBtnTransfer: {
    backgroundColor: '#0284C7',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  simpleAmountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  inputSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  centerAmountInputBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  centerAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountTextInputCenter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 120,
    textAlign: 'center',
    letterSpacing: -0.5,
    padding: 0,
  },
  currencySuffix: {
    fontSize: 24,
    fontWeight: '800',
    color: '#94A3B8',
    marginLeft: 6,
  },
  presetScrollCenter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    justifyContent: 'center',
  },
  presetItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  presetClearItem: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  presetClearItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  formRowSection: {
    gap: 6,
  },
  rowLabelBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  formRowLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  accountBalanceNote: {
    fontSize: 11.5,
    color: '#64748B',
  },
  accountSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountCardType: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  accountBalanceHeroRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  balanceHeroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  balanceHeroValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.3,
  },
  balanceHeroUnit: {
    fontSize: 13,
    fontWeight: '800',
  },
  selectBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  selectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
    flex: 1,
  },
  chevronIcon: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  timeSwitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  timeDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  timeCol: {
    flex: 2,
  },
  dateCol: {
    flex: 3,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    paddingLeft: 2,
  },
  timeDateInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  simpleNoteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: '#0F172A',
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    elevation: 3,
  },
  saveBtnExpense: {
    backgroundColor: '#E11D48',
  },
  saveBtnIncome: {
    backgroundColor: '#059669',
  },
  saveBtnTransfer: {
    backgroundColor: '#0284C7',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
    maxHeight: '75%',
    paddingBottom: 26,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A86B',
  },
  verticalModalList: {
    paddingHorizontal: 16,
  },
  categoryVerticalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryVerticalItemSelected: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  catVerticalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catVerticalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
    flex: 1,
  },
  accountItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accountItemRowActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  accountBrandLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAccountBrandLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
  },
  accName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  accSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
});
