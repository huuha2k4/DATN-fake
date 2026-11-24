import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

export interface PersonaInfo {
  title: string;
  tagline?: string;
  description: string;
  icon?: string;
}

export interface Rule503020 {
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
  needs_amount?: number;
  wants_amount?: number;
  savings_amount?: number;
}

export interface DiningAnalysis {
  dining_amount: number;
  dining_percentage: number;
  average_transaction?: number;
  surge_detected?: boolean;
}

export interface CategoryDistribution {
  category_id?: string;
  category_name: string;
  category?: string;
  total_amount: number;
  amount?: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface BehaviorProfileResponse {
  status?: string;
  user_id?: string;
  persona: PersonaInfo;
  findings: string[];
  rule_50_30_20: Rule503020;
  dining_analysis: DiningAnalysis;
  radar_scores?: {
    savings_discipline: number;
    needs_control: number;
    dining_control?: number;
    impulse_control?: number;
  };
  top_categories: CategoryDistribution[];
}

export interface AnomalyItem {
  transaction_id: string;
  date: string;
  amount: number;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  explanation: string;
  total_scanned?: number;
}

export interface AnomalyResponse {
  anomalies: AnomalyItem[];
  total_scanned: number;
  risk_level: string;
}

export interface RecommendationItem {
  id?: string;
  title: string;
  summary?: string;
  explanation?: string;
  action_steps?: string[];
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  icon?: string;
}

export interface RecommendationResponse {
  status?: string;
  user_id?: string;
  total_monthly_potential_savings: number;
  health_score: number;
  health_rating: string;
  overall_advice: string;
  recommendations: RecommendationItem[];
  message?: string;
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

export const fallbackProfile: BehaviorProfileResponse = {
  persona: {
    title: 'Chưa đủ dữ liệu phân tích',
    tagline: 'Cần thêm các giao dịch chi tiêu để FinAI định hình thói quen tài chính của bạn.',
    description: 'Chưa đủ dữ liệu phân tích.',
    icon: '📊',
  },
  findings: [
    'Chưa có đủ số lượng giao dịch để tổng hợp thói quen.',
    'Hãy ghi chép các khoản chi tiêu hàng ngày để FinAI đưa ra insight chuẩn xác nhất.',
  ],
  rule_50_30_20: {
    needs_pct: 0,
    wants_pct: 0,
    savings_pct: 0,
  },
  dining_analysis: {
    dining_amount: 0,
    dining_percentage: 0,
  },
  radar_scores: {
    savings_discipline: 0,
    needs_control: 0,
  },
  top_categories: [],
};

export const fallbackAnomalies: AnomalyItem[] = [];

export const fallbackRecommendations: RecommendationResponse = {
  total_monthly_potential_savings: 0,
  health_score: 100,
  health_rating: 'Khởi đầu mới',
  overall_advice: 'Bạn chưa có nhiều dữ liệu giao dịch. Hãy tiếp tục ghi chép để FinAI hỗ trợ tối ưu tài chính nhé!',
  recommendations: [],
};

export async function fetchBehaviorProfile(): Promise<BehaviorProfileResponse> {
  const token = authStorage.getToken();
  const baseUrls = getAiServiceBaseUrls();

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}/api/behavior/profile`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.persona) {
          return {
            ...fallbackProfile,
            ...data,
            top_categories: (data.top_categories && data.top_categories.length > 0)
              ? data.top_categories.map((c: any) => ({
                  category_name: c.category_name || c.category || 'Danh mục',
                  total_amount: c.total_amount ?? c.amount ?? 0,
                  percentage: c.percentage ?? 0,
                }))
              : fallbackProfile.top_categories,
          };
        }
      }
    } catch {
      // ignore & try next
    }
  }
  return fallbackProfile;
}

export async function fetchSpendingAnomalies(): Promise<AnomalyResponse> {
  const token = authStorage.getToken();
  const baseUrls = getAiServiceBaseUrls();

  let totalScanned = 0;

  // Lấy tổng số lượng giao dịch chi tiêu thực tế từ Backend Database (/api/v1/transactions)
  try {
    const txRes = await fetch(`${API_BASE_URL}/transactions?pageSize=1&transactionType=EXPENSE`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (txRes.ok) {
      const txData = await txRes.json();
      const count = txData?.pagination?.totalItems ?? txData?.summary?.transactionCount ?? txData?.data?.total;
      if (typeof count === 'number' && count > 0) {
        totalScanned = count;
      }
    }
  } catch (e) {
    // ignore
  }

  // Nếu chưa lấy được từ EXPENSE, thử lấy toàn bộ transactions
  if (totalScanned === 0) {
    try {
      const txAllRes = await fetch(`${API_BASE_URL}/transactions?pageSize=1`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (txAllRes.ok) {
        const txAllData = await txAllRes.json();
        const count = txAllData?.pagination?.totalItems ?? txAllData?.summary?.transactionCount ?? txAllData?.data?.total;
        if (typeof count === 'number' && count > 0) {
          totalScanned = count;
        }
      }
    } catch {}
  }

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}/api/anomalies`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        let list: AnomalyItem[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.anomalies && Array.isArray(data.anomalies)) {
          list = data.anomalies;
        }

        const scanned = (typeof data?.total_scanned === 'number' && data.total_scanned > 0)
          ? data.total_scanned
          : (totalScanned > 0 ? totalScanned : 0);
        const risk = list.length === 0 ? 'An toàn' : list.length <= 2 ? 'Thấp' : 'Trung bình';
        return {
          anomalies: list,
          total_scanned: scanned,
          risk_level: risk,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    anomalies: [],
    total_scanned: totalScanned,
    risk_level: 'An toàn',
  };
}

export async function fetchAiRecommendations(): Promise<RecommendationResponse> {
  const token = authStorage.getToken();
  const baseUrls = getAiServiceBaseUrls();

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}/api/recommendations`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.recommendations || data.health_score !== undefined)) {
          return {
            ...fallbackRecommendations,
            ...data,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return fallbackRecommendations;
}

