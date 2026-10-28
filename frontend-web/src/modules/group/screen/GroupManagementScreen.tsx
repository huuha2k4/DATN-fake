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

export function GroupManagementScreen({ onNotify }: GroupManagementScreenProps) {
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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newMessageText.trim()) return;
    try {
      setIsSendingMessage(true);
      const text = newMessageText.trim();
      setNewMessageText('');
      const sent = await groupApi.sendMessage(selectedGroup.id, text);
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch {
      onNotify('Không thể gửi tin nhắn');
    } finally {
      setIsSendingMessage(false);
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

  // Real-time polling for messages when viewing chat or active group (every 2.5 seconds)
  useEffect(() => {
    if (!selectedGroup) return;
    const interval = setInterval(() => {
      refreshMessages(selectedGroup.id);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedGroup?.id]);

  // Auto-scroll chat to bottom when messages update or switching to CHAT tab
  useEffect(() => {
    if (activeTab === 'CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

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

  // Debounced search for users (GitHub-style)
  useEffect(() => {
    if (!memberSearchQuery || memberSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const results = await groupApi.searchUsers(memberSearchQuery);
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

  const currentUser = getStoredUser();

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Groups List */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider m-0">
                Danh sách nhóm
              </h3>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[11px] font-bold text-[#07543f] dark:text-emerald-400">
                {groups.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#07543f] hover:bg-[#064232] text-xs font-bold text-white shadow-2xs transition flex items-center gap-1.5"
            >
              <FinanceIcon name="plus" size={14} />
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

        {/* Right Column: Active Group Detail Panel */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {selectedGroup ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
              {/* Group Banner Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#edf3ef] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
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
                    Thêm khoản chi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition"
                  >
                    + Mời thành viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-xs font-bold text-[#07543f] dark:text-emerald-300 hover:bg-emerald-100 transition"
                  >
                    Trả nợ nhóm
                  </button>
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
                  <FinanceIcon name="file-text" size={15} />
                  <span>Trò chuyện {messages.length > 0 ? `(${messages.length})` : ''}</span>
                </button>
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
                      {/* 4 Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Tổng chi tiêu nhóm
                          </span>
                          <strong className="text-base font-bold text-[#14261e] dark:text-slate-100 mt-1 block">
                            {(balances?.totalGroupExpenses || selectedGroup.totalExpenses || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>

                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Thành viên
                          </span>
                          <strong className="text-base font-bold text-[#14261e] dark:text-slate-100 mt-1 block">
                            {members.length} người
                          </strong>
                        </div>

                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Khoản nợ chéo
                          </span>
                          <strong className="text-base font-bold text-[#14261e] dark:text-slate-100 mt-1 block">
                            {balances?.simplifiedDebts?.length || 0} khoản
                          </strong>
                        </div>

                        <div className="rounded-2xl bg-[#f7faf8] dark:bg-slate-850 p-4 border border-[#e5ece7] dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-[#718579] dark:text-slate-400 block">
                            Trạng thái nợ
                          </span>
                          <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                            {balances?.isFullySettled ? 'Đã thanh toán hết' : 'Có công nợ'}
                          </strong>
                        </div>
                      </div>

                      {/* Overview Sub-sections: Khoản chi gần đây & Công nợ cần thanh toán */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Box 1: Khoản chi gần nhất */}
                        <div className="rounded-2xl border border-[#edf3ee] dark:border-slate-800 p-4 bg-white dark:bg-slate-850 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 uppercase tracking-wider m-0">
                              Khoản chi gần đây
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
                            <p className="text-xs text-[#718579] dark:text-slate-400 py-4 text-center m-0">
                              Chưa có khoản chi tiêu nào
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {expenses.slice(0, 4).map((exp) => (
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

                        {/* Box 2: Tình trạng công nợ */}
                        <div className="rounded-2xl border border-[#edf3ee] dark:border-slate-800 p-4 bg-white dark:bg-slate-850 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#14261e] dark:text-slate-100 uppercase tracking-wider m-0">
                              Ai nợ ai cần trả
                            </h4>
                            <button
                              type="button"
                              onClick={() => setActiveTab('BALANCES')}
                              className="text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:underline"
                            >
                              Chi tiết nợ
                            </button>
                          </div>

                          {balances?.simplifiedDebts && balances.simplifiedDebts.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {balances.simplifiedDebts.slice(0, 4).map((debt, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-[#14261e] dark:text-slate-200 truncate m-0">
                                      {debt.fromUser?.fullName || 'Người nợ'} → {debt.toUser?.fullName || 'Người nhận'}
                                    </p>
                                    <span className="text-[10px] text-[#718579] dark:text-slate-400">
                                      Cần chuyển khoản trả
                                    </span>
                                  </div>
                                  <strong className="text-xs font-bold text-[#07543f] dark:text-emerald-400 shrink-0">
                                    {debt.amount.toLocaleString('vi-VN')} đ
                                  </strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 text-center text-xs text-emerald-700 dark:text-emerald-400">
                              🎉 Tất cả thành viên đã sòng phẳng!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Trò chuyện (Chat nhóm) */}
                  {activeTab === 'CHAT' && (
                    <div className="flex flex-col rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#f9fbf9] dark:bg-slate-850 h-[480px]">
                      {/* Chat messages stream */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
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

                            // Date divider calculation (Messenger-style)
                            const currentDate = new Date(msg.createdAt).toLocaleDateString('vi-VN', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            });
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const prevDate = prevMessage
                              ? new Date(prevMessage.createdAt).toLocaleDateString('vi-VN', {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : null;
                            const showDateDivider = !prevDate || prevDate !== currentDate;

                            // Find member profile to get their real avatarUrl
                            const senderMember = members.find((m) => m.userId === msg.senderId);
                            const rawAvatarUrl = isMe ? currentUser?.avatarUrl : (senderMember?.user?.avatarUrl || msg.sender?.avatarKey);
                            const resolvedAvatarUrl = rawAvatarUrl ? userApi.getAvatarUrl(rawAvatarUrl) : null;
                            const avatarInitial = (senderName || 'U').charAt(0).toUpperCase();

                            return (
                              <div key={msg.id} className="flex flex-col gap-2">
                                {/* Date Divider Badge */}
                                {showDateDivider && (
                                  <div className="flex items-center justify-center my-2">
                                    <span className="px-3 py-1 rounded-full bg-[#eef4f0] dark:bg-slate-800 text-[11px] font-semibold text-[#5a7265] dark:text-slate-400 shadow-2xs">
                                      {currentDate}
                                    </span>
                                  </div>
                                )}

                                {/* Message Row with Avatar and Sender Name */}
                                <div
                                  className={`flex items-start gap-2.5 max-w-[85%] ${
                                    isMe ? 'self-end flex-row-reverse' : 'self-start'
                                  }`}
                                >
                                  {/* Avatar - vertically aligned with the message bubble */}
                                  <div
                                    className={`size-8 rounded-full shrink-0 mt-4 overflow-hidden flex items-center justify-center font-bold text-xs shadow-2xs ${
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

                                  {/* Bubble & Name */}
                                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] font-bold text-[#647c6e] dark:text-slate-400 mb-1 px-1">
                                      {senderName}
                                    </span>
                                    <div
                                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-2xs ${
                                        isMe
                                          ? 'bg-[#07543f] text-white rounded-tr-xs'
                                          : 'bg-white dark:bg-slate-800 text-[#14261e] dark:text-slate-100 border border-[#e6eee8] dark:border-slate-700 rounded-tl-xs'
                                      }`}
                                    >
                                      {msg.content}
                                    </div>
                                    <span className="text-[9px] text-[#8fa397] dark:text-slate-500 mt-1 px-1">
                                      {timeStr}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat input form */}
                      <form
                        onSubmit={handleSendMessage}
                        className="p-3 border-t border-[#edf3ee] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Nhập tin nhắn cho cả nhóm..."
                          className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-[#f7faf8] dark:bg-slate-800 text-xs text-[#14261e] dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:border-[#07543f]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || !newMessageText.trim()}
                          className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <FinanceIcon name="arrow" size={14} />
                          <span>Gửi</span>
                        </button>
                      </form>
                    </div>
                  )}

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
                    <button
                      type="button"
                      onClick={() => setIsMemberModalOpen(true)}
                      className="h-8 px-3.5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <FinanceIcon name="plus" size={14} />
                      <span>Thêm thành viên</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map((mem) => {
                      const isOwner = mem.role === 'OWNER';
                      const isMe = currentUser?.id === mem.userId;

                      return (
                        <div
                          key={mem.userId || mem.id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-[#edf3ee] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-850 shadow-2xs hover:border-emerald-200 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-full bg-emerald-100 dark:bg-slate-800 text-[#07543f] dark:text-emerald-400 font-bold text-sm grid place-items-center shrink-0">
                              {mem.user?.fullName?.charAt(0) || 'U'}
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

                            {/* Edit Role Button (for non-owners) */}
                            {!isOwner && (
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

                            {/* Delete Member Button (for non-owners) */}
                            {!isOwner && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {childWallets.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-[#718579] rounded-2xl bg-[#fafcfa] dark:bg-slate-850 border border-dashed border-[#d8e3dc]">
                      Chưa có ví trẻ em nào trong gia đình này.
                    </div>
                  ) : (
                    childWallets.map((cw) => (
                      <div
                        key={cw.id}
                        className="p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-850 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                            Ví của bé: {cw.childName}
                          </h4>
                          <span className="text-xs text-[#718579]">{cw.age ? `${cw.age} tuổi` : ''}</span>
                        </div>

                        <div>
                          <span className="text-xs text-[#718579] block">Số dư hiện tại</span>
                          <strong className="text-xl font-bold text-[#07543f] dark:text-emerald-400">
                            {(cw.balance || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#edf3ee] dark:border-slate-800 pt-3 text-xs text-[#718579]">
                          <span>Trợ cấp hàng tuần:</span>
                          <span className="font-bold text-[#14261e] dark:text-slate-200">
                            {(cw.weeklyAllowance || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    ))
                  )}
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
                    Tìm kiếm người dùng *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Gõ email, họ tên hoặc username..."
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

                  {/* Autocomplete Dropdown List */}
                  {memberSearchQuery.trim().length >= 2 && !selectedUser && (
                    <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[#edf3ee] dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xl divide-y divide-gray-100 dark:divide-slate-800">
                      {isSearchingUsers ? (
                        <div className="p-3 text-center text-xs text-gray-400">
                          Đang tìm kiếm người dùng...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          Không tìm thấy người dùng phù hợp hoặc người này đã tham gia nhóm.
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
                                @{u.username} • {u.email}
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold text-[#07543f] shrink-0">
                              Chọn
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
    </main>
  );
}
