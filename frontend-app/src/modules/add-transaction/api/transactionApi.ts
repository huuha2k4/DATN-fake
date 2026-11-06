import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface CategoryItem {
  id: string;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
}

export interface AccountItem {
  id: string;
  name: string;
  accountType: string;
  currencyCode: string;
  balance: number;
  displayBalance?: string;
}

export interface CreateTransactionPayload {
  transactionType: TransactionType;
  accountId: string;
  toAccountId?: string;
  amount: number;
  currencyCode: string;
  description?: string;
  transactionDate: string;
  transactionTime?: string;
  categoryId?: string;
}

export const transactionApi = {
  /**
   * Lấy danh mục thu chi thực tế từ Backend (/api/v1/categories)
   */
  async getCategories(kind?: 'INCOME' | 'EXPENSE'): Promise<CategoryItem[]> {
    const token = authStorage.getToken();
    try {
      const url = new URL(`${API_BASE_URL}/categories`);
      url.searchParams.append('includeSystem', 'true');
      if (kind) url.searchParams.append('kind', kind);

      const res = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return [];
      const json = await res.json();
      return json?.data?.categories || [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách tài khoản / ví từ Backend (/api/v1/accounts)
   */
  async getAccounts(): Promise<AccountItem[]> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return [];
      const json = await res.json();
      return json?.data?.accounts || json?.accounts || (Array.isArray(json) ? json : []);
    } catch {
      return [];
    }
  },

  /**
   * Tạo giao dịch thu/chi/chuyển khoản (/api/v1/transactions)
   */
  async createTransaction(payload: CreateTransactionPayload): Promise<{ success: boolean; data?: any; message?: string }> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể tạo giao dịch. Vui lòng thử lại.',
        };
      }

      return {
        success: true,
        data: json?.data || json,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ.',
      };
    }
  },
};

