import { API_BASE_URL, authStorage, authFetch } from '../../auth/api/authApi';

export type DebtType = 'BORROWING' | 'LENDING';
export type DebtStatus = 'ACTIVE' | 'PAID' | 'PAID_OFF' | 'OVERDUE' | 'CANCELLED';
export type PaymentPlanType = 'ONE_TIME' | 'INSTALLMENT';
export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';

export interface DebtItem {
  id: string;
  debtType: DebtType;
  creditorName?: string;
  creditorPhone?: string;
  debtorName?: string;
  debtorPhone?: string;
  counterpartyName: string;
  principalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  percentagePaid: number;
  status: DebtStatus;
  paymentFrequency?: PaymentFrequency;
  monthlyPayment?: number;
  paymentAmount?: number;
  startDate?: string;
  dueDate?: string;
  nextPaymentDate?: string;
  accountId?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  description?: string;
  note?: string;
}

export interface DebtTypeSummary {
  totalCount: number;
  activeCount: number;
  totalPrincipal: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyPayment?: number;
}

export interface DebtSummaryData {
  borrowing: DebtTypeSummary;
  lending: DebtTypeSummary;
  netPosition: {
    netDebt: number;
    debtToAssetRatio?: number;
  };
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
  payment_frequency?: PaymentFrequency;
  monthly_payment?: number;
  payment_amount?: number;
  start_date: string;
  due_date?: string;
  next_payment_date?: string;
  account_id?: string;
  note?: string;
  description?: string;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
}

export interface RecordDebtPaymentPayload {
  amount: number;
  payment_date: string;
  note?: string;
  account_id?: string;
}

export const debtApi = {
  /**
   * Lấy danh sách khoản nợ kèm tổng quan
   */
  async getDebts(debtType?: DebtType, status?: DebtStatus): Promise<DebtItem[]> {
    try {
      const token = await authStorage.getToken();
      if (!token) return [];

      let query = '';
      const params: string[] = [];
      if (debtType) params.push(`debt_type=${debtType}`);
      if (status) params.push(`status=${status}`);
      if (params.length > 0) query = `?${params.join('&')}`;

      const res = await authFetch(`${API_BASE_URL}/debts${query}`);
      if (!res.ok) return [];

      const json = await res.json();
      const rawList: any[] = json?.data?.debts || [];

      return rawList.map((item: any) => {
        const isBorrowing = item.debt_type === 'BORROWING' || item.debtType === 'BORROWING';
        const counterparty = isBorrowing
          ? (item.creditor_name || item.creditorName || 'Chủ nợ')
          : (item.debtor_name || item.debtorName || 'Người vay');

        const principal = Number(item.principal_amount || item.principalAmount || 0);
        const paid = Number(item.paid_amount || item.paidAmount || 0);
        const remaining = Number(item.remaining ?? item.remaining_amount ?? (principal - paid));
        const percentage = Number(item.percentage_paid ?? item.percentagePaid ?? (principal > 0 ? Math.round((paid / principal) * 100) : 0));

        return {
          id: String(item.id),
          debtType: isBorrowing ? 'BORROWING' : 'LENDING',
          creditorName: item.creditor_name || item.creditorName,
          creditorPhone: item.creditor_phone || item.creditorPhone,
          debtorName: item.debtor_name || item.debtorName,
          debtorPhone: item.debtor_phone || item.debtorPhone,
          counterpartyName: counterparty,
          principalAmount: principal,
          paidAmount: paid,
          remainingAmount: remaining,
          percentagePaid: Math.min(100, Math.max(0, percentage)),
          status: item.status || 'ACTIVE',
          paymentFrequency: item.payment_frequency || item.paymentFrequency,
          monthlyPayment: item.monthly_payment || item.monthlyPayment,
          paymentAmount: item.payment_amount || item.paymentAmount,
          startDate: item.start_date || item.startDate,
          dueDate: item.due_date || item.dueDate,
          nextPaymentDate: item.next_payment_date || item.nextPaymentDate,
          accountId: item.account_id || item.accountId,
          reminderEnabled: item.reminder_enabled ?? item.reminderEnabled ?? true,
          reminderDaysBefore: item.reminder_days_before ?? item.reminderDaysBefore,
          description: item.description,
          note: item.note,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Lấy tổng quan các khoản nợ (Summary)
   */
  async getSummary(): Promise<DebtSummaryData> {
    const defaultSummary: DebtSummaryData = {
      borrowing: {
        totalCount: 0,
        activeCount: 0,
        totalPrincipal: 0,
        totalPaid: 0,
        totalRemaining: 0,
      },
      lending: {
        totalCount: 0,
        activeCount: 0,
        totalPrincipal: 0,
        totalPaid: 0,
        totalRemaining: 0,
      },
      netPosition: {
        netDebt: 0,
      },
    };

    try {
      const res = await authFetch(`${API_BASE_URL}/debts/summary`);
      if (!res.ok) return defaultSummary;

      const json = await res.json();
      const data = json?.data;
      if (!data) return defaultSummary;

      return {
        borrowing: {
          totalCount: Number(data.borrowing?.total_count || data.borrowing?.totalCount || 0),
          activeCount: Number(data.borrowing?.active_count || data.borrowing?.activeCount || 0),
          totalPrincipal: Number(data.borrowing?.total_principal || data.borrowing?.totalPrincipal || 0),
          totalPaid: Number(data.borrowing?.total_paid || data.borrowing?.totalPaid || 0),
          totalRemaining: Number(data.borrowing?.total_remaining || data.borrowing?.totalRemaining || 0),
          monthlyPayment: Number(data.borrowing?.monthly_payment || data.borrowing?.monthlyPayment || 0),
        },
        lending: {
          totalCount: Number(data.lending?.total_count || data.lending?.totalCount || 0),
          activeCount: Number(data.lending?.active_count || data.lending?.activeCount || 0),
          totalPrincipal: Number(data.lending?.total_principal || data.lending?.totalPrincipal || 0),
          totalPaid: Number(data.lending?.total_paid || data.lending?.totalPaid || 0),
          totalRemaining: Number(data.lending?.total_remaining || data.lending?.totalRemaining || 0),
        },
        netPosition: {
          netDebt: Number(data.net_position?.net_debt || data.netPosition?.netDebt || 0),
          debtToAssetRatio: Number(data.net_position?.debt_to_asset_ratio || data.netPosition?.debtToAssetRatio || 0),
        },
      };
    } catch {
      return defaultSummary;
    }
  },

  /**
   * Tạo khoản nợ mới (Chuẩn DB & Web)
   */
  async createDebt(payload: CreateDebtPayload): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const body = {
        debt_type: payload.debt_type,
        creditor_name: payload.creditor_name,
        creditor_phone: payload.creditor_phone,
        creditor_email: payload.creditor_email,
        debtor_name: payload.debtor_name,
        debtor_phone: payload.debtor_phone,
        debtor_email: payload.debtor_email,
        principal_amount: payload.principal_amount,
        currency_code: payload.currency_code || 'VND', // Backend yêu cầu @NotBlank
        interest_rate: payload.interest_rate !== undefined ? payload.interest_rate : 0,
        payment_frequency: payload.payment_frequency || 'ONE_TIME',
        monthly_payment: payload.monthly_payment,
        payment_amount: payload.payment_amount,
        start_date: payload.start_date,
        due_date: payload.due_date || undefined,
        next_payment_date: payload.next_payment_date || undefined,
        account_id: payload.account_id || undefined,
        note: payload.note || payload.description,
        description: payload.description || payload.note,
        reminder_enabled: payload.reminder_enabled ?? true,
        reminder_days_before: payload.reminder_days_before ?? 1,
      };

      const res = await authFetch(`${API_BASE_URL}/debts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || json?.error || 'Không thể tạo khoản nợ',
        };
      }

      return {
        success: true,
        data: json?.data,
        message: 'Khoản nợ đã được tạo thành công',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi mạng khi tạo khoản nợ',
      };
    }
  },

  /**
   * Ghi nhận trả nợ
   */
  async recordPayment(debtId: string, payload: RecordDebtPaymentPayload): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/debts/${debtId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payload.amount,
          payment_date: payload.payment_date,
          account_id: payload.account_id || undefined,
          note: payload.note || 'Thanh toán khoản nợ',
          create_transaction: true,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể ghi nhận thanh toán',
        };
      }

      return { success: true, message: 'Đã ghi nhận trả nợ thành công' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng' };
    }
  },

  /**
   * Xóa khoản nợ
   */
  async deleteDebt(debtId: string): Promise<boolean> {
    try {
      const res = await authFetch(`${API_BASE_URL}/debts/${debtId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Lấy chi tiết 1 khoản nợ (kèm lịch sử thanh toán & kế hoạch kỳ)
   */
  async getDebtById(debtId: string): Promise<any | null> {
    try {
      const res = await authFetch(`${API_BASE_URL}/debts/${debtId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Cập nhật khoản nợ
   */
  async updateDebt(debtId: string, payload: any): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authFetch(`${API_BASE_URL}/debts/${debtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: json?.message || 'Không thể cập nhật khoản nợ' };
      }
      return { success: true, message: 'Đã cập nhật khoản nợ thành công' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi mạng khi cập nhật khoản nợ' };
    }
  },
};
