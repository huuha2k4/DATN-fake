import { NativeModules, Platform } from 'react-native';

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

function getAiServiceBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_AI_URL) {
    return process.env.EXPO_PUBLIC_AI_URL;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const address = scriptURL.split('://')[1]?.split('/')[0];
    const hostname = address?.split(':')[0];
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
  } catch {}
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://192.168.1.14:8000';
}

const AI_BASE_URL = getAiServiceBaseUrl();
const DEFAULT_USER_ID = 'b5f7482d-74a0-4582-8fa2-9c586211a583';

export const aiAssistantApi = {
  async sendMessage(question: string, sessionId?: string, userId: string = DEFAULT_USER_ID): Promise<{ answer: string; sessionId?: string }> {
    try {
      const response = await fetch(`${AI_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_id: userId,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.status}`);
      }

      const data = await response.json();
      return {
        answer: data.answer || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này vào lúc này.',
        sessionId: data.session_id,
      };
    } catch (e) {
      console.error('Lỗi gọi API AI Chat:', e);
      throw e;
    }
  },

  async getSessions(userId: string = DEFAULT_USER_ID): Promise<ChatSessionItem[]> {
    try {
      const response = await fetch(`${AI_BASE_URL}/api/chat/sessions?user_id=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${AI_BASE_URL}/api/chat/sessions/${sessionId}/messages`);
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
      const res = await fetch(`${AI_BASE_URL}/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },
};

