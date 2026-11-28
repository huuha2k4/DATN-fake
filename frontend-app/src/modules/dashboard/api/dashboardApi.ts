import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';
import { fetchMobileWithCache } from '../../core/utils/mobileQueryCache';

export interface DashboardTransaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  account: string;
  icon: string;
  iconBg: string;
  transactionDate?: string;
}

export interface DashboardSummary {
  userName: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  balanceGrowthRate: number | null;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetPercent: number;
  predictedEndOfMonthBalance: number;
  forecastAdvice: string;
  recentTransactions: DashboardTransaction[];
}

// Fallback emoji & background theo tên danh mục
function getCategoryVisual(categoryName?: string, txType?: string) {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('ăn') || cat.includes('uống') || cat.includes('food') || cat.includes('coffee') || cat.includes('nhà hàng')) {
    return { icon: '☕', iconBg: '#FEF3C7' };
  }
  if (cat.includes('lương') || cat.includes('salary') || cat.includes('thưởng') || txType === 'INCOME') {
    return { icon: '💰', iconBg: '#EAF8F1' };
  }
  if (cat.includes('mua sắm') || cat.includes('shopping') || cat.includes('shopee') || cat.includes('lazada')) {
    return { icon: '🛍️', iconBg: '#FEE2E2' };
  }
  if (cat.includes('giải trí') || cat.includes('phim') || cat.includes('cgv') || cat.includes('game')) {
    return { icon: '🎬', iconBg: '#FCE7F3' };
  }
  if (cat.includes('đi lại') || cat.includes('xe') || cat.includes('grab') || cat.includes('xăng')) {
    return { icon: '🚗', iconBg: '#E0F2FE' };
  }
  if (cat.includes('điện') || cat.includes('nước') || cat.includes('internet') || cat.includes('hóa đơn')) {
    return { icon: '⚡', iconBg: '#FEF9C3' };
  }
  return { icon: txType === 'INCOME' ? '↗️' : '💳', iconBg: '#F3F4F6' };
}

/**
 * Gọi API lấy dữ liệu tổng hợp cho HomeScreen
 */
export async function fetchDashboardData(forceRefresh = false): Promise<DashboardSummary> {
  const token = authStorage.getToken();
  const user = authStorage.getUser();
  const userName = user?.fullName || user?.username || 'Khách';

  // Nếu chưa đăng nhập thì trả về mặc định 0
  if (!token) {
    return {
      userName,
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      balanceGrowthRate: 0,
      budgetTotal: 0,
      budgetSpent: 0,
      budgetRemaining: 0,
      budgetPercent: 0,
      predictedEndOfMonthBalance: 0,
      forecastAdvice: 'Chào mừng bạn! Hãy bắt đầu ghi chép để quản lý tài chính cùng FinAI.',
      recentTransactions: [],
    };
  }

  return fetchMobileWithCache(
    'dashboard:summary',
    async () => {
      const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Tháng trước
  const prevDateObj = new Date(year, month - 2, 1);
  const prevY = prevDateObj.getFullYear();
  const prevM = prevDateObj.getMonth() + 1;
  const prevLastDay = new Date(prevY, prevM, 0).getDate();
  const prevFromDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const prevToDate = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await authFetch(url, { credentials: 'omit', signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timeout);
      return null;
    }
  };

  const [accountsRes, currentTxRes, prevTxRes, budgetSummaryRes, reportRes] = await Promise.allSettled([
    fetchWithTimeout(`${API_BASE_URL}/accounts/summary?base_currency=VND`),
    fetchWithTimeout(`${API_BASE_URL}/transactions?fromDate=${fromDate}&toDate=${toDate}&page=1&pageSize=10&sortBy=transaction_date&sortOrder=desc`),
    fetchWithTimeout(`${API_BASE_URL}/transactions?fromDate=${prevFromDate}&toDate=${prevToDate}&page=1&pageSize=50`),
    fetchWithTimeout(`${API_BASE_URL}/budgets/summary?period=current_month`),
    fetchWithTimeout(`${API_BASE_URL}/transactions/summary?fromDate=${fromDate}&toDate=${toDate}`),
  ]);

  // 1. Số dư
  let totalBalance = 0;
  if (accountsRes.status === 'fulfilled' && accountsRes.value?.data?.summary) {
    totalBalance = Number(accountsRes.value.data.summary.netWorth ?? accountsRes.value.data.summary.totalAssets ?? 0);
  }

  // 2. Thu chi tháng hiện tại & Danh sách giao dịch gần nhất
  const report = reportRes.status === 'fulfilled' ? reportRes.value?.summary : null;
  const monthlyIncome = Number(report?.totalIncome ?? 0);
  const monthlyExpense = Number(report?.totalExpense ?? 0);
  const walletSummary = currentTxRes.status === 'fulfilled' ? currentTxRes.value?.summary : null;
  let recentList: DashboardTransaction[] = [];

  if (currentTxRes.status === 'fulfilled' && currentTxRes.value) {
    const txData = currentTxRes.value;
    const rawList = Array.isArray(txData.transactions) ? txData.transactions : [];

    recentList = rawList.slice(0, 5).map((t: any) => {
      const visual = getCategoryVisual(t.category?.name || t.description, t.transactionType);
      const isExp = t.transactionType === 'EXPENSE';
      const amt = isExp ? -Math.abs(Number(t.amount || 0)) : Math.abs(Number(t.amount || 0));
      return {
        id: String(t.id),
        name: t.description || t.merchant?.name || t.category?.name || 'Giao dịch',
        description: `${t.category?.name || 'Chung'} · ${t.transactionDate ? t.transactionDate.substring(5) : 'Gần đây'}`,
        amount: amt,
        account: t.accountName || 'Tài khoản',
        icon: t.category?.icon || visual.icon,
        iconBg: visual.iconBg,
        transactionDate: t.transactionDate,
      };
    });
  }

  // 3. Tính % tăng trưởng số dư khả dụng so với tháng trước kề nó
  // Chuẩn tài chính kế toán:
  // Số dư đầu kỳ (cuối tháng trước) = Số dư hiện tại - Dòng tiền ròng tháng này (monthlyIncome - monthlyExpense)
  // % Tăng trưởng = (Dòng tiền ròng tháng này / Số dư đầu kỳ) * 100
  let balanceGrowthRate: number | null = null;
  const currentNetCashFlow = Number(report?.walletNetCashFlow ?? walletSummary?.netCashFlow ?? 0);
  const prevMonthEstimatedBalance = totalBalance - currentNetCashFlow;

  if (prevMonthEstimatedBalance > 0) {
    const rate = (currentNetCashFlow / prevMonthEstimatedBalance) * 100;
    balanceGrowthRate = Math.round(rate * 10) / 10;
  } else if (prevTxRes.status === 'fulfilled' && prevTxRes.value) {
    const pData = prevTxRes.value;
    let prevNet = 0;
    if (pData.summary && typeof pData.summary.netCashFlow === 'number') {
      prevNet = pData.summary.netCashFlow;
    } else if (Array.isArray(pData.transactions)) {
      const pInc = pData.transactions.filter((t: any) => t.transactionType === 'INCOME').reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const pExp = pData.transactions.filter((t: any) => t.transactionType === 'EXPENSE').reduce((s: number, t: any) => s + (t.amount || 0), 0);
      prevNet = pInc - pExp;
    }

    if (prevNet > 0) {
      balanceGrowthRate = Math.round(((currentNetCashFlow - prevNet) / prevNet) * 1000) / 10;
    } else if (totalBalance > 0) {
      balanceGrowthRate = 100;
    }
  } else if (totalBalance > 0 && currentNetCashFlow > 0) {
    balanceGrowthRate = 100;
  }

  // 4. Ngân sách tháng
  let budgetTotal = 0;
  let budgetSpent = monthlyExpense;
  let budgetRemaining = 0;
  let budgetPercent = 0;

  if (budgetSummaryRes.status === 'fulfilled' && budgetSummaryRes.value?.data) {
    const bData = budgetSummaryRes.value.data;
    budgetTotal = Number(bData.totalBudgetAmount || bData.totalAmount || 0);
    budgetSpent = Number(bData.totalSpentAmount || bData.spentAmount || 0);
    budgetRemaining = Number(bData.totalRemainingAmount || bData.remaining || Math.max(0, budgetTotal - budgetSpent));
    budgetPercent = budgetTotal > 0 ? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)) : 0;
  }

  // 5. Dự báo AI Prophet số dư cuối tháng
  const daysInMonth = lastDay;
  const currentDay = now.getDate();
  const daysLeft = Math.max(1, daysInMonth - currentDay);
  const dailyBurnRate = currentDay > 0 ? Number(report?.walletCashOut ?? walletSummary?.totalExpense ?? 0) / currentDay : 0;
  const estimatedRemainingExpense = dailyBurnRate * daysLeft;
  const predictedEndOfMonthBalance = Math.max(0, Math.round(totalBalance - estimatedRemainingExpense));

  let forecastAdvice = 'Dòng tiền ổn định. Hãy duy trì chi tiêu hợp lý theo ngân sách.';
  if (budgetTotal > 0 && budgetPercent > 80) {
    forecastAdvice = 'Cảnh báo: Bạn đã dùng hơn 80% ngân sách tháng, hãy thắt chặt chi tiêu!';
  } else if (monthlyIncome > monthlyExpense * 1.5 && monthlyIncome > 0) {
    forecastAdvice = 'FinAI: Dòng tiền dồi dào, bạn có thể trích thêm 10-15% vào mục tiêu tiết kiệm.';
  } else if (monthlyIncome === 0 && monthlyExpense === 0) {
    forecastAdvice = 'Chưa có biến động thu chi trong tháng này. Hãy thêm giao dịch để FinAI theo dõi.';
  }

  return {
    userName,
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    balanceGrowthRate,
    budgetTotal,
    budgetSpent,
    budgetRemaining,
    budgetPercent,
    predictedEndOfMonthBalance: predictedEndOfMonthBalance > 0 ? predictedEndOfMonthBalance : totalBalance,
    forecastAdvice,
    recentTransactions: recentList,
  };
    },
    { freshTimeMs: 12_000, staleTimeMs: 45_000, forceRefresh }
  );
}

