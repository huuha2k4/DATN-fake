import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';

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
  note?: string;
  transactionDate: string;
  transactionTime?: string;
  categoryId?: string;
  receiptId?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionPayload {
  amount?: number;
  description?: string;
  note?: string;
  transactionDate?: string;
  transactionTime?: string;
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
  version?: number;
}

export const transactionApi = {
  /**
   * Lấy danh mục thu chi thực tế từ Backend (/api/v1/categories)
   */
  async getCategories(kind?: 'INCOME' | 'EXPENSE'): Promise<CategoryItem[]> {
    try {
      const url = new URL(`${API_BASE_URL}/categories`);
      url.searchParams.append('includeSystem', 'true');
      if (kind) url.searchParams.append('kind', kind);

      const res = await authFetch(url.toString());

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
    try {
      const res = await authFetch(`${API_BASE_URL}/accounts`);

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
    try {
      const res = await authFetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
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

  /**
   * Cập nhật thông tin giao dịch (/api/v1/transactions/{id})
   */
  async updateTransaction(
    id: string,
    payload: UpdateTransactionPayload
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể cập nhật giao dịch. Vui lòng thử lại.',
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

  /**
   * Xóa giao dịch và hoàn trả lại số dư ví (/api/v1/transactions/{id})
   */
  async deleteTransaction(
    id: string,
    version?: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const url = new URL(`${API_BASE_URL}/transactions/${id}`);
      if (version != null) {
        url.searchParams.append('version', String(version));
      }

      const res = await authFetch(url.toString(), {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return {
          success: false,
          message: json?.message || 'Không thể xóa giao dịch. Vui lòng thử lại.',
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ.',
      };
    }
  },
};

