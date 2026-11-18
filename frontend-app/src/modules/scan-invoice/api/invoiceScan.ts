import { API_BASE_URL, authFetch, authStorage } from '../../auth/api/authApi';

export type ScannedInvoice = {
  merchant: string;
  total: string;
  category: string;
  accuracy: string;
};

export const sampleScannedInvoice: ScannedInvoice = {
  merchant: 'WinMart+',
  total: '120.000 đ',
  category: 'Ăn uống',
  accuracy: '98%',
};

export interface OcrReceiptResult {
  id: string;
  imageUrl?: string;
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

export interface CreateTransactionFromOcrPayload {
  receiptId: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  note?: string;
  overrideAmount?: number;
}

export const ocrApi = {
  /**
   * Định dạng URL ảnh hóa đơn trả về từ Backend
   */
  formatReceiptImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl || !imageUrl.trim()) return null;
    if (
      imageUrl.startsWith('http') ||
      imageUrl.startsWith('file:') ||
      imageUrl.startsWith('content:') ||
      imageUrl.startsWith('data:') ||
      imageUrl.startsWith('blob:')
    ) {
      return imageUrl;
    }
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${cleanPath}`;
  },

  /**
   * Tải ảnh hóa đơn lên Backend để nhận diện OCR (/api/v1/ocr/receipts)
   */
  async scanReceipt(uri: string, mimeType?: string, fileName?: string): Promise<OcrReceiptResult> {
    let token = authStorage.getToken();
    if (!token) {
      token = await authStorage.refreshAccessToken();
    }
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const name = fileName || `receipt_${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';
    const formData = new FormData();

    if (typeof window !== 'undefined' && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('image', blob, name);
    } else {
      // @ts-ignore React Native FormData file convention
      formData.append('image', {
        uri,
        name,
        type,
      });
    }

    return new Promise<OcrReceiptResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/ocr/receipts`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve((parsed?.data || parsed) as OcrReceiptResult);
          } else {
            reject(new Error(parsed?.message || `Không thể nhận diện hóa đơn (HTTP ${xhr.status})`));
          }
        } catch {
          reject(new Error(`Lỗi phản hồi từ máy chủ OCR (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải ảnh hóa đơn lên máy chủ.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Quá thời gian xử lý OCR. Vui lòng thử lại với ảnh rõ nét hơn.'));
      };

      xhr.timeout = 120000;
      xhr.send(formData);
    });
  },

  /**
   * Lấy lịch sử hóa đơn đã quét (/api/v1/ocr/receipts)
   */
  async getReceipts(page = 1, pageSize = 20): Promise<OcrReceiptResult[]> {
    try {
      const res = await authFetch(`${API_BASE_URL}/ocr/receipts?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) return [];
      const json = await res.json();
      const raw = json?.data || json;
      return raw?.content || raw?.receipts || (Array.isArray(raw) ? raw : []);
    } catch {
      return [];
    }
  },

  /**
   * Tạo giao dịch thực tế từ hóa đơn OCR (/api/v1/ocr/receipts/{id}/create-transaction)
   */
  async createTransaction(payload: CreateTransactionFromOcrPayload): Promise<any> {
    const res = await authFetch(`${API_BASE_URL}/ocr/receipts/${payload.receiptId}/create-transaction`, {
      method: 'POST',
      body: JSON.stringify({
        receiptId: payload.receiptId,
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        description: payload.description,
        note: payload.note,
        overrideAmount: payload.overrideAmount,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message || 'Không thể lưu giao dịch từ hóa đơn.');
    }
    return json?.data || json;
  },

  /**
   * Xóa hóa đơn khỏi lịch sử (/api/v1/ocr/receipts/{id})
   */
  async deleteReceipt(id: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/ocr/receipts/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
