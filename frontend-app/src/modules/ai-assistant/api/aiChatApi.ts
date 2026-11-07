import { NativeModules, Platform } from 'react-native';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

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

function getAiServiceBaseUrls(): string[] {
  const list: string[] = [];

  // 1. Ưu tiên biến môi trường EXPO_PUBLIC_AI_URL từ .env
  if (process.env.EXPO_PUBLIC_AI_URL) {
    list.push(process.env.EXPO_PUBLIC_AI_URL);
  }

  // 2. Thử qua Nginx Reverse Proxy dựa trên API_BASE_URL (từ EXPO_PUBLIC_API_URL trong .env)
  // Ví dụ: EXPO_PUBLIC_API_URL="http://192.168.1.13:1116/api/v1" -> Nginx root: "http://192.168.1.13:1116"
  if (API_BASE_URL) {
    const nginxRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    if (nginxRoot && !list.includes(nginxRoot)) {
      list.push(nginxRoot);
    }
  }

  return list;
}

function getUserId(): string {
  const u = authStorage.getUser();
  if (u?.id) return u.id;
  throw new Error('Vui lòng đăng nhập để sử dụng tính năng trợ lý FinAI.');
}

async function fetchFromAiEndpoints(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrls = getAiServiceBaseUrls();
  let lastError: any = null;

  for (const base of baseUrls) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 80000); // AI có thể suy nghĩ lâu hơn

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ AI');
}

export const aiAssistantApi = {
  async sendMessage(question: string, sessionId?: string): Promise<{ answer: string; sessionId?: string }> {
    const userId = getUserId();
    try {
      const response = await fetchFromAiEndpoints('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          user_id: userId,
          session_id: sessionId,
        }),
      });

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

  async getSessions(): Promise<ChatSessionItem[]> {
    const userId = getUserId();
    try {
      const response = await fetchFromAiEndpoints(`/api/chat/sessions?user_id=${userId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetchFromAiEndpoints(`/api/chat/sessions/${sessionId}/messages`);
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
      const res = await fetchFromAiEndpoints(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },
};


