import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { formatCurrency } from '../api/mockData';
import { colors, radius, spacing } from '../../../theme';

type Props = {
  onViewTransactions: () => void;
  onAddTransaction: () => void;
  onScanInvoice: () => void;
  onViewGoals: () => void;
  onViewReminders: () => void;
  onViewAiAssistant: () => void;
  onViewAccounts: () => void;
  onViewSpendingAnalysis: () => void;
  onViewPeriodicReports: () => void;
  onViewBalanceForecast: () => void;
};

const dashboardAssetUris = {
  add: Image.resolveAssetSource(require('../assets/quick-add.svg')).uri,
  receipt: Image.resolveAssetSource(require('../assets/receipt-ocr.svg')).uri,
  transactions: Image.resolveAssetSource(require('../assets/transactions.svg')).uri,
  goal: Image.resolveAssetSource(require('../assets/financial-goal.svg')).uri,
  reminder: Image.resolveAssetSource(require('../assets/reminder.svg')).uri,
  assistant: Image.resolveAssetSource(require('../assets/ai-assistant.svg')).uri,
  accounts: Image.resolveAssetSource(require('../assets/accounts.svg')).uri,
  analytics: Image.resolveAssetSource(require('../assets/analytics.svg')).uri,
  reports: Image.resolveAssetSource(require('../assets/reports.svg')).uri,
  forecast: Image.resolveAssetSource(require('../assets/forecast.svg')).uri,
} as const;

type DashboardAsset = keyof typeof dashboardAssetUris;
type QuickAction = { label: string; asset: DashboardAsset };
type Utility = { label: string; asset: DashboardAsset };
type HomeTransaction = {
  name: string;
  description: string;
  amount: number;
  account: string;
  icon: string;
  iconBg: string;
};

const quickActions: QuickAction[] = [
  { label: 'Thêm giao dịch', asset: 'add' },
  { label: 'Quét hóa đơn\nOCR', asset: 'receipt' },
  { label: 'Giao dịch', asset: 'transactions' },
  { label: 'Mục tiêu tài chính', asset: 'goal' },
  { label: 'Lịch tài chính', asset: 'reminder' },
  { label: 'Trợ lý AI tài chính', asset: 'assistant' },
];

const utilities: Utility[] = [
  { label: 'Thẻ &\nTài khoản', asset: 'accounts' },
  { label: 'Phân tích\nthu chi', asset: 'analytics' },
  { label: 'Báo cáo\nđịnh kỳ', asset: 'reports' },
  { label: 'Dự báo\nsố dư', asset: 'forecast' },
];

function DashboardSvgIcon({ asset, size }: { asset: DashboardAsset; size: number }) {
  return <SvgUri uri={dashboardAssetUris[asset]} width={size} height={size} />;
}

const recentTransactions: HomeTransaction[] = [
  {
    name: 'CGV Cinema',
    description: 'Giải trí · Hôm nay',
    amount: -250000,
    account: 'Ví MoMo',
    icon: '▦',
    iconBg: '#FCE7F3',
  },
  {
    name: 'Lương tháng 9',
    description: 'Thu nhập · Hôm qua',
    amount: 12000000,
    account: 'Vietcombank',
    icon: '↗',
    iconBg: '#10B98133',
  },
  {
    name: 'Highlands Coffee',
    description: 'Ăn uống · Hôm qua',
    amount: -85000,
    account: 'Ví MoMo',
    icon: '☕',
    iconBg: '#FEF3C7',
  },
  {
    name: 'Shopee',
    description: 'Mua sắm · 09/09',
    amount: -320000,
    account: 'Vietcombank',
    icon: '◈',
    iconBg: '#F43F5E33',
  },
];

export function HomeScreen({ onViewTransactions, onAddTransaction, onScanInvoice, onViewGoals, onViewReminders, onViewAiAssistant, onViewAccounts, onViewSpendingAnalysis, onViewPeriodicReports, onViewBalanceForecast }: Props) {
  const handleQuickAction = (label: string) => {
    if (label === 'Thêm giao dịch') {
      onAddTransaction();
      return;
    }
    if (label === 'Giao dịch') {
      onViewTransactions();
      return;
    }
    if (label === 'Quét hóa đơn\nOCR') {
      onScanInvoice();
      return;
    }
    if (label === 'Mục tiêu tài chính') {
      onViewGoals();
      return;
    }
    if (label === 'Lịch tài chính') {
      onViewReminders();
      return;
    }
    if (label === 'Trợ lý AI tài chính') {
      onViewAiAssistant();
      return;
    }
    Alert.alert(label.replace('\n', ' '), 'Tính năng đang được hoàn thiện.');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Status bar row */}
        <View style={styles.statusRow}>
          <Text style={styles.time}>9:41</Text>
          <Text style={styles.statusIcons}>▮ ▮ ◉</Text>
        </View>

        {/* Profile row */}
        <View style={styles.profileRow}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarIcon}>♙</Text>
          </View>
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingHello}>Xin chào,</Text>
            <Text style={styles.greetingName}>Nguyễn Văn A</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert('Thông báo', 'Bạn chưa có thông báo mới.')}
            style={styles.headerActions}
            accessibilityLabel="Thông báo và cài đặt"
          >
            <Text style={styles.headerActionIcon}>🔔</Text>
            <Text style={styles.headerActionIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Balance card ── */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceTitleRow}>
          <Text style={styles.balanceLabel}>Tổng số dư</Text>
          <Pressable
            onPress={() => Alert.alert('Số dư', 'Số dư đang được hiển thị.')}
            accessibilityLabel="Ẩn hoặc hiện số dư"
          >
            <Text style={styles.eyeIcon}>👁</Text>
          </Pressable>
        </View>

        <Text style={styles.balanceAmount}>12.850.000 đ</Text>

        <View style={styles.changeRow}>
          <Text style={styles.changeArrow}>↗</Text>
          <Text style={styles.changeText}> +2.5% so với tháng trước</Text>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.miniStatsRow}>
          {/* Thu nhập */}
          <View style={styles.miniStat}>
            <View style={[styles.miniIconBox, { backgroundColor: '#10B98133' }]}>
              <Text style={[styles.miniIconText, { color: '#6EE7B7' }]}>↗</Text>
            </View>
            <View>
              <Text style={styles.miniStatLabel}>Thu nhập</Text>
              <Text style={styles.miniStatValue}>18.500.000 đ</Text>
            </View>
          </View>

          {/* Chi tiêu */}
          <View style={styles.miniStat}>
            <View style={[styles.miniIconBox, { backgroundColor: '#F43F5E33' }]}>
              <Text style={[styles.miniIconText, { color: '#FDA4AF' }]}>↘</Text>
            </View>
            <View>
              <Text style={styles.miniStatLabel}>Chi tiêu</Text>
              <Text style={[styles.miniStatValue, { color: '#FFE4E6' }]}>5.650.000 đ</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Budget card ── */}
      <View style={styles.budgetCard}>
        <View style={styles.budgetTitleRow}>
          <Text style={styles.cardTitle}>Ngân sách tháng 9</Text>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>68%</Text>
          </View>
        </View>
        <View
          style={styles.progressTrack}
          accessible={true}
          accessibilityValue={{ min: 0, max: 100, now: 68 }}
          accessibilityLabel="Ngân sách tháng 9: 68%"
        >
          <View style={styles.progressFill} />
        </View>
        <View style={styles.budgetFooter}>
          <Text style={styles.mutedText}>5.650.000 / 8.300.000 đ</Text>
          <Text style={styles.mutedText}>Còn lại 2.650.000 đ</Text>
        </View>
      </View>

      {/* ── Quick actions ── */}
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => handleQuickAction(action.label)}
            style={styles.quickActionItem}
            accessibilityRole="button"
            accessibilityLabel={action.label.replace('\n', ' ')}
          >
            <View style={styles.quickActionIconBox}>
              <DashboardSvgIcon asset={action.asset} size={76} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Utilities ── */}
      <Text style={styles.sectionHeading}>Tiện ích</Text>
      <View style={styles.utilitiesRow}>
        {utilities.map((utility) => (
          <Pressable
            key={utility.label}
            onPress={() => utility.asset === 'accounts' ? onViewAccounts() : utility.asset === 'analytics' ? onViewSpendingAnalysis() : utility.asset === 'reports' ? onViewPeriodicReports() : utility.asset === 'forecast' ? onViewBalanceForecast() : Alert.alert(utility.label.replace('\n', ' '), 'Tính năng đang được hoàn thiện.')}
            style={styles.utilityItem}
            accessibilityRole="button"
            accessibilityLabel={utility.label.replace('\n', ' ')}
          >
            <View style={styles.utilityIconBox}>
              <DashboardSvgIcon asset={utility.asset} size={64} />
            </View>
            <Text style={styles.utilityLabel}>{utility.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Recent transactions ── */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionHeading}>Giao dịch gần đây</Text>
        <Pressable onPress={onViewTransactions} accessibilityRole="button" accessibilityLabel="Xem tất cả giao dịch">
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </Pressable>
      </View>

      <View style={styles.transactionCard}>
        {recentTransactions.map((tx, index) => (
          <View key={tx.name}>
            <View style={styles.transactionRow}>
              {/* Icon */}
              <View style={[styles.txIconBox, { backgroundColor: tx.iconBg }]}>
                <Text style={styles.txIconText}>{tx.icon}</Text>
              </View>

              {/* Name + description */}
              <View style={styles.txCopy}>
                <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
              </View>

              {/* Amount + account */}
              <View style={styles.txAmountBlock}>
                <Text
                  style={[
                    styles.txAmount,
                    tx.amount > 0 ? styles.amountIncome : styles.amountExpense,
                  ]}
                >
                  {tx.amount > 0 ? '+ ' : '- '}
                  {formatCurrency(Math.abs(tx.amount))}
                </Text>
                <Text style={styles.txAccount}>{tx.account}</Text>
              </View>
            </View>

            {index < recentTransactions.length - 1 && (
              <View style={styles.separator} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ── Layout ──
  screen: {
    flex: 1,
    backgroundColor: '#EAF4FF',
  },
  content: {
    paddingBottom: spacing.xl + 76, // extra room above bottom nav
  },

  // ── Header ──
  header: {
    backgroundColor: '#064E3B',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  time: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  statusIcons: {
    color: colors.surface,
    fontSize: 11,
    letterSpacing: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF1A',
    borderWidth: 2,
    borderColor: '#34D39966',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    color: colors.surface,
    fontSize: 22,
  },
  greetingBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  greetingHello: {
    color: '#A7F3D0CC',
    fontSize: 12,
    lineHeight: 15,
  },
  greetingName: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionIcon: {
    color: colors.surface,
    fontSize: 18,
  },

  // ── Balance card ──
  balanceCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#065F46',
    shadowColor: '#022C22',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  balanceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#A7F3D0E6',
    fontSize: 12,
    fontWeight: '500',
  },
  eyeIcon: {
    color: colors.surface,
    fontSize: 16,
  },
  balanceAmount: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 6,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeArrow: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
  },
  changeText: {
    color: '#6EE7B7',
    fontSize: 11,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#FFFFFF26',
    marginVertical: spacing.md,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF0D',
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  miniIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  miniStatLabel: {
    color: '#FFFFFFCC',
    fontSize: 11,
    lineHeight: 16,
  },
  miniStatValue: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── Budget card ──
  budgetCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
  percentBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  percentText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    width: '68%',
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  mutedText: {
    color: '#64748B',
    fontSize: 11,
  },

  // ── Quick actions ──
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: 16,
    marginTop: spacing.xs,
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  quickActionIconBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quickActionIconText: {
    fontSize: 34,
    color: colors.forest,
    fontWeight: '600',
  },
  quickActionLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },

  // ── Section heading ──
  sectionHeading: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },

  // ── Utilities ──
  utilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  utilityItem: {
    width: '23%',
    alignItems: 'center',
    gap: 8,
  },
  utilityIconBox: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  utilityIconText: {
    fontSize: 28,
    color: colors.forest,
  },
  utilityLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── Recent transactions ──
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  seeAllText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
  transactionCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconText: {
    fontSize: 18,
    color: colors.forest,
    fontWeight: '700',
  },
  txCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  txName: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  txDesc: {
    color: '#64748B',
    fontSize: 11,
  },
  txAmountBlock: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountIncome: {
    color: '#059669',
  },
  amountExpense: {
    color: '#F43F5E',
  },
  txAccount: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
});
