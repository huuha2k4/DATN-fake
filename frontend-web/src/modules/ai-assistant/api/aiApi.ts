import axios from 'axios';
import { getStoredUser } from '../../auth/api/authApi';

export interface ChatResponse {
  answer: string;
  status: string;
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
  historical_data: BalanceForecastPoint[];
  future_forecast: BalanceForecastPoint[];
}

export interface CategoryForecastResponse {
  status: string;
  category_name: string;
  days_passed: number;
  days_remaining: number;
  current_spent: number;
  daily_rate: number;
  projected_total_month: number;
  budget_limit?: number | null;
  risk_level: string;
  summary: string;
}

function getCurrentUserId(userId?: string): string {
  return userId || getStoredUser()?.id || 'b5f7482d-74a0-4582-8fa2-9c586211a583';
}

/**
 * Gửi câu hỏi đến Trợ lý AI (FinAI Copilot)
 */
export async function sendChatMessage(question: string, userId?: string): Promise<string> {
  const currentUserId = getCurrentUserId(userId);
  try {
    const response = await axios.post<ChatResponse>('/api/chat', {
      question,
      user_id: currentUserId,
    });
    return response.data.answer || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này vào lúc này.';
  } catch (error) {
    console.error('Lỗi khi gọi API AI Chat:', error);
    throw error;
  }
}

/**
 * Lấy hồ sơ hành vi chi tiêu (AI 2: Persona, 50/30/20, Radar Scores)
 */
export async function getBehaviorProfile(userId?: string): Promise<BehaviorProfileResponse> {
  const currentUserId = getCurrentUserId(userId);
  const response = await axios.get<BehaviorProfileResponse>(`/api/behavior/profile?user_id=${currentUserId}`);
  return response.data;
}

/**
 * Lấy danh sách giao dịch bất thường (AI 4: Isolation Forest)
 */
export async function getSpendingAnomalies(userId?: string): Promise<AnomalyItem[]> {
  const currentUserId = getCurrentUserId(userId);
  const response = await axios.get<AnomalyItem[]>(`/api/anomalies?user_id=${currentUserId}`);
  return response.data || [];
}

/**
 * Kiểm tra xem một giao dịch thêm mới có dấu hiệu bất thường không
 */
export async function checkTransactionAnomaly(amount: number, categoryId?: string, hour?: number) {
  const response = await axios.post('/api/anomalies/check', {
    amount,
    category_id: categoryId || 'cat_food',
    hour: hour !== undefined ? hour : new Date().getHours(),
  });
  return response.data;
}

/**
 * Lấy danh sách đề xuất tài chính & điểm sức khỏe từ AI (AI 5)
 */
export async function getAiRecommendations(userId?: string): Promise<RecommendationResponse> {
  const currentUserId = getCurrentUserId(userId);
  const response = await axios.get<RecommendationResponse>(`/api/recommendations?user_id=${currentUserId}`);
  return response.data;
}

/**
 * Lấy dự báo số dư tài khoản đến cuối tháng (AI 3: Facebook Prophet)
 */
export async function getBalanceForecast(days: number = 30, userId?: string): Promise<BalanceForecastResponse> {
  const currentUserId = getCurrentUserId(userId);
  const response = await axios.get<BalanceForecastResponse>(`/api/forecast/balance?user_id=${currentUserId}&days=${days}`);
  return response.data;
}

/**
 * Lấy dự báo chi tiêu cho một danh mục đến cuối tháng (AI 3)
 */
export async function getCategoryForecast(category: string = 'Ăn uống', userId?: string): Promise<CategoryForecastResponse> {
  const currentUserId = getCurrentUserId(userId);
  const response = await axios.get<CategoryForecastResponse>(`/api/forecast/category?user_id=${currentUserId}&category=${encodeURIComponent(category)}`);
  return response.data;
}
