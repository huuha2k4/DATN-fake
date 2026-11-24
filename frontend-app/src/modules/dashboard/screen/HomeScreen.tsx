import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppAlert as Alert } from '../../../context/DialogContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDashboardData, type DashboardSummary, type DashboardTransaction } from '../api/dashboardApi';
import { budgetApi } from '../../budget/api';
import { authStorage } from '../../auth/api/authApi';
import { groupApi } from '../../group/api/groupApi';
import { finAiSyncEmitter } from '../../ai-assistant/api/finAiSyncEmitter';
import { themeTokens } from '../themeTokens';
import { useAppTheme } from '../../../context/ThemeContext';

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
  onViewChildWallet?: () => void;
  onViewChildChores?: () => void;
  onViewChildRequests?: () => void;
  onViewGroupFamily?: () => void;
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
  onViewChildWallet,
  onViewChildChores,
  onViewChildRequests,
  onViewGroupFamily,
  onNotifications,
  onProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const waveHeight = Math.min(Math.max(screenHeight * 0.44, 350), 410);
  const { isDark, colors: themeColors } = useAppTheme();
  const currentUser = authStorage.getUser();
  const isChildAccount = Boolean(currentUser?.childAccount);

  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [budgetOverview, setBudgetOverview] = useState<{ totalBudgeted: number; totalSpent: number; overallPercentage: number } | null>(null);
  const [kidWalletData, setKidWalletData] = useState<any>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const now = new Date();
      if (isChildAccount && currentUser?.childWalletGroupId && currentUser?.childWalletId) {
        // Nạp dữ liệu ví trẻ em trực tiếp từ API child-wallets & spend-requests
        const [kWallet, spendRequests] = await Promise.all([
          groupApi.getChildWallet(currentUser.childWalletGroupId, currentUser.childWalletId).catch(() => null),
          groupApi.getSpendRequests(currentUser.childWalletGroupId, currentUser.childWalletId).catch(() => []),
        ]);
        if (kWallet) setKidWalletData(kWallet);

        // Chuyển đổi các giao dịch thực tế của bé (nạp tiền, thưởng việc nhà, xin tiền được duyệt, chi tiêu)
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const approvedList = (spendRequests || []).filter((item: any) => item.status === 'APPROVED');

        let currentIncome = 0;
        let currentExpense = 0;
        let prevIncome = 0;
        let prevExpense = 0;

        const mappedTransactions: DashboardTransaction[] = approvedList.map((item: any) => {
          const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
          const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
          const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
          const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
          const isIncome = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

          let displayTitle = item.description || 'Giao dịch';
          let catLabel = 'Chi tiêu';
          let icon = '🛒';
          let iconBg = '#FEE2E2';

          if (isDeposit) {
            displayTitle = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
            catLabel = 'Nạp ví';
            icon = '💵';
            iconBg = '#DCFCE7';
          } else if (isChoreReward) {
            displayTitle = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
            catLabel = 'Việc nhà';
            icon = '⭐';
            iconBg = '#FEF3C7';
          } else if (isGiftIncome) {
            displayTitle = item.description.replace('[INCOME_GIFT] ', '');
            catLabel = 'Lì xì / Quà';
            icon = '🎁';
            iconBg = '#FCE7F3';
          } else if (isMoneyReq) {
            displayTitle = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;
            catLabel = 'Xin tiền';
            icon = '🪙';
            iconBg = '#E0F2FE';
          }

          const amt = isIncome ? Math.abs(Number(item.amount || 0)) : -Math.abs(Number(item.amount || 0));
          const dateStr = item.createdAt ? item.createdAt.slice(0, 10) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          if (dateStr.startsWith(currentMonthKey)) {
            if (isIncome) currentIncome += Math.abs(Number(item.amount || 0));
            else currentExpense += Math.abs(Number(item.amount || 0));
          } else if (dateStr.startsWith(prevMonthKey)) {
            if (isIncome) prevIncome += Math.abs(Number(item.amount || 0));
            else prevExpense += Math.abs(Number(item.amount || 0));
          }

          // Format ngày dd/mm/yyyy
          let dateFormatted = dateStr;
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }

          return {
            id: String(item.id),
            name: displayTitle,
            description: `${catLabel} · ${dateFormatted}`,
            amount: amt,
            account: 'Ví của em',
            icon,
            iconBg,
            transactionDate: dateStr,
          };
        });

        // Sắp xếp ngày mới nhất lên đầu
        mappedTransactions.sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''));

        const walletBal = Number(kWallet?.balance || 0);
        const currentNet = currentIncome - currentExpense;
        const prevBalEst = walletBal - currentNet;
        let growth: number | null = null;

        if (prevBalEst > 0) {
          growth = Math.round((currentNet / prevBalEst) * 1000) / 10;
        } else if (currentIncome > 0 && walletBal > 0) {
          growth = 100;
        } else {
          growth = 0;
        }

        setDashboardData({
          userName: kWallet?.childName || currentUser?.fullName || 'Bé',
          totalBalance: walletBal,
          monthlyIncome: currentIncome,
          monthlyExpense: currentExpense,
          balanceGrowthRate: growth,
          budgetTotal: 0,
          budgetSpent: currentExpense,
          budgetRemaining: 0,
          budgetPercent: 0,
          predictedEndOfMonthBalance: Number(kWallet?.balance || 0),
          forecastAdvice: 'Chi tiêu khoa học và chăm chỉ làm nhiệm vụ nhận thưởng nhé!',
          recentTransactions: mappedTransactions.slice(0, 5),
        });
      } else {
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
      }
    } catch {
      // Fallback
    } finally {
      setRefreshing(false);
    }
  }, [isChildAccount, currentUser]);

  useEffect(() => {
    loadData();
    const unsubscribe = finAiSyncEmitter.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const daysInMonth = new Date(now.getFullYear(), currentMonth, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());

  // Dữ liệu từ API Backend thực tế
  const totalBalance = isChildAccount && kidWalletData
    ? kidWalletData.balance || 0
    : dashboardData?.totalBalance ?? 0;
  const monthlyIncome = dashboardData?.monthlyIncome ?? 0;
  const monthlyExpense = dashboardData?.monthlyExpense ?? 0;
  const growthRate = dashboardData?.balanceGrowthRate ?? null;

  const budgetTotal = budgetOverview?.totalBudgeted ?? (dashboardData?.budgetTotal ?? 0);
  const budgetSpent = budgetOverview?.totalSpent ?? (dashboardData?.budgetSpent ?? 0);
  const budgetPercent = budgetOverview?.overallPercentage ?? (dashboardData?.budgetPercent ?? 0);

  const recentList: DashboardTransaction[] = dashboardData?.recentTransactions || [];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: themeColors.background }]}
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
        <GreenWaveBackground
          variant="header"
          width={screenWidth}
          height={waveHeight}
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
          customTitle={isChildAccount ? 'Số dư ví của bé' : undefined}
          isChildAccount={isChildAccount}
        />
      </View>

      {/* ── 2. CARD NGÂN SÁCH THÁNG (ẨN ĐỐI VỚI VÍ TRẺ EM) ── */}
      {!isChildAccount && (
        <BudgetCard
          currentMonth={currentMonth}
          daysRemaining={daysRemaining}
          budgetSpent={budgetSpent}
          budgetTotal={budgetTotal}
          budgetPercent={budgetPercent}
          onPress={onViewBudget}
        />
      )}

      {/* ── 3. GRID 8 NÚT TIỆN ÍCH CHÍNH (4 CỘT X 2 HÀNG) ── */}
      <QuickActionsGrid
        isChildAccount={isChildAccount}
        onAddTransaction={onAddTransaction}
        onViewAccounts={onViewAccounts}
        onViewGoals={onViewGoals}
        onViewBudget={onViewBudget}
        onViewDebts={onViewDebts}
        onViewSpendingAnalysis={onViewSpendingAnalysis}
        onViewReminders={onViewReminders}
        onViewPeriodicReports={onViewPeriodicReports}
        onViewChildWallet={onViewChildWallet}
        onViewChildChores={onViewChildChores}
        onViewChildRequests={onViewChildRequests}
        onViewAiAssistant={onViewAiAssistant}
        onViewGroupFamily={onViewGroupFamily}
      />

      {/* ── 4. BỘ ĐÔI BANNER THÔNG MINH AI (ẨN DỰ BÁO ĐỐI VỚI VÍ TRẺ EM) ── */}
      {/* 4.1 Trợ lý trò chuyện FinAI Copilot */}
      <FinAIBanner onPress={onViewAiAssistant} />

      {/* 4.2 AI Dự báo số dư (ĐÃ ẨN KHI LÀ TÀI KHOẢN BÉ) */}
      {!isChildAccount && (
        <BalanceForecastBanner onPress={onViewBalanceForecast} />
      )}

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
    paddingBottom: 24,
  },
  headerHeroContainer: {
    width: '100%',
    paddingHorizontal: themeTokens.spacing.lg,
    paddingBottom: 4,
    position: 'relative',
  },
  headerWaveBackdrop: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
  },
});
