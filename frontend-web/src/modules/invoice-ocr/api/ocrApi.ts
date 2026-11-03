import { api } from '../../core/api/api';

export interface OcrReceiptResult {
  id: string;
  kind: 'paid' | 'draft' | 'unknown';
  merchantName?: string;
  transactionDate?: string;
  transactionTime?: string;
  totalAmount?: number;
  currency: string;
  confidence: number;
  needsReview: boolean;
  aiCategoryId?: string;
  aiCategoryName?: string;
  transactionId?: string;
  createdAt?: string;
}

export interface OcrReceiptListResponse {
  /** Normalized receipts array (always present after getReceipts()) */
  receipts: OcrReceiptResult[];
  /** Spring Page raw content field */
  content?: OcrReceiptResult[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

export interface CreateTransactionFromOcrPayload {
  receiptId: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  note?: string;
  /** User-corrected amount (overrides the OCR-scanned value when provided). */
  overrideAmount?: number;
}

export const ocrApi = {
  scanReceipt: async (file: File): Promise<OcrReceiptResult> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post<OcrReceiptResult>('/ocr/receipts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 120s — OCR có thể mất thời gian với ảnh phức tạp
    });
    return res.data;
  },

  createTransaction: async (payload: CreateTransactionFromOcrPayload): Promise<any> => {
    const res = await api.post(`/ocr/receipts/${payload.receiptId}/create-transaction`, {
      accountId: payload.accountId,
      categoryId: payload.categoryId,
      description: payload.description,
      note: payload.note,
      overrideAmount: payload.overrideAmount,
    });
    return res.data;
  },

  getReceipts: async (page = 1, pageSize = 20): Promise<OcrReceiptListResponse> => {
    const res = await api.get<OcrReceiptListResponse>('/ocr/receipts', {
      params: { page, pageSize },
    });
    const raw = res.data;
    // Normalize: Spring Page uses 'content'; provide a unified 'receipts' alias
    const items: OcrReceiptResult[] = raw.content ?? raw.receipts ?? [];
    return { ...raw, receipts: items, content: items };
  },

  deleteReceipt: async (id: string): Promise<void> => {
    await api.delete(`/ocr/receipts/${id}`);
  },
};
