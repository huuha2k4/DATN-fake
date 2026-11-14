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
  if (process.env.EXPO_PUBLIC_AI_URL) {
    list.push(process.env.EXPO_PUBLIC_AI_URL);
  }
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

export const fallbackProfile: BehaviorProfileResponse = {
  persona: {
    title: 'Người Tiết Kiệm & Kỷ Luật',
    tagline: 'Ưu tiên tích lũy dự phòng, chi tiêu có kế hoạch chặt chẽ.',
    description: 'Ưu tiên tích lũy dự phòng, chi tiêu có kế hoạch chặt chẽ.',
    icon: '🛡️',
  },
  findings: [
    'Chi tiêu ăn uống chiếm 26.7% tổng ngân sách.',
    'Tỷ lệ tiết kiệm khả quan: đạt 66.9% tổng thu nhập.',
    'Có xu hướng chi mạnh vào cuối tuần.',
  ],
  rule_50_30_20: {
    needs_pct: 18.5,
    wants_pct: 14.6,
    savings_pct: 66.9,
  },
  dining_analysis: {
    dining_amount: 865000,
    dining_percentage: 26.7,
  },
  radar_scores: {
    savings_discipline: 88,
    needs_control: 82,
  },
  top_categories: [
    { category_name: 'Chi phí khác', total_amount: 1000000, percentage: 30.9, icon: 'wallet', color: '#10B981' },
    { category_name: 'Ăn uống', total_amount: 865000, percentage: 26.7, icon: 'utensils', color: '#F59E0B' },
    { category_name: 'Tiết kiệm, đầu tư', total_amount: 471900, percentage: 14.6, icon: 'piggy-bank', color: '#EAB308' },
    { category_name: 'Trả nợ', total_amount: 323456, percentage: 10.0, icon: 'car', color: '#06B6D4' },
    { category_name: 'Gia đình & Con cái', total_amount: 262000, percentage: 8.1, icon: 'users', color: '#A855F7' },
  ],
};

export const fallbackAnomalies: AnomalyItem[] = [
  {
    transaction_id: 'anom-1',
    date: '16/08/2026 11:02',
    amount: 440000,
    category: 'Ăn uống',
    severity: 'HIGH',
    explanation: 'Cảnh báo bất thường: Số tiền 440.000 đ cao gấp 5.6 lần mức trung bình danh mục (78.636 đ).',
  },
];

export const fallbackRecommendations: RecommendationResponse = {
  total_monthly_potential_savings: 43250,
  health_score: 100,
  health_rating: 'Rất Tốt ☀️',
  overall_advice: 'Bạn đang duy trì thói quen chi tiêu kỷ luật, tỷ lệ tiết kiệm tốt và ít rủi ro tài chính.',
  recommendations: [
    {
      id: 'rec-1',
      title: 'Tối ưu hóa lợi nhuận tích lũy',
      priority: 'LOW',
      explanation: 'Với khả năng gom góp xuất sắc, việc bạn để tiền nằm yên trong tài khoản thanh toán giống như để một cỗ máy đắt tiền hoạt động không hết công suất.',
      action_steps: [
        'Cài đặt tính năng “Tích lũy tự động” (Auto-save) trên ứng dụng ngân hàng để chuyển 50% tiền nhàn rỗi sang tài khoản sinh lời theo ngày.',
        'Chia nhỏ số tiền tiết kiệm thành các hợp đồng tiền gửi trực tuyến (Online Term Deposit) kỳ hạn ngắn 1–3 tháng để vừa tối ưu lãi suất, vừa đảm bảo tính thanh khoản.',
        'Thiết lập thói quen “quét tài khoản” vào cuối tháng: Chuyển toàn bộ số dư thừa còn lại trong tài khoản chi tiêu vào quỹ mở trái phiếu hoặc két tích lũy thông minh.',
      ],
      summary: 'Tỷ lệ tích lũy của bạn rất tốt (66.9%). Hãy chuyển bớt tiền nhàn rỗi sang tài khoản sinh lời.',
    },
  ],
};

export async function fetchBehaviorProfile(): Promise<BehaviorProfileResponse> {
  const token = authStorage.getToken();
  const userId = getUserId();
  const baseUrls = getAiServiceBaseUrls();

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}/api/behavior/profile?user_id=${encodeURIComponent(userId)}`, {
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
  const userId = getUserId();
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
      const res = await fetch(`${base}/api/anomalies?user_id=${encodeURIComponent(userId)}`, {
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
          : (totalScanned > 0 ? totalScanned : fallbackAnomalies.length * 15);
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
    anomalies: fallbackAnomalies,
    total_scanned: totalScanned > 0 ? totalScanned : 152,
    risk_level: 'Thấp',
  };
}

export async function fetchAiRecommendations(): Promise<RecommendationResponse> {
  const token = authStorage.getToken();
  const userId = getUserId();
  const baseUrls = getAiServiceBaseUrls();

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}/api/recommendations?user_id=${encodeURIComponent(userId)}`, {
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

