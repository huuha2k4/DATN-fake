import { API_BASE_URL, authFetch } from '../../auth/api/authApi';
import { getAiHttpError } from './aiHttpError';

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
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, errorCode?: string, requestId?: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'FinAiHttpError';
  }
}

async function requestFinAi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/finai${path}`;
  const configuredTimeout = Number(process.env.EXPO_PUBLIC_FINAI_TIMEOUT_MS);
  const timeoutMs = path === '/chat' && configuredTimeout > 0 ? configuredTimeout : path === '/chat' ? 90000 : 30000;
  const controller = new AbortController();
  let timedOut = false;
  const callerSignal = options.signal;
  const handleCallerAbort = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener('abort', handleCallerAbort, { once: true });
  const requestId = `app-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await authFetch(url, {
      ...options,
      headers: { ...(options.headers as Record<string, string>), 'X-Request-Id': requestId },
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error('Request aborted');
    if (!response.ok) {
      const failure = getAiHttpError(response.status, body, response.headers.get('X-Request-Id'), response.headers.get('Retry-After'));
      throw new FinAiHttpError(response.status, failure.message, failure.code, failure.requestId ?? requestId, failure.retryAfterSeconds);
    }
    if (body == null) throw new FinAiHttpError(response.status, 'Phản hồi FinAI không hợp lệ.', 'AI_INTERNAL_ERROR', requestId);
    return body as T;
  } catch (error) {
    if (error instanceof FinAiHttpError) throw error;
    if (timedOut) {
      throw new FinAiHttpError(0, 'FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.', 'AI_TIMEOUT', requestId);
    }
    if (callerSignal?.aborted) {
      throw new FinAiHttpError(0, 'Đã hủy chờ phản hồi từ FinAI.', 'REQUEST_CANCELLED', requestId);
    }
    throw new FinAiHttpError(0, 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.', 'NETWORK_ERROR', requestId);
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', handleCallerAbort);
  }

}

export const finAiAgentApi = {
  async sendMessage(message: string, conversationId?: string, signal?: AbortSignal, idempotencyKey?: string): Promise<FinAiChatResponse> {
    const payload: { message: string; conversationId?: string } = {
      message: message.trim(),
    };
    if (conversationId) {
      payload.conversationId = conversationId;
    }

    return requestFinAi<FinAiChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
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
