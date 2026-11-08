import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

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
  lastActivityAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMemberResponse {
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
  note?: string;
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
    avatarUrl?: string;
    avatarKey?: string;
  };
}

export interface MessageAttachmentItem {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailKey?: string;
  downloadUrl?: string;
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
  sourceAccountId?: string;
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
  createdAt?: string;
}

export interface CreateChildWalletRequest {
  childName: string;
  username?: string;
  password?: string;
  dateOfBirth?: string;
  balance?: number;
  grade?: string;
  avatarKey?: string;
  weeklyAllowance?: number;
  allowanceSource?: 'PERSONAL_ACCOUNT' | 'GROUP_FUND';
  allowanceAccountId?: string;
  privacyLevel?: 'FULL_ACCESS' | 'PARENT_SUPERVISED' | 'VIEW_ONLY';
  spendLimitDaily?: number;
  spendLimitWeekly?: number;
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

export const groupApi = {
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
    return await request<GroupExpenseResponse>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await request<void>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' });
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
    req: { sourceAccountId: string; amount: number; contributedAt: string; note?: string }
  ): Promise<GroupFundResponse> {
    return await request<GroupFundResponse>(`/groups/${groupId}/fund/contributions`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getFundContributions(groupId: string): Promise<GroupFundContributionResponse[]> {
    try {
      const data = await request<any>(`/groups/${groupId}/fund/contributions`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
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
  async createSettlement(groupId: string, req: { payeeId: string; sourceAccountId?: string; amount: number; notes?: string }): Promise<any> {
    return await request<any>(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify({
        toUserId: req.payeeId,
        sourceAccountId: req.sourceAccountId || 'DEFAULT',
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

  async createChore(groupId: string, walletId: string, req: { title: string; description?: string; rewardAmount: number; frequency?: string; difficulty?: string; dueDate?: string }): Promise<any> {
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

