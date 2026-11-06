import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { themeTokens } from '../themeTokens';
import { formatCurrency } from '../api/mockData';

type Props = {
  currentMonth: number;
  daysRemaining: number;
  budgetSpent: number;
  budgetTotal: number;
  budgetPercent: number;
};

export function BudgetCard({
  currentMonth,
  daysRemaining,
  budgetSpent,
  budgetTotal,
  budgetPercent,
}: Props) {
  return (
    <View style={styles.card}>
      {/* Hàng tiêu đề ngân sách */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Text style={styles.barIcon}>📊</Text>
          <Text style={styles.budgetTitle}>Ngân sách tháng {currentMonth}</Text>
        </View>
        <Text style={styles.daysLeftText}>Còn {daysRemaining} ngày</Text>
      </View>

      {/* Progress bar + Phần trăm */}
      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.min(100, Math.max(0, budgetPercent))}%` },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{budgetPercent}%</Text>
      </View>

      {/* Dòng chi tiết số tiền đã chi / tổng */}
      <Text style={styles.detailText}>
        Đã chi: {formatCurrency(budgetSpent)} / {formatCurrency(budgetTotal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: themeTokens.spacing.lg,
    marginTop: themeTokens.spacing.md,
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radius.lg,
    padding: themeTokens.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barIcon: {
    fontSize: 16,
    color: themeTokens.colors.primary,
  },
  budgetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: themeTokens.colors.textPrimary,
  },
  daysLeftText: {
    fontSize: 12,
    color: themeTokens.colors.textSecondary,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: themeTokens.colors.accentGreen,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: themeTokens.colors.primary,
  },
  detailText: {
    fontSize: 12,
    color: themeTokens.colors.textSecondary,
    fontWeight: '500',
  },
});

