import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { themeTokens } from '../themeTokens';
import { formatCurrency } from '../api/mockData';

type Props = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  growthRate: number | null;
  showBalance: boolean;
  onToggleBalance: () => void;
};

// Sử dụng icon ví 3D tách nền chuẩn từ người dùng
const wallet3DIcon = require('../../../assets/icons/hero_wallet_3d.png');

export function AssetSummaryCard({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  growthRate,
  showBalance,
  onToggleBalance,
}: Props) {
  return (
    <View style={styles.card}>
      {/* Icon ví 3D trang trí ở góc phải trên */}
      <Image source={wallet3DIcon} style={styles.walletImageOverlay} resizeMode="contain" />

      {/* Tiêu đề & nút con mắt vector trắng phẳng sắc nét */}
      <View style={styles.titleRow}>
        <Text style={styles.titleLabel}>Tổng tài sản</Text>
        <Pressable
          onPress={onToggleBalance}
          hitSlop={12}
          style={styles.eyeBtn}
          accessibilityLabel="Ẩn hiện số dư"
        >
          {showBalance ? (
            /* Icon con mắt mở vector trắng theo đúng ảnh mẫu */
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <Circle cx="12" cy="12" r="3" fill="#FFFFFF" />
            </Svg>
          ) : (
            /* Icon con mắt gạch chéo khi ẩn */
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <Path d="m2 2 20 20" />
            </Svg>
          )}
        </Pressable>
      </View>

      {/* Số dư tổng tài sản lớn (30-34px) */}
      <Text style={styles.balanceValueText}>
        {showBalance ? `${formatCurrency(totalBalance)}` : '••••••••••••'}
      </Text>

      {/* Tỷ lệ tăng trưởng so với tháng trước */}
      <View style={styles.growthBadge}>
        <Text style={styles.growthBadgeText}>
          {growthRate !== null
            ? growthRate >= 0
              ? `↑ +${growthRate}%`
              : `↓ ${growthRate}%`
            : '● Ổn định'}
        </Text>
        <Text style={styles.growthNote}>so với tháng trước</Text>
      </View>

      {/* Cụm thu nhập & chi tiêu */}
      <View style={styles.cashFlowRow}>
        <View style={styles.metricColumn}>
          <View style={styles.incomeSquare}>
            <Text style={styles.arrowText}>↓</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Thu nhập</Text>
            <Text style={styles.metricValue}>
              {showBalance ? `+${formatCurrency(monthlyIncome)}` : '••••••'}
            </Text>
          </View>
        </View>

        <View style={styles.metricColumn}>
          <View style={styles.expenseSquare}>
            <Text style={styles.arrowText}>↑</Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>Chi tiêu</Text>
            <Text style={styles.metricValue}>
              {showBalance ? `-${formatCurrency(monthlyExpense)}` : '••••••'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#053E31',
    borderRadius: 24,
    padding: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  walletImageOverlay: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 140,
    height: 110,
    opacity: 0.95,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  titleLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceValueText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
    gap: 5,
  },
  growthBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#34D399',
  },
  growthNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cashFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    gap: 16,
  },
  metricColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  incomeSquare: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseSquare: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
});
