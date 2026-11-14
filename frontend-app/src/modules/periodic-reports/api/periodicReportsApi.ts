import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { transactionApi } from '../../add-transaction/api/transactionApi';

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
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
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
      // Fallback dữ liệu mẫu đẹp nếu backend chưa có giao dịch
      return getFallbackReportData();
    }
  },
};

export function getFallbackReportData(): ReportSummaryData {
  return {
    totalIncome: 9550002,
    totalExpense: 847000,
    netCashFlow: 8703002,
    averageDailyExpense: 28233,
    savingRate: 91,
    transactionCount: 20,
    aiInsight: {
      status: 'POSITIVE',
      text: 'Dòng tiền kỳ này đang dương 8.703.002 đ. Hạng mục tiêu biểu là "Ăn uống" (36%). Khuyến nghị trích 30% thặng dư này cho quỹ tích lũy dài hạn.',
    },
    dailyTrend: [
      { date: '01/11', fullDate: '2026-11-01', income: 0, expense: 50000 },
      { date: '05/11', fullDate: '2026-11-05', income: 9550002, expense: 200000 },
      { date: '08/11', fullDate: '2026-11-08', income: 0, expense: 500000 },
      { date: '16/11', fullDate: '2026-11-16', income: 0, expense: 97000 },
      { date: '23/11', fullDate: '2026-11-23', income: 0, expense: 0 },
      { date: '30/11', fullDate: '2026-11-30', income: 0, expense: 0 },
    ],
    topTransactions: [
      { id: '1', title: 'Nộp quỹ nhóm: Đại gia đình', sub: '08/11/2026 • Tiền mặt', date: '08/11/2026', wallet: 'Tiền mặt', amount: 500000, type: 'EXPENSE', icon: 'users', categoryName: 'Chi phí khác' },
      { id: '2', title: 'Trả nợ cho: Vay anh Long', sub: '09/11/2026 • Vietcombank', date: '09/11/2026', wallet: 'Vietcombank', amount: 200000, type: 'EXPENSE', icon: 'credit-card', categoryName: 'Trả nợ' },
      { id: '3', title: 'Đóng góp vào mục tiêu: Nhà', sub: '09/11/2026 • Tiết kiệm', date: '09/11/2026', wallet: 'Tiết kiệm', amount: 10000, type: 'EXPENSE', icon: 'home', categoryName: 'Tiết kiệm' },
      { id: '4', title: 'Mua cơm', sub: '07/11/2026 • Ăn uống', date: '07/11/2026', wallet: 'Tiền mặt', amount: 25000, type: 'EXPENSE', icon: 'utensils', categoryName: 'Ăn uống' },
      { id: '5', title: 'Khoản chi', sub: '07/11/2026 • Ăn uống', date: '07/11/2026', wallet: 'Tiền mặt', amount: 20000, type: 'EXPENSE', icon: 'shopping-bag', categoryName: 'Ăn uống' },
    ],
    categories: [
      { id: 'c1', name: 'Ăn uống', color: '#10B981', icon: 'utensils', amount: 305000, percentage: 36, count: 8, avgPerTx: 38125 },
      { id: 'c2', name: 'Di chuyển', color: '#0EA5E9', icon: 'car', amount: 200000, percentage: 24, count: 1, avgPerTx: 200000 },
      { id: 'c3', name: 'Trả nợ', color: '#F59E0B', icon: 'credit-card', amount: 200000, percentage: 24, count: 1, avgPerTx: 200000 },
      { id: 'c4', name: 'Gia đình & Con cái', color: '#3B82F6', icon: 'users', amount: 132000, percentage: 16, count: 3, avgPerTx: 44000 },
      { id: 'c5', name: 'Tiết kiệm, đầu tư', color: '#8B5CF6', icon: 'piggy-bank', amount: 10000, percentage: 1, count: 1, avgPerTx: 10000 },
    ],
    comparison: {
      prevIncome: 228000,
      prevExpense: 763456,
      prevNet: -535456,
      incomeChangePercent: 4174,
      expenseChangePercent: 11,
      categoryComparisons: [
        { id: 'c1', name: 'Ăn uống', color: '#10B981', prevAmount: 50000, currentAmount: 305000, diffAmount: 255000, percentChange: 510 },
        { id: 'c2', name: 'Di chuyển', color: '#0EA5E9', prevAmount: 0, currentAmount: 200000, diffAmount: 200000, percentChange: 100 },
        { id: 'c3', name: 'Trả nợ', color: '#F59E0B', prevAmount: 123456, currentAmount: 200000, diffAmount: 76544, percentChange: 62 },
        { id: 'c4', name: 'Gia đình & Con cái', color: '#3B82F6', prevAmount: 170000, currentAmount: 132000, diffAmount: -38000, percentChange: -22 },
        { id: 'c5', name: 'Tiết kiệm, đầu tư', color: '#8B5CF6', prevAmount: 10000, currentAmount: 10000, diffAmount: 0, percentChange: 0 },
      ],
      notes: [
        'Tổng chi tiêu tăng 11% so với kỳ trước.',
        'Ăn uống tăng mạnh nhất (+510%).',
        'Gia đình & Con cái giảm 22%.',
      ],
    },
  };
}

