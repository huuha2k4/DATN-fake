import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { themeTokens } from '../themeTokens';
import { useAppTheme } from '../../../context/ThemeContext';

type Props = {
  isChildAccount?: boolean;
  onAddTransaction: () => void;
  onViewAccounts: () => void;
  onViewGoals: () => void;
  onViewBudget: () => void;
  onViewDebts: () => void;
  onViewSpendingAnalysis: () => void;
  onViewReminders: () => void;
  onViewPeriodicReports: () => void;
  onViewChildWallet?: () => void;
  onViewChildChores?: () => void;
  onViewChildRequests?: () => void;
  onViewAiAssistant?: () => void;
  onViewGroupFamily?: () => void;
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
  // 5 Icon 3D dành riêng cho tài khoản bé
  kidWallet: require('../../../assets/icons/kid_icon_wallet.png'),
  kidRequests: require('../../../assets/icons/kid_icon_requests.png'),
  kidChores: require('../../../assets/icons/kid_icon_chores.png'),
  kidAi: require('../../../assets/icons/kid_icon_ai.png'),
  kidFamily: require('../../../assets/icons/kid_icon_family.png'),
};

export function QuickActionsGrid({
  isChildAccount = false,
  onAddTransaction,
  onViewAccounts,
  onViewGoals,
  onViewBudget,
  onViewDebts,
  onViewSpendingAnalysis,
  onViewReminders,
  onViewPeriodicReports,
  onViewChildWallet,
  onViewChildChores,
  onViewChildRequests,
  onViewAiAssistant,
  onViewGroupFamily,
}: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
  // Nếu là tài khoản Trẻ em: Hiển thị đúng 8 chức năng chuẩn với bộ 5 Icon 3D mới + 3 icon gốc
  const childActions = [
    {
      id: 'add',
      title: 'Thêm giao dịch',
      image: actionIcons.add,
      onPress: onAddTransaction,
    },
    {
      id: 'kid-wallet',
      title: 'Ví của bé',
      image: actionIcons.kidWallet,
      onPress: onViewChildWallet || onViewAccounts,
    },
    {
      id: 'kid-chores',
      title: 'Nhiệm vụ nhận thưởng',
      image: actionIcons.kidChores,
      onPress: onViewChildChores || (() => {}),
    },
    {
      id: 'kid-requests',
      title: 'Xin tiền bố mẹ',
      image: actionIcons.kidRequests,
      onPress: onViewChildRequests || (() => {}),
    },
    {
      id: 'goals',
      title: 'Mục tiêu và tiết kiệm',
      image: actionIcons.goals,
      onPress: onViewGoals,
    },
    {
      id: 'reports',
      title: 'Báo cáo của em',
      image: actionIcons.reports,
      onPress: onViewPeriodicReports,
    },
    {
      id: 'kid-ai',
      title: 'AI thông minh',
      image: actionIcons.kidAi,
      onPress: onViewAiAssistant || (() => {}),
    },
    {
      id: 'kid-family',
      title: 'Gia đình của em',
      image: actionIcons.kidFamily,
      onPress: onViewGroupFamily || (() => {}),
    },
  ];

  // Danh sách 8 chức năng chuẩn cho người lớn
  const adultActions = [
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
      title: 'Mục tiêu & Tiết kiệm',
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
      id: 'calendar',
      title: 'Lịch tài chính',
      image: actionIcons.calendar,
      onPress: onViewReminders,
    },
    {
      id: 'analytics',
      title: 'Phân tích thu chi',
      image: actionIcons.analytics,
      onPress: onViewSpendingAnalysis,
    },
    {
      id: 'reports',
      title: 'Báo cáo định kỳ',
      image: actionIcons.reports,
      onPress: onViewPeriodicReports,
    },
  ];

  const actions = isChildAccount ? childActions : adultActions;

  return (
    <View style={styles.gridContainer}>
      {actions.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: themeColors.surface,
              borderColor: isDark ? themeColors.cardBorder : themeTokens.colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          {/* Cố định vùng Icon */}
          <View style={styles.iconContainer}>
            <Image
              source={item.image}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </View>

          {/* Cố định vùng Title */}
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.actionTitleText,
                { color: themeColors.textPrimary },
              ]}
              numberOfLines={2}
            >
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
