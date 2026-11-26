import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { fetchMobileWithCache, invalidateMobileQueryCache } from '../../core/utils/mobileQueryCache';

export type AccountTypeCode =
  | 'CASH'
  | 'BANK_ACCOUNT'
  | 'CREDIT_CARD'
  | 'E_WALLET'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'CRYPTO'
  | 'OTHER';

export interface AccountItem {
  id: string;
  name: string;
  accountType: AccountTypeCode;
  currencyCode: string;
  balance: number;
  creditLimit?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  cardNumberLast4?: string;
  accountNumber?: string;
  bank?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  accountNumberMasked?: string;
  phoneNumber?: string;
  description?: string;
  isActive?: boolean;
  version?: number;
}

export interface AccountSummaryResponse {
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    currencyCode: string;
  };
  byType?: Array<{
    accountType: AccountTypeCode;
    count: number;
    totalBalance: number;
    percentage: number;
  }>;
}

export const accountApi = {
  /**
   * Lấy danh sách ví & tài khoản (/api/v1/accounts)
   */
  async getAccounts(): Promise<AccountItem[]> {
    const token = authStorage.getToken();
    if (!token) return [];
    return fetchMobileWithCache(
      'accounts:list',
      async () => {
        const res = await fetch(`${API_BASE_URL}/accounts`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data?.accounts || json?.data || json?.accounts || (Array.isArray(json) ? json : []);
      },
      { freshTimeMs: 20_000, staleTimeMs: 90_000 }
    ).catch(() => []);
  },

  /**
   * Lấy tổng kết tài sản (/api/v1/accounts/summary)
   */
  async getSummary(): Promise<AccountSummaryResponse | null> {
    const token = authStorage.getToken();
    if (!token) return null;
    return fetchMobileWithCache(
      'accounts:summary',
      async () => {
        const res = await fetch(`${API_BASE_URL}/accounts/summary?base_currency=VND`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data || null;
      },
      { freshTimeMs: 20_000, staleTimeMs: 90_000 }
    ).catch(() => null);
  },

  /**
   * Tạo ví / tài khoản mới (/api/v1/accounts)
   */
  async createAccount(payload: {
    name: string;
    accountType: AccountTypeCode;
    initialBalance: number;
    currencyCode?: string;
    accountNumber?: string;
    phoneNumber?: string;
    cardNumberLast4?: string;
    creditLimit?: number;
    billingCycleDay?: number;
    paymentDueDay?: number;
    bankId?: string;
    description?: string;
    isIncludedInTotal?: boolean;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...payload,
          currencyCode: payload.currencyCode || 'VND',
          isIncludedInTotal: payload.isIncludedInTotal ?? true,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể tạo tài khoản.',
        };
      }
      invalidateMobileQueryCache(['accounts:', 'dashboard:']);
      return { success: true, data: json?.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng hoặc không thể kết nối máy chủ.' };
    }
  },

  /**
   * Cập nhật thông tin ví / tài khoản (PUT /api/v1/accounts/:id)
   */
  async updateAccount(
    id: string,
    payload: {
      name?: string;
      description?: string;
      isActive?: boolean;
      isIncludedInTotal?: boolean;
      accountNumber?: string;
      balance?: number;
      creditLimit?: number;
      billingCycleDay?: number;
      paymentDueDay?: number;
      version?: number;
    }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể cập nhật tài khoản.',
        };
      }
      invalidateMobileQueryCache(['accounts:', 'dashboard:']);
      return { success: true, data: json?.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng hoặc không thể kết nối máy chủ.' };
    }
  },

  /**
   * Điều chỉnh số dư ví (POST /api/v1/accounts/:id/adjust-balance)
   */
  async adjustBalance(
    id: string,
    payload: {
      newBalance: number;
      adjustmentDate?: string;
      reason?: string;
      createAdjustmentTransaction?: boolean;
    }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}/adjust-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          adjustmentDate: new Date().toISOString().split('T')[0],
          reason: 'Cập nhật số dư từ ứng dụng',
          createAdjustmentTransaction: false,
          ...payload,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể điều chỉnh số dư.',
        };
      }
      invalidateMobileQueryCache(['accounts:', 'dashboard:', 'transactions:', 'reports:']);
      return { success: true, data: json?.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng hoặc không thể kết nối máy chủ.' };
    }
  },

  /**
   * Xóa ví / tài khoản (DELETE /api/v1/accounts/:id?version=...)
   */
  async deleteAccount(id: string, version: number = 0): Promise<{ success: boolean; message?: string }> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}?version=${version}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể xóa tài khoản.',
        };
      }
      invalidateMobileQueryCache(['accounts:', 'dashboard:', 'transactions:', 'reports:']);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng.' };
    }
  },
};

