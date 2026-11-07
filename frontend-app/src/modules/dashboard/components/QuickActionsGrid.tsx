import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { themeTokens } from '../themeTokens';

type Props = {
  onAddTransaction: () => void;
  onViewAccounts: () => void;
  onViewGoals: () => void;
  onViewBudget: () => void;
  onViewDebts: () => void;
  onViewSpendingAnalysis: () => void;
  onViewReminders: () => void;
  onViewPeriodicReports: () => void;
};

// Danh sách PNG Icon 3D gốc chất lượng cao
const actionIcons = {
  add: require('../../../assets/icons/icon_add_transaction.png'),
  wallet: require('../../../assets/icons/icon_accounts_wallet.png'),
  budget: require('../../../assets/icons/icon_budget_management.png'),
  goals: require('../../../assets/icons/icon_financial_goals.png'),
  debt: require('../../../assets/icons/icon_debt_management.png'),
  analytics: require('../../../assets/icons/icon_spending_analysis.png'),
  calendar: require('../../../assets/icons/icon_financial_calendar.png'),
  reports: require('../../../assets/icons/icon_periodic_reports.png'),
};

export function QuickActionsGrid({
  onAddTransaction,
  onViewAccounts,
  onViewGoals,
  onViewBudget,
  onViewDebts,
  onViewSpendingAnalysis,
  onViewReminders,
  onViewPeriodicReports,
}: Props) {
  // 8 chức năng chính: 4 cột x 2 hàng
  const actions = [
    {
      id: 'add',
      title: 'Thêm giao dịch',
      image: actionIcons.add,
      onPress: onAddTransaction,
    },
    {
      id: 'wallet',
      title: 'Ví & Tài khoản',
      image: actionIcons.wallet,
      onPress: onViewAccounts,
    },
    {
      id: 'budget',
      title: 'Ngân sách',
      image: actionIcons.budget,
      onPress: onViewBudget,
    },
    {
      id: 'goals',
      title: 'Mục tiêu tích lũy',
      image: actionIcons.goals,
      onPress: onViewGoals,
    },
    {
      id: 'debt',
      title: 'Sổ nợ & Cho vay',
      image: actionIcons.debt,
      onPress: onViewDebts,
    },
    {
      id: 'analytics',
      title: 'Phân tích thu chi',
      image: actionIcons.analytics,
      onPress: onViewSpendingAnalysis,
    },
    {
      id: 'calendar',
      title: 'Lịch tài chính',
      image: actionIcons.calendar,
      onPress: onViewReminders,
    },
    {
      id: 'reports',
      title: 'Báo cáo định kỳ',
      image: actionIcons.reports,
      onPress: onViewPeriodicReports,
    },
  ];

  return (
    <View style={styles.gridContainer}>
      {actions.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
        >
          {/* Cố định vùng Icon */}
          <View style={styles.iconContainer}>
            {item.image ? (
              <Image source={item.image} style={styles.iconImage} resizeMode="contain" />
            ) : item.vectorIcon ? (
              <View style={[styles.vectorIconBox, { backgroundColor: item.vectorIcon.bg }]}>
                <FinanceIcon name={item.vectorIcon.name as any} size={28} color={item.vectorIcon.color} />
              </View>
            ) : null}
          </View>

          {/* Cố định vùng Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.actionTitleText} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: themeTokens.spacing.lg, // Căn thẳng hàng 16px với BudgetCard và 2 Banner
    marginTop: themeTokens.spacing.md,
    justifyContent: 'space-between',
    rowGap: 10,
  },
  actionCard: {
    width: '23.5%', // Vừa khít 4 cột với lề 16px chuẩn
    backgroundColor: themeTokens.colors.surface,
    borderRadius: 18,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  iconContainer: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  iconImage: {
    width: 74,
    height: 74,
  },
  titleContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  actionTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
