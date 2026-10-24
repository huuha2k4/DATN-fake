import { api } from '../../core/api/api';

export type AccountTypeCode =
  | 'CASH'
  | 'BANK_ACCOUNT'
  | 'CREDIT_CARD'
  | 'E_WALLET'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'CRYPTO'
  | 'OTHER';

export interface AccountTypeMetadata {
  code: AccountTypeCode;
  name: string;
  description: string;
  defaultIcon: string;
  defaultColor: string;
  isLiability: boolean;
  requiredFields: string[];
  optionalFields: string[];
}

export interface BankInfo {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface AccountStats {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  averageTransaction: number;
  largestIncome: number;
  largestExpense: number;
  firstTransactionDate?: string;
  lastTransactionDate?: string;
}

export interface AccountItem {
  id: string;
  name: string;
  accountType: AccountTypeCode;
  currencyCode: string;
  balance: number;
  displayBalance?: string;
  bank?: BankInfo;
  accountNumberMasked?: string;
  phoneNumber?: string;
  cardNumberLast4?: string;
  creditLimit?: number;
  creditUsed?: number;
  creditAvailable?: number;
  utilizationPercentage?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  nextPaymentDue?: string;
  icon?: string;
  color?: string;
  description?: string;
  displayOrder?: number;
  isIncludedInTotal?: boolean;
  isActive?: boolean;
  isSynced?: boolean;
  lastSyncedAt?: string;
  stats?: AccountStats;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface AccountSummary {
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    currencyCode: string;
  };
  byType: Array<{
    accountType: AccountTypeCode;
    count: number;
    totalBalance: number;
    percentage: number;
  }>;
  byCurrency: Array<{
    currencyCode: string;
    totalBalance: number;
    totalBalanceInBase: number;
    accountCount: number;
  }>;
  netWorthTrend30Days?: Array<{
    date: string;
    netWorth: number;
  }>;
}

export interface CreateAccountPayload {
  name: string;
  accountType: AccountTypeCode;
  currencyCode: string;
  initialBalance: number;
  bankId?: string;
  accountNumber?: string;
  phoneNumber?: string;
  cardNumberLast4?: string;
  creditLimit?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  icon?: string;
  color?: string;
  description?: string;
  isIncludedInTotal?: boolean;
}

export interface UpdateAccountPayload {
  name?: string;
  currencyCode?: string;
  accountNumber?: string;
  phoneNumber?: string;
  creditLimit?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  icon?: string;
  color?: string;
  description?: string;
  isIncludedInTotal?: boolean;
  isActive?: boolean;
  balance?: number;
}

export interface AdjustBalancePayload {
  newBalance: number;
  adjustmentDate: string;
  reason?: string;
  createAdjustmentTransaction?: boolean;
}

export const accountApi = {
  getAccountTypes: async (): Promise<AccountTypeMetadata[]> => {
    const res = await api.get('/accounts/types');
    return res.data.data;
  },

  getAccounts: async (params?: { includeInactive?: boolean; include_inactive?: boolean; account_type?: string }): Promise<AccountItem[]> => {
    const res = await api.get('/accounts', { 
      params: {
        includeInactive: params?.includeInactive ?? params?.include_inactive ?? true,
        accountType: params?.account_type,
        ...params
      } 
    });
    const data = res.data?.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.accounts)) {
      return data.accounts;
    }
    return [];
  },

  getAccountById: async (id: string, includeStats = true): Promise<AccountItem> => {
    const res = await api.get(`/accounts/${id}`, { params: { include_stats: includeStats } });
    return res.data.data;
  },

  getSummary: async (baseCurrency = 'VND'): Promise<AccountSummary> => {
    const res = await api.get('/accounts/summary', { params: { base_currency: baseCurrency } });
    return res.data.data;
  },

  createAccount: async (payload: CreateAccountPayload): Promise<AccountItem> => {
    const res = await api.post('/accounts', payload);
    return res.data.data;
  },

  updateAccount: async (id: string, payload: UpdateAccountPayload): Promise<AccountItem> => {
    const res = await api.put(`/accounts/${id}`, payload);
    return res.data.data;
  },

  deleteAccount: async (id: string, version = 0, moveTransactionsTo?: string): Promise<void> => {
    await api.delete(`/accounts/${id}`, {
      params: { version, move_transactions_to: moveTransactionsTo },
    });
  },

  adjustBalance: async (id: string, payload: AdjustBalancePayload): Promise<AccountItem> => {
    const res = await api.post(`/accounts/${id}/adjust-balance`, payload);
    return res.data.data;
  },
};
