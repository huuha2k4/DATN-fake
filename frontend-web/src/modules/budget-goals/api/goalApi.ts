import { api } from '../../core/api/api';

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

export interface MilestoneInfo {
  id?: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  isReached?: boolean;
  reachedAt?: string;
}

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
  milestones?: MilestoneInfo[];
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
    const params = status ? { status } : {};
    const res = await api.get<GoalListResponse>('/goals', { params });
    return res.data;
  },

  // Lấy tổng quan mục tiêu
  getGoalsSummary: async (): Promise<GoalSummaryResponse> => {
    const res = await api.get<GoalSummaryResponse>('/goals/summary');
    return res.data;
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
    return res.data;
  },

  // Cập nhật mục tiêu
  updateGoal: async (id: string, data: UpdateGoalRequest): Promise<GoalResponse> => {
    const res = await api.put<GoalResponse>(`/goals/${id}`, data);
    return res.data;
  },

  // Xóa mục tiêu
  deleteGoal: async (id: string): Promise<void> => {
    await api.delete(`/goals/${id}`);
  },

  // Nạp tiền / đóng góp vào mục tiêu
  contribute: async (id: string, data: ContributeRequest): Promise<any> => {
    const res = await api.post(`/goals/${id}/contribute`, data);
    return res.data;
  },

  // Đánh dấu hoàn thành
  completeGoal: async (id: string, note?: string): Promise<GoalResponse> => {
    const res = await api.put<GoalResponse>(`/goals/${id}/complete`, { note });
    return res.data;
  },
};
