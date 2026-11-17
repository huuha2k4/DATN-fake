import { API_BASE_URL, authFetch } from '../../auth/api/authApi';

export interface FeedbackItem {
  id: string | number;
  userId?: string | number;
  title: string;
  content: string;
  category: 'BUG' | 'FEATURE' | 'QUESTION' | 'OTHER' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  adminReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SendFeedbackPayload {
  title: string;
  content: string;
  category: string;
  priority: string;
}

export const feedbackApi = {
  /**
   * Lấy lịch sử phản hồi / câu hỏi hỗ trợ của người dùng
   */
  getMyFeedbacks: async (): Promise<FeedbackItem[]> => {
    try {
      const res = await authFetch(`${API_BASE_URL}/feedbacks/my`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data || [];
    } catch (err) {
      console.warn('Lỗi getMyFeedbacks:', err);
      return [];
    }
  },

  /**
   * Gửi phản hồi / yêu cầu hỗ trợ mới
   */
  sendFeedback: async (payload: SendFeedbackPayload): Promise<{ success: boolean; data?: FeedbackItem; message?: string }> => {
    try {
      const res = await authFetch(`${API_BASE_URL}/feedbacks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, message: json.message || 'Không thể gửi phản hồi' };
      }
      return { success: true, data: json };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối' };
    }
  },
};

