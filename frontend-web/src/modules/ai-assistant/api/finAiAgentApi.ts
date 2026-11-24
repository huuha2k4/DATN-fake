import { api as apiClient } from '../../core/api/api';

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

export interface FinAiApiError {
  timestamp?: string;
  status: number;
  error?: string;
  message: string;
  errorCode?: string;
}

export const finAiAgentApi = {
  /**
   * Send message to FinAI Action Agent.
   * Do not send userId (derived from JWT on backend).
   */
  async sendMessage(message: string, conversationId?: string): Promise<FinAiChatResponse> {
    const payload: { message: string; conversationId?: string } = {
      message: message.trim(),
    };
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    const response = await apiClient.post<FinAiChatResponse>('/finai/chat', payload);
    return response.data;
  },

  /**
   * Confirm a pending action (atomically claims and executes on backend).
   */
  async confirmAction(actionId: string): Promise<FinAiActionResponse> {
    const response = await apiClient.post<FinAiActionResponse>(`/finai/actions/${actionId}/confirm`);
    return response.data;
  },

  /**
   * Cancel a pending action.
   */
  async cancelAction(actionId: string): Promise<FinAiActionResponse> {
    const response = await apiClient.post<FinAiActionResponse>(`/finai/actions/${actionId}/cancel`);
    return response.data;
  },

  /**
   * Get single action status (useful for status recovery after network loss/timeout).
   */
  async getAction(actionId: string): Promise<FinAiActionResponse> {
    const response = await apiClient.get<FinAiActionResponse>(`/finai/actions/${actionId}`);
    return response.data;
  },

  /**
   * List durable conversations of current user.
   */
  async getConversations(): Promise<FinAiConversationSummary[]> {
    const response = await apiClient.get<FinAiConversationSummary[]>('/finai/conversations');
    return response.data || [];
  },

  /**
   * Get single conversation with full messages and actions.
   */
  async getConversation(conversationId: string): Promise<FinAiConversationResponse> {
    const response = await apiClient.get<FinAiConversationResponse>(`/finai/conversations/${conversationId}`);
    return response.data;
  },
};
