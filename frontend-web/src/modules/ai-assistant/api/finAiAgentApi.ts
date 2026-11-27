import axios from 'axios';
import { api as apiClient } from '../../core/api/api';
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
  // Common
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

  // Additional generic preview fields
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

export type FinAiResponseType = 'MESSAGE' | 'CLARIFICATION' | 'ACTION_REQUIRED' | 'MULTI_ACTION_REQUIRED';

export interface FinAiClarification {
  draftId: string;
  field: string;
  expiresAt: string;
  options: Array<{ id: string; label: string }>;
}

export type FinAiSelection = { draftId: string; optionId: string };

export interface FinAiChatResponse {
  type: FinAiResponseType;
  conversationId: string;
  message: string;
  clarification?: FinAiClarification | null;
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
  clarification?: FinAiClarification | null;
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

export interface FinAiApiError {
  timestamp?: string;
  status: number;
  error?: string;
  message: string;
  errorCode?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

export class FinAiClientError extends Error {
  readonly errorCode: string;
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    errorCode: string,
    status = 0,
    requestId?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'FinAiClientError';
    this.errorCode = errorCode;
    this.status = status;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const configuredFinAiTimeout = Number(import.meta.env.VITE_FINAI_TIMEOUT_MS);
const FINAI_TIMEOUT_MS = configuredFinAiTimeout > 0 ? configuredFinAiTimeout : 90000;

function normalizeFinAiError(error: unknown): FinAiClientError {
  if (error instanceof FinAiClientError) return error;
  if (axios.isCancel(error)) return new FinAiClientError('Đã hủy chờ phản hồi từ FinAI.', 'REQUEST_CANCELLED');
  if (axios.isAxiosError<FinAiApiError>(error)) {
    if (!error.response) {
      const requestId = error.config?.headers?.get('X-Request-Id');
      const id = typeof requestId === 'string' ? requestId : undefined;
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
        return new FinAiClientError('FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.', 'AI_TIMEOUT', 0, id);
      return new FinAiClientError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.', 'NETWORK_ERROR', 0, id);
    }
    const status = error.response.status;
    const failure = getAiHttpError(status, error.response.data, error.response.headers['x-request-id'], error.response.headers['retry-after']);
    return new FinAiClientError(failure.message, failure.code, status, failure.requestId, failure.retryAfterSeconds);
  }
  return new FinAiClientError('FinAI đang tạm gián đoạn. Vui lòng thử lại sau.', 'AI_INTERNAL_ERROR');
}

async function finAiRequest<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await request()).data;
  } catch (error) {
    throw normalizeFinAiError(error);
  }
}

export const finAiAgentApi = {
  /**
   * Send message to FinAI Action Agent.
   * Do not send userId (derived from JWT on backend).
   */
  async sendMessage(message: string, conversationId?: string, signal?: AbortSignal, idempotencyKey?: string, selection?: FinAiSelection): Promise<FinAiChatResponse> {
    const payload = {
      message: message.trim(),
      ...(conversationId ? { conversationId } : {}),
      ...selection,
    };
    const controller = new AbortController();
    const requestId = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let stopWaiting: (error: FinAiClientError) => void = () => {};
    const cancelled = new Promise<never>((_, reject) => { stopWaiting = reject; });
    const abort = () => {
      controller.abort();
      stopWaiting(new FinAiClientError('Đã hủy chờ phản hồi từ FinAI.', 'REQUEST_CANCELLED', 0, requestId));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort(); }, FINAI_TIMEOUT_MS);
    try {
      const response = finAiRequest(() => apiClient.post<FinAiChatResponse>('/finai/chat', payload, {
        timeout: FINAI_TIMEOUT_MS,
        signal: controller.signal,
        headers: {
          'X-Request-Id': requestId,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
      }));
      return await Promise.race([response, cancelled]);
    } catch (error) {
      if (timedOut) {
        throw new FinAiClientError('FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.', 'AI_TIMEOUT', 0, requestId);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  },

  /**
   * Confirm a pending action (atomically claims and executes on backend).
   */
  async confirmAction(actionId: string): Promise<FinAiActionResponse> {
    return finAiRequest(() => apiClient.post<FinAiActionResponse>(`/finai/actions/${actionId}/confirm`));
  },

  /**
   * Cancel a pending action.
   */
  async cancelAction(actionId: string): Promise<FinAiActionResponse> {
    return finAiRequest(() => apiClient.post<FinAiActionResponse>(`/finai/actions/${actionId}/cancel`));
  },

  /**
   * Get single action status (useful for status recovery after network loss/timeout).
   */
  async getAction(actionId: string): Promise<FinAiActionResponse> {
    return finAiRequest(() => apiClient.get<FinAiActionResponse>(`/finai/actions/${actionId}`));
  },

  /**
   * List durable conversations of current user.
   */
  async getConversations(): Promise<FinAiConversationSummary[]> {
    return (await finAiRequest(() => apiClient.get<FinAiConversationSummary[]>('/finai/conversations'))) || [];
  },

  /**
   * Get single conversation with full messages and actions.
   */
  async getConversation(conversationId: string): Promise<FinAiConversationResponse> {
    return finAiRequest(() => apiClient.get<FinAiConversationResponse>(`/finai/conversations/${conversationId}`));
  },
};
