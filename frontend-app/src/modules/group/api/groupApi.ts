import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { invalidateMobileQueryCache } from '../../core/utils/mobileQueryCache';

export type GroupType = 'FAMILY' | 'ROOMMATE' | 'TRAVEL' | 'PROJECT' | 'COUPLE' | 'OTHER';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'CHILD';
export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  groupType: GroupType;
  baseCurrency: string;
  avatarKey?: string;
  ownerId: string;
  status: string;
  memberCount: number;
  childWalletCount?: number;
  totalExpenses?: number;
  unreadMessageCount?: number;
  myRole?: MemberRole;
  myBalance?: number;
  notificationEnabled?: boolean;
  lastActivityAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMemberResponse {
  childProfile?: boolean;
  id?: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  nickname?: string;
  status?: string;
  joinedAt?: string;
  user?: {
    id: string;
    fullName?: string;
    displayName?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
    avatarKey?: string;
  };
  fullName?: string;
  displayName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
}

export interface GroupExpenseResponse {
  financialPurpose?: CreateExpenseRequest['financialPurpose'];
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  paymentSource: 'GROUP_FUND' | 'PERSONAL_ACCOUNT';
  splitMethod: SplitMethod;
  expenseDate: string;
  notes?: string;
  payer?: {
    fullName: string;
    avatarKey?: string;
  };
  category?: {
    name: string;
    icon?: string;
    color?: string;
  };
  splits?: {
    userId: string;
    amount: number;
    userName?: string;
  }[];
  createdAt?: string;
}

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser?: { fullName: string };
  toUser?: { fullName: string };
}

export interface GroupBalanceResponse {
  balances: {
    userId: string;
    balance: number;
    totalPaid: number;
    totalOwed: number;
    user?: { fullName: string };
  }[];
  simplifiedDebts: SimplifiedDebt[];
  totalGroupExpenses: number;
  isFullySettled: boolean;
}

export interface GroupFundResponse {
  id: string;
  groupId: string;
  currency: string;
  balance: number;
  updatedAt?: string;
}

export interface GroupFundContributionResponse {
  id: string;
  contributorUserId: string;
  contributorName: string;
  amount: number;
  contributedAt: string;
  createdAt?: string;
  note?: string;
  periodId?: string;
  sourceType?: 'MANAGED_ACCOUNT' | 'EXTERNAL_TRANSFER' | 'CASH' | 'OTHER';
  status?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  confirmedAt?: string;
  rejectionReason?: string;
}

export interface GroupFinanceConfigResponse {
  groupId: string;
  useSharedFund: boolean;
  useContributionPeriods: boolean;
  allowMemberSplits: boolean;
  allowDebtSimplification: boolean;
  allowFundReimbursements: boolean;
  version: number;
}

export interface ContributionMemberProgress {
  avatarUrl?: string;
  userId: string;
  fullName: string;
  requiredAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
  outstandingAmount: number;
  excessAmount: number;
  exempt: boolean;
  overdue: boolean;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' | 'EXEMPT';
}

export interface ContributionPeriodResponse {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  startDate: string;
  dueDate: string;
  allocationMethod: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'VOLUNTARY';
  frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  requiredTotal: number;
  fundraisingTarget?: number;
  confirmedAmount: number;
  completedObligationAmount: number;
  pendingAmount: number;
  outstandingAmount: number;
  excessAmount: number;
  obligationProgressPercent: number;
  fundraisingProgressPercent?: number;
  completedMembers: number;
  incompleteMembers: number;
  members: ContributionMemberProgress[];
}

export type ContributionPeriodInput = {
  name: string; description?: string; startDate: string; dueDate: string;
  allocationMethod: ContributionPeriodResponse['allocationMethod'];
  frequency: ContributionPeriodResponse['frequency']; fundraisingTarget?: number;
  members: { userId: string; amount: number; percentage?: number; exempt: boolean; exemptionReason?: string }[];
};

export type ContributionPeriodPreview = { requiredTotal: number; amounts: Record<string, number> };

export interface FundReimbursementResponse {
  walletAuthorized: boolean;
  authorizedAccountId?: string | null;
  id: string;
  groupId: string;
  expenseId: string;
  beneficiaryUserId: string;
  totalAmount: number;
  reimbursedAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface GroupMonthlyCategoryStat {
  categoryId?: string;
  categoryName: string;
  icon?: string;
  color?: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface GroupMonthlyStatisticsResponse {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  remaining: number;
  fundBalance: number;
  transactionCount: number;
  trendPercentage?: number | null;
  categoryStats: GroupMonthlyCategoryStat[];
}

export interface GroupCommentResponse {
  id: string;
  commentableType: 'GROUP_EXPENSE' | 'FUND_CONTRIBUTION';
  commentableId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id?: string;
    fullName?: string;
    username?: string;
    avatarUrl?: string;
    avatarKey?: string;
  };
}

export interface MessageAttachmentItem {
  id?: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailKey?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
}

export interface GroupMessageReaction {
  reaction: string;
  userId: string;
  userName?: string;
}

export interface GroupMessageResponse {
  id: string;
  groupId: string;
  senderId: string;
  messageType: 'TEXT' | 'EXPENSE_CARD' | 'IMAGE' | 'SYSTEM';
  content: string;
  replyToMessageId?: string;
  expenseId?: string;
  attachments?: MessageAttachmentItem[];
  createdAt: string;
  updatedAt?: string;
  isRecalled?: boolean;
  isEdited?: boolean;
  readByUserIds?: string[];
  readByCount?: number;
  reactions?: GroupMessageReaction[];
  sender?: {
    id: string;
    fullName?: string;
    username?: string;
    avatarKey?: string;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  groupType: GroupType;
  baseCurrency?: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  currency?: string;
  paidByUserId: string;
  paymentSource: 'GROUP_FUND' | 'PERSONAL_ACCOUNT';
  financialPurpose?: 'MEMBER_SPLIT' | 'FUND_EXPENSE' | 'FUND_REIMBURSEMENT' | 'VOLUNTARY_SPEND';
  sourceAccountId?: string;
  categoryId?: string;
  splitMethod?: SplitMethod;
  expenseDate?: string;
  notes?: string;
  splits?: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
}

export interface UserSearchResult {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface GroupInvitationResponse {
  id: string;
  groupId: string;
  groupName?: string;
  groupType?: GroupType;
  inviterId: string;
  inviterName?: string;
  inviteeId: string;
  inviteeName?: string;
  inviteeEmail?: string;
  inviteeAvatarUrl?: string;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt?: string;
}

export interface ChildWalletResponse {
  id: string;
  groupId: string;
  userId?: string;
  childUsername?: string;
  childName: string;
  grade?: string; // Ví dụ: "Lớp 6", "Lớp 3"
  dateOfBirth?: string;
  age?: number;
  avatarKey?: string;
  avatarUrl?: string;
  balance: number;
  currency?: string;
  weeklyAllowance?: number;
  spentToday?: number;
  spentThisWeek?: number;
  dailySpendingLimit?: number;
  monthlySpendingLimit?: number;
  requireApprovalAbove?: number;
  notes?: string;
  createdAt?: string;
}

export interface CreateChildWalletRequest {
  childName: string;
  username?: string;
  password?: string;
  grade?: string;
  age?: number;
  dateOfBirth?: string;
  avatarKey?: string;
  avatarUrl?: string;
  initialBalance?: number;
  balance?: number;
  weeklyAllowance?: number;
  spendLimitDaily?: number;
  spendLimitWeekly?: number;
  requireApprovalAbove?: number;
  notes?: string;
  allowanceSource?: string;
  allowanceAccountId?: string;
  privacyLevel?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi HTTP ${res.status}`);
  }
  return (json?.data !== undefined ? json.data : json) as T;
}

export interface ReimbursementPayment {
  id: string;
  amount: number;
  paidAt: string;
  note?: string;
  wallet: boolean;
}

export interface SettlementResponse {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  settlementDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
}

export const groupApi = {
  async previewContributionPeriod(groupId: string, payload: ContributionPeriodInput): Promise<ContributionPeriodPreview> {
    return request<ContributionPeriodPreview>(`/groups/${groupId}/contribution-periods/preview`, { method: 'POST', body: JSON.stringify(payload) });
  },
  async remindContributionPeriod(groupId: string, periodId: string): Promise<void> {
    return request<void>(`/groups/${groupId}/contribution-periods/${periodId}/remind`, { method: 'POST' });
  },
  async adjustContributionObligation(groupId: string, periodId: string, userId: string, payload: { amount: number; exempt: boolean; reason: string }): Promise<ContributionPeriodResponse> {
    return request<ContributionPeriodResponse>(`/groups/${groupId}/contribution-periods/${periodId}/obligations/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async reviewSettlement(groupId: string, id: string, action: 'cancel' | 'reject', reason?: string): Promise<void> {
    return request<void>(`/groups/${groupId}/settlements/${id}/${action}`, { method: 'POST', body: JSON.stringify(action === 'reject' ? { reason } : undefined) });
  },
  async confirmSettlement(groupId: string, id: string, receivingAccountId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/settlements/${id}/confirm`, { method: 'POST', body: JSON.stringify({ receivingAccountId }) });
    invalidateMobileQueryCache(['transactions:', 'accounts:', 'dashboard:', 'reports:']);
  },
  async closeContributionPeriod(groupId: string, periodId: string): Promise<ContributionPeriodResponse> {
    return request<ContributionPeriodResponse>(`/groups/${groupId}/contribution-periods/${periodId}/close`, { method: 'POST' });
  },
  async setReimbursementWallet(groupId: string, id: string, accountId: string | null): Promise<FundReimbursementResponse> {
    return request<FundReimbursementResponse>(`/groups/${groupId}/fund/reimbursements/${id}/wallet-consent`, { method: 'PUT', body: JSON.stringify({ accountId }) });
  },
  async getReimbursementHistory(groupId: string, id: string): Promise<ReimbursementPayment[]> {
    return request<ReimbursementPayment[]>(`/groups/${groupId}/fund/reimbursements/${id}/payments`);
  },
  async payReimbursement(groupId: string, id: string, payload: { amount: number; useAuthorizedWallet: boolean; note?: string }, key: string): Promise<FundReimbursementResponse> {
    const result = await request<FundReimbursementResponse>(`/groups/${groupId}/fund/reimbursements/${id}/payments`, { method: 'POST', body: JSON.stringify(payload), headers: { 'Idempotency-Key': key } });
    if (payload.useAuthorizedWallet) invalidateMobileQueryCache(['transactions:', 'accounts:', 'dashboard:', 'reports:']);
    return result;
  },
  async reviewContribution(groupId: string, id: string, decision: 'confirm' | 'reject', reason?: string): Promise<GroupFundContributionResponse> {
    return request<GroupFundContributionResponse>(`/groups/${groupId}/fund/contributions/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ reason }) });
  },
  async updateFinanceConfig(groupId: string, payload: Omit<GroupFinanceConfigResponse, 'groupId' | 'version'>): Promise<GroupFinanceConfigResponse> {
    return request<GroupFinanceConfigResponse>(`/groups/${groupId}/finance-config`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  // 1. Danh sách & Chi tiết nhóm
  async getGroups(): Promise<GroupResponse[]> {
    try {
      const data = await request<any>('/groups');
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch {
      return [];
    }
  },

  async getGroupDetail(groupId: string): Promise<GroupResponse | null> {
    try {
      return await request<GroupResponse>(`/groups/${groupId}`);
    } catch {
      return null;
    }
  },

  async createGroup(req: CreateGroupRequest): Promise<GroupResponse> {
    return await request<GroupResponse>('/groups', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async deleteGroup(groupId: string): Promise<void> {
    await request<void>(`/groups/${groupId}`, { method: 'DELETE' });
  },

  async toggleNotification(groupId: string, enabled: boolean): Promise<boolean> {
    try {
      await request<any>(`/groups/${groupId}/notifications?enabled=${enabled}`, {
        method: 'PUT',
      });
      return true;
    } catch (e) {
      console.warn('Lỗi bật/tắt thông báo nhóm:', e);
      return false;
    }
  },

  async updateGroup(groupId: string, req: Partial<CreateGroupRequest>): Promise<GroupResponse> {
    return await request<GroupResponse>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  },

  async leaveGroup(groupId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/leave`, { method: 'POST' });
  },

  // 2. Thành viên nhóm & Mời thành viên
  async getMembers(groupId: string): Promise<GroupMemberResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/members`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const data = await request<any>(`/users/search?q=${encodeURIComponent(query.trim())}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async addMember(groupId: string, req: { userId: string; role?: MemberRole }): Promise<any> {
    return await request<any>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  async updateMember(groupId: string, userId: string, data: { role?: string; contributionRatio?: number }): Promise<any> {
    return await request<any>(`/groups/${groupId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 2.1 Ví trẻ em (Child Wallets)
  async getChildWallets(groupId: string): Promise<ChildWalletResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/child-wallets`);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch {
      return [];
    }
  },

  async createChildWallet(groupId: string, data: CreateChildWalletRequest): Promise<ChildWalletResponse> {
    return await request<ChildWalletResponse>(`/groups/${groupId}/child-wallets`, {
      method: 'POST',
      body: JSON.stringify({
        privacyLevel: 'PARENT_SUPERVISED',
        ...data,
      }),
    });
  },

  // 3. Chi tiêu chung (Expenses)
  async getExpenses(groupId: string): Promise<GroupExpenseResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/expenses`);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch {
      return [];
    }
  },

  async getExpenseDetail(groupId: string, expenseId: string): Promise<GroupExpenseResponse | null> {
    try {
      return await request<GroupExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}`);
    } catch {
      return null;
    }
  },

  async createExpense(groupId: string, req: CreateExpenseRequest): Promise<GroupExpenseResponse> {
    const result = await request<GroupExpenseResponse>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
    invalidateMobileQueryCache(['transactions:', 'accounts:', 'dashboard:', 'budgets:', 'reports:']);
    return result;
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' });
    invalidateMobileQueryCache(['transactions:', 'accounts:', 'dashboard:', 'budgets:', 'reports:']);
  },

  async updateExpense(groupId: string, expenseId: string, payload: { description: string; notes: string }): Promise<GroupExpenseResponse> {
    const result = await request<GroupExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'PUT', body: JSON.stringify(payload) });
    invalidateMobileQueryCache(['transactions:', 'dashboard:', 'reports:']);
    return result;
  },

  // 4. Bảng cân đối công nợ (Balances & Simplified Debts)
  async getBalances(groupId: string): Promise<GroupBalanceResponse | null> {
    try {
      return await request<GroupBalanceResponse>(`/groups/${groupId}/balances`);
    } catch {
      return null;
    }
  },

  // 5. Quỹ nhóm (Group Fund)
  async getFund(groupId: string): Promise<GroupFundResponse | null> {
    try {
      return await request<GroupFundResponse>(`/groups/${groupId}/fund`);
    } catch {
      return null;
    }
  },

  async contributeToFund(
    groupId: string,
    req: { sourceAccountId: string; periodId?: string; amount: number; contributedAt: string; note?: string },
    key = `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ): Promise<GroupFundResponse> {
    const result = await request<GroupFundResponse>(`/groups/${groupId}/fund/contributions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(req),
    });
    invalidateMobileQueryCache(['transactions:', 'accounts:', 'dashboard:', 'reports:']);
    return result;
  },

  async getFundContributions(groupId: string): Promise<GroupFundContributionResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/fund/contributions`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getFinanceConfig(groupId: string): Promise<GroupFinanceConfigResponse> {
    return await request<GroupFinanceConfigResponse>(`/groups/${groupId}/finance-config`);
  },

  async getActiveContributionPeriod(groupId: string): Promise<ContributionPeriodResponse | null> {
    const period = await request<ContributionPeriodResponse | null>(`/groups/${groupId}/contribution-periods/active`);
    return period?.id ? period : null;
  },

  async getContributionPeriod(groupId: string, periodId: string): Promise<ContributionPeriodResponse> {
    return request<ContributionPeriodResponse>(`/groups/${groupId}/contribution-periods/${periodId}`);
  },

  async getContributionPeriods(groupId: string): Promise<ContributionPeriodResponse[]> {
    const data = await request<any>(`/groups/${groupId}/contribution-periods?page=0&size=50`);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async createContributionPeriod(groupId: string, payload: ContributionPeriodInput): Promise<ContributionPeriodResponse> {
    return await request<ContributionPeriodResponse>(`/groups/${groupId}/contribution-periods`, {
      method: 'POST', headers: { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` }, body: JSON.stringify(payload),
    });
  },

  async submitExternalContribution(groupId: string, payload: {
    periodId?: string; sourceType: 'EXTERNAL_TRANSFER' | 'CASH' | 'OTHER'; amount: number; contributedAt: string; note?: string;
  }, key = `${Date.now()}-${Math.random().toString(36).slice(2)}`): Promise<GroupFundContributionResponse> {
    return await request<GroupFundContributionResponse>(`/groups/${groupId}/fund/contribution-requests`, {
      method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload),
    });
  },

  async getFundReimbursements(groupId: string): Promise<FundReimbursementResponse[]> {
    const data = await request<any>(`/groups/${groupId}/fund/reimbursements?page=0&size=50`);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async getFundMonthlyStatistics(groupId: string, year?: number, month?: number): Promise<GroupMonthlyStatisticsResponse | null> {
    try {
      const query = year && month ? `?year=${year}&month=${month}` : '';
      return await request<GroupMonthlyStatisticsResponse>(`/groups/${groupId}/fund/monthly-statistics${query}`);
    } catch {
      return null;
    }
  },

  // 6. Thanh toán giải quyết nợ (Settlements)
  async getSettlements(groupId: string): Promise<SettlementResponse[]> {
    const page = await request<{ content: SettlementResponse[] }>(`/groups/${groupId}/settlements?page=0&size=50`);
    return page.content ?? [];
  },

  async createSettlement(groupId: string, req: { payeeId: string; sourceAccountId: string; amount: number; notes?: string }, key: string): Promise<SettlementResponse> {
    return await request<SettlementResponse>(`/groups/${groupId}/settlements`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        toUserId: req.payeeId,
        sourceAccountId: req.sourceAccountId,
        amount: req.amount,
        currency: 'VND',
        notes: req.notes,
        settlementDate: new Date().toISOString().slice(0, 10),
      }),
    });
  },

  // 7. Tin nhắn trò chuyện nhóm (Group Chat)
  async getMessages(groupId: string): Promise<GroupMessageResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/messages?page=0&size=50`);
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async sendMessage(
    groupId: string,
    content: string,
    expenseId?: string,
    attachments?: MessageAttachmentItem[]
  ): Promise<GroupMessageResponse> {
    let messageType: 'TEXT' | 'EXPENSE_CARD' | 'IMAGE' = 'TEXT';
    if (expenseId) {
      messageType = 'EXPENSE_CARD';
    } else if (attachments && attachments.length > 0) {
      const isImg = attachments.some((a) => a.mimeType?.startsWith('image/'));
      messageType = isImg ? 'IMAGE' : 'TEXT';
    }

    return await request<GroupMessageResponse>(`/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        messageType,
        expenseId,
        attachments,
      }),
    });
  },

  async uploadChildWalletAvatar(groupId: string, file: { uri: string; name: string; type: string }): Promise<string> {
    const token = authStorage.getToken();
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'avatar.jpg',
      type: file.type || 'image/jpeg',
    });

    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/groups/${groupId}/child-wallets/avatar`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res?.avatarUrl || res?.fileKey || res?.data?.avatarUrl || '');
          } else {
            reject(new Error(res?.message || `Lỗi tải ảnh đại diện (${xhr.status})`));
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve('');
          } else {
            reject(new Error(`Máy chủ phản hồi HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải ảnh lên'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Hết thời gian tải ảnh lên máy chủ'));
      };

      xhr.timeout = 60000;
      xhr.send(formData);
    });
  },

  async uploadMessageAttachment(groupId: string, file: { uri: string; name: string; type: string }): Promise<MessageAttachmentItem> {
    const token = authStorage.getToken();
    const formData = new FormData();
    // Chuẩn format file multipart cho React Native / Expo
    // @ts-ignore
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'image.jpg',
      type: file.type || 'image/jpeg',
    });

    return await new Promise<MessageAttachmentItem>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/groups/${groupId}/messages/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res?.data || res);
          } else {
            reject(new Error(res?.message || `Lỗi tải ảnh (${xhr.status})`));
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({} as any);
          } else {
            reject(new Error(`Máy chủ phản hồi HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải ảnh lên'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Hết thời gian tải ảnh lên máy chủ'));
      };

      xhr.timeout = 60000;
      xhr.send(formData);
    });
  },

  async updateMessage(groupId: string, messageId: string, content: string): Promise<GroupMessageResponse> {
    return await request<GroupMessageResponse>(`/groups/${groupId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async recallMessage(groupId: string, messageId: string): Promise<GroupMessageResponse> {
    return await request<GroupMessageResponse>(`/groups/${groupId}/messages/${messageId}/recall`, {
      method: 'POST',
    });
  },

  async reactToMessage(groupId: string, messageId: string, reaction: string): Promise<GroupMessageResponse> {
    return await request<GroupMessageResponse>(`/groups/${groupId}/messages/${messageId}/react?reaction=${encodeURIComponent(reaction)}`, {
      method: 'POST',
    });
  },

  async deleteMessage(groupId: string, messageId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' });
  },

  async getUnreadMessageCount(groupId: string): Promise<number> {
    try {
      const data = await request<{ unreadCount: number }>(`/groups/${groupId}/messages/unread-count`);
      return data?.unreadCount || 0;
    } catch {
      return 0;
    }
  },

  async markMessagesAsRead(groupId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;
    try {
      await request<void>(`/groups/${groupId}/messages/mark-read`, {
        method: 'POST',
        body: JSON.stringify({ messageIds }),
      });
    } catch {
      // ignore
    }
  },

  // 8. Bình luận trên khoản chi / đóng góp quỹ (Comments)
  async getComments(groupId: string, commentableType: 'GROUP_EXPENSE' | 'FUND_CONTRIBUTION', commentableId: string): Promise<GroupCommentResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/comments?commentableType=${commentableType}&commentableId=${commentableId}&page=0&size=50`);
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async createComment(
    groupId: string,
    req: { commentableType: 'GROUP_EXPENSE' | 'FUND_CONTRIBUTION'; commentableId: string; content: string; parentCommentId?: string }
  ): Promise<GroupCommentResponse> {
    return await request<GroupCommentResponse>(`/groups/${groupId}/comments`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async updateComment(groupId: string, commentId: string, content: string): Promise<GroupCommentResponse> {
    return await request<GroupCommentResponse>(`/groups/${groupId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(groupId: string, commentId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/comments/${commentId}`, { method: 'DELETE' });
  },

  // 9. Quản lý chi tiết ví trẻ em (Kid Wallet Detail & Spend Requests)
  async getSpendRequests(groupId: string, walletId: string, status?: string): Promise<any[]> {
    try {
      const url = status
        ? `/groups/${groupId}/child-wallets/${walletId}/spend-requests?status=${status}&page=0&size=50`
        : `/groups/${groupId}/child-wallets/${walletId}/spend-requests?page=0&size=50`;
      const res = await request<any>(url);
      if (Array.isArray(res)) return res;
      if (res?.content && Array.isArray(res.content)) return res.content;
      if (res?.data?.spend_requests && Array.isArray(res.data.spend_requests)) return res.data.spend_requests;
      return [];
    } catch {
      return [];
    }
  },

  async approveSpendRequest(groupId: string, walletId: string, requestId: string, notes?: string): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/spend-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async rejectSpendRequest(groupId: string, walletId: string, requestId: string, reason?: string): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/spend-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async depositToChildWallet(groupId: string, walletId: string, data: { amount: number; source?: string; sourceAccountId?: string; description?: string; notes?: string }): Promise<ChildWalletResponse> {
    return await request<ChildWalletResponse>(`/groups/${groupId}/child-wallets/${walletId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        source: data.source || (data.sourceAccountId ? 'PERSONAL_ACCOUNT' : 'GROUP_FUND'),
        sourceAccountId: data.sourceAccountId,
        description: data.description || data.notes || 'Nạp tiền tiêu vặt cho con',
      }),
    });
  },

  async withdrawFromChildWallet(groupId: string, walletId: string, data: { amount: number; targetAccountId?: string; notes?: string }): Promise<ChildWalletResponse> {
    return await request<ChildWalletResponse>(`/groups/${groupId}/child-wallets/${walletId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateChildWallet(
    groupId: string,
    walletId: string,
    data: {
      childName?: string;
      avatarKey?: string;
      avatarUrl?: string;
      weeklyAllowance?: number;
      spendLimitDaily?: number;
      spendLimitWeekly?: number;
      requireApprovalAbove?: number;
      notes?: string;
      allowanceSource?: string;
      allowanceAccountId?: string;
      privacyLevel?: string;
    }
  ): Promise<ChildWalletResponse> {
    return await request<ChildWalletResponse>(`/groups/${groupId}/child-wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteChildWallet(groupId: string, walletId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/child-wallets/${walletId}`, {
      method: 'DELETE',
    });
  },

  async resetChildPassword(groupId: string, walletId: string, newPassword: string): Promise<void> {
    await request<void>(`/groups/${groupId}/child-wallets/${walletId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  async getChildWallet(groupId: string, walletId: string): Promise<ChildWalletResponse> {
    return await request<ChildWalletResponse>(`/groups/${groupId}/child-wallets/${walletId}`);
  },

  async createChildSpendRequest(
    groupId: string,
    walletId: string,
    req: { amount: number; description: string; categoryId?: string; notes?: string; imageKey?: string }
  ): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/spend-requests`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async completeChore(groupId: string, walletId: string, choreId: string, payload?: { completionNotes?: string }): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/chores/${choreId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async createChildTransaction(groupId: string, walletId: string, req: { amount: number; description: string }): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({
        amount: req.amount,
        description: req.description,
        source: 'PERSONAL_ACCOUNT',
      }),
    });
  },

  // 10. Nhiệm vụ nhận thưởng của bé (Child Chores)
  async getChores(groupId: string, walletId: string): Promise<any[]> {
    try {
      const res = await request<any>(`/groups/${groupId}/child-wallets/${walletId}/chores?size=50`);
      if (Array.isArray(res)) return res;
      if (res?.content && Array.isArray(res.content)) return res.content;
      return [];
    } catch {
      return [];
    }
  },

  async createChore(groupId: string, walletId: string, req: { title: string; description?: string; rewardAmount: number; frequency?: string; difficulty?: string; dueDate?: string; icon?: string }): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/chores`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // 11. Ghi chi tiêu trực tiếp cho ví của bé (Dành cho bố mẹ hoặc ví bé tự ghi chi tiêu)
  async createDirectChildSpend(
    groupId: string,
    walletId: string,
    data: {
      amount: number;
      description: string;
      categoryId?: string;
      notes?: string;
    }
  ): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/spend-requests`, {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId,
        notes: data.notes,
      }),
    });
  },

  async approveChore(groupId: string, walletId: string, choreId: string, payload?: { feedback?: string; source?: string; sourceAccountId?: string }): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/chores/${choreId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async rejectChore(groupId: string, walletId: string, choreId: string, reason: string, canRetry: boolean = true): Promise<any> {
    return await request<any>(`/groups/${groupId}/child-wallets/${walletId}/chores/${choreId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, canRetry }),
    });
  },

  // 12. Lời mời thành viên tham gia nhóm (Group Invitations)
  async getSentPendingInvitations(groupId: string): Promise<GroupInvitationResponse[]> {
    try {
      const res = await request<any>(`/groups/${groupId}/invitations/pending`);
      if (Array.isArray(res)) return res;
      if (res?.data && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  async cancelInvitation(groupId: string, invitationId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  async getPendingInvitations(): Promise<GroupInvitationResponse[]> {
    try {
      const res = await request<any>(`/groups/invitations/pending`);
      if (Array.isArray(res)) return res;
      if (res?.data && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  async acceptInvitation(invitationId: string): Promise<any> {
    return await request<any>(`/groups/invitations/${invitationId}/accept`, {
      method: 'POST',
    });
  },

  async rejectInvitation(invitationId: string): Promise<void> {
    await request<void>(`/groups/invitations/${invitationId}/reject`, {
      method: 'POST',
    });
  },
};

