import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';
import { transactionApi, type CategoryItem } from '../../add-transaction/api/transactionApi';

export type BudgetPeriodType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type BudgetStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';
export type AlertLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'EXCEEDED';

export interface BudgetItem {
  id: string;
  name?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
  alertThresholdPercentage: number;
  status?: BudgetStatus;
  alertLevel: AlertLevel;
}

export interface BudgetSummary {
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
  items?: BudgetItem[];
  version?: number;
}

export interface BudgetOverviewResponse {
  currentBudget?: BudgetSummary;
  items: BudgetItem[];
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
}

export interface CreateCategoryBudgetPayload {
  categoryId: string;
  name?: string;
  amount: number;
  alertThresholdPercentage?: number;
  year: number;
  month: number;
}

export const budgetApi = {
  /**
   * Lấy tổng quan ngân sách tháng hiện tại
   */
  async getMonthlyBudgetOverview(year: number, month: number): Promise<BudgetOverviewResponse> {
    try {
      const token = await authStorage.getToken();
      if (!token) return getFallbackBudgetOverview(month);

      const url = `${API_BASE_URL}/budgets?year=${year}&month=${month}`;
      const res = await authFetch(url);

      if (!res.ok) {
        return getFallbackBudgetOverview(month);
      }

      const json = await res.json();
      const budgets: any[] = json?.data?.budgets || [];
      if (!budgets || budgets.length === 0) {
        return getFallbackBudgetOverview(month);
      }

      // Lấy budget đầu tiên tìm thấy
      const current = budgets[0];
      // Gọi chi tiết để lấy danh sách items
      const detailRes = await fetch(`${API_BASE_URL}/budgets/${current.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      let items: BudgetItem[] = [];
      let totalAmount = current.totalAmount || 0;
      let spentAmount = current.spentAmount || 0;

      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        const detailData = detailJson?.data;
        if (detailData?.items && Array.isArray(detailData.items)) {
          items = detailData.items.map((it: any) => ({
            id: it.id,
            name: it.name || it.categoryName || 'Hạng mục',
            categoryId: it.categoryId,
            categoryName: it.categoryName || it.name || 'Hạng mục',
            categoryIcon: it.categoryIcon || it.category?.icon || 'wallet',
            categoryColor: it.categoryColor || it.category?.color || '#047857',
            amount: it.amount || 0,
            spentAmount: it.spentAmount || 0,
            remaining: it.remaining || Math.max(0, (it.amount || 0) - (it.spentAmount || 0)),
            percentageUsed: Math.min(100, Math.round(it.percentageUsed || (it.amount > 0 ? (it.spentAmount / it.amount) * 100 : 0))),
            alertThresholdPercentage: it.alertThresholdPercentage || 80,
            status: it.status || 'ACTIVE',
            alertLevel: it.alertLevel || (it.percentageUsed >= 100 ? 'EXCEEDED' : it.percentageUsed >= 80 ? 'WARNING' : 'SAFE'),
          }));
        }
        totalAmount = detailData.totalAmount || totalAmount;
        spentAmount = detailData.spentAmount || spentAmount;
      }

      if (items.length === 0) {
        return getFallbackBudgetOverview(month);
      }

      const remaining = Math.max(0, totalAmount - spentAmount);
      const overallPercentage = totalAmount > 0 ? Math.min(100, Math.round((spentAmount / totalAmount) * 100)) : 0;

      return {
        currentBudget: {
          id: current.id,
          name: current.name || `Tổng ngân sách tháng ${month}`,
          periodType: current.periodType || 'MONTHLY',
          startDate: current.startDate,
          endDate: current.endDate,
          totalAmount,
          spentAmount,
          remaining,
          percentageUsed: overallPercentage,
          status: current.status || 'ACTIVE',
          alertLevel: current.alertLevel || 'SAFE',
          items,
          version: current.version ?? 0,
        },
        items,
        totalBudgeted: totalAmount,
        totalSpent: spentAmount,
        totalRemaining: remaining,
        overallPercentage,
      };
    } catch (e) {
      console.warn('Lỗi gọi API /budgets:', e);
      return getFallbackBudgetOverview(month);
    }
  },

  /**
   * Tạo ngân sách nhanh cho danh mục theo tháng
   */
  async createCategoryBudget(payload: CreateCategoryBudgetPayload): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const url = `${API_BASE_URL}/budgets/category-item?year=${payload.year}&month=${payload.month}`;
      const res = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: payload.categoryId,
          name: payload.name,
          amount: payload.amount,
          alertThresholdPercentage: payload.alertThresholdPercentage || 80,
        }),
      });

      if (!res.ok) {
        console.warn('Lỗi gọi POST /budgets/category-item status:', res.status);
      }

      return res.ok;
    } catch (e) {
      console.warn('Exception khi gọi createCategoryBudget:', e);
      return false;
    }
  },

  /**
   * Cập nhật thông tin ngân sách cha (Tên, tổng số tiền hạn mức, ngưỡng cảnh báo)
   */
  async updateBudget(budgetId: string, payload: { name?: string; totalAmount: number; alertThresholdPercentage?: number; version: number }): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/budgets/${budgetId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: payload.name,
          totalAmount: payload.totalAmount,
          alertThresholdPercentage: payload.alertThresholdPercentage ?? 80,
          version: payload.version,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Xóa toàn bộ ngân sách tháng (xóa ngân sách cha kèm mọi danh mục bên trong)
   */
  async deleteBudget(budgetId: string, version: number = 0): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/budgets/${budgetId}?version=${version}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Cập nhật hạn mức của một item danh mục trong ngân sách
   */
  async updateBudgetItem(budgetId: string, itemId: string, payload: { name?: string; amount: number; alertThresholdPercentage?: number }): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/budgets/${budgetId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: payload.name,
          amount: payload.amount,
          alertThresholdPercentage: payload.alertThresholdPercentage ?? 80,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Xóa một hạn mức danh mục ngân sách
   */
  async deleteBudgetItem(budgetId: string, itemId: string): Promise<boolean> {
    try {
      const token = await authStorage.getToken();
      if (!token) return true;

      const res = await authFetch(`${API_BASE_URL}/budgets/${budgetId}/items/${itemId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Lấy danh mục chi tiêu khả dụng để thiết lập ngân sách (Khử trùng lặp và đồng bộ icon đầy đủ)
   */
  async getExpenseCategories(): Promise<CategoryItem[]> {
    try {
      const cats = await transactionApi.getCategories('EXPENSE');
      if (Array.isArray(cats) && cats.length > 0) {
        // Chuẩn hóa nhóm danh mục đồng nghĩa để gộp triệt để (như Web):
        // 'Di chuyển' và 'Đi lại' -> Gộp thành 1 mục 'Di chuyển'
        const getCanonicalKey = (name: string) => {
          const n = (name || '').trim().toLowerCase();
          if (n === 'di chuyển' || n === 'đi lại' || n.includes('xăng xe') || n.includes('xe cộ')) return 'transport';
          if (n.includes('hóa đơn') || n.includes('tiện ích') || n.includes('điện nước')) return 'utilities';
          if (n.includes('sức khỏe') || n.includes('y tế') || n.includes('thuốc')) return 'health';
          if (n.includes('gia đình') || n.includes('con cái')) return 'family';
          if (n.includes('đầu tư') || n.includes('chứng khoán')) return 'investment';
          if (n.includes('kinh doanh') || n.includes('bán hàng')) return 'business';
          if (n.includes('thưởng') || n.includes('quà tặng')) return 'bonus';
          if (n.includes('ăn uống') || n.includes('ẩm thực') || n.includes('cơm')) return 'food';
          if (n.includes('giáo dục') || n.includes('học tập')) return 'education';
          if (n.includes('giải trí') || n.includes('phim')) return 'entertainment';
          if (n.includes('mua sắm') || n.includes('shopping')) return 'shopping';
          if (n.includes('nhà ở') || n.includes('sinh hoạt')) return 'living';
          return n;
        };

        const cleanCategoryName = (name: string, key: string) => {
          // Chỉ giữ lại chữ "và" cho mục duy nhất: "Hóa đơn & Tiện ích"
          if (key === 'utilities') return 'Hóa đơn & Tiện ích';
          if (key === 'transport') return 'Di chuyển';
          if (key === 'health') return 'Sức khỏe';
          if (key === 'family') return 'Gia đình';
          if (key === 'education') return 'Giáo dục';
          if (key === 'entertainment') return 'Giải trí';
          if (key === 'travel') return 'Du lịch';
          if (key === 'debt') return 'Trả nợ';
          if (key === 'gift') return 'Quà tặng';
          if (key === 'investment') return 'Đầu tư';
          if (key === 'insurance') return 'Bảo hiểm';
          if (key === 'living') return 'Sinh hoạt';
          if (key === 'shopping') return 'Mua sắm';
          if (key === 'food') return 'Ăn uống';
          if (key === 'other' || name.toLowerCase().includes('khác')) return 'Chi phí khác';

          // Nếu có chữ "và" hoặc "&" ở các danh mục khác thì rút ngắn lấy vế đầu tiên
          let n = (name || '').trim();
          if (n.includes(' & ')) n = n.split(' & ')[0].trim();
          if (n.includes(' và ')) n = n.split(' và ')[0].trim();
          return n;
        };

        const seenKeys = new Set<string>();
        const uniqueCats: CategoryItem[] = [];

        for (const c of cats) {
          const key = getCanonicalKey(c.name);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueCats.push({
              ...c,
              name: cleanCategoryName(c.name, key),
            });
          }
        }
        return uniqueCats;
      }
      return getFallbackExpenseCategories();
    } catch {
      return getFallbackExpenseCategories();
    }
  },
};

function getFallbackExpenseCategories(): CategoryItem[] {
  return [
    { id: 'cat-food', name: 'Ăn uống', kind: 'EXPENSE', icon: 'utensils', color: '#EF4444' },
    { id: 'cat-transport', name: 'Di chuyển', kind: 'EXPENSE', icon: 'car', color: '#0EA5E9' },
    { id: 'cat-shopping', name: 'Mua sắm', kind: 'EXPENSE', icon: 'shopping-bag', color: '#8B5CF6' },
    { id: 'cat-living', name: 'Sinh hoạt', kind: 'EXPENSE', icon: 'home', color: '#10B981' },
    { id: 'cat-bill', name: 'Hóa đơn & Tiện ích', kind: 'EXPENSE', icon: 'receipt', color: '#F59E0B' },
    { id: 'cat-health', name: 'Sức khỏe', kind: 'EXPENSE', icon: 'heart', color: '#EC4899' },
    { id: 'cat-education', name: 'Giáo dục', kind: 'EXPENSE', icon: 'book', color: '#6366F1' },
    { id: 'cat-entertainment', name: 'Giải trí', kind: 'EXPENSE', icon: 'film', color: '#F97316' },
    { id: 'cat-family', name: 'Gia đình', kind: 'EXPENSE', icon: 'users', color: '#14B8A6' },
    { id: 'cat-travel', name: 'Du lịch', kind: 'EXPENSE', icon: 'map', color: '#06B6D4' },
    { id: 'cat-debt', name: 'Trả nợ', kind: 'EXPENSE', icon: 'credit-card', color: '#DC2626' },
    { id: 'cat-gift', name: 'Quà tặng', kind: 'EXPENSE', icon: 'gift', color: '#D946EF' },
    { id: 'cat-insurance', name: 'Bảo hiểm', kind: 'EXPENSE', icon: 'shield', color: '#3B82F6' },
    { id: 'cat-investment', name: 'Đầu tư', kind: 'EXPENSE', icon: 'trending-up', color: '#10B981' },
    { id: 'cat-other', name: 'Chi phí khác', kind: 'EXPENSE', icon: 'file-text', color: '#94A3B8' },
  ];
}

/**
 * Dữ liệu mặc định chuẩn như ảnh thiết kế mẫu
 */
function getFallbackBudgetOverview(month: number): BudgetOverviewResponse {
  const items: BudgetItem[] = [
    {
      id: 'item-1',
      name: 'Ăn uống',
      categoryName: 'Ăn uống',
      categoryIcon: 'utensils',
      categoryColor: '#EF4444',
      amount: 1500000,
      spentAmount: 1200000,
      remaining: 300000,
      percentageUsed: 80,
      alertThresholdPercentage: 80,
      alertLevel: 'WARNING',
    },
    {
      id: 'item-2',
      name: 'Di chuyển',
      categoryName: 'Di chuyển',
      categoryIcon: 'car',
      categoryColor: '#0EA5E9',
      amount: 800000,
      spentAmount: 400000,
      remaining: 400000,
      percentageUsed: 50,
      alertThresholdPercentage: 80,
      alertLevel: 'SAFE',
    },
    {
      id: 'item-3',
      name: 'Mua sắm',
      categoryName: 'Mua sắm',
      categoryIcon: 'shopping-bag',
      categoryColor: '#8B5CF6',
      amount: 1000000,
      spentAmount: 700000,
      remaining: 300000,
      percentageUsed: 70,
      alertThresholdPercentage: 80,
      alertLevel: 'SAFE',
    },
    {
      id: 'item-4',
      name: 'Sinh hoạt',
      categoryName: 'Sinh hoạt',
      categoryIcon: 'home',
      categoryColor: '#10B981',
      amount: 1000000,
      spentAmount: 500000,
      remaining: 500000,
      percentageUsed: 50,
      alertThresholdPercentage: 80,
      alertLevel: 'SAFE',
    },
  ];

  return {
    currentBudget: {
      id: 'b-mock-1',
      name: `Tổng ngân sách tháng ${month}`,
      periodType: 'MONTHLY',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      totalAmount: 5000000,
      spentAmount: 3200000,
      remaining: 1800000,
      percentageUsed: 64,
      status: 'ACTIVE',
      alertLevel: 'SAFE',
      items,
    },
    items,
    totalBudgeted: 5000000,
    totalSpent: 3200000,
    totalRemaining: 1800000,
    overallPercentage: 64,
  };
}

