import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  FileText,
  LayoutGrid,
  ScanText,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react-native';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import {
  transactionApi,
  type AccountItem,
  type CategoryItem,
  type TransactionType,
} from '../api/transactionApi';
import { findBankOrWalletPreset } from '../../accounts/constants/banksData';

// 6 Bộ hình nền sóng 3D và minh họa 3D cho 3 tab: Chi tiêu, Thu nhập, Chuyển khoản
const BG_EXPENSE_WAVE = require('../assets/bg-expense-wave.jpg');
const BG_INCOME_WAVE = require('../assets/bg-income-wave.jpg');
const BG_TRANSFER_WAVE = require('../assets/bg-transfer-wave.jpg');

const HERO_EXPENSE_3D = require('../assets/hero-expense-3d.png');
const HERO_INCOME_3D = require('../assets/hero-income-3d.png');
const HERO_TRANSFER_3D = require('../assets/hero-transfer-3d.png');

type Props = {
  onBack: () => void;
  onSaved: () => void;
  onOpenInvoiceScanner?: () => void;
};

// Preset phím tắt cộng tiền nhanh đúng mẫu thiết kế (+10k, +20k, +50k, +100k, +200k)
const presets = [
  { label: '+10k', value: 10_000 },
  { label: '+20k', value: 20_000 },
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+200k', value: 200_000 },
];

export function AddTransactionScreen({ onBack, onSaved, onOpenInvoiceScanner }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(300, screenWidth - 32);
  const amountInputRef = useRef<TextInput>(null);

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
      if (!exists) {
        // Ưu tiên chọn "Ăn uống" cho Chi tiêu, "Lương" cho Thu nhập nếu có
        const preferred = filteredCategories.find((c) =>
          type === 'EXPENSE'
            ? c.name.toLowerCase().includes('ăn uống')
            : c.name.toLowerCase().includes('lương')
        );
        setSelectedCategoryId((preferred || filteredCategories[0]).id);
      }
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

      let finalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (isCustomDateTime && date) {
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
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
        description:
          description.trim() ||
          (type === 'INCOME' ? 'Khoản thu' : type === 'TRANSFER' ? 'Chuyển tiền nội bộ' : 'Khoản chi'),
        transactionDate: finalDate,
        transactionTime: finalTime,
        categoryId: type !== 'TRANSFER' ? selectedCategoryId : undefined,
      });

      if (!res.success) {
        Alert.alert('Lỗi tạo giao dịch', res.message || 'Không thể ghi nhận giao dịch.');
        return;
      }

      Alert.alert(
        'Thành công',
        `Đã lưu ${type === 'EXPENSE' ? 'khoản chi' : type === 'INCOME' ? 'khoản thu' : 'chuyển khoản'} ${formatVND(numericAmount)} ₫`,
        [{ text: 'Xong', onPress: onSaved }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  // Màu sắc & hình ảnh theo từng Tab (Chi tiêu: Đỏ hồng | Thu nhập: Xanh lá | Chuyển khoản: Xanh dương)
  const themeByTab = useMemo(() => {
    if (type === 'INCOME') {
      return {
        bgWave: BG_INCOME_WAVE,
        hero3D: HERO_INCOME_3D,
        primaryColor: '#0A683B',
        presetTextColor: '#0A683B',
        cursorColor: '#22C55E',
        catIconBg: '#DCFCE7',
        catIconColor: '#15803D',
        defaultCatName: 'Lương',
        defaultCatIcon: 'gift',
        saveLabel: 'Lưu khoản thu',
      };
    }
    if (type === 'TRANSFER') {
      return {
        bgWave: BG_TRANSFER_WAVE,
        hero3D: HERO_TRANSFER_3D,
        primaryColor: '#0360B6',
        presetTextColor: '#0360B6',
        cursorColor: '#38BDF8',
        catIconBg: '#DBEAFE',
        catIconColor: '#0284C7',
        defaultCatName: '',
        defaultCatIcon: 'arrows',
        saveLabel: 'Lưu chuyển khoản',
      };
    }
    return {
      bgWave: BG_EXPENSE_WAVE,
      hero3D: HERO_EXPENSE_3D,
      primaryColor: '#D80B2B',
      presetTextColor: '#B91C1C',
      cursorColor: '#22C55E',
      catIconBg: '#FEE2E2',
      catIconColor: '#E11D48',
      defaultCatName: 'Ăn uống',
      defaultCatIcon: 'utensils',
      saveLabel: 'Lưu khoản chi',
    };
  }, [type]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dải sóng trang trí mờ ở đáy màn hình đúng theo ảnh mẫu */}
      <Image
        source={themeByTab.bgWave}
        style={styles.bottomWaveDecor}
        resizeMode="cover"
      />

      {/* ── 1. HEADER SÁNG TRẮNG GỌN GÀNG: ← Thêm giao dịch | [Quét] ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 4 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={25} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <Text style={styles.headerTitle}>Thêm giao dịch</Text>

        {onOpenInvoiceScanner ? (
          <Pressable
            onPress={onOpenInvoiceScanner}
            hitSlop={10}
            style={({ pressed }) => [styles.scanBtn, pressed && styles.pressed]}
          >
            <ScanText size={20} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.scanBtnText}>Quét</Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. THANH 3 TAB VIÊN THUỐC KÈM ICON: Chi tiêu | Thu nhập | Chuyển khoản ── */}
        <View style={styles.pillTabGroup}>
          <Pressable
            onPress={() => setType('EXPENSE')}
            style={[styles.pillBtn, type === 'EXPENSE' && styles.pillBtnExpense]}
          >
            <ShoppingCart
              size={18}
              color={type === 'EXPENSE' ? '#FFFFFF' : '#475569'}
              strokeWidth={2.4}
            />
            <Text style={[styles.pillText, type === 'EXPENSE' && styles.pillTextActive]}>
              Chi tiêu
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setType('INCOME')}
            style={[styles.pillBtn, type === 'INCOME' && styles.pillBtnIncome]}
          >
            <BarChart3
              size={18}
              color={type === 'INCOME' ? '#FFFFFF' : '#475569'}
              strokeWidth={2.4}
            />
            <Text style={[styles.pillText, type === 'INCOME' && styles.pillTextActive]}>
              Thu nhập
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setType('TRANSFER')}
            style={[styles.pillBtn, type === 'TRANSFER' && styles.pillBtnTransfer]}
          >
            <ArrowLeftRight
              size={18}
              color={type === 'TRANSFER' ? '#FFFFFF' : '#475569'}
              strokeWidth={2.4}
            />
            <Text style={[styles.pillText, type === 'TRANSFER' && styles.pillTextActive]}>
              Chuyển khoản
            </Text>
          </Pressable>
        </View>

        {/* ── 3. THẺ HERO SỐ TIỀN GIAO DỊCH NỀN SÓNG 3D + HÌNH MINH HỌA 3D ── */}
        <Pressable
          onPress={() => amountInputRef.current?.focus()}
          style={[
            styles.heroAmountCardOuter,
            { width: cardWidth, backgroundColor: themeByTab.primaryColor },
          ]}
        >
          {/* Ảnh nền sóng 3D cố định chiều cao vừa đúng khung thẻ 168px */}
          <Image
            source={themeByTab.bgWave}
            style={[styles.heroWaveAbsoluteImg, { width: cardWidth, height: 168 }]}
            resizeMode="cover"
          />

          <View style={styles.heroInnerContent}>
            <View style={styles.heroTopContent}>
              {/* Cột trái: SỐ TIỀN GIAO DỊCH & Ô nhập số tiền lớn (tự co cỡ chữ khi nhập số dài) */}
              <View style={styles.heroLeftCol}>
                <Text style={styles.heroLabel}>SỐ TIỀN GIAO DỊCH</Text>

                {(() => {
                  const len = (amount || '0').length;
                  const dynamicFontSize =
                    len > 13 ? 22 : len > 11 ? 26 : len > 9 ? 30 : len > 7 ? 34 : 38;
                  const dynamicCurrencySize = Math.round(dynamicFontSize * 0.82);

                  return (
                    <View style={styles.heroAmountInputRow}>
                      <TextInput
                        ref={amountInputRef}
                        value={amount}
                        onChangeText={handleAmountChange}
                        placeholder="0"
                        placeholderTextColor="rgba(255, 255, 255, 0.92)"
                        keyboardType="numeric"
                        selectionColor="#FFFFFF"
                        style={[
                          styles.heroAmountInput,
                          { fontSize: dynamicFontSize },
                        ]}
                      />
                      <Text
                        style={[
                          styles.heroCurrencyUnit,
                          { fontSize: dynamicCurrencySize },
                        ]}
                      >
                        đ
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Cột phải: Hình 3D minh họa theo tab */}
              <Image
                source={themeByTab.hero3D}
                style={[
                  styles.hero3DIllustration,
                  type === 'TRANSFER' && styles.hero3DTransferSize,
                ]}
                resizeMode="contain"
              />
            </View>

            {/* Hàng nút cộng tiền nhanh (+10k, +20k, +50k, +100k, +200k) */}
            <View style={styles.presetPillsRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.label}
                  onPress={() => handleAddPreset(p.value)}
                  style={({ pressed }) => [styles.presetWhitePill, pressed && styles.pressed]}
                >
                  <Text style={[styles.presetWhitePillText, { color: themeByTab.presetTextColor }]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>

        {/* ── 4. CHỌN DANH MỤC CHI TIÊU / THU NHẬP ── */}
        {type !== 'TRANSFER' && (
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              {type === 'EXPENSE' ? (
                <View style={styles.sectionBadgeRed}>
                  <LayoutGrid size={14} color="#E11D48" strokeWidth={2.5} />
                </View>
              ) : (
                <View style={styles.sectionBadgeGreen}>
                  <Wallet size={14} color="#059669" strokeWidth={2.5} />
                </View>
              )}
              <Text style={styles.sectionHeaderText}>
                {type === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}
              </Text>
            </View>

            <Pressable
              onPress={() => setCategoryModalVisible(true)}
              style={({ pressed }) => [styles.selectCard, pressed && styles.pressed]}
            >
              <View style={styles.selectCardLeft}>
                <View
                  style={[
                    styles.categoryIconCircle,
                    { backgroundColor: themeByTab.catIconBg },
                  ]}
                >
                  <FinanceIcon
                    name={resolveCategoryIconName(
                      selectedCategoryObj?.icon || themeByTab.defaultCatIcon,
                      type,
                      selectedCategoryObj?.name || themeByTab.defaultCatName
                    )}
                    size={22}
                    color={themeByTab.catIconColor}
                  />
                </View>
                <Text style={styles.selectCardTitle} numberOfLines={1}>
                  {selectedCategoryObj?.name || themeByTab.defaultCatName}
                </Text>
              </View>
              <ChevronDown size={21} color="#334155" strokeWidth={2.4} />
            </Pressable>
          </View>
        )}

        {/* ── 5. TÀI KHOẢN THANH TOÁN / TỪ TÀI KHOẢN (NGUỒN) ── */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            {type === 'EXPENSE' ? (
              <View style={styles.sectionBadgeRedSolid}>
                <Wallet size={13} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            ) : type === 'INCOME' ? (
              <View style={styles.sectionBadgeGreenSolid}>
                <Text style={styles.sectionBadgeSymbol}>+</Text>
              </View>
            ) : (
              <View style={styles.sectionBadgeBlueSolid}>
                <Text style={styles.sectionBadgeSymbol}>→</Text>
              </View>
            )}
            <Text style={styles.sectionHeaderText}>
              {type === 'TRANSFER' ? 'Từ tài khoản (Nguồn)' : 'Tài khoản thanh toán'}
            </Text>
          </View>

          <Pressable
            onPress={() => setAccountModalVisible(true)}
            style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}
          >
            <View style={styles.accountCardTop}>
              <View style={styles.selectCardLeft}>
                {(() => {
                  const preset = findBankOrWalletPreset(selectedAccountObj?.name);
                  if (preset?.logoUrl) {
                    return (
                      <View style={styles.accountLogoBox}>
                        <Image
                          source={{ uri: preset.logoUrl }}
                          style={styles.brandLogoImg}
                          resizeMode="contain"
                        />
                      </View>
                    );
                  }
                  return (
                    <View style={styles.cashWalletIconBox}>
                      <Wallet size={23} color="#0284C7" strokeWidth={2.2} />
                    </View>
                  );
                })()}
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.accountNameText}>
                    {selectedAccountObj?.name || 'Tiền mặt'}
                  </Text>
                  <Text style={styles.accountTypeSub}>
                    {selectedAccountObj?.accountType || 'CASH'}
                  </Text>
                </View>
              </View>
              <ChevronDown size={21} color="#334155" strokeWidth={2.4} />
            </View>

            {/* Dải hiển thị số dư khả dụng màu xanh mint nhạt */}
            <View style={styles.balanceStrip}>
              <Text style={styles.balanceStripLabel}>Số dư khả dụng:</Text>
              <Text style={styles.balanceStripValue}>
                {formatVND(selectedAccountObj?.balance ?? 8362520)}
                <Text style={styles.balanceStripCurrency}>₫</Text>
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── 5B. ĐẾN TÀI KHOẢN (ĐÍCH) KHI CHUYỂN KHOẢN ── */}
        {type === 'TRANSFER' && (
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadgeTealSolid}>
                <Wallet size={13} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.sectionHeaderText}>Đến tài khoản (Đích)</Text>
            </View>

            <Pressable
              onPress={() => setToAccountModalVisible(true)}
              style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}
            >
              <View style={styles.accountCardTop}>
                <View style={styles.selectCardLeft}>
                  {(() => {
                    const preset = findBankOrWalletPreset(
                      toAccountObj?.name || 'Vietcombank'
                    );
                    if (preset?.logoUrl) {
                      return (
                        <View style={styles.accountLogoBox}>
                          <Image
                            source={{ uri: preset.logoUrl }}
                            style={styles.brandLogoImg}
                            resizeMode="contain"
                          />
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.cashWalletIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <FinanceIcon name="bank" size={23} color="#15803D" />
                      </View>
                    );
                  })()}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.accountNameText}>
                      {toAccountObj?.name || 'Ngân hàng Vietcombank'}
                    </Text>
                    <Text style={styles.accountTypeSub}>
                      {toAccountObj?.accountType || 'BANK_ACCOUNT'}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={21} color="#334155" strokeWidth={2.4} />
              </View>

              <View style={styles.balanceStrip}>
                <Text style={styles.balanceStripLabel}>Số dư hiện tại:</Text>
                <Text style={styles.balanceStripValue}>
                  {formatVND(toAccountObj?.balance ?? 8494713)}
                  <Text style={styles.balanceStripCurrency}>₫</Text>
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── 6. THỜI GIAN GIAO DỊCH ── */}
        <View style={styles.formSection}>
          <View style={styles.timeCard}>
            <View style={styles.timeCardLeft}>
              <View style={styles.calendarIconBox}>
                <Calendar size={22} color="#15803D" strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeTitleText}>Thời gian giao dịch</Text>
                <Text style={styles.timeSubText}>
                  {isCustomDateTime
                    ? `Thủ công: ${time} · ${date}`
                    : `Tự động: ${time} hôm nay`}
                </Text>
              </View>
            </View>

            <Switch
              value={isCustomDateTime}
              onValueChange={setIsCustomDateTime}
              trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isCustomDateTime && (
            <View style={styles.timeDateInputsRow}>
              <View style={styles.timeCol}>
                <Text style={styles.microLabel}>Giờ thực hiện</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:mm"
                  style={styles.timeDateInput}
                />
              </View>
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

        {/* ── 7. GHI CHÚ (TÙY CHỌN) ── */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Clock size={17} color="#15803D" strokeWidth={2.4} />
            <Text style={styles.sectionHeaderText}>Ghi chú (Tùy chọn)</Text>
          </View>

          <View style={styles.noteInputContainer}>
            <View style={styles.noteDocIconBox}>
              <FileText size={20} color="#15803D" strokeWidth={2.3} />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={
                type === 'EXPENSE'
                  ? 'Ví dụ: Ăn trưa, mua đồ...'
                  : type === 'INCOME'
                  ? 'Ví dụ: Lương tháng, thưởng...'
                  : 'Ví dụ: Chuyển tiền tiết kiệm...'
              }
              placeholderTextColor="#64748B"
              style={styles.noteTextInput}
            />
          </View>
        </View>

        {/* ── 8. NÚT LƯU GIAO DỊCH THEO MÀU TAB ── */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || loading}
          style={({ pressed }) => [
            styles.savePillButton,
            { backgroundColor: themeByTab.primaryColor },
            pressed && styles.pressed,
            (submitting || loading) && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Check size={22} color="#FFFFFF" strokeWidth={2.8} />
              <Text style={styles.savePillButtonText}>{themeByTab.saveLabel}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* ── MODAL CHỌN DANH MỤC ── */}
      <Modal visible={categoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>
                Chọn danh mục {type === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}
              </Text>
              <Pressable onPress={() => setCategoryModalVisible(false)} hitSlop={10}>
                <X size={20} color="#64748B" />
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
                        { backgroundColor: type === 'EXPENSE' ? '#FEE2E2' : '#DCFCE7' },
                      ]}
                    >
                      <FinanceIcon
                        name={resolveCategoryIconName(cat.icon, type, cat.name)}
                        size={19}
                        color={type === 'EXPENSE' ? '#E11D48' : '#15803D'}
                      />
                    </View>
                    <Text style={styles.catVerticalName}>{cat.name}</Text>
                    {isSelected && <Check size={18} color="#15803D" strokeWidth={2.8} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHỌN TÀI KHOẢN NGUỒN ── */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>Chọn tài khoản thanh toán</Text>
              <Pressable onPress={() => setAccountModalVisible(false)} hitSlop={10}>
                <X size={20} color="#64748B" />
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
                      if (type === 'TRANSFER' && toAccountId === acc.id) {
                        const another = accounts.find((a) => a.id !== acc.id);
                        if (another) setToAccountId(another.id);
                      }
                      setAccountModalVisible(false);
                    }}
                    style={[styles.accountItemRow, isSelected && styles.accountItemRowActive]}
                  >
                    {preset?.logoUrl ? (
                      <View style={styles.modalAccountBrandLogo}>
                        <Image
                          source={{ uri: preset.logoUrl }}
                          style={styles.brandLogoImg}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <View style={[styles.cashWalletIconBox, { width: 38, height: 38 }]}>
                        <Wallet size={18} color="#0284C7" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.accName}>{acc.name}</Text>
                      <Text style={styles.accSub}>Số dư: {formatVND(acc.balance)} ₫</Text>
                    </View>
                    {isSelected && <Check size={18} color="#15803D" strokeWidth={2.8} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHỌN TÀI KHOẢN ĐÍCH (TRANSFER) ── */}
      <Modal visible={toAccountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalSheetTitle}>Chọn tài khoản nhận tiền</Text>
              <Pressable onPress={() => setToAccountModalVisible(false)} hitSlop={10}>
                <X size={20} color="#64748B" />
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
                          <Image
                            source={{ uri: preset.logoUrl }}
                            style={styles.brandLogoImg}
                            resizeMode="contain"
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.cashWalletIconBox,
                            { width: 38, height: 38, backgroundColor: '#DCFCE7' },
                          ]}
                        >
                          <FinanceIcon name="bank" size={18} color="#15803D" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.accName}>{acc.name}</Text>
                        <Text style={styles.accSub}>Số dư: {formatVND(acc.balance)} ₫</Text>
                      </View>
                      {isSelected && <Check size={18} color="#15803D" strokeWidth={2.8} />}
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
    backgroundColor: '#F6F8FA',
    position: 'relative',
  },
  bottomWaveDecor: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
    height: 90,
    width: '100%',
    opacity: 0.22,
  },

  /* ── 1. HEADER SÁNG TRẮNG ── */
  header: {
    backgroundColor: '#F6F8FA',
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#137A4B',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 999,
    shadowColor: '#065F46',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 13,
  },

  /* ── 2. THANH 3 TAB VIÊN THUỐC ── */
  pillTabGroup: {
    flexDirection: 'row',
    backgroundColor: '#EAEFF5',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9.5,
    borderRadius: 999,
  },
  pillBtnExpense: {
    backgroundColor: '#D80B2B',
    shadowColor: '#D80B2B',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillBtnIncome: {
    backgroundColor: '#0A683B',
    shadowColor: '#0A683B',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillBtnTransfer: {
    backgroundColor: '#0360B6',
    shadowColor: '#0360B6',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* ── 3. THẺ HERO SỐ TIỀN GIAO DỊCH NỀN SÓNG 3D ── */
  heroAmountCardOuter: {
    height: 168,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  heroWaveAbsoluteImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 22,
  },
  heroInnerContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 13,
  },
  heroTopContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 96,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 8,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroAmountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  heroAmountInput: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
    minWidth: 24,
    flexShrink: 1,
    letterSpacing: -0.5,
  },
  heroCurrencyUnit: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 5,
    textDecorationLine: 'underline',
  },
  hero3DIllustration: {
    width: 146,
    height: 118,
    marginRight: -6,
    marginTop: -6,
  },
  hero3DTransferSize: {
    width: 154,
    height: 114,
  },
  presetPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 10,
  },
  presetWhitePill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 6.5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  presetWhitePillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── 4 & 5. CÁC MỤC CHỌN TRONG FORM ── */
  formSection: {
    gap: 7,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionBadgeRed: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeRedSolid: {
    width: 21,
    height: 21,
    borderRadius: 7,
    backgroundColor: '#D80B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeGreenSolid: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeBlueSolid: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#0360B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeTealSolid: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeSymbol: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },

  selectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  selectCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 12,
    flex: 1,
  },

  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 10,
  },
  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashWalletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountTypeSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  balanceStrip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceStripLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  balanceStripValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: -0.2,
  },
  balanceStripCurrency: {
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  /* ── 6. THỜI GIAN GIAO DỊCH ── */
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  timeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 11,
  },
  calendarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1.5,
  },
  timeDateInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
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

  /* ── 7. GHI CHÚ (TÙY CHỌN) ── */
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  noteDocIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 4,
  },

  /* ── 8. NÚT LƯU VIÊN THUỐC ── */
  savePillButton: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  savePillButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  /* ── MODALS ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
  verticalModalList: {
    paddingHorizontal: 16,
  },
  categoryVerticalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    borderRadius: 19,
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
  modalAccountBrandLogo: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.18 }],
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
});
