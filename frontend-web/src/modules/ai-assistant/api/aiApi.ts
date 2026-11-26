import { api } from '../../core/api/api';
import { finAiAgentApi } from './finAiAgentApi';

const analyticsRequestConfig = {
  timeout: Number(import.meta.env.VITE_AI_ANALYTICS_TIMEOUT_MS || 40000),
};

export interface ChatResponse {
  answer: string;
  status: string;
  session_id?: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  author: 'assistant' | 'user';
  text: string;
  kind?: 'analysis' | 'success' | 'normal';
  created_at?: string;
}

export interface RecommendationItem {
  icon?: string;
  priority?: string;
  title: string;
  summary?: string;
  explanation?: string;
  action_steps?: string[];
  potential_savings?: number;
}

export interface RecommendationResponse {
  status: string;
  user_id?: string;
  message?: string;
  health_score?: number;
  health_rating?: string;
  total_monthly_potential_savings?: number;
  overall_advice?: string;
  recommendations: RecommendationItem[];
}

export interface AnomalyItem {
  transaction_id?: string;
  date?: string;
  amount: number;
  category?: string;
  note?: string;
  severity: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ratio_to_mean?: number;
  explanation: string;
}

export interface FinancialPersona {
  code: string;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  description: string;
  affinity_score?: number;
}

export interface BehaviorProfileResponse {
  status: string;
  user_id?: string;
  message?: string;
  persona: FinancialPersona;
  summary: {
    total_income: number;
    total_expense: number;
    net_savings: number;
    savings_rate: number;
    savings_label: string;
  };
  rule_50_30_20: {
    needs_spent: number;
    needs_pct: number;
    wants_spent: number;
    wants_pct: number;
    savings_spent: number;
    savings_pct: number;
  };
  dining_analysis: {
    dining_amount: number;
    dining_percentage: number;
    is_heavy: boolean;
  };
  temporal_patterns: {
    eom_surge_ratio: number;
    has_eom_spike: boolean;
    weekend_percentage: number;
    night_transactions: number;
    night_percentage: number;
  };
  top_categories: {
    category_id: string;
    category_name: string;
    total_amount: number;
    percentage: number;
  }[];
  radar_scores: {
    savings_discipline: number;
    needs_control: number;
    lifestyle_moderation: number;
    temporal_stability: number;
    food_moderation: number;
  };
  findings: string[];
}

export interface BalanceForecastPoint {
  date: string;
  actual_balance?: number;
  predicted_balance?: number;
  lower_bound?: number;
  upper_bound?: number;
  outflow?: number;
}

export interface BalanceForecastResponse {
  status: string;
  message?: string;
  algorithm?: string;
  current_balance: number;
  projected_end_of_month_balance: number;
  projected_range?: {
    lower: number;
    upper: number;
  };
  trend?: string;
  summary: string;
  historical_data?: BalanceForecastPoint[];
  future_forecast?: BalanceForecastPoint[];
  historical_points?: BalanceForecastPoint[];
  forecast_points?: BalanceForecastPoint[];
}

export interface CategoryForecastResponse {
  status: string;
  category_name: string;
  category_icon?: string | null;
  category_color?: string | null;
  days_passed: number;
  days_remaining: number;
  current_spent: number;
  daily_rate: number;
  projected_total_month: number;
  budget_limit?: number | null;
  risk_level: string;
  summary: string;
}

export interface TopCategoryForecastsResponse {
  status: string;
  forecasts: CategoryForecastResponse[];
}

/**
 * Gửi câu hỏi đến Trợ lý AI (FinAI Copilot)
 */
export async function sendChatMessage(question: string, _userId?: string, sessionId?: string): Promise<{ answer: string; sessionId?: string }> {
  const response = await finAiAgentApi.sendMessage(question, sessionId);
  return {
    answer: response.message + (response.actions.length ? '\n\nMở hội thoại FinAI để xem và xác nhận đề xuất.' : ''),
    sessionId: response.conversationId,
  };
}

export async function getChatSessions(_userId?: string): Promise<ChatSessionItem[]> {
  try {
    const response = await api.get<ChatSessionItem[]>('/chat/sessions');
    return response.data || [];
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử hội thoại:', error);
    return [];
  }
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessageItem[]> {
  try {
    const response = await api.get<ChatMessageItem[]>('/chat/sessions/' + sessionId + '/messages');
    return response.data || [];
  } catch (error) {
    console.error('Lỗi khi lấy tin nhắn session:', error);
    return [];
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    await api.delete('/chat/sessions/' + sessionId);
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa session:', error);
    return false;
  }
}

/**
 * Lấy hồ sơ hành vi chi tiêu (AI 2: Persona, 50/30/20, Radar Scores)
 */
export async function getBehaviorProfile(_userId?: string): Promise<BehaviorProfileResponse> {
  void _userId;
  const response = await api.get<BehaviorProfileResponse>('/behavior/profile', analyticsRequestConfig);
  return response.data;
}

/**
 * Lấy danh sách giao dịch bất thường (AI 4: Isolation Forest)
 */
export async function getSpendingAnomalies(_userId?: string): Promise<AnomalyItem[]> {
  void _userId;
  const response = await api.get<AnomalyItem[]>('/anomalies', analyticsRequestConfig);
  return response.data || [];
}

/**
 * Kiểm tra xem một giao dịch thêm mới có dấu hiệu bất thường không
 */
export async function checkTransactionAnomaly(amount: number, categoryId?: string, hour?: number) {
  const response = await api.post('/anomalies/check', {
    amount,
    category_id: categoryId || 'cat_food',
    hour: hour !== undefined ? hour : new Date().getHours(),
  }, analyticsRequestConfig);
  return response.data;
}

/**
 * Lấy danh sách đề xuất tài chính & điểm sức khỏe từ AI (AI 5)
 */
export async function getAiRecommendations(_userId?: string): Promise<RecommendationResponse> {
  void _userId;
  const response = await api.get<RecommendationResponse>('/recommendations', analyticsRequestConfig);
  return response.data;
}

/**
 * Lấy dự báo số dư tài khoản đến cuối tháng (AI 3: Facebook Prophet)
 */
export async function getBalanceForecast(days: number = 30, _userId?: string): Promise<BalanceForecastResponse> {
  void _userId;
  const response = await api.get<BalanceForecastResponse>(`/forecast/balance?days=${days}`, analyticsRequestConfig);
  return response.data;
}

/**
 * Lấy dự báo chi tiêu cho một danh mục đến cuối tháng (AI 3)
 */
export async function getCategoryForecast(category?: string, _userId?: string): Promise<CategoryForecastResponse> {
  void _userId;
  const categoryQuery = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await api.get<CategoryForecastResponse>(`/forecast/category${categoryQuery}`, analyticsRequestConfig);
  return response.data;
}

export async function getTopCategoryForecasts(limit: number = 3, _userId?: string): Promise<TopCategoryForecastsResponse> {
  void _userId;
  const response = await api.get<TopCategoryForecastsResponse>(
    `/forecast/categories?limit=${limit}`,
    analyticsRequestConfig,
  );
  return response.data;
}

export interface GoalForecastItem {
  goal_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  progress_pct: number;
  remaining_amount: number;
  months_needed: number;
  estimated_completion_month: string;
}

export interface GoalForecastResponse {
  status: string;
  estimated_monthly_saving: number;
  goals: GoalForecastItem[];
  summary: string;
}

/**
 * Lấy dự báo tiến độ hoàn thành các mục tiêu tài chính từ AI
 */
export async function getGoalsForecast(_userId?: string): Promise<GoalForecastResponse> {
  void _userId;
  const response = await api.get<GoalForecastResponse>('/forecast/goals', analyticsRequestConfig);
  return response.data;
}
