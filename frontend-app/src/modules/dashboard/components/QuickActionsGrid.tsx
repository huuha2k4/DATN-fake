import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { themeTokens } from '../themeTokens';

type Props = {
  onAddTransaction: () => void;
  onViewAccounts: () => void;
  onViewGoals: () => void;
  onViewSpendingAnalysis: () => void;
  onViewReminders: () => void;
  onViewPeriodicReports: () => void;
};

// 6 PNG Icon 3D gốc chất lượng cao từ user
const actionIcons = {
  add: require('../../../assets/icons/icon_add_transaction.png'),
  wallet: require('../../../assets/icons/icon_accounts_wallet.png'),
  goals: require('../../../assets/icons/icon_financial_goals.png'),
  analytics: require('../../../assets/icons/icon_spending_analysis.png'),
  calendar: require('../../../assets/icons/icon_financial_calendar.png'),
  reports: require('../../../assets/icons/icon_periodic_reports.png'),
};

export function QuickActionsGrid({
  onAddTransaction,
  onViewAccounts,
  onViewGoals,
  onViewSpendingAnalysis,
  onViewReminders,
  onViewPeriodicReports,
}: Props) {
  const actions = [
    {
      id: 'add',
      title: 'Thêm giao dịch',
      icon: actionIcons.add,
      onPress: onAddTransaction,
    },
    {
      id: 'wallet',
      title: 'Ví & Tài khoản',
      icon: actionIcons.wallet,
      onPress: onViewAccounts,
    },
    {
      id: 'goals',
      title: 'Mục tiêu tài chính',
      icon: actionIcons.goals,
      onPress: onViewGoals,
    },
    {
      id: 'analytics',
      title: 'Phân tích thu chi',
      icon: actionIcons.analytics,
      onPress: onViewSpendingAnalysis,
    },
    {
      id: 'calendar',
      title: 'Lịch tài chính',
      icon: actionIcons.calendar,
      onPress: onViewReminders,
    },
    {
      id: 'reports',
      title: 'Báo cáo định kỳ',
      icon: actionIcons.reports,
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
          {/* Cố định chiều cao vùng Icon để tâm mọi icon luôn nằm trên cùng 1 trục hoành */}
          <View style={styles.iconContainer}>
            <Image source={item.icon} style={styles.iconImage} resizeMode="contain" />
          </View>

          {/* Cố định chiều cao vùng Title để text 1 dòng hay 2 dòng không làm xô lệch icon */}
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
    paddingHorizontal: 12,
    marginTop: themeTokens.spacing.md,
    gap: 8,
  },
  actionCard: {
    width: '31.5%',
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radius.lg,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  iconContainer: {
    width: 94,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconImage: {
    width: 92,
    height: 92,
  },
  titleContainer: {
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  actionTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
