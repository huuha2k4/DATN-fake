import { API_BASE_URL, authFetch } from '../../auth/api/authApi';
import { finAiAgentApi } from './finAiAgentApi';

export interface ChatMessage {
  id: string;
  author: 'assistant' | 'user';
  text: string;
  createdAt?: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  created_at: string;
}

export const aiAssistantApi = {
  async sendMessage(question: string, sessionId?: string): Promise<{ answer: string; sessionId?: string }> {
    const response = await finAiAgentApi.sendMessage(question, sessionId);
    return {
      answer: response.message + (response.actions.length ? '\n\nMở hội thoại FinAI để xem và xác nhận đề xuất.' : ''),
      sessionId: response.conversationId,
    };
  },

  async getSessions(): Promise<ChatSessionItem[]> {
    try {
      const response = await authFetch(`${API_BASE_URL}/chat/sessions`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await authFetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data || []).map((m: any) => ({
        id: m.id || String(Math.random()),
        author: m.author,
        text: m.text,
        createdAt: m.created_at,
      }));
    } catch {
      return [];
    }
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },
};


