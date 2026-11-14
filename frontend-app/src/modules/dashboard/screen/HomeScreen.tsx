import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDashboardData, type DashboardSummary, type DashboardTransaction } from '../api/dashboardApi';
import { budgetApi } from '../../budget/api';
import { themeTokens } from '../themeTokens';

// Import các sub-components đã tách mô-đun
import { HomeHeader } from '../components/HomeHeader';
import { AssetSummaryCard } from '../components/AssetSummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { FinAIBanner } from '../components/FinAIBanner';
import { BalanceForecastBanner } from '../components/BalanceForecastBanner';
import { RecentTransactions } from '../components/RecentTransactions';
import { GreenWaveBackground } from '../components/GreenWaveBackground';

type Props = {
  onViewTransactions: () => void;
  onAddTransaction: () => void;
  onScanInvoice: () => void;
  onViewGoals: () => void;
  onViewBudget: () => void;
  onViewDebts: () => void;
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
  onViewBudget,
  onViewDebts,
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
  const { width: screenWidth } = useWindowDimensions();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [budgetOverview, setBudgetOverview] = useState<{ totalBudgeted: number; totalSpent: number; overallPercentage: number } | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const now = new Date();
      const [res, bRes] = await Promise.all([
        fetchDashboardData(),
        budgetApi.getMonthlyBudgetOverview(now.getFullYear(), now.getMonth() + 1),
      ]);
      setDashboardData(res);
      if (bRes) {
        setBudgetOverview({
          totalBudgeted: bRes.totalBudgeted,
          totalSpent: bRes.totalSpent,
          overallPercentage: bRes.overallPercentage,
        });
      }
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

  // Dữ liệu từ API Backend thực tế (Ưu tiên dữ liệu ngân sách chuẩn từ budgetApi)
  const totalBalance = dashboardData?.totalBalance ?? 125680000;
  const monthlyIncome = dashboardData?.monthlyIncome ?? 32500000;
  const monthlyExpense = dashboardData?.monthlyExpense ?? 24860000;
  const growthRate = dashboardData?.balanceGrowthRate ?? 8.24;

  const budgetTotal = budgetOverview?.totalBudgeted ?? (dashboardData?.budgetTotal ?? 5000000);
  const budgetSpent = budgetOverview?.totalSpent ?? (dashboardData?.budgetSpent ?? 3200000);
  const budgetPercent = budgetOverview?.overallPercentage ?? (dashboardData?.budgetPercent ?? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)));

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
      {/* ── 1. HEADER XANH GRADIENT + SÓNG SVG & THẺ TỔNG TÀI SẢN TRẮNG NỔI ── */}
      <View style={[styles.headerHeroContainer, { paddingTop: Math.max(insets.top, 10) + 8 }]}>
        {/* Nền Gradient Xanh Emerald & Các lớp sóng SVG uốn lượn mềm mại tan mờ dần xuống dưới */}
        <GreenWaveBackground
          variant="header"
          width={screenWidth}
          height={420}
          style={styles.headerWaveBackdrop}
        />

        {/* 1.1 Header Top Bar: Avatar, Lời chào, Tên người dùng & Nút Cài đặt */}
        <HomeHeader
          onNotifications={
            onNotifications ? onNotifications : () => Alert.alert('Thông báo', 'Bạn có 2 thông báo mới.')
          }
          onProfile={onProfile}
        />

        {/* 1.2 Thẻ Tổng Tài Sản Nền Trắng Bo Góc 26px + Ví 3D Bên Phải */}
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
        onPress={onViewBudget}
      />

      {/* ── 3. GRID 8 NÚT TIỆN ÍCH CHÍNH (4 CỘT X 2 HÀNG) ── */}
      <QuickActionsGrid
        onAddTransaction={onAddTransaction}
        onViewAccounts={onViewAccounts}
        onViewGoals={onViewGoals}
        onViewBudget={onViewBudget}
        onViewDebts={onViewDebts}
        onViewSpendingAnalysis={onViewSpendingAnalysis}
        onViewReminders={onViewReminders}
        onViewPeriodicReports={onViewPeriodicReports}
      />

      {/* ── 4. BỘ ĐÔI BANNER THÔNG MINH AI ── */}
      {/* 4.1 Trợ lý trò chuyện FinAI Copilot */}
      <FinAIBanner onPress={onViewAiAssistant} />

      {/* 4.2 AI Dự báo số dư & Dòng tiền tương lai */}
      <BalanceForecastBanner onPress={onViewBalanceForecast} />

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
    paddingHorizontal: themeTokens.spacing.lg,
    paddingBottom: 6,
    position: 'relative',
  },
  headerWaveBackdrop: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
    height: 420,
  },
});
