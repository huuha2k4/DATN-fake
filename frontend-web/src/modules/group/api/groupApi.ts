import { api } from '../../core/api/api';

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
  childWalletCount: number;
  totalExpenses: number;
  unreadMessageCount: number;
  myRole: MemberRole;
  myBalance: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMemberResponse {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  nickname?: string;
  status: string;
  joinedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    avatarKey?: string;
  };
}

export interface ExpenseSplitItem {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  isPaid?: boolean;
}

export interface GroupExpenseResponse {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  categoryId?: string;
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
  commentCount?: number;
  createdAt: string;
}

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser?: { fullName: string; avatarKey?: string };
  toUser?: { fullName: string; avatarKey?: string };
}

export interface GroupBalanceResponse {
  balances: {
    userId: string;
    balance: number;
    totalPaid: number;
    totalOwed: number;
    user?: { fullName: string; avatarKey?: string };
  }[];
  simplifiedDebts: SimplifiedDebt[];
  totalGroupExpenses: number;
  isFullySettled: boolean;
}

export interface SettlementResponse {
  id: string;
  groupId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  settlementDate: string;
  notes?: string;
  payer?: { fullName: string };
  payee?: { fullName: string };
}

export interface ChildWalletResponse {
  id: string;
  groupId: string;
  userId?: string;
  childUsername?: string;
  childName: string;
  dateOfBirth?: string;
  age?: number;
  balance: number;
  currency: string;
  weeklyAllowance?: number;
  privacyLevel?: 'FULL_ACCESS' | 'PARENT_SUPERVISED' | 'VIEW_ONLY';
  spendLimitDaily?: number;
  spendLimitWeekly?: number;
  spentToday?: number;
  spentThisWeek?: number;
  stats?: {
    totalSpentThisMonth: number;
    pendingRequestCount: number;
    completedChoreCount: number;
    totalChoreEarnings: number;
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
  categoryId?: string;
  splitMethod: SplitMethod;
  expenseDate?: string;
  notes?: string;
  splits?: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
}

export interface CreateSettlementRequest {
  payeeId: string;
  amount: number;
  currency?: string;
  notes?: string;
}

export interface CreateChildWalletRequest {
  childName: string;
  username?: string;
  password?: string;
  dateOfBirth?: string;
  balance?: number;
  weeklyAllowance?: number;
  privacyLevel?: 'FULL_ACCESS' | 'PARENT_SUPERVISED' | 'VIEW_ONLY';
  spendLimitDaily?: number;
  spendLimitWeekly?: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}export interface GroupInvitationResponse {
  id: string;
  groupId: string;
  groupName: string;
  groupType: GroupType;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
}

export interface MessageAttachmentItem {
  id?: string;
  fileKey: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  thumbnailKey?: string;
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
  readByCount?: number;
  readByUserIds?: string[];
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    displayName: string;
    avatarKey?: string;
  };
}

export interface SpendRequestItem {
  id: string;
  walletId: string;
  amount: number;
  currency?: string;
  categoryId?: string;
  description: string;
  notes?: string;
  imageKey?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  respondedByUserId?: string;
  respondedAt?: string;
  responseNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  child?: {
    name: string;
    age?: number;
    avatarKey?: string;
  };
}

export interface CreateChildSpendRequestPayload {
  amount: number;
  categoryId: string;
  description: string;
  notes?: string;
  imageKey?: string;
}

export const groupApi = {
  // 1. Quản lý nhóm
  async getGroups(): Promise<GroupResponse[]> {
    try {
      const res = await api.get('/groups');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async getGroupDetail(groupId: string): Promise<GroupResponse | null> {
    try {
      const res = await api.get(`/groups/${groupId}`);
      return res.data?.data || res.data || null;
    } catch {
      return null;
    }
  },

  async createGroup(req: CreateGroupRequest): Promise<GroupResponse> {
    const res = await api.post('/groups', req);
    return res.data?.data || res.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/groups/${groupId}`);
  },

  // 2. Thành viên
  async getMembers(groupId: string): Promise<GroupMemberResponse[]> {
    try {
      const res = await api.get(`/groups/${groupId}/members`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async addMember(groupId: string, req: { userId: string; role?: MemberRole; contributionRatio?: number }): Promise<GroupInvitationResponse> {
    const res = await api.post(`/groups/${groupId}/members`, req);
    return res.data?.data || res.data;
  },

  async getPendingInvitations(): Promise<GroupInvitationResponse[]> {
    try {
      const res = await api.get('/groups/invitations/pending');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async acceptInvitation(invitationId: string): Promise<GroupMemberResponse> {
    const res = await api.post(`/groups/invitations/${invitationId}/accept`);
    return res.data?.data || res.data;
  },

  async rejectInvitation(invitationId: string): Promise<void> {
    await api.post(`/groups/invitations/${invitationId}/reject`);
  },

  async updateMember(groupId: string, userId: string, req: { role?: MemberRole; contributionRatio?: number }): Promise<GroupMemberResponse> {
    const res = await api.put(`/groups/${groupId}/members/${userId}`, req);
    return res.data?.data || res.data;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },

  // 3. Chi tiêu chung & số dư
  async getExpenses(groupId: string): Promise<GroupExpenseResponse[]> {
    try {
      const res = await api.get(`/groups/${groupId}/expenses`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async createExpense(groupId: string, req: CreateExpenseRequest): Promise<GroupExpenseResponse> {
    const res = await api.post(`/groups/${groupId}/expenses`, req);
    return res.data?.data || res.data;
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
  },

  async getBalances(groupId: string): Promise<GroupBalanceResponse | null> {
    try {
      const res = await api.get(`/groups/${groupId}/balances`);
      return res.data?.data || res.data || null;
    } catch {
      return null;
    }
  },

  // 4. Thanh toán nợ nhóm (Settlements)
  async getSettlements(groupId: string): Promise<SettlementResponse[]> {
    try {
      const res = await api.get(`/groups/${groupId}/settlements`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async createSettlement(groupId: string, req: CreateSettlementRequest): Promise<SettlementResponse> {
    const res = await api.post(`/groups/${groupId}/settlements`, req);
    return res.data?.data || res.data;
  },

  async confirmSettlement(groupId: string, settlementId: string): Promise<void> {
    await api.post(`/groups/${groupId}/settlements/${settlementId}/confirm`);
  },

  // 5. Ví trẻ em trong nhóm gia đình
  async getChildWallets(groupId: string): Promise<ChildWalletResponse[]> {
    try {
      const res = await api.get(`/groups/${groupId}/child-wallets`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async createChildWallet(groupId: string, req: CreateChildWalletRequest): Promise<ChildWalletResponse> {
    const res = await api.post(`/groups/${groupId}/child-wallets`, req);
    return res.data?.data || res.data;
  },

  async depositChildWallet(groupId: string, walletId: string, amount: number, description?: string, source: string = 'allowance'): Promise<void> {
    await api.post(`/groups/${groupId}/child-wallets/${walletId}/deposit`, {
      amount,
      description: description || 'Nạp tiền vào ví',
      source,
    });
  },

  async deleteChildWallet(groupId: string, walletId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/child-wallets/${walletId}`);
  },

  // 6. Tin nhắn nhóm (Chat)
  async getMessages(groupId: string): Promise<GroupMessageResponse[]> {
    try {
      const res = await api.get(`/groups/${groupId}/messages?page=0&size=50`);
      const data = res.data;
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
    const isImage = attachments && attachments.some(a => a.mimeType?.startsWith('image/'));
    const messageType = expenseId ? 'EXPENSE_CARD' : (isImage ? 'IMAGE' : 'TEXT');
    const res = await api.post(`/groups/${groupId}/messages`, {
      content: content || (isImage ? 'Đã gửi một ảnh' : 'Đã gửi tệp đính kèm'),
      messageType,
      expenseId,
      attachments,
    });
    return res.data?.data || res.data;
  },

  async markMessagesAsRead(groupId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;
    try {
      await api.post(`/groups/${groupId}/messages/mark-read`, { messageIds });
    } catch {
      // Ignore background read receipt errors
    }
  },

  async reportTyping(groupId: string, typing: boolean): Promise<void> {
    try {
      await api.post(`/groups/${groupId}/messages/typing?typing=${typing}`);
    } catch {
      // Ignore background typing reports
    }
  },

  async getTypingUsers(groupId: string): Promise<string[]> {
    try {
      const res = await api.get(`/groups/${groupId}/messages/typing`);
      return res.data?.typingUserIds || [];
    } catch {
      return [];
    }
  },

  async uploadMessageAttachment(groupId: string, file: File): Promise<MessageAttachmentItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/groups/${groupId}/messages/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.data || res.data;
  },

  // 7. Yêu cầu chi tiêu của bé (Xin tiền bố mẹ)
  async getSpendRequests(groupId: string, walletId: string): Promise<SpendRequestItem[]> {
    try {
      const res = await api.get(`/groups/${groupId}/child-wallets/${walletId}/spend-requests`);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data?.content && Array.isArray(data.content)) return data.content;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },

  async createSpendRequest(groupId: string, walletId: string, payload: CreateChildSpendRequestPayload): Promise<SpendRequestItem> {
    const res = await api.post(`/groups/${groupId}/child-wallets/${walletId}/spend-requests`, payload);
    return res.data?.data || res.data;
  },

  async approveSpendRequest(groupId: string, walletId: string, requestId: string, notes?: string): Promise<SpendRequestItem> {
    const res = await api.post(`/groups/${groupId}/child-wallets/${walletId}/spend-requests/${requestId}/approve`, { notes });
    return res.data?.data || res.data;
  },

  async rejectSpendRequest(groupId: string, walletId: string, requestId: string, reason: string): Promise<SpendRequestItem> {
    const res = await api.post(`/groups/${groupId}/child-wallets/${walletId}/spend-requests/${requestId}/reject`, { reason });
    return res.data?.data || res.data;
  },
};
