import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

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
  bank?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  accountNumberMasked?: string;
  phoneNumber?: string;
  description?: string;
  isActive?: boolean;
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
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return [];
      const json = await res.json();
      return json?.data?.accounts || json?.data || json?.accounts || (Array.isArray(json) ? json : []);
    } catch {
      return [];
    }
  },

  /**
   * Lấy tổng kết tài sản (/api/v1/accounts/summary)
   */
  async getSummary(): Promise<AccountSummaryResponse | null> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/summary?base_currency=VND`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Tạo ví / tài khoản mới (/api/v1/accounts)
   */
  async createAccount(payload: {
    name: string;
    accountType: AccountTypeCode;
    initialBalance: number;
    currencyCode?: string;
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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể tạo tài khoản.',
        };
      }
      return { success: true, data: json?.data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng.' };
    }
  },
};

