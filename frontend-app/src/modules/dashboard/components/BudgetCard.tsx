import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChevronRight, Target, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GreenWaveBackground } from './GreenWaveBackground';
import { themeTokens } from '../themeTokens';
import { formatCurrency } from '../api/mockData';
import { useAppTheme } from '../../../context/ThemeContext';

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
  const { isDark, colors: themeColors } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(280, screenWidth - themeTokens.spacing.lg * 2);
  const clampedPercent = Math.min(100, Math.max(0, budgetPercent));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, height: BANNER_HEIGHT },
        isDark && {
          backgroundColor: '#081711',
          borderWidth: 1,
          borderColor: themeColors.cardBorder,
        },
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Nền Gradient và Sóng tự động tương thích Dark / Light */}
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
            <View
              style={[
                styles.walletIconBadge,
                isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
              ]}
            >
              <Wallet size={17} color={isDark ? '#34D399' : '#004D3B'} strokeWidth={2.5} />
            </View>
            <Text style={styles.budgetTitle}>Ngân sách tháng {currentMonth}</Text>
          </View>

          <View style={styles.daysRightRow}>
            <Text style={styles.daysLeftText}>Còn {daysRemaining} ngày</Text>
            <ChevronRight size={15} color="rgba(255, 255, 255, 0.92)" strokeWidth={2.5} />
          </View>
        </View>

        {/* 2. Thanh tiến độ */}
        <View style={styles.progressRow}>
          <View
            style={[
              styles.track,
              isDark && { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
            ]}
          >
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

          <View
            style={[
              styles.percentPill,
              isDark && { backgroundColor: '#132820' },
            ]}
          >
            <Text
              style={[
                styles.percentText,
                isDark && { color: '#6EE7B7' },
              ]}
            >
              {budgetPercent}%
            </Text>
          </View>
        </View>

        {/* 3. Dòng chi tiết ngân sách đã chi / tổng ngân sách */}
        <View
          style={[
            styles.spentPillBadge,
            isDark && { backgroundColor: 'rgba(0, 0, 0, 0.28)' },
          ]}
        >
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
    borderRadius: 12.5,
    backgroundColor: '#6CEB96',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  daysRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  percentPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004D3B',
  },
  spentPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 77, 59, 0.38)',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
  },
  detailTextBold: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
