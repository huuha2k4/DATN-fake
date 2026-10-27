import { useState, useEffect, useMemo } from 'react';
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../core/components/FinanceIcon';
import { accountApi, type AccountItem, type AccountSummary } from '../../account-management/api/accountApi';
import { transactionApi, type TransactionItem } from '../../cash-flow-management/api/transactionApi';
import { budgetApi, type BudgetResponse } from '../../budget-management/api/budgetApi';
import { debtApi, type DebtListSummary } from '../../debt-management/api/debtApi';
import './DashboardScreen.css';

type Props = {
  onNotify: (message: string) => void;
  onAddTransaction: () => void;
};

// Định dạng tiền tệ VND chuẩn rõ nét, đậm đà
const formatVND = (amount: number | null | undefined): string => {
  const val = Math.round(amount ?? 0);
  return `${val.toLocaleString('vi-VN')} ₫`;
};

// Hiển thị icon danh mục đồng bộ với Quản lý thu chi và Thêm giao dịch (1 chuẩn SVG sắc nét duy nhất)
const renderTransactionCategoryIcon = (iconName?: string, isIncome?: boolean, size = 18, categoryName?: string) => {
  const resolved = resolveCategoryIconName(iconName, isIncome ? 'INCOME' : 'EXPENSE', categoryName);
  return <FinanceIcon name={resolved} size={size} />;
};

export function DashboardScreen({ onNotify, onAddTransaction }: Props) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthNum = now.getMonth() + 1;

  const [isLoading, setIsLoading] = useState(true);

  // Dữ liệu từ các API thực tế
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [monthSummary, setMonthSummary] = useState<{
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    transactionCount: number;
  }>({ totalIncome: 0, totalExpense: 0, netCashFlow: 0, transactionCount: 0 });

  const [currentBudget, setCurrentBudget] = useState<BudgetResponse | null>(null);
  const [, setDebtSummary] = useState<DebtListSummary | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [prevMonthBalance, setPrevMonthBalance] = useState<number | null>(null);

  // Tính ngày bắt đầu và kết thúc của tháng hiện tại và tháng trước liền kề
  const { fromDate, toDate, prevFromDate, prevToDate, yearNum, monthNum, prevMonthNum } = useMemo(() => {
    const [yStr, mStr] = currentMonthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const lastDay = new Date(y, m, 0).getDate();

    // Tháng trước liền kề
    const prevDateObj = new Date(y, m - 2, 1);
    const prevY = prevDateObj.getFullYear();
    const prevM = prevDateObj.getMonth() + 1;
    const prevLastDay = new Date(prevY, prevM, 0).getDate();

    return {
      fromDate: `${yStr}-${mStr}-01`,
      toDate: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      prevFromDate: `${prevY}-${String(prevM).padStart(2, '0')}-01`,
      prevToDate: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`,
      yearNum: y,
      monthNum: m,
      prevMonthNum: prevM,
    };
  }, [currentMonthKey]);

  // Tải dữ liệu toàn diện cho Dashboard
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const [
        accListRes,
        accSummaryRes,
        txListRes,
        prevTxRes,
        budgetRes,
        debtRes,
      ] = await Promise.allSettled([
        accountApi.getAccounts({ includeInactive: false }),
        accountApi.getSummary('VND'),
        transactionApi.getTransactions({
          fromDate,
          toDate,
          page: 1,
          pageSize: 100, // Tải đủ các giao dịch trong tháng để chia biểu đồ 4 tuần chuẩn xác
          sortBy: 'transaction_date',
          sortOrder: 'desc',
        }),
        transactionApi.getTransactions({
          fromDate: prevFromDate,
          toDate: prevToDate,
          page: 1,
          pageSize: 10,
        }),
        budgetApi.getBudgets({ year: yearNum, month: monthNum }),
        debtApi.getDebts(),
      ]);

      if (accListRes.status === 'fulfilled') {
        setAccounts(accListRes.value || []);
      }
      if (accSummaryRes.status === 'fulfilled') {
        setAccountSummary(accSummaryRes.value || null);
      }

      if (txListRes.status === 'fulfilled') {
        const txData = txListRes.value;
        const list = txData.transactions || [];
        setTransactions(list);

        if (txData.summary) {
          setMonthSummary(txData.summary);
        } else {
          const income = list
            .filter((t) => t.transactionType === 'INCOME')
            .reduce((s, t) => s + (t.amount || 0), 0);
          const expense = list
            .filter((t) => t.transactionType === 'EXPENSE')
            .reduce((s, t) => s + (t.amount || 0), 0);
          setMonthSummary({
            totalIncome: income,
            totalExpense: expense,
            netCashFlow: income - expense,
            transactionCount: list.length,
          });
        }
      }

      if (prevTxRes.status === 'fulfilled') {
        const prevTxData = prevTxRes.value;
        if (prevTxData.summary) {
          // Lưu lại dòng tiền tháng trước
          setPrevMonthBalance(prevTxData.summary.netCashFlow);
        } else {
          const prevList = prevTxData.transactions || [];
          const pInc = prevList.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0);
          const pExp = prevList.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0);
          setPrevMonthBalance(pInc - pExp);
        }
      }

      if (budgetRes.status === 'fulfilled') {
        const budgets = budgetRes.value.budgets || [];
        if (budgets.length > 0) {
          try {
            const detail = await budgetApi.getBudgetById(budgets[0].id);
            setCurrentBudget(detail);
          } catch {
            setCurrentBudget(budgets[0] as any);
          }
        } else {
          setCurrentBudget(null);
        }
      }

      if (debtRes.status === 'fulfilled') {
        setDebtSummary(debtRes.value.summary || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu tổng quan:', err);
      onNotify('Không thể tải dữ liệu tổng quan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Tính toán dữ liệu 4 tuần trong tháng hoàn toàn từ các giao dịch thực tế
  const weeksData = useMemo(() => {
    const mStr = String(currentMonthNum).padStart(2, '0');
    const weeks = [
      { label: 'Tuần 1', date: `01 - 07/${mStr}`, isCurrent: false, income: 0, expense: 0 },
      { label: 'Tuần 2', date: `08 - 14/${mStr}`, isCurrent: false, income: 0, expense: 0 },
      { label: 'Tuần 3', date: `15 - 21/${mStr}`, isCurrent: false, income: 0, expense: 0 },
      { label: 'Tuần 4', date: `22 - 28/${mStr}`, isCurrent: false, income: 0, expense: 0 },
    ];

    const currentDay = now.getDate();
    weeks[0].isCurrent = currentDay <= 7;
    weeks[1].isCurrent = currentDay > 7 && currentDay <= 14;
    weeks[2].isCurrent = currentDay > 14 && currentDay <= 21;
    weeks[3].isCurrent = currentDay > 21;

    // Phân bổ giao dịch thực tế vào từng tuần
    transactions.forEach((tx) => {
      const day = parseInt(tx.transactionDate?.split('-')[2] || '1', 10);
      let weekIdx = 0;
      if (day <= 7) weekIdx = 0;
      else if (day <= 14) weekIdx = 1;
      else if (day <= 21) weekIdx = 2;
      else weekIdx = 3;

      if (tx.transactionType === 'INCOME') {
        weeks[weekIdx].income += tx.amount || 0;
      } else if (tx.transactionType === 'EXPENSE') {
        weeks[weekIdx].expense += tx.amount || 0;
      }
    });

    // Tính mốc cao nhất để vẽ chiều cao cột tỷ lệ chính xác
    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      0
    );

    return weeks.map((w) => {
      // Chiều cao chuẩn xác 100% theo số tiền, chỉ cho tối thiểu 4px nếu có tiền > 0 để cột không bị biến mất
      const incomePercent = maxVal > 0 ? Math.round((w.income / maxVal) * 100) : 0;
      const expensePercent = maxVal > 0 ? Math.round((w.expense / maxVal) * 100) : 0;
      return {
        ...w,
        incomePercent,
        expensePercent,
      };
    });
  }, [transactions, currentMonthNum]);

  // Tổng tài sản khả dụng thực tế
  const totalAssets = accountSummary?.summary?.totalAssets ?? 
    accounts.filter(a => a.accountType !== 'CREDIT_CARD').reduce((s, a) => s + (a.balance || 0), 0);

  // Tính tỷ lệ tăng / giảm % của Tổng số dư khả dụng so với tháng trước kề nó
  // baseline (số dư đầu tháng / cuối tháng trước) = totalAssets - dòng tiền ròng tháng này
  const { balanceChangeRate, baselinePrevMonth } = useMemo(() => {
    // Nếu có netWorthTrend30Days từ accountSummary
    if (accountSummary?.netWorthTrend30Days && accountSummary.netWorthTrend30Days.length >= 2) {
      const history = accountSummary.netWorthTrend30Days;
      const oldestNet = Number(history[0].netWorth);
      const latestNet = Number(history[history.length - 1].netWorth);
      if (oldestNet > 0) {
        const rate = ((latestNet - oldestNet) / oldestNet) * 100;
        return { balanceChangeRate: Math.round(rate * 10) / 10, baselinePrevMonth: oldestNet };
      }
    }

    // Cách tính chuẩn tài chính: Số dư tháng trước = Số dư hiện tại - Biến động ròng tháng này
    const prevBalance = totalAssets - monthSummary.netCashFlow;
    if (prevBalance > 0) {
      const diff = totalAssets - prevBalance;
      const rate = (diff / prevBalance) * 100;
      return { balanceChangeRate: Math.round(rate * 10) / 10, baselinePrevMonth: prevBalance };
    }
    // Nếu có dữ liệu dòng tiền tháng trước từ API
    if (prevMonthBalance !== null && prevMonthBalance > 0) {
      const rate = ((monthSummary.netCashFlow - prevMonthBalance) / prevMonthBalance) * 100;
      return { balanceChangeRate: Math.round(rate * 10) / 10, baselinePrevMonth: prevMonthBalance };
    }
    return { balanceChangeRate: null, baselinePrevMonth: null };
  }, [totalAssets, monthSummary.netCashFlow, accountSummary, prevMonthBalance]);

  // Danh sách giao dịch hiển thị (5 giao dịch mới nhất hoặc tất cả)
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  // Ngân sách: % sử dụng thực tế
  const budgetSpent = currentBudget?.spentAmount || monthSummary.totalExpense;
  const budgetTotal = currentBudget?.totalAmount || 0;
  const budgetPercent = budgetTotal > 0 ? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)) : 0;

  // Icon mapping cho các loại tài khoản
  const getAccountIcon = (type: string): IconName => {
    switch (type) {
      case 'BANK_ACCOUNT': return 'bank';
      case 'E_WALLET': return 'wallet';
      case 'CASH': return 'wallet';
      case 'CREDIT_CARD': return 'receipt';
      case 'SAVINGS': return 'shield';
      default: return 'bank';
    }
  };

  // Tính biến động thực tế theo từng ví dựa trên giao dịch của ví đó
  const getAccountDelta = (accountId: string) => {
    const accTxs = transactions.filter((t) => t.accountId === accountId || (t as any).account?.id === accountId);
    const inc = accTxs.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0);
    const exp = accTxs.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0);
    const delta = inc - exp;
    return delta;
  };

  return (
    <main id="overview" className="dashboard-content mx-auto w-full max-w-[1560px] px-3 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12" aria-label="Tổng quan tài chính cá nhân">
      {/* 1. HÀNG 3 THẺ CHỈ SỐ HÀNG ĐẦU (Y hệt hình thiết kế của user) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6" aria-label="Tổng quan tài chính">
        {/* Card 1: TỔNG SỐ DƯ KHẢ DỤNG (Màu xanh đậm đặc trưng #023626) */}
        <article className="overview-balance-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#98b8ac] uppercase">
              TỔNG SỐ DƯ KHẢ DỤNG
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                className="text-white/60 hover:text-white transition"
                title={isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư'}
              >
                <FinanceIcon name="more" size={16} />
              </button>
              <span className="wallet-icon-box">
                <FinanceIcon name="wallet" size={20} />
              </span>
            </div>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-white tracking-tight flex items-baseline gap-1">
              {isBalanceHidden ? '••••••••' : isLoading ? '...' : (
                <>
                  <span>{Math.round(totalAssets).toLocaleString('vi-VN')}</span>
                  <span className="text-[#34d399] font-extrabold text-2xl sm:text-[28px]">₫</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#98b8ac] flex-wrap">
            {balanceChangeRate !== null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  balanceChangeRate >= 0
                    ? 'bg-emerald-500/20 text-[#34d399] border border-emerald-500/30'
                    : 'bg-rose-500/20 text-[#fb7185] border border-rose-500/30'
                }`}
                title={`Tháng ${prevMonthNum}: ${formatVND(baselinePrevMonth)}`}
              >
                <FinanceIcon name={balanceChangeRate >= 0 ? 'trending-up' : 'trend'} size={12} />
                {balanceChangeRate >= 0 ? `+${balanceChangeRate}%` : `${balanceChangeRate}%`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#34d399]">
                <FinanceIcon name="trend" size={12} /> {monthSummary.netCashFlow >= 0 ? '+' : ''}{Math.round(monthSummary.netCashFlow).toLocaleString('vi-VN')} ₫
              </span>
            )}
            <span>so với tháng {prevMonthNum}</span>
          </div>
        </article>

        {/* Card 2: TỔNG THU NHẬP THÁNG */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] uppercase">
              TỔNG THU NHẬP THÁNG
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="banknote" size={20} />
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] tracking-tight text-headline flex items-baseline gap-1">
              {isLoading ? '...' : (
                <>
                  <span>{Math.round(monthSummary.totalIncome).toLocaleString('vi-VN')}</span>
                  <span className="text-[#07543f] dark:text-emerald-400 font-extrabold text-2xl sm:text-[28px]">₫</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#718078] text-sub">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7f0] px-2.5 py-0.5 text-[11px] font-bold text-[#07543f] dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-[#10b981]" />
              {monthSummary.transactionCount} giao dịch
            </span>
            <span className="flex items-center gap-1">
              <FinanceIcon name="wallet" size={13} /> {accounts.length} nguồn ví
            </span>
          </div>
        </article>

        {/* Card 3: TỔNG CHI TIÊU THÁNG */}
        <article className="overview-white-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] uppercase">
              TỔNG CHI TIÊU THÁNG
            </span>
            <span className="icon-box-red">
              <FinanceIcon name="shopping-bag" size={20} />
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] tracking-tight text-headline flex items-baseline gap-1">
              {isLoading ? '...' : (
                <>
                  <span>{Math.round(monthSummary.totalExpense).toLocaleString('vi-VN')}</span>
                  <span className="text-[#ef4444] dark:text-rose-400 font-extrabold text-2xl sm:text-[28px]">₫</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-[#718078] text-sub mb-2 font-medium">
              <span>
                {budgetTotal > 0 ? `Đã dùng ${budgetPercent}% hạn mức` : `Tổng đã chi trong tháng`}
              </span>
              <strong className="text-[#14261e] font-bold text-headline">
                {budgetTotal > 0 ? formatVND(budgetTotal) : formatVND(monthSummary.totalExpense)}
              </strong>
            </div>
            <div className="budget-progress-track h-2 w-full rounded-full overflow-hidden">
              <div
                className="budget-progress-fill h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, budgetPercent || (monthSummary.totalExpense > 0 ? 100 : 0))}%` }}
              />
            </div>
          </div>
        </article>
      </section>

      {/* 2. KHU VỰC GIỮA: DÒNG TIỀN THEO TUẦN & GIAO DỊCH GẦN ĐÂY */}
      <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)] mb-8">
        {/* Biểu đồ: Dòng tiền theo tuần */}
        <article className="overview-main-panel">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#14261e] text-headline">Dòng tiền theo tuần</h2>
                <p className="text-xs text-[#718078] text-sub mt-0.5">
                  Đối chiếu Thu nhập vs Chi tiêu chu kỳ 4 tuần Tháng {currentMonthNum}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#14261e] text-headline">
                  <span className="size-2.5 rounded-full chart-legend-income" /> Thu nhập
                </span>
                <span className="flex items-center gap-1.5 text-[#14261e] text-headline">
                  <span className="size-2.5 rounded-full chart-legend-expense" /> Chi tiêu
                </span>
              </div>
            </div>

            {/* Vùng vẽ các cột (Cột Thu nhập xanh lá đậm và Cột Chi tiêu xanh ngọc nhạt/bạc hà bo tròn đỉnh) */}
            <div className="mt-8 flex min-h-[220px] items-end justify-around gap-4 border-b border-[#edf2ee] pb-4 dark:border-[#122432]">
              {weeksData.map((week) => (
                <div key={week.label} className="flex flex-col items-center gap-3">
                  <div className="flex h-40 items-end justify-center gap-2">
                    {/* Cột Thu nhập: Xanh đậm bo tròn chuẩn theo ảnh mẫu */}
                    <div
                      className="w-5 sm:w-6 rounded-t-full chart-bar-income transition-all duration-500 relative group cursor-pointer"
                      style={{ height: week.income > 0 ? `${Math.max(6, week.incomePercent)}%` : '0%' }}
                    >
                      {week.income > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] text-white shadow pointer-events-none">
                          +{formatVND(week.income)}
                        </div>
                      )}
                    </div>
                    {/* Cột Chi tiêu: Xanh mint / ngọc nhạt bo tròn chuẩn theo ảnh mẫu */}
                    <div
                      className="w-5 sm:w-6 rounded-t-full chart-bar-expense transition-all duration-500 relative group cursor-pointer"
                      style={{ height: week.expense > 0 ? `${Math.max(6, week.expensePercent)}%` : '0%' }}
                    >
                      {week.expense > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] text-white shadow pointer-events-none">
                          -{formatVND(week.expense)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <strong className={`block text-xs font-bold ${week.isCurrent ? 'text-[#07543f] dark:text-emerald-400' : 'text-[#14261e] text-headline'}`}>
                      {week.label} {week.isCurrent ? '(Nay)' : ''}
                    </strong>
                    <span className="text-[11px] text-[#718078] text-sub">{week.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dòng tiền thuần tích lũy (Net Savings) */}
          <div className="net-savings-pill-box mt-5">
            <span className="flex items-center gap-2 text-[#14261e] text-headline font-bold text-xs">
              <FinanceIcon name="trend" size={17} className="text-[#07543f] dark:text-emerald-400" />
              Dòng tiền thuần tích lũy (Net Savings):
            </span>
            <strong className={`text-sm font-black ${monthSummary.netCashFlow >= 0 ? 'text-[#07543f] dark:text-emerald-400' : 'text-[#dc2626] dark:text-rose-400'}`}>
              {monthSummary.netCashFlow >= 0 ? '+' : ''}{Math.round(monthSummary.netCashFlow).toLocaleString('vi-VN')} ₫
            </strong>
          </div>
        </article>

        {/* Cột phải: Giao dịch gần đây */}
        <article className="overview-main-panel">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#14261e] text-headline">Giao dịch gần đây</h2>
                <p className="text-xs text-[#718078] text-sub mt-0.5">
                  {transactions.length} hoạt động tài chính mới nhất
                </p>
              </div>
              {transactions.length > 5 && (
                <button
                  className="text-xs font-bold text-[#07543f] hover:underline flex items-center gap-1 dark:text-emerald-400"
                  type="button"
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                >
                  {showAllTransactions ? 'Thu gọn ↑' : 'Xem tất cả →'}
                </button>
              )}
            </div>

            <div className="divide-y divide-[#edf2ee] max-h-[320px] overflow-y-auto pr-1 dark:divide-[#122432]">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Đang tải giao dịch...</div>
              ) : visibleTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  Chưa có giao dịch thu/chi nào trong tháng {currentMonthNum}
                </div>
              ) : (
                visibleTransactions.map((tx) => {
                  const isIncome = tx.transactionType === 'INCOME';
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className={`size-10 grid place-items-center rounded-xl shrink-0 ${
                            isIncome
                              ? 'tx-icon-income'
                              : 'tx-icon-expense'
                          }`}
                        >
                          {renderTransactionCategoryIcon(tx.category?.icon, isIncome, 18, tx.category?.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-[#14261e] text-headline truncate text-[13px]">
                            {tx.description || tx.category?.name || 'Giao dịch'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#718078] text-sub mt-0.5">
                            <span className="tx-category-badge rounded px-2 py-0.5 font-semibold text-[11px]">
                              {tx.category?.name || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                            </span>
                            <span>{tx.transactionDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <strong className={`font-black text-sm block ${isIncome ? 'tx-amount-income' : 'tx-amount-expense'}`}>
                          {isIncome ? '+' : '-'}{formatVND(tx.amount)}
                        </strong>
                        <span className="text-[11px] text-[#718078] text-sub">{tx.accountName || 'Ví'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Nút nhập nhanh khoản thu/chi xanh nhạt full width */}
          <button
            className="quick-add-bar-btn mt-4 w-full"
            type="button"
            onClick={onAddTransaction}
          >
            <FinanceIcon name="plus" size={16} /> Nhập nhanh khoản thu/chi
          </button>
        </article>
      </section>

      {/* 3. HÀNG DƯỚI: TÀI KHOẢN & NGUỒN TIỀN (TÀI SẢN THANH KHOẢN) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#14261e] text-headline">
            <FinanceIcon name="bank" size={18} className="text-[#07543f] dark:text-emerald-400" />
            Tài khoản &amp; Nguồn tiền (Tài sản thanh khoản)
          </h2>
          <span className="rounded-full bg-[#e8f7f0] px-3 py-1 text-xs font-bold text-[#07543f] dark:bg-emerald-950/60 dark:text-emerald-300">
            {accounts.length} tài khoản liên kết
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-8 text-center text-xs text-gray-400">Đang tải nguồn tiền...</div>
          ) : accounts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-gray-400 italic">
              Chưa có tài khoản nào được tạo. Hãy nhấn "Quản lý Ví" để thêm ví!
            </div>
          ) : (
            accounts.map((acc) => {
              const isCredit = acc.accountType === 'CREDIT_CARD';
              const delta = getAccountDelta(acc.id);
              return (
                <article key={acc.id} className="overview-account-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#63756b] block">
                        {acc.name}
                      </span>
                      <p className="text-xs text-[#718078] text-sub mt-0.5">
                        {acc.accountNumberMasked ? `•••• ${acc.accountNumberMasked.slice(-4)} · Hoạt động` : (acc.phoneNumber ? `${acc.phoneNumber} · Hoạt động` : (isCredit ? 'Thẻ tín dụng · Hoạt động' : 'Ví hoạt động'))}
                      </p>
                    </div>
                    <span className="acc-icon-box bg-[#e8f7f0] text-[#07543f] dark:bg-emerald-950 dark:text-emerald-400">
                      <FinanceIcon name={getAccountIcon(acc.accountType)} size={20} />
                    </span>
                  </div>

                  <div className="my-2">
                    <strong className="text-2xl sm:text-[28px] font-black text-[#14261e] text-headline tracking-tight flex items-baseline gap-1">
                      <span>{Math.round(acc.balance).toLocaleString('vi-VN')}</span>
                      <span className="text-[#07543f] dark:text-emerald-400 text-xl font-extrabold">₫</span>
                    </strong>
                    <p className="text-xs text-[#718078] text-sub mt-1">
                      {acc.description || (isCredit ? 'Hạn mức linh hoạt hàng ngày' : 'Tài khoản thanh toán chính')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#edf2ee] pt-3 text-xs dark:border-[#122432]">
                    <span className={`inline-flex items-center gap-1 font-bold ${delta >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                      <FinanceIcon name="trend" size={13} /> {delta >= 0 ? '+' : ''}{Math.round(delta).toLocaleString('vi-VN')} ₫
                    </span>
                    <span className="text-[#718078] text-sub font-medium">Biến động tháng</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
