import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDashboardData, type DashboardSummary, type DashboardTransaction } from '../api/dashboardApi';
import { themeTokens } from '../themeTokens';

// Import các sub-components đã tách mô-đun
import { HomeHeader } from '../components/HomeHeader';
import { AssetSummaryCard } from '../components/AssetSummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { FinAIBanner } from '../components/FinAIBanner';
import { RecentTransactions } from '../components/RecentTransactions';

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
  onNotifications?: () => void;
  onProfile?: () => void;
};

export function HomeScreen({
  onViewTransactions,
  onAddTransaction,
  onScanInvoice,
  onViewGoals,
  onViewReminders,
  onViewAiAssistant,
  onViewAccounts,
  onViewSpendingAnalysis,
  onViewPeriodicReports,
  onViewBalanceForecast,
  onNotifications,
  onProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetchDashboardData();
      setDashboardData(res);
    } catch {
      // Fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysInMonth = new Date(now.getFullYear(), currentMonth, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());

  // Dữ liệu từ API Backend thực tế
  const totalBalance = dashboardData?.totalBalance ?? 125680000;
  const monthlyIncome = dashboardData?.monthlyIncome ?? 32500000;
  const monthlyExpense = dashboardData?.monthlyExpense ?? 24860000;
  const growthRate = dashboardData?.balanceGrowthRate ?? 8.24;
  const budgetTotal = dashboardData?.budgetTotal ?? 38000000;
  const budgetSpent = dashboardData?.budgetSpent ?? monthlyExpense;
  const budgetPercent = dashboardData?.budgetPercent ?? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100));

  const recentList: DashboardTransaction[] = dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0
    ? dashboardData.recentTransactions
    : [
        {
          id: '1',
          name: 'Mua sắm',
          description: 'Hôm nay · 12:15',
          amount: -650000,
          account: 'Vietcombank',
          icon: '🛒',
          iconBg: '#FEE2E2',
        },
        {
          id: '2',
          name: 'Ăn uống',
          description: 'Hôm nay · 11:30',
          amount: -120000,
          account: 'Ví MoMo',
          icon: '🍴',
          iconBg: '#DCFCE7',
        },
        {
          id: '3',
          name: 'Nhận lương',
          description: 'Hôm qua · 17:02',
          amount: 32500000,
          account: 'Vietcombank',
          icon: '💵',
          iconBg: '#DBEAFE',
        },
        {
          id: '4',
          name: 'Tiền thuê nhà',
          description: '03/11/2026',
          amount: -4000000,
          account: 'Techcombank',
          icon: '🏠',
          iconBg: '#FFE4E6',
        },
      ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      bounces={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          colors={[themeTokens.colors.primary]}
          tintColor={themeTokens.colors.primary}
        />
      }
    >
      {/* ── 1. HEADER XANH VÒM CẢNH (PHỦ TRÀN LÊN STATUS BAR THEO ĐÚNG ẢNH MẪU) ── */}
      <View style={[styles.headerHeroContainer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerGlowWave1} />
        <View style={styles.headerGlowWave2} />

        {/* 1.1 Header Top Bar: Logo FinAI, Chuông thông báo, Avatar */}
        <HomeHeader
          onNotifications={
            onNotifications ? onNotifications : () => Alert.alert('Thông báo', 'Bạn có 2 thông báo mới.')
          }
          onProfile={onProfile}
        />

        {/* 1.2 Thẻ Tổng Tài Sản Nền Xanh Đậm Nổi Bật */}
        <AssetSummaryCard
          totalBalance={totalBalance}
          monthlyIncome={monthlyIncome}
          monthlyExpense={monthlyExpense}
          growthRate={growthRate}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance(!showBalance)}
        />
      </View>

      {/* ── 2. CARD NGÂN SÁCH THÁNG TRẮNG CÓ THANH TIẾN ĐỘ ── */}
      <BudgetCard
        currentMonth={currentMonth}
        daysRemaining={daysRemaining}
        budgetSpent={budgetSpent}
        budgetTotal={budgetTotal}
        budgetPercent={budgetPercent}
      />

      {/* ── 3. GRID 6 NÚT TIỆN ÍCH CHÍNH (3 CỘT X 2 HÀNG) ── */}
      <QuickActionsGrid
        onAddTransaction={onAddTransaction}
        onViewAccounts={onViewAccounts}
        onViewGoals={onViewGoals}
        onViewSpendingAnalysis={onViewSpendingAnalysis}
        onViewReminders={onViewReminders}
        onViewPeriodicReports={onViewPeriodicReports}
      />

      {/* ── 4. BANNER TRỢ LÝ FINAI (ROBOT XANH KÈM MŨI TÊN TRÒN) ── */}
      <FinAIBanner onPress={onViewAiAssistant} />

      {/* ── 5. DANH SÁCH GIAO DỊCH GẦN ĐÂY ── */}
      <RecentTransactions
        transactions={recentList}
        onViewAll={onViewTransactions}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  contentContainer: {
    paddingBottom: 36,
  },
  headerHeroContainer: {
    width: '100%',
    backgroundColor: themeTokens.colors.primaryDark,
    borderBottomLeftRadius: themeTokens.radius.header,
    borderBottomRightRadius: themeTokens.radius.header,
    paddingHorizontal: themeTokens.spacing.lg,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlowWave1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#056149',
    opacity: 0.65,
  },
  headerGlowWave2: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#097E5F',
    opacity: 0.5,
  },
});
