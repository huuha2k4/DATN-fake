import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

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

function getAiServiceBaseUrls(): string[] {
  const list: string[] = [];
  if (API_BASE_URL) {
    const nginxRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    if (nginxRoot && !list.includes(nginxRoot)) {
      list.push(nginxRoot);
    }
  }
  return list;
}

function getUserId(): string {
  const u = authStorage.getUser();
  return u?.id || 'b5f7482d-74a0-4582-8fa2-9c586211a583';
}

async function fetchFromAiEndpoints(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrls = getAiServiceBaseUrls();
  const token = authStorage.getToken();
  let lastError: any = null;

  for (const base of baseUrls) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ AI');
}

export const balanceForecastApi = {
  async getBalanceForecast(days: number = 15): Promise<BalanceForecastResponse> {
    const userId = getUserId();
    try {
      const res = await fetchFromAiEndpoints(`/api/forecast/balance?days=${days}`);
      const data = await res.json();
      if (data && (data.forecast_points || data.future_forecast)) {
        return data;
      }
    } catch (e) {
      console.warn('Lỗi gọi AI forecast API, chuyển sang mock dự báo chất lượng cao:', e);
    }

    // Nếu AI service không có dữ liệu thực tế, trả về mảng rỗng để giao diện hiển thị trạng thái chưa có dữ liệu
    return {
      status: 'empty',
      user_id: userId,
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
    try {
      const res = await fetchFromAiEndpoints(`/api/forecast/categories?limit=${limit}`);
      const data = await res.json();
      if (data && Array.isArray(data.forecasts) && data.forecasts.length > 0) {
        return data.forecasts;
      }
    } catch (e) {
      console.warn('Lỗi gọi AI Category Forecast API:', e);
    }

    return [];
  },
};

