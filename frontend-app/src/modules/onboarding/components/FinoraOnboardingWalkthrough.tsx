import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  Camera,
  ArrowLeftRight,
  PieChart,
  Target,
  MessageSquare,
  TrendingUp,
  LineChart,
  Users,
  Wallet,
  Scale,
  Award,
  PiggyBank,
  CheckCircle2,
  Banknote,
  Landmark,
  Smartphone,
} from 'lucide-react-native';
import { OnboardingWaveBackground } from './OnboardingWaveBackground';
import { accountApi, AccountTypeCode } from '../../accounts/api/accountApi';
import { POPULAR_BANKS_AND_WALLETS, BankOrWalletPreset } from '../../accounts/constants/banksData';

const FINORA_LOGO = require('../../../assets/finora-logo.png');

const SLIDE_IMAGES = [
  require('../../../assets/onboarding/slide_1.png'),
  require('../../../assets/onboarding/slide_2.png'),
  require('../../../assets/onboarding/slide_3.png'),
  require('../../../assets/onboarding/slide_4.png'),
  require('../../../assets/onboarding/slide_5.png'),
  require('../../../assets/onboarding/slide_6.png'),
  require('../../../assets/onboarding/slide_7.png'),
];

const ONBOARDING_PAGES = [
  {
    step: '01 / 07',
    title: 'Chào mừng bạn đến với\nFinora',
    highlight: 'Tài chính thông minh – Cuộc sống an tâm',
    desc: 'Khởi đầu hành trình làm chủ tài chính cá nhân cùng trợ lý thông minh Finora. Quản lý thu chi rõ ràng, tích lũy vững vàng và tự tin chạm tới mọi ước mơ.',
    chips: [],
    btnText: 'Bắt đầu ngay →',
  },
  {
    step: '02 / 07',
    title: 'Quản lý thu chi\ndễ dàng',
    highlight: 'Mọi khoản tiền đều trong tầm kiểm soát.',
    desc: 'Theo dõi từng khoản thu, chi tiêu hàng ngày một cách trực quan, chính xác chỉ trong vài giây.',
    chips: [
      { Icon: FileText, label: 'Ghi chép\ngiao dịch' },
      { Icon: Camera, label: 'Quét\nhóa đơn' },
      { Icon: ArrowLeftRight, label: 'Chuyển tiền\ngiữa các ví' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '03 / 07',
    title: 'Ngân sách &\nMục tiêu tài chính',
    highlight: 'Chi tiêu có kế hoạch, tiết kiệm có mục tiêu.',
    desc: 'Thiết lập hạn mức chi tiêu cho từng danh mục và theo dõi tiến độ tích lũy cho những ước mơ lớn.',
    chips: [
      { Icon: PieChart, label: 'Lập ngân sách\nkiểm soát chi tiêu' },
      { Icon: Target, label: 'Đặt mục tiêu\ntích lũy và theo dõi' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '04 / 07',
    title: 'FinAI – Trợ lý\ntài chính thông minh',
    highlight: 'Chỉ cần hỏi, FinAI sẽ hỗ trợ bạn.',
    desc: 'Tự động phân tích xu hướng thu chi, cảnh báo thâm hụt và dự báo số dư tương lai chính xác 30 ngày.',
    chips: [
      { Icon: MessageSquare, label: 'Tư vấn\nchi tiêu' },
      { Icon: TrendingUp, label: 'Phân tích\nthu chi' },
      { Icon: LineChart, label: 'Dự báo\nsố dư' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '05 / 07',
    title: 'Quản lý tài chính\ncùng nhau',
    highlight: 'Chia sẻ trách nhiệm, gắn kết tài chính.',
    desc: 'Tạo nhóm gia đình, bạn bè hoặc người thân để cùng quản lý quỹ chung và chia sẻ chi tiêu công bằng.',
    chips: [
      { Icon: Users, label: 'Tạo nhóm\nlinh hoạt' },
      { Icon: Wallet, label: 'Quản lý\nquỹ chung' },
      { Icon: Scale, label: 'Cân đối\nnợ' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '06 / 07',
    title: 'Ví của bé –\nHọc cách quản lý tiền',
    highlight: 'Xây dựng thói quen tài chính từ nhỏ.',
    desc: 'Giao nhiệm vụ làm việc nhà, thưởng điểm và hướng dẫn con cái biết quý trọng giá trị đồng tiền.',
    chips: [
      { Icon: Award, label: 'Nhiệm vụ\nnhận thưởng' },
      { Icon: PiggyBank, label: 'Tiết kiệm\nthông minh' },
      { Icon: FileText, label: 'Báo cáo\nchi tiêu' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '07 / 07',
    title: 'Tạo ví đầu tiên',
    highlight: 'Thiết lập chiếc ví của bạn để bắt đầu hành trình cùng Finora.',
    desc: 'Finora cần ít nhất một tài khoản để ghi chép. Bạn có thể thêm nhiều ví khác bất cứ lúc nào.',
    chips: [
      { Icon: CheckCircle2, label: 'Tạo ví cá nhân' },
      { Icon: CheckCircle2, label: 'Nhập số dư ban đầu' },
      { Icon: CheckCircle2, label: 'Sẵn sàng quản lý tài chính' },
    ],
    btnText: 'Tạo ví ngay →',
  },
];

const ACCOUNT_TYPES: { type: AccountTypeCode; label: string; Icon: any; defaultName: string }[] = [
  { type: 'CASH', label: 'Tiền mặt', Icon: Banknote, defaultName: 'Tiền mặt ví' },
  { type: 'BANK_ACCOUNT', label: 'Ngân hàng', Icon: Landmark, defaultName: 'Tài khoản ngân hàng' },
  { type: 'E_WALLET', label: 'Ví điện tử', Icon: Smartphone, defaultName: 'Ví điện tử' },
];

interface Props {
  onComplete: () => void;
  userName?: string;
}

export function FinoraOnboardingWalkthrough({ onComplete }: Props) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Form tạo ví ở Slide 7
  const [isSettingUpWallet, setIsSettingUpWallet] = useState(false);
  const [walletType, setWalletType] = useState<AccountTypeCode>('CASH');
  const [walletName, setWalletName] = useState('Tiền mặt ví');
  const [initialBalance, setInitialBalance] = useState('');
  const formScrollViewRef = useRef<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [searchPreset, setSearchPreset] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardShiftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        Animated.timing(keyboardShiftAnim, {
          toValue: -150,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.timing(keyboardShiftAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShiftAnim]);

  // 1. Safe Area & Phân vùng chuẩn:
  const statusBarHeight = insets.top > 0 ? insets.top : 24;
  const bottomInset = insets.bottom > 0 ? insets.bottom : 16;

  // - Slide thường (0-6): Nền xanh chiếm 40% màn hình, sóng dày dặn
  // - Khi ở Form tạo ví (isSettingUpWallet = true): Nền xanh 24% cân đối, icon ví vừa vặn đẹp mắt
  const isFormActive = isSettingUpWallet;
  const solidGreenHeight = Math.round(SCREEN_HEIGHT * (isFormActive ? 0.24 : 0.40));
  const waveRibbonHeight = Math.round(SCREEN_HEIGHT * (isFormActive ? 0.09 : 0.16));
  const waveHeight = solidGreenHeight + Math.round(SCREEN_HEIGHT * (isFormActive ? 0.05 : 0.10));
  const mascotFixedSize = isFormActive
    ? Math.min(Math.round(SCREEN_WIDTH * 0.60), solidGreenHeight - statusBarHeight + 16)
    : Math.min(Math.round(SCREEN_WIDTH * 0.76), solidGreenHeight - statusBarHeight - 8);

  const formatWithDots = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('vi-VN');
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
    // Tự động cuộn xuống trường điền số dư ban đầu
    setTimeout(() => {
      formScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleNext = () => {
    if (currentIndex < 6) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      if (!isSettingUpWallet) {
        setIsSettingUpWallet(true);
      } else {
        handleCreateWallet();
      }
    }
  };

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      setErrorMsg('Vui lòng nhập tên ví của bạn');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    const balanceNum = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
    try {
      const res = await accountApi.createAccount({
        name: walletName.trim(),
        accountType: walletType,
        initialBalance: balanceNum,
        currencyCode: 'VND',
        description: selectedPreset ? `${selectedPreset.name} khởi tạo từ Onboarding Finora` : 'Ví khởi tạo ban đầu',
      });
      if (res.success) {
        onComplete();
      } else {
        setErrorMsg(res.message || 'Không thể tạo ví, vui lòng thử lại');
      }
    } catch {
      setErrorMsg('Lỗi kết nối. Bạn có thể bấm Bỏ qua.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ══════════════════════════════════════════════════════════════
          1. HERO SECTION:
          - Nền xanh chính 40% màn hình
          - Dải sóng uốn lượn 10% màn hình
          - Icon kích thước bằng nhau tuyệt đối, đặt ở ĐÁY 40% nền xanh
          - Cùng trượt nâng lên khi bàn phím mở để không bị chữ đè lên sóng/icon
          ══════════════════════════════════════════════════════════════ */}
      <Animated.View style={[styles.heroSection, { transform: [{ translateY: keyboardShiftAnim }] }]}>
        <OnboardingWaveBackground height={waveHeight} waveHeight={waveRibbonHeight} width={SCREEN_WIDTH}>
          <View style={[styles.heroFlexContainer, { paddingTop: statusBarHeight }]}>
            {/* 1.1 Top Navbar */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <Image
                  source={FINORA_LOGO}
                  style={styles.brandLogoImg}
                  resizeMode="contain"
                />
                <Text style={styles.brandTitle}>Finora</Text>
              </View>

              <TouchableOpacity onPress={onComplete} style={styles.skipBtn} hitSlop={12}>
                <Text style={styles.skipText}>Bỏ qua</Text>
              </TouchableOpacity>
            </View>

            {/* 1.2 Icon Mascot 3D: Căn chạm ĐÁY của vùng nền xanh 40%, ngay trên viền cong sóng */}
            <View style={[styles.mascotArea, { height: solidGreenHeight - statusBarHeight - 48 }]}>
              <View
                style={{
                  width: mascotFixedSize,
                  height: mascotFixedSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={SLIDE_IMAGES[currentIndex]}
                  style={[
                    styles.mascotImg,
                    isFormActive && {
                      transform: [{ scale: 1.25 }],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </OnboardingWaveBackground>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════════════
          2. NỘI DUNG (FLATLIST CHO PHÉP VUỐT 7 TRANG)
          ══════════════════════════════════════════════════════════════ */}
      <Animated.View style={[styles.mainBody, { transform: [{ translateY: keyboardShiftAnim }] }]}>
        {/* Thanh tiến trình dots 7 bước */}
        <View style={styles.paginationDots}>
          {ONBOARDING_PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {!isSettingUpWallet ? (
          <FlatList
            ref={flatListRef}
            data={ONBOARDING_PAGES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentIndex(idx);
            }}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item, index }) => (
              <ScrollView
                style={{ width: SCREEN_WIDTH }}
                contentContainerStyle={styles.slideScrollContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {index === 0 ? (
                  /* ── TRANG 1: THIẾT KẾ TOÀN CHỮ ĐẶC BIỆT, NỔI BẬT & SANG TRỌNG ── */
                  <View style={styles.contentSection}>
                    <Text style={styles.welcomeTitleText}>{item.title}</Text>

                    <Text style={styles.welcomeHighlightText}>{item.highlight}</Text>

                    <Text style={styles.welcomeDescText}>{item.desc}</Text>

                    {/* Khối tuyên ngôn / lời giới thiệu định vị sang trọng */}
                    <View style={styles.welcomeQuoteCard}>
                      <View style={styles.quoteBar} />
                      <View style={styles.quoteContent}>
                        <Text style={styles.quoteTitle}>Đồng hành tin cậy cho ví tiền của bạn</Text>
                        <View style={styles.quoteBulletList}>
                          <View style={styles.quoteBulletItem}>
                            <View style={styles.quoteDot} />
                            <Text style={styles.quoteBulletText}>Đơn giản hóa quản lý chi tiêu</Text>
                          </View>
                          <View style={styles.quoteBulletItem}>
                            <View style={styles.quoteDot} />
                            <Text style={styles.quoteBulletText}>Dự báo tương lai tài chính</Text>
                          </View>
                          <View style={styles.quoteBulletItem}>
                            <View style={styles.quoteDot} />
                            <Text style={styles.quoteBulletText}>Bảo mật và riêng tư tuyệt đối</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* ── CÁC TRANG 2 - 6: BỐ CỤC CHUẨN KÈM CHIPS ── */
                  <View style={styles.contentSection}>
                    {/* Số bước 01/07 */}
                    <Text style={styles.stepBadge}>{item.step}</Text>

                    {/* Tiêu đề chính */}
                    <Text style={styles.titleText}>{item.title}</Text>

                    {/* Highlight */}
                    <Text style={styles.highlightText}>{item.highlight}</Text>

                    {/* Mô tả */}
                    <Text style={styles.descText}>{item.desc}</Text>

                    {/* Các thẻ tính năng */}
                    {item.chips.length > 0 && (
                      <View style={styles.chipsRow}>
                        {item.chips.map((chip, cIdx) => {
                          const IconComp = chip.Icon;
                          return (
                            <View key={cIdx} style={styles.chipItem}>
                              <View style={styles.chipIconWrapper}>
                                <IconComp size={20} color="#059669" strokeWidth={2.2} />
                              </View>
                              <Text style={styles.chipLabel}>{chip.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          />
        ) : (
          /* FORM TẠO VÍ ĐẦU TIÊN Ở BƯỚC 7 */
          <ScrollView
            ref={formScrollViewRef}
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={[styles.slideScrollContainer, { paddingBottom: 60 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.contentSection}>
                <Text style={styles.stepBadge}>07 / 07</Text>
                <Text style={styles.formHeaderTitle}>Chọn loại nguồn tiền của bạn</Text>

                <View style={styles.typeRow}>
                  {ACCOUNT_TYPES.map((t) => {
                    const isSelected = walletType === t.type;
                    const TypeIcon = t.Icon;
                    return (
                      <TouchableOpacity
                        key={t.type}
                        onPress={() => {
                          setWalletType(t.type);
                          setSelectedPreset(null);
                          setSearchPreset('');
                          if (t.type === 'CASH') setWalletName('Tiền mặt ví');
                          else if (t.type === 'BANK_ACCOUNT') setWalletName('Tài khoản ngân hàng');
                          else setWalletName('Ví điện tử');
                        }}
                        style={[styles.typeBtn, isSelected && styles.typeBtnSelected]}
                      >
                        <TypeIcon size={22} color={isSelected ? '#007B58' : '#64748B'} strokeWidth={2} style={{ marginBottom: 4 }} />
                        <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(walletType === 'BANK_ACCOUNT' || walletType === 'E_WALLET') && (
                  <View style={{ marginTop: 12, width: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.inputLabel}>
                        {walletType === 'BANK_ACCOUNT' ? 'CHỌN NGÂN HÀNG *' : 'CHỌN VÍ ĐIỆN TỬ *'}
                      </Text>
                      {selectedPreset && (
                        <TouchableOpacity onPress={() => setSelectedPreset(null)}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                            Đổi ngân hàng/ví
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {selectedPreset ? (
                      /* CARD TO HIỂN THỊ NGÂN HÀNG/VÍ ĐÃ CHỌN - Y HỆT MÀN THÊM VÍ */
                      <View style={styles.selectedPresetCard}>
                        <View style={styles.selectedPresetLeft}>
                          <View style={styles.selectedPresetLogoBox}>
                            {selectedPreset.logoUrl ? (
                              <Image
                                source={{ uri: selectedPreset.logoUrl }}
                                style={styles.selectedPresetLogoImg}
                                resizeMode="contain"
                              />
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>
                                {selectedPreset.shortName.slice(0, 3)}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <Text style={styles.selectedPresetShortName}>{selectedPreset.shortName}</Text>
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
                      /* Ô TÌM KIẾM & DANH SÁCH CHIP NGÂN HÀNG KHI CHƯA CHỌN */
                      <View>
                        <TextInput
                          value={searchPreset}
                          onChangeText={setSearchPreset}
                          placeholder={walletType === 'BANK_ACCOUNT' ? 'Tìm ngân hàng (MB, VCB, Techcombank...)' : 'Tìm ví (MoMo, ZaloPay...)'}
                          placeholderTextColor="#9CA3AF"
                          style={styles.searchPresetInput}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {filteredPresets.slice(0, 15).map((p) => (
                            <TouchableOpacity
                              key={p.code}
                              onPress={() => handleSelectPreset(p)}
                              style={styles.presetChip}
                            >
                              {p.logoUrl ? (
                                <Image source={{ uri: p.logoUrl }} style={styles.presetLogo} resizeMode="contain" />
                              ) : null}
                              <Text style={styles.presetText}>
                                {p.shortName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                <View style={{ width: '100%' }}>
                  <Text style={styles.inputLabel}>Tên ví</Text>
                  <TextInput
                    value={walletName}
                    onChangeText={setWalletName}
                    placeholder="Ví dụ: Tiền mặt, MB Bank, MoMo..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.inputField}
                  />
                </View>

                <View style={{ width: '100%' }}>
                  <Text style={styles.inputLabel}>Số dư ban đầu</Text>
                  <TextInput
                    value={initialBalance ? formatWithDots(initialBalance) : ''}
                    keyboardType="numeric"
                    onChangeText={(val) => setInitialBalance(val.replace(/\D/g, ''))}
                    placeholder="0 đ"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.inputField, { fontSize: 17, fontWeight: '700' }]}
                  />
                </View>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
              </View>
            </ScrollView>
          )}
        </Animated.View>

      {/* ══════════════════════════════════════════════════════════════
          3. FOOTER: NÚT "TIẾP TỤC" CỐ ĐỊNH TẠI 1 VỊ TRÍ DUY NHẤT CHO CẢ 7 TRANG
          (ẨN ĐI KHI ĐANG MỞ BÀN PHÍM ĐỂ TRÁNH CHE KHUẤT Ô NHẬP LIỆU)
          ══════════════════════════════════════════════════════════════ */}
      {(!isFormActive || !isKeyboardVisible) && (
        <View style={[styles.fixedFooterSection, { paddingBottom: bottomInset + 12 }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSettingUpWallet
                  ? 'Hoàn tất & Khám phá Finora'
                  : ONBOARDING_PAGES[currentIndex].btnText}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },

  // ═════ 1. HERO SECTION ═════
  heroSection: {
    flexShrink: 0,
  },
  heroFlexContainer: {
    flexDirection: 'column',
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Khung Mascot: Nằm chạm đáy phần nền xanh 40%, ngay trên viền cong sóng
  mascotArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 0,
    zIndex: 15,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },

  // ═════ 2. MAIN BODY & DOTS ═════
  mainBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  paginationDots: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E2E8F0',
  },
  activeDot: {
    width: 22,
    backgroundColor: '#007B58',
  },

  // ═════ SLIDE SCROLL CONTAINER ═════
  slideScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },

  contentSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
  },
  // ── TRANG 1: TYPOGRAPHY ĐẶC BIỆT ──
  welcomePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  welcomePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007B58',
    letterSpacing: 1.5,
  },
  welcomeTitleText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  welcomeHighlightText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#007B58',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  welcomeDescText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
    maxWidth: 360,
  },
  welcomeQuoteCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 12,
    marginTop: 4,
    width: '100%',
    maxWidth: 360,
  },
  quoteBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#007B58',
    marginRight: 10,
  },
  quoteContent: {
    flex: 1,
  },
  quoteTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 6,
  },
  quoteBulletList: {
    gap: 4,
  },
  quoteBulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  quoteDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  quoteBulletText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#047857',
    fontWeight: '600',
  },

  // ── CÁC TRANG CÒN LẠI ──
  stepBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007B58',
    letterSpacing: 2,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#007B58',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  descText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
    maxWidth: 350,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    marginTop: 2,
    marginBottom: 6,
  },
  chipItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
  },
  chipIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ═════ 3. FOOTER CỐ ĐỊNH DUY NHẤT 1 VỊ TRÍ ═════
  fixedFooterSection: {
    flexShrink: 0,
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#007B58',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007B58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },

  // ═════ FORM STYLES ═════
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  typeBtnSelected: {
    borderColor: '#007B58',
    backgroundColor: '#ECFDF5',
  },
  typeIcon: {
    fontSize: 22,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  typeLabelSelected: {
    color: '#007B58',
  },
  searchPresetInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  presetChipSelected: {
    borderColor: '#007B58',
    backgroundColor: '#ECFDF5',
  },
  presetLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  presetText: {
    fontSize: 12,
    color: '#334155',
  },
  presetTextSelected: {
    color: '#007B58',
    fontWeight: '700',
  },
  selectedPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F8F0',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 4,
  },
  selectedPresetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedPresetLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPresetLogoImg: {
    width: 36,
    height: 36,
  },
  selectedPresetShortName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  codeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  codeTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  selectedPresetFullName: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  inputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});
