import { api } from '../../core/api/api';
import { fetchWithCache, invalidateQueryCache } from '../../core/utils/queryCache';

export type GoalType = 
  | 'EMERGENCY_FUND'
  | 'PURCHASE'
  | 'VACATION'
  | 'EDUCATION'
  | 'RETIREMENT'
  | 'DEBT_PAYOFF'
  | 'INVESTMENT'
  | 'OTHER';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PAUSED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AutoSaveFrequency = 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

export interface ContributionInfo {
  id?: string;
  amount: number;
  contributedAt?: string;
  note?: string;
  sourceAccountId?: string;
  sourceAccountName?: string;
}

export interface GoalResponse {
  id: string;
  name: string;
  goalType: GoalType;
  targetAmount: number;
  currentAmount: number;
  remaining?: number;
  percentageComplete?: number;
  currencyCode?: string;
  status: GoalStatus;
  priority?: GoalPriority;
  icon?: string;
  color?: string;
  description?: string;
  targetDate?: string;
  daysTotal?: number;
  daysElapsed?: number;
  daysRemaining?: number;
  suggestedMonthlySaving?: number;
  autoSave?: {
    enabled: boolean;
    amount?: number;
    frequency?: AutoSaveFrequency;
    accountId?: string;
  };
  progress?: {
    onTrack?: boolean;
    projectedCompletionDate?: string;
    monthlyRequired?: number;
    averageMonthlyContribution?: number;
  };
  contributions?: ContributionInfo[];
  completedAt?: string;
  completedNote?: string;
  createdAt?: string;
}

export interface GoalSummaryResponse {
  summary: {
    totalGoals: number;
    inProgress: number;
    completed: number;
    onTrack?: number;
    behindSchedule?: number;
    totalTargetAmount: number;
    totalSaved: number;
    overallProgress: number;
  };
  byType?: Array<{
    type: GoalType;
    count: number;
    totalTarget: number;
    totalSaved: number;
  }>;
}

export interface GoalListResponse {
  goals: GoalResponse[];
  summary?: {
    totalGoals: number;
    inProgress: number;
    completed: number;
    totalTarget: number;
    totalSaved: number;
  };
}

export interface CreateGoalRequest {
  name: string;
  goalType: GoalType;
  targetAmount: number;
  currentAmount?: number;
  currencyCode?: string;
  targetDate?: string;
  priority?: GoalPriority;
  icon?: string;
  color?: string;
  description?: string;
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: AutoSaveFrequency;
  accountId?: string;
}

export interface UpdateGoalRequest {
  name?: string;
  targetAmount?: number;
  targetDate?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  icon?: string;
  color?: string;
  description?: string;
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: AutoSaveFrequency;
  accountId?: string;
}

export interface ContributeRequest {
  amount: number;
  note?: string;
  sourceAccountId?: string;
}

export const goalApi = {
  // Lấy danh sách mục tiêu
  getGoals: async (status?: GoalStatus): Promise<GoalListResponse> => {
    return fetchWithCache(
      `goals:list:${status || 'ALL'}`,
      async () => {
        const params = status ? { status } : {};
        const res = await api.get<GoalListResponse>('/goals', { params });
        return res.data;
      },
      { freshTimeMs: 20_000, staleTimeMs: 60_000 }
    );
  },

  // Lấy tổng quan mục tiêu
  getGoalsSummary: async (): Promise<GoalSummaryResponse> => {
    return fetchWithCache(
      'goals:summary',
      async () => {
        const res = await api.get<GoalSummaryResponse>('/goals/summary');
        return res.data;
      },
      { freshTimeMs: 20_000, staleTimeMs: 60_000 }
    );
  },

  // Lấy chi tiết 1 mục tiêu
  getGoalById: async (id: string): Promise<GoalResponse> => {
    const res = await api.get<GoalResponse>(`/goals/${id}`);
    return res.data;
  },

  // Tạo mục tiêu mới
  createGoal: async (data: CreateGoalRequest): Promise<GoalResponse> => {
    const res = await api.post<GoalResponse>('/goals', {
      currencyCode: 'VND',
      priority: 'MEDIUM',
      autoSaveEnabled: false,
      ...data,
    });
    invalidateQueryCache('goals:');
    return res.data;
  },

  // Cập nhật mục tiêu
  updateGoal: async (id: string, data: UpdateGoalRequest): Promise<GoalResponse> => {
    const res = await api.put<GoalResponse>(`/goals/${id}`, data);
    invalidateQueryCache('goals:');
    return res.data;
  },

  // Xóa mục tiêu
  deleteGoal: async (id: string): Promise<void> => {
    await api.delete(`/goals/${id}`);
    invalidateQueryCache('goals:');
  },

  // Nạp tiền / đóng góp vào mục tiêu
  contribute: async (id: string, data: ContributeRequest): Promise<any> => {
    const res = await api.post(`/goals/${id}/contribute`, data);
    invalidateQueryCache(['goals:', 'accounts:', 'transactions:']);
    return res.data;
  },

  // Rút tiền từ mục tiêu về ví/tài khoản
  withdraw: async (id: string, data: { amount: number; note?: string; targetAccountId?: string }): Promise<any> => {
    const res = await api.post(`/goals/${id}/withdraw`, data);
    invalidateQueryCache(['goals:', 'accounts:', 'transactions:']);
    return res.data;
  },

  // Đánh dấu hoàn thành
  completeGoal: async (id: string, note?: string): Promise<GoalResponse> => {
    const res = await api.put<GoalResponse>(`/goals/${id}/complete`, { note });
    invalidateQueryCache('goals:');
    return res.data;
  },
};
