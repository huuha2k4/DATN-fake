import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';

export type ScheduleType = 'TRANSACTION' | 'REMINDER';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

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
}

export interface OccurrenceItem {
  id: number;
  schedule_id: number;
  schedule_name: string;
  occurrence_date: string; // YYYY-MM-DD
  status: 'PENDING' | 'EXECUTED' | 'SKIPPED' | 'FAILED';
  schedule_type: ScheduleType;
  transaction_type?: TransactionType;
  amount?: number;
  category_name?: string;
  account_name?: string;
  note?: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'GOAL' | 'REMINDER' | 'DEBT';
  date: string; // YYYY-MM-DD
  status?: string;
  icon?: string;
  rawItem?: any;
}

export const scheduleApi = {
  /**
   * Lấy danh sách lịch định kỳ từ Backend
   */
  async getSchedules(params?: { schedule_type?: string; status?: string; search?: string }): Promise<ScheduleListItem[]> {
    try {
      const url = new URL(`${API_BASE_URL}/schedules`);
      if (params?.schedule_type) url.searchParams.append('schedule_type', params.schedule_type);
      if (params?.status) url.searchParams.append('status', params.status);
      if (params?.search) url.searchParams.append('search', params.search);

      const res = await authFetch(url.toString());
      if (!res.ok) return [];
      const json = await res.json();
      return json?.content || json?.data?.content || (Array.isArray(json) ? json : []);
    } catch (e) {
      console.warn('Lỗi getSchedules:', e);
      return [];
    }
  },

  /**
   * Tạo lịch định kỳ mới
   */
  async createSchedule(payload: CreateSchedulePayload): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/schedules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, message: json.message || 'Không thể tạo lịch định kỳ' };
      }
      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi kết nối' };
    }
  },

  /**
   * Cập nhật lịch định kỳ
   */
  async updateSchedule(id: number, payload: Partial<CreateSchedulePayload>): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, message: json.message || 'Không thể cập nhật lịch định kỳ' };
      }
      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi kết nối' };
    }
  },

  /**
   * Tạm dừng lịch
   */
  async pauseSchedule(id: number): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/schedules/${id}/pause`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Tiếp tục lịch
   */
  async resumeSchedule(id: number): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/schedules/${id}/resume`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Xóa lịch định kỳ
   */
  async deleteSchedule(id: number): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },
};

