import { API_BASE_URL, authFetch } from '../../auth/api/authApi';

export type FinAiActionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export interface FinAiActionPreview {
  currency?: string;
  currencyCode?: string;

  // create_transaction
  transactionType?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount?: number;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  categoryId?: string;
  categoryName?: string;
  category?: string;
  transactionDate?: string;
  description?: string;
  note?: string;

  // create_budget
  name?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  items?: Array<{
    categoryId?: string;
    category?: string;
    categoryName?: string;
    amount?: number;
  }>;

  [key: string]: any;
}

export interface FinAiActionResponse {
  actionId: string;
  planId?: string | null;
  toolName: string;
  title: string;
  description?: string | null;
  preview: FinAiActionPreview;
  status: FinAiActionStatus;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  executedAt?: string | null;
  result?: any;
  error?: string | null;
}

export type FinAiResponseType = 'MESSAGE' | 'ACTION_REQUIRED' | 'MULTI_ACTION_REQUIRED';

export interface FinAiChatResponse {
  type: FinAiResponseType;
  conversationId: string;
  message: string;
  actions: FinAiActionResponse[];
}

export interface FinAiConversationMessage {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  kind?: string;
  createdAt: string;
  actionIds?: string[];
  actions?: FinAiActionResponse[];
}

export interface FinAiConversationResponse {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: FinAiConversationMessage[];
  actions: FinAiActionResponse[];
}

export interface FinAiConversationSummary {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export class FinAiHttpError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.name = 'FinAiHttpError';
  }
}

async function requestFinAi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/finai${path}`;
  const response = await authFetch(url, options);

  if (!response.ok) {
    let errBody: any = null;
    try {
      errBody = await response.json();
    } catch {}

    const status = response.status;
    const message = errBody?.message || `Lỗi kết nối máy chủ FinAI (${status})`;
    const errorCode = errBody?.errorCode;
    throw new FinAiHttpError(status, message, errorCode);
  }

  return response.json() as Promise<T>;
}

export const finAiAgentApi = {
  async sendMessage(message: string, conversationId?: string): Promise<FinAiChatResponse> {
    const payload: { message: string; conversationId?: string } = {
      message: message.trim(),
    };
    if (conversationId) {
      payload.conversationId = conversationId;
    }

    return requestFinAi<FinAiChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async confirmAction(actionId: string): Promise<FinAiActionResponse> {
    return requestFinAi<FinAiActionResponse>(`/actions/${actionId}/confirm`, {
      method: 'POST',
    });
  },

  async cancelAction(actionId: string): Promise<FinAiActionResponse> {
    return requestFinAi<FinAiActionResponse>(`/actions/${actionId}/cancel`, {
      method: 'POST',
    });
  },

  async getAction(actionId: string): Promise<FinAiActionResponse> {
    return requestFinAi<FinAiActionResponse>(`/actions/${actionId}`);
  },

  async getConversations(): Promise<FinAiConversationSummary[]> {
    return requestFinAi<FinAiConversationSummary[]>('/conversations');
  },

  async getConversation(conversationId: string): Promise<FinAiConversationResponse> {
    return requestFinAi<FinAiConversationResponse>(`/conversations/${conversationId}`);
  },
};
