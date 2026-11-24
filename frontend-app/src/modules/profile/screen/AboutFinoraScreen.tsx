import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useAppTheme } from '../../../context/ThemeContext';

interface AboutFinoraScreenProps {
  onBack: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Assets
const TEAM_LOGO = require('../../../assets/team/team-logo.jpg');
const HA_AVATAR = require('../../../assets/team/ha-avatar.png');
const DAT_AVATAR = require('../../../assets/team/dat-avatar.png');
const HUY_AVATAR = require('../../../assets/team/huy-avatar.png');
const FINORA_APP_LOGO = require('../../../assets/finora-logo.png');
const HERO_WAVE_BG = require('../../../assets/profile-bg-wave.jpg');

// 3D Visual Icons
const ICON_AI_ROBOT = require('../../../assets/icons/ai_balance_forecast_robot.png');
const ICON_INVOICE = require('../../../assets/icons/icon_invoice_receipt.png');
const ICON_CALENDAR = require('../../../assets/icons/icon_financial_calendar.png');
const ICON_FAMILY = require('../../../assets/icons/groups/group_family.png');
const ICON_ANALYTICS = require('../../../assets/icons/icon_spending_analysis.png');
const ICON_WALLET = require('../../../assets/icons/icon_accounts_wallet.png');

export function AboutFinoraScreen({ onBack }: AboutFinoraScreenProps) {
  const { isDark, colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'APP' | 'TEAM'>('APP');

  const openDomain = () => {
    Linking.openURL('https://finora.3congian.top').catch(() => {});
  };

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── 1. HEADER CHUẨN NỀN TRẮNG TINH TẾ ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }, isDark && { backgroundColor: themeColors.surface, borderBottomColor: themeColors.cardBorder }]}>
        <Pressable
          onPress={onBack}
          style={[styles.headerIconButton, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          hitSlop={12}
        >
          <FinanceIcon name="chevron-left" size={24} color={isDark ? themeColors.textPrimary : "#0F172A"} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Giới thiệu Finora</Text>
        <Pressable onPress={openDomain} style={[styles.headerWebButton, isDark && { backgroundColor: themeColors.surfaceSubtle }]} hitSlop={8}>
          <FinanceIcon name="globe" size={17} color={isDark ? themeColors.accentGreen : "#047857"} />
        </Pressable>
      </View>

      {/* ── 2. SEGMENT TAB CHUYỂN ĐỔI: VỀ FINORA vs ĐỘI NGŨ ── */}
      <View style={styles.segmentWrap}>
        <View style={[styles.segmentPill, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'APP' && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.segmentBtnActive)]}
            onPress={() => setActiveTab('APP')}
          >
            <FinanceIcon
              name="spark"
              size={15}
              color={activeTab === 'APP' ? (isDark ? themeColors.accentGreen : '#047857') : (isDark ? themeColors.textMuted : '#64748B')}
            />
            <Text
              style={[
                styles.segmentText,
                isDark && { color: themeColors.textSecondary },
                activeTab === 'APP' && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.segmentTextActive),
              ]}
            >
              Nền tảng Finora
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'TEAM' && (isDark ? { backgroundColor: themeColors.surfaceSubtle } : styles.segmentBtnActive)]}
            onPress={() => setActiveTab('TEAM')}
          >
            <FinanceIcon
              name="users"
              size={15}
              color={activeTab === 'TEAM' ? (isDark ? themeColors.accentGreen : '#047857') : (isDark ? themeColors.textMuted : '#64748B')}
            />
            <Text
              style={[
                styles.segmentText,
                isDark && { color: themeColors.textSecondary },
                activeTab === 'TEAM' && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.segmentTextActive),
              ]}
            >
              Đội ngũ phát triển
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================
            TAB 1: GIỚI THIỆU NỀN TẢNG FINORA (TRỌNG TÂM)
            ========================================================= */}
        {activeTab === 'APP' && (
          <View>
            {/* 1.1 HERO BANNER NỀN XANH NGỌC SÓNG LƯỢN HIỆN ĐẠI */}
            <View style={[styles.heroCardContainer, isDark && { borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
              <ImageBackground
                source={HERO_WAVE_BG}
                style={styles.heroBgWave}
                imageStyle={{ borderRadius: 24 }}
                resizeMode="cover"
              >
                <View style={[styles.heroOverlayContent, isDark && { backgroundColor: 'rgba(18, 31, 26, 0.95)' }]}>
                  <View style={[styles.logoBadgeContainer, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                    <Image source={FINORA_APP_LOGO} style={styles.logoImg3D} resizeMode="contain" />
                  </View>
                  <Text style={[styles.heroTitleMain, isDark && { color: '#34D399' }]}>FINORA</Text>
                  <Text style={[styles.heroSubHeading, isDark && { color: themeColors.accentGreen }]}>NỀN TẢNG QUẢN LÝ TÀI CHÍNH THÔNG MINH</Text>
                  
                  <View style={[styles.versionBadgeRow, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                    <Text style={[styles.versionBadgeText, isDark && { color: themeColors.textSecondary }]}>Phiên bản 2.4.0 (Build 2026)</Text>
                  </View>

                  <Text style={[styles.heroDescText, isDark && { color: themeColors.textSecondary }]}>
                    Finora là hệ sinh thái tài chính cá nhân thế hệ mới, tích hợp sâu Trí tuệ nhân tạo (AI Copilot & OCR) và điện toán đám mây thời gian thực, giúp bạn kiểm soát dòng tiền, tự động hóa ghi chép và đưa ra quyết định tài chính tự tin mỗi ngày.
                  </Text>

                  {/* 3 Trụ cột cốt lõi */}
                  <View style={[styles.threePillarsRow, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                    <View style={styles.pillarItem}>
                      <Text style={styles.pillarIcon}>⚡</Text>
                      <Text style={[styles.pillarTitleText, isDark && { color: themeColors.textPrimary }]}>Tức thời</Text>
                      <Text style={[styles.pillarSubText, isDark && { color: themeColors.textSecondary }]}>Quét OCR 2s</Text>
                    </View>
                    <View style={[styles.pillarDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />
                    <View style={styles.pillarItem}>
                      <Text style={styles.pillarIcon}>🤖</Text>
                      <Text style={[styles.pillarTitleText, isDark && { color: themeColors.textPrimary }]}>Thông minh</Text>
                      <Text style={[styles.pillarSubText, isDark && { color: themeColors.textSecondary }]}>Dự báo FinAI</Text>
                    </View>
                    <View style={[styles.pillarDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />
                    <View style={styles.pillarItem}>
                      <Text style={styles.pillarIcon}>🔒</Text>
                      <Text style={[styles.pillarTitleText, isDark && { color: themeColors.textPrimary }]}>Bảo mật</Text>
                      <Text style={[styles.pillarSubText, isDark && { color: themeColors.textSecondary }]}>Chuẩn JWT & 2FA</Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </View>

            {/* 1.2 HỆ THỐNG 6 TÍNH NĂNG ĐỘT PHÁ (THẺ VISUAL CHUYÊN NGHIỆP) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionCategoryTag, isDark && { color: themeColors.accentGreen }]}>HỆ SINH THÁI TÍNH NĂNG</Text>
              <Text style={[styles.sectionMainTitle, isDark && { color: themeColors.textPrimary }]}>Finora Giúp Gì Cho Bạn?</Text>
            </View>

            <View style={styles.featureCardsGrid}>
              {/* Feature 1: Quét hóa đơn */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#ECFDF5' }]}>
                    <Image source={ICON_INVOICE} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>Quét Hóa Đơn AI Tức Thì</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Tự động hóa 100%</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Chụp ảnh hóa đơn giấy hoặc tải ảnh từ thư viện, công nghệ FinAI OCR nhận diện chính xác số tiền, ngày giờ và tự động phân loại danh mục chi tiêu chỉ trong 2 giây.
                </Text>
              </View>

              {/* Feature 2: Dự báo số dư & Copilot */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#EFF6FF' }]}>
                    <Image source={ICON_AI_ROBOT} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>FinAI Copilot & Dự Báo Số Dư</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Học máy Machine Learning</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Thuật toán AI phân tích thói quen chi tiêu trong quá khứ để dự báo dòng tiền 30 ngày tới, cảnh báo sớm nguy cơ thâm hụt và gợi ý lời khuyên tài chính thông minh 24/7.
                </Text>
              </View>

              {/* Feature 3: Lịch tài chính */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#FFFBEB' }]}>
                    <Image source={ICON_CALENDAR} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>Lịch Tài Chính & Nhắc Hẹn</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Định kỳ & Thông báo đẩy</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Quản lý thu chi định kỳ (tiền lương, tiền trọ, đóng bảo hiểm, trả nợ). Tự động tính toán dòng tiền tháng và gửi thông báo nhắc nhở trước ngày thanh toán.
                </Text>
              </View>

              {/* Feature 4: Quỹ nhóm & Gia đình */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#FDF2F8' }]}>
                    <Image source={ICON_FAMILY} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>Quỹ Nhóm & Ví Gia Đình</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Minh bạch & Chia tiền</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Xây dựng quỹ chung cho gia đình, nhóm du lịch hay bạn cùng phòng. Tự động tính toán chia tiền công bằng sau mỗi buổi tiệc và tích hợp ví nhiệm vụ cho con cái.
                </Text>
              </View>

              {/* Feature 5: Phân tích & Báo cáo */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#F5F3FF' }]}>
                    <Image source={ICON_ANALYTICS} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>Báo Cáo & Phân Tích Chuyên Sâu</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Biểu đồ trực quan</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Trực quan hóa cấu trúc chi tiêu qua biểu đồ tròn, so sánh thu chi theo tuần/tháng, theo dõi biến động tài sản ròng và xuất báo cáo dữ liệu định kỳ.
                </Text>
              </View>

              {/* Feature 6: Quản lý ngân sách */}
              <View style={[styles.featureCardPro, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.featureCardTop}>
                  <View style={[styles.iconSquare3D, isDark ? { backgroundColor: themeColors.surfaceSubtle } : { backgroundColor: '#FEF2F2' }]}>
                    <Image source={ICON_WALLET} style={styles.iconImage3D} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureProTitle, isDark && { color: themeColors.textPrimary }]}>Quản Lý Đa Ví & Hạn Mức</Text>
                    <Text style={[styles.featureBadgePro, isDark && { color: themeColors.accentGreen }]}>Cảnh báo bội chi</Text>
                  </View>
                </View>
                <Text style={[styles.featureProDesc, isDark && { color: themeColors.textSecondary }]}>
                  Quản lý nhiều tài khoản (Tiền mặt, Ngân hàng, Ví điện tử) trên một giao diện thống nhất. Đặt hạn mức chi tiêu từng hạng mục với cảnh báo khi chạm mốc 80% - 100%.
                </Text>
              </View>
            </View>

            {/* 1.3 CÔNG NGHỆ ÁP DỤNG TRÊN FINORA */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionCategoryTag, isDark && { color: themeColors.accentGreen }]}>KIẾN TRÚC HỆ THỐNG</Text>
              <Text style={[styles.sectionMainTitle, isDark && { color: themeColors.textPrimary }]}>Nền Tảng Kỹ Thuật Hiện Đại</Text>
            </View>

            <View style={styles.techPillGrid}>
              {[
                { tag: 'Backend', title: 'Spring Boot 3', desc: 'RESTful Micro-services' },
                { tag: 'Frontend', title: 'React Native', desc: 'Cross-platform Engine' },
                { tag: 'Language', title: 'Java 21 LTS', desc: 'High concurrency & speed' },
                { tag: 'Database', title: 'PostgreSQL', desc: 'Relational & ACID data' },
                { tag: 'AI Engine', title: 'OCR & AI Vision', desc: 'Trích xuất hóa đơn tự động' },
                { tag: 'Security', title: 'JWT & 2FA Auth', desc: 'Mã hóa đa lớp an toàn' },
              ].map((item, idx) => (
                <View key={idx} style={[styles.techCardCol, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                  <Text style={[styles.techCardTag, isDark && { color: themeColors.accentGreen }]}>{item.tag}</Text>
                  <Text style={[styles.techCardName, isDark && { color: themeColors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.techCardDesc, isDark && { color: themeColors.textSecondary }]}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =========================================================
            TAB 2: ĐỘI NGŨ PHÁT TRIỂN (NHÓM 3 CON GIÁN - PTIT)
            ========================================================= */}
        {activeTab === 'TEAM' && (
          <View>
            {/* 2.1 BANNER TỔNG QUAN VỀ ĐỘI NGŨ */}
            <View style={[styles.teamHeroCard, isDark && { backgroundColor: themeColors.surface, borderWidth: 1, borderColor: themeColors.cardBorder }]}>
              <View style={styles.teamHeroTopRow}>
                <Image source={TEAM_LOGO} style={[styles.teamLogoBig, isDark && { borderColor: themeColors.cardBorder }]} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <View style={styles.schoolPillTop}>
                    <Text style={styles.schoolPillTopText}>ĐỒ ÁN TỐT NGHIỆP · PTIT</Text>
                  </View>
                  <Text style={styles.teamHeroTitle}>Nhóm 3 Con Gián</Text>
                  <Text style={[styles.teamHeroSchool, isDark && { color: themeColors.accentGreen }]}>
                    Học viện Công nghệ Bưu chính Viễn thông
                  </Text>
                </View>
              </View>

              <Text style={[styles.teamStoryText, isDark && { color: themeColors.textSecondary }]}>
                Lấy cảm hứng từ bộ ba bất tử trong tuổi thơ với tinh thần kiên cường trước mọi thử thách và deadline, 3 kỹ sư CNTT trẻ từ PTIT đã cùng nhau nghiên cứu, thiết kế kiến trúc và hiện thực hóa 100% nền tảng quản lý tài chính Finora.
              </Text>

              {/* 3 Triết lý nổi bật */}
              <View style={styles.tripletValuesRow}>
                <View style={[styles.tripletValueCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <Text style={styles.tripletIcon}>🧬</Text>
                  <Text style={[styles.tripletTitle, isDark && { color: themeColors.textPrimary }]}>Bất Tử</Text>
                  <Text style={[styles.tripletSub, isDark && { color: themeColors.accentGreen }]}>Vượt mọi deadline</Text>
                </View>
                <View style={[styles.tripletValueCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <Text style={styles.tripletIcon}>⚡</Text>
                  <Text style={[styles.tripletTitle, isDark && { color: themeColors.textPrimary }]}>Linh Hoạt</Text>
                  <Text style={[styles.tripletSub, isDark && { color: themeColors.accentGreen }]}>Tối ưu tốc độ</Text>
                </View>
                <View style={[styles.tripletValueCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <Text style={styles.tripletIcon}>🍕</Text>
                  <Text style={[styles.tripletTitle, isDark && { color: themeColors.textPrimary }]}>Đoàn Kết</Text>
                  <Text style={[styles.tripletSub, isDark && { color: themeColors.accentGreen }]}>Chung một đam mê</Text>
                </View>
              </View>
            </View>

            {/* 2.2 PROFILE 3 THÀNH VIÊN VỚI THIẾT KẾ CARD HIỆN ĐẠI */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionCategoryTag, isDark && { color: themeColors.accentGreen }]}>BỘ BA CODER SQUAD</Text>
              <Text style={[styles.sectionMainTitle, isDark && { color: themeColors.textPrimary }]}>Các Thành Viên Tham Gia Dự Án</Text>
            </View>

            <View style={styles.membersStack}>
              {/* 1. NGUYỄN HỮU HÀ */}
              <View style={[styles.memberCardPro, styles.cardProMarky, isDark && { backgroundColor: themeColors.surface, borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
                <View style={styles.leaderBadgePill}>
                  <Text style={styles.leaderBadgePillText}>★ CHỦ ĐẠO DỰ ÁN</Text>
                </View>

                <View style={styles.memberCardProHeader}>
                  <Image source={HA_AVATAR} style={[styles.memberAvatarPro, { borderColor: '#22C55E' }]} />
                  <View style={{ flex: 1, paddingRight: 80 }}>
                    <View style={[styles.charRoleBadge, isDark ? { backgroundColor: 'rgba(34, 197, 94, 0.16)' } : { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.charRoleText, { color: isDark ? '#34D399' : '#059669' }]}>Gầy Cao Xanh · Marky</Text>
                    </View>
                    <Text style={[styles.memberProName, isDark && { color: themeColors.textPrimary }]}>Nguyễn Hữu Hà</Text>
                    <Text style={[styles.memberProRole, isDark && { color: themeColors.accentGreen }]}>
                      Team Leader & Full-Stack Core Engineer
                    </Text>
                  </View>
                </View>

                <Text style={[styles.memberProBio, isDark && { color: themeColors.textSecondary }]}>
                  Là <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>người chủ đạo</Text> dẫn dắt dự án từ A đến Z: Thiết kế toàn bộ kiến trúc lõi hệ thống Spring Boot 3, cơ sở dữ liệu PostgreSQL, phân quyền bảo mật JWT/2FA, điều phối tiến độ và là chốt chặn kỹ thuật cho đồ án tốt nghiệp PTIT.
                </Text>

                <View style={styles.skillsChipGroup}>
                  {['Spring Boot 3', 'Core Full-Stack', 'PostgreSQL', 'Docker & DevOps'].map((s, idx) => (
                    <Text key={idx} style={[styles.skillChipText, isDark && { backgroundColor: themeColors.surfaceSubtle, color: themeColors.textPrimary, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                      {s}
                    </Text>
                  ))}
                </View>

                <View style={[styles.quoteProBox, { borderLeftColor: '#22C55E' }, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <Text style={[styles.quoteProText, isDark && { color: themeColors.textSecondary }]}>
                    “Code bằng tư duy, tối ưu bằng đam mê — dẫn đầu mọi cuộc chơi công nghệ!”
                  </Text>
                </View>
              </View>

              {/* 2. NGUYỄN THỌ ĐẠT */}
              <View style={[styles.memberCardPro, styles.cardProDeeDee, isDark && { backgroundColor: themeColors.surface, borderColor: 'rgba(249, 115, 22, 0.4)' }]}>
                <View style={styles.memberCardProHeader}>
                  <Image source={DAT_AVATAR} style={[styles.memberAvatarPro, { borderColor: '#F97316' }]} />
                  <View style={{ flex: 1 }}>
                    <View style={[styles.charRoleBadge, isDark ? { backgroundColor: 'rgba(249, 115, 22, 0.16)' } : { backgroundColor: '#FFF7ED' }]}>
                      <Text style={[styles.charRoleText, { color: isDark ? '#FB923C' : '#EA580C' }]}>Béo Cam · Dee Dee</Text>
                    </View>
                    <Text style={[styles.memberProName, isDark && { color: themeColors.textPrimary }]}>Nguyễn Thọ Đạt</Text>
                    <Text style={[styles.memberProRole, isDark && { color: '#FB923C' }]}>Frontend & AI Specialist</Text>
                  </View>
                </View>

                <Text style={[styles.memberProBio, isDark && { color: themeColors.textSecondary }]}>
                  Phụ trách nghiên cứu phát triển mảng <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>Frontend & Trí tuệ nhân tạo (AI)</Text>: Xây dựng giao diện tương tác thông minh, tối ưu thuật toán nhận diện quét hóa đơn tự động OCR và tích hợp mô hình FinAI hỗ trợ người dùng.
                </Text>

                <View style={styles.skillsChipGroup}>
                  {['React Native', 'AI Integration', 'OCR Receipt AI', 'UI Components'].map((s, idx) => (
                    <Text key={idx} style={[styles.skillChipText, isDark && { backgroundColor: themeColors.surfaceSubtle, color: themeColors.textPrimary, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                      {s}
                    </Text>
                  ))}
                </View>

                <View style={[styles.quoteProBox, { borderLeftColor: '#F97316' }, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <Text style={[styles.quoteProText, isDark && { color: themeColors.textSecondary }]}>
                    “Giao diện hiện đại kết hợp AI thông minh — bứt phá mọi giới hạn!”
                  </Text>
                </View>
              </View>

              {/* 3. ĐÀO NGỌC HUY */}
              <View style={[styles.memberCardPro, styles.cardProJoey, isDark && { backgroundColor: themeColors.surface, borderColor: 'rgba(168, 85, 247, 0.4)' }]}>
                <View style={styles.memberCardProHeader}>
                  <Image source={HUY_AVATAR} style={[styles.memberAvatarPro, { borderColor: '#A855F7' }]} />
                  <View style={{ flex: 1 }}>
                    <View style={[styles.charRoleBadge, isDark ? { backgroundColor: 'rgba(168, 85, 247, 0.16)' } : { backgroundColor: '#FAF5FF' }]}>
                      <Text style={[styles.charRoleText, { color: isDark ? '#C084FC' : '#7C3AED' }]}>Nhỏ Tím · Joey</Text>
                    </View>
                    <Text style={[styles.memberProName, isDark && { color: themeColors.textPrimary }]}>Đào Ngọc Huy</Text>
                    <Text style={[styles.memberProRole, isDark && { color: '#C084FC' }]}>Frontend & AI Specialist</Text>
                  </View>
                </View>

                <Text style={[styles.memberProBio, isDark && { color: themeColors.textSecondary }]}>
                  Phụ trách mảng <Text style={{ fontWeight: '800', color: isDark ? themeColors.textPrimary : '#0F172A' }}>Frontend & Trí tuệ nhân tạo (AI)</Text>: Trau chuốt từng chi tiết trải nghiệm người dùng, biểu đồ trực quan hóa dữ liệu dòng tiền, tối ưu thuật toán AI và hoàn thiện giao diện ứng dụng mượt mà.
                </Text>

                <View style={styles.skillsChipGroup}>
                  {['Frontend React', 'Data Visualization', 'UX Optimization', 'AI / ML Features'].map((s, idx) => (
                    <Text key={idx} style={[styles.skillChipText, isDark && { backgroundColor: themeColors.surfaceSubtle, color: themeColors.textPrimary, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
                      {s}
                    </Text>
                  ))}
                </View>

                <View style={[styles.quoteProBox, { borderLeftColor: '#A855F7' }, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <Text style={[styles.quoteProText, isDark && { color: themeColors.textSecondary }]}>
                    “Từng pixel phải chỉn chu, mô hình AI phải mượt mà và chuẩn xác!”
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── 3. WEBSITE LINK CARD CHUNG ── */}
        <Pressable
          style={[styles.landingLinkCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
          onPress={openDomain}
        >
          <View style={styles.landingLinkLeft}>
            <View style={[styles.globeIconCircle, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
              <FinanceIcon name="globe" size={18} color={isDark ? '#34D399' : '#047857'} />
            </View>
            <View>
              <Text style={[styles.landingLinkTitle, isDark && { color: themeColors.textPrimary }]}>Trang Giới Thiệu Coder Squad</Text>
              <Text style={[styles.landingLinkSub, isDark && { color: themeColors.textSecondary }]}>finora.3congian.top</Text>
            </View>
          </View>
          <FinanceIcon name="arrow-right" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
        </Pressable>

        {/* ── 4. THÔNG TIN BẢN QUYỀN ── */}
        <View style={styles.copyrightFooter}>
          <Text style={[styles.copyrightText, isDark && { color: themeColors.textSecondary }]}>
            © 2026 Finora · Nhóm 3 Con Gián (PTIT)
          </Text>
          <Text style={[styles.copyrightSubText, isDark && { color: themeColors.textMuted }]}>
            Học viện Công nghệ Bưu chính Viễn thông · Khoa Công Nghệ Thông Tin
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FAFCFB',
    minHeight: 52,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerWebButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* SEGMENT TABS */
  segmentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmentPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#047857',
    fontWeight: '800',
  },

  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  /* HERO CARD */
  heroCardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroBgWave: {
    width: '100%',
  },
  heroOverlayContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: 22,
    alignItems: 'center',
  },
  logoBadgeContainer: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImg3D: {
    width: 86,
    height: 86,
  },
  heroTitleMain: {
    fontSize: 26,
    fontWeight: '900',
    color: '#07543F',
    letterSpacing: 2,
    marginBottom: 3,
  },
  heroSubHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 10,
  },
  versionBadgeRow: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  versionBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  heroDescText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19.5,
    marginBottom: 18,
  },
  threePillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  pillarItem: {
    flex: 1,
    alignItems: 'center',
  },
  pillarIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  pillarTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  pillarSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  pillarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* SECTION HEADINGS */
  sectionHeaderRow: {
    marginBottom: 14,
  },
  sectionCategoryTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionMainTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* FEATURE CARDS PRO */
  featureCardsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  featureCardPro: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  featureCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  iconSquare3D: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage3D: {
    width: 62,
    height: 62,
  },
  featureProTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  featureBadgePro: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1,
  },
  featureProDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18.5,
  },

  /* TECH STACK GRID */
  techPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  techCardCol: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  techCardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  techCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 1,
  },
  techCardDesc: {
    fontSize: 11,
    color: '#64748B',
  },

  /* TEAM HERO CARD */
  teamHeroCard: {
    backgroundColor: '#074838',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  teamHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  teamLogoBig: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  schoolPillTop: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  schoolPillTopText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7DD3FC',
    letterSpacing: 0.5,
  },
  teamHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  teamHeroSchool: {
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 1,
  },
  teamStoryText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 19,
    marginBottom: 16,
  },
  tripletValuesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tripletValueCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tripletIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tripletTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tripletSub: {
    fontSize: 9.5,
    color: '#A7F3D0',
    marginTop: 1,
    textAlign: 'center',
  },

  /* MEMBERS STACK */
  membersStack: {
    gap: 14,
    marginBottom: 20,
  },
  memberCardPro: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardProMarky: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFCFB',
  },
  cardProDeeDee: {
    borderColor: '#FED7AA',
  },
  cardProJoey: {
    borderColor: '#E9D5FF',
  },
  leaderBadgePill: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  leaderBadgePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  memberCardProHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  memberAvatarPro: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  charRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  charRoleText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  memberProName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  memberProRole: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  memberProBio: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18.5,
    marginBottom: 10,
  },
  skillsChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillChipText: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quoteProBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
  },
  quoteProText: {
    fontSize: 11.5,
    color: '#64748B',
    fontStyle: 'italic',
  },

  /* LANDING LINK CARD */
  landingLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  landingLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingLinkTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  landingLinkSub: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    marginTop: 1,
  },

  /* COPYRIGHT */
  copyrightFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  copyrightText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  copyrightSubText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
