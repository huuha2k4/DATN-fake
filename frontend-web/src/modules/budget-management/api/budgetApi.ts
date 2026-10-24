import { api } from '../../core/api/api';

export type BudgetPeriodType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type BudgetStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';
export type AlertLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'EXCEEDED';

export interface CategoryInfo {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface BudgetItemResponse {
  id: string;
  name?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  category?: CategoryInfo;
  amount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
  alertThresholdPercentage: number;
  status?: BudgetStatus;
  alertLevel: AlertLevel;
}

export interface BudgetSummaryItem {
  id: string;
  name: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
  status: BudgetStatus;
  alertLevel: AlertLevel;
  daysRemaining?: number;
  itemsCount?: number;
  categoriesExceeded?: number;
}

export interface BudgetResponse {
  id: string;
  name: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
  currencyCode: string;
  status: BudgetStatus;
  alertLevel: AlertLevel;
  rolloverEnabled?: boolean;
  alertThresholdPercentage?: number;
  daysTotal?: number;
  daysElapsed?: number;
  daysRemaining?: number;
  dailyBudgetRemaining?: number;
  projectedSpending?: number;
  items?: BudgetItemResponse[];
  itemsCount?: number;
  categoriesExceeded?: number;
  version?: number;
}

export interface BudgetListResponse {
  budgets: BudgetSummaryItem[];
  summary: {
    totalBudgets: number;
    activeBudgets: number;
    onTrack: number;
    warning: number;
    exceeded: number;
  };
}

export interface BudgetSummaryOverview {
  currentPeriod?: {
    name: string;
    startDate: string;
    endDate: string;
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentageUsed: number;
    status: BudgetStatus;
    daysRemaining: number;
  };
  byCategory?: Array<{
    category: string;
    budgeted: number;
    spent: number;
    percentage: number;
    status: BudgetStatus;
  }>;
  performance?: {
    monthsOnTrack: number;
    monthsExceeded: number;
    averageSavingsRate: number;
  };
}

export interface CreateBudgetItemRequest {
  categoryId: string;
  amount: number;
  alertThresholdPercentage?: number;
}

export interface CreateBudgetPayload {
  name: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  currencyCode: string;
  rolloverEnabled?: boolean;
  alertThresholdPercentage?: number;
  items?: CreateBudgetItemRequest[];
}

export interface UpdateBudgetPayload {
  name?: string;
  totalAmount?: number;
  alertThresholdPercentage?: number;
  rolloverEnabled?: boolean;
  version: number;
}

export const budgetApi = {
  // Lấy danh sách ngân sách
  getBudgets: async (params?: {
    status?: BudgetStatus;
    periodType?: BudgetPeriodType;
    year?: number;
    month?: number;
  }): Promise<BudgetListResponse> => {
    const res = await api.get<{ success: boolean; data: BudgetListResponse }>('/budgets', { params });
    return res.data?.data || { budgets: [], summary: { totalBudgets: 0, activeBudgets: 0, onTrack: 0, warning: 0, exceeded: 0 } };
  },

  // Lấy chi tiết ngân sách
  getBudgetById: async (id: string): Promise<BudgetResponse> => {
    const res = await api.get<{ success: boolean; data: BudgetResponse }>(`/budgets/${id}`);
    return res.data?.data;
  },

  // Tạo ngân sách mới
  createBudget: async (payload: CreateBudgetPayload): Promise<BudgetResponse> => {
    const res = await api.post<{ success: boolean; data: BudgetResponse; message: string }>('/budgets', payload);
    return res.data?.data;
  },

  // Cập nhật ngân sách
  updateBudget: async (id: string, payload: UpdateBudgetPayload): Promise<BudgetResponse> => {
    const res = await api.put<{ success: boolean; data: BudgetResponse; message: string }>(`/budgets/${id}`, payload);
    return res.data?.data;
  },

  // Xóa ngân sách
  deleteBudget: async (id: string, version: number): Promise<void> => {
    await api.delete(`/budgets/${id}`, { params: { version } });
  },

  // Thêm item vào ngân sách
  addBudgetItem: async (budgetId: string, payload: CreateBudgetItemRequest): Promise<BudgetItemResponse> => {
    const res = await api.post<{ success: boolean; data: BudgetItemResponse }>(`/budgets/${budgetId}/items`, payload);
    return res.data?.data;
  },

  // Thêm nhanh hạn mức cho 1 danh mục chi tiêu theo tháng
  addCategoryBudgetForMonth: async (params: {
    year: number;
    month: number;
    categoryId: string;
    name?: string;
    amount: number;
    alertThresholdPercentage?: number;
  }): Promise<BudgetItemResponse> => {
    const res = await api.post<{ success: boolean; data: BudgetItemResponse; message: string }>(
      '/budgets/category-item',
      {
        categoryId: params.categoryId,
        name: params.name,
        amount: params.amount,
        alertThresholdPercentage: params.alertThresholdPercentage || 80,
      },
      {
        params: { year: params.year, month: params.month },
      }
    );
    return res.data?.data;
  },

  // Cập nhật item trong ngân sách
  updateBudgetItem: async (
    budgetId: string,
    itemId: string,
    payload: { name?: string; amount?: number; alertThresholdPercentage?: number; version?: number }
  ): Promise<BudgetItemResponse> => {
    const res = await api.put<{ success: boolean; data: BudgetItemResponse; message: string }>(
      `/budgets/${budgetId}/items/${itemId}`,
      payload
    );
    return res.data?.data;
  },

  // Xóa item khỏi ngân sách
  deleteBudgetItem: async (budgetId: string, itemId: string): Promise<void> => {
    await api.delete(`/budgets/${budgetId}/items/${itemId}`);
  },

  // Lấy tổng quan ngân sách
  getBudgetsSummary: async (period: string = 'current_month'): Promise<BudgetSummaryOverview> => {
    const res = await api.get<{ success: boolean; data: BudgetSummaryOverview }>('/budgets/summary', {
      params: { period },
    });
    return res.data?.data;
  },
};
