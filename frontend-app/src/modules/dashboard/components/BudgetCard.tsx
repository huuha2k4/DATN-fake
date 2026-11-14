import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChevronRight, Target, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GreenWaveBackground } from './GreenWaveBackground';
import { themeTokens } from '../themeTokens';
import { formatCurrency } from '../api/mockData';

type Props = {
  currentMonth: number;
  daysRemaining: number;
  budgetSpent: number;
  budgetTotal: number;
  budgetPercent: number;
  onPress?: () => void;
};

const BANNER_HEIGHT = 108;

export function BudgetCard({
  currentMonth,
  daysRemaining,
  budgetSpent,
  budgetTotal,
  budgetPercent,
  onPress,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(280, screenWidth - themeTokens.spacing.lg * 2);
  const clampedPercent = Math.min(100, Math.max(0, budgetPercent));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, height: BANNER_HEIGHT },
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Nền Gradient Xanh Đậm sang Xanh Lá Tươi + 3 Lớp sóng SVG góc dưới cố định đúng kích thước banner */}
      <GreenWaveBackground
        variant="banner"
        width={cardWidth}
        height={BANNER_HEIGHT}
      />

      {/* Nội dung chữ & thanh tiến độ đặt nổi lên trên */}
      <View style={styles.contentWrap}>
        {/* 1. Hàng tiêu đề ngân sách */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.walletIconBadge}>
              <Wallet size={17} color="#004D3B" strokeWidth={2.5} />
            </View>
            <Text style={styles.budgetTitle}>Ngân sách tháng {currentMonth}</Text>
          </View>

          <View style={styles.daysRightRow}>
            <Text style={styles.daysLeftText}>Còn {daysRemaining} ngày</Text>
            <ChevronRight size={15} color="rgba(255, 255, 255, 0.92)" strokeWidth={2.5} />
          </View>
        </View>

        {/* 2. Thanh tiến độ màu xanh sáng (#6CEB96) + Viên thuốc phần trăm trắng */}
        <View style={styles.progressRow}>
          <View style={styles.track}>
            {clampedPercent > 0 && (
              <LinearGradient
                colors={
                  budgetPercent >= 100
                    ? ['#FCA5A5', '#EF4444']
                    : ['#6CEB96', '#38DA82']
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(5, clampedPercent)}%`,
                  },
                ]}
              />
            )}
          </View>

          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{budgetPercent}%</Text>
          </View>
        </View>

        {/* 3. Dòng chi tiết ngân sách đã chi / tổng ngân sách */}
        <View style={styles.spentPillBadge}>
          <Target size={14} color="#6CEB96" strokeWidth={2.3} />
          <Text style={styles.detailText} numberOfLines={1}>
            Đã chi:{' '}
            <Text style={styles.detailTextBold}>
              {formatCurrency(budgetSpent)} / {formatCurrency(budgetTotal)}
            </Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#0B6E4F',
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0B6E4F',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletIconBadge: {
    width: 25,
    height: 25,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002E23',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  budgetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  daysRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  daysLeftText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  percentPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 2.5,
    borderRadius: 999,
    shadowColor: '#002E23',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0B6E4F',
  },
  spentPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 78, 55, 0.36)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  detailTextBold: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
