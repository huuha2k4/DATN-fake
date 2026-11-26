import { api } from '../../core/api/api';
import { compressImageForUpload } from '../../core/utils/imageCompress';
import { fetchWithCache, invalidateQueryCache, stableSerializeParams } from '../../core/utils/queryCache';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionItem {
  id: string;
  transactionType: TransactionType;
  accountId: string;
  accountName: string;
  accountIcon?: string;
  toAccountId?: string;
  toAccountName?: string;
  amount: number;
  currencyCode: string;
  displayAmount?: string;
  baseAmount?: number;
  feeAmount?: number;
  toAmount?: number;
  description: string;
  note?: string;
  transactionDate: string;
  transactionTime?: string;
  category?: CategorySummary;
  merchant?: {
    id: string;
    name: string;
  };
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  receiptId?: string;
  receiptUrl?: string;
  hasAttachments?: boolean;
}

export interface TransactionSummaryData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
}

export interface TransactionListResponse {
  transactions: TransactionItem[];
  summary: TransactionSummaryData;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface TransactionFilterParams {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  categoryId?: string;
  transactionType?: TransactionType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
  note?: string;
  receiptId?: string;
  receiptUrl?: string;
}

export interface CategoryItem {
  id: string;
  code?: string;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
  isSystem?: boolean;
  parentId?: string;
  displayOrder?: number;
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
  // Lấy danh sách giao dịch thực tế
  getTransactions: async (params?: TransactionFilterParams): Promise<TransactionListResponse> => {
    return fetchWithCache(
      `transactions:list:${stableSerializeParams(params as Record<string, unknown>)}`,
      async () => {
        const res = await api.get<TransactionListResponse>('/transactions', { params });
        return res.data;
      },
      { freshTimeMs: 12_000, staleTimeMs: 45_000 }
    );
  },

  // Tạo giao dịch mới
  createTransaction: async (payload: CreateTransactionPayload): Promise<TransactionItem> => {
    const res = await api.post<TransactionItem>('/transactions', payload);
    invalidateQueryCache(['transactions:', 'accounts:', 'budgets:', 'reports:']);
    return res.data;
  },

  // Cập nhật giao dịch
  updateTransaction: async (id: string, payload: UpdateTransactionPayload): Promise<TransactionItem> => {
    const res = await api.put<TransactionItem>(`/transactions/${id}`, payload);
    invalidateQueryCache(['transactions:', 'accounts:', 'budgets:', 'reports:']);
    return res.data;
  },

  // Xóa giao dịch
  deleteTransaction: async (id: string, version?: number): Promise<void> => {
    await api.delete(`/transactions/${id}`, { params: { version } });
    invalidateQueryCache(['transactions:', 'accounts:', 'budgets:', 'reports:']);
  },

  // Lấy danh sách danh mục thu chi
  getCategories: async (kind?: 'INCOME' | 'EXPENSE'): Promise<CategoryItem[]> => {
    return fetchWithCache(
      `categories:list:${kind || 'ALL'}`,
      async () => {
        const res = await api.get<{ success: boolean; data: { categories: CategoryItem[] } }>('/categories', {
          params: { kind, includeSystem: true }
        });
        return res.data?.data?.categories || [];
      },
      { freshTimeMs: 120_000, staleTimeMs: 300_000 }
    );
  },

  // Tạo danh mục mới
  createCategory: async (payload: { name: string; kind: 'INCOME' | 'EXPENSE'; icon?: string; color?: string; parentId?: string }): Promise<CategoryItem> => {
    const res = await api.post<{ success: boolean; data: CategoryItem }>('/categories', payload);
    invalidateQueryCache('categories:');
    return res.data?.data;
  },

  // Xóa danh mục
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
    invalidateQueryCache('categories:');
  },

  // Tải lên tệp/ảnh hóa đơn đính kèm cho giao dịch
  uploadAttachment: async (id: string, file: File): Promise<TransactionItem> => {
    const compressedFile = await compressImageForUpload(file, {
      maxDimension: 1600,
      quality: 0.82,
      skipIfSmallerThanBytes: 200 * 1024,
    });
    const formData = new FormData();
    formData.append('file', compressedFile);
    const res = await api.post<TransactionItem>(`/transactions/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    invalidateQueryCache('transactions:');
    return res.data;
  }
};
