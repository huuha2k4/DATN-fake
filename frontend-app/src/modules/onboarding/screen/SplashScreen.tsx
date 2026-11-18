import React from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './SplashScreen.styles';

const logo = require('../../../assets/finora-logo.png');

export interface FeatureChip {
  icon: string;
  title: string;
  desc: string;
}

export interface OnboardingSlide {
  badge: string;
  badgeSpark: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  mockupType: 'balance' | 'ocr' | 'ai';
  featureChips: FeatureChip[];
  highlights: string[];
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    badge: 'Finora · Quản lý tài chính thông minh',
    badgeSpark: '✨',
    titlePrefix: 'Chủ động tài chính cùng ',
    titleHighlight: 'Trí tuệ nhân tạo',
    description:
      'Tự động theo dõi dòng tiền, kiểm soát từng nguồn thu chi và nhận đề xuất thông minh theo thời gian thực.',
    mockupType: 'balance',
    featureChips: [
      { icon: '💳', title: 'Đa ví tài khoản', desc: 'Ngân hàng, ví điện tử & tiền mặt' },
      { icon: '📊', title: 'Báo cáo dòng tiền', desc: 'Thống kê thu chi 4 tuần chuẩn xác' },
      { icon: '🎯', title: 'Hạn mức ngân sách', desc: 'Cảnh báo tự động khi chạm ngưỡng' },
      { icon: '⚡', title: 'Đồng bộ tức thì', desc: 'Cập nhật biến động số dư 24/7' },
    ],
    highlights: ['✓ Không phí phát sinh', '✓ Mã hóa bảo mật cao', '✓ 24/7 trực quan'],
  },
  {
    badge: 'Công nghệ AI OCR · Nhận diện tức thì',
    badgeSpark: '📄',
    titlePrefix: 'Quét hóa đơn tự động bằng ',
    titleHighlight: 'Finora OCR',
    description:
      'Chỉ cần chụp ảnh hóa đơn mua sắm, AI tự động đọc số tiền, bóc tách danh mục và lưu sổ giao dịch trong 3 giây.',
    mockupType: 'ocr',
    featureChips: [
      { icon: '⚡', title: 'Tốc độ 3 giây', desc: 'Tự động đọc số tiền & ngày giờ' },
      { icon: '🏷️', title: 'Gắn nhãn thông minh', desc: 'Phân loại đúng danh mục mua sắm' },
      { icon: '🧾', title: 'Bóc tách chi tiết', desc: 'Nhận diện từng món hàng trên hóa đơn' },
      { icon: '☁️', title: 'Lưu trữ đám mây', desc: 'Tìm lại chứng từ chi tiêu dễ dàng' },
    ],
    highlights: ['✓ Độ chính xác 99.8%', '✓ Nhận diện mọi định dạng', '✓ Lưu trữ an toàn'],
  },
  {
    badge: 'Facebook Prophet · Time-Series Model',
    badgeSpark: '🤖',
    titlePrefix: 'Dự báo dòng tiền tương lai cùng ',
    titleHighlight: 'FinAI Advisor',
    description:
      'Mô hình chuỗi thời gian tiên đoán số dư 15-30 ngày tới, cảnh báo sớm nguy cơ thâm hụt và tối ưu quỹ tiết kiệm.',
    mockupType: 'ai',
    featureChips: [
      { icon: '📈', title: 'Dự phóng số dư', desc: 'Xu hướng biến động 15-30 ngày tới' },
      { icon: '🛡️', title: 'Cảnh báo bội chi', desc: 'Kiểm soát tâm lý vung tay cuối tháng' },
      { icon: '💡', title: 'Gợi ý thông minh', desc: 'Đề xuất trích lập tiết kiệm hợp lý' },
      { icon: '🎯', title: 'Mục tiêu tài chính', desc: 'Lộ trình tích lũy đúng hạn' },
    ],
    highlights: ['✓ Dự báo số dư 30 ngày', '✓ Cảnh báo sớm rủi ro', '✓ Cá nhân hóa 100%'],
  },
];

type Props = {
  onStart: () => void;
  onLogin: () => void;
};

export function SplashScreen({ onStart, onLogin }: Props) {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 560 : 460;

  // Thu phóng linh hoạt theo chiều cao màn hình:
  const isCompactHeight = height < 750; // Chỉ dành cho màn hình cực ngắn (< 750dp)
  const chipVerticalPadding = isCompactHeight ? 8 : 11;
  const chipIconSize = isCompactHeight ? 28 : 34;
  const chipIconFontSize = isCompactHeight ? 14 : 16;

  // Responsive dynamic scalers
  const heroFontSize = Math.min(Math.max(width * 0.062, 21), isTablet ? 32 : 26);
  const heroLineHeight = Math.round(heroFontSize * 1.25);
  const descFontSize = Math.min(Math.max(width * 0.032, 12), 14);
  const descLineHeight = Math.round(descFontSize * 1.4);

  // Animation when slide changes: mượt mà, trượt ngang và fade-in như carousel chuẩn app hiện đại
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const slideDirection = React.useRef(1); // 1: lướt sang trái (tiến tới), -1: lướt sang phải (lùi lại)

  const changeSlide = React.useCallback(
    (nextIdx: number, customDir?: number) => {
      if (nextIdx < 0 || nextIdx >= ONBOARDING_SLIDES.length || nextIdx === activeSlide) return;
      slideDirection.current = customDir !== undefined ? customDir : (nextIdx > activeSlide ? 1 : -1);
      slideAnim.setValue(0);
      setActiveSlide(nextIdx);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    },
    [activeSlide, slideAnim]
  );

  React.useEffect(() => {
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-play timer: 5 giây tự nhảy 1 lần mượt mà
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % ONBOARDING_SLIDES.length;
        slideDirection.current = 1;
        slideAnim.setValue(0);
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();
        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [slideAnim]);

  // Gesture swipe handler
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 40,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          setActiveSlide((prev) => {
            const next = (prev + 1) % ONBOARDING_SLIDES.length;
            if (next !== prev) changeSlide(next, 1);
            return prev;
          });
        } else if (gestureState.dx > 40) {
          setActiveSlide((prev) => {
            const next = (prev - 1 + ONBOARDING_SLIDES.length) % ONBOARDING_SLIDES.length;
            if (next !== prev) changeSlide(next, -1);
            return prev;
          });
        }
      },
    })
  ).current;

  const currentSlide = ONBOARDING_SLIDES[activeSlide];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Ambient background glows */}
      <View pointerEvents="none" style={styles.ambientLayer}>
        <View style={styles.ambientBlob1} />
        <View style={styles.ambientBlob2} />
        <View style={styles.ambientBlob3} />
      </View>

      <View style={[styles.container, { maxWidth: containerMaxWidth }]}>
        {/* TOP SECTION: Header + Slide Carousel */}
        <View style={styles.topBlock}>
          {/* 1. Header / Navbar */}
          <View style={styles.navbar}>
            <View style={styles.navBrand}>
              <View style={styles.navLogoBox}>
                <Image
                  source={logo}
                  style={styles.navLogo}
                  resizeMode="contain"
                  accessibilityLabel="Finora Logo"
                />
              </View>
              <View>
                <Text style={styles.navBrandTitle} maxFontSizeMultiplier={1.2}>
                  Finora
                </Text>
                <Text style={styles.navBrandSub} maxFontSizeMultiplier={1.15}>
                  INTELLIGENCE
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Swipeable Slides Area */}
          <View {...panResponder.panHandlers} style={styles.swipeContainer}>
            <Animated.View
              style={[
                styles.slideAnimated,
                {
                  opacity: slideAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, 0.65, 1],
                  }),
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [slideDirection.current * 42, 0],
                      }),
                    },
                    {
                      scale: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Hero Pill Badge */}
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeSpark}>{currentSlide.badgeSpark}</Text>
                <Text
                  style={styles.heroBadgeText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.15}
                >
                  {currentSlide.badge}
                </Text>
              </View>

              {/* Hero Titles */}
              <View style={styles.heroTitleBox}>
                <Text
                  style={[
                    styles.heroTitle,
                    { fontSize: heroFontSize, lineHeight: heroLineHeight },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {currentSlide.titlePrefix}
                  <Text style={styles.heroTitleHighlight}>{currentSlide.titleHighlight}</Text>
                </Text>

                <Text
                  style={[
                    styles.heroDesc,
                    { fontSize: descFontSize, lineHeight: descLineHeight },
                  ]}
                  maxFontSizeMultiplier={1.25}
                >
                  {currentSlide.description}
                </Text>
              </View>

              {/* Rich Mockup Card */}
              <View style={styles.mockupContainer}>
                {currentSlide.mockupType === 'balance' && <BalanceMockup isCompact={isCompactHeight} />}
                {currentSlide.mockupType === 'ocr' && <OcrMockup isCompact={isCompactHeight} />}
                {currentSlide.mockupType === 'ai' && <AiForecastMockup isCompact={isCompactHeight} />}
              </View>

              {/* 4 Thẻ Tính Năng: 2 hàng x 2 thẻ co giãn theo chiều cao màn hình */}
              <View style={styles.featureGridWrapper}>
                {/* Hàng 1 */}
                <View style={styles.featureGridRow}>
                  {currentSlide.featureChips.slice(0, 2).map((chip, idx) => (
                    <View
                      key={idx}
                      style={[styles.featureChipCard, { paddingVertical: chipVerticalPadding }]}
                    >
                      <View
                        style={[
                          styles.featureChipIconBox,
                          { width: chipIconSize, height: chipIconSize },
                        ]}
                      >
                        <Text style={[styles.featureChipIconText, { fontSize: chipIconFontSize }]}>
                          {chip.icon}
                        </Text>
                      </View>
                      <View style={styles.featureChipTextBox}>
                        <Text style={styles.featureChipTitle} numberOfLines={1}>
                          {chip.title}
                        </Text>
                        <Text style={styles.featureChipDesc} numberOfLines={1}>
                          {chip.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Hàng 2 */}
                <View style={styles.featureGridRow}>
                  {currentSlide.featureChips.slice(2, 4).map((chip, idx) => (
                    <View
                      key={idx + 2}
                      style={[styles.featureChipCard, { paddingVertical: chipVerticalPadding }]}
                    >
                      <View
                        style={[
                          styles.featureChipIconBox,
                          { width: chipIconSize, height: chipIconSize },
                        ]}
                      >
                        <Text style={[styles.featureChipIconText, { fontSize: chipIconFontSize }]}>
                          {chip.icon}
                        </Text>
                      </View>
                      <View style={styles.featureChipTextBox}>
                        <Text style={styles.featureChipTitle} numberOfLines={1}>
                          {chip.title}
                        </Text>
                        <Text style={styles.featureChipDesc} numberOfLines={1}>
                          {chip.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* BOTTOM SECTION: Neo sát đáy viền iPhone */}
        <View style={styles.bottomBlock}>
          {/* Pagination Dots */}
          <View
            style={styles.paginationRow}
            accessibilityRole="tablist"
            accessibilityLabel="Chọn trang giới thiệu"
          >
            {ONBOARDING_SLIDES.map((_, idx) => {
              const isActive = activeSlide === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => changeSlide(idx)}
                  hitSlop={10}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Trang ${idx + 1}`}
                  style={[styles.dotBase, isActive ? styles.dotActive : styles.dotInactive]}
                />
              );
            })}
          </View>

          {/* Social Proof Row */}
          <View style={styles.highlightsRow}>
            {currentSlide.highlights.map((item, i) => (
              <React.Fragment key={i}>
                <Text style={styles.highlightText} maxFontSizeMultiplier={1.15}>
                  {item}
                </Text>
                {i < currentSlide.highlights.length - 1 && <View style={styles.highlightDot} />}
              </React.Fragment>
            ))}
          </View>

          {/* Action CTA Group */}
          <View style={styles.ctaGroup}>
            <Pressable
              onPress={onStart}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Trải nghiệm miễn phí ngay"
            >
              <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={1.2}>
                Trải nghiệm miễn phí ngay
              </Text>
            </Pressable>

            <Pressable
              onPress={onLogin}
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập"
            >
              <Text style={styles.btnSecondaryText} maxFontSizeMultiplier={1.2}>
                Đăng nhập
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footerBox}>
            <Text style={styles.footerText} maxFontSizeMultiplier={1.15}>
              © {new Date().getFullYear()} Finora Intelligence · Bảo mật & Riêng tư
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CON: SLIDE 1 - MOCKUP DÒNG TIỀN VÀ SỐ DƯ (ANIMATED BARS)
// ─────────────────────────────────────────────────────────────────────────────
function BalanceMockup({ isCompact }: { isCompact: boolean }) {
  const barAnim1 = React.useRef(new Animated.Value(0)).current;
  const barAnim2 = React.useRef(new Animated.Value(0)).current;
  const barAnim3 = React.useRef(new Animated.Value(0)).current;
  const barAnim4 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.stagger(90, [
      Animated.spring(barAnim1, { toValue: 65, friction: 6, useNativeDriver: false }),
      Animated.spring(barAnim2, { toValue: 50, friction: 6, useNativeDriver: false }),
      Animated.spring(barAnim3, { toValue: 88, friction: 6, useNativeDriver: false }),
      Animated.spring(barAnim4, { toValue: 72, friction: 6, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={styles.mockupCard}>
      <View style={styles.mockupTopStrip}>
        <View style={styles.mockupHeaderDots}>
          <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={styles.mockupUrlText} numberOfLines={1}>
          app.finora.vn/dashboard
        </Text>
        <View style={styles.mockupLiveBadge}>
          <View style={styles.mockupLiveDot} />
          <Text style={styles.mockupLiveText}>Live</Text>
        </View>
      </View>

      <View style={[styles.mockupCardBody, isCompact && styles.mockupCardBodyCompact]}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TỔNG TÀI SẢN KHẢ DỤNG</Text>
            <Text style={[styles.statValue, isCompact && styles.statValueCompact]}>
              128.450.000 <Text style={styles.statCurrency}>₫</Text>
            </Text>
            <Text style={styles.statSubGreen}>▲ +12.5% so với tháng trước</Text>
          </View>
          <View style={styles.statBadgeSquare}>
            <Text style={styles.statBadgeSquareIcon}>↗</Text>
          </View>
        </View>

        {/* Mini Chart Bars */}
        <View style={[styles.barChartStrip, isCompact && styles.barChartStripCompact]}>
          {[
            { label: 'T1', anim: barAnim1, light: 30 },
            { label: 'T2', anim: barAnim2, light: 42 },
            { label: 'T3', anim: barAnim3, light: 45, active: true },
            { label: 'T4', anim: barAnim4, light: 28 },
          ].map((bar, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barPair}>
                <Animated.View
                  style={[
                    styles.barGreen,
                    {
                      height: bar.anim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                    bar.active && styles.barGreenActive,
                  ]}
                />
                <View style={[styles.barLight, { height: `${bar.light}%` }]} />
              </View>
              <Text style={styles.barLabel}>{bar.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick summary strip */}
        <View style={styles.summaryMiniRow}>
          <View style={styles.summaryChip}>
            <View style={[styles.chipDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.chipText}>Thu: 45.000.000 ₫</Text>
          </View>
          <View style={styles.summaryChip}>
            <View style={[styles.chipDot, { backgroundColor: '#38BDF8' }]} />
            <Text style={styles.chipText}>Chi: 16.320.000 ₫</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CON: SLIDE 2 - MOCKUP OCR QUÉT HÓA ĐƠN (LASER SCANNING)
// ─────────────────────────────────────────────────────────────────────────────
function OcrMockup({ isCompact }: { isCompact: boolean }) {
  const scanAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.mockupCard}>
      <View style={styles.mockupTopStrip}>
        <View style={styles.mockupHeaderDots}>
          <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={styles.mockupUrlText} numberOfLines={1}>
          app.finora.vn/scan-invoice
        </Text>
        <View style={styles.mockupLiveBadge}>
          <Text style={styles.mockupLiveText}>OCR AI</Text>
        </View>
      </View>

      <View style={[styles.mockupCardBody, isCompact && styles.mockupCardBodyCompact]}>
        <View style={styles.ocrBox}>
          <View style={styles.ocrReceiptRow}>
            {/* Animated Laser scanning effect bar */}
            <Animated.View
              style={[
                styles.ocrScanLaser,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-4, 38],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={styles.ocrReceiptIcon}>
              <Text style={{ fontSize: 18 }}>🧾</Text>
            </View>
            <View style={styles.ocrReceiptDetails}>
              <View style={styles.ocrReceiptTop}>
                <Text style={styles.ocrReceiptStore}>HÓA ĐƠN SIÊU THỊ CO.OP</Text>
                <View style={styles.ocrStatusSuccess}>
                  <Text style={styles.ocrStatusText}>ĐÃ NHẬN DIỆN</Text>
                </View>
              </View>
              <Text style={styles.ocrReceiptDate}>Hôm nay, 14:35 · 8 món hàng</Text>
            </View>
          </View>

          <View style={styles.ocrResultStrip}>
            <View style={styles.ocrField}>
              <Text style={styles.ocrFieldLabel}>Tổng thanh toán</Text>
              <Text style={styles.ocrFieldValueGreen}>485.000 ₫</Text>
            </View>
            <View style={styles.ocrDividerV} />
            <View style={styles.ocrField}>
              <Text style={styles.ocrFieldLabel}>Danh mục gợi ý</Text>
              <Text style={styles.ocrFieldValueBlue}>Ăn uống & Nhu yếu</Text>
            </View>
          </View>

          <View style={styles.ocrAiHintRow}>
            <Text style={styles.ocrAiHintIcon}>✨</Text>
            <Text style={styles.ocrAiHintText} numberOfLines={1}>
              Finora AI: Tự động ghi chép vào ví chính và gắn nhãn thành công.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CON: SLIDE 3 - MOCKUP DỰ BÁO TÀI CHÍNH (PULSE NODE)
// ─────────────────────────────────────────────────────────────────────────────
function AiForecastMockup({ isCompact }: { isCompact: boolean }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.mockupCard}>
      <View style={styles.mockupTopStrip}>
        <View style={styles.mockupHeaderDots}>
          <View style={[styles.mockupDot, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={styles.mockupUrlText} numberOfLines={1}>
          app.finora.vn/forecast
        </Text>
        <View style={[styles.mockupLiveBadge, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
          <Text style={[styles.mockupLiveText, { color: '#F7D878' }]}>Prophet AI</Text>
        </View>
      </View>

      <View style={[styles.mockupCardBody, isCompact && styles.mockupCardBodyCompact]}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DỰ PHÓNG SỐ DƯ CUỐI THÁNG</Text>
            <Text style={[styles.statValue, isCompact && styles.statValueCompact]}>
              24.780.000 <Text style={styles.statCurrency}>₫</Text>
            </Text>
            <Text style={styles.statSubGreen}>● Xu hướng TĂNG (+3.420.000 ₫)</Text>
          </View>
          <View style={[styles.statBadgeSquare, { backgroundColor: '#D4AF37' }]}>
            <Text style={[styles.statBadgeSquareIcon, { color: '#173D30' }]}>✦</Text>
          </View>
        </View>

        {/* Stock style prediction curve representation */}
        <View style={styles.forecastChartBox}>
          <View style={styles.forecastCurveLine}>
            <View style={[styles.forecastNode, { left: '8%', bottom: '22%' }]} />
            <View style={[styles.forecastNode, { left: '36%', bottom: '42%' }]} />
            <View style={[styles.forecastNode, { left: '68%', bottom: '62%' }]} />
            <Animated.View
              style={[
                styles.forecastNode,
                {
                  left: '92%',
                  bottom: '80%',
                  backgroundColor: '#D4AF37',
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>
          <View style={styles.forecastGridLine} />
          <View style={[styles.forecastGridLine, { top: '50%' }]} />
        </View>

        <View style={styles.aiAdvisorBubble}>
          <Text style={styles.aiAdvisorIcon}>💡</Text>
          <Text style={styles.aiAdvisorText} numberOfLines={2}>
            Bạn hoàn toàn có thể trích 2.000.000 ₫ vào quỹ tiết kiệm mà không ảnh hưởng chi tiêu.
          </Text>
        </View>
      </View>
    </View>
  );
}
