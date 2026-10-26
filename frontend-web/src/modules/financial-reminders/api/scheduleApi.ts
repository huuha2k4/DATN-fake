import { api } from '../../core/api/api';

export type ScheduleType = 'TRANSACTION' | 'REMINDER';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface TransactionTemplate {
  transaction_type: TransactionType;
  account_id: string;
  to_account_id?: string | null;
  amount: number;
  currency_code: string;
  category_id?: string | null;
  merchant_id?: string | null;
  description?: string;
  note?: string;
}

export interface TransactionSummary {
  type?: string;
  amount?: string;
  category?: string;
  account?: string;
}

export interface ScheduleListItem {
  id: number;
  schedule_type: ScheduleType;
  name: string;
  recurrence_text: string;
  recurrence_rule?: string;
  start_date?: string;
  end_date?: string;
  next_occurrence?: string;
  status: ScheduleStatus;
  transaction_template?: TransactionSummary;
  total_executed?: number;
  last_executed?: string;
  created_at?: string;
}

export interface TransactionTemplateInfo {
  transaction_type: TransactionType;
  account_id: number;
  account_name?: string;
  to_account_id?: number | null;
  to_account_name?: string;
  amount: string;
  currency_code: string;
  category_id?: number | null;
  category_name?: string;
  merchant_id?: number | null;
  merchant_name?: string;
  description?: string;
  note?: string;
}

export interface ScheduleDetail {
  id: number;
  schedule_type: ScheduleType;
  name: string;
  recurrence_rule: string;
  recurrence_text: string;
  start_date: string;
  end_date?: string;
  next_occurrence?: string;
  status: ScheduleStatus;
  transaction_template?: TransactionTemplateInfo;
  reminder_message?: string;
  auto_execute: boolean;
  notification_enabled: boolean;
  notification_time_before_minutes?: number;
  notification_channels?: string[];
  total_occurrences?: number;
  executed_count?: number;
  skipped_count?: number;
  failed_count?: number;
  last_executed_at?: string;
  paused_at?: string;
  pause_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateSchedulePayload {
  schedule_type: ScheduleType;
  name: string;
  recurrence_rule: string;
  start_date: string;
  end_date?: string | null;
  transaction_template?: TransactionTemplate;
  reminder_message?: string;
  auto_execute?: boolean;
  notification_enabled?: boolean;
  notification_time_before_minutes?: number;
  notification_channels?: string[];
}

export interface UpdateSchedulePayload {
  schedule_type?: ScheduleType;
  name?: string;
  recurrence_rule?: string;
  start_date?: string;
  end_date?: string | null;
  transaction_template?: TransactionTemplate;
  reminder_message?: string;
  auto_execute?: boolean;
  notification_enabled?: boolean;
  notification_time_before_minutes?: number;
  notification_channels?: string[];
}

export interface UpcomingOccurrencesResponse {
  schedule_id: number;
  schedule_name: string;
  occurrences: Array<{
    occurrence_date: string;
    sequence_number: number;
    status: string;
  }>;
}

export const scheduleApi = {
  // Lấy danh sách lịch
  getSchedules: async (params?: {
    schedule_type?: string;
    status?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => {
    const res = await api.get('/schedules', { params });
    // Spring Page Response: { content, totalElements, totalPages, number, size }
    return res.data;
  },

  // Chi tiết lịch
  getScheduleById: async (id: number): Promise<ScheduleDetail> => {
    const res = await api.get(`/schedules/${id}`);
    return res.data;
  },

  // Tạo lịch mới
  createSchedule: async (payload: CreateSchedulePayload): Promise<ScheduleDetail> => {
    const res = await api.post('/schedules', payload);
    return res.data;
  },

  // Cập nhật lịch
  updateSchedule: async (id: number, payload: UpdateSchedulePayload): Promise<ScheduleDetail> => {
    const res = await api.put(`/schedules/${id}`, payload);
    return res.data;
  },

  // Xóa lịch
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },

  // Tạm dừng lịch
  pauseSchedule: async (id: number, reason?: string): Promise<ScheduleDetail> => {
    const res = await api.post(`/schedules/${id}/pause`, { reason });
    return res.data;
  },

  // Tiếp tục lịch
  resumeSchedule: async (id: number): Promise<ScheduleDetail> => {
    const res = await api.post(`/schedules/${id}/resume`);
    return res.data;
  },

  // Lấy danh sách các lần sắp tới
  getUpcomingOccurrences: async (id: number, monthsAhead = 3): Promise<UpcomingOccurrencesResponse> => {
    const res = await api.get(`/schedules/${id}/occurrences`, {
      params: { months_ahead: monthsAhead }
    });
    return res.data;
  },

  // Bỏ qua 1 lần
  skipOccurrence: async (scheduleId: number, occId: number, reason?: string) => {
    const res = await api.post(`/schedules/${scheduleId}/occurrences/${occId}/skip`, { reason });
    return res.data;
  },

  // Thực thi sớm 1 lần
  executeOccurrence: async (scheduleId: number, occId: number, actualAmount?: number, notes?: string) => {
    const res = await api.post(`/schedules/${scheduleId}/occurrences/${occId}/execute`, {
      actual_amount: actualAmount,
      notes,
    });
    return res.data;
  }
};
