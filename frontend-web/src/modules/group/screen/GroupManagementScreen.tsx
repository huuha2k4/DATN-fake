import { useEffect, useState, useRef } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import {
  groupApi,
  type GroupResponse,
  type GroupMemberResponse,
  type GroupExpenseResponse,
  type GroupBalanceResponse,
  type SettlementResponse,
  type ChildWalletResponse,
  type GroupType,
  type UserSearchResult,
  type GroupInvitationResponse,
  type GroupMessageResponse,
} from '../api/groupApi';
import { getStoredUser } from '../../auth/api/authApi';
import { userApi } from '../../user/api/userApi';
import './GroupManagementScreen.css';

interface GroupManagementScreenProps {
  onNotify: (message: string) => void;
}

function getGroupTypeLabel(type: GroupType): { label: string; icon: IconName; bg: string; color: string } {
  switch (type) {
    case 'FAMILY':
      return { label: 'Gia đình', icon: 'home', bg: '#ecfdf5', color: '#07543f' };
    case 'ROOMMATE':
      return { label: 'Bạn cùng phòng', icon: 'users', bg: '#eff6ff', color: '#2563eb' };
    case 'TRAVEL':
      return { label: 'Du lịch / Dã ngoại', icon: 'map', bg: '#fef3c7', color: '#d97706' };
    case 'PROJECT':
      return { label: 'Dự án / Quỹ chung', icon: 'briefcase', bg: '#f3e8ff', color: '#7c3aed' };
    case 'COUPLE':
      return { label: 'Cặp đôi', icon: 'heart', bg: '#ffe4e6', color: '#e11d48' };
    default:
      return { label: 'Nhóm chung', icon: 'users', bg: '#f1f5f9', color: '#475569' };
  }
}

function formatMessengerDateDivider(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Compare date parts
    const dYear = d.getFullYear();
    const dMonth = d.getMonth();
    const dDate = d.getDate();

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDate = now.getDate();

    const isToday = dYear === nowYear && dMonth === nowMonth && dDate === nowDate;

    // Check yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = dYear === yesterday.getFullYear() && dMonth === yesterday.getMonth() && dDate === yesterday.getDate();

    if (isToday) {
      return timeStr;
    }
    if (isYesterday) {
      return `${timeStr} Hôm qua`;
    }

    // Days difference
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Within current week (less than 7 days) -> format "08:29 T2", "08:29 T3", etc.
    if (diffDays < 7) {
      const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday ...
      const vnDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return `${timeStr} ${vnDays[dayIndex]}`;
    }

    // Older: format "08:29, 24 Thg 10" or "08:29, 24/10/2026"
    if (dYear === nowYear) {
      const day = String(dDate).padStart(2, '0');
      const month = String(dMonth + 1).padStart(2, '0');
      return `${timeStr}, ${day}/${month}`;
    }

    const day = String(dDate).padStart(2, '0');
    const month = String(dMonth + 1).padStart(2, '0');
    return `${timeStr}, ${day}/${month}/${dYear}`;
  } catch {
    return '';
  }
}

export function GroupManagementScreen({ onNotify }: GroupManagementScreenProps) {
  const currentUser = getStoredUser();

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Group Details Sub-tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'SETTLEMENTS' | 'MEMBERS' | 'CHILD_WALLETS'>('OVERVIEW');

  // Tab Data
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [expenses, setExpenses] = useState<GroupExpenseResponse[]>([]);
  const [balances, setBalances] = useState<GroupBalanceResponse | null>(null);
  const [settlements, setSettlements] = useState<SettlementResponse[]>([]);
  const [childWallets, setChildWallets] = useState<ChildWalletResponse[]>([]);
  const [messages, setMessages] = useState<GroupMessageResponse[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedMessageTimeId, setSelectedMessageTimeId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingMemberNames, setTypingMemberNames] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // File / Image Attachment State
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox Modal View Full Image State
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Modal Create Child Wallet State
  const [isChildWalletModalOpen, setIsChildWalletModalOpen] = useState(false);
  const [childWalletMode, setChildWalletMode] = useState<'MODE_1' | 'MODE_2'>('MODE_2'); // MODE_1 = Thành viên hiện có, MODE_2 = Tạo tài khoản mới cho bé
  const [childWalletName, setChildWalletName] = useState('');
  const [childWalletBirth, setChildWalletBirth] = useState('');
  const [childWalletAllowance, setChildWalletAllowance] = useState('');
  const [childWalletInitialBalance, setChildWalletInitialBalance] = useState('');
  const [childUsername, setChildUsername] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childShareBalance, setChildShareBalance] = useState(true);
  const [isSubmittingChildWallet, setIsSubmittingChildWallet] = useState(false);

  // Spend Request (Xin tiền bố mẹ) State
  const [selectedWalletForRequests, setSelectedWalletForRequests] = useState<ChildWalletResponse | null>(null);
  const [spendRequests, setSpendRequests] = useState<SpendRequestItem[]>([]);
  const [isLoadingSpendRequests, setIsLoadingSpendRequests] = useState(false);
  const [isSpendRequestModalOpen, setIsSpendRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestCategoryId, setRequestCategoryId] = useState('');
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([]);
  const [isSubmittingSpendRequest, setIsSubmittingSpendRequest] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Modal Deposit Child Wallet State
  const [depositTargetWallet, setDepositTargetWallet] = useState<ChildWalletResponse | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Modal Create Group
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupType>('FAMILY');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Modal Add Expense
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Modal Add Member (GitHub-style user search autocomplete)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [memberRole, setMemberRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Modal Settle Up
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePayeeId, setSettlePayeeId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Group Invitations (Pending invitations sent to current user)
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitationResponse[]>([]);

  const loadPendingInvitations = async () => {
    try {
      const data = await groupApi.getPendingInvitations();
      setPendingInvitations(data);
    } catch {
      setPendingInvitations([]);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, groupName: string) => {
    try {
      await groupApi.acceptInvitation(invitationId);
      onNotify(`Đã đồng ý tham gia nhóm "${groupName}"!`);
      loadPendingInvitations();
      await loadGroups();
    } catch {
      onNotify('Xác nhận tham gia nhóm thất bại');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await groupApi.rejectInvitation(invitationId);
      onNotify('Đã từ chối lời mời');
      loadPendingInvitations();
    } catch {
      onNotify('Từ chối lời mời thất bại');
    }
  };

  // Load groups list
  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupApi.getGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch {
      onNotify('Không thể tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  };

  // Helper sort messages from oldest to newest (chronological order)
  const sortMessagesChronologically = (list: GroupMessageResponse[]) => {
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  // Fetch only messages (used for real-time polling)
  const refreshMessages = async (groupId: string) => {
    try {
      const messagesData = await groupApi.getMessages(groupId);
      setMessages(sortMessagesChronologically(messagesData));
    } catch {
      // silently ignore polling failure
    }
  };

  // Load selected group data
  const loadGroupDetails = async (group: GroupResponse) => {
    try {
      setLoadingDetails(true);
      const [membersData, expensesData, balancesData, settlementsData, walletsData, messagesData] = await Promise.all([
        groupApi.getMembers(group.id),
        groupApi.getExpenses(group.id),
        groupApi.getBalances(group.id),
        groupApi.getSettlements(group.id),
        group.groupType === 'FAMILY' ? groupApi.getChildWallets(group.id) : Promise.resolve([]),
        groupApi.getMessages(group.id),
      ]);
      setMembers(membersData);
      setExpenses(expensesData);
      setBalances(balancesData);
      setSettlements(settlementsData);
      setChildWallets(walletsData);
      setMessages(sortMessagesChronologically(messagesData));
    } catch {
      onNotify('Không thể tải chi tiết nhóm');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      onNotify('File vượt quá kích thước cho phép (tối đa 15MB)');
      return;
    }
    setSelectedAttachment(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setAttachmentPreviewUrl(url);
    } else {
      setAttachmentPreviewUrl(null);
    }
  };

  const handleClearAttachment = () => {
    setSelectedAttachment(null);
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachmentPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    const hasText = newMessageText.trim().length > 0;
    const hasFile = selectedAttachment !== null;
    if (!hasText && !hasFile) return;

    try {
      setIsSendingMessage(true);
      let attachmentsList = undefined;

      if (selectedAttachment) {
        setIsUploadingAttachment(true);
        const uploaded = await groupApi.uploadMessageAttachment(selectedGroup.id, selectedAttachment);
        attachmentsList = [uploaded];
      }

      const text = newMessageText.trim();
      setNewMessageText('');
      handleClearAttachment();
      groupApi.reportTyping(selectedGroup.id, false);

      const sent = await groupApi.sendMessage(selectedGroup.id, text, undefined, attachmentsList);
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch {
      onNotify('Không thể gửi tin nhắn hoặc tệp đính kèm');
    } finally {
      setIsSendingMessage(false);
      setIsUploadingAttachment(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadPendingInvitations();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup);
    }
  }, [selectedGroup?.id]);

  // Real-time polling for messages and typing status when viewing CHAT tab
  useEffect(() => {
    // Only poll when currently inside the CHAT tab
    if (!selectedGroup || activeTab !== 'CHAT') return;

    const interval = setInterval(async () => {
      // Refresh messages
      refreshMessages(selectedGroup.id);

      // Check typing status
      try {
        const userIds = await groupApi.getTypingUsers(selectedGroup.id);
        const names = userIds
          .filter((id) => id !== currentUser?.id)
          .map((id) => {
            const mem = members.find((m) => m.userId === id);
            return mem?.user?.fullName || mem?.user?.displayName || 'Ai đó';
          });
        setTypingMemberNames(names);
      } catch {
        // Ignore typing polling error
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedGroup?.id, activeTab, currentUser?.id, members]);

  // Auto-scroll chat to bottom when messages update or switching to CHAT tab
  useEffect(() => {
    if (activeTab === 'CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Mark latest unread messages as read
      if (selectedGroup && messages.length > 0 && currentUser?.id) {
        const unreadIds = messages
          .filter((m) => m.senderId !== currentUser.id && (!m.readByUserIds || !m.readByUserIds.includes(currentUser.id)))
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          groupApi.markMessagesAsRead(selectedGroup.id, unreadIds).catch(() => {});
        }
      }
    }
  }, [messages.length, activeTab, selectedGroup?.id, currentUser?.id]);

  // Handle Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      onNotify('Vui lòng nhập tên nhóm');
      return;
    }
    try {
      setIsSubmittingGroup(true);
      const created = await groupApi.createGroup({
        name: newGroupName.trim(),
        groupType: newGroupType,
        description: newGroupDesc.trim() || undefined,
        baseCurrency: 'VND',
      });
      onNotify(`Đã tạo nhóm "${created.name}" thành công!`);
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadGroups();
      setSelectedGroup(created);
    } catch {
      onNotify('Tạo nhóm thất bại, vui lòng thử lại');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Handle Create Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !expenseDesc.trim() || !expenseAmount) {
      onNotify('Vui lòng điền đủ thông tin khoản chi');
      return;
    }
    try {
      setIsSubmittingExpense(true);
      const amt = parseFloat(expenseAmount.replace(/[^0-9.]/g, ''));
      // Default: split equally among current members
      const splitAmt = members.length > 0 ? amt / members.length : amt;
      const splits = members.map((m) => ({
        userId: m.userId,
        amount: splitAmt,
      }));

      await groupApi.createExpense(selectedGroup.id, {
        description: expenseDesc.trim(),
        amount: amt,
        currency: 'VND',
        paidByUserId: selectedGroup.ownerId, // Current user / owner
        splitMethod: 'EQUAL',
        splits,
      });

      onNotify('Đã ghi nhận khoản chi chung thành công!');
      setIsExpenseModalOpen(false);
      setExpenseDesc('');
      setExpenseAmount('');
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Ghi nhận khoản chi thất bại');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Search users only when a valid email format is entered (to avoid exposing user list and typing leaks)
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  useEffect(() => {
    const trimmed = memberSearchQuery.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const results = await groupApi.searchUsers(trimmed);
        // Exclude members already in group
        const existingUserIds = new Set(members.map((m) => m.userId));
        setSearchResults(results.filter((u) => !existingUserIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, members]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!selectedUser) {
      onNotify('Vui lòng chọn một người dùng từ danh sách gợi ý');
      return;
    }
    try {
      setIsSubmittingMember(true);
      await groupApi.addMember(selectedGroup.id, {
        userId: selectedUser.id,
        role: memberRole,
      });
      onNotify(`Đã gửi lời mời tham gia nhóm tới ${selectedUser.fullName || selectedUser.username}!`);
      setIsMemberModalOpen(false);
      setSelectedUser(null);
      setMemberSearchQuery('');
      setSearchResults([]);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Thêm thành viên thất bại');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Handle Settle Up
  const handleSettleUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !settlePayeeId || !settleAmount) {
      onNotify('Vui lòng chọn người nhận và số tiền');
      return;
    }
    try {
      setIsSubmittingSettle(true);
      const amt = parseFloat(settleAmount.replace(/[^0-9.]/g, ''));
      await groupApi.createSettlement(selectedGroup.id, {
        payeeId: settlePayeeId,
        amount: amt,
        currency: 'VND',
      });
      onNotify('Đã tạo đề xuất thanh toán nợ!');
      setIsSettleModalOpen(false);
      setSettleAmount('');
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Tạo thanh toán nợ thất bại');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Handle Create Child Wallet
  const handleCreateChildWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !childWalletName.trim()) {
      onNotify('Vui lòng nhập tên bé');
      return;
    }
    if (childWalletMode === 'MODE_2') {
      if (!childUsername.trim() || !childPassword.trim()) {
        onNotify('Vui lòng nhập tên đăng nhập và mật khẩu cho bé');
        return;
      }
      if (childPassword.length < 6) {
        onNotify('Mật khẩu của bé phải từ 6 ký tự trở lên');
        return;
      }
    }

    try {
      setIsSubmittingChildWallet(true);
      const allowance = childWalletAllowance ? parseFloat(childWalletAllowance.replace(/[^0-9.]/g, '')) : 0;
      const initialBal = childWalletInitialBalance ? parseFloat(childWalletInitialBalance.replace(/[^0-9.]/g, '')) : 0;
      const dateOfBirth = childWalletBirth ? childWalletBirth : new Date().toISOString().split('T')[0];

      await groupApi.createChildWallet(selectedGroup.id, {
        childName: childWalletName.trim(),
        username: childWalletMode === 'MODE_2' ? childUsername.trim() : undefined,
        password: childWalletMode === 'MODE_2' ? childPassword.trim() : undefined,
        dateOfBirth,
        balance: initialBal,
        weeklyAllowance: allowance,
        privacyLevel: childShareBalance ? 'FULL_ACCESS' : 'PARENT_SUPERVISED',
      });

      onNotify(`Đã tạo ví cho bé "${childWalletName}" thành công!${childWalletMode === 'MODE_2' ? ` (Tài khoản: ${childUsername})` : ''}`);
      setIsChildWalletModalOpen(false);
      setChildWalletName('');
      setChildWalletBirth('');
      setChildWalletAllowance('');
      setChildWalletInitialBalance('');
      setChildUsername('');
      setChildPassword('');
      loadGroupDetails(selectedGroup);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tạo ví trẻ em thất bại';
      onNotify(msg);
    } finally {
      setIsSubmittingChildWallet(false);
    }
  };

  // Load and manage Spend Requests for a Child Wallet
  const handleOpenSpendRequests = async (wallet: ChildWalletResponse) => {
    setSelectedWalletForRequests(wallet);
    if (!selectedGroup) return;
    try {
      setIsLoadingSpendRequests(true);
      const [reqs, cats] = await Promise.all([
        groupApi.getSpendRequests(selectedGroup.id, wallet.id),
        groupApi.getCategories().catch(() => []),
      ]);
      setSpendRequests(reqs);
      setCategoriesList(cats || []);
    } catch {
      setSpendRequests([]);
    } finally {
      setIsLoadingSpendRequests(false);
    }
  };

  // Submit Xin tiền bố mẹ
  const handleCreateSpendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedWalletForRequests || !requestAmount || !requestDescription.trim()) {
      onNotify('Vui lòng điền đủ số tiền và lý do xin tiền');
      return;
    }
    const catId = requestCategoryId || categoriesList[0]?.id;
    if (!catId) {
      onNotify('Vui lòng chọn danh mục sử dụng');
      return;
    }

    try {
      setIsSubmittingSpendRequest(true);
      const amt = parseFloat(requestAmount.replace(/[^0-9.]/g, ''));
      await groupApi.createSpendRequest(selectedGroup.id, selectedWalletForRequests.id, {
        amount: amt,
        categoryId: catId,
        description: requestDescription.trim(),
      });
      onNotify('Đã gửi yêu cầu xin tiền tới bố mẹ!');
      setIsSpendRequestModalOpen(false);
      setRequestAmount('');
      setRequestDescription('');
      // Refresh requests
      handleOpenSpendRequests(selectedWalletForRequests);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Gửi yêu cầu xin tiền thất bại');
    } finally {
      setIsSubmittingSpendRequest(false);
    }
  };

  // Parent Approve Request
  const handleApproveSpendRequest = async (req: SpendRequestItem) => {
    if (!selectedGroup || !selectedWalletForRequests) return;
    try {
      await groupApi.approveSpendRequest(selectedGroup.id, selectedWalletForRequests.id, req.id, 'Bố mẹ đã phê duyệt');
      onNotify(`Đã duyệt yêu cầu ${(req.amount || 0).toLocaleString('vi-VN')} đ cho bé!`);
      handleOpenSpendRequests(selectedWalletForRequests);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Duyệt yêu cầu thất bại');
    }
  };

  // Parent Reject Request
  const handleRejectSpendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedWalletForRequests || !rejectingRequestId) return;
    try {
      await groupApi.rejectSpendRequest(
        selectedGroup.id,
        selectedWalletForRequests.id,
        rejectingRequestId,
        rejectionReason.trim() || 'Bố mẹ chưa đồng ý khoản này'
      );
      onNotify('Đã từ chối yêu cầu xin tiền');
      setRejectingRequestId(null);
      setRejectionReason('');
      handleOpenSpendRequests(selectedWalletForRequests);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Từ chối yêu cầu thất bại');
    }
  };

  // Handle Deposit Child Wallet
  const handleDepositChildWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !depositTargetWallet || !depositAmount) {
      onNotify('Vui lòng nhập số tiền nạp');
      return;
    }
    try {
      setIsSubmittingDeposit(true);
      const amt = parseFloat(depositAmount.replace(/[^0-9.]/g, ''));
      await groupApi.depositChildWallet(
        selectedGroup.id,
        depositTargetWallet.id,
        amt,
        depositNote.trim() || 'Nạp tiền vào ví',
        'allowance'
      );
      onNotify(`Đã nạp ${amt.toLocaleString('vi-VN')} đ vào ví bé ${depositTargetWallet.childName}!`);
      setDepositTargetWallet(null);
      setDepositAmount('');
      setDepositNote('');
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Nạp tiền vào ví thất bại');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Handle Delete Child Wallet
  const handleDeleteChildWallet = async (wallet: ChildWalletResponse) => {
    if (!selectedGroup) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ví của bé "${wallet.childName}" không?`)) {
      return;
    }
    try {
      await groupApi.deleteChildWallet(selectedGroup.id, wallet.id);
      onNotify(`Đã xóa ví của bé ${wallet.childName}`);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Xóa ví thất bại');
    }
  };

  // Member Edit State
  const [editingMember, setEditingMember] = useState<GroupMemberResponse | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isSubmittingEditMember, setIsSubmittingEditMember] = useState(false);

  // Handle Edit Member
  const handleUpdateMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !editingMember) return;
    try {
      setIsSubmittingEditMember(true);
      await groupApi.updateMember(selectedGroup.id, editingMember.userId, {
        role: editMemberRole,
      });
      onNotify('Đã cập nhật vai trò thành viên thành công!');
      setEditingMember(null);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Cập nhật vai trò thất bại');
    } finally {
      setIsSubmittingEditMember(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (mem: GroupMemberResponse) => {
    if (!selectedGroup) return;
    const name = mem.user?.fullName || mem.nickname || 'thành viên';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi nhóm không?`)) {
      return;
    }
    try {
      await groupApi.removeMember(selectedGroup.id, mem.userId);
      onNotify(`Đã xóa ${name} khỏi nhóm`);
      loadGroupDetails(selectedGroup);
    } catch {
      onNotify('Xóa thành viên thất bại');
    }
  };

  // Role Permissions
  const myMemberInfo = members.find((m) => m.userId === currentUser?.id);
  const myRole = myMemberInfo?.role || (selectedGroup?.ownerId === currentUser?.id ? 'OWNER' : selectedGroup?.myRole);
  const isLeader = myRole === 'OWNER' || myRole === 'ADMIN' || selectedGroup?.ownerId === currentUser?.id;

  return (
    <main className="group-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      {/* Pending Invitations Banner (Lời mời tham gia nhóm cần xác nhận) */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingInvitations.length}
              </span>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 m-0">
                Bạn có lời mời tham gia nhóm ({pendingInvitations.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-400">
              Vui lòng xác nhận để tham gia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/90 dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-sm grid place-items-center shrink-0">
                    <FinanceIcon name="users" size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate m-0">
                      {inv.groupName}
                    </h4>
                    <p className="text-[11px] text-[#718579] dark:text-slate-400 truncate m-0">
                      Từ: <strong>{inv.inviterName}</strong> • Vai trò: {inv.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={() => handleRejectInvitation(inv.id)}
                    className="h-7 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-[11px] font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAcceptInvitation(inv.id, inv.groupName)}
                    className="h-7 px-3 rounded-lg bg-[#07543f] text-[11px] font-bold text-white hover:bg-[#064232] transition shadow-2xs"
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left Groups Sidebar / Right Group Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Groups List */}
        <div className={`lg:col-span-3 flex flex-col gap-3 min-w-[260px] ${selectedGroup ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <h3 className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider m-0 whitespace-nowrap">
                Nhóm
              </h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-[#07543f] dark:text-emerald-400">
                {groups.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-7 px-2.5 rounded-lg bg-[#07543f] hover:bg-[#064232] text-[11px] font-bold text-white shadow-2xs transition flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <FinanceIcon name="plus" size={13} />
              <span>Tạo nhóm</span>
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-8 text-center text-xs text-[#718579]">
              Đang tải danh sách nhóm...
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-8 text-center flex flex-col items-center gap-3">
              <div className="size-12 rounded-full bg-emerald-50 text-[#07543f] grid place-items-center">
                <FinanceIcon name="users" size={24} />
              </div>
              <p className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                Bạn chưa tham gia nhóm nào
              </p>
              <p className="text-xs text-[#718579] dark:text-slate-400 m-0">
                Hãy tạo nhóm gia đình hoặc bạn bè để cùng chia tiền sinh hoạt
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 h-9 px-4 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition"
              >
                + Tạo nhóm đầu tiên
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((group) => {
                const meta = getGroupTypeLabel(group.groupType);
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`group-nav-item flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'is-selected bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-[#e5ede7] dark:border-slate-800 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="grid size-10 place-items-center rounded-xl shrink-0"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        <FinanceIcon name={meta.icon} size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 truncate m-0">
                          {group.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#718579] dark:text-slate-400">
                          <span>{meta.label}</span>
                          <span>·</span>
                          <span>{group.memberCount || 1} thành viên</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[12px] font-bold text-[#07543f] dark:text-emerald-400 block">
                        {(group.totalExpenses || 0).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[10px] text-[#84968c]">tổng chi</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Group Detail Panel (Spans 9 cols) */}
        <div className={`lg:col-span-9 flex flex-col gap-5 ${!selectedGroup ? 'hidden lg:flex' : 'flex'}`}>
          {selectedGroup ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
              {/* Group Banner Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#edf3ef] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Mobile Back Button to Groups List */}
                    <button
                      type="button"
                      onClick={() => setSelectedGroup(null)}
                      className="lg:hidden h-7 px-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-[#07543f] dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-gray-200"
                      title="Quay lại danh sách nhóm"
                    >
                      <span>← Danh sách</span>
                    </button>
                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-[#07543f] dark:text-emerald-400">
                      {getGroupTypeLabel(selectedGroup.groupType).label}
                    </span>
                    <h2 className="text-xl font-bold text-[#14261e] dark:text-slate-100 m-0">
                      {selectedGroup.name}
                    </h2>
                  </div>
                  {selectedGroup.description && (
                    <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 m-0">
                      {selectedGroup.description}
                    </p>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <FinanceIcon name="plus" size={14} />
                    <span>Thêm khoản chi</span>
                  </button>

                  {/* Chỉ Trưởng nhóm hoặc Quản trị viên mới thấy nút Mời thành viên */}
                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => setIsMemberModalOpen(true)}
                      className="h-9 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition flex items-center gap-1.5"
                    >
                      <FinanceIcon name="plus" size={13} />
                      <span>Mời thành viên</span>
                    </button>
                  )}

                  {selectedGroup.groupType !== 'FAMILY' && (
                    <button
                      type="button"
                      onClick={() => setIsSettleModalOpen(true)}
                      className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-xs font-bold text-[#07543f] dark:text-emerald-300 hover:bg-emerald-100 transition"
                    >
                      <span>Trả nợ nhóm</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex border-b border-[#edf3ef] dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'OVERVIEW'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="chart" size={15} />
                  <span>Tổng quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('EXPENSES')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'EXPENSES'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="receipt" size={15} />
                  <span>Khoản chi ({expenses.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('CHAT')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'CHAT'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="message-square" size={15} />
                  <span>Trò chuyện</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MEMBERS')}
                  className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'MEMBERS'
                      ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FinanceIcon name="users" size={15} />
                  <span>Thành viên ({members.length})</span>
                </button>
                {selectedGroup.groupType === 'FAMILY' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('CHILD_WALLETS')}
                    className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'CHILD_WALLETS'
                        ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <FinanceIcon name="wallet" size={15} />
                    <span>Ví trẻ em ({childWallets.length})</span>
                  </button>
                )}
                {selectedGroup.groupType !== 'FAMILY' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('BALANCES')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'BALANCES'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="refresh" size={15} />
                      <span>Tính nợ ai nợ ai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('SETTLEMENTS')}
                      className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'SETTLEMENTS'
                          ? 'border-[#07543f] text-[#07543f] dark:text-emerald-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FinanceIcon name="clock" size={15} />
                      <span>Lịch sử trả nợ ({settlements.length})</span>
                    </button>
                  </>
                )}
              </div>

              {/* Loading Details State */}
              {loadingDetails ? (
                <div className="p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850">
                  Đang tải thông tin nhóm...
                </div>
              ) : (
                <>
                  {/* Tab 0: Tổng quan (Overview) */}
                  {activeTab === 'OVERVIEW' && (
                    <div className="flex flex-col gap-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-850 p-4 border border-emerald-100 dark:border-emerald-800/60 shadow-2xs">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Quỹ chung nhóm
                          </span>
                          <strong className="text-lg font-bold text-[#07543f] dark:text-emerald-400 mt-1 block">
                            {/* Quỹ chung của nhóm */}
                            {((selectedGroup.totalExpenses || 0) > 0 ? (selectedGroup.totalExpenses || 0) : 0).toLocaleString('vi-VN')} đ
                          </strong>
                          <span className="text-[10px] text-[#718579] dark:text-slate-500 mt-0.5 block">
                            Ngân sách theo dõi
                          </span>
                        </div>

                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800 shadow-2xs">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Tổng chi tiêu đã chi
                          </span>
                          <strong className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                            {(balances?.totalGroupExpenses || selectedGroup.totalExpenses || 0).toLocaleString('vi-VN')} đ
                          </strong>
                          <span className="text-[10px] text-[#718579] dark:text-slate-500 mt-0.5 block">
                            {expenses.length} khoản chi
                          </span>
                        </div>

                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800 shadow-2xs">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Thành viên
                          </span>
                          <strong className="text-lg font-bold text-[#14261e] dark:text-slate-100 mt-1 block">
                            {members.length} người
                          </strong>
                          <span className="text-[10px] text-[#718579] dark:text-slate-500 mt-0.5 block">
                            Đang hoạt động
                          </span>
                        </div>

                        {selectedGroup.groupType === 'FAMILY' ? (
                          <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800 shadow-2xs">
                            <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                              Ví trẻ em ({childWallets.length})
                            </span>
                            <strong className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                              {childWallets.reduce((acc, cw) => acc + (cw.balance || 0), 0).toLocaleString('vi-VN')} đ
                            </strong>
                            <span className="text-[10px] text-[#718579] dark:text-slate-500 mt-0.5 block">
                              Tổng quỹ các bé
                            </span>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800 shadow-2xs">
                            <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                              Trạng thái nợ
                            </span>
                            <strong className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                              {balances?.isFullySettled ? 'Sòng phẳng' : 'Có công nợ'}
                            </strong>
                            <span className="text-[10px] text-[#718579] dark:text-slate-500 mt-0.5 block">
                              {balances?.simplifiedDebts?.length || 0} khoản bù trừ
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Overview Sub-sections: Thành viên gia đình & Khoản chi gần đây */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Box 1: Danh sách thành viên trong nhóm / gia đình */}
                        <div className="rounded-2xl border border-[#edf3ee] dark:border-slate-800 p-4 bg-white dark:bg-slate-850 flex flex-col gap-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 uppercase tracking-wider m-0 flex items-center gap-1.5">
                              <FinanceIcon name="users" size={14} />
                              <span>Thành viên ({members.length})</span>
                            </h4>
                            {isLeader && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('MEMBERS')}
                                className="text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:underline"
                              >
                                Quản lý
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {members.slice(0, 5).map((mem) => {
                              const isOwner = mem.role === 'OWNER';
                              const isMe = currentUser?.id === mem.userId;
                              const memberAvatar = isMe ? (currentUser?.avatarUrl || mem.user?.avatarUrl || mem.user?.avatarKey) : (mem.user?.avatarUrl || mem.user?.avatarKey);
                              const resolvedMemberAvatar = memberAvatar ? userApi.getAvatarUrl(memberAvatar) : null;

                              return (
                                <div
                                  key={mem.userId || mem.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#f7faf8] dark:bg-slate-800 border border-[#eef4f0] dark:border-slate-700/60"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-slate-700 text-[#07543f] dark:text-emerald-300 font-bold text-xs overflow-hidden grid place-items-center shrink-0 border border-black/5">
                                      {resolvedMemberAvatar ? (
                                        <img
                                          src={resolvedMemberAvatar}
                                          alt={mem.user?.fullName || 'Avatar'}
                                          className="size-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        mem.user?.fullName?.charAt(0) || 'U'
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#14261e] dark:text-slate-200 truncate m-0">
                                        {mem.user?.fullName || mem.nickname || 'Thành viên'}
                                        {isMe && <span className="text-[10px] text-emerald-600 font-bold ml-1">(Bạn)</span>}
                                      </p>
                                      <span className="text-[10px] text-[#718579] dark:text-slate-400 truncate block">
                                        {mem.user?.email}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                      isOwner
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : mem.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {isOwner ? 'Trưởng nhóm' : mem.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Box 2: Khoản chi gần nhất */}
                        <div className="rounded-2xl border border-[#edf3ee] dark:border-slate-800 p-4 bg-white dark:bg-slate-850 flex flex-col gap-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 uppercase tracking-wider m-0 flex items-center gap-1.5">
                              <FinanceIcon name="receipt" size={14} />
                              <span>Khoản chi gần đây</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setActiveTab('EXPENSES')}
                              className="text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:underline"
                            >
                              Xem tất cả ({expenses.length})
                            </button>
                          </div>

                          {expenses.length === 0 ? (
                            <p className="text-xs text-[#718579] dark:text-slate-400 py-6 text-center m-0">
                              Chưa có khoản chi tiêu nào trong nhóm
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {expenses.slice(0, 5).map((exp) => (
                                <div
                                  key={exp.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#f7faf8] dark:bg-slate-800 border border-[#eef4f0] dark:border-slate-700/60"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-[#14261e] dark:text-slate-200 truncate m-0">
                                      {exp.description}
                                    </p>
                                    <span className="text-[11px] text-[#718579] dark:text-slate-400 block mt-0.5">
                                      {exp.payer?.fullName || 'Thành viên'} · {exp.expenseDate}
                                    </span>
                                  </div>
                                  <strong className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                    -{exp.amount.toLocaleString('vi-VN')} đ
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Box 3 (Nếu là nhóm du lịch/phòng trọ thì hiện thêm công nợ cần thanh toán): */}
                      {selectedGroup.groupType !== 'FAMILY' && balances?.simplifiedDebts && balances.simplifiedDebts.length > 0 && (
                        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-4 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#07543f] dark:text-emerald-300 uppercase tracking-wider m-0">
                              Bù trừ công nợ cần thanh toán
                            </h4>
                            <button
                              type="button"
                              onClick={() => setActiveTab('BALANCES')}
                              className="text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:underline"
                            >
                              Chi tiết nợ
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {balances.simplifiedDebts.slice(0, 4).map((debt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-emerald-100 dark:border-emerald-800/60 shadow-2xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-bold text-[#14261e] dark:text-slate-200 truncate m-0">
                                    {debt.fromUser?.fullName || 'Người nợ'} → {debt.toUser?.fullName || 'Người nhận'}
                                  </p>
                                  <span className="text-[10px] text-[#718579] dark:text-slate-400">
                                    Cần trả
                                  </span>
                                </div>
                                <strong className="text-xs font-bold text-[#07543f] dark:text-emerald-400 shrink-0">
                                  {debt.amount.toLocaleString('vi-VN')} đ
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Trò chuyện (Chat nhóm) */}
                  {activeTab === 'CHAT' && (() => {
                    // Precompute last seen message ID for each member (other than currentUser)
                    const lastSeenMap: Record<string, string> = {};
                    if (currentUser?.id) {
                      members.forEach((m) => {
                        if (m.userId === currentUser.id) return;
                        // Find latest message read by this member
                        for (let i = messages.length - 1; i >= 0; i--) {
                          const msg = messages[i];
                          if (msg.readByUserIds && msg.readByUserIds.includes(m.userId)) {
                            lastSeenMap[m.userId] = msg.id;
                            break;
                          }
                        }
                      });
                    }

                    return (
                    <div className="flex flex-col rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#f9fbf9] dark:bg-slate-850 h-[480px]">
                      {/* Chat messages stream */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                        {messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#718579] dark:text-slate-400">
                            <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-400 grid place-items-center mb-2">
                              <FinanceIcon name="file-text" size={20} />
                            </div>
                            <p className="font-bold text-sm text-[#14261e] dark:text-slate-200 m-0">
                              Chưa có tin nhắn nào
                            </p>
                            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 m-0">
                              Hãy gửi tin nhắn đầu tiên để cùng thảo luận chi tiêu và thanh toán!
                            </p>
                          </div>
                        ) : (
                          messages.map((msg, index) => {
                            const isMe = currentUser?.id && msg.senderId === currentUser.id;
                            const senderName = msg.sender?.fullName || msg.sender?.displayName || (isMe ? 'Bạn' : 'Thành viên');
                            const timeStr = msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : '';

                            // Date & time divider calculation (Messenger style)
                            // If first message or diff from previous message >= 10 minutes, show timestamp separator
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const prevDiffMins = prevMessage
                              ? (new Date(msg.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) / 60000
                              : 999;
                            const showMessengerDivider = !prevMessage || prevDiffMins >= 10;
                            const messengerDividerText = showMessengerDivider && msg.createdAt
                              ? formatMessengerDateDivider(msg.createdAt)
                              : '';

                            // Grouping consecutive messages logic (Messenger style)
                            // A group breaks if sender changes, or time gap >= 10 minutes
                            const isFirstInBlock =
                              !prevMessage ||
                              prevMessage.senderId !== msg.senderId ||
                              showMessengerDivider ||
                              prevDiffMins >= 10;

                            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                            const nextDiffMins = nextMessage
                              ? (new Date(nextMessage.createdAt).getTime() - new Date(msg.createdAt).getTime()) / 60000
                              : 999;
                            const isLastInBlock =
                              !nextMessage ||
                              nextMessage.senderId !== msg.senderId ||
                              nextDiffMins >= 10;

                            // Find members who have seen this message as their latest
                            const seenByMembers = members.filter((m) => lastSeenMap[m.userId] === msg.id);

                            // Find member profile to get avatar
                            const senderMember = members.find((m) => m.userId === msg.senderId);
                            const rawAvatarUrl = isMe ? currentUser?.avatarUrl : (senderMember?.user?.avatarUrl || msg.sender?.avatarKey);
                            const resolvedAvatarUrl = rawAvatarUrl ? userApi.getAvatarUrl(rawAvatarUrl) : null;
                            const avatarInitial = (senderName || 'U').charAt(0).toUpperCase();

                            // Corner radius styling like Messenger
                            const roundedClasses = isMe
                              ? isFirstInBlock && isLastInBlock
                                ? 'rounded-2xl rounded-tr-sm'
                                : isFirstInBlock
                                ? 'rounded-2xl rounded-br-sm rounded-tr-sm'
                                : isLastInBlock
                                ? 'rounded-2xl rounded-tr-sm rounded-br-2xl'
                                : 'rounded-2xl rounded-tr-sm rounded-br-sm'
                              : isFirstInBlock && isLastInBlock
                              ? 'rounded-2xl rounded-tl-sm'
                              : isFirstInBlock
                              ? 'rounded-2xl rounded-bl-sm rounded-tl-sm'
                              : isLastInBlock
                              ? 'rounded-2xl rounded-tl-sm rounded-bl-2xl'
                              : 'rounded-2xl rounded-tl-sm rounded-bl-sm';

                            return (
                              <div key={msg.id} className={`flex flex-col ${isLastInBlock ? 'mb-2' : 'mb-0.5'}`}>
                                {/* Messenger-style Divider Header (e.g. "08:29 T3", "14:15 Hôm qua", "16:00") */}
                                {showMessengerDivider && messengerDividerText && (
                                  <div className="flex items-center justify-center my-3">
                                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 select-none">
                                      {messengerDividerText}
                                    </span>
                                  </div>
                                )}

                                {/* Message Row */}
                                <div
                                  className={`flex items-end gap-2 max-w-[85%] ${
                                    isMe ? 'self-end flex-row-reverse' : 'self-start'
                                  }`}
                                >
                                  {/* Avatar placeholder / icon: Only show on the LAST message of consecutive group */}
                                  <div className="size-8 shrink-0 flex items-center justify-center">
                                    {isLastInBlock ? (
                                      <div
                                        className={`size-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shadow-2xs ${
                                          isMe
                                            ? 'bg-[#07543f] text-white'
                                            : 'bg-emerald-100 dark:bg-slate-750 text-[#07543f] dark:text-emerald-300 border border-emerald-200 dark:border-slate-700'
                                        }`}
                                        title={senderName}
                                      >
                                        {resolvedAvatarUrl ? (
                                          <img
                                            src={resolvedAvatarUrl}
                                            alt={senderName}
                                            className="size-full object-cover"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          avatarInitial
                                        )}
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Bubble & Click to see time */}
                                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                                    {/* Sender name on FIRST message of the group block */}
                                    {isFirstInBlock && (
                                      <span className="text-[10px] font-bold text-[#647c6e] dark:text-slate-400 mb-1 px-1">
                                        {senderName}
                                      </span>
                                    )}

                                    <div
                                      onClick={() => setSelectedMessageTimeId(prev => prev === msg.id ? null : msg.id)}
                                      className={`cursor-pointer px-3.5 py-2 text-xs leading-relaxed break-words shadow-2xs select-text transition hover:opacity-95 ${roundedClasses} ${
                                        isMe
                                          ? 'bg-[#07543f] text-white'
                                          : 'bg-white dark:bg-slate-800 text-[#14261e] dark:text-slate-100 border border-[#e6eee8] dark:border-slate-700'
                                      }`}
                                      title="Bấm để xem thời gian gửi"
                                    >
                                      {/* Attachment Display */}
                                      {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-col gap-2 mb-2">
                                          {msg.attachments.map((att, attIdx) => {
                                            const fileUrl = att.fileKey ? userApi.getAvatarUrl(att.fileKey) : '';
                                            const isImg = att.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.fileName || '');

                                            if (isImg) {
                                              return (
                                                <div
                                                  key={attIdx}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLightboxImageUrl(fileUrl);
                                                  }}
                                                  className="block overflow-hidden rounded-xl border border-black/10 max-w-[240px] hover:opacity-90 transition cursor-zoom-in group relative"
                                                  title="Bấm để phóng to ảnh"
                                                >
                                                  <img
                                                    src={fileUrl}
                                                    alt={att.fileName || 'Attached Image'}
                                                    className="w-full max-h-56 object-cover rounded-xl"
                                                  />
                                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                                                    🔍 Xem ảnh lớn
                                                  </div>
                                                </div>
                                              );
                                            }

                                            return (
                                              <a
                                                key={attIdx}
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
                                                  isMe ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-200'
                                                } transition`}
                                              >
                                                <FinanceIcon name="paperclip" size={14} />
                                                <span className="truncate max-w-[180px]">{att.fileName || 'Tệp đính kèm'}</span>
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {/* Only show content if it's not the auto image caption */}
                                      {msg.content && msg.content !== 'Đã gửi một ảnh' && (
                                        <p className="m-0 leading-relaxed">{msg.content}</p>
                                      )}
                                    </div>

                                    {/* Timestamp: Shown ONLY when this message is clicked */}
                                    {selectedMessageTimeId === msg.id && (
                                      <span className="text-[9px] text-[#8fa397] dark:text-slate-500 mt-1 px-1 animate-fadeIn">
                                        {timeStr}
                                      </span>
                                    )}

                                    {/* Seen status / Read receipts (Messenger style mini avatars) */}
                                    {seenByMembers.length > 0 && (
                                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
                                        <span className="text-[9px] text-gray-400">Đã xem:</span>
                                        <div className="flex -space-x-1.5 items-center">
                                          {seenByMembers.map((sm) => {
                                            const smName = sm.user?.fullName || sm.user?.email || 'Thành viên';
                                            const smAvatar = sm.user?.avatarUrl ? userApi.getAvatarUrl(sm.user.avatarUrl) : null;
                                            return (
                                              <div
                                                key={sm.userId}
                                                className="size-4 rounded-full border border-white dark:border-slate-850 overflow-hidden bg-emerald-200 text-[#07543f] text-[8px] font-bold flex items-center justify-center shadow-xs"
                                                title={`${smName} đã xem`}
                                              >
                                                {smAvatar ? (
                                                  <img src={smAvatar} alt={smName} className="size-full object-cover" />
                                                ) : (
                                                  smName.charAt(0).toUpperCase()
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Typing indicator (Ai đó đang soạn tin nhắn...) */}
                      {typingMemberNames.length > 0 && (
                        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-[#718579] dark:text-slate-400 animate-fadeIn">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 ml-1">
                              {typingMemberNames.length === 1
                                ? `${typingMemberNames[0]} đang soạn tin nhắn...`
                                : `${typingMemberNames.join(', ')} đang soạn tin nhắn...`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Hidden File / Image inputs */}
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                      />

                      {/* Attachment Preview Banner */}
                      {selectedAttachment && (
                        <div className="mx-3 mb-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {attachmentPreviewUrl ? (
                              <img
                                src={attachmentPreviewUrl}
                                alt="Preview"
                                className="size-10 rounded-lg object-cover border border-emerald-300 dark:border-emerald-700"
                              />
                            ) : (
                              <div className="size-10 rounded-lg bg-emerald-100 text-[#07543f] grid place-items-center">
                                <FinanceIcon name="paperclip" size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate m-0">
                                {selectedAttachment.name}
                              </p>
                              <span className="text-[10px] text-[#718579] dark:text-slate-400">
                                {(selectedAttachment.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearAttachment}
                            className="size-7 rounded-lg hover:bg-emerald-200/60 text-emerald-800 dark:text-emerald-300 grid place-items-center transition"
                            title="Xóa tệp đính kèm"
                          >
                            <FinanceIcon name="close" size={14} />
                          </button>
                        </div>
                      )}

                      {/* Chat input form */}
                      <form
                        onSubmit={handleSendMessage}
                        className="relative p-3 border-t border-[#edf3ee] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl flex items-center gap-2"
                      >
                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                          <div className="absolute bottom-14 left-3 z-30 p-2.5 rounded-2xl bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 shadow-xl max-w-[280px]">
                            <div className="text-[10px] font-bold text-gray-500 mb-1.5 px-1">Biểu cảm nhanh</div>
                            <div className="grid grid-cols-6 gap-1.5 text-lg">
                              {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥', '✨', '💸', '💰', '🍔', '☕', '👶', '🙏', '💯', '👌'].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setNewMessageText((prev) => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-750 flex items-center justify-center transition text-base"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attach Image Button */}
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          title="Gửi hình ảnh"
                          className="size-10 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 text-gray-500 hover:text-[#07543f] dark:text-slate-400 grid place-items-center transition shrink-0"
                        >
                          <FinanceIcon name="image" size={17} />
                        </button>

                        {/* Attach Document / File Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Đính kèm tệp"
                          className="size-10 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 text-gray-500 hover:text-[#07543f] dark:text-slate-400 grid place-items-center transition shrink-0"
                        >
                          <FinanceIcon name="paperclip" size={17} />
                        </button>

                        {/* Emoji Button (Messenger Style) */}
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                          title="Chèn biểu tượng cảm xúc"
                          className={`size-10 rounded-xl border transition grid place-items-center shrink-0 text-base ${
                            showEmojiPicker
                              ? 'border-emerald-500 bg-emerald-50 text-[#07543f]'
                              : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 text-gray-500 hover:text-[#07543f]'
                          }`}
                        >
                          😊
                        </button>

                        <textarea
                          rows={1}
                          value={newMessageText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewMessageText(val);

                            // Auto adjust height according to content length
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

                            if (selectedGroup) {
                              groupApi.reportTyping(selectedGroup.id, val.trim().length > 0);
                              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                              typingTimeoutRef.current = setTimeout(() => {
                                groupApi.reportTyping(selectedGroup.id, false);
                              }, 3000);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (newMessageText.trim() || selectedAttachment) {
                                (e.target as HTMLTextAreaElement).form?.requestSubmit();
                                (e.target as HTMLTextAreaElement).style.height = 'auto';
                              }
                            }
                          }}
                          placeholder={selectedAttachment ? 'Nhập lời nhắn cho tệp đính kèm...' : 'Nhập tin nhắn cho cả nhóm... (Shift + Enter để xuống dòng)'}
                          className="flex-1 min-h-[40px] max-h-[120px] py-2 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-[#f7faf8] dark:bg-slate-800 text-xs text-[#14261e] dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:border-[#07543f] resize-none leading-relaxed transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || (!newMessageText.trim() && !selectedAttachment)}
                          className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs shrink-0"
                        >
                          <FinanceIcon name="arrow" size={14} />
                          <span>{isUploadingAttachment ? 'Đang tải...' : 'Gửi'}</span>
                        </button>
                      </form>
                    </div>
                    );
                  })()}

                  {/* Tab 1: Chi tiêu chung */}
                  {activeTab === 'EXPENSES' && (
                <div className="flex flex-col gap-3">
                  {expenses.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850 border border-dashed border-[#d8e3dc]">
                      Chưa có khoản chi tiêu chung nào trong nhóm này.
                    </div>
                  ) : (
                    expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between p-4 rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-850 hover:bg-[#f6f9f7] transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="size-10 rounded-xl bg-emerald-50 text-[#07543f] grid place-items-center shrink-0">
                            <FinanceIcon name="receipt" size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                              {exp.description}
                            </h4>
                            <p className="text-xs text-[#718579] dark:text-slate-400 mt-0.5 m-0">
                              Người trả: {exp.payer?.fullName || 'Thành viên'} · {exp.expenseDate}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <strong className="text-sm font-bold text-rose-600 block">
                            -{exp.amount.toLocaleString('vi-VN')} đ
                          </strong>
                          <span className="text-[10px] text-gray-400">
                            Chia: {exp.splitMethod === 'EQUAL' ? 'Đều nhau' : exp.splitMethod}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Cân bằng công nợ chéo */}
              {activeTab === 'BALANCES' && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                    Kế hoạch thanh toán tối ưu (Simplified Debts)
                  </h4>
                  {balances?.simplifiedDebts && balances.simplifiedDebts.length > 0 ? (
                    balances.simplifiedDebts.map((debt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="size-8 rounded-full bg-[#07543f] text-white font-bold text-xs grid place-items-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs text-[#14261e] dark:text-slate-100 font-bold m-0">
                              {debt.fromUser?.fullName || 'Người nợ'} cần trả cho {debt.toUser?.fullName || 'Người nhận'}
                            </p>
                            <span className="text-[11px] text-[#718579]">Thanh toán để xóa nợ nhóm</span>
                          </div>
                        </div>

                        <strong className="text-base font-bold text-[#07543f] dark:text-emerald-400">
                          {debt.amount.toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850 border border-dashed border-[#d8e3dc]">
                      Không có ai nợ ai. Toàn bộ chi phí nhóm đã được thanh toán cân bằng!
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Lịch sử thanh toán nợ */}
              {activeTab === 'SETTLEMENTS' && (
                <div className="flex flex-col gap-3">
                  {settlements.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850 border border-dashed border-[#d8e3dc]">
                      Chưa có giao dịch trả nợ nào được thực hiện.
                    </div>
                  ) : (
                    settlements.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-4 rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-850"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                            {st.payer?.fullName || 'Người trả'} → {st.payee?.fullName || 'Người nhận'}
                          </p>
                          <span className="text-xs text-[#718579] mt-0.5 block">{st.settlementDate}</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-sm font-bold text-emerald-600 block">
                            +{st.amount.toLocaleString('vi-VN')} đ
                          </strong>
                          <span className="text-[10px] font-bold uppercase text-[#07543f]">
                            {st.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Thành viên */}
              {activeTab === 'MEMBERS' && (
                <div className="flex flex-col gap-4">
                  {/* Action Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                        Danh sách thành viên ({members.length})
                      </h4>
                      <p className="text-xs text-[#718579] dark:text-slate-400 m-0 mt-0.5">
                        Quản lý quyền hạn và thành viên trong nhóm
                      </p>
                    </div>
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => setIsMemberModalOpen(true)}
                        className="h-8 px-3.5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <FinanceIcon name="plus" size={14} />
                        <span>Thêm thành viên</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map((mem) => {
                      const isOwner = mem.role === 'OWNER';
                      const isMe = currentUser?.id === mem.userId;
                      const memberAvatar = isMe ? (currentUser?.avatarUrl || mem.user?.avatarUrl || mem.user?.avatarKey) : (mem.user?.avatarUrl || mem.user?.avatarKey);
                      const resolvedMemberAvatar = memberAvatar ? userApi.getAvatarUrl(memberAvatar) : null;

                      return (
                        <div
                          key={mem.userId || mem.id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-850 shadow-2xs hover:border-emerald-200 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-11 rounded-full bg-emerald-100 dark:bg-slate-800 text-[#07543f] dark:text-emerald-400 font-bold text-sm overflow-hidden grid place-items-center shrink-0 border border-black/5 shadow-2xs">
                              {resolvedMemberAvatar ? (
                                <img
                                  src={resolvedMemberAvatar}
                                  alt={mem.user?.fullName || 'Avatar'}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                mem.user?.fullName?.charAt(0) || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 truncate m-0">
                                  {mem.user?.fullName || mem.nickname || 'Thành viên'}
                                </h4>
                                {isMe && (
                                  <span className="text-[10px] text-emerald-600 font-bold">(Bạn)</span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#718579] dark:text-slate-400 truncate block">
                                {mem.user?.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isOwner
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : mem.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                              }`}
                            >
                              {mem.role}
                            </span>

                            {/* Edit Role Button (for non-owners, only if current user is leader) */}
                            {isLeader && !isOwner && !isMe && (
                              <button
                                type="button"
                                title="Sửa vai trò"
                                onClick={() => {
                                  setEditingMember(mem);
                                  setEditMemberRole((mem.role as 'MEMBER' | 'ADMIN') || 'MEMBER');
                                }}
                                className="size-8 rounded-lg border border-gray-200 dark:border-slate-700 grid place-items-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                              >
                                <FinanceIcon name="edit" size={13} />
                              </button>
                            )}

                            {/* Delete Member Button (for non-owners, only if current user is leader) */}
                            {isLeader && !isOwner && !isMe && (
                              <button
                                type="button"
                                title="Xóa khỏi nhóm"
                                onClick={() => handleRemoveMember(mem)}
                                className="size-8 rounded-lg border border-rose-200 dark:border-rose-900/60 grid place-items-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              >
                                <FinanceIcon name="delete" size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 5: Ví trẻ em (Family Group) */}
              {activeTab === 'CHILD_WALLETS' && (
                <div className="flex flex-col gap-4">
                  {/* Action Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                        Quản lý ví trẻ em ({childWallets.length})
                      </h4>
                      <p className="text-xs text-[#718579] dark:text-slate-400 m-0 mt-0.5">
                        Theo dõi tài chính con trẻ, cấp tiền tiêu vặt và hướng dẫn tiết kiệm
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChildWalletModalOpen(true)}
                      className="h-8 px-3.5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <FinanceIcon name="plus" size={14} />
                      <span>Thêm ví cho bé</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {childWallets.length === 0 ? (
                      <div className="col-span-2 p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850 border border-dashed border-[#d8e3dc] flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-emerald-50 text-[#07543f] grid place-items-center">
                          <FinanceIcon name="wallet" size={20} />
                        </div>
                        <p className="font-bold text-[#14261e] dark:text-slate-200 m-0">
                          Chưa có ví trẻ em nào trong gia đình này
                        </p>
                        <p className="m-0 text-gray-500">
                          Tạo ví để cấp tiền tiêu vặt cho con và phân công việc nhà nhận thưởng.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsChildWalletModalOpen(true)}
                          className="mt-2 h-8 px-4 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition"
                        >
                          + Tạo ví cho bé
                        </button>
                      </div>
                    ) : (
                      childWallets.map((cw) => (
                        <div
                          key={cw.id}
                          className="p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-850 flex flex-col gap-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 font-bold text-sm grid place-items-center">
                                👶
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                                  {cw.childName}
                                </h4>
                                <span className="text-[11px] text-[#718579]">{cw.age ? `${cw.age} tuổi` : 'Ví trẻ em'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteChildWallet(cw)}
                              title="Xóa ví"
                              className="size-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 grid place-items-center transition"
                            >
                              <FinanceIcon name="delete" size={13} />
                            </button>
                          </div>

                          <div>
                            <span className="text-[11px] text-[#718579] block">Số dư hiện tại</span>
                            <strong className="text-2xl font-bold text-[#07543f] dark:text-emerald-400 mt-0.5 block">
                              {(cw.balance || 0).toLocaleString('vi-VN')} đ
                            </strong>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#edf3ee] dark:border-slate-800 pt-3 text-xs text-[#718579]">
                            <span>Tiền tiêu vặt tuần:</span>
                            <span className="font-bold text-[#14261e] dark:text-slate-200">
                              {(cw.weeklyAllowance || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          {/* Action Buttons: Nạp tiền & Xem / Xin tiền */}
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDepositTargetWallet(cw);
                                setDepositAmount('');
                                setDepositNote('');
                              }}
                              className="h-8 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <FinanceIcon name="plus" size={13} />
                              <span>Nạp tiền</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSpendRequests(cw)}
                              className="h-8 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-750 transition flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <FinanceIcon name="receipt" size={13} />
                              <span>Yêu cầu xin tiền</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-12 text-center text-xs text-[#718579]">
              Chọn một nhóm ở danh sách bên trái để xem chi tiết chi tiêu và chia tiền.
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create Group Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Tạo nhóm chi tiêu mới
            </h3>
            <p className="text-xs text-[#718579] mt-1 mb-4">
              Dành cho gia đình, bạn bè đi du lịch, phòng trọ chia hóa đơn...
            </p>

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Tên nhóm *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Gia đình Hạnh Phúc, Chuyến đi Đà Lạt..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Loại nhóm
                </label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value as GroupType)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="FAMILY">Gia đình (hỗ trợ ví con cái, việc nhà)</option>
                  <option value="ROOMMATE">Bạn cùng phòng trọ (chia tiền điện nước, nhà)</option>
                  <option value="TRAVEL">Chuyến đi du lịch / Dã ngoại</option>
                  <option value="PROJECT">Dự án / Quỹ chung</option>
                  <option value="COUPLE">Cặp đôi</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Mô tả mục đích nhóm..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition"
                >
                  {isSubmittingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Expense Modal */}
      {isExpenseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsExpenseModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Ghi nhận khoản chi chung
            </h3>
            <p className="text-xs text-[#718579] mt-1 mb-4">
              Khoản chi sẽ tự động được chia đều cho tất cả các thành viên trong nhóm.
            </p>

            <form onSubmit={handleCreateExpense} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Nội dung chi *
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="VD: Bữa tối BBQ, Mua đồ siêu thị, Tiền điện..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Số tiền (VNĐ) *
                </label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="VD: 500000"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition"
                >
                  {isSubmittingExpense ? 'Đang lưu...' : 'Lưu khoản chi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Member Modal (GitHub-style live search) */}
      {isMemberModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => {
            setIsMemberModalOpen(false);
            setSelectedUser(null);
            setMemberSearchQuery('');
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                Gửi lời mời tham gia nhóm
              </h3>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#718579] mt-0 mb-4">
              Người được mời sẽ nhận được thông báo trong hệ thống và chỉ chính thức vào nhóm sau khi họ bấm xác nhận Đồng ý.
            </p>

            <form onSubmit={handleAddMember} className="flex flex-col gap-4">
              {/* Selected User Badge */}
              {selectedUser ? (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-[#07543f] text-white font-bold text-sm grid place-items-center">
                      {selectedUser.fullName?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 m-0">
                        {selectedUser.fullName || selectedUser.username}
                      </h4>
                      <p className="text-[11px] text-[#718579] m-0">
                        @{selectedUser.username} • {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setMemberSearchQuery('');
                    }}
                    className="text-xs font-semibold text-rose-500 hover:underline px-2 py-1"
                  >
                    Thay đổi
                  </button>
                </div>
              ) : (
                /* Search Input & Dropdown */
                <div className="relative">
                  <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                    Nhập chính xác Email người dùng *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="VD: user@example.com..."
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:border-[#07543f] focus:outline-none"
                      autoFocus
                    />
                    <div className="absolute left-3 top-3 text-gray-400">
                      <FinanceIcon name="search" size={16} />
                    </div>
                    {isSearchingUsers && (
                      <div className="absolute right-3 top-3 text-[11px] text-gray-400">
                        Đang tìm...
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-[#718579] dark:text-slate-400 mt-1.5 mb-0">
                    ℹ️ Để bảo mật thông tin cá nhân, hệ thống chỉ tìm kiếm khi bạn nhập đầy đủ định dạng email.
                  </p>

                  {/* Autocomplete Dropdown List */}
                  {isValidEmail(memberSearchQuery) && !selectedUser && (
                    <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[#edf3ee] dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xl divide-y divide-gray-100 dark:divide-slate-800">
                      {isSearchingUsers ? (
                        <div className="p-3 text-center text-xs text-gray-400">
                          Đang kiểm tra tài khoản email...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          Không tìm thấy người dùng với email này hoặc người dùng đã có trong nhóm.
                        </div>
                      ) : (
                        searchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setSearchResults([]);
                            }}
                            className="w-full p-2.5 flex items-center gap-3 hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 text-left transition cursor-pointer"
                          >
                            <div className="size-9 rounded-full bg-emerald-100 dark:bg-slate-800 text-[#07543f] dark:text-emerald-400 font-bold text-xs grid place-items-center shrink-0">
                              {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate m-0">
                                {u.fullName || u.username}
                              </p>
                              <p className="text-[11px] text-[#718579] truncate m-0">
                                {u.email}
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold text-[#07543f] shrink-0">
                              Chọn người này
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Vai trò trong nhóm
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as 'MEMBER' | 'ADMIN')}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="MEMBER">Thành viên (MEMBER)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMemberModalOpen(false);
                    setSelectedUser(null);
                    setMemberSearchQuery('');
                  }}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember || !selectedUser}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingMember ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Settle Up Modal */}
      {isSettleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsSettleModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Thanh toán nợ nhóm (Settle Up)
            </h3>
            <p className="text-xs text-[#718579] mt-1 mb-4">
              Ghi nhận bạn đã chuyển tiền trả nợ cho thành viên khác trong nhóm.
            </p>

            <form onSubmit={handleSettleUp} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Người nhận tiền *
                </label>
                <select
                  value={settlePayeeId}
                  onChange={(e) => setSettlePayeeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                >
                  <option value="">-- Chọn thành viên nhận tiền --</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.fullName || m.nickname || m.userId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Số tiền trả (VNĐ) *
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="VD: 250000"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition"
                >
                  {isSubmittingSettle ? 'Đang gửi...' : 'Xác nhận trả nợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Edit Member Role Modal */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setEditingMember(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Chỉnh sửa vai trò thành viên
            </h3>
            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 mb-4">
              Cập nhật quyền hạn cho <strong>{editingMember.user?.fullName || editingMember.nickname || 'thành viên'}</strong>
            </p>

            <form onSubmit={handleUpdateMemberRole} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Vai trò mới
                </label>
                <select
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value as 'MEMBER' | 'ADMIN')}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="MEMBER">Thành viên (MEMBER) - Ghi nhận chi tiêu và thanh toán</option>
                  <option value="ADMIN">Quản trị viên (ADMIN) - Quản lý thành viên và chi phí</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditMember}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition disabled:opacity-50"
                >
                  {isSubmittingEditMember ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Create Child Wallet Modal */}
      {isChildWalletModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsChildWalletModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">👶</span>
              <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                Tạo ví trẻ em
              </h3>
            </div>
            <p className="text-xs text-[#718579] dark:text-slate-400 mb-3">
              Quản lý tiền tiêu vặt và giáo dục tài chính sớm cho con.
            </p>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setChildWalletMode('MODE_2')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  childWalletMode === 'MODE_2'
                    ? 'bg-white dark:bg-slate-700 text-[#07543f] dark:text-emerald-300 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
                }`}
              >
                Tạo tài khoản đăng nhập cho bé
              </button>
              <button
                type="button"
                onClick={() => setChildWalletMode('MODE_1')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                  childWalletMode === 'MODE_1'
                    ? 'bg-white dark:bg-slate-700 text-[#07543f] dark:text-emerald-300 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
                }`}
              >
                Ví bố mẹ tự theo dõi
              </button>
            </div>

            <form onSubmit={handleCreateChildWallet} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Tên của bé *
                </label>
                <input
                  type="text"
                  value={childWalletName}
                  onChange={(e) => setChildWalletName(e.target.value)}
                  placeholder="VD: Bé Bo, Gia Hân, Minh Triết..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              {/* Mode 2: Username & Password for Child */}
              {childWalletMode === 'MODE_2' && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold text-[#07543f] dark:text-emerald-300">
                    🔑 Tài khoản đăng nhập của bé (Kids Mode)
                  </span>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                      Tên đăng nhập *
                    </label>
                    <input
                      type="text"
                      value={childUsername}
                      onChange={(e) => setChildUsername(e.target.value)}
                      placeholder="VD: bebo2015, minhtriet"
                      className="w-full h-9 px-3 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                      Mật khẩu của bé * (ít nhất 6 ký tự)
                    </label>
                    <input
                      type="password"
                      value={childPassword}
                      onChange={(e) => setChildPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full h-9 px-3 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                    Ngày sinh của bé
                  </label>
                  <input
                    type="date"
                    value={childWalletBirth}
                    onChange={(e) => setChildWalletBirth(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                    Tiền ban đầu (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={childWalletInitialBalance}
                    onChange={(e) => setChildWalletInitialBalance(e.target.value)}
                    placeholder="VD: 50000"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Tiền tiêu vặt định kỳ hàng tuần (VNĐ)
                </label>
                <input
                  type="number"
                  value={childWalletAllowance}
                  onChange={(e) => setChildWalletAllowance(e.target.value)}
                  placeholder="VD: 50000"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              {/* Mode 1: Privacy Toggle */}
              {childWalletMode === 'MODE_1' && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f7faf8] dark:bg-slate-800 border border-[#edf3ee] dark:border-slate-700">
                  <div>
                    <span className="text-xs font-semibold text-[#14261e] dark:text-slate-200 block">
                      Chia sẻ số dư với nhóm
                    </span>
                    <span className="text-[10px] text-[#718579] dark:text-slate-400 block">
                      Cho phép mọi thành viên trong nhóm nhìn thấy số dư của bé
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={childShareBalance}
                    onChange={(e) => setChildShareBalance(e.target.checked)}
                    className="size-4 accent-[#07543f] rounded cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsChildWalletModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChildWallet || !childWalletName.trim()}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition disabled:opacity-50"
                >
                  {isSubmittingChildWallet ? 'Đang tạo...' : 'Tạo ví cho bé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Deposit Child Wallet Modal */}
      {depositTargetWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setDepositTargetWallet(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Nạp tiền vào ví của bé {depositTargetWallet.childName}
            </h3>
            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 mb-4">
              Số dư hiện tại của bé: <strong>{(depositTargetWallet.balance || 0).toLocaleString('vi-VN')} đ</strong>
            </p>

            <form onSubmit={handleDepositChildWallet} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Số tiền nạp (VNĐ) *
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="VD: 50000, 100000"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Ghi chú / Lý do nạp
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="VD: Thưởng điểm 10 môn Toán, Tiền tiêu vặt tuần..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setDepositTargetWallet(null)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit || !depositAmount}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition disabled:opacity-50"
                >
                  {isSubmittingDeposit ? 'Đang nạp...' : 'Xác nhận nạp tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 8: Lightbox Xem ảnh phóng to */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md transition-all cursor-zoom-out"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-10 right-0 size-8 rounded-full bg-white/20 hover:bg-white/40 text-white grid place-items-center transition"
              title="Đóng (Esc)"
            >
              <FinanceIcon name="close" size={16} />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Ảnh phóng to"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* Modal 9: Spend Requests (Danh sách & Xin tiền bố mẹ) */}
      {selectedWalletForRequests && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedWalletForRequests(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
                    Khoản xin tiền của bé {selectedWalletForRequests.childName}
                  </h3>
                  <span className="text-[11px] text-[#718579] dark:text-slate-400">
                    Số dư ví: <strong>{(selectedWalletForRequests.balance || 0).toLocaleString('vi-VN')} đ</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSpendRequestModalOpen(true)}
                className="h-8 px-3 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition flex items-center gap-1.5 shadow-2xs"
              >
                <FinanceIcon name="plus" size={13} />
                <span>+ Xin tiền bố mẹ</span>
              </button>
            </div>

            {/* List Spend Requests */}
            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
              {isLoadingSpendRequests ? (
                <div className="p-8 text-center text-xs text-[#718579]">Đang tải yêu cầu...</div>
              ) : spendRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#718579] rounded-2xl bg-gray-50 dark:bg-slate-850 border border-dashed border-gray-200 dark:border-slate-800">
                  Chưa có yêu cầu xin tiền nào từ bé.
                </div>
              ) : (
                spendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-[#fafcfa] dark:bg-slate-800/80 border border-[#edf3ee] dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-[#14261e] dark:text-slate-100">
                          {(req.amount || 0).toLocaleString('vi-VN')} đ
                        </strong>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {req.status === 'APPROVED' ? 'Đã duyệt' : req.status === 'REJECTED' ? 'Từ chối' : 'Chờ bố mẹ duyệt'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 font-medium m-0 mt-1 truncate">
                        {req.description}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 m-0 mt-0.5">
                          Lý do từ chối: {req.rejectionReason}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Parents Action (Only if isLeader and PENDING) */}
                    {isLeader && req.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveSpendRequest(req)}
                          className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-2xs"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingRequestId(req.id);
                            setRejectionReason('');
                          }}
                          className="h-7 px-2.5 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-600 text-[11px] font-bold transition"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Close footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWalletForRequests(null)}
                className="h-8 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 10: Create Spend Request (Bé xin tiền bố mẹ) */}
      {isSpendRequestModalOpen && selectedWalletForRequests && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsSpendRequestModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#e2ece5] dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
              Xin tiền bố mẹ
            </h3>
            <p className="text-xs text-[#718579] dark:text-slate-400 mt-1 mb-4">
              Yêu cầu sẽ được gửi đến bố mẹ trong nhóm gia đình để phê duyệt.
            </p>

            <form onSubmit={handleCreateSpendRequest} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Số tiền cần xin (VNĐ) *
                </label>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="VD: 20000, 50000"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                  Mục đích sử dụng / Lý do xin tiền *
                </label>
                <input
                  type="text"
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="VD: Mua sách giáo khoa, Mua bút màu, Mua đồ ăn sáng..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  required
                />
              </div>

              {categoriesList.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#14261e] dark:text-slate-300 block mb-1">
                    Danh mục
                  </label>
                  <select
                    value={requestCategoryId}
                    onChange={(e) => setRequestCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSpendRequestModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSpendRequest || !requestAmount || !requestDescription.trim()}
                  className="h-9 px-5 rounded-xl bg-[#07543f] text-xs font-bold text-white hover:bg-[#064232] transition disabled:opacity-50"
                >
                  {isSubmittingSpendRequest ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 11: Rejection Reason Dialog */}
      {rejectingRequestId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setRejectingRequestId(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-rose-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-rose-600 m-0 mb-1">Từ chối yêu cầu xin tiền</h4>
            <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
              Nhập lý do bố mẹ từ chối để bé nắm được:
            </p>
            <form onSubmit={handleRejectSpendRequest} className="flex flex-col gap-3">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="VD: Khoản này chưa cần thiết, tuần này đã dùng quá hạn mức..."
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                required
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequestId(null)}
                  className="h-8 px-3 rounded-lg border text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
