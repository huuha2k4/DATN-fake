import { API_BASE_URL, authFetch, authStorage } from '../../auth/api/authApi';
import { FinAiHttpError } from '../../ai-assistant/api/finAiAgentApi';
import { getAiHttpError } from '../../ai-assistant/api/aiHttpError';

export interface ForecastPoint {
  date: string;
  predicted_balance: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface BalanceForecastResponse {
  status: string;
  user_id: string;
  current_balance: number;
  projected_end_of_month_balance: number;
  projected_range: {
    lower: number;
    upper: number;
  };
  summary: string;
  forecast_points: ForecastPoint[];
  future_forecast?: ForecastPoint[];
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

async function forecastRequest<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.EXPO_PUBLIC_AI_ANALYTICS_TIMEOUT_MS) || 40000);
  try {
    const response = await authFetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error('Request timed out');
    if (!response.ok || body == null) {
      const failure = getAiHttpError(response.status, body, response.headers.get('X-Request-Id'), response.headers.get('Retry-After'));
      throw new FinAiHttpError(response.status, failure.message, failure.code, failure.requestId, failure.retryAfterSeconds);
    }
    return body as T;
  } catch (error) {
    if (error instanceof FinAiHttpError) throw error;
    if (controller.signal.aborted) throw new FinAiHttpError(0, 'Dịch vụ dự báo chưa xử lý kịp yêu cầu.', 'AI_TIMEOUT');
    throw new FinAiHttpError(0, 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export const balanceForecastApi = {
  async getBalanceForecast(days: number = 15): Promise<BalanceForecastResponse> {
    const data = await forecastRequest<BalanceForecastResponse>(`/forecast/balance?days=${days}`);
    if (data.forecast_points || data.future_forecast) return data;

    // Nếu AI service không có dữ liệu thực tế, trả về mảng rỗng để giao diện hiển thị trạng thái chưa có dữ liệu
    return {
      status: 'empty',
      user_id: data.user_id || authStorage.getUser()?.id || '',
      current_balance: 0,
      projected_end_of_month_balance: 0,
      projected_range: {
        lower: 0,
        upper: 0,
      },
      summary: 'Chưa đủ dữ liệu lịch sử chi tiêu để FinAI mô hình hóa dự báo số dư cho bạn.',
      forecast_points: [],
      future_forecast: [],
    };
  },

  async getTopCategoryForecasts(limit: number = 3): Promise<CategoryForecastResponse[]> {
    const data = await forecastRequest<TopCategoryForecastsResponse>(`/forecast/categories?limit=${limit}`);
    return Array.isArray(data.forecasts) ? data.forecasts : [];
  },
};

