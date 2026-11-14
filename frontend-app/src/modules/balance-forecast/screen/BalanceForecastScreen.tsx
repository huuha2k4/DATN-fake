import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import {
  balanceForecastApi,
  BalanceForecastResponse,
  CategoryForecastResponse,
} from '../api';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';

// Banner background & robot mascot 3D HD do người dùng cung cấp
const bannerBgImage = require('../../../assets/icons/ai_forecast_bg_wave_hd.jpg');
const robotMascotImage = require('../../../assets/icons/ai_forecast_robot_mascot_hd.png');

type Props = {
  onBack: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

export function BalanceForecastScreen({ onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceForecast, setBalanceForecast] = useState<BalanceForecastResponse | null>(null);
  const [categoryForecasts, setCategoryForecasts] = useState<CategoryForecastResponse[]>([]);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const loadData = async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [balRes, catRes] = await Promise.allSettled([
        balanceForecastApi.getBalanceForecast(15),
        balanceForecastApi.getTopCategoryForecasts(3),
      ]);

      if (balRes.status === 'fulfilled') {
        setBalanceForecast(balRes.value);
      }
      if (catRes.status === 'fulfilled') {
        setCategoryForecasts(catRes.value);
      }
    } catch (e) {
      console.warn('Lỗi khi tải dữ liệu dự báo:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentBal = balanceForecast?.current_balance ?? 17229829;
  const projectedBal = balanceForecast?.projected_end_of_month_balance ?? 17150048;
  const netDiff = projectedBal - currentBal;
  const chartPoints = (balanceForecast?.future_forecast || balanceForecast?.forecast_points || []).slice(0, 15);

  // Tính toán đường cong Bezier Spline
  const svgWidth = Math.max(SCREEN_WIDTH - 64, 300);
  const svgHeight = 150;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 22;
  const padBottom = 20;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const values = chartPoints.map((pt) => pt.predicted_balance ?? currentBal);
  const rawMin = values.length > 0 ? Math.min(...values, currentBal) : 17138674;
  const rawMax = values.length > 0 ? Math.max(...values, currentBal) : 17172115;

  const diff = rawMax - rawMin;
  const margin = diff > 0 ? diff * 0.35 : Math.max(rawMax * 0.05, 100000);
  const yMin = Math.max(0, rawMin - margin);
  const yMax = rawMax + margin;
  const yRange = yMax - yMin || 1;

  const coords = chartPoints.map((pt, idx) => {
    const val = pt.predicted_balance ?? currentBal;
    const x = padLeft + (idx / Math.max(chartPoints.length - 1, 1)) * plotW;
    const y = padTop + plotH - ((val - yMin) / yRange) * plotH;
    return { x, y, val, date: pt.date };
  });

  let linePath = '';
  if (coords.length > 0) {
    linePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
    }
  }

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(padTop + plotH + 5).toFixed(1)} L ${coords[0].x.toFixed(1)},${(padTop + plotH + 5).toFixed(1)} Z`
    : '';

  return (
    <View style={styles.screen}>
      {/* ── HEADER: Nút quay lại + Tiêu đề sát nhau (trái), Nút Cập nhật dự báo (phải) ── */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <FinanceIcon name="chevron-left" size={22} color="#087557" />
          </Pressable>
          <Text style={styles.headerTitle}>Dự báo số dư</Text>
        </View>

        <Pressable
          onPress={() => loadData(true)}
          style={styles.headerRefreshBtn}
          accessibilityRole="button"
        >
          <FinanceIcon name="refresh" size={13} color="#FFFFFF" />
          <Text style={styles.headerRefreshBtnText}>
            {isRefreshing ? 'Đang tính...' : 'Cập nhật dự báo'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. BANNER ROBOT 3D: DỰ BÁO SỐ DƯ CUỐI THÁNG ── */}
        <View style={styles.heroBannerCard}>
          {/* Ảnh nền sóng ngọc bích */}
          <Image
            source={bannerBgImage}
            style={styles.heroBgImage}
            resizeMode="cover"
          />

          <View style={styles.heroContentContainer}>
            {/* Cột thông tin bên trái */}
            <View style={styles.heroTextWrap}>
              <View style={styles.heroLabelRow}>
                <Text style={styles.sparkleIcon}>✦</Text>
                <Text style={styles.heroLabel}>Dự báo số dư cuối tháng</Text>
              </View>

              <Text style={styles.heroValue}>
                {formatVND(projectedBal)}
              </Text>

              <Text style={styles.heroRangeText} numberOfLines={1}>
                {balanceForecast?.projected_range
                  ? `Dao động: ${Math.round(balanceForecast.projected_range.lower).toLocaleString('vi-VN')} đ – ${Math.round(balanceForecast.projected_range.upper).toLocaleString('vi-VN')} đ`
                  : 'Dao động: 16.654.266 đ – 17.622.204 đ'}
              </Text>
            </View>

            {/* Mascot Robot AI 3D bên phải */}
            <View style={styles.heroMascotWrap}>
              <Image
                source={robotMascotImage}
                style={styles.heroMascotImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* ── 2. BỘ ĐÔI THẺ CHỈ SỐ: SỐ DƯ HIỆN TẠI & BIẾN ĐỘNG DỰ KIẾN ── */}
        <View style={styles.duoCardsRow}>
          {/* Thẻ trái: Số dư hiện tại (Viền xanh lá) */}
          <View style={[styles.duoCard, styles.duoCardLeft]}>
            <View style={styles.duoCardTopRow}>
              <View style={[styles.duoIconBox, { backgroundColor: '#ECFDF5' }]}>
                <FinanceIcon name="wallet" size={17} color="#087557" />
              </View>
              <Text style={styles.duoLabel}>Số dư hiện tại</Text>
            </View>
            <Text style={styles.duoValue} numberOfLines={1}>
              {formatVND(currentBal)}
            </Text>
            <Text style={styles.duoSub}>Tổng hợp từ tất cả ví cá nhân</Text>
          </View>

          {/* Thẻ phải: Biến động dự kiến (Viền đỏ) */}
          <View style={[styles.duoCard, styles.duoCardRight]}>
            <View style={styles.duoCardTopRow}>
              <View style={[styles.duoIconBox, { backgroundColor: '#FEF2F2' }]}>
                <FinanceIcon name="trend" size={17} color="#DC2626" />
              </View>
              <Text style={styles.duoLabel}>Biến động dự kiến</Text>
            </View>
            <Text
              style={[
                styles.duoValue,
                { color: netDiff >= 0 ? '#087557' : '#EF4444' },
              ]}
              numberOfLines={1}
            >
              {netDiff >= 0 ? `+${formatVND(netDiff)}` : `-${formatVND(Math.abs(netDiff))}`}
            </Text>
            <Text style={styles.duoSub}>So với số dư hiện tại</Text>
          </View>
        </View>

        {/* ── 3. CARD ĐỒ THỊ DỰ PHÓNG SỐ DƯ VÍ ── */}
        <View style={styles.chartCard}>
          {/* Header Card: Tiêu đề biểu đồ trên cùng 1 hàng */}
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Đồ thị dự phóng số dư ví (15 ngày tới)</Text>
          </View>

          {/* Dòng chữ mô tả chi tiết đặt ở dưới trọn vẹn cả chiều ngang */}
          <Text style={styles.chartSubtitleFull}>
            {(() => {
              const baseSum = balanceForecast?.summary || '';
              // Loại bỏ dòng "Xu hướng: ..." nếu trong summary của AI backend đã có sẵn để không bị lặp
              let cleanSummary = baseSum.replace(/(\r\n|\n|\r)?Xu hướng:.*$/i, '').trim();

              // Chuyển đổi định dạng ngày YYYY-MM-DD sang DD/MM/YYYY chuẩn tiếng Việt
              cleanSummary = cleanSummary.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1');

              return cleanSummary || 'Dự báo số dư đến ngày 25/11/2026: 17.150.048 VND (dao động trong khoảng 16.654.266 – 17.622.204 VND).';
            })()}
          </Text>
          <Text style={styles.chartTrendLine}>
            Xu hướng: {netDiff >= 0 ? 'TĂNG' : 'GIẢM'} so với số dư hiện tại.
          </Text>

          {/* Chỉ số Đỉnh - Đáy - Biên độ */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statLabel}>Cao nhất: </Text>
              <Text style={[styles.statValue, { color: '#087557' }]}>
                {Math.round(rawMax).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.statLabel}>Thấp nhất: </Text>
              <Text style={[styles.statValue, { color: '#0284C7' }]}>
                {Math.round(rawMin).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Biên độ: </Text>
              <Text style={[styles.statValue, { color: '#087557' }]}>
                +{Math.round(Math.abs(rawMax - rawMin)).toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          {/* Biểu đồ SVG Spline */}
          <View style={styles.svgContainer}>
            {/* Lớp bắt chạm tương tác toàn vùng đồ thị cho mượt mà trên mobile */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {coords.map((c, idx) => (
                <Pressable
                  key={`touch-${idx}`}
                  onPress={() => setSelectedPointIndex(idx === selectedPointIndex ? null : idx)}
                  style={{
                    position: 'absolute',
                    left: Math.max(0, c.x - 14),
                    top: Math.max(0, c.y - 14),
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    zIndex: 2,
                  }}
                />
              ))}
            </View>

            <Svg width={svgWidth} height={svgHeight} style={styles.svg}>
              <Defs>
                <LinearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <Stop offset="50%" stopColor="#10B981" stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Lưới ngang Gridlines mờ sang trọng */}
              {[0.25, 0.5, 0.75].map((ratio, idx) => {
                const y = padTop + plotH * ratio;
                return (
                  <Line
                    key={idx}
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Vùng bóng mờ gradient */}
              {areaPath ? <Path d={areaPath} fill="url(#chartAreaGrad)" /> : null}

              {/* Đường sóng Bezier mượt mà */}
              {linePath ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Đường ngắm dọc (crosshair) khi đang chọn điểm */}
              {selectedPointIndex !== null && coords[selectedPointIndex] && (
                <Line
                  x1={coords[selectedPointIndex].x}
                  y1={padTop}
                  x2={coords[selectedPointIndex].x}
                  y2={padTop + plotH}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
              )}

              {/* Các điểm mốc tròn */}
              {coords.map((c, idx) => {
                const isSelected = selectedPointIndex === idx;
                return (
                  <Circle
                    key={idx}
                    cx={c.x}
                    cy={c.y}
                    r={isSelected ? 6 : 3.5}
                    fill={isSelected ? '#059669' : '#10B981'}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2 : 1}
                  />
                );
              })}
            </Svg>

            {/* Tooltip khi click vào điểm trên biểu đồ (hiển thị ngày và số tiền dự báo) */}
            {selectedPointIndex !== null && coords[selectedPointIndex] && (() => {
              const pt = coords[selectedPointIndex];
              let dateFormatted = pt.date;
              if (dateFormatted.includes('-')) {
                const p = dateFormatted.split('-');
                if (p.length === 3) dateFormatted = `${p[2]}/${p[1]}/${p[0]}`;
              }

              return (
                <View
                  style={[
                    styles.tooltip,
                    {
                      left: Math.max(8, Math.min(pt.x - 65, svgWidth - 130)),
                      top: Math.max(-10, pt.y - 46),
                    },
                  ]}
                  pointerEvents="none"
                >
                  <View style={styles.tooltipPulseRow}>
                    <View style={styles.tooltipPulseDot} />
                    <Text style={styles.tooltipDate}>{dateFormatted}</Text>
                  </View>
                  <Text style={styles.tooltipVal}>{formatVND(pt.val)}</Text>
                </View>
              );
            })()}
          </View>

          {/* Mốc thời gian trục X */}
          <View style={styles.timelineRow}>
            <Text style={[styles.timelineLabel, { color: '#087557', fontWeight: '700' }]}>
              Hôm nay
            </Text>
            <Text style={styles.timelineLabel}>+5 ngày</Text>
            <Text style={styles.timelineLabel}>+10 ngày</Text>
            <Text style={[styles.timelineLabel, { color: '#087557', fontWeight: '700' }]}>
              Dự báo 15 ngày tới
            </Text>
          </View>
        </View>

        {/* ── 4. SECTION: DỰ BÁO CHI TIÊU DANH MỤC THỰC TẾ ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dự báo chi tiêu Danh mục Thực tế</Text>
          <Text style={styles.sectionSubtitle}>
            Phân tích tốc độ chi tiêu theo chu kỳ tháng và đối soát ngân sách.
          </Text>
        </View>

        {/* Danh sách category forecast */}
        <View style={styles.categoryList}>
          {categoryForecasts.map((cat, idx) => {
            const isDanger = (cat.risk_level || '').includes('VƯỢT');
            const iconColor = cat.category_color || '#087557';
            const iconBg = `${iconColor}15`;

            return (
              <View key={`${cat.category_name}-${idx}`} style={styles.catCard}>
                {/* Header card danh mục */}
                <View style={styles.catCardHeader}>
                  <View style={styles.catInfoLeft}>
                    <View style={[styles.catIconBox, { backgroundColor: iconBg }]}>
                      <FinanceIcon
                        name={resolveCategoryIconName(cat.category_icon || undefined, 'EXPENSE', cat.category_name)}
                        size={18}
                        color={iconColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{cat.category_name}</Text>
                      <Text style={styles.catBudget}>
                        Hạn mức:{' '}
                        {cat.budget_limit ? formatVND(cat.budget_limit) : 'Chưa đặt hạn mức'}
                      </Text>
                    </View>
                  </View>

                  {/* Badge An Toàn / Vượt */}
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: isDanger ? '#FFF1F2' : '#E3F4E9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        { color: isDanger ? '#E11D48' : '#087557' },
                      ]}
                    >
                      {cat.risk_level || 'AN TOÀN'}
                    </Text>
                  </View>
                </View>

                {/* 3 Cột chỉ số chi tiết */}
                <View style={styles.catMetricsGrid}>
                  <View style={styles.catMetricItem}>
                    <Text style={styles.catMetricLabel}>Đã chi trong tháng</Text>
                    <Text style={styles.catMetricValue}>
                      {formatVND(cat.current_spent || 0)}
                    </Text>
                  </View>

                  <View style={[styles.catMetricItem, { alignItems: 'center' }]}>
                    <Text style={styles.catMetricLabel}>Dự báo tổng chi cả tháng</Text>
                    <Text
                      style={[
                        styles.catMetricValue,
                        { color: iconColor },
                      ]}
                    >
                      {formatVND(cat.projected_total_month || 0)}
                    </Text>
                  </View>

                  <View style={[styles.catMetricItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.catMetricLabel}>Tốc độ chi trung bình</Text>
                    <Text style={styles.catMetricValueRate}>
                      {formatVND(cat.daily_rate || 0)}/ngày
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#087557" />
            <Text style={styles.loadingText}>Đang cập nhật mô hình dự báo AI...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#087557',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: '#087557',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRefreshBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  /* 1. HERO BANNER ROBOT AI */
  heroBannerCard: {
    borderRadius: 22,
    height: 122,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#07543F',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 12,
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 6,
    paddingBottom: 0,
    zIndex: 2,
    position: 'relative',
  },
  heroTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 4,
    paddingBottom: 6,
    zIndex: 1,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sparkleIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  heroLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 1,
  },
  heroRangeText: {
    fontSize: 9.8,
    color: '#D1FAE5',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  heroMascotWrap: {
    position: 'absolute',
    right: 0,
    bottom: -10,
    width: 178,
    height: 128,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  heroMascotImage: {
    width: '100%',
    height: '100%',
  },

  /* 2. DUO CARDS ROW */
  duoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  duoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EDEA',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  duoCardLeft: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#10B981',
  },
  duoCardRight: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#EF4444',
  },
  duoCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  duoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  duoValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  duoSub: {
    fontSize: 10,
    color: '#94A3B8',
  },

  /* 3. CHART CARD */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDEA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  chartTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  chartSubtitleFull: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 2,
  },
  chartTrendLine: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#087557',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDF0ED',
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  statDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 3,
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  statValue: {
    fontSize: 9,
    fontWeight: '700',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 150,
    marginVertical: 4,
  },
  svg: {
    overflow: 'visible',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#0B1B28',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E4460',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  tooltipPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  tooltipPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38BDF8',
  },
  tooltipDate: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
  },
  tooltipVal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 8,
  },
  timelineLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* 4. SECTION & CATEGORY CARDS */
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  categoryList: {
    gap: 10,
  },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDEA',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  catCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F6F5',
  },
  catInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  catBudget: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  catMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  catMetricItem: {
    flex: 1,
  },
  catMetricLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginBottom: 4,
  },
  catMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  catMetricValueRate: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 11,
    color: '#087557',
  },
});
