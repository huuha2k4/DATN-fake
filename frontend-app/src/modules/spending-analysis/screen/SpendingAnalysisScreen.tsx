import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon, IconName } from '../../core/components/FinanceIcon';
import { useAppTheme } from '../../../context/ThemeContext';
import {
  fetchBehaviorProfile,
  fetchSpendingAnomalies,
  fetchAiRecommendations,
  BehaviorProfileResponse,
  AnomalyItem,
  RecommendationResponse,
  fallbackProfile,
  fallbackAnomalies,
  fallbackRecommendations,
} from '../api';

const { width } = Dimensions.get('window');

type Props = {
  onBack: () => void;
  onNavigateToTab?: (tab: string) => void;
};

type AnalysisTabType = 'overview' | 'spending' | 'anomalies' | 'finai';

const TABS: { id: AnalysisTabType; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Hồ sơ & Chỉ số', icon: 'user' },
  { id: 'spending', label: 'Danh mục', icon: 'layers' },
  { id: 'anomalies', label: 'Bất thường', icon: 'alert-circle' },
  { id: 'finai', label: 'FinAI', icon: 'spark' },
];

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

export function SpendingAnalysisScreen({ onBack, onNavigateToTab }: Props) {
  const initialLoadStarted = useRef(false);
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<AnalysisTabType>('overview');
  const [selectedMonth, setSelectedMonth] = useState('Tháng 11/2026');
  const [isLoading, setIsLoading] = useState(true);

  const [profile, setProfile] = useState<BehaviorProfileResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [totalScanned, setTotalScanned] = useState<number>(152);
  const [riskLevel, setRiskLevel] = useState<string>('Thấp');
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profData, anomData, recData] = await Promise.allSettled([
        fetchBehaviorProfile(),
        fetchSpendingAnomalies(),
        fetchAiRecommendations(),
      ]);

      if (profData.status === 'fulfilled' && profData.value) {
        setProfile(profData.value);
      } else {
        setProfile(fallbackProfile);
      }

      if (anomData.status === 'fulfilled' && anomData.value) {
        setAnomalies(anomData.value.anomalies);
        setTotalScanned(anomData.value.total_scanned);
        setRiskLevel(anomData.value.risk_level);
      } else {
        setAnomalies(fallbackAnomalies);
        setTotalScanned(152);
        setRiskLevel('Thấp');
      }

      if (recData.status === 'fulfilled' && recData.value) {
        setRecommendations(recData.value);
      } else {
        setRecommendations(fallbackRecommendations);
      }
    } catch (err) {
      console.warn('Spending analysis load error:', err);
      setProfile(fallbackProfile);
      setAnomalies(fallbackAnomalies);
      setRecommendations(fallbackRecommendations);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    loadData();
  }, []);

  const handleShare = async () => {
    if (!profile || !recommendations) return;
    try {
      await Share.share({
        message: `FinAI Phân tích chi tiêu ${selectedMonth}: Persona "${profile.persona.title}", Tỷ lệ tiết kiệm ${profile.rule_50_30_20.savings_pct}%, Điểm sức khỏe tài chính: ${recommendations.health_score}/100.`,
      });
    } catch {
      // ignore
    }
  };

  const persona = profile?.persona;
  const dining = profile?.dining_analysis;
  const r50 = profile?.rule_50_30_20;
  const findings = profile?.findings || [];
  const categories = profile?.top_categories || [];

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      {/* 1. TOP HEADER */}
      <View
        style={[
          styles.topHeader,
          { paddingTop: Math.max(insets.top + 6, 16) },
          isDark && { backgroundColor: themeColors.background },
        ]}
      >
        <View style={styles.headerLeftCol}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={[styles.backBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <FinanceIcon name="chevron-left" size={24} color={isDark ? themeColors.accentGreen : "#087557"} />
          </Pressable>
          <Text style={[styles.screenTitle, isDark && { color: themeColors.textPrimary }]}>Phân tích chi tiêu</Text>
        </View>

        <Pressable
          onPress={loadData}
          hitSlop={12}
          style={[styles.refreshHeaderBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="Làm mới phân tích"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isDark ? themeColors.accentGreen : "#087557"} />
          ) : (
            <FinanceIcon name="refresh" size={19} color={isDark ? themeColors.accentGreen : "#087557"} />
          )}
        </Pressable>
      </View>

      {/* 2. 4-SEGMENT NAVIGATION TAB BAR */}
      <View style={[styles.tabBarWrapper, isDark && { backgroundColor: themeColors.background }]}>
        <View style={[styles.tabBar, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <FinanceIcon
                  name={tab.icon}
                  size={14}
                  color={isActive ? (isDark ? themeColors.accentGreen : '#087557') : (isDark ? themeColors.textMuted : '#64748B')}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isDark && { color: themeColors.textSecondary },
                    isActive && styles.tabLabelActive,
                    isActive && isDark && { color: themeColors.accentGreen },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={[styles.activeTabIndicator, isDark && { backgroundColor: themeColors.accentGreen }]} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* MAIN CONTENT AREA */}
      {isLoading || !profile || !recommendations ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIconBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
            <ActivityIndicator size="large" color={isDark ? themeColors.accentGreen : "#087557"} />
          </View>
          <Text style={[styles.loadingTitle, isDark && { color: themeColors.textPrimary }]}>FinAI đang phân tích chi tiêu...</Text>
          <Text style={[styles.loadingSubtitle, isDark && { color: themeColors.textSecondary }]}>
            Hệ thống đang trích xuất dữ liệu giao dịch thực tế, đối soát quy tắc 50/30/20 và quét phát hiện bất thường qua Isolation Forest.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contentScroll,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ==================== TAB 1: HỒ SƠ & CHỈ SỐ ==================== */}
          {activeTab === 'overview' && persona && dining && r50 && (
          <View style={styles.tabContentContainer}>
            {/* PERSONA HERO CARD */}
            <ImageBackground
              source={require('../../../assets/icons/groups/family_banner_clean_bg.png')}
              style={styles.personaCard}
              imageStyle={styles.personaBannerBgImage}
              resizeMode="cover"
            >
              <View style={styles.personaLeft}>
                <View style={styles.personaBadge}>
                  <Text style={styles.personaBadgeText}>Persona tài chính</Text>
                </View>
                <Text style={styles.personaTitle}>{persona.title}</Text>
                <Text style={styles.personaDescription}>
                  {persona.description || persona.tagline}
                </Text>
              </View>

              <View style={styles.personaRight}>
                <Image
                  source={require('../../../assets/icons/spending_persona_chart_3d.png')}
                  style={styles.personaIllustration}
                  resizeMode="contain"
                />
              </View>
            </ImageBackground>

            {/* ĐẶC TRƯNG THÓI QUEN CHI TIÊU CARD */}
            <View style={[styles.cardBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.sparkleIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <FinanceIcon name="spark" size={16} color={isDark ? themeColors.accentGreen : "#087557"} />
                </View>
                <Text style={[styles.cardTitle, isDark && { color: themeColors.textPrimary }]}>Đặc trưng thói quen chi tiêu</Text>
              </View>

              <View style={styles.findingsList}>
                {findings.map((item, idx) => (
                  <View key={idx} style={[styles.findingPill, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                    <View style={[styles.findingDot, isDark && { backgroundColor: themeColors.accentGreen }]} />
                    <Text style={[styles.findingText, isDark && { color: themeColors.textPrimary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 3 KPI METRIC CARDS ROW */}
            <View style={styles.kpiRow}>
              {/* Thẻ 1: Chi tiêu ăn uống */}
              <View style={[styles.kpiCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={[styles.kpiIconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2' }]}>
                  <FinanceIcon name="utensils" size={16} color="#EF4444" />
                </View>
                <Text style={[styles.kpiLabel, isDark && { color: themeColors.textSecondary }]}>Chi tiêu ăn uống</Text>
                <Text style={[styles.kpiMainValue, isDark && { color: themeColors.textPrimary }]}>{formatVND(dining.dining_amount)}</Text>
                <View style={styles.kpiBottomArea}>
                  <Text style={[styles.kpiSubText, isDark && { color: themeColors.textMuted }]}>
                    Chiếm <Text style={{ color: '#EF4444', fontWeight: '700' }}>{dining.dining_percentage}%</Text> tổng chi tiêu
                  </Text>
                  <View style={[styles.kpiProgressBarTrack, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                    <View
                      style={[
                        styles.kpiProgressBarFill,
                        {
                          width: `${Math.min(100, Math.max(15, dining.dining_percentage * 2))}%`,
                          backgroundColor: '#EF4444',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Thẻ 2: Quy tắc 50/30/20 */}
              <View style={[styles.kpiCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={[styles.kpiIconBox, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#E0F2FE' }]}>
                  <FinanceIcon name="bolt" size={16} color="#38BDF8" />
                </View>
                <Text style={[styles.kpiLabel, isDark && { color: themeColors.textSecondary }]}>Quy tắc 50/30/20</Text>
                <View style={styles.kpiValueWithUnit}>
                  <Text style={[styles.kpiMainValue, isDark && { color: themeColors.textPrimary }]}>{r50.savings_pct}%</Text>
                  <Text style={[styles.kpiValueUnit, isDark && { color: themeColors.textMuted }]}>Tích lũy</Text>
                </View>
                <View style={styles.kpiBottomArea}>
                  <View style={styles.multiSegmentBar}>
                    <View style={[styles.barSegment, { flex: r50.needs_pct || 18, backgroundColor: '#087557' }]} />
                    <View style={[styles.barSegment, { flex: r50.wants_pct || 15, backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.barSegment, { flex: r50.savings_pct || 67, backgroundColor: '#38BDF8' }]} />
                  </View>
                </View>
              </View>

              {/* Thẻ 3: Sức khỏe tài chính */}
              <View style={[styles.kpiCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={[styles.kpiIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#DCFCE7' }]}>
                  <FinanceIcon name="shield" size={16} color={isDark ? themeColors.accentGreen : "#087557"} />
                </View>
                <Text style={[styles.kpiLabel, isDark && { color: themeColors.textSecondary }]}>Sức khỏe tài chính</Text>
                <Text style={[styles.kpiMainValue, { color: isDark ? themeColors.accentGreen : '#087557' }]}>
                  {recommendations.health_score}/100
                </Text>
                <View style={styles.kpiBottomArea}>
                  <Text style={[styles.kpiRatingText, isDark && { color: themeColors.textMuted }]}>
                    Đánh giá: <Text style={{ fontWeight: '700', color: isDark ? themeColors.textPrimary : undefined }}>{recommendations.health_rating || 'Rất Tốt ☀️'}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* TỔNG QUAN TỪ FINAI BANNER AT BOTTOM */}
            <Pressable
              style={[styles.finaiBannerCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}
              onPress={() => setActiveTab('finai')}
            >
              <View style={[styles.finaiBotIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                <FinanceIcon name="spark" size={18} color={isDark ? themeColors.accentGreen : "#087557"} />
              </View>
              <View style={styles.finaiBannerBody}>
                <Text style={[styles.finaiBannerTitle, isDark && { color: themeColors.textPrimary }]}>Tổng quan từ FinAI</Text>
                <Text style={[styles.finaiBannerDesc, isDark && { color: themeColors.textSecondary }]}>
                  {recommendations.overall_advice || 'Bạn đang duy trì thói quen chi tiêu kỷ luật, tỷ lệ tiết kiệm tốt và ít rủi ro tài chính.'}
                </Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color={isDark ? themeColors.textMuted : "#94A3B8"} />
            </Pressable>
          </View>
        )}

        {/* ==================== TAB 2: DANH MỤC ==================== */}
        {activeTab === 'spending' && (
          <View style={styles.tabContentContainer}>
            <View style={[styles.cardBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              {/* Category section title */}
              <View style={styles.categoryHeader}>
                <View style={[styles.trendIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <FinanceIcon name="trend" size={18} color={isDark ? themeColors.accentGreen : "#087557"} />
                </View>
                <Text style={[styles.categoryHeaderTitle, isDark && { color: themeColors.textPrimary }]}>
                  Phân bổ chi tiêu theo{'\n'}danh mục thực tế
                </Text>
              </View>

              {/* Category Items List */}
              <View style={styles.categoryList}>
                {categories.map((cat, idx) => {
                  let iconName: IconName = 'wallet';
                  let iconBg = isDark ? 'rgba(52, 211, 153, 0.16)' : '#ECFDF5';
                  let iconColor = isDark ? themeColors.accentGreen : '#087557';

                  if (cat.category_name.includes('Ăn uống')) {
                    iconName = 'utensils';
                    iconBg = isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7';
                    iconColor = isDark ? '#FBBF24' : '#D97706';
                  } else if (cat.category_name.includes('Tiết kiệm') || cat.category_name.includes('đầu tư')) {
                    iconName = 'piggy-bank';
                    iconBg = isDark ? 'rgba(234, 179, 8, 0.16)' : '#FEF9C3';
                    iconColor = isDark ? '#FACC15' : '#CA8A04';
                  } else if (cat.category_name.includes('Trả nợ') || cat.category_name.includes('xe')) {
                    iconName = 'car';
                    iconBg = isDark ? 'rgba(2, 132, 199, 0.16)' : '#E0F2FE';
                    iconColor = isDark ? '#38BDF8' : '#0284C7';
                  } else if (cat.category_name.includes('Gia đình') || cat.category_name.includes('Con')) {
                    iconName = 'users';
                    iconBg = isDark ? 'rgba(147, 51, 234, 0.16)' : '#F3E8FF';
                    iconColor = isDark ? '#C084FC' : '#9333EA';
                  }

                  return (
                    <View key={idx} style={[styles.categoryItem, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                      <View style={[styles.categoryIconSquare, { backgroundColor: iconBg }]}>
                        <FinanceIcon name={iconName} size={22} color={iconColor} />
                      </View>

                      <View style={styles.categoryInfo}>
                        <View style={styles.categoryTopRow}>
                          <Text style={[styles.categoryNameText, isDark && { color: themeColors.textPrimary }]}>{cat.category_name}</Text>
                          <View style={styles.categoryValuesRow}>
                            <Text style={[styles.categoryPctText, isDark && { color: themeColors.textSecondary }]}>{cat.percentage}%</Text>
                            <Text style={[styles.categoryAmountText, isDark && { color: themeColors.textPrimary }]}>{formatVND(cat.total_amount)}</Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.categoryTrack, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                          <View
                            style={[
                              styles.categoryFill,
                              {
                                width: `${Math.min(100, Math.max(8, cat.percentage * 2.2))}%`,
                                backgroundColor: isDark ? themeColors.accentGreen : '#087557',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 3: BẤT THƯỜNG ==================== */}
        {activeTab === 'anomalies' && (
          <View style={styles.tabContentContainer}>
            {/* Header info card */}
            <View style={[styles.anomalyHeaderRow, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <View style={[styles.anomalyRedIconBox, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <FinanceIcon name="arrow-down" size={18} color="#F87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.anomalyMainTitle, isDark && { color: themeColors.textPrimary }]}>
                  Phát hiện giao dịch bất thường (Isolation Forest)
                </Text>
                <Text style={[styles.anomalySubTitle, isDark && { color: themeColors.textSecondary }]}>
                  Quét toàn bộ lịch sử chi tiêu để phát hiện giao dịch đột biến.
                </Text>
              </View>
            </View>

            {/* Anomaly Alerts List */}
            {anomalies.map((anom, idx) => {
              let formattedDate = anom.date;
              if (anom.date && anom.date.includes(' ')) {
                const parts = anom.date.split(' ');
                if (parts.length >= 2) {
                  formattedDate = `${parts[1]} ${parts[0]}`;
                }
              }

              return (
                <View key={anom.transaction_id || idx} style={[styles.anomalyCard, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' }]}>
                  <View style={styles.anomalyCardTop}>
                    <View style={styles.severityBadge}>
                      <Text style={styles.severityBadgeText}>{anom.severity}</Text>
                    </View>
                    <Text style={[styles.anomalyAmountHead, isDark && { color: themeColors.textPrimary }]}>
                      {anom.category}: {formatVND(anom.amount)}
                    </Text>
                    {formattedDate ? (
                      <Text style={[styles.anomalyDateInlineText, isDark && { color: themeColors.textMuted }]}>({formattedDate})</Text>
                    ) : null}
                  </View>

                  <Text style={[styles.anomalyExplText, isDark && { color: themeColors.textSecondary }]}>{anom.explanation}</Text>
                </View>
              );
            })}

            {/* Summary Box: Tóm tắt phát hiện */}
            <View style={[styles.summaryBox, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <View style={[styles.summaryTitlePill, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                <Text style={[styles.summaryTitleText, isDark && { color: themeColors.accentGreen }]}>Tóm tắt phát hiện</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItemLeft}>
                  <View style={[styles.summaryItemIcon, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : '#ECFDF5' }]}>
                    <FinanceIcon name="calendar" size={15} color={isDark ? themeColors.accentGreen : "#087557"} />
                  </View>
                  <Text style={[styles.summaryItemLabel, isDark && { color: themeColors.textSecondary }]}>Tổng giao dịch quét</Text>
                </View>
                <Text style={[styles.summaryItemValue, isDark && { color: themeColors.textPrimary }]}>{totalScanned}</Text>
              </View>

              <View style={[styles.summaryDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryItemLeft}>
                  <View style={[styles.summaryItemIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2' }]}>
                    <FinanceIcon name="alert-circle" size={15} color="#EF4444" />
                  </View>
                  <Text style={[styles.summaryItemLabel, isDark && { color: themeColors.textSecondary }]}>Giao dịch bất thường</Text>
                </View>
                <Text style={[styles.summaryItemValue, isDark && { color: themeColors.textPrimary }]}>{anomalies.length}</Text>
              </View>

              <View style={[styles.summaryDivider, isDark && { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryItemLeft}>
                  <View style={[styles.summaryItemIcon, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#E0F2FE' }]}>
                    <FinanceIcon name="info" size={15} color="#38BDF8" />
                  </View>
                  <Text style={[styles.summaryItemLabel, isDark && { color: themeColors.textSecondary }]}>Mức độ rủi ro</Text>
                </View>
                <View style={[styles.riskPill, riskLevel !== 'Thấp' && { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }, isDark && riskLevel === 'Thấp' && { backgroundColor: 'rgba(52, 211, 153, 0.16)' }]}>
                  <Text style={[styles.riskPillText, riskLevel !== 'Thấp' && { color: '#FBBF24' }, isDark && riskLevel === 'Thấp' && { color: themeColors.accentGreen }]}>
                    {riskLevel}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 4: FINAI ==================== */}
        {activeTab === 'finai' && (
          <View style={styles.tabContentContainer}>
            {/* HERO BANNER WITH ROBOT MASCOT */}
            <ImageBackground
              source={require('../../../assets/icons/groups/family_banner_clean_bg.png')}
              style={styles.finaiHeroBanner}
              imageStyle={styles.personaBannerBgImage}
              resizeMode="cover"
            >
              <View style={styles.finaiHeroLeft}>
                <View style={styles.finaiHeroBadge}>
                  <Text style={styles.finaiHeroBadgeText}>Gợi ý & Tư vấn</Text>
                </View>
                <Text style={styles.finaiHeroTitle}>Khuyến nghị từ FinAI</Text>
                <Text style={styles.finaiHeroSubtitle}>
                  Giải pháp tối ưu chi tiêu, tăng tiết kiệm và cải thiện sức khỏe tài chính.
                </Text>
              </View>

              <View style={styles.finaiHeroRight}>
                <Image
                  source={require('../../../assets/icons/spending_finai_robot_3d.png')}
                  style={styles.finaiRobotImg}
                  resizeMode="contain"
                />
              </View>
            </ImageBackground>

            {/* SAVINGS POTENTIAL ESTIMATION CARD */}
            <View style={[styles.potentialCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <View style={styles.potentialLeft}>
                <View style={[styles.potentialIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.12)' }]}>
                  <FinanceIcon name="wallet" size={20} color={isDark ? themeColors.accentGreen : "#087557"} />
                </View>
                <View>
                  <Text style={[styles.potentialLabel, isDark && { color: themeColors.textSecondary }]}>Tiềm năng tiết kiệm ước tính</Text>
                  <Text style={[styles.potentialAmount, isDark && { color: themeColors.accentGreen }]}>
                    +{formatVND(recommendations.total_monthly_potential_savings)}/tháng
                  </Text>
                </View>
              </View>

              <View style={[styles.potentialBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)' }]}>
                <FinanceIcon name="trend" size={12} color={isDark ? themeColors.accentGreen : "#087557"} />
                <Text style={[styles.potentialBadgeText, isDark && { color: themeColors.accentGreen }]}>+3.1%</Text>
              </View>
            </View>

            {/* SECTION TITLE: CÁC KHUYẾN NGHỊ CHÍNH */}
            <Text style={[styles.recSectionTitle, isDark && { color: themeColors.textPrimary }]}>Các khuyến nghị chính</Text>

            {/* RECOMMENDATION CARDS */}
            {recommendations.recommendations.map((rec, rIdx) => (
              <View key={rec.id || rIdx} style={[styles.recCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                <View style={styles.recHeaderRow}>
                  <View style={[styles.recChipIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.12)' }]}>
                    <FinanceIcon name="spark" size={18} color={isDark ? themeColors.accentGreen : "#087557"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.recTitleLine}>
                      <Text style={[styles.recCardTitle, isDark && { color: themeColors.textPrimary }]}>{rec.title}</Text>
                      {rec.priority && (
                        <View style={[styles.recPriorityBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)', borderColor: 'rgba(52, 211, 153, 0.25)' }]}>
                          <Text style={[styles.recPriorityBadgeText, isDark && { color: themeColors.accentGreen }]}>{rec.priority}</Text>
                        </View>
                      )}
                      <FinanceIcon name="chevron-right" size={16} color={isDark ? themeColors.textMuted : "#94A3B8"} />
                    </View>
                  </View>
                </View>

                {rec.explanation ? (
                  <Text style={[styles.recExplanationText, isDark && { color: themeColors.textSecondary }]}>{rec.explanation}</Text>
                ) : null}

                {/* Action bullet steps */}
                {rec.action_steps && rec.action_steps.length > 0 && (
                  <View style={styles.recStepsList}>
                    {rec.action_steps.map((step, sIdx) => (
                      <View key={sIdx} style={styles.recStepItem}>
                        <View style={[styles.recStepGreenDot, isDark && { backgroundColor: themeColors.accentGreen }]} />
                        <Text style={[styles.recStepText, isDark && { color: themeColors.textPrimary }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Footer Quote Pill */}
                {rec.summary ? (
                  <View style={[styles.recFooterPill, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                    <View style={[styles.targetIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                      <FinanceIcon name="target" size={16} color={isDark ? themeColors.accentGreen : "#087557"} />
                    </View>
                    <Text style={[styles.recFooterText, isDark && { color: themeColors.accentGreen }]}>{rec.summary}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Loading State */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  loadingIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },

  /* Tab Bar */
  tabBarWrapper: {
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 3,
    position: 'relative',
  },
  tabItemActive: {
    // Keep transparent background like original design
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#087557',
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#087557',
    fontWeight: '700',
  },

  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabContentContainer: {
    gap: 12,
  },

  /* Persona Hero Card */
  personaCard: {
    borderRadius: 20,
    backgroundColor: '#0E964E',
    paddingLeft: 16,
    paddingRight: 0,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 116,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  personaBannerBgImage: {
    borderRadius: 20,
    resizeMode: 'cover',
  },
  personaLeft: {
    flex: 1,
    paddingRight: 4,
    zIndex: 2,
  },
  personaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 5,
  },
  personaBadgeText: {
    color: '#E8F5E9',
    fontSize: 9.5,
    fontWeight: '700',
  },
  personaTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  personaDescription: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 10,
    lineHeight: 14.5,
  },
  personaRight: {
    width: 155,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    zIndex: 1,
  },
  personaIllustration: {
    width: 168,
    height: 136,
  },

  /* Card Box Generic */
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sparkleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  findingsList: {
    gap: 8,
  },
  findingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  findingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#087557',
  },
  findingText: {
    fontSize: 11.5,
    color: '#334155',
    flex: 1,
  },

  /* KPI Cards Row */
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
    justifyContent: 'space-between',
    minHeight: 126,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  kpiMainValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiValueWithUnit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  kpiValueUnit: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  kpiBottomArea: {
    marginTop: 'auto',
    justifyContent: 'flex-end',
  },
  kpiSubText: {
    fontSize: 8.5,
    color: '#64748B',
    marginBottom: 6,
  },
  kpiRatingText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
  },
  kpiProgressBarTrack: {
    height: 3.5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  kpiProgressBarFill: {
    height: 3.5,
    borderRadius: 2,
  },
  multiSegmentBar: {
    flexDirection: 'row',
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    gap: 1.5,
  },
  barSegment: {
    height: '100%',
  },

  /* Bottom FinAI Banner on Tab 1 */
  finaiBannerCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  finaiBotIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finaiBannerBody: {
    flex: 1,
  },
  finaiBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087557',
    marginBottom: 2,
  },
  finaiBannerDesc: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 15,
  },

  /* TAB 2: Categories */
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  trendIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  categoryList: {
    marginTop: 18,
    gap: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryIconSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  categoryNameText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryValuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  categoryPctText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
  },
  categoryAmountText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  categoryTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: 7,
    borderRadius: 4,
  },

  /* TAB 3: Anomalies */
  anomalyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  anomalyRedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anomalyMainTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  anomalySubTitle: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
  },
  anomalyCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
  },
  anomalyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  severityBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  anomalyAmountHead: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  anomalyDateInlineText: {
    fontSize: 10,
    color: '#64748B',
  },
  anomalyDateText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  anomalyExplText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitlePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  summaryTitleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#087557',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryItemIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#334155',
  },
  summaryItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  riskPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087557',
  },

  /* TAB 4: FinAI */
  finaiHeroBanner: {
    borderRadius: 20,
    backgroundColor: '#0E964E',
    paddingLeft: 16,
    paddingRight: 0,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 116,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  finaiHeroLeft: {
    flex: 1,
    paddingRight: 4,
    zIndex: 2,
  },
  finaiHeroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 5,
  },
  finaiHeroBadgeText: {
    color: '#E8F5E9',
    fontSize: 9.5,
    fontWeight: '700',
  },
  finaiHeroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  finaiHeroSubtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 10,
    lineHeight: 14.5,
  },
  finaiHeroRight: {
    width: 155,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    zIndex: 1,
  },
  finaiRobotImg: {
    width: 168,
    height: 136,
  },

  potentialCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  potentialLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  potentialIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potentialLabel: {
    fontSize: 10.5,
    color: '#334155',
  },
  potentialAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#087557',
  },
  potentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  potentialBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#087557',
  },

  recSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  recCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recChipIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  recPriorityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recPriorityBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#087557',
  },
  recExplanationText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 8,
  },
  recStepsList: {
    marginTop: 10,
    gap: 8,
  },
  recStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recStepGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#087557',
    marginTop: 5,
  },
  recStepText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 15,
    flex: 1,
  },
  recFooterPill: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recFooterText: {
    fontSize: 10.5,
    color: '#087557',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
});
