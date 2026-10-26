import { api } from '../../core/api/api';

export type DebtType = 'BORROWING' | 'LENDING';
export type DebtStatus = 'ACTIVE' | 'PAID' | 'OVERDUE';
export type InterestType = 'FIXED' | 'REDUCING' | 'NONE';
export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';

export interface DebtSummaryItem {
  id: number;
  debt_type: DebtType;
  creditor_name?: string;
  debtor_name?: string;
  principal_amount: number;
  paid_amount: number;
  remaining: number;
  percentage_paid: number;
  status: DebtStatus;
  due_date?: string;
  next_payment_date?: string;
  next_payment_amount?: number;
}

export interface DebtListSummary {
  total_borrowing: number;
  total_lending: number;
  net_debt: number;
}

export interface DebtListResponse {
  debts: DebtSummaryItem[];
  summary: DebtListSummary;
}

export interface PaymentHistoryItem {
  id: number;
  amount: number;
  principal_paid?: number;
  interest_paid?: number;
  payment_date: string;
  payment_method?: string;
  note?: string;
  created_at: string;
}

export interface DebtDetailResponse {
  id: number;
  debt_type: DebtType;
  creditor_name?: string;
  creditor_phone?: string;
  creditor_email?: string;
  debtor_name?: string;
  debtor_phone?: string;
  debtor_email?: string;
  principal_amount: number;
  paid_amount: number;
  remaining_amount: number;
  percentage_paid: number;
  interest_paid?: number;
  interest_rate?: number;
  interest_type?: InterestType;
  currency_code?: string;
  payment_frequency?: PaymentFrequency;
  payment_amount?: number;
  next_payment_date?: string;
  status: DebtStatus;
  start_date?: string;
  due_date?: string;
  months_total?: number;
  months_paid?: number;
  months_remaining?: number;
  description?: string;
  note?: string;
  attachment_url?: string;
  payment_history?: PaymentHistoryItem[];
}

export interface CreateDebtPayload {
  debt_type: DebtType;
  creditor_name?: string;
  creditor_phone?: string;
  creditor_email?: string;
  debtor_name?: string;
  debtor_phone?: string;
  debtor_email?: string;
  principal_amount: number;
  currency_code?: string;
  interest_rate?: number;
  interest_type?: InterestType;
  payment_frequency?: PaymentFrequency;
  start_date: string;
  due_date?: string;
  next_payment_date?: string;
  monthly_payment?: number;
  payment_amount?: number;
  account_id?: string;
  description?: string;
  note?: string;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_date: string;
  payment_method?: string;
  account_id?: string;
  note?: string;
  create_transaction?: boolean;
}

export interface DebtScheduleItem {
  payment_number: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  remaining_after: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface DebtScheduleResponse {
  debt: {
    id: number;
    creditor_name: string;
    principal_amount: number;
  };
  schedule: DebtScheduleItem[];
  summary: {
    total_payments: number;
    completed_payments: number;
    total_to_pay: number;
    total_principal: number;
    total_interest: number;
  };
}

export const debtApi = {
  // Lấy danh sách khoản nợ kèm tổng quan
  getDebts: async (debtType?: DebtType, status?: DebtStatus): Promise<DebtListResponse> => {
    const params: Record<string, string> = {};
    if (debtType) params.debt_type = debtType;
    if (status) params.status = status;
    const res = await api.get('/debts', { params });
    return res.data?.data || { debts: [], summary: { total_borrowing: 0, total_lending: 0, net_debt: 0 } };
  },

  // Chi tiết 1 khoản nợ
  getDebtById: async (id: number): Promise<DebtDetailResponse> => {
    const res = await api.get(`/debts/${id}`);
    return res.data?.data;
  },

  // Lấy kế hoạch trả nợ dự kiến theo kỳ
  getDebtSchedule: async (id: number): Promise<DebtScheduleResponse> => {
    const res = await api.get(`/debts/${id}/schedule`);
    return res.data?.data;
  },

  // Tạo khoản nợ mới
  createDebt: async (payload: CreateDebtPayload) => {
    const res = await api.post('/debts', payload);
    return res.data;
  },

  // Cập nhật khoản nợ
  updateDebt: async (id: number, payload: Partial<CreateDebtPayload>) => {
    const res = await api.put(`/debts/${id}`, payload);
    return res.data;
  },

  // Xóa khoản nợ
  deleteDebt: async (id: number) => {
    const res = await api.delete(`/debts/${id}`);
    return res.data;
  },

  // Ghi nhận thanh toán / trả nợ
  recordPayment: async (id: number, payload: RecordPaymentPayload) => {
    const res = await api.post(`/debts/${id}/payments`, payload);
    return res.data;
  },
};
