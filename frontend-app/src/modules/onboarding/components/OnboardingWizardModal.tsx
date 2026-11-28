import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../context/ThemeContext';
import { accountApi, AccountTypeCode } from '../../accounts/api/accountApi';
import { POPULAR_BANKS_AND_WALLETS, BankOrWalletPreset } from '../../accounts/constants/banksData';

interface OnboardingWizardModalProps {
  visible: boolean;
  onFinish: () => void;
  userName?: string;
}

interface FinancialGoal {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

const FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: 'expense_tracking',
    title: 'Kiểm soát chi tiêu hàng ngày',
    desc: 'Biết rõ tiền đi đâu mỗi ngày, không lo thâm hụt ví',
    icon: '📊',
  },
  {
    id: 'savings',
    title: 'Tích lũy & Tiết kiệm',
    desc: 'Đạt các mục tiêu tài chính ngắn và dài hạn nhanh hơn',
    icon: '🎯',
  },
  {
    id: 'group_family',
    title: 'Quản lý quỹ nhóm & Gia đình',
    desc: 'Chia tiền sòng phẳng, quản lý ví trẻ em và gia đình',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'debt_management',
    title: 'Theo dõi vay nợ & Dòng tiền',
    desc: 'Ghi nhớ các khoản vay, cho mượn và nhắc nợ tự động',
    icon: '🤝',
  },
];

const ACCOUNT_TYPES: { type: AccountTypeCode; label: string; icon: string; defaultName: string }[] = [
  { type: 'CASH', label: 'Tiền mặt', icon: '💵', defaultName: 'Tiền mặt ví' },
  { type: 'BANK_ACCOUNT', label: 'Ngân hàng', icon: '🏦', defaultName: 'Tài khoản ngân hàng' },
  { type: 'E_WALLET', label: 'Ví điện tử', icon: '📱', defaultName: 'Ví điện tử' },
];

export function OnboardingWizardModal({
  visible,
  onFinish,
  userName,
}: OnboardingWizardModalProps) {
  const { isDark, colors: themeColors } = useAppTheme();
  const [step, setStep] = useState<number>(1);

  // Step 1: Goal
  const [selectedGoal, setSelectedGoal] = useState<string>('expense_tracking');

  // Step 2: First Wallet
  const [walletType, setWalletType] = useState<AccountTypeCode>('CASH');
  const [walletName, setWalletName] = useState<string>('Tiền mặt ví');
  const [initialBalance, setInitialBalance] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [searchPreset, setSearchPreset] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Step 3: Monthly spending estimate
  const [spendingLimit, setSpendingLimit] = useState<string>('5000000');

  const formatWithDots = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('vi-VN');
  };

  const formatCurrency = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const filteredPresets = POPULAR_BANKS_AND_WALLETS.filter((item) => {
    if (walletType === 'BANK_ACCOUNT' && item.kind !== 'BANK') return false;
    if (walletType === 'E_WALLET' && item.kind !== 'E_WALLET') return false;
    if (!searchPreset.trim()) return true;
    const q = searchPreset.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.shortName.toLowerCase().includes(q);
  });

  const handleSelectPreset = (preset: BankOrWalletPreset) => {
    setSelectedPreset(preset);
    if (walletType === 'BANK_ACCOUNT') {
      setWalletName(`Ngân hàng ${preset.shortName}`);
    } else {
      setWalletName(`Ví ${preset.shortName}`);
    }
  };

  const handleNextStep = async () => {
    setErrorMsg('');
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!walletName.trim()) {
        setErrorMsg('Vui lòng nhập tên ví của bạn');
        return;
      }
      setIsSubmitting(true);
      const balanceNum = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
      try {
        const res = await accountApi.createAccount({
          name: walletName.trim(),
          accountType: walletType,
          initialBalance: balanceNum,
          currencyCode: 'VND',
          description: selectedPreset ? `${selectedPreset.name} khởi tạo qua Onboarding` : 'Ví ban đầu được khởi tạo qua trình hướng dẫn Finora',
        });
        if (res.success) {
          setStep(3);
        } else {
          setErrorMsg(res.message || 'Không thể tạo ví, vui lòng thử lại');
        }
      } catch {
        setErrorMsg('Lỗi kết nối khi tạo ví. Bạn có thể nhấn Bỏ qua.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.backdropTouch} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
          ]}
        >
          {/* Header Progress */}
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor:
                        s <= step
                          ? themeColors.primary || '#10B981'
                          : isDark
                          ? '#374151'
                          : '#E5E7EB',
                    },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Bỏ qua
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* STEP 1: CHỌN MỤC TIÊU */}
            {step === 1 && (
              <View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>✨ Chào mừng đến với Finora</Text>
                </View>
                <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  {userName ? `Xin chào ${userName}!` : 'Chào mừng bạn!'}
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                  Mục tiêu tài chính ưu tiên nhất của bạn trong giai đoạn này là gì? Finora sẽ tối ưu giao diện theo nhu cầu của bạn.
                </Text>

                <View style={styles.goalList}>
                  {FINANCIAL_GOALS.map((goal) => {
                    const isSelected = selectedGoal === goal.id;
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedGoal(goal.id)}
                        style={[
                          styles.goalCard,
                          {
                            borderColor: isSelected
                              ? '#10B981'
                              : isDark
                              ? '#374151'
                              : '#E5E7EB',
                            backgroundColor: isSelected
                              ? isDark
                                ? '#064E3B33'
                                : '#ECFDF5'
                              : isDark
                              ? '#1F2937'
                              : '#F9FAFB',
                          },
                        ]}
                      >
                        <Text style={styles.goalIcon}>{goal.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.goalTitle,
                              {
                                color: isSelected
                                  ? '#10B981'
                                  : isDark
                                  ? '#F9FAFB'
                                  : '#111827',
                              },
                            ]}
                          >
                            {goal.title}
                          </Text>
                          <Text
                            style={[
                              styles.goalDesc,
                              { color: isDark ? '#9CA3AF' : '#6B7280' },
                            ]}
                          >
                            {goal.desc}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkedCircle}>
                            <Text style={styles.checkIcon}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 2: THIẾT LẬP VÍ ĐẦU TIÊN */}
            {step === 2 && (
              <View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>💳 Bước 2/4 · Nguồn tiền của bạn</Text>
                </View>
                <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  Tạo ví tiền đầu tiên
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                  Để bắt đầu ghi chép chi tiêu, Finora cần ít nhất một ví tiền. Bạn có thể thêm nhiều tài khoản khác sau.
                </Text>

                {/* Chọn loại ví */}
                <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                  Loại tài khoản / ví
                </Text>
                <View style={styles.typeRow}>
                  {ACCOUNT_TYPES.map((t) => {
                    const isSelected = walletType === t.type;
                    return (
                      <TouchableOpacity
                        key={t.type}
                        onPress={() => {
                          setWalletType(t.type);
                          setSelectedPreset(null);
                          setSearchPreset('');
                          if (t.type === 'CASH') {
                            setWalletName('Tiền mặt ví');
                          } else if (t.type === 'BANK_ACCOUNT') {
                            setWalletName('Tài khoản ngân hàng');
                          } else {
                            setWalletName('Ví điện tử');
                          }
                        }}
                        style={[
                          styles.typeButton,
                          {
                            borderColor: isSelected ? '#10B981' : isDark ? '#374151' : '#E5E7EB',
                            backgroundColor: isSelected ? (isDark ? '#064E3B44' : '#ECFDF5') : (isDark ? '#1F2937' : '#F3F4F6'),
                          },
                        ]}
                      >
                        <Text style={styles.typeIcon}>{t.icon}</Text>
                        <Text
                          style={[
                            styles.typeLabel,
                            { color: isSelected ? '#10B981' : isDark ? '#E5E7EB' : '#374151' },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Danh sách Ngân hàng hoặc Ví điện tử */}
                {(walletType === 'BANK_ACCOUNT' || walletType === 'E_WALLET') && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                      {walletType === 'BANK_ACCOUNT' ? 'Chọn ngân hàng của bạn' : 'Chọn ví điện tử'}
                    </Text>
                    <TextInput
                      value={searchPreset}
                      onChangeText={setSearchPreset}
                      placeholder={walletType === 'BANK_ACCOUNT' ? 'Tìm ngân hàng (MB, VCB, Techcombank...)' : 'Tìm ví (MoMo, ZaloPay...)'}
                      placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                      style={[
                        styles.inputField,
                        {
                          height: 42,
                          fontSize: 13,
                          marginBottom: 8,
                          backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                          color: isDark ? '#FFFFFF' : '#111827',
                          borderColor: isDark ? '#374151' : '#E5E7EB',
                        },
                      ]}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {filteredPresets.slice(0, 15).map((p) => {
                        const isPresetSelected = selectedPreset?.code === p.code;
                        return (
                          <TouchableOpacity
                            key={p.code}
                            onPress={() => handleSelectPreset(p)}
                            style={[
                              styles.presetChip,
                              {
                                borderColor: isPresetSelected ? '#10B981' : isDark ? '#374151' : '#E5E7EB',
                                backgroundColor: isPresetSelected ? (isDark ? '#064E3B44' : '#ECFDF5') : (isDark ? '#1F2937' : '#FFFFFF'),
                              },
                            ]}
                          >
                            {p.logoUrl ? (
                              <Image source={{ uri: p.logoUrl }} style={styles.presetLogo} resizeMode="contain" />
                            ) : null}
                            <Text
                              style={[
                                styles.presetText,
                                {
                                  color: isPresetSelected ? '#10B981' : isDark ? '#F9FAFB' : '#111827',
                                  fontWeight: isPresetSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {p.shortName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Tên ví */}
                <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#374151', marginTop: 16 }]}>
                  Tên ví
                </Text>
                <TextInput
                  value={walletName}
                  onChangeText={setWalletName}
                  placeholder="Ví dụ: Tiền mặt, MB Bank, Techcombank..."
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      color: isDark ? '#FFFFFF' : '#111827',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    },
                  ]}
                />

                {/* Số dư khởi tạo */}
                <Text style={[styles.inputLabel, { color: isDark ? '#E5E7EB' : '#374151', marginTop: 16 }]}>
                  Số dư hiện có
                </Text>
                <TextInput
                  value={initialBalance ? formatWithDots(initialBalance) : ''}
                  keyboardType="numeric"
                  onChangeText={(val) => setInitialBalance(val.replace(/\D/g, ''))}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      color: isDark ? '#FFFFFF' : '#111827',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                      fontSize: 18,
                      fontWeight: '700',
                    },
                  ]}
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
              </View>
            )}

            {/* STEP 3: KẾ HOẠCH HẠN MỨC THÁNG */}
            {step === 3 && (
              <View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>🎯 Bước 3/4 · Kỷ luật tài chính</Text>
                </View>
                <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  Dự kiến chi tiêu tháng này
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                  Đặt một hạn mức chi tiêu để FinAI tự động theo dõi, nhắc nhở và cảnh báo khi bạn sắp chạm ngưỡng bội chi.
                </Text>

                <View
                  style={[
                    styles.budgetCard,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#F0FDF4',
                      borderColor: isDark ? '#374151' : '#BBF7D0',
                    },
                  ]}
                >
                  <Text style={[styles.budgetLabel, { color: isDark ? '#9CA3AF' : '#166534' }]}>
                    Hạn mức chi mong muốn tháng này
                  </Text>
                  <TextInput
                    value={spendingLimit}
                    keyboardType="numeric"
                    onChangeText={(val) => setSpendingLimit(val.replace(/\D/g, ''))}
                    style={[
                      styles.budgetInput,
                      { color: isDark ? '#34D399' : '#059669' },
                    ]}
                  />
                  <Text style={[styles.budgetDisplay, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                    {formatCurrency(spendingLimit)}
                  </Text>
                </View>

                {/* Quick select chips */}
                <View style={styles.chipRow}>
                  {['3000000', '5000000', '10000000', '15000000'].map((chipVal) => (
                    <TouchableOpacity
                      key={chipVal}
                      onPress={() => setSpendingLimit(chipVal)}
                      style={[
                        styles.chipBtn,
                        spendingLimit === chipVal && styles.chipBtnActive,
                        {
                          backgroundColor:
                            spendingLimit === chipVal
                              ? '#10B981'
                              : isDark
                              ? '#374151'
                              : '#E5E7EB',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          {
                            color:
                              spendingLimit === chipVal
                                ? '#FFFFFF'
                                : isDark
                                ? '#D1D5DB'
                                : '#374151',
                          },
                        ]}
                      >
                        {(parseInt(chipVal) / 1000000).toFixed(0)} triệu
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={[styles.tipText, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                    Bạn luôn có thể tùy chỉnh chi tiết từng danh mục (Ăn uống, Đi lại, Mua sắm...) trong mục Ngân sách bất cứ lúc nào.
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 4: HOÀN TẤT & KHÁM PHÁ CÁC TÍNH NĂNG VƯỢT TRỘI */}
            {step === 4 && (
              <View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>🚀 Sẵn sàng bắt đầu</Text>
                </View>
                <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  Mọi thứ đã sẵn sàng!
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                  Khám phá ngay bộ 3 trợ thủ đắc lực giúp bạn làm chủ tài chính thông minh:
                </Text>

                <View style={styles.featureList}>
                  <View
                    style={[
                      styles.featureCard,
                      { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' },
                    ]}
                  >
                    <Text style={styles.featureIcon}>🤖</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                        FinAI Agent thông minh
                      </Text>
                      <Text style={[styles.featureDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Chat tự nhiên để tra cứu số dư, hỏi phân tích và nhận dự báo dòng tiền 30 ngày tới.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.featureCard,
                      { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' },
                    ]}
                  >
                    <Text style={styles.featureIcon}>🧾</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                        Quét hóa đơn AI (OCR)
                      </Text>
                      <Text style={[styles.featureDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Chụp ảnh hóa đơn siêu thị, ăn uống — Finora tự bóc tách số tiền và danh mục trong 3 giây.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.featureCard,
                      { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' },
                    ]}
                  >
                    <Text style={styles.featureIcon}>👥</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                        Chia quỹ nhóm & Gia đình
                      </Text>
                      <Text style={[styles.featureDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Dễ dàng chia hóa đơn cùng bạn bè, mở ví giáo dục chi tiêu cho con nhỏ.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
            {step > 1 && (
              <TouchableOpacity
                onPress={() => setStep((prev) => prev - 1)}
                style={[
                  styles.prevButton,
                  { borderColor: isDark ? '#374151' : '#D1D5DB' },
                ]}
              >
                <Text style={[styles.prevButtonText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                  Quay lại
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNextStep}
              disabled={isSubmitting}
              style={[
                styles.nextButton,
                { flex: step === 1 ? 1 : 2 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {step === 4 ? 'Khám phá Finora ngay 🚀' : step === 2 ? 'Tạo ví & Tiếp tục' : 'Tiếp tục'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    maxHeight: '90%',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  goalList: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  goalIcon: {
    fontSize: 26,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  typeIcon: {
    fontSize: 22,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  presetLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  presetText: {
    fontSize: 13,
  },
  inputField: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  amountHelper: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
  },
  budgetCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  budgetInput: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  budgetDisplay: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  chipBtnActive: {
    backgroundColor: '#10B981',
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    gap: 10,
  },
  tipIcon: {
    fontSize: 18,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 14,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  prevButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
