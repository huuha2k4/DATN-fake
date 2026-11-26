import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { transactionApi } from '../../add-transaction/api/transactionApi';
import { fetchMobileWithCache } from '../../core/utils/mobileQueryCache';

export interface ReportSummaryData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  averageDailyExpense: number;
  savingRate: number;
  transactionCount: number;
  aiInsight?: {
    status: 'POSITIVE' | 'WARNING' | 'NEUTRAL';
    text: string;
  };
  dailyTrend: {
    date: string; // "01/11", "08/11"...
    fullDate: string; // YYYY-MM-DD
    income: number;
    expense: number;
  }[];
  topTransactions: {
    id: string;
    title: string;
    sub: string;
    date?: string;
    wallet?: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    categoryName?: string;
  }[];
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
    amount: number;
    percentage: number;
    count: number;
    avgPerTx: number;
  }[];
  comparison?: {
    prevIncome: number;
    prevExpense: number;
    prevNet: number;
    incomeChangePercent: number;
    expenseChangePercent: number;
    categoryComparisons: {
      id: string;
      name: string;
      color: string;
      prevAmount: number;
      currentAmount: number;
      diffAmount: number;
      percentChange: number;
    }[];
    notes: string[];
  };
}

export const CATEGORY_COLOR_PALETTE = [
  '#07543f', // Xanh đậm Finora
  '#168361', // Xanh lá ngọc
  '#e3a33d', // Vàng cam
  '#478ac1', // Xanh dương
  '#8971bb', // Tím nhạt
  '#c94e62', // Đỏ hồng
  '#e67832', // Cam đất
  '#087557', // Xanh rừng
  '#526159', // Xám xanh
  '#6366f1', // Indigo
];

export const periodicReportsApi = {
  /**
   * Lấy danh sách ví tài khoản để lọc báo cáo
   */
  async getAccounts() {
    const user = authStorage.getUser();
    if (user?.childAccount && user?.childWalletGroupId && user?.childWalletId) {
      return [
        {
          id: user.childWalletId,
          name: user.childWalletName || 'Ví của em',
          accountType: 'CASH',
          currencyCode: 'VND',
          balance: 0,
          icon: 'wallet',
          color: '#059669',
        },
      ];
    }
    return transactionApi.getAccounts();
  },

  /**
   * Lấy dữ liệu báo cáo tài chính đầy đủ theo khoảng thời gian và ví
   */
  async getReportData(
    fromDate: string, // YYYY-MM-DD
    toDate: string,   // YYYY-MM-DD
    accountId?: string
  ): Promise<ReportSummaryData> {
    const user = authStorage.getUser();
    const cacheKey = `reports:summary:${fromDate}:${toDate}:${accountId || 'ALL'}:${user?.childWalletId || 'self'}`;
    return fetchMobileWithCache(
      cacheKey,
      async () => {
        const token = authStorage.getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        try {
      // ── NẾU LÀ TÀI KHOẢN TRẺ EM: LẤY DỮ LIỆU CHUẨN TỪ SPEND-REQUESTS CỦA VÍ BÉ ──
      if (user?.childAccount && user?.childWalletGroupId && user?.childWalletId) {
        const res = await fetch(
          `${API_BASE_URL}/groups/${user.childWalletGroupId}/child-wallets/${user.childWalletId}/spend-requests?size=200`,
          { headers }
        );

        if (res.ok) {
          const json = await res.json();
          const rawItems: any[] = Array.isArray(json) ? json : json?.content || json?.data || [];
          const approved = rawItems.filter((i: any) => i.status === 'APPROVED');

          // Lọc theo khoảng ngày fromDate -> toDate
          const inRange = approved.filter((item: any) => {
            const dateStr = item.createdAt ? item.createdAt.slice(0, 10) : '';
            if (!dateStr) return true;
            return dateStr >= fromDate && dateStr <= toDate;
          });

          let totalIncome = 0;
          let totalExpense = 0;
          const dayMap = new Map<string, { income: number; expense: number }>();
          const catMap = new Map<string, { name: string; icon: string; amount: number; count: number }>();

          const topExpenseItems: any[] = [];

          inRange.forEach((item: any) => {
            const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
            const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
            const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
            const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
            const income = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

            const amt = Math.abs(Number(item.amount || 0));
            const dateStr = item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

            if (income) {
              totalIncome += amt;
            } else {
              totalExpense += amt;
              topExpenseItems.push(item);
            }

            // Group theo ngày cho biểu đồ
            const curDay = dayMap.get(dateStr) || { income: 0, expense: 0 };
            if (income) curDay.income += amt;
            else curDay.expense += amt;
            dayMap.set(dateStr, curDay);

            // Group danh mục (chỉ tính chi tiêu)
            if (!income) {
              let catName = item.category?.name || 'Ăn uống / Mua sắm';
              let catIcon = item.category?.icon || 'utensils';
              const curCat = catMap.get(catName) || { name: catName, icon: catIcon, amount: 0, count: 0 };
              curCat.amount += amt;
              curCat.count += 1;
              catMap.set(catName, curCat);
            }
          });

          const netCashFlow = totalIncome - totalExpense;
          const transactionCount = inRange.length;

          const curStart = new Date(fromDate);
          const curEnd = new Date(toDate);
          const diffTime = Math.abs(curEnd.getTime() - curStart.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const pad = (n: number) => String(n).padStart(2, '0');
          const averageDailyExpense = diffDays > 0 ? Math.round(totalExpense / diffDays) : 0;
          const savingRate = totalIncome > 0 ? Math.max(0, Math.round((netCashFlow / totalIncome) * 100)) : 0;

          // Xây dựng danh mục
          const categories = Array.from(catMap.values())
            .map((c, index) => {
              const color = CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
              const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
              return {
                id: `child-cat-${index}`,
                name: c.name,
                color,
                icon: c.icon,
                amount: c.amount,
                percentage: Math.round(pct * 10) / 10,
                count: c.count,
                avgPerTx: Math.round(c.amount / c.count),
              };
            })
            .sort((a, b) => b.amount - a.amount);

          // Xây dựng chuỗi xu hướng ngày
          const dailyTrend: { date: string; fullDate: string; income: number; expense: number }[] = [];
          const isMonthView = diffDays > 10;
          const iter = new Date(curStart);
          while (iter <= curEnd) {
            const ymd = `${iter.getFullYear()}-${pad(iter.getMonth() + 1)}-${pad(iter.getDate())}`;
            const label = isMonthView
              ? String(iter.getDate())
              : `${pad(iter.getDate())}/${pad(iter.getMonth() + 1)}`;
            const flow = dayMap.get(ymd) || { income: 0, expense: 0 };
            dailyTrend.push({
              date: label,
              fullDate: ymd,
              income: flow.income,
              expense: flow.expense,
            });
            iter.setDate(iter.getDate() + 1);
          }

          // Top 5 chi tiêu
          const topTransactions = topExpenseItems
            .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
            .slice(0, 5)
            .map((tx) => {
              const rawDateStr = tx.createdAt ? tx.createdAt.slice(0, 10) : '';
              let formattedDate = rawDateStr;
              if (rawDateStr) {
                const parts = rawDateStr.split('-');
                if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return {
                id: tx.id,
                title: tx.description || 'Chi tiêu',
                sub: `${formattedDate} • ${user.childWalletName || 'Ví của em'}`,
                date: formattedDate,
                wallet: user.childWalletName || 'Ví của em',
                amount: Math.abs(Number(tx.amount || 0)),
                type: 'EXPENSE' as const,
                icon: 'utensils',
                categoryName: tx.category?.name || 'Chi tiêu',
              };
            });

          // ── TÍNH TOÁN KỲ TRƯỚC ĐỂ ĐỐI CHIẾU TRÊN DANH MỤC CHO BÉ ──
          let prevFromStr = '';
          let prevToStr = '';
          const isFirstDayOfMonth = curStart.getDate() === 1;
          const lastDayOfCurMonth = new Date(curStart.getFullYear(), curStart.getMonth() + 1, 0).getDate();
          const isFullMonth = isFirstDayOfMonth && curEnd.getDate() === lastDayOfCurMonth && curStart.getMonth() === curEnd.getMonth();

          if (isFullMonth) {
            const prevMonthStart = new Date(curStart.getFullYear(), curStart.getMonth() - 1, 1);
            const prevMonthEnd = new Date(curStart.getFullYear(), curStart.getMonth(), 0);
            prevFromStr = `${prevMonthStart.getFullYear()}-${pad(prevMonthStart.getMonth() + 1)}-${pad(prevMonthStart.getDate())}`;
            prevToStr = `${prevMonthEnd.getFullYear()}-${pad(prevMonthEnd.getMonth() + 1)}-${pad(prevMonthEnd.getDate())}`;
          } else {
            const prevEnd = new Date(curStart);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - diffDays + 1);
            prevFromStr = `${prevStart.getFullYear()}-${pad(prevStart.getMonth() + 1)}-${pad(prevStart.getDate())}`;
            prevToStr = `${prevEnd.getFullYear()}-${pad(prevEnd.getMonth() + 1)}-${pad(prevEnd.getDate())}`;
          }

          let prevIncome = 0;
          let prevExpense = 0;
          const prevCatMap = new Map<string, number>();

          approved.forEach((item: any) => {
            const d = item.createdAt ? item.createdAt.slice(0, 10) : '';
            if (d && d >= prevFromStr && d <= prevToStr) {
              const isDep = item.description?.startsWith('[INCOME_DEPOSIT] ');
              const isChore = item.description?.startsWith('[INCOME_CHORE] ');
              const isGift = item.description?.startsWith('[INCOME_GIFT] ');
              const isMon = item.description?.startsWith('[MONEY_REQUEST] ');
              const inc = isDep || isChore || isGift || isMon;
              const val = Math.abs(Number(item.amount || 0));

              if (inc) {
                prevIncome += val;
              } else {
                prevExpense += val;
                const cName = item.category?.name || 'Ăn uống / Mua sắm';
                prevCatMap.set(cName, (prevCatMap.get(cName) || 0) + val);
              }
            }
          });

          const calcChange = (curr: number, prev: number) => {
            if (prev === 0 && curr === 0) return 0;
            if (prev === 0) return 100;
            if (curr === 0) return -100;
            return Math.round(((curr - prev) / prev) * 100);
          };

          const incomeChangePercent = calcChange(totalIncome, prevIncome);
          const expenseChangePercent = calcChange(totalExpense, prevExpense);

          // Tạo danh sách đối chiếu trên từng danh mục
          // Lấy hợp nhất các danh mục xuất hiện ở kỳ này và kỳ trước
          const allCatNames = new Set<string>([
            ...categories.map((c) => c.name),
            ...Array.from(prevCatMap.keys()),
          ]);

          const categoryComparisons = Array.from(allCatNames).map((catName, idx) => {
            const curFound = categories.find((c) => c.name === catName);
            const curAmt = curFound ? curFound.amount : 0;
            const prevAmt = prevCatMap.get(catName) || 0;
            const diffAmt = curAmt - prevAmt;
            const pct = calcChange(curAmt, prevAmt);
            const color = curFound?.color || CATEGORY_COLOR_PALETTE[idx % CATEGORY_COLOR_PALETTE.length];

            return {
              id: curFound?.id || `prev-cat-${idx}`,
              name: catName,
              color,
              prevAmount: prevAmt,
              currentAmount: curAmt,
              diffAmount: diffAmt,
              percentChange: pct,
            };
          }).sort((a, b) => b.currentAmount - a.currentAmount);

          const notes: string[] = [];
          if (expenseChangePercent !== 0) {
            notes.push(`Tổng chi tiêu ${expenseChangePercent > 0 ? 'tăng' : 'giảm'} ${Math.abs(expenseChangePercent)}% so với kỳ trước.`);
          }
          if (categoryComparisons.length > 0 && categoryComparisons[0].currentAmount > 0) {
            notes.push(`${categoryComparisons[0].name} là khoản chi lớn nhất (${categoryComparisons[0].currentAmount.toLocaleString('vi-VN')} đ).`);
          }
          if (savingRate > 0) {
            notes.push(`Tỷ lệ tích lũy của em đạt ${savingRate}%.`);
          }

          return {
            totalIncome,
            totalExpense,
            netCashFlow,
            averageDailyExpense,
            savingRate,
            transactionCount,
            aiInsight: {
              status: netCashFlow >= 0 ? 'POSITIVE' : 'WARNING',
              text:
                netCashFlow >= 0
                  ? `Ví của em kỳ này thặng dư +${netCashFlow.toLocaleString('vi-VN')} đ! Em quản lý chi tiêu rất ngoan 🎉`
                  : `Kỳ này em chi tiêu nhiều hơn số tiền nhận được. Hãy tích cực làm nhiệm vụ để tăng thêm tiền vào ví nhé!`,
            },
            dailyTrend,
            topTransactions,
            categories,
            comparison: {
              prevIncome,
              prevExpense,
              prevNet: prevIncome - prevExpense,
              incomeChangePercent,
              expenseChangePercent,
              categoryComparisons,
              notes: notes.length > 0 ? notes : [
                `Tổng thu: +${totalIncome.toLocaleString('vi-VN')} đ`,
                `Tổng chi: -${totalExpense.toLocaleString('vi-VN')} đ`,
                `Số dư tăng thêm: ${netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString('vi-VN')} đ`,
              ],
            },
          };
        }
      }

      const accParam = accountId && accountId !== 'ALL' ? `&accountId=${accountId}` : '';
      
      // 1. Xác định groupBy phù hợp theo khoảng ngày
      const curStart = new Date(fromDate);
      const curEnd = new Date(toDate);
      const diffTime = Math.abs(curEnd.getTime() - curStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const pad = (n: number) => String(n).padStart(2, '0');
      
      // Nếu chọn khoảng thời gian > 90 ngày (ví dụ 6 tháng, 1 năm) thì group theo tháng "month", ngược lại theo ngày "day"
      const isLongPeriod = diffDays > 90;
      const groupByParam = isLongPeriod ? 'month' : 'day';

      // Gọi API summary của kỳ hiện tại
      const summaryUrl = `${API_BASE_URL}/transactions/summary?fromDate=${fromDate}&toDate=${toDate}&groupBy=${groupByParam}${accParam}`;
      const res = await fetch(summaryUrl, { headers });
      
      // 2. Gọi API category breakdown
      const catUrl = `${API_BASE_URL}/transactions/summary?fromDate=${fromDate}&toDate=${toDate}&groupBy=category${accParam}`;
      const catRes = await fetch(catUrl, { headers });

      // 3. Gọi danh sách giao dịch CHI TIÊU để lấy 5 khoản chi tiêu lớn nhất trong đúng kỳ
      // Lấy đủ transactionType=EXPENSE, sắp xếp theo số tiền lớn nhất amount desc
      const txUrl = `${API_BASE_URL}/transactions?fromDate=${fromDate}&toDate=${toDate}&transactionType=EXPENSE&sortBy=amount&sortOrder=desc&page=1&pageSize=10${accParam ? `&accountId=${accountId}` : ''}`;
      const txRes = await fetch(txUrl, { headers });

      // 4. Tính toán kỳ trước chuẩn xác theo đúng loại kỳ:
      // - Nếu là tháng trọn vẹn (ngày 1 đến ngày cuối tháng): kỳ trước là trọn vẹn tháng trước (từ ngày 1 đến ngày cuối tháng trước)
      // - Nếu là khoảng ngày bất kỳ (VD tuần 7 ngày): lùi đúng diffDays
      let prevFromStr = '';
      let prevToStr = '';

      const isFirstDayOfMonth = curStart.getDate() === 1;
      const lastDayOfCurMonth = new Date(curStart.getFullYear(), curStart.getMonth() + 1, 0).getDate();
      const isFullMonth = isFirstDayOfMonth && curEnd.getDate() === lastDayOfCurMonth && curStart.getMonth() === curEnd.getMonth();

      if (isFullMonth) {
        const prevMonthStart = new Date(curStart.getFullYear(), curStart.getMonth() - 1, 1);
        const prevMonthEnd = new Date(curStart.getFullYear(), curStart.getMonth(), 0);
        prevFromStr = `${prevMonthStart.getFullYear()}-${pad(prevMonthStart.getMonth() + 1)}-${pad(prevMonthStart.getDate())}`;
        prevToStr = `${prevMonthEnd.getFullYear()}-${pad(prevMonthEnd.getMonth() + 1)}-${pad(prevMonthEnd.getDate())}`;
      } else {
        const prevEnd = new Date(curStart);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - diffDays + 1);
        prevFromStr = `${prevStart.getFullYear()}-${pad(prevStart.getMonth() + 1)}-${pad(prevStart.getDate())}`;
        prevToStr = `${prevEnd.getFullYear()}-${pad(prevEnd.getMonth() + 1)}-${pad(prevEnd.getDate())}`;
      }

      // Gọi cả summary tổng của kỳ trước và danh mục kỳ trước
      const prevSummaryUrl = `${API_BASE_URL}/transactions/summary?fromDate=${prevFromStr}&toDate=${prevToStr}${accParam}`;
      const prevRes = await fetch(prevSummaryUrl, { headers });

      const prevCatUrl = `${API_BASE_URL}/transactions/summary?fromDate=${prevFromStr}&toDate=${prevToStr}&groupBy=category${accParam}`;
      const prevCatRes = await fetch(prevCatUrl, { headers });

      // Parse JSONs
      const summaryJson = res.ok ? await res.json() : null;
      const catJson = catRes.ok ? await catRes.json() : null;
      const txJson = txRes.ok ? await txRes.json() : null;
      const prevJson = prevRes.ok ? await prevRes.json() : null;
      const prevCatJson = prevCatRes.ok ? await prevCatRes.json() : null;

      const rawSummary = summaryJson?.summary || {};
      const totalIncome = Number(rawSummary.totalIncome || 0);
      const totalExpense = Number(rawSummary.totalExpense || 0);
      const netCashFlow = totalIncome - totalExpense;
      const transactionCount = Number(rawSummary.transactionCount || 0);
      const averageDailyExpense = diffDays > 0 ? Math.round(totalExpense / diffDays) : 0;
      const savingRate = totalIncome > 0 ? Math.max(0, Math.round((netCashFlow / totalIncome) * 100)) : 0;

      // Danh mục chi tiêu
      const rawCategories: any[] = catJson?.byCategory || [];
      const validCategories = rawCategories.filter((c) => Number(c.totalAmount || 0) > 0);
      const sumCatAmounts = validCategories.reduce((acc, c) => acc + Number(c.totalAmount || 0), 0);
      const effectiveTotal = sumCatAmounts > 0 ? sumCatAmounts : totalExpense;

      const categories = validCategories
        .map((c, index) => {
          const color = CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
          const amt = Number(c.totalAmount || 0);
          const count = Number(c.transactionCount || 1);
          // Tỷ lệ phần trăm chính xác (số thực 1 chữ số thập phân)
          const pct = effectiveTotal > 0 ? (amt / effectiveTotal) * 100 : 0;
          return {
            id: c.categoryId || `cat-${index}`,
            name: c.categoryName || 'Chi tiêu khác',
            color,
            icon: 'tag',
            amount: amt,
            percentage: Math.round(pct * 10) / 10,
            count,
            avgPerTx: Math.round(amt / count),
          };
        })
        .sort((a, b) => b.amount - a.amount);

      // Xây dựng chuỗi các mốc thời gian đầy đủ cho biểu đồ (Grid of bars)
      const rawDays: any[] = summaryJson?.byPeriod || [];
      const periodMap = new Map<string, { income: number; expense: number }>();
      rawDays.forEach((d) => {
        periodMap.set(d.date, {
          income: Number(d.income || 0),
          expense: Number(d.expense || 0),
        });
      });

      const dailyTrend: { date: string; fullDate: string; income: number; expense: number }[] = [];

      if (!isLongPeriod) {
        // Group theo từng ngày trong khoảng fromDate -> toDate
        // Nếu khoảng xem > 10 ngày (ví dụ Xem theo Tháng 30-31 ngày) thì chỉ hiện số ngày "1", "2", "3" cho gọn
        const isMonthView = diffDays > 10;
        const iter = new Date(curStart);
        while (iter <= curEnd) {
          const ymd = `${iter.getFullYear()}-${pad(iter.getMonth() + 1)}-${pad(iter.getDate())}`;
          const label = isMonthView
            ? String(iter.getDate()) // "1", "2", "3"...
            : `${pad(iter.getDate())}/${pad(iter.getMonth() + 1)}`; // Tuần ngắn: "02/11", "03/11"...
          const flow = periodMap.get(ymd) || { income: 0, expense: 0 };
          dailyTrend.push({
            date: label,
            fullDate: ymd,
            income: flow.income,
            expense: flow.expense,
          });
          iter.setDate(iter.getDate() + 1);
        }
      } else {
        // Khoảng dài (>90 ngày, quý, năm) -> Group theo từng tháng (YYYY-MM)
        const iter = new Date(curStart.getFullYear(), curStart.getMonth(), 1);
        const endMonth = new Date(curEnd.getFullYear(), curEnd.getMonth(), 1);
        while (iter <= endMonth) {
          const ym = `${iter.getFullYear()}-${pad(iter.getMonth() + 1)}`;
          const label = `T${pad(iter.getMonth() + 1)}`;
          const flow = periodMap.get(ym) || { income: 0, expense: 0 };
          dailyTrend.push({
            date: label,
            fullDate: ym,
            income: flow.income,
            expense: flow.expense,
          });
          iter.setMonth(iter.getMonth() + 1);
        }
      }

      // Top 5 khoản chi tiêu lớn nhất trong kỳ
      const rawTxList: any[] = txJson?.data?.transactions || txJson?.transactions || [];
      const topTransactions = [...rawTxList]
        .filter((tx) => tx.transactionType === 'EXPENSE')
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 5)
        .map((tx) => {
          // Lấy đúng ngày giao dịch thực tế
          const rawDateStr = tx.transactionDate || (tx.occurredAt ? tx.occurredAt.split('T')[0] : '');
          let formattedDate = '';
          if (rawDateStr) {
            const parts = String(rawDateStr).split('-');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
              formattedDate = new Date(rawDateStr).toLocaleDateString('vi-VN');
            }
          }

          // Lấy category icon & thông tin
          const cat = tx.category;
          const catName = cat?.name || tx.categoryName || '';
          const catIcon = cat?.icon || tx.categoryIcon || '';

          // Phân tích icon từ tiêu đề (title / description), categoryName hoặc categoryIcon
          const desc = String(tx.description || '').toLowerCase();
          const lowerName = String(catName || '').toLowerCase();
          const lowerIcon = String(catIcon || '').toLowerCase();
          const combined = `${desc} ${lowerName} ${lowerIcon}`;

          let iconName = 'receipt';
          if (combined.includes('quỹ') || combined.includes('nhóm') || combined.includes('gia đình') || combined.includes('user') || combined.includes('family')) {
            iconName = 'users';
          } else if (combined.includes('nợ') || combined.includes('vay') || combined.includes('mượn') || combined.includes('trả nợ') || combined.includes('credit') || combined.includes('debt') || combined.includes('thẻ')) {
            iconName = 'credit-card';
          } else if (combined.includes('cơm') || combined.includes('ăn') || combined.includes('uống') || combined.includes('food') || combined.includes('cafe') || combined.includes('nhà hàng') || combined.includes('bún') || combined.includes('phở')) {
            iconName = 'utensils';
          } else if (combined.includes('nhà') || combined.includes('phòng') || combined.includes('tiền nhà') || combined.includes('home') || combined.includes('house') || combined.includes('điện') || combined.includes('nước')) {
            iconName = 'home';
          } else if (combined.includes('xe') || combined.includes('xăng') || combined.includes('grab') || combined.includes('di chuyển') || combined.includes('car') || combined.includes('transport')) {
            iconName = 'car';
          } else if (combined.includes('tiết kiệm') || combined.includes('đầu tư') || combined.includes('tích lũy') || combined.includes('piggy') || combined.includes('bank')) {
            iconName = 'piggy-bank';
          } else if (combined.includes('mua') || combined.includes('sắm') || combined.includes('chợ') || combined.includes('siêu thị') || combined.includes('shopping') || combined.includes('bag')) {
            iconName = 'shopping-bag';
          } else if (catIcon) {
            iconName = catIcon;
          }

          const title = tx.description || catName || 'Khoản chi';
          const wallet = tx.accountName || 'Ví chính';
          const sub = [formattedDate, wallet].filter(Boolean).join(' • ');

          return {
            id: tx.id,
            title,
            sub,
            date: formattedDate,
            wallet: wallet,
            amount: Number(tx.amount || 0),
            type: 'EXPENSE' as const,
            icon: iconName,
            categoryName: catName,
          };
        });

      // So sánh kỳ trước
      const prevSummary = prevJson?.summary || {};
      const prevIncome = Number(prevSummary.totalIncome || 0);
      const prevExpense = Number(prevSummary.totalExpense || 0);
      const prevNet = prevIncome - prevExpense;

      // Hàm tính % biến động chuẩn toán học tài chính:
      // formula: ((Kỳ này - Kỳ trước) / Kỳ trước) * 100
      // - Nếu kỳ trước = 0 và kỳ này > 0: tính là +100% (mới phát sinh)
      // - Nếu cả 2 đều = 0: 0%
      // - Nếu kỳ trước > 0 và kỳ này = 0: -100%
      const calcPercentChange = (current: number, previous: number): number => {
        if (previous === 0 && current === 0) return 0;
        if (previous === 0) return 100; // Phát sinh mới
        if (current === 0) return -100; // Giảm toàn bộ
        const diff = current - previous;
        return Math.round((diff / previous) * 100);
      };

      const incomeChangePercent = calcPercentChange(totalIncome, prevIncome);
      const expenseChangePercent = calcPercentChange(totalExpense, prevExpense);

      // So sánh từng danh mục
      const prevCategories: any[] = prevCatJson?.byCategory || [];
      const prevCatMap = new Map<string, number>();
      prevCategories.forEach((pc) => {
        prevCatMap.set(pc.categoryName || '', Number(pc.totalAmount || 0));
      });

      const categoryComparisons = categories.map((cur) => {
        const prevAmt = prevCatMap.get(cur.name) || 0;
        const diffAmt = cur.amount - prevAmt;
        const pct = calcPercentChange(cur.amount, prevAmt);
        return {
          id: cur.id,
          name: cur.name,
          color: cur.color,
          prevAmount: prevAmt,
          currentAmount: cur.amount,
          diffAmount: diffAmt,
          percentChange: pct,
        };
      });

      // Nhận xét FinAI
      const topCat = categories[0];
      const aiInsightText = `Dòng tiền kỳ này đang ${netCashFlow >= 0 ? 'dương' : 'thâm hụt'} ${Math.abs(netCashFlow).toLocaleString('vi-VN')} đ.${
        topCat ? ` Hạng mục tiêu biểu là "${topCat.name}" (${topCat.percentage}%).` : ''
      } ${
        netCashFlow >= 0
          ? 'Khuyến nghị trích 30% thặng dư này cho quỹ tích lũy dài hạn.'
          : 'Khuyến nghị cắt giảm các khoản chi chưa cần thiết để bảo toàn số dư.'
      }`;

      const notes: string[] = [];
      if (expenseChangePercent !== 0) {
        notes.push(`Tổng chi tiêu ${expenseChangePercent > 0 ? 'tăng' : 'giảm'} ${Math.abs(expenseChangePercent)}% so với kỳ trước.`);
      }
      if (topCat) {
        notes.push(`${topCat.name} chiếm tỷ trọng lớn nhất với ${topCat.percentage}% tổng chi.`);
      }
      if (savingRate >= 50) {
        notes.push(`Tỷ lệ tiết kiệm đạt mức lý tưởng (${savingRate}%).`);
      } else if (savingRate > 0) {
        notes.push(`Tỷ lệ tiết kiệm kỳ này đạt ${savingRate}%.`);
      }

      return {
        totalIncome,
        totalExpense,
        netCashFlow,
        averageDailyExpense,
        savingRate,
        transactionCount,
        aiInsight: {
          status: netCashFlow >= 0 ? 'POSITIVE' : 'WARNING',
          text: aiInsightText,
        },
        dailyTrend,
        topTransactions,
        categories,
        comparison: {
          prevIncome,
          prevExpense,
          prevNet,
          incomeChangePercent,
          expenseChangePercent,
          categoryComparisons,
          notes,
        },
      };
        } catch (e) {
          console.warn('Lỗi lấy dữ liệu báo cáo tài chính:', e);
          return getEmptyReportData();
        }
      },
      { freshTimeMs: 20_000, staleTimeMs: 60_000 }
    );
  },
};

export function getEmptyReportData(): ReportSummaryData {
  return {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    averageDailyExpense: 0,
    savingRate: 0,
    transactionCount: 0,
    aiInsight: {
      status: 'NEUTRAL',
      text: 'Chưa có đủ dữ liệu giao dịch trong khoảng thời gian này để FinAI phân tích insight.',
    },
    dailyTrend: [],
    topTransactions: [],
    categories: [],
    comparison: {
      prevIncome: 0,
      prevExpense: 0,
      prevNet: 0,
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      categoryComparisons: [],
      notes: ['Chưa có dữ liệu so sánh cho kỳ này.'],
    },
  };
}

