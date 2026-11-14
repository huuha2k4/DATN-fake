import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff, ArrowDown, ArrowUp, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { formatCurrency } from '../api/mockData';

type Props = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  growthRate: number | null;
  showBalance: boolean;
  onToggleBalance: () => void;
};

// Sử dụng icon Ví tiền 3D + Đồng xu chữ đ + Biểu đồ cột xanh mới do người dùng cung cấp
const walletChart3DIcon = require('../../../assets/icons/hero_asset_wallet_chart_3d.png');

export function AssetSummaryCard({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  growthRate,
  showBalance,
  onToggleBalance,
}: Props) {
  const isPositiveGrowth = growthRate === null || growthRate >= 0;

  return (
    <View style={styles.card}>
      {/* Vầng sáng xanh mint nhẹ ở góc phải trên của Card (phía sau Ví 3D & Biểu đồ) giống hệt ảnh mẫu */}
      <View style={styles.cardTopRightMintAura} pointerEvents="none">
        <Svg width={180} height={145} viewBox="0 0 180 145" fill="none">
          <Path
            d="M 45,0 L 180,0 L 180,135 C 142,142 98,128 66,95 C 38,66 28,28 45,0 Z"
            fill="#E3F7EC"
            fillOpacity={0.75}
          />
          <Path
            d="M 85,10 C 122,4 162,25 180,62 L 180,135 L 72,135 C 58,95 62,32 85,10 Z"
            fill="#C7F0D8"
            fillOpacity={0.55}
          />
        </Svg>
      </View>

      {/* Phần trên: Cột trái (Tiêu đề + Tổng tài sản + Huy hiệu tăng trưởng) & Cột phải (Ví 3D + Biểu đồ) */}
      <View style={styles.topSection}>
        <View style={styles.leftContent}>
          {/* Dòng tiêu đề: Icon Layers xanh + Tổng tài sản + Con mắt */}
          <View style={styles.titleRow}>
            <Layers size={21} color="#006A46" strokeWidth={2.5} />
            <Text style={styles.titleLabel}>Tổng tài sản</Text>
            <Pressable
              onPress={onToggleBalance}
              hitSlop={12}
              style={styles.eyeBtn}
              accessibilityLabel="Ẩn hiện số dư"
            >
              {showBalance ? (
                <Eye size={19} color="#0F172A" strokeWidth={2.1} />
              ) : (
                <EyeOff size={19} color="#64748B" strokeWidth={2.1} />
              )}
            </Pressable>
          </View>

          {/* Số dư Tổng tài sản màu xanh đậm (#004D3B) nổi bật */}
          <Text
            style={styles.balanceValueText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {showBalance ? formatCurrency(totalBalance) : '••••••••••••'}
          </Text>

          {/* Cụm huy hiệu tăng trưởng kép: Viên thuốc xanh tươi + Nền xanh mint nhạt */}
          <View style={styles.growthCompositePill}>
            <LinearGradient
              colors={isPositiveGrowth ? ['#00B86B', '#009255'] : ['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.growthHighlightBadge}
            >
              <Text style={styles.growthHighlightText}>
                {growthRate !== null
                  ? growthRate >= 0
                    ? `↑ +${growthRate}%`
                    : `↓ ${growthRate}%`
                  : '↑ +8.24%'}
              </Text>
            </LinearGradient>
            <Text style={styles.growthSubNote}>so với tháng trước</Text>
          </View>
        </View>

        {/* Ảnh Ví tiền 3D + Đồng xu đ + Biểu đồ tăng trưởng đặt phía bên phải */}
        <Image
          source={walletChart3DIcon}
          style={styles.walletImageRight}
          resizeMode="contain"
        />
      </View>

      {/* Đường kẻ mảnh phân cách */}
      <View style={styles.horizontalDivider} />

      {/* Phần dưới: Thu nhập và Chi tiêu chia thành 2 cột rõ ràng kèm vạch ngăn giữa */}
      <View style={styles.cashFlowRow}>
        {/* Cột 1: Thu nhập */}
        <View style={styles.metricColumn}>
          <View style={styles.incomeIconBox}>
            <ArrowDown size={19} color="#007F53" strokeWidth={2.5} />
          </View>
          <View style={styles.metricTextWrap}>
            <Text style={styles.metricLabel}>Thu nhập</Text>
            <Text style={styles.incomeValue} numberOfLines={1} adjustsFontSizeToFit>
              {showBalance ? `+${formatCurrency(monthlyIncome)}` : '••••••'}
            </Text>
          </View>
        </View>

        {/* Vạch chia dọc giữa 2 cột */}
        <View style={styles.verticalDivider} />

        {/* Cột 2: Chi tiêu */}
        <View style={styles.metricColumn}>
          <View style={styles.expenseIconBox}>
            <ArrowUp size={19} color="#DC2626" strokeWidth={2.5} />
          </View>
          <View style={styles.metricTextWrap}>
            <Text style={styles.metricLabel}>Chi tiêu</Text>
            <Text style={styles.expenseValue} numberOfLines={1} adjustsFontSizeToFit>
              {showBalance ? `-${formatCurrency(Math.abs(monthlyExpense))}` : '••••••'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginTop: 2,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#004D3B',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTopRightMintAura: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 180,
    height: 145,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    minHeight: 108,
  },
  leftContent: {
    flex: 1,
    paddingRight: 118,
    zIndex: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  titleLabel: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  eyeBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceValueText: {
    fontSize: 31,
    fontWeight: '900',
    color: '#004D3B',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  growthCompositePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E6F5EC',
    borderRadius: 999,
    paddingRight: 11,
    marginTop: 5,
    gap: 7,
  },
  growthHighlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
  },
  growthHighlightText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  growthSubNote: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  walletImageRight: {
    position: 'absolute',
    right: -10,
    top: -12,
    width: 144,
    height: 132,
    zIndex: 3,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#F1F5F3',
    marginTop: 14,
    marginBottom: 12,
  },
  cashFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  incomeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#DDF7E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 2,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#005A3C',
    letterSpacing: -0.3,
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: -0.3,
  },
});
