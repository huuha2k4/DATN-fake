import { api } from '../../core/api/api'

export interface FeedbackItem {
  id: string
  userId: string
  title: string
  content: string
  category: 'BUG' | 'FEATURE' | 'QUESTION' | 'OTHER' | string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string
  adminReply?: string | null
  repliedAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface SendFeedbackPayload {
  title: string
  content: string
  category: string
  priority: string
}

export const feedbackApi = {
  getMyFeedbacks: async (): Promise<FeedbackItem[]> => {
    const response = await api.get<FeedbackItem[]>('/feedbacks/my')
    return response.data || []
  },

  sendFeedback: async (payload: SendFeedbackPayload): Promise<FeedbackItem> => {
    const response = await api.post<FeedbackItem>('/feedbacks', payload)
    return response.data
  }
}

