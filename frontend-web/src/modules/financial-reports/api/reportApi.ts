import { api } from '../../core/api/api';
import { fetchWithCache, stableSerializeParams } from '../../core/utils/queryCache';

export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageAmount: number;
}

export interface PeriodFlowItem {
  date: string; // e.g. "2026-10"
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface LargestExpense {
  amount: number;
  description: string;
  date: string;
}

export interface MostFrequentCategory {
  id: string;
  name: string;
  count: number;
  totalAmount: number;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  walletCashIn?: number;
  walletCashOut?: number;
  walletNetCashFlow?: number;
  averageDailyExpense: number;
  transactionCount: number;
  largestExpense?: LargestExpense;
  mostFrequentCategory?: MostFrequentCategory;
}

export interface TransactionSummaryResponse {
  period: {
    from: string;
    to: string;
    groupBy?: string;
  };
  summary: SummaryStats;
  byCategory: CategorySummaryItem[];
  byPeriod: PeriodFlowItem[];
  currencyCode?: string;
}

export interface ReportFilterParams {
  fromDate: string;
  toDate: string;
  groupBy?: 'day' | 'week' | 'month' | 'category';
  accountId?: string;
}

export const reportApi = {
  // Lấy tổng quan báo cáo theo khoảng thời gian
  getSummary: async (params: ReportFilterParams): Promise<TransactionSummaryResponse> => {
    return fetchWithCache(
      `reports:summary:${stableSerializeParams(params as unknown as Record<string, unknown>)}`,
      async () => {
        const res = await api.get<TransactionSummaryResponse>('/transactions/summary', { params });
        return res.data;
      },
      { freshTimeMs: 20_000, staleTimeMs: 90_000 }
    );
  },

  // Lấy xu hướng chi tiêu nhiều tháng (3months, 6months, 1year)
  getTrends: async (period: '3months' | '6months' | '1year' = '6months', categoryId?: string): Promise<TransactionSummaryResponse> => {
    return fetchWithCache(
      `reports:trends:${period}:${categoryId || ''}`,
      async () => {
        const res = await api.get<TransactionSummaryResponse>('/transactions/trends', {
          params: { period, categoryId }
        });
        return res.data;
      },
      { freshTimeMs: 20_000, staleTimeMs: 90_000 }
    );
  },

  // Lấy cơ cấu chi tiêu theo danh mục
  getByCategory: async (fromDate: string, toDate: string, transactionType: 'EXPENSE' | 'INCOME' = 'EXPENSE'): Promise<TransactionSummaryResponse> => {
    return fetchWithCache(
      `reports:by-category:${fromDate}:${toDate}:${transactionType}`,
      async () => {
        const res = await api.get<TransactionSummaryResponse>('/transactions/by-category', {
          params: { fromDate, toDate, transactionType }
        });
        return res.data;
      },
      { freshTimeMs: 20_000, staleTimeMs: 90_000 }
    );
  }
};
