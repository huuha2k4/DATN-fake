import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themeTokens } from '../themeTokens';
import { formatCurrency } from '../api/mockData';
import type { DashboardTransaction } from '../api/dashboardApi';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import { useAppTheme } from '../../../context/ThemeContext';

type Props = {
  transactions: DashboardTransaction[];
  onViewAll: () => void;
};

export function RecentTransactions({ transactions, onViewAll }: Props) {
  const { isDark, colors: themeColors } = useAppTheme();

  return (
    <View style={styles.sectionContainer}>
      {/* Header section: Tiêu đề + Xem tất cả */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Giao dịch gần đây
          </Text>
          <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
            {transactions.length} hoạt động tài chính mới nhất
          </Text>
        </View>
        <Pressable
          onPress={onViewAll}
          hitSlop={10}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: 2 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.viewAllText, isDark && { color: '#34D399' }]}>
            Xem tất cả
          </Text>
          <FinanceIcon
            name="chevron-right"
            size={14}
            color={isDark ? '#34D399' : themeTokens.colors.primary}
          />
        </Pressable>
      </View>

      {/* Card danh sách giao dịch */}
      <View
        style={[
          styles.listCard,
          {
            backgroundColor: themeColors.surface,
            borderColor: isDark ? themeColors.cardBorder : '#EDF2EE',
          },
        ]}
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
              Chưa có giao dịch gần đây
            </Text>
          </View>
        ) : (
          transactions.map((tx, idx) => {
            const isIncome = tx.amount > 0;
            const iconName = resolveCategoryIconName(
              tx.icon,
              isIncome ? 'INCOME' : 'EXPENSE',
              tx.name
            );

            return (
              <View key={tx.id || idx}>
                <View style={styles.itemRow}>
                  {/* Icon vuông bo góc hiện đại theo đúng bản web */}
                  <View
                    style={[
                      styles.iconBox,
                      isIncome
                        ? isDark
                          ? { backgroundColor: 'rgba(52, 211, 153, 0.16)' }
                          : styles.incomeIconBox
                        : isDark
                        ? { backgroundColor: 'rgba(239, 68, 68, 0.16)' }
                        : styles.expenseIconBox,
                    ]}
                  >
                    <FinanceIcon
                      name={iconName}
                      size={20}
                      color={
                        isIncome
                          ? isDark
                            ? '#34D399'
                            : '#00A86B'
                          : isDark
                          ? '#F87171'
                          : '#E53E3E'
                      }
                    />
                  </View>

                  {/* Thông tin tên & ngày / mô tả */}
                  <View style={styles.textDetails}>
                    <Text
                      style={[
                        styles.txName,
                        { color: themeColors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {tx.name}
                    </Text>
                    <View style={styles.subInfoRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          isIncome
                            ? isDark
                              ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' }
                              : styles.categoryBadgeIncome
                            : isDark
                            ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                            : styles.categoryBadgeExpense,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            isIncome
                              ? isDark
                                ? { color: '#6EE7B7' }
                                : styles.categoryBadgeTextIncome
                              : isDark
                              ? { color: '#FCA5A5' }
                              : styles.categoryBadgeTextExpense,
                          ]}
                        >
                          {isIncome ? 'Thu' : 'Chi'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txSubtitle,
                          { color: themeColors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {tx.description}
                      </Text>
                    </View>
                  </View>

                  {/* Cột số tiền */}
                  <View style={styles.amountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        isIncome
                          ? isDark
                            ? { color: '#34D399' }
                            : styles.incomeAmount
                          : isDark
                          ? { color: '#F87171' }
                          : styles.expenseAmount,
                      ]}
                    >
                      {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(Math.abs(tx.amount))}`}
                    </Text>
                  </View>
                </View>

                {/* Đường kẻ phân cách giữa các item */}
                {idx < transactions.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      isDark && { backgroundColor: themeColors.divider },
                    ]}
                  />
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: themeTokens.spacing.lg,
    marginTop: themeTokens.spacing.xl + 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14261E',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#718078',
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A86B',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EDF2EE',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIconBox: {
    backgroundColor: '#E8F8F0',
  },
  expenseIconBox: {
    backgroundColor: '#FEE2E2',
  },
  textDetails: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  txName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14261E',
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeIncome: {
    backgroundColor: '#E6F4EA',
  },
  categoryBadgeExpense: {
    backgroundColor: '#FCE8E6',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadgeTextIncome: {
    color: '#137333',
  },
  categoryBadgeTextExpense: {
    color: '#C5221F',
  },
  txSubtitle: {
    fontSize: 11,
    color: '#718078',
    flexShrink: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  incomeAmount: {
    color: '#00A86B',
  },
  expenseAmount: {
    color: '#E53E3E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 56,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.7,
  },
});
