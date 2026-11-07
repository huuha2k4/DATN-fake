import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import Svg, { Circle, G, Path as SvgPath } from 'react-native-svg';
import {
  groupApi,
  type CreateExpenseRequest,
  type GroupBalanceResponse,
  type GroupCommentResponse,
  type GroupExpenseResponse,
  type GroupFundResponse,
  type GroupMemberResponse,
  type GroupMonthlyStatisticsResponse,
  type GroupResponse,
  type GroupType,
  type UserSearchResult,
} from '../api/groupApi';
import { authStorage } from '../../auth/api/authApi';
import { userProfileApi } from '../../profile/api/userProfileApi';
import { transactionApi, type AccountItem, type CategoryItem } from '../../add-transaction/api/transactionApi';
import * as ImagePicker from 'expo-image-picker';

const GROUP_ICONS: Record<string, any> = {
  FAMILY: require('../../../assets/icons/groups/group_family.png'),
  ROOMMATE: require('../../../assets/icons/groups/group_roommate.png'),
  TRAVEL: require('../../../assets/icons/groups/group_travel.png'),
  PROJECT: require('../../../assets/icons/groups/group_project.png'),
  COUPLE: require('../../../assets/icons/groups/group_couple.png'),
};

// Hình minh họa 3D banner tương ứng từng loại nhóm (chuẩn thiết kế Finora)
const GROUP_HERO_3D_ICONS: Record<string, any> = {
  FAMILY: require('../../../assets/icons/groups/family_house_banner_3d.png'),
  ROOMMATE: require('../../../assets/icons/groups/group_roommate_hero_3d.png'),
  TRAVEL: require('../../../assets/icons/groups/group_travel_hero_3d.png'),
  PROJECT: require('../../../assets/icons/groups/group_fund_hero_3d.png'),
  COUPLE: require('../../../assets/icons/groups/group_couple_hero_3d.png'),
  OTHER: require('../../../assets/icons/groups/group_fund_hero_3d.png'),
};

const GROUP_TYPE_MAP: Record<GroupType, { label: string; iconName: any; color: string; bg: string; imageSource?: any }> = {
  FAMILY: { label: 'Gia đình', iconName: 'home', color: '#006747', bg: '#DCFCE7', imageSource: GROUP_ICONS.FAMILY },
  ROOMMATE: { label: 'Phòng trọ', iconName: 'users', color: '#059669', bg: '#D1FAE5', imageSource: GROUP_ICONS.ROOMMATE },
  TRAVEL: { label: 'Du lịch', iconName: 'palmtree', color: '#0D9488', bg: '#CCFBF1', imageSource: GROUP_ICONS.TRAVEL },
  PROJECT: { label: 'Dự án', iconName: 'folder', color: '#16A34A', bg: '#DCFCE7', imageSource: GROUP_ICONS.PROJECT },
  COUPLE: { label: 'Cặp đôi', iconName: 'heart', color: '#E11D48', bg: '#FFE4E6', imageSource: GROUP_ICONS.COUPLE },
  OTHER: { label: 'Khác', iconName: 'users', color: '#475569', bg: '#F1F5F9', imageSource: GROUP_ICONS.PROJECT },
};

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

// Helper sắp xếp tin nhắn theo thứ tự thời gian tăng dần (cũ ở trên, mới nhất ở dưới)
function sortMessagesChronologically(list: GroupMessageResponse[]): GroupMessageResponse[] {
  return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Định dạng ngày phân cách giống bản Web & Messenger
function formatMessengerDateDivider(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

    const dYear = d.getFullYear();
    const dMonth = d.getMonth();
    const dDate = d.getDate();

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDate = now.getDate();

    const isToday = dYear === nowYear && dMonth === nowMonth && dDate === nowDate;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = dYear === yesterday.getFullYear() && dMonth === yesterday.getMonth() && dDate === yesterday.getDate();

    if (isToday) {
      return `Hôm nay ${timeStr}`;
    }
    if (isYesterday) {
      return `Hôm qua ${timeStr}`;
    }

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      const dayIndex = d.getDay();
      const vnDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return `${vnDays[dayIndex]} ${timeStr}`;
    }

    const day = String(dDate).padStart(2, '0');
    const month = String(dMonth + 1).padStart(2, '0');
    if (dYear === nowYear) {
      return `${day}/${month} ${timeStr}`;
    }

    return `${day}/${month}/${dYear} ${timeStr}`;
  } catch {
    return 'Hôm nay';
  }
}

export function GroupScreen() {
  const insets = useSafeAreaInsets();
  const currentUser = authStorage.getUser();

  // State danh sách nhóm
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'MY_GROUPS' | 'JOINED'>('ALL');
  const [lastMessageMap, setLastMessageMap] = useState<Record<string, { senderName: string; content: string; time: string; unreadCount: number }>>({});

  // State Modal Tạo nhóm
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupType>('FAMILY');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [submittingGroup, setSubmittingGroup] = useState(false);

  // State Chi tiết nhóm (Kèm các tab: Tổng quan | Chi tiêu | Nhắn tin | Cân đối nợ | Thành viên)
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS'>('OVERVIEW');
  const [viewingExpense, setViewingExpense] = useState<GroupExpenseResponse | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Dữ liệu trong chi tiết nhóm
  const [expenses, setExpenses] = useState<GroupExpenseResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [balanceData, setBalanceData] = useState<GroupBalanceResponse | null>(null);
  const [fundData, setFundData] = useState<GroupFundResponse | null>(null);
  const [fundContributions, setFundContributions] = useState<GroupFundContributionResponse[]>([]);
  const [messages, setMessages] = useState<GroupMessageResponse[]>([]);
  const [commentsByTarget, setCommentsByTarget] = useState<Record<string, GroupCommentResponse[]>>({});
  const [inlineCommentText, setInlineCommentText] = useState<Record<string, string>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<Record<string, string | null>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({
    // Khởi tạo một số like ban đầu cho sinh động như ảnh mẫu
  });
  const [editingComment, setEditingComment] = useState<{ targetId: string; comment: GroupCommentResponse } | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [commentActionMenuTarget, setCommentActionMenuTarget] = useState<{ targetId: string; comment: GroupCommentResponse } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImageAttachment, setSelectedImageAttachment] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const chatScrollViewRef = useRef<ScrollView>(null);

  // Quản lý theo tháng cho quỹ nhóm
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<GroupMonthlyStatisticsResponse | null>(null);
  const [loadingMonthlyStats, setLoadingMonthlyStats] = useState(false);

  // Modal Thêm khoản chi chung (Form theo chuẩn bản Web & App AddTransaction)
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [activePickerModal, setActivePickerModal] = useState<'CATEGORY' | 'ACCOUNT' | null>(null);
  const [showInlineAccountPicker, setShowInlineAccountPicker] = useState(false);
  const [showInlineCategoryPicker, setShowInlineCategoryPicker] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentSource, setExpPaymentSource] = useState<'GROUP_FUND' | 'PERSONAL_ACCOUNT'>('GROUP_FUND');
  const [expAccountId, setExpAccountId] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [isCustomDateTime, setIsCustomDateTime] = useState(false);
  const [expTime, setExpTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [expDate, setExpDate] = useState(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${now.getFullYear()}`;
  });
  const [expNotes, setExpNotes] = useState('');
  const [personalAccounts, setPersonalAccounts] = useState<AccountItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [categoryPickerModalVisible, setCategoryPickerModalVisible] = useState(false);
  const [accountPickerModalVisible, setAccountPickerModalVisible] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Modal Mời thành viên mới
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingUser, setSearchingUser] = useState(false);

  // Lọc nhóm theo tab (Tất cả, Của tôi, Đã tham gia)
  const myGroupsCount = useMemo(() => {
    return groups.filter((g) => g.myRole === 'OWNER' || (currentUser && g.ownerId === currentUser.id)).length;
  }, [groups, currentUser]);

  const joinedGroupsCount = useMemo(() => {
    return groups.filter((g) => g.myRole !== 'OWNER' && (!currentUser || g.ownerId !== currentUser.id)).length;
  }, [groups, currentUser]);

  const filteredGroups = useMemo(() => {
    if (activeFilterTab === 'MY_GROUPS') {
      return groups.filter((g) => g.myRole === 'OWNER' || (currentUser && g.ownerId === currentUser.id));
    }
    if (activeFilterTab === 'JOINED') {
      return groups.filter((g) => g.myRole !== 'OWNER' && (!currentUser || g.ownerId !== currentUser.id));
    }
    return groups;
  }, [groups, activeFilterTab, currentUser]);
  const loadGroups = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await groupApi.getGroups();
      setGroups(data);

      // Nạp tin nhắn gần nhất cho từng nhóm
      if (data && data.length > 0) {
        const msgEntries = await Promise.all(
          data.map(async (g) => {
            try {
              const msgs = await groupApi.getMessages(g.id);
              if (msgs && msgs.length > 0) {
                const last = msgs[msgs.length - 1];
                let sender = last.sender?.fullName || last.sender?.username || 'Thành viên';
                if (currentUser && last.senderId === currentUser.id) {
                  sender = 'Bạn';
                }
                let timeStr = 'Vừa xong';
                if (last.createdAt) {
                  const d = new Date(last.createdAt);
                  const now = new Date();
                  const isToday = d.toDateString() === now.toDateString();
                  if (isToday) {
                    timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  } else {
                    timeStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }
                }
                return [
                  g.id,
                  {
                    senderName: sender,
                    content: last.content || 'Đã gửi một tin nhắn',
                    time: timeStr,
                    unreadCount: g.unreadMessageCount || 0,
                  },
                ] as const;
              }
            } catch {
              // ignore
            }
            return [
              g.id,
              {
                senderName: '',
                content: g.description || 'Đã tạo nhóm',
                time: g.createdAt ? `${new Date(g.createdAt).getDate()}/${new Date(g.createdAt).getMonth() + 1}` : 'Hôm nay',
                unreadCount: g.unreadMessageCount || 0,
              },
            ] as const;
          })
        );
        setLastMessageMap(Object.fromEntries(msgEntries));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Danh sách kỳ báo cáo: "Tất cả thời gian" ở trên cùng + 12 tháng gần nhất
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [
      { key: 'ALL', label: 'Tất cả thời gian' },
    ];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        key: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    return list;
  }, []);

  const selectedMonthLabel = availableMonths.find((m) => m.key === selectedMonth)?.label || 'Tháng này';

  // Nạp thống kê quỹ nhóm theo tháng
  const loadMonthlyFundStats = async (groupId: string, monthKey: string) => {
    setLoadingMonthlyStats(true);
    try {
      if (monthKey && monthKey !== 'ALL') {
        const [yearStr, monthStr] = monthKey.split('-');
        const stats = await groupApi.getFundMonthlyStatistics(
          groupId,
          parseInt(yearStr, 10),
          parseInt(monthStr, 10)
        );
        setMonthlyStats(stats);
      } else {
        // Tất cả thời gian: truyền tháng hiện tại cho biểu đồ/API hoặc null
        const now = new Date();
        const stats = await groupApi.getFundMonthlyStatistics(
          groupId,
          now.getFullYear(),
          now.getMonth() + 1
        );
        setMonthlyStats(stats);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMonthlyStats(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadMonthlyFundStats(selectedGroup.id, selectedMonth);
    }
  }, [selectedGroup?.id, selectedMonth]);

  // Nạp dữ liệu chi tiết nhóm khi mở
  const loadGroupDetailData = async (groupId: string) => {
    setLoadingDetail(true);
    try {
      const [expList, memList, bal, fund, contributions, msgList] = await Promise.all([
        groupApi.getExpenses(groupId),
        groupApi.getMembers(groupId),
        groupApi.getBalances(groupId),
        groupApi.getFund(groupId),
        groupApi.getFundContributions(groupId),
        groupApi.getMessages(groupId),
      ]);
      setExpenses(expList);
      setMembers(memList);
      setBalanceData(bal);
      setFundData(fund);
      setFundContributions(contributions);
      setMessages(sortMessagesChronologically(msgList));
      loadMonthlyFundStats(groupId, selectedMonth);

      // Nạp danh sách ví cá nhân & danh mục cho modal thêm giao dịch
      transactionApi.getAccounts().then((accs) => {
        if (accs && accs.length > 0) {
          setPersonalAccounts(accs);
          if (!expAccountId) setExpAccountId(accs[0].id);
        } else {
          // Dự phòng ví mặc định nếu tài khoản chưa có hoặc API lỗi
          const fallbackAccs = [
            { id: 'wallet_cash', name: 'Tiền mặt', accountType: 'CASH' as any, currencyCode: 'VND', balance: 500000 },
            { id: 'wallet_momo', name: 'Ví MoMo', accountType: 'E_WALLET' as any, currencyCode: 'VND', balance: 1250000 },
            { id: 'wallet_bank', name: 'Tài khoản Ngân hàng', accountType: 'BANK' as any, currencyCode: 'VND', balance: 3500000 },
          ];
          setPersonalAccounts(fallbackAccs);
          if (!expAccountId) setExpAccountId(fallbackAccs[0].id);
        }
      }).catch(() => {
        const fallbackAccs = [
          { id: 'wallet_cash', name: 'Tiền mặt', accountType: 'CASH' as any, currencyCode: 'VND', balance: 500000 },
          { id: 'wallet_momo', name: 'Ví MoMo', accountType: 'E_WALLET' as any, currencyCode: 'VND', balance: 1250000 },
          { id: 'wallet_bank', name: 'Tài khoản Ngân hàng', accountType: 'BANK' as any, currencyCode: 'VND', balance: 3500000 },
        ];
        setPersonalAccounts(fallbackAccs);
        if (!expAccountId) setExpAccountId(fallbackAccs[0].id);
      });

      transactionApi.getCategories('EXPENSE').then((cats) => {
        if (cats && cats.length > 0) {
          setCategoriesList(cats);
          if (!expCategoryId) setExpCategoryId(cats[0].id);
        } else {
          // Dự phòng danh mục mặc định
          const fallbackCats = [
            { id: 'cat_food', name: 'Ăn uống', kind: 'EXPENSE' as const, icon: 'utensils', color: '#EF4444' },
            { id: 'cat_shopping', name: 'Mua sắm', kind: 'EXPENSE' as const, icon: 'shopping-cart', color: '#EC4899' },
            { id: 'cat_bill', name: 'Hóa đơn & Điện nước', kind: 'EXPENSE' as const, icon: 'bolt', color: '#F59E0B' },
            { id: 'cat_travel', name: 'Đi lại & Xăng xe', kind: 'EXPENSE' as const, icon: 'car', color: '#3B82F6' },
            { id: 'cat_entertainment', name: 'Giải trí', kind: 'EXPENSE' as const, icon: 'gamepad', color: '#8B5CF6' },
            { id: 'cat_other', name: 'Khác', kind: 'EXPENSE' as const, icon: 'more', color: '#6B7280' },
          ];
          setCategoriesList(fallbackCats);
          if (!expCategoryId) setExpCategoryId(fallbackCats[0].id);
        }
      }).catch(() => {
        const fallbackCats = [
          { id: 'cat_food', name: 'Ăn uống', kind: 'EXPENSE' as const, icon: 'utensils', color: '#EF4444' },
          { id: 'cat_shopping', name: 'Mua sắm', kind: 'EXPENSE' as const, icon: 'shopping-cart', color: '#EC4899' },
          { id: 'cat_bill', name: 'Hóa đơn & Điện nước', kind: 'EXPENSE' as const, icon: 'bolt', color: '#F59E0B' },
          { id: 'cat_travel', name: 'Đi lại & Xăng xe', kind: 'EXPENSE' as const, icon: 'car', color: '#3B82F6' },
          { id: 'cat_entertainment', name: 'Giải trí', kind: 'EXPENSE' as const, icon: 'gamepad', color: '#8B5CF6' },
          { id: 'cat_other', name: 'Khác', kind: 'EXPENSE' as const, icon: 'more', color: '#6B7280' },
        ];
        setCategoriesList(fallbackCats);
        if (!expCategoryId) setExpCategoryId(fallbackCats[0].id);
      });

      // Nạp comment cho các khoản chi
      if (expList && expList.length > 0) {
        const commentResults = await Promise.all(
          expList.map(async (exp) => {
            const cmts = await groupApi.getComments(groupId, 'GROUP_EXPENSE', exp.id);
            return [exp.id, cmts] as const;
          })
        );
        setCommentsByTarget(Object.fromEntries(commentResults));
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  // Polling tin nhắn khi đang ở tab CHAT
  useEffect(() => {
    if (!selectedGroup || detailTab !== 'CHAT') return;
    const interval = setInterval(async () => {
      try {
        const msgs = await groupApi.getMessages(selectedGroup.id);
        setMessages(sortMessagesChronologically(msgs));
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedGroup?.id, detailTab]);

  // Chọn hình ảnh từ thư viện để gửi trong cuộc trò chuyện
  const handlePickChatImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập Ảnh', 'Vui lòng cấp quyền truy cập thư viện để gửi ảnh trong nhóm.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `chat_img_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        setSelectedImageAttachment({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể chọn ảnh vào lúc này.');
    }
  };

  // Gửi tin nhắn trong nhóm (hỗ trợ kèm ảnh)
  const handleSendMessage = async () => {
    if (!selectedGroup) return;
    const hasText = newMessageText.trim().length > 0;
    const hasImage = selectedImageAttachment !== null;
    if (!hasText && !hasImage) return;
    if (sendingMessage || uploadingAttachment) return;

    const text = newMessageText.trim();
    const imageToSend = selectedImageAttachment;
    setNewMessageText('');
    setSelectedImageAttachment(null);
    setShowEmojiPicker(false);
    setSendingMessage(true);

    try {
      let attachmentsList = undefined;
      if (imageToSend) {
        setUploadingAttachment(true);
        const uploaded = await groupApi.uploadMessageAttachment(selectedGroup.id, imageToSend);
        attachmentsList = [uploaded];
      }

      const msg = await groupApi.sendMessage(selectedGroup.id, text, undefined, attachmentsList);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi tin nhắn hoặc ảnh.');
    } finally {
      setSendingMessage(false);
      setUploadingAttachment(false);
    }
  };

  // Gửi comment vào một khoản chi (hỗ trợ trả lời theo luồng)
  const handleSendComment = async (expenseId: string) => {
    if (!selectedGroup) return;
    const text = (inlineCommentText[expenseId] || '').trim();
    if (!text) return;
    const parentId = replyingToCommentId[expenseId] || undefined;

    try {
      const created = await groupApi.createComment(selectedGroup.id, {
        commentableType: 'GROUP_EXPENSE',
        commentableId: expenseId,
        content: text,
        parentCommentId: parentId,
      });
      setCommentsByTarget((prev) => ({
        ...prev,
        [expenseId]: [...(prev[expenseId] || []), created],
      }));
      setInlineCommentText((prev) => ({ ...prev, [expenseId]: '' }));
      setReplyingToCommentId((prev) => ({ ...prev, [expenseId]: null }));
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi bình luận.');
    }
  };

  // Like / bỏ like bình luận
  const handleToggleLikeComment = (commentId: string) => {
    setCommentLikes((prev) => {
      const current = prev[commentId] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
      return {
        ...prev,
        [commentId]: { count: nextCount, liked: nextLiked },
      };
    });
  };

  // Sửa bình luận
  const handleSaveEditComment = async () => {
    if (!selectedGroup || !editingComment) return;
    const newContent = editingCommentContent.trim();
    if (!newContent) {
      Alert.alert('Thông báo', 'Nội dung bình luận không được để trống');
      return;
    }
    const { targetId, comment } = editingComment;
    try {
      const updated = await groupApi.updateComment(selectedGroup.id, comment.id, newContent);
      setCommentsByTarget((prev) => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map((c) => (c.id === comment.id ? updated : c)),
      }));
      setEditingComment(null);
      setEditingCommentContent('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể chỉnh sửa bình luận.');
    }
  };

  // Xóa bình luận
  const handleDeleteCommentConfirm = (targetId: string, commentId: string) => {
    if (!selectedGroup) return;
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa bình luận này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupApi.deleteComment(selectedGroup.id, commentId);
            setCommentsByTarget((prev) => ({
              ...prev,
              [targetId]: (prev[targetId] || []).filter((c) => c.id !== commentId && c.parentCommentId !== commentId),
            }));
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Không thể xóa bình luận.');
          }
        },
      },
    ]);
  };

  const handleOpenGroupDetail = (group: GroupResponse) => {
    setSelectedGroup(group);
    setDetailTab('OVERVIEW');
    loadGroupDetailData(group.id);
  };

  // Tạo nhóm mới
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên nhóm');
      return;
    }
    setSubmittingGroup(true);
    try {
      await groupApi.createGroup({
        name: newGroupName.trim(),
        groupType: newGroupType,
        description: newGroupDesc.trim() || undefined,
        baseCurrency: 'VND',
      });
      setCreateModalVisible(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadGroups();
      Alert.alert('Thành công', `Đã tạo nhóm "${newGroupName.trim()}"!`);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo nhóm vào lúc này.');
    } finally {
      setSubmittingGroup(false);
    }
  };

  // Thêm chi tiêu chung trong nhóm (Chuẩn form Web)
  const handleAddExpense = async () => {
    if (!selectedGroup) return;
    const cleanAmount = parseInt(expAmount.replace(/\D/g, '') || '0', 10);
    if (!expDescription.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung chi tiêu');
      return;
    }
    if (cleanAmount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền chi tiêu hợp lệ');
      return;
    }
    if (expPaymentSource === 'PERSONAL_ACCOUNT' && !expAccountId) {
      Alert.alert('Thông báo', 'Vui lòng chọn ví cá nhân để trích tiền');
      return;
    }

    setSubmittingExpense(true);
    try {
      // Chuẩn hóa ngày giao dịch theo định dạng YYYY-MM-DD
      let finalDate = new Date().toISOString().slice(0, 10);
      if (expDate.includes('/')) {
        const parts = expDate.split('/');
        if (parts.length === 3) {
          finalDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (expDate.includes('-')) {
        finalDate = expDate;
      }

      // Tính toán danh sách splits phân chia đều cho toàn bộ thành viên hiện tại
      const groupMembers = members.length > 0 ? members : [{ userId: currentUser?.id || selectedGroup.ownerId }];
      const splitAmount = Math.round(cleanAmount / Math.max(1, groupMembers.length));
      const splits = groupMembers.map((m) => ({
        userId: m.userId,
        amount: splitAmount,
      }));

      const isRealUUID = (id?: string) =>
        id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const req: CreateExpenseRequest = {
        description: expDescription.trim(),
        amount: cleanAmount,
        currency: 'VND',
        paidByUserId: currentUser?.id || selectedGroup.ownerId,
        paymentSource: expPaymentSource,
        sourceAccountId: expPaymentSource === 'PERSONAL_ACCOUNT' && isRealUUID(expAccountId) ? expAccountId : undefined,
        categoryId: isRealUUID(expCategoryId) ? expCategoryId : undefined,
        splitMethod: 'EQUAL',
        expenseDate: finalDate,
        notes: expNotes.trim() || undefined,
        splits,
      };

      await groupApi.createExpense(selectedGroup.id, req);
      setExpenseModalVisible(false);
      setExpDescription('');
      setExpAmount('');
      setExpNotes('');
      await loadGroupDetailData(selectedGroup.id);
      await loadGroups();
      Alert.alert('Thành công', 'Đã ghi nhận chi tiêu chung vào nhóm!');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể thêm chi tiêu.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Tìm kiếm người dùng để mời
  const handleSearchUsers = async (q: string) => {
    setSearchMemberQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingUser(true);
    try {
      const res = await groupApi.searchUsers(q);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUser(false);
    }
  };

  // Mời thành viên vào nhóm
  const handleInviteUser = async (user: UserSearchResult) => {
    if (!selectedGroup) return;
    try {
      await groupApi.addMember(selectedGroup.id, {
        userId: user.id,
        role: 'MEMBER',
      });
      setInviteModalVisible(false);
      setSearchMemberQuery('');
      setSearchResults([]);
      await loadGroupDetailData(selectedGroup.id);
      Alert.alert('Thành công', `Đã gửi lời mời tham gia nhóm tới ${user.fullName || user.email}!`);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể mời thành viên này.');
    }
  };

  // Xóa thành viên
  const handleRemoveMember = (mem: GroupMemberResponse) => {
    if (!selectedGroup) return;
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc chắn muốn xóa ${mem.user?.fullName || 'thành viên này'} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupApi.removeMember(selectedGroup.id, mem.userId);
              await loadGroupDetailData(selectedGroup.id);
              Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm.');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa thành viên.');
            }
          },
        },
      ]
    );
  };

  // Xác nhận thanh toán dứt điểm nợ
  const handleSettleDebt = (debt: { toUserId: string; toUserName: string; amount: number }) => {
    if (!selectedGroup) return;
    Alert.alert(
      'Xác nhận trả nợ',
      `Bạn có xác nhận đã thanh toán ${formatVND(debt.amount)} đ cho ${debt.toUserName} không?`,
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Xác nhận trả',
          onPress: async () => {
            try {
              await groupApi.createSettlement(selectedGroup.id, {
                payeeId: debt.toUserId,
                amount: debt.amount,
                notes: 'Thanh toán nợ qua Finora Mobile',
              });
              await loadGroupDetailData(selectedGroup.id);
              Alert.alert('Thành công', 'Đã tạo yêu cầu thanh toán công nợ thành công!');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể thanh toán nợ.');
            }
          },
        },
      ]
    );
  };

  if (selectedGroup) {
    const isFamily = selectedGroup.groupType === 'FAMILY';
    const groupIconSource = GROUP_TYPE_MAP[selectedGroup.groupType]?.imageSource || GROUP_ICONS.FAMILY;

    return (
      <View style={styles.detailScreenContainer}>
        {/* Header Trang Chi tiết full màn hình - Phong cách sáng & icons tương tác chuẩn mẫu */}
        <View style={[styles.detailScreenHeaderModern, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
          <Pressable
            onPress={() => setSelectedGroup(null)}
            hitSlop={12}
            style={({ pressed }) => [styles.detailModernBackBtn, pressed && styles.pressed]}
          >
            <Text style={styles.detailModernBackArrow}>‹</Text>
          </Pressable>

          <View style={styles.detailModernHeaderCenter}>
            <Image
              source={groupIconSource}
              style={styles.detailGroupHeaderIcon}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.detailModernTitle} numberOfLines={1}>
                  {selectedGroup.name}
                </Text>
                {isFamily && <Text style={{ fontSize: 13 }}>👑</Text>}
              </View>
              <Text style={styles.detailModernSub}>
                {members.length} thành viên
              </Text>
            </View>
          </View>

          {/* Cụm Action Buttons: Cài đặt và Menu ba chấm */}
          <View style={styles.detailHeaderActionsRow}>
            <Pressable
              onPress={() => Alert.alert('Cài đặt nhóm', 'Cấu hình chi tiêu và phân quyền nhóm')}
              style={styles.detailActionCircleBtn}
              hitSlop={6}
            >
              <FinanceIcon name="settings" size={17} color="#059669" />
            </Pressable>
            <Pressable
              onPress={() => setDetailTab('MEMBERS')}
              style={styles.detailActionCircleBtn}
              hitSlop={6}
            >
              <Text style={{ fontSize: 16, color: '#059669', fontWeight: '800', lineHeight: 18 }}>···</Text>
            </Pressable>
          </View>
        </View>

        {/* Thanh Tabs Trượt Ngang (Tab Bar gạch chân xanh chuẩn ảnh mẫu) */}
        <View style={styles.tabsScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.detailTabsScrollContent}
          >
            {[
              { key: 'OVERVIEW', label: 'Tổng quan', icon: 'chart' },
              { key: 'EXPENSES', label: 'Thu & Chi', icon: 'receipt' },
              { key: 'CHAT', label: 'Trò chuyện', icon: 'message-square' },
              { key: 'MEMBERS', label: 'Thành viên', icon: 'users' },
            ].map((tab) => {
              const isSelected = detailTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setDetailTab(tab.key as any)}
                  style={[styles.detailTabItemUnderline, isSelected && styles.detailTabItemUnderlineActive]}
                >
                  <FinanceIcon
                    name={tab.icon as any}
                    size={16}
                    color={isSelected ? '#0E964E' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.detailTabItemTextClean,
                      isSelected && styles.detailTabItemTextCleanActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isSelected && <View style={styles.detailActiveIndicatorLine} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Nội dung theo Tab */}
        {loadingDetail ? (
          <View style={styles.detailLoadingWrap}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={styles.detailLoadingText}>Đang nạp dữ liệu nhóm...</Text>
          </View>
        ) : detailTab === 'CHAT' ? (
          /* RIÊNG TAB TRÒ CHUYỆN: Chiếm toàn bộ chiều cao còn lại của màn hình (flex: 1), 
             cuộn độc lập bằng ScrollView bên trong, thanh chat ghim cố định ở đáy */
          <KeyboardAvoidingView
            style={styles.chatViewportContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              ref={chatScrollViewRef}
              style={styles.chatMessagesScrollView}
              contentContainerStyle={styles.chatMessagesContentContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <View style={styles.detailEmptyCard}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                  <Text style={styles.detailEmptyTitle}>Chưa có cuộc trò chuyện nào</Text>
                  <Text style={styles.detailEmptySub}>
                    Hãy gửi tin nhắn đầu tiên để cùng lên kế hoạch chi tiêu và thảo luận cùng mọi người!
                  </Text>
                </View>
              ) : (
                <View style={styles.chatStreamList}>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser?.id;
                    const senderName = isMe ? 'Bạn' : (msg.sender?.fullName || msg.sender?.username || 'Thành viên');
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;

                    // Tính toán vạch phân cách ngày (Messenger style như Web)
                    // Hiển thị divider nếu là tin nhắn đầu tiên hoặc cách tin nhắn trước >= 10 phút
                    const prevDiffMins = prevMsg && prevMsg.createdAt && msg.createdAt
                      ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
                      : 999;
                    const showDateDivider = !prevMsg || prevDiffMins >= 10;
                    const dividerText = showDateDivider && msg.createdAt ? formatMessengerDateDivider(msg.createdAt) : '';

                    // Check file đính kèm giả lập hoặc Excel
                    const isExcelFile = msg.content?.includes('.xlsx') || msg.content?.includes('.xls');
                    const isBalanceProposal = msg.content.startsWith('[[BALANCE]]');
                    const isLedgerCard = msg.content.startsWith('[[LEDGER') || msg.content.startsWith('[[TRANSACTION]]');
                    const cleanContent = msg.content
                      .replace(/^\[\[BALANCE\]\]/, '')
                      .replace(/^\[\[LEDGER\|.*?\]\]/, '')
                      .replace(/^\[\[TRANSACTION\]\]/, '');

                    // Lấy avatar người gửi
                    const rawAvatar = isMe ? currentUser?.avatarUrl : msg.sender?.avatarKey;
                    const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;

                    const timeStr = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '09:55';

                    return (
                      <React.Fragment key={msg.id}>
                        {/* Thanh phân cách ngày/giờ động chuẩn như Web & Messenger */}
                        {showDateDivider && (
                          <View style={styles.chatDayDividerWrap}>
                            <View style={styles.chatDayPill}>
                              <Text style={styles.chatDayPillText}>{dividerText || 'Hôm nay'}</Text>
                            </View>
                          </View>
                        )}

                        <View
                          style={[
                            styles.chatRowWrapper,
                            isMe ? styles.chatRowMe : styles.chatRowOther,
                            !isSameSenderAsPrev || showDateDivider ? { marginTop: 12 } : { marginTop: 3 },
                          ]}
                        >
                          {/* Avatar người khác ở bên trái */}
                          {!isMe && (
                            <View style={styles.chatAvatarBox}>
                              {!isSameSenderAsPrev || showDateDivider ? (
                                <View style={styles.chatAvatarCircleWeb}>
                                  {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.chatAvatarImgWeb} />
                                  ) : (
                                    <Text style={styles.chatAvatarCharWeb}>
                                      {senderName.slice(0, 1).toUpperCase()}
                                    </Text>
                                  )}
                                </View>
                              ) : (
                                <View style={{ width: 34 }} />
                              )}
                            </View>
                          )}

                          <View style={{ maxWidth: '82%' }}>
                            {/* Tên người gửi ở trên tin nhắn (nếu là người khác) */}
                            {!isMe && (!isSameSenderAsPrev || showDateDivider) && (
                              <Text style={styles.chatSenderTitleWeb}>{senderName}</Text>
                            )}

                          {/* Trường hợp 1: Thẻ tệp đính kèm Excel (.xlsx) chuẩn mẫu */}
                          {isExcelFile ? (
                            <View style={styles.chatFileCardWeb}>
                              <View style={styles.chatFileIconBox}>
                                <FinanceIcon name="file-excel" size={24} color="#16A34A" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.chatFileNameText} numberOfLines={1}>{cleanContent}</Text>
                                <Text style={styles.chatFileSizeText}>32 KB</Text>
                              </View>
                              <Pressable hitSlop={8} style={styles.chatFileDownloadBtn}>
                                <FinanceIcon name="download" size={16} color="#16A34A" />
                              </Pressable>
                              <Text style={styles.chatFileTimeText}>{timeStr}</Text>
                            </View>
                          ) : msg.attachments && msg.attachments.length > 0 ? (
                            /* Trường hợp Ảnh đính kèm từ thư viện */
                            <View style={{ gap: 6 }}>
                              {msg.attachments.map((att, aIdx) => {
                                const fileUri = userProfileApi.formatAvatarUrl(att.fileKey) || att.fileKey;
                                return (
                                  <View key={aIdx} style={styles.chatAttachmentImgContainer}>
                                    <Image
                                      source={{ uri: fileUri }}
                                      style={styles.chatAttachmentImg}
                                      resizeMode="cover"
                                    />
                                  </View>
                                );
                              })}
                              {cleanContent && cleanContent !== 'Đã gửi một ảnh' ? (
                                <View
                                  style={[
                                    styles.chatMessageBubbleWeb,
                                    isMe ? styles.chatBubbleMeWeb : styles.chatBubbleOtherWeb,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chatMessageContentWeb,
                                      isMe ? styles.chatMessageTextMeWeb : styles.chatMessageTextOtherWeb,
                                    ]}
                                  >
                                    {cleanContent}
                                  </Text>
                                  <View style={styles.chatTimeAndStatusRow}>
                                    <Text
                                      style={[
                                        styles.chatTimestampTextWeb,
                                        isMe ? styles.chatTimestampMeWeb : styles.chatTimestampOtherWeb,
                                      ]}
                                    >
                                      {timeStr}
                                    </Text>
                                    {isMe && <FinanceIcon name="checks" size={13} color="#16A34A" />}
                                  </View>
                                </View>
                              ) : (
                                <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 2 }}>
                                  <Text style={styles.chatTimestampTextWeb}>{timeStr}</Text>
                                </View>
                              )}
                            </View>
                          ) : isBalanceProposal || isLedgerCard ? (
                            /* Trường hợp 2: Thẻ cân đối / Bù trừ nợ */
                            <View
                              style={[
                                styles.chatCardBubble,
                                isBalanceProposal ? styles.chatBalanceCard : styles.chatLedgerCard,
                              ]}
                            >
                              <View style={styles.chatCardHeaderRow}>
                                <FinanceIcon
                                  name={isBalanceProposal ? 'refresh' : 'receipt'}
                                  size={14}
                                  color={isBalanceProposal ? '#059669' : '#0284C7'}
                                />
                                <Text style={styles.chatCardHeaderText}>
                                  {isBalanceProposal ? 'ĐỀ XUẤT BÙ TRỪ NỢ' : 'KHOẢN CHI MỚI'}
                                </Text>
                              </View>
                              <Text style={styles.chatCardBodyText}>{cleanContent}</Text>
                              <Pressable
                                onPress={() => setDetailTab(isBalanceProposal ? 'BALANCES' : 'EXPENSES')}
                                style={styles.chatCardActionBtn}
                              >
                                <Text style={styles.chatCardActionBtnText}>
                                  {isBalanceProposal ? 'Xem cân đối nợ ›' : 'Xem chi tiết khoản chi ›'}
                                </Text>
                              </Pressable>
                            </View>
                          ) : (
                            /* Trường hợp 3: Tin nhắn thông thường chuẩn design */
                            <View
                              style={[
                                styles.chatMessageBubbleWeb,
                                isMe ? styles.chatBubbleMeWeb : styles.chatBubbleOtherWeb,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatMessageContentWeb,
                                  isMe ? styles.chatMessageTextMeWeb : styles.chatMessageTextOtherWeb,
                                ]}
                              >
                                {cleanContent}
                              </Text>

                              {/* Thời gian + dấu tích đôi đã đọc bên góc phải */}
                              <View style={styles.chatTimeAndStatusRow}>
                                <Text
                                  style={[
                                    styles.chatTimestampTextWeb,
                                    isMe ? styles.chatTimestampMeWeb : styles.chatTimestampOtherWeb,
                                  ]}
                                >
                                  {timeStr}
                                </Text>
                                {isMe && (
                                  <FinanceIcon name="checks" size={13} color="#16A34A" />
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
              )}
            </ScrollView>

            {/* Popup chọn Emoji / Biểu cảm nhanh chuẩn như Web */}
            {showEmojiPicker && (
              <View style={styles.chatEmojiPickerPopup}>
                <Text style={styles.chatEmojiPickerTitle}>Biểu cảm nhanh</Text>
                <View style={styles.chatEmojiGrid}>
                  {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥', '✨', '💸', '💰', '🍔', '☕', '👶', '🙏', '💯', '👌'].map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        setNewMessageText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={({ pressed }) => [styles.chatEmojiItemBtn, pressed && styles.pressed]}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Thanh xem trước ảnh đã chọn đính kèm trước khi gửi */}
            {selectedImageAttachment && (
              <View style={styles.chatAttachmentPreviewBar}>
                <Image source={{ uri: selectedImageAttachment.uri }} style={styles.chatAttachmentPreviewThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatAttachmentPreviewName} numberOfLines={1}>{selectedImageAttachment.name}</Text>
                  <Text style={styles.chatAttachmentPreviewSub}>Sẵn sàng gửi</Text>
                </View>
                <Pressable
                  onPress={() => setSelectedImageAttachment(null)}
                  hitSlop={8}
                  style={styles.chatAttachmentRemoveBtn}
                >
                  <FinanceIcon name="close" size={14} color="#EF4444" />
                </Pressable>
              </View>
            )}

            {/* Khung Gửi Tin Nhắn Ghim Cố Định Ở Đáy Chuẩn Mẫu (Icon Đính kèm + Input bo tròn + Emoji + Nút Send tròn xanh) */}
            <View style={[styles.chatInputBarContainerWeb, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <Pressable
                onPress={handlePickChatImage}
                hitSlop={10}
                style={({ pressed }) => [styles.chatInputAttachmentBtn, pressed && styles.pressed]}
              >
                <FinanceIcon name="paperclip" size={20} color="#0E964E" />
              </Pressable>

              <View style={styles.chatInputInnerBox}>
                <TextInput
                  style={styles.chatTextInputWeb}
                  placeholder={selectedImageAttachment ? 'Thêm chú thích ảnh...' : 'Nhập tin nhắn...'}
                  placeholderTextColor="#94A3B8"
                  value={newMessageText}
                  onChangeText={setNewMessageText}
                  multiline
                />
                <Pressable
                  onPress={() => setShowEmojiPicker((prev) => !prev)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.chatEmojiBtn, pressed && styles.pressed]}
                >
                  <FinanceIcon name="smile" size={19} color={showEmojiPicker ? '#0E964E' : '#94A3B8'} />
                </Pressable>
              </View>

              <Pressable
                onPress={handleSendMessage}
                disabled={sendingMessage || uploadingAttachment || (!newMessageText.trim() && !selectedImageAttachment)}
                style={({ pressed }) => [
                  styles.chatSendCircleBtnWeb,
                  (!newMessageText.trim() && !selectedImageAttachment) && styles.disabled,
                  (sendingMessage || uploadingAttachment) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {sendingMessage || uploadingAttachment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FinanceIcon name="send" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <ScrollView
            style={styles.detailScrollContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 0: TỔNG QUAN (OVERVIEW - CHUẨN DESIGN MỚI) */}
            {detailTab === 'OVERVIEW' && (() => {
              const now = new Date();
              const thisYear = now.getFullYear();
              const thisMonth = now.getMonth() + 1;

              // 1. Tính toán chuẩn từ danh sách đóng góp và chi tiêu thực tế nếu API stats chưa trả về
              const currentMonthContributions = fundContributions.filter((c) => {
                if (!c.contributedAt) return false;
                const d = new Date(c.contributedAt);
                return d.getFullYear() === thisYear && (d.getMonth() + 1) === thisMonth;
              });
              const calculatedIncome = currentMonthContributions.reduce((sum, c) => sum + (c.amount || 0), 0);

              const currentMonthExpenses = expenses.filter((e) => {
                if (!e.expenseDate) return false;
                const d = new Date(e.expenseDate);
                return d.getFullYear() === thisYear && (d.getMonth() + 1) === thisMonth;
              });
              const calculatedExpense = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

              // 2. Lấy số dư quỹ chuẩn xác từ fundData.balance
              const totalFund = fundData?.balance ?? monthlyStats?.fundBalance ?? 0;
              const totalIncome = monthlyStats?.totalIncome !== undefined ? monthlyStats.totalIncome : calculatedIncome;
              const totalExp = monthlyStats?.totalExpense !== undefined ? monthlyStats.totalExpense : calculatedExpense;
              const remaining = monthlyStats?.remaining !== undefined ? monthlyStats.remaining : (totalIncome - totalExp);
              const txCount = monthlyStats?.transactionCount !== undefined
                ? monthlyStats.transactionCount
                : (currentMonthContributions.length + currentMonthExpenses.length);
              const trendPct = monthlyStats?.trendPercentage;

              // 3. Phân loại theo danh mục thực tế
              let categories = monthlyStats?.categoryStats && monthlyStats.categoryStats.length > 0
                ? monthlyStats.categoryStats
                : [];

              if (categories.length === 0 && currentMonthExpenses.length > 0) {
                const catMap: Record<string, { name: string; amount: number; color: string }> = {};
                currentMonthExpenses.forEach((e) => {
                  const catName = e.category?.name || 'Khác';
                  const catColor = e.category?.color || '#10B981';
                  if (!catMap[catName]) {
                    catMap[catName] = { name: catName, amount: 0, color: catColor };
                  }
                  catMap[catName].amount += e.amount || 0;
                });
                categories = Object.values(catMap).map((item) => ({
                  categoryName: item.name,
                  color: item.color,
                  amount: item.amount,
                  percentage: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
                  count: 1,
                }));
              }

              // Fallback hiển thị nếu nhóm mới chưa có giao dịch nào
              if (categories.length === 0) {
                categories = [
                  { categoryName: 'Chưa có chi tiêu', percentage: 100, color: '#94A3B8', amount: 0, count: 0 },
                ];
              }

              const heroIllustration = GROUP_HERO_3D_ICONS[selectedGroup.groupType] || GROUP_HERO_3D_ICONS.FAMILY;

              return (
                <View style={{ gap: 16 }}>
                  {/* 1. HERO BANNER: QUỸ CHUNG NHÓM VỚI MINH HỌA 3D CHUẨN LOẠI NHÓM */}
                  <ImageBackground
                    source={require('../../../assets/icons/groups/family_banner_bg.png')}
                    style={styles.fundBannerCard}
                    imageStyle={styles.fundBannerBgImage}
                    resizeMode="cover"
                  >
                    <View style={styles.fundBannerLeft}>
                      <Text style={styles.fundBannerSubtitle}>Quỹ chung nhóm</Text>
                      <Text style={styles.fundBannerAmount}>
                        {formatVND(totalFund)} đ
                      </Text>
                      <View style={styles.fundTrendRow}>
                        <Text style={styles.fundTrendText}>
                          {trendPct !== null && trendPct !== undefined
                            ? `${trendPct >= 0 ? '↑ +' : '↓ '}${trendPct.toFixed(1)}% so với tháng trước`
                            : '↑ 0.0% so với tháng trước'}
                        </Text>
                      </View>
                    </View>
                    <Image
                      source={heroIllustration}
                      style={styles.fundBannerIllustration}
                      resizeMode="contain"
                    />
                  </ImageBackground>

                  {/* 2. LƯỚI 4 THẺ THỐNG KÊ (THU, CHI, CÒN LẠI, GIAO DỊCH) */}
                  <View style={styles.stat4Grid}>
                    {/* Thẻ Thu: Mũi tên xanh đi lên */}
                    <View style={styles.stat4Card}>
                      <View style={[styles.stat4IconBox, { backgroundColor: '#DCFCE7' }]}>
                        <FinanceIcon name="income" size={17} color="#16A34A" />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={styles.stat4Label}>Thu</Text>
                        <Text style={[styles.stat4Value, { color: '#0F172A' }]}>
                          {formatVND(totalIncome)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Chi: Mũi tên đỏ đi xuống */}
                    <View style={styles.stat4Card}>
                      <View style={[styles.stat4IconBox, { backgroundColor: '#FFE4E6' }]}>
                        <FinanceIcon name="expense" size={17} color="#E11D48" />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={styles.stat4Label}>Chi</Text>
                        <Text style={[styles.stat4Value, { color: '#E11D48' }]}>
                          {formatVND(totalExp)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Còn lại */}
                    <View style={styles.stat4Card}>
                      <View style={[styles.stat4IconBox, { backgroundColor: '#DCFCE7' }]}>
                        <FinanceIcon name="credit-card" size={17} color="#16A34A" />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={styles.stat4Label}>Còn lại</Text>
                        <Text style={[styles.stat4Value, { color: '#0F172A' }]}>
                          {formatVND(remaining)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Giao dịch */}
                    <View style={styles.stat4Card}>
                      <View style={[styles.stat4IconBox, { backgroundColor: '#E0F2FE' }]}>
                        <FinanceIcon name="receipt" size={17} color="#0284C7" />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={styles.stat4Label}>Giao dịch</Text>
                        <Text style={[styles.stat4Value, { color: '#0F172A' }]}>
                          {txCount} khoản
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 3. BIỂU ĐỒ CHI TIÊU THEO DANH MỤC */}
                  <View style={styles.categoryChartCard}>
                    <Text style={styles.categoryChartTitle}>Chi tiêu theo danh mục</Text>
                    <View style={styles.categoryChartRow}>
                      {/* Biểu đồ Donut SVG động */}
                      <View style={styles.donutChartContainer}>
                        <Svg width={120} height={120} viewBox="0 0 120 120">
                          <G rotation="-90" origin="60, 60">
                            {(() => {
                              const radius = 46;
                              const strokeWidth = 12;
                              const circumference = 2 * Math.PI * radius;
                              let accumulatedPct = 0;

                              return categories.map((cat, idx) => {
                                const strokeDashoffset = circumference * (1 - cat.percentage / 100);
                                const rotation = (accumulatedPct / 100) * 360;
                                accumulatedPct += cat.percentage;

                                return (
                                  <Circle
                                    key={idx}
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    stroke={cat.color || '#10B981'}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${circumference} ${circumference}`}
                                    strokeDashoffset={strokeDashoffset}
                                    fill="transparent"
                                    origin="60, 60"
                                    rotation={rotation}
                                    strokeLinecap="round"
                                  />
                                );
                              });
                            })()}
                          </G>
                        </Svg>

                        {/* Tổng số tiền đã chi nằm ở tâm vòng tròn */}
                        <View style={styles.donutCenterContent}>
                          <Text style={styles.donutCenterLabel}>Tổng chi</Text>
                          <Text style={styles.donutCenterValue} numberOfLines={1}>
                            {formatVND(totalExp)}
                          </Text>
                          <Text style={styles.donutCenterCurrency}>VNĐ</Text>
                        </View>
                      </View>

                      {/* Chú thích các danh mục */}
                      <View style={styles.chartLegendCol}>
                        {categories.slice(0, 4).map((cat, idx) => (
                          <View key={idx} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: cat.color || '#10B981' }]} />
                            <Text style={styles.legendName} numberOfLines={1}>
                              {cat.categoryName}
                            </Text>
                            <Text style={styles.legendPercent}>
                              {Math.round(cat.percentage)}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 4. GIAO DỊCH GẦN ĐÂY */}
                  <View style={styles.recentTxCard}>
                    <View style={styles.recentTxHeader}>
                      <Text style={styles.recentTxTitle}>Giao dịch gần đây</Text>
                      <Pressable onPress={() => setDetailTab('EXPENSES')} hitSlop={8}>
                        <Text style={styles.recentTxViewMore}>Xem tất cả ›</Text>
                      </Pressable>
                    </View>

                    {expenses.length === 0 ? (
                      <View style={styles.sampleTxItem}>
                        <View style={styles.sampleTxIconWrap}>
                          <Text style={{ fontSize: 18 }}>🍴</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sampleTxDesc}>Ăn uống</Text>
                          <Text style={styles.sampleTxSub}>Người tạo: Mẹ • Hôm nay</Text>
                        </View>
                        <Text style={styles.sampleTxAmount}>-50.000 đ</Text>
                      </View>
                    ) : (
                        expenses.slice(0, 3).map((exp) => {
                          const payerName = exp.payer?.fullName || (exp.paidByUserId === currentUser?.id ? 'Bạn' : null) || members.find((m) => m.userId === exp.paidByUserId)?.user?.fullName || members.find((m) => m.userId === exp.paidByUserId)?.nickname || 'Thành viên';
                          return (
                            <Pressable
                              key={exp.id}
                              onPress={() => setViewingExpense(exp)}
                              style={({ pressed }) => [styles.sampleTxItem, pressed && styles.pressed]}
                            >
                              <View style={styles.sampleTxIconWrap}>
                                <FinanceIcon name="receipt" size={17} color="#E11D48" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.sampleTxDesc} numberOfLines={1}>
                                  {exp.description}
                                </Text>
                                <Text style={styles.sampleTxSub}>
                                  Người tạo: {payerName} • {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                                </Text>
                              </View>
                              <Text style={styles.sampleTxAmount}>-{formatVND(exp.amount)} đ</Text>
                            </Pressable>
                          );
                        })
                    )}
                  </View>
                </View>
              );
            })()}

            {/* TAB 1: DANH SÁCH THU & CHI (CHUẨN DESIGN MỚI) */}
            {detailTab === 'EXPENSES' && (() => {
              const isAllMonths = selectedMonth === 'ALL';
              let currentYear = new Date().getFullYear();
              let currentMonth = new Date().getMonth() + 1;
              if (!isAllMonths) {
                const [yStr, mStr] = selectedMonth.split('-');
                currentYear = parseInt(yStr, 10);
                currentMonth = parseInt(mStr, 10);
              }

              // 1. Lọc các khoản nộp quỹ (Thu) trong tháng (hoặc tất cả nếu chọn ALL)
              const monthContributions = fundContributions.filter((c) => {
                if (!c.contributedAt) return false;
                if (isAllMonths) return true;
                const d = new Date(c.contributedAt);
                return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
              });

              // 2. Lọc các khoản chi (Chi) trong tháng (hoặc tất cả nếu chọn ALL)
              const monthExpenses = expenses.filter((exp) => {
                if (isAllMonths) return true;
                if (!exp.expenseDate) return true;
                const d = new Date(exp.expenseDate);
                return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
              });

              // Tổng thu, chi, còn lại theo kỳ được chọn
              const calculatedIncome = monthContributions.reduce((sum, c) => sum + (c.amount || 0), 0);
              const calculatedExpense = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              const totalIncome = isAllMonths ? calculatedIncome : (monthlyStats?.totalIncome ?? calculatedIncome);
              const totalExpense = isAllMonths ? calculatedExpense : (monthlyStats?.totalExpense ?? calculatedExpense);
              const remaining = isAllMonths ? (totalIncome - totalExpense) : (monthlyStats?.remaining ?? (totalIncome - totalExpense));

              // 3. Gom chung thành danh sách Giao dịch thống nhất (kèm timestamp để nhóm Theo Ngày)
              type UnifiedTx = {
                id: string;
                type: 'INCOME' | 'EXPENSE';
                title: string;
                subtitle: string;
                amount: number;
                dateStr: string;
                timeStr: string;
                rawDate: Date;
                categoryName?: string;
                commentCount: number;
                originalExpense?: GroupExpenseResponse;
              };

              // Hàm lấy tên người chi/tạo chuẩn xác
              const getPayerDisplayName = (exp: GroupExpenseResponse) => {
                if (exp.payer?.fullName) return exp.payer.fullName;
                if (exp.paidByUserId === currentUser?.id) return 'Bạn';
                const foundMember = members.find((m) => m.userId === exp.paidByUserId);
                if (foundMember) {
                  return foundMember.nickname || foundMember.user?.fullName || foundMember.user?.email?.split('@')[0] || 'Thành viên';
                }
                return 'Thành viên';
              };

              const getContributorDisplayName = (c: GroupFundContributionResponse) => {
                if (c.contributorName) return c.contributorName;
                if (c.contributorUserId === currentUser?.id) return 'Bạn';
                const foundMember = members.find((m) => m.userId === c.contributorUserId);
                if (foundMember) {
                  return foundMember.nickname || foundMember.user?.fullName || 'Thành viên';
                }
                return 'Thành viên';
              };

              const unifiedList: UnifiedTx[] = [
                ...monthContributions.map((c) => {
                  const d = new Date(c.contributedAt || c.createdAt || Date.now());
                  const displayName = getContributorDisplayName(c);
                  return {
                    id: `fund-${c.id}`,
                    type: 'INCOME' as const,
                    title: c.note || 'Đóng tiền quỹ nhóm',
                    subtitle: `Bởi ${displayName}`,
                    amount: c.amount || 0,
                    dateStr: d.toISOString().split('T')[0],
                    timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    rawDate: d,
                    categoryName: 'Thu quỹ',
                    commentCount: (commentsByTarget[c.id] || []).length,
                    originalExpense: undefined,
                  };
                }),
                ...monthExpenses.map((e) => {
                  const d = new Date(e.expenseDate || e.createdAt || Date.now());
                  const displayName = getPayerDisplayName(e);
                  return {
                    id: e.id,
                    type: 'EXPENSE' as const,
                    title: e.description,
                    subtitle: `Bởi ${displayName}`,
                    amount: e.amount || 0,
                    dateStr: d.toISOString().split('T')[0],
                    timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    rawDate: d,
                    categoryName: e.category?.name || 'Chi tiêu',
                    commentCount: (commentsByTarget[e.id] || []).length,
                    originalExpense: e,
                  };
                }),
              ];

              unifiedList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

              // Nhóm theo ngày (Hôm nay, Hôm qua, hoặc Ngày cụ thể)
              const todayStr = new Date().toISOString().split('T')[0];
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];

              // Lọc danh sách theo Tab Tất cả | Thu | Chi
              const displayedList = unifiedList.filter((tx) => {
                if (txTypeFilter === 'INCOME') return tx.type === 'INCOME';
                if (txTypeFilter === 'EXPENSE') return tx.type === 'EXPENSE';
                return true;
              });

              const groupedByDate: Record<string, UnifiedTx[]> = {};
              displayedList.forEach((tx) => {
                let label = tx.dateStr;
                if (tx.dateStr === todayStr) label = 'Hôm nay';
                else if (tx.dateStr === yesterdayStr) label = 'Hôm qua';
                else {
                  const [y, m, d] = tx.dateStr.split('-');
                  label = `${d}/${m}/${y}`;
                }
                if (!groupedByDate[label]) groupedByDate[label] = [];
                groupedByDate[label].push(tx);
              });

              // Hàm trả về icon và màu chuẩn: Xanh lá cho thêm tiền (Thu), Đỏ cho chi tiền (Chi)
              const getTxIconMeta = (tx: UnifiedTx) => {
                if (tx.type === 'INCOME') {
                  return { icon: 'income' as any, bg: '#E6F4EA', color: '#137333' };
                }
                const iconName = resolveCategoryIconName(undefined, 'EXPENSE', `${tx.title} ${tx.categoryName || ''}`);
                return { icon: iconName as any, bg: '#FCE8E6', color: '#C5221F' };
              };

              return (
                <View style={{ gap: 14, paddingBottom: 80 }}>
                  {/* THANH CHỌN BỘ LỌC (TẤT CẢ | THU | CHI) & BỘ CHỌN THÁNG CHUẨN ẢNH MẪU */}
                  <View style={styles.filterAndMonthHeaderRow}>
                    {/* Cụm Segmented Filter: Tất cả | Thu | Chi */}
                    <View style={styles.segmentedFilterContainer}>
                      <Pressable
                        onPress={() => setTxTypeFilter('ALL')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'ALL' && styles.segmentedFilterBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            txTypeFilter === 'ALL' && styles.segmentedFilterTextActive,
                          ]}
                        >
                          Tất cả
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTxTypeFilter('INCOME')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'INCOME' && styles.segmentedFilterBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            txTypeFilter === 'INCOME' && styles.segmentedFilterTextActive,
                          ]}
                        >
                          Thu
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTxTypeFilter('EXPENSE')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'EXPENSE' && styles.segmentedFilterBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            txTypeFilter === 'EXPENSE' && styles.segmentedFilterTextActive,
                          ]}
                        >
                          Chi
                        </Text>
                      </Pressable>
                    </View>

                    {/* Nút chọn tháng thả xuống chuẩn như màn Ví/Thu chi */}
                    <Pressable
                      onPress={() => setMonthModalVisible(true)}
                      style={styles.monthDropdownPillBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.monthDropdownPillText}>{selectedMonthLabel}</Text>
                      <Text style={styles.monthDropdownChevron}>⌄</Text>
                    </Pressable>
                  </View>

                  {/* 2 THẺ TỔNG HỢP: TỔNG THU & TỔNG CHI (CHUẨN MÀU BẢN WEB) */}
                  <View style={styles.summaryTopRow}>
                    {/* Thẻ Tổng thu */}
                    <View style={styles.summaryBoxHalf}>
                      <View style={[styles.summaryArrowCircle, { backgroundColor: '#E6F4EA' }]}>
                        <FinanceIcon name="income" size={16} color="#137333" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryBoxLabel}>Tổng thu</Text>
                        <Text style={styles.summaryBoxIncomeValue}>
                          {formatVND(totalIncome)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Tổng chi */}
                    <View style={styles.summaryBoxHalf}>
                      <View style={[styles.summaryArrowCircle, { backgroundColor: '#FCE8E6' }]}>
                        <FinanceIcon name="expense" size={16} color="#C5221F" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryBoxLabel}>Tổng chi</Text>
                        <Text style={styles.summaryBoxExpenseValue}>
                          {formatVND(totalExpense)} đ
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* TIÊU ĐỀ DANH SÁCH GIAO DỊCH */}
                  <View style={styles.txSectionHeader}>
                    <Text style={styles.txSectionTitle}>Giao dịch ({unifiedList.length})</Text>
                    <Pressable hitSlop={8}>
                      <FinanceIcon name="search" size={16} color="#64748B" />
                    </Pressable>
                  </View>

                  {/* DANH SÁCH GIAO DỊCH GOM THEO NGÀY */}
                  {unifiedList.length === 0 ? (
                    <View style={styles.detailEmptyCard}>
                      <Text style={{ fontSize: 28, marginBottom: 6 }}>🧾</Text>
                      <Text style={styles.detailEmptyTitle}>Không có giao dịch trong {selectedMonthLabel}</Text>
                      <Text style={styles.detailEmptySub}>
                        Bấm "+ Thêm giao dịch" bên dưới để ghi nhận chi tiêu hoặc nộp quỹ.
                      </Text>
                    </View>
                  ) : (
                    Object.entries(groupedByDate).map(([dateLabel, items]) => (
                      <View key={dateLabel} style={styles.dateGroupContainer}>
                        <View style={styles.dateBadgePill}>
                          <Text style={styles.dateBadgeText}>{dateLabel}</Text>
                        </View>

                        <View style={styles.txItemsListCard}>
                          {items.map((tx, idx) => {
                            const meta = getTxIconMeta(tx);
                            const isIncome = tx.type === 'INCOME';

                            return (
                              <Pressable
                                key={tx.id}
                                onPress={() => {
                                  if (tx.type === 'EXPENSE' && tx.originalExpense) {
                                    setViewingExpense(tx.originalExpense);
                                  }
                                }}
                                style={[
                                  styles.unifiedTxItemRow,
                                  idx < items.length - 1 && styles.unifiedTxItemBorder,
                                ]}
                              >
                                {/* Icon tròn theo danh mục */}
                                <View style={[styles.unifiedTxIconCircle, { backgroundColor: meta.bg }]}>
                                  <FinanceIcon name={meta.icon} size={17} color={meta.color} />
                                </View>

                                {/* Tiêu đề & người tạo */}
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.unifiedTxTitle} numberOfLines={1}>
                                    {tx.title}
                                  </Text>
                                  <Text style={styles.unifiedTxSub}>
                                    {tx.subtitle} • {tx.timeStr}
                                  </Text>
                                </View>

                                {/* Số tiền & Icon số lượng bình luận */}
                                <View style={styles.unifiedTxRightWrap}>
                                  <Text
                                    style={[
                                      styles.unifiedTxAmount,
                                      isIncome ? styles.unifiedTxAmountIncome : styles.unifiedTxAmountExpense,
                                    ]}
                                  >
                                    {isIncome ? `+${formatVND(tx.amount)} đ` : `-${formatVND(tx.amount)} đ`}
                                  </Text>

                                  {/* Icon bong bóng chat kèm số lượng bình luận */}
                                  <View style={styles.commentCountBadge}>
                                    <FinanceIcon name="message-square" size={13} color="#64748B" />
                                    <Text style={styles.commentCountText}>{tx.commentCount}</Text>
                                  </View>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              );
            })()}



            {/* TAB 2: CÂN ĐỐI NỢ & QUYẾT TOÁN */}
            {detailTab === 'BALANCES' && (
              <View style={{ gap: 14 }}>
                <View style={styles.balanceSummaryCard}>
                  <Text style={styles.balanceSummaryTitle}>Ma trận nợ & Quyết toán</Text>
                  <Text style={styles.balanceSummarySub}>
                    Finora tự động tối ưu hóa số giao dịch để hoàn tất trả nợ ít lần nhất.
                  </Text>
                </View>

                {(!balanceData?.settlements || balanceData.settlements.length === 0) ? (
                  <View style={styles.detailEmptyCard}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>⚖️</Text>
                    <Text style={styles.detailEmptyTitle}>Tất cả đã cân bằng</Text>
                    <Text style={styles.detailEmptySub}>
                      Hiện tại không có thành viên nào nợ tiền nhau trong nhóm.
                    </Text>
                  </View>
                ) : (
                  balanceData.settlements.map((s, idx) => {
                    const isMyDebt = s.fromUserId === currentUser?.id;
                    return (
                      <View key={idx} style={styles.settleCard}>
                        <View style={styles.settleRowTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.settleFromText}>
                              <Text style={{ fontWeight: '800', color: '#0F172A' }}>{s.fromUserName}</Text> cần chuyển cho
                            </Text>
                            <Text style={styles.settleToText}>{s.toUserName}</Text>
                          </View>
                          <Text style={styles.settleAmountText}>{formatVND(s.amount)} ₫</Text>
                        </View>

                        {isMyDebt && (
                          <Pressable
                            onPress={() => handleSettleDebt(s.toUserId, s.amount, s.toUserName)}
                            style={styles.settleActionBtn}
                          >
                            <Text style={styles.settleActionBtnText}>Xác nhận đã trả nợ</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB: THÀNH VIÊN (MEMBERS - CHUẨN WEB HIỆN ĐẠI) */}
            {detailTab === 'MEMBERS' && (
              <View style={{ gap: 14 }}>
                {/* Banner Header Quản lý thành viên */}
                <View style={styles.memberHeaderCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberHeaderTitle}>Danh sách thành viên ({members.length})</Text>
                    <Text style={styles.memberHeaderSub}>
                      Quản lý quyền hạn và phân công chi tiêu trong nhóm
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSearchMemberQuery('');
                      setSearchResults([]);
                      setInviteModalVisible(true);
                    }}
                    style={styles.inviteMemberModernBtn}
                  >
                    <Text style={styles.inviteMemberModernBtnText}>+ Mời người mới</Text>
                  </Pressable>
                </View>

                {/* Danh sách thành viên card đẹp mắt */}
                <View style={{ gap: 10 }}>
                  {members.map((m) => {
                    const isOwner = m.role === 'OWNER';
                    const isAdmin = m.role === 'ADMIN';
                    const isSelf = m.userId === currentUser?.id;
                    const canManage = (selectedGroup.myRole === 'OWNER' || selectedGroup.myRole === 'ADMIN') && !isSelf && !isOwner;

                    return (
                      <View key={m.id} style={styles.modernMemberCard}>
                        {/* Avatar */}
                        <View
                          style={[
                            styles.modernMemberAvatar,
                            isOwner
                              ? { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }
                              : isAdmin
                              ? { backgroundColor: '#F3E8FF', borderColor: '#A855F7' }
                              : { backgroundColor: '#E8F8F0', borderColor: '#10B981' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modernMemberAvatarText,
                              isOwner
                                ? { color: '#B45309' }
                                : isAdmin
                                ? { color: '#7E22CE' }
                                : { color: '#047857' },
                            ]}
                          >
                            {(m.fullName || m.username || 'U').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.modernMemberName} numberOfLines={1}>
                              {m.fullName || m.username}
                            </Text>
                            {isSelf && (
                              <View style={styles.selfPill}>
                                <Text style={styles.selfPillText}>Bạn</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modernMemberEmail} numberOfLines={1}>
                            {m.email || 'Thành viên Finora'}
                          </Text>
                        </View>

                        {/* Role Badge */}
                        <View
                          style={[
                            styles.modernRoleBadge,
                            isOwner
                              ? { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }
                              : isAdmin
                              ? { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }
                              : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modernRoleBadgeText,
                              isOwner
                                ? { color: '#B45309' }
                                : isAdmin
                                ? { color: '#6B21A8' }
                                : { color: '#475569' },
                            ]}
                          >
                            {isOwner ? '👑 Trưởng nhóm' : isAdmin ? '⭐ Quản trị' : 'Thành viên'}
                          </Text>
                        </View>

                        {/* Nút xóa thành viên */}
                        {canManage && (
                          <Pressable
                            onPress={() => handleRemoveMember(m.userId, m.fullName || m.username || '')}
                            hitSlop={10}
                            style={styles.modernDeleteMemBtn}
                          >
                            <FinanceIcon name="close" size={13} color="#EF4444" />
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── NÚT THÊM GIAO DỊCH NỔI CỐ ĐỊNH Ở DƯỚI CÙNG CHO TAB THU & CHI ── */}
        {detailTab === 'EXPENSES' && (
          <View style={[styles.bottomStickyBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable
              onPress={() => setExpenseModalVisible(true)}
              style={styles.addTxFloatingFullBtn}
            >
              <FinanceIcon name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addTxFloatingFullBtnText}>Thêm giao dịch</Text>
            </Pressable>
          </View>
        )}

        {/* ── MODAL CHỌN KHOẢN CHI CHUNG (CHO NHÓM) ĐẶT NGAY TRONG VIEW CHI TIẾT ── */}
        <Modal visible={expenseModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.inputModalSheet, { maxHeight: '90%' }]}>
              <View style={styles.inputModalHeader}>
                <View>
                  <Text style={styles.inputModalTitle}>Thêm giao dịch nhóm</Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                    {selectedGroup?.groupType === 'FAMILY' || selectedGroup?.groupType === 'COUPLE'
                      ? 'Khoản chi tiêu chung của gia đình / cặp đôi'
                      : 'Khoản chi sẽ tự động chia đều cho các thành viên trong nhóm'}
                  </Text>
                </View>
                <Pressable onPress={() => setExpenseModalVisible(false)} hitSlop={10}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 1. Nội dung chi */}
                <Text style={styles.inputLabel}>Nội dung chi tiêu *</Text>
                <TextInput
                  value={expDescription}
                  onChangeText={setExpDescription}
                  placeholder="VD: Bữa tối BBQ, Mua đồ siêu thị, Tiền điện..."
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                />

                {/* 2. Số tiền */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Số tiền giao dịch (VNĐ) *</Text>
                  <Pressable
                    onPress={() => Keyboard.dismiss()}
                    hitSlop={10}
                    style={styles.keyboardDismissBtn}
                  >
                    <FinanceIcon name="download" size={13} color="#059669" />
                    <Text style={styles.keyboardDismissBtnText}>Ẩn bàn phím</Text>
                  </Pressable>
                </View>
                <TextInput
                  value={
                    expAmount ? new Intl.NumberFormat('vi-VN').format(parseInt(expAmount.replace(/\D/g, '') || '0', 10)) : ''
                  }
                  onChangeText={setExpAmount}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={[styles.textInput, { fontSize: 18, fontWeight: '800', color: '#E11D48' }]}
                />

                {/* 3. Nguồn tiền */}
                <Text style={styles.inputLabel}>Nguồn thanh toán *</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <Pressable
                    onPress={() => setExpPaymentSource('GROUP_FUND')}
                    style={[
                      styles.sourceSelectBtn,
                      expPaymentSource === 'GROUP_FUND' && styles.sourceSelectBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceSelectBtnText,
                        expPaymentSource === 'GROUP_FUND' && styles.sourceSelectBtnTextActive,
                      ]}
                    >
                      Quỹ chung của nhóm
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setExpPaymentSource('PERSONAL_ACCOUNT')}
                    style={[
                      styles.sourceSelectBtn,
                      expPaymentSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceSelectBtnText,
                        expPaymentSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectBtnTextActive,
                      ]}
                    >
                      Ví cá nhân của tôi
                    </Text>
                  </Pressable>
                </View>

                {/* Khối hiển thị nguồn tiền cố định chiều cao để không bị giật / nhảy UI */}
                <View style={{ marginBottom: 14 }}>
                  {expPaymentSource === 'GROUP_FUND' ? (
                    <View style={styles.dropdownSelectorCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.selectIconWrap, { backgroundColor: '#DCFCE7' }]}>
                          <FinanceIcon name="banknote" size={18} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownSelectorTitle} numberOfLines={1}>
                            Quỹ chung {selectedGroup?.name || 'nhóm'}
                          </Text>
                          <Text style={styles.dropdownSelectorSub}>
                            Số dư quỹ: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(fundData?.balance ?? 0)} đ</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={styles.sourceFundCheckBadge}>
                        <FinanceIcon name="check" size={14} color="#059669" />
                      </View>
                    </View>
                  ) : (
                    (() => {
                      const selAcc = personalAccounts.find((a) => a.id === expAccountId) || personalAccounts[0];
                      return (
                        <View>
                          <Pressable
                            onPress={() => setShowInlineAccountPicker((prev) => !prev)}
                            style={styles.dropdownSelectorCard}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                                <FinanceIcon name="wallet" size={18} color="#0284C7" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.dropdownSelectorTitle} numberOfLines={1}>
                                  {selAcc?.name || 'Chọn ví thanh toán'}
                                </Text>
                                <Text style={styles.dropdownSelectorSub}>
                                  Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(selAcc?.balance || 0)} đ</Text>
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.chevronIcon, showInlineAccountPicker && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
                          </Pressable>

                          {/* Bảng thả xuống chọn ví tích hợp trực tiếp ngay bên dưới */}
                          {showInlineAccountPicker && (
                            <View style={styles.inlinePickerDropdownContainer}>
                              <Text style={styles.inlinePickerHeaderTitle}>CHỌN VÍ THANH TOÁN</Text>
                              {personalAccounts.map((acc) => {
                                const isSelected = (expAccountId || selAcc?.id) === acc.id;
                                return (
                                  <Pressable
                                    key={acc.id}
                                    onPress={() => {
                                      setExpAccountId(acc.id);
                                      setShowInlineAccountPicker(false);
                                    }}
                                    style={[styles.inlinePickerRow, isSelected && styles.inlinePickerRowActive]}
                                  >
                                    <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                                      <FinanceIcon name="wallet" size={16} color="#0284C7" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.inlinePickerItemTitle, isSelected && styles.inlinePickerItemTitleActive]}>
                                        {acc.name}
                                      </Text>
                                      <Text style={styles.inlinePickerItemSub}>
                                        Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(acc.balance)} đ</Text>
                                      </Text>
                                    </View>
                                    {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })()
                  )}
                </View>

                {/* 4. Danh mục chi thả xuống (Dropdown selector tích hợp trực tiếp) */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Danh mục chi tiêu</Text>
                  {(() => {
                    const selCat = categoriesList.find((c) => c.id === expCategoryId) || categoriesList[0];
                    return (
                      <View>
                        <Pressable
                          onPress={() => setShowInlineCategoryPicker((prev) => !prev)}
                          style={styles.dropdownSelectorCard}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.selectIconWrap, { backgroundColor: '#FEE2E2' }]}>
                              <FinanceIcon
                                name={resolveCategoryIconName(selCat?.icon, 'EXPENSE', selCat?.name)}
                                size={18}
                                color="#E11D48"
                              />
                            </View>
                            <Text style={styles.dropdownSelectorTitle}>
                              {selCat?.name || 'Chọn danh mục chi'}
                            </Text>
                          </View>
                          <Text style={[styles.chevronIcon, showInlineCategoryPicker && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
                        </Pressable>

                        {/* Bảng thả xuống chọn danh mục tích hợp trực tiếp */}
                        {showInlineCategoryPicker && (
                          <View style={styles.inlinePickerDropdownContainer}>
                            <Text style={styles.inlinePickerHeaderTitle}>CHỌN DANH MỤC CHI TIÊU</Text>
                            <View style={{ maxHeight: 260 }}>
                              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                {categoriesList.map((cat) => {
                                  const isSelected = (expCategoryId || selCat?.id) === cat.id;
                                  return (
                                    <Pressable
                                      key={cat.id}
                                      onPress={() => {
                                        setExpCategoryId(cat.id);
                                        setShowInlineCategoryPicker(false);
                                      }}
                                      style={[styles.inlinePickerRow, isSelected && styles.inlinePickerRowActive]}
                                    >
                                      <View style={[styles.catCircleIconWrap, { backgroundColor: '#FEE2E2', width: 32, height: 32 }]}>
                                        <FinanceIcon
                                          name={resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name)}
                                          size={16}
                                          color="#E11D48"
                                        />
                                      </View>
                                      <Text style={[styles.inlinePickerItemTitle, isSelected && styles.inlinePickerItemTitleActive, { flex: 1 }]}>
                                        {cat.name}
                                      </Text>
                                      {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                                    </Pressable>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </View>

                {/* 5. Thời gian giao dịch (Toggle Giờ trước - Ngày sau chuẩn AddTransactionScreen) */}
                <View style={{ marginBottom: 14 }}>
                  <View style={styles.timeSwitchHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Thời gian giao dịch</Text>
                      <Text style={styles.timeSubLabel}>
                        {isCustomDateTime ? 'Đang chỉnh giờ & ngày thủ công' : `Tự động: ${expTime} hôm nay`}
                      </Text>
                    </View>
                    <Switch
                      value={isCustomDateTime}
                      onValueChange={setIsCustomDateTime}
                      trackColor={{ false: '#CBD5E1', true: '#00A86B' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {isCustomDateTime && (
                    <View style={styles.timeDateRow}>
                      {/* Giờ trước */}
                      <View style={styles.timeCol}>
                        <Text style={styles.microLabel}>Giờ thực hiện</Text>
                        <TextInput
                          value={expTime}
                          onChangeText={setExpTime}
                          placeholder="HH:mm"
                          style={styles.timeDateInput}
                        />
                      </View>

                      {/* Ngày sau */}
                      <View style={styles.dateCol}>
                        <Text style={styles.microLabel}>Ngày giao dịch</Text>
                        <TextInput
                          value={expDate}
                          onChangeText={setExpDate}
                          placeholder="DD/MM/YYYY"
                          style={styles.timeDateInput}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* 6. Ghi chú */}
                <Text style={styles.inputLabel}>Ghi chú (Tùy chọn)</Text>
                <TextInput
                  value={expNotes}
                  onChangeText={setExpNotes}
                  placeholder="Thêm mô tả, phân công hoặc địa điểm..."
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                />

                <Pressable
                  onPress={handleAddExpense}
                  disabled={submittingExpense}
                  style={[styles.submitActionBtn, submittingExpense && styles.disabled]}
                >
                  {submittingExpense ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitActionBtnText}>Lưu giao dịch</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL CHỌN DANH MỤC THẢ XUỐNG DỌC (VERTICAL BOTTOM SHEET) ── */}
        <Modal visible={categoryPickerModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalTopBar}>
                <Text style={styles.modalTopTitle}>Chọn danh mục chi tiêu</Text>
                <Pressable onPress={() => setCategoryPickerModalVisible(false)} hitSlop={10}>
                  <Text style={styles.modalCloseText}>Đóng</Text>
                </Pressable>
              </View>
              <ScrollView style={{ paddingHorizontal: 16, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {categoriesList.map((cat) => {
                  const isSelected = expCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setExpCategoryId(cat.id);
                        setCategoryPickerModalVisible(false);
                      }}
                      style={[styles.categoryOptionRow, isSelected && styles.categoryOptionRowActive]}
                    >
                      <View style={[styles.catCircleIconWrap, { backgroundColor: '#FEE2E2' }]}>
                        <FinanceIcon
                          name={resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name)}
                          size={18}
                          color="#E11D48"
                        />
                      </View>
                      <Text style={[styles.categoryOptionLabel, isSelected && styles.categoryOptionLabelActive]}>
                        {cat.name}
                      </Text>
                      {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL CHỌN VÍ CÁ NHÂN KÈM SỐ DƯ KHẢ DỤNG ── */}
        <Modal visible={accountPickerModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalTopBar}>
                <Text style={styles.modalTopTitle}>Chọn ví thanh toán</Text>
                <Pressable onPress={() => setAccountPickerModalVisible(false)} hitSlop={10}>
                  <Text style={styles.modalCloseText}>Đóng</Text>
                </Pressable>
              </View>
              <ScrollView style={{ paddingHorizontal: 16, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {personalAccounts.map((acc) => {
                  const isSelected = expAccountId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setExpAccountId(acc.id);
                        setAccountPickerModalVisible(false);
                      }}
                      style={[styles.accountOptionRow, isSelected && styles.accountOptionRowActive]}
                    >
                      <View style={[styles.catCircleIconWrap, { backgroundColor: '#E0F2FE' }]}>
                        <FinanceIcon name="wallet" size={18} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountOptionName, isSelected && styles.accountOptionNameActive]}>
                          {acc.name}
                        </Text>
                        <Text style={styles.accountOptionBalance}>
                          Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(acc.balance)} đ</Text>
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL CHỌN THÁNG / KỲ BÁO CÁO (THẢ XUỐNG CHUẨN VÍ) ── */}
        <Modal visible={monthModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalTopBar}>
                <Text style={styles.modalTopTitle}>Chọn kỳ báo cáo / Tháng</Text>
                <Pressable onPress={() => setMonthModalVisible(false)} hitSlop={10}>
                  <Text style={styles.modalCloseText}>Đóng</Text>
                </Pressable>
              </View>
              <ScrollView style={{ paddingHorizontal: 16, maxHeight: 420 }}>
                {availableMonths.map((m) => {
                  const isSelected = selectedMonth === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => {
                        setSelectedMonth(m.key);
                        setMonthModalVisible(false);
                      }}
                      style={[styles.monthOptionRow, isSelected && styles.monthOptionRowActive]}
                    >
                      <Text style={[styles.monthOptionLabel, isSelected && styles.monthOptionLabelActive]}>
                        {m.label}
                      </Text>
                      {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL ACTIONS CHO BÌNH LUẬN (BOTTOM SHEET 3 CHẤM) ── */}
        <Modal visible={!!commentActionMenuTarget} transparent animationType="fade">
          <Pressable
            style={styles.actionMenuModalOverlay}
            onPress={() => setCommentActionMenuTarget(null)}
          >
            <View style={styles.actionMenuModalSheet}>
              {commentActionMenuTarget && (() => {
                const { targetId, comment } = commentActionMenuTarget;
                const isMine = comment.userId === currentUser?.id;
                const authorName = comment.user?.fullName || 'Thành viên';

                return (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.actionMenuSheetTitle} numberOfLines={1}>
                      Bình luận của {authorName}
                    </Text>

                    {/* Trả lời */}
                    <Pressable
                      onPress={() => {
                        setCommentActionMenuTarget(null);
                        setReplyingToCommentId((prev) => ({ ...prev, [targetId]: comment.id }));
                        setInlineCommentText((prev) => ({ ...prev, [targetId]: `@${authorName} ` }));
                      }}
                      style={styles.actionMenuItemRow}
                    >
                      <FinanceIcon name="reply" size={18} color="#059669" />
                      <Text style={styles.actionMenuItemText}>Trả lời bình luận</Text>
                    </Pressable>

                    {/* Sửa nếu là của mình */}
                    {isMine && (
                      <Pressable
                        onPress={() => {
                          setCommentActionMenuTarget(null);
                          setEditingComment({ targetId, comment });
                          setEditingCommentContent(comment.content);
                        }}
                        style={styles.actionMenuItemRow}
                      >
                        <FinanceIcon name="edit" size={18} color="#0284C7" />
                        <Text style={styles.actionMenuItemText}>Chỉnh sửa bình luận</Text>
                      </Pressable>
                    )}

                    {/* Xóa nếu là của mình hoặc là chủ nhóm */}
                    {(isMine || selectedGroup?.myRole === 'OWNER' || selectedGroup?.myRole === 'ADMIN') && (
                      <Pressable
                        onPress={() => {
                          setCommentActionMenuTarget(null);
                          handleDeleteCommentConfirm(targetId, comment.id);
                        }}
                        style={styles.actionMenuItemRow}
                      >
                        <FinanceIcon name="trash" size={18} color="#EF4444" />
                        <Text style={[styles.actionMenuItemText, { color: '#EF4444' }]}>Xóa bình luận</Text>
                      </Pressable>
                    )}

                    {/* Hủy */}
                    <Pressable
                      onPress={() => setCommentActionMenuTarget(null)}
                      style={[styles.actionMenuItemRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4 }]}
                    >
                      <Text style={[styles.actionMenuItemText, { textAlign: 'center', flex: 1, color: '#64748B' }]}>
                        Đóng
                      </Text>
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          </Pressable>
        </Modal>

        {/* ── MODAL SỬA BÌNH LUẬN ── */}
        <Modal visible={!!editingComment} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.inputModalSheet}>
              <View style={styles.inputModalHeader}>
                <Text style={styles.inputModalTitle}>Chỉnh sửa bình luận</Text>
                <Pressable onPress={() => setEditingComment(null)} hitSlop={10}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <TextInput
                value={editingCommentContent}
                onChangeText={setEditingCommentContent}
                multiline
                placeholder="Nhập nội dung mới..."
                placeholderTextColor="#94A3B8"
                style={[styles.textInput, { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }]}
              />

              <Pressable
                onPress={handleSaveEditComment}
                style={[styles.submitActionBtn, { marginTop: 12 }]}
              >
                <Text style={styles.submitActionBtnText}>Lưu chỉnh sửa</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── MODAL CHI TIẾT GIAO DỊCH (CHUẨN DESIGN ẢNH MẪU) ── */}
        <Modal visible={!!viewingExpense} transparent animationType="slide">
          <View style={styles.detailTxModalOverlay}>
            <View style={[styles.detailTxModalContainer, { paddingTop: Math.max(insets.top, 14) + 8 }]}>
              {/* Header Modal */}
              <View style={styles.detailTxHeaderRow}>
                <Pressable onPress={() => setViewingExpense(null)} hitSlop={12} style={styles.detailTxBackBtn}>
                  <Text style={styles.detailModernBackArrow}>‹</Text>
                </Pressable>
                <Text style={styles.detailTxHeaderTitle}>Chi tiết giao dịch</Text>
                <Pressable hitSlop={12} style={styles.detailTxOptionBtn}>
                  <Text style={{ fontSize: 18, color: '#059669', fontWeight: '900' }}>···</Text>
                </Pressable>
              </View>

              {viewingExpense && (() => {
                const exp = viewingExpense;
                const catName = exp.category?.name || 'Chi tiêu';
                const iconName = resolveCategoryIconName(undefined, 'EXPENSE', `${exp.description} ${catName}`);
                let iconBg = '#FEF3C7';
                let iconColor = '#D97706';
                if (iconName === 'droplet') { iconBg = '#E0F2FE'; iconColor = '#0284C7'; }
                else if (iconName === 'shopping-cart') { iconBg = '#FFE4E6'; iconColor = '#E11D48'; }

                const payerName = exp.payer?.fullName || (exp.paidByUserId === currentUser?.id ? 'Bạn' : null) || members.find((m) => m.userId === exp.paidByUserId)?.user?.fullName || 'Thành viên';
                const comments = commentsByTarget[exp.id] || [];
                const cmtInput = inlineCommentText[exp.id] || '';

                // Phân chia chi phí thực tế từ splits
                const splitsList = exp.splits && exp.splits.length > 0
                  ? exp.splits.map((s) => ({
                      userId: s.userId,
                      name: s.userId === currentUser?.id ? 'Bạn' : (s.userName || members.find((m) => m.userId === s.userId)?.user?.fullName || 'Thành viên'),
                      amount: s.amount,
                    }))
                  : members.map((m) => ({
                      userId: m.userId,
                      name: m.userId === currentUser?.id ? 'Bạn' : (m.user?.fullName || m.nickname || 'Thành viên'),
                      amount: Math.round(exp.amount / Math.max(1, members.length)),
                    }));

                return (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 80, gap: 18 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* CARD 1: THÔNG TIN GIAO DỊCH CHÍNH */}
                    <View style={styles.txDetailMainCard}>
                      <View style={styles.txDetailTopRow}>
                        <View style={[styles.unifiedTxIconCircle, { backgroundColor: iconBg }]}>
                          <FinanceIcon name={iconName} size={20} color={iconColor} />
                        </View>
                        <Text style={styles.txDetailMainTitle} numberOfLines={1}>{exp.description}</Text>
                        <Text style={styles.txDetailMainAmount}>-{formatVND(exp.amount)} đ</Text>
                      </View>

                      <View style={styles.txDetailDivider} />

                      <View style={styles.txDetailInfoTable}>
                        {/* Danh mục */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="grid" size={15} color="#64748B" />
                            <Text style={styles.txDetailInfoLabel}>Danh mục</Text>
                          </View>
                          <View style={styles.txDetailCategoryPill}>
                            <Text style={styles.txDetailCategoryPillText}>{catName}</Text>
                          </View>
                        </View>

                        {/* Thời gian */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="calendar" size={15} color="#64748B" />
                            <Text style={styles.txDetailInfoLabel}>Thời gian</Text>
                          </View>
                          <Text style={styles.txDetailInfoValue}>
                            {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                          </Text>
                        </View>

                        {/* Người tạo */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="user" size={15} color="#64748B" />
                            <Text style={styles.txDetailInfoLabel}>Người tạo</Text>
                          </View>
                          <View style={styles.txDetailPayerRow}>
                            <View style={styles.txDetailSmallAvatar}>
                              <Text style={styles.txDetailSmallAvatarText}>
                                {payerName.slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.txDetailPayerName}>{payerName}</Text>
                          </View>
                        </View>

                        {/* Nguồn ví thanh toán: Bảo mật thông tin riêng tư, chỉ hiện Quỹ nhóm hoặc Ví cá nhân */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon
                              name={exp.paymentSource === 'GROUP_FUND' ? 'banknote' : 'wallet'}
                              size={15}
                              color="#64748B"
                            />
                            <Text style={styles.txDetailInfoLabel}>Nguồn tiền</Text>
                          </View>
                          <View
                            style={[
                              styles.txDetailSourceBadge,
                              exp.paymentSource === 'GROUP_FUND'
                                ? { backgroundColor: '#E8F8F0', borderColor: '#A7F3D0' }
                                : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.txDetailSourceBadgeText,
                                exp.paymentSource === 'GROUP_FUND' ? { color: '#059669' } : { color: '#475569' },
                              ]}
                            >
                              {exp.paymentSource === 'GROUP_FUND' ? 'Quỹ nhóm' : 'Ví cá nhân'}
                            </Text>
                          </View>
                        </View>

                        {/* Ghi chú */}
                        {exp.notes ? (
                          <View style={styles.txDetailNotesBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <FinanceIcon name="edit" size={14} color="#64748B" />
                              <Text style={styles.txDetailNotesLabel}>Ghi chú</Text>
                            </View>
                            <Text style={styles.txDetailNotesText}>{exp.notes}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* CARD 2: PHÂN CHIA CHI PHÍ (Ẩn đối với nhóm Gia đình FAMILY và Cặp đôi COUPLE) */}
                    {selectedGroup?.groupType !== 'FAMILY' && selectedGroup?.groupType !== 'COUPLE' && (
                      <View style={styles.txSplitSection}>
                        <View style={styles.txSplitHeaderRow}>
                          <Text style={styles.txSplitSectionTitle}>Phân chia chi phí</Text>
                          <View style={styles.txSplitMethodBadge}>
                            <Text style={styles.txSplitMethodBadgeText}>Chia đều</Text>
                          </View>
                        </View>

                        <View style={styles.txSplitListCard}>
                          {splitsList.map((s, idx) => (
                            <View
                              key={s.userId || idx}
                              style={[
                                styles.txSplitMemberRow,
                                idx < splitsList.length - 1 && styles.unifiedTxItemBorder,
                              ]}
                            >
                              <View style={styles.txSplitAvatarCircle}>
                                <Text style={styles.txSplitAvatarText}>
                                  {s.name.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                              <Text style={styles.txSplitMemberName}>{s.name}</Text>
                              <Text style={styles.txSplitAmount}>{formatVND(s.amount)} đ</Text>
                              <View style={styles.txSplitCheckCircle}>
                                <FinanceIcon name="check" size={12} color="#FFFFFF" />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* CARD 3: BÌNH LUẬN (THEO CHUẨN DESIGN MẪU) */}
                    <View style={styles.txCommentSection}>
                      <Text style={styles.txCommentSectionTitle}>Bình luận ({comments.length})</Text>

                      <View style={{ gap: 10 }}>
                        {comments.length === 0 ? (
                          <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                          </Text>
                        ) : (
                          comments.map((c) => {
                            const isMe = c.userId === currentUser?.id;
                            const authorName = c.user?.fullName || (isMe ? 'Bạn' : 'Thành viên');
                            const rawAvatar = c.user?.avatarUrl || c.user?.avatarKey || (isMe ? currentUser?.avatarUrl : null);
                            const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;
                            const parent = c.parentCommentId ? comments.find((p) => p.id === c.parentCommentId) : null;
                            const isEdited = !!(c.updatedAt && c.createdAt && new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime() + 1000);

                            const timeStr = c.createdAt
                              ? new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : 'Vừa xong';

                            const likeInfo = commentLikes[c.id] || { count: 0, liked: false };

                            return (
                              <View key={c.id} style={[styles.commentMockCard, parent ? { marginLeft: 28 } : null]}>
                                <View style={styles.commentMockHeader}>
                                  {/* Avatar thực tế của người dùng */}
                                  <View style={styles.commentMockAvatar}>
                                    {avatarUri ? (
                                      <Image source={{ uri: avatarUri }} style={styles.commentMockAvatarImg} />
                                    ) : (
                                      <Text style={styles.commentMockAvatarText}>
                                        {authorName.slice(0, 1).toUpperCase()}
                                      </Text>
                                    )}
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    {/* Hàng tên tác giả + giờ ngày + nút ... */}
                                    <View style={styles.commentAuthorRow}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                        <Text style={styles.commentMockAuthor}>{authorName}</Text>
                                        <Text style={styles.commentMockTimeDot}>•</Text>
                                        <Text style={styles.commentMockTimeText}>{timeStr}</Text>
                                        {isEdited && (
                                          <Text style={styles.commentEditedTag}>(đã sửa)</Text>
                                        )}
                                      </View>

                                      {/* Nút 3 chấm dọc cho bình luận */}
                                      <Pressable
                                        onPress={() => setCommentActionMenuTarget({ targetId: exp.id, comment: c })}
                                        hitSlop={8}
                                        style={styles.commentMoreOptionBtn}
                                      >
                                        <Text style={styles.commentMoreOptionIcon}>⋮</Text>
                                      </Pressable>
                                    </View>

                                    {/* Nội dung bình luận */}
                                    <Text style={styles.commentMockContent}>
                                      {parent && (
                                        <Text style={{ color: '#059669', fontWeight: '700' }}>
                                          @{parent.user?.fullName || 'Người dùng'}{' '}
                                        </Text>
                                      )}
                                      {c.content}
                                    </Text>

                                    {/* Hàng hành động: Nút Like + Nút Trả lời */}
                                    <View style={styles.commentActionFooterRow}>
                                      <Pressable
                                        onPress={() => handleToggleLikeComment(c.id)}
                                        style={[
                                          styles.commentLikeBtn,
                                          likeInfo.liked && styles.commentLikeBtnActive,
                                        ]}
                                        hitSlop={6}
                                      >
                                        <FinanceIcon
                                          name="thumbs-up"
                                          size={13}
                                          color={likeInfo.liked ? '#16A34A' : '#64748B'}
                                        />
                                        {likeInfo.count > 0 && (
                                          <Text
                                            style={[
                                              styles.commentLikeCountText,
                                              likeInfo.liked && styles.commentLikeCountTextActive,
                                            ]}
                                          >
                                            {likeInfo.count}
                                          </Text>
                                        )}
                                      </Pressable>

                                      <Pressable
                                        onPress={() => {
                                          setReplyingToCommentId((prev) => ({ ...prev, [exp.id]: c.id }));
                                          setInlineCommentText((prev) => ({
                                            ...prev,
                                            [exp.id]: `@${authorName} `,
                                          }));
                                        }}
                                        style={styles.commentReplyBtn}
                                        hitSlop={6}
                                      >
                                        <Text style={styles.commentReplyBtnText}>Trả lời</Text>
                                      </Pressable>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  </ScrollView>
                );
              })()}

              {/* Khung chat bình luận dưới cùng modal chi tiết */}
              {viewingExpense && (
                <View style={[styles.detailTxBottomInputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  {replyingToCommentId[viewingExpense.id] && (
                    <View style={styles.replyingNoticeBar}>
                      <Text style={styles.replyingNoticeText}>Đang trả lời bình luận...</Text>
                      <Pressable
                        onPress={() => {
                          setReplyingToCommentId((prev) => ({ ...prev, [viewingExpense.id]: null }));
                          setInlineCommentText((prev) => ({ ...prev, [viewingExpense.id]: '' }));
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.replyingCancelText}>✕ Hủy</Text>
                      </Pressable>
                    </View>
                  )}
                  <View style={styles.detailTxInputWrapper}>
                    <TextInput
                      style={styles.detailTxTextInput}
                      placeholder={replyingToCommentId[viewingExpense.id] ? 'Viết câu trả lời...' : 'Viết bình luận...'}
                      placeholderTextColor="#94A3B8"
                      value={inlineCommentText[viewingExpense.id] || ''}
                      onChangeText={(val) =>
                        setInlineCommentText((prev) => ({ ...prev, [viewingExpense.id]: val }))
                      }
                    />
                    <Pressable
                      onPress={() => handleSendComment(viewingExpense.id)}
                      style={styles.detailTxSendBtn}
                    >
                      <FinanceIcon name="send" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── 1. HEADER XANH RỪNG PHỦ TRÀN TAI THỎ ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Nhóm & Quỹ chung</Text>
          <Text style={styles.headerSub}>Quản lý chi tiêu gia đình, bạn cùng phòng & du lịch</Text>
        </View>
        <Pressable
          onPress={() => setCreateModalVisible(true)}
          style={({ pressed }) => [styles.createGroupBtn, pressed && styles.pressed]}
        >
          <Text style={styles.createGroupBtnText}>+ Tạo nhóm</Text>
        </Pressable>
      </View>

      {/* ── 2. FILTER PILLS (Tất cả (5), Của tôi (3), Đã tham gia (2)) CHUẨN DESIGN ── */}
      <View style={styles.filterPillsRow}>
        <Pressable
          onPress={() => setActiveFilterTab('ALL')}
          style={[styles.filterPill, activeFilterTab === 'ALL' && styles.filterPillActive]}
        >
          <Text style={[styles.filterPillText, activeFilterTab === 'ALL' && styles.filterPillTextActive]}>
            Tất cả ({groups.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilterTab('MY_GROUPS')}
          style={[styles.filterPill, activeFilterTab === 'MY_GROUPS' && styles.filterPillActive]}
        >
          <Text style={[styles.filterPillText, activeFilterTab === 'MY_GROUPS' && styles.filterPillTextActive]}>
            Của tôi ({myGroupsCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilterTab('JOINED')}
          style={[styles.filterPill, activeFilterTab === 'JOINED' && styles.filterPillActive]}
        >
          <Text style={[styles.filterPillText, activeFilterTab === 'JOINED' && styles.filterPillTextActive]}>
            Đã tham gia ({joinedGroupsCount})
          </Text>
        </Pressable>
      </View>

      {/* ── 3. DANH SÁCH NHÓM ── */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={styles.centerLoadingText}>Đang nạp danh sách nhóm...</Text>
        </View>
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>Chưa có nhóm nào trong mục này</Text>
          <Text style={styles.emptySub}>
            Tạo nhóm cho gia đình, hội bạn thân hoặc chuyến du lịch để tự động chia tiền sòng phẳng.
          </Text>
          <Pressable onPress={() => setCreateModalVisible(true)} style={styles.emptyActionBtn}>
            <Text style={styles.emptyActionBtnText}>+ Tạo nhóm mới</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadGroups(true)}
              colors={['#00A86B']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const typeInfo = GROUP_TYPE_MAP[item.groupType] || GROUP_TYPE_MAP.OTHER;
            const isOwner = item.myRole === 'OWNER' || (currentUser && item.ownerId === currentUser.id);
            const lastMsg = lastMessageMap[item.id];
            const unread = lastMsg?.unreadCount || item.unreadMessageCount || 0;

            return (
              <Pressable
                onPress={() => handleOpenGroupDetail(item)}
                style={({ pressed }) => [styles.modernChatGroupCard, pressed && styles.cardPressed]}
              >
                {/* Avatar Icon tròn lớn 3D bên trái */}
                <View style={styles.modernGroupAvatar}>
                  {typeInfo.imageSource ? (
                    <Image
                      source={typeInfo.imageSource}
                      style={styles.modernGroupAvatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <FinanceIcon name={typeInfo.iconName} size={28} color={typeInfo.color} />
                  )}
                </View>

                {/* Nội dung trung tâm */}
                <View style={styles.modernGroupInfoCenter}>
                  {/* Hàng 1: Tên nhóm + Thời gian */}
                  <View style={styles.modernGroupHeaderLine}>
                    <View style={styles.modernGroupNameWrap}>
                      <Text style={styles.modernGroupName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <Text style={styles.modernLastTimeText}>
                      {lastMsg?.time || 'Hôm nay'}
                    </Text>
                  </View>

                  {/* Hàng 2: Số thành viên • Tag loại nhóm */}
                  <View style={styles.modernSublineRow}>
                    <Text style={styles.modernMemberCountText}>
                      {item.memberCount || 1} thành viên
                    </Text>
                    <Text style={styles.modernDotSep}>•</Text>
                    <View style={[styles.modernTypeBadgePill, { backgroundColor: typeInfo.bg }]}>
                      <Text style={[styles.modernTypeBadgeText, { color: typeInfo.color }]}>
                        {typeInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Hàng 3: Tin nhắn chat gần nhất + Badge tin nhắn chưa đọc màu xanh */}
                  <View style={styles.modernLastMsgRow}>
                    <Text style={styles.modernLastMsgText} numberOfLines={1}>
                      {lastMsg?.senderName ? `${lastMsg.senderName}: ` : ''}
                      {lastMsg?.content || item.description || 'Chạm để xem chi tiêu và tin nhắn'}
                    </Text>

                    {unread > 0 && (
                      <View style={styles.modernUnreadBadge}>
                        <Text style={styles.modernUnreadBadgeText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* ── 5. MODAL TẠO NHÓM MỚI ── */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inputModalSheet}>
            <View style={styles.inputModalHeader}>
              <Text style={styles.inputModalTitle}>Tạo nhóm tài chính mới</Text>
              <Pressable onPress={() => setCreateModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên nhóm *</Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Ví dụ: Gia đình nhỏ, Chuyến đi Đà Lạt..."
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Loại nhóm *</Text>
              <View style={styles.typeGridRow}>
                {(['FAMILY', 'ROOMMATE', 'TRAVEL', 'PROJECT', 'COUPLE'] as GroupType[]).map((t) => {
                  const info = GROUP_TYPE_MAP[t];
                  const isSelected = newGroupType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setNewGroupType(t)}
                      style={[styles.typeSelectCard, isSelected && styles.typeSelectCardActive]}
                    >
                      {info.imageSource ? (
                        <Image
                          source={info.imageSource}
                          style={styles.typeSelectIconImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <FinanceIcon name={info.iconName} size={24} color={isSelected ? '#006747' : '#64748B'} />
                      )}
                      <Text
                        style={[
                          styles.typeSelectCardText,
                          isSelected && styles.typeSelectCardTextActive,
                        ]}
                      >
                        {info.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Mô tả nhóm (Tùy chọn)</Text>
              <TextInput
                value={newGroupDesc}
                onChangeText={setNewGroupDesc}
                placeholder="Mục đích chi tiêu, quỹ ăn uống..."
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Pressable
                onPress={handleCreateGroup}
                disabled={submittingGroup}
                style={[styles.submitActionBtn, submittingGroup && styles.disabled]}
              >
                {submittingGroup ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitActionBtnText}>Tạo nhóm ngay</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 7. MODAL MỜI THÀNH VIÊN (TÌM KIẾM THEO EMAIL/TÊN) ── */}
      <Modal visible={inviteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inputModalSheet}>
            <View style={styles.inputModalHeader}>
              <Text style={styles.inputModalTitle}>Mời thành viên vào nhóm</Text>
              <Pressable onPress={() => setInviteModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              value={searchMemberQuery}
              onChangeText={handleSearchUsers}
              placeholder="Nhập email hoặc tên người dùng..."
              placeholderTextColor="#94A3B8"
              style={[styles.textInput, { marginBottom: 12 }]}
            />

            {searchingUser ? (
              <ActivityIndicator color="#00A86B" style={{ marginVertical: 20 }} />
            ) : searchResults.length > 0 ? (
              <View style={{ maxHeight: 220 }}>
                {searchResults.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => handleInviteUser(u)}
                    style={styles.searchUserItem}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(u.fullName || 'U').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{u.fullName}</Text>
                      <Text style={styles.memberEmail}>{u.email}</Text>
                    </View>
                    <Text style={styles.inviteActionLabel}>Mời +</Text>
                  </Pressable>
                ))}
              </View>
            ) : searchMemberQuery.trim().length >= 2 ? (
              <Text style={styles.noUserFoundText}>Không tìm thấy người dùng phù hợp</Text>
            ) : (
              <Text style={styles.searchHintText}>
                Nhập ít nhất 2 ký tự để tìm kiếm thành viên trong hệ thống Finora
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  /* ── 2. FILTER PILLS STYLE (TẤT CẢ, CỦA TÔI, ĐÃ THAM GIA) ── */
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: '#00A86B',
    borderColor: '#00A86B',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* ── CARD DANH SÁCH NHÓM CHUẨN DESIGN MỚI ── */
  modernChatGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  modernGroupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modernGroupAvatarImg: {
    width: '100%',
    height: '100%',
  },
  modernGroupInfoCenter: {
    flex: 1,
  },
  modernGroupHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modernGroupNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  modernGroupName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  modernLastTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modernSublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modernMemberCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modernDotSep: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modernTypeBadgePill: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
  },
  modernTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  modernLastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modernLastMsgText: {
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
  },
  modernUnreadBadge: {
    backgroundColor: '#00A86B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  header: {
    backgroundColor: '#074838',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  createGroupBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  createGroupBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  smartShareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIconText: {
    fontSize: 18,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  centerLoadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#074838',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 14,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: 22,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  memberCountBadge: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 6,
  },
  groupDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  groupCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  totalExpText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  roleTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  /* ── CHI TIẾT NHÓM FULL SCREEN (HEADER MỚI THEO MẪU) ── */
  detailScreenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailScreenHeaderModern: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailModernBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModernBackArrow: {
    fontSize: 26,
    color: '#059669',
    fontWeight: '700',
    marginTop: -2,
  },
  detailModernHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 10,
  },
  detailGroupHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  detailModernTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailModernSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  detailHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailActionCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScreenHeader: {
    backgroundColor: '#074838',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBackArrow: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    marginTop: -2,
  },
  detailHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  detailScreenTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailScreenSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11.5,
    marginTop: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  /* ── TABS CHUẨN DESIGN THEO ẢNH MẪU ── */
  tabsScrollWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTabsScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 0,
    gap: 4,
  },
  detailTabItemUnderline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: 'relative',
  },
  detailTabItemUnderlineActive: {},
  detailTabItemTextClean: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailTabItemTextCleanActive: {
    color: '#0E964E',
    fontWeight: '800',
  },
  detailActiveIndicatorLine: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: '#0E964E',
    borderRadius: 2,
  },
  detailTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabItemActive: {
    borderBottomColor: '#074838',
  },
  detailTabItemText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  detailTabItemTextActive: {
    color: '#074838',
  },
  detailLoadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  detailLoadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  detailScrollContent: {
    padding: 18,
  },
  /* ── THANH CHỌN THÁNG THEO MOCKUP THU & CHI ── */
  monthPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthPillNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── THANH CHỌN BỘ LỌC (TẤT CẢ | THU | CHI) & BỘ CHỌN THÁNG THEO MẪU ── */
  filterAndMonthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segmentedFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    padding: 3,
  },
  segmentedFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  segmentedFilterBtnActive: {
    backgroundColor: '#0E964E',
  },
  segmentedFilterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentedFilterTextActive: {
    color: '#FFFFFF',
  },
  monthPillRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthCompactNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCompactNavArrow: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669',
    lineHeight: 18,
  },
  monthPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  monthPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  /* Nút chọn tháng thả xuống chuẩn như tab Giao dịch / Ví */
  monthDropdownPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  monthDropdownPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthDropdownChevron: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    marginTop: -2,
  },
  /* Modal danh sách chọn tháng thả xuống (Bottom Sheet) */
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 26,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A86B',
  },
  monthOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  monthOptionRowActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  monthOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthOptionLabelActive: {
    color: '#00A86B',
    fontWeight: '800',
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00A86B',
  },
  filterSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── BẢNG TỔNG HỢP 3 THẺ: TỔNG THU - TỔNG CHI - CÒN LẠI ── */
  summary3Container: {
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBoxHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  summaryBoxIncomeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryBoxExpenseValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#C5221F',
  },

  /* ── DANH SÁCH GIAO DỊCH ── */
  txSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  txSectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateGroupContainer: {
    gap: 6,
  },
  dateBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  dateBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  txItemsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  unifiedTxItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  unifiedTxItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  unifiedTxIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedTxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  unifiedTxSub: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  unifiedTxRightWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  unifiedTxAmount: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  unifiedTxAmountIncome: {
    color: '#16A34A',
  },
  unifiedTxAmountExpense: {
    color: '#E11D48',
  },
  commentCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  commentCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  commentInlineDropdown: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    marginTop: -4,
  },
  commentTinyBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    paddingHorizontal: 8,
  },
  commentTinyAuthor: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  commentTinyContent: {
    fontSize: 11.5,
    color: '#334155',
    marginTop: 1,
  },
  addTxFloatingFullBtn: {
    backgroundColor: '#0E964E',
    borderRadius: 24,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  addTxFloatingFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  /* ── CHI TIẾT GIAO DỊCH MODAL (CHUẨN ẢNH MẪU) ── */
  detailTxModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  detailTxModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailTxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTxBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTxHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailTxOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetailMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  txDetailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txDetailMainTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  txDetailMainAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#E11D48',
  },
  txDetailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  txDetailInfoTable: {
    gap: 12,
  },
  txDetailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txDetailInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDetailInfoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  txDetailCategoryPill: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  txDetailCategoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DB2777',
  },
  txDetailInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  txDetailPayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDetailSmallAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetailSmallAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  txDetailPayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  txDetailNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  txDetailSourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  txDetailSourceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sourceFundCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetailNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  txDetailNotesText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  txSplitSection: {
    gap: 10,
  },
  txSplitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txSplitSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  txSplitMethodBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  txSplitMethodBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  txSplitListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txSplitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  txSplitAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txSplitAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  txSplitMemberName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  txSplitAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 6,
  },
  txSplitCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCommentSection: {
    gap: 10,
  },
  txCommentSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  commentMockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  commentMockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentMockAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentMockAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  commentMockAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DB2777',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentMockAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  commentMockTimeDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentMockTimeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  commentEditedTag: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  commentMoreOptionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  commentMoreOptionIcon: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  commentMockContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  commentActionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  commentLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  commentLikeBtnActive: {
    opacity: 1,
  },
  commentLikeCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  commentLikeCountTextActive: {
    color: '#16A34A',
    fontWeight: '800',
  },
  commentReplyBtn: {
    paddingVertical: 2,
  },
  commentReplyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  replyingNoticeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  replyingNoticeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  replyingCancelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionMenuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionMenuModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  actionMenuSheetTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  actionMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionMenuItemText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailTxBottomInputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  detailTxInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  detailTxTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 6,
  },
  detailTxSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0E964E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── THANH CHỌN THÁNG CŨ ── */
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavArrow: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    lineHeight: 22,
  },
  monthSelectorTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  /* ── OVERVIEW STYLES (CHUẨN DESIGN MỚI) ── */
  fundBannerCard: {
    backgroundColor: '#0E964E',
    borderRadius: 22,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 98,
    overflow: 'visible',
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  fundBannerBgImage: {
    borderRadius: 22,
  },
  fundBannerLeft: {
    maxWidth: '56%',
    paddingRight: 6,
    zIndex: 2,
  },
  fundBannerSubtitle: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  fundBannerAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  fundTrendRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  fundTrendText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  fundBannerIllustration: {
    width: 155,
    height: 112,
    zIndex: 1,
    marginRight: -6,
  },
  stat4Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  stat4Card: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  stat4IconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat4Content: {
    flex: 1,
  },
  stat4Label: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  stat4Value: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryChartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  categoryChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 12,
  },
  donutChartContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  donutCenterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 68,
    textAlign: 'center',
  },
  donutCenterCurrency: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: -1,
  },
  donutChartImg: {
    width: 110,
    height: 110,
  },
  chartLegendCol: {
    flex: 1,
    gap: 10,
    paddingLeft: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  legendPercent: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentTxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  recentTxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentTxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentTxViewMore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sampleTxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  sampleTxIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleTxDesc: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sampleTxSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  sampleTxAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  /* ── EXPENSE CARD & COMMENTS ── */
  expenseCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  commentSectionBox: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    gap: 8,
  },
  commentSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 2,
  },
  commentItemRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  commentAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarChar: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  commentTimeText: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  commentContentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  commentSendBtn: {
    backgroundColor: '#074838',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  /* ── CHAT TAB (CHUẨN WEB HIỆN ĐẠI & KHÔNG BỊ TRÀN VIEWPORT) ── */
  chatViewportContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  chatMessagesScrollView: {
    flex: 1,
    paddingHorizontal: 14,
  },
  chatMessagesContentContainer: {
    paddingVertical: 10,
    paddingBottom: 16,
  },
  chatTabContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chatStreamList: {
    flex: 1,
    paddingVertical: 4,
  },
  chatRowWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
  },
  chatRowMe: {
    justifyContent: 'flex-end',
  },
  chatRowOther: {
    justifyContent: 'flex-start',
  },
  chatAvatarBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F8F0',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  chatSenderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 4,
  },
  /* ── PHONG CÁCH CHAT WEB & CHUẨN DESIGN ẢNH MẪU ── */
  chatDayDividerWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  chatDayPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chatDayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chatAvatarCircleWeb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chatAvatarImgWeb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  chatAvatarCharWeb: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  chatSenderTitleWeb: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    marginLeft: 2,
  },
  chatMessageBubbleWeb: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chatBubbleMeWeb: {
    backgroundColor: '#DCFCE7', // Màu xanh nhạt chuẩn mẫu cho tin nhắn gửi đi
    borderBottomRightRadius: 4,
  },
  chatBubbleOtherWeb: {
    backgroundColor: '#FFFFFF', // Màu trắng cho tin nhắn người khác
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatMessageContentWeb: {
    fontSize: 13.5,
    color: '#0F172A',
    lineHeight: 20,
    fontWeight: '500',
  },
  chatMessageTextMeWeb: {
    color: '#0F172A',
  },
  chatMessageTextOtherWeb: {
    color: '#0F172A',
  },
  chatTimeAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  chatTimestampTextWeb: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  chatTimestampMeWeb: {
    color: '#16A34A',
  },
  chatTimestampOtherWeb: {
    color: '#94A3B8',
  },
  /* Card file Excel đính kèm chuẩn design */
  chatFileCardWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chatFileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFileNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  chatFileSizeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chatFileDownloadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFileTimeText: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginLeft: 4,
    alignSelf: 'flex-end',
  },
  /* Hiển thị ảnh đính kèm trong tin nhắn */
  chatAttachmentImgContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#000000',
    maxWidth: 240,
  },
  chatAttachmentImg: {
    width: 240,
    height: 180,
    borderRadius: 16,
  },
  /* Xem trước ảnh đính kèm ở thanh nhập */
  chatAttachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 8,
    gap: 10,
  },
  chatAttachmentPreviewThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  chatAttachmentPreviewName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  chatAttachmentPreviewSub: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  chatAttachmentRemoveBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  /* Popup chọn emoji nhanh */
  chatEmojiPickerPopup: {
    position: 'absolute',
    bottom: 74,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
    width: 280,
  },
  chatEmojiPickerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  chatEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  chatEmojiItemBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  /* Thanh soạn thảo chat tròn chuẩn mẫu */
  chatInputBarContainerWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chatInputAttachmentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInputInnerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  chatTextInputWeb: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 8,
    maxHeight: 100,
  },
  chatEmojiBtn: {
    padding: 4,
  },
  chatSendCircleBtnWeb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0E964E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  chatMessageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatBubbleIsMe: {
    backgroundColor: '#074838',
    borderBottomRightRadius: 4,
  },
  chatBubbleIsOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatMessageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatMessageTextMe: {
    color: '#FFFFFF',
  },
  chatMessageTextOther: {
    color: '#0F172A',
  },
  chatTimestampText: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatTimestampMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chatTimestampOther: {
    color: '#94A3B8',
  },
  /* Card thông báo trong chat */
  chatCardBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  chatBalanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  chatLedgerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },
  chatCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatCardHeaderText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  chatCardBodyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  chatCardActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  chatCardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#074838',
  },
  /* Khung gõ chat */
  modernChatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 10,
    marginTop: 12,
  },
  modernChatTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    maxHeight: 100,
  },
  modernChatSendBtn: {
    backgroundColor: '#074838',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernChatSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* ── MEMBERS TAB (CHUẨN WEB HIỆN ĐẠI) ── */
  memberHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  memberHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065F46',
  },
  memberHeaderSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  inviteMemberModernBtn: {
    backgroundColor: '#074838',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteMemberModernBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  modernMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modernMemberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernMemberAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  modernMemberName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modernMemberEmail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selfPill: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  selfPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  modernRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modernRoleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  modernDeleteMemBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTextInputOld: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#0F172A',
  },
  chatSendBtn: {
    backgroundColor: '#074838',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  overviewCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  overviewCardSub: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A86B',
  },
  emptyNoteText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  outlineActionBtn: {
    borderWidth: 1.5,
    borderColor: '#074838',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineActionBtnText: {
    color: '#074838',
    fontSize: 13.5,
    fontWeight: '800',
  },
  expenseDesc: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  expenseSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expenseAmountText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
  expenseDateText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  addExpensePrimaryBtn: {
    backgroundColor: '#074838',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addExpensePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  detailEmptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  detailEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailEmptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expenseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  expenseIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseItemDesc: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  expenseItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expenseItemAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#059669',
  },
  balanceSummaryBox: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  balanceSummaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  balanceSummaryDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
    lineHeight: 18,
  },
  debtItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debtFromToText: {
    fontSize: 12.5,
    color: '#475569',
    marginBottom: 4,
  },
  debtAmountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
  },
  settleActionBtn: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  settleActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fundHeroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fundHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  fundHeroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    marginVertical: 8,
  },
  fundHeroNote: {
    fontSize: 11.5,
    color: '#64748B',
  },
  addMemberOutlineBtn: {
    borderWidth: 1.5,
    borderColor: '#074838',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addMemberOutlineBtnText: {
    color: '#074838',
    fontSize: 13,
    fontWeight: '800',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#074838',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberEmail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  roleBadgeSmall: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  removeMemBtn: {
    padding: 6,
  },
  removeMemBtnText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '800',
  },
  /* ── FORM MODAL ── */
  inputModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  inputModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  keyboardDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  keyboardDismissBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 16,
  },
  typeGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeSelectCard: {
    width: '30.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  typeSelectCardActive: {
    backgroundColor: '#E8F8F0',
    borderColor: '#059669',
  },
  typeSelectIconImg: {
    width: 44,
    height: 44,
  },
  typeSelectCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typeSelectCardTextActive: {
    color: '#059669',
  },
  sourceSelectBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  sourceSelectBtnActive: {
    backgroundColor: '#E8F8F0',
    borderColor: '#059669',
  },
  sourceSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  sourceSelectBtnTextActive: {
    color: '#059669',
  },
  /* Pill chọn ví cá nhân & danh mục trong modal thêm giao dịch */
  dropdownSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownSelectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSelectorSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inlinePickerDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginTop: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inlinePickerHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inlinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 10,
  },
  inlinePickerRowActive: {
    backgroundColor: '#F0FDF4',
  },
  inlinePickerItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  inlinePickerItemTitleActive: {
    color: '#059669',
    fontWeight: '800',
  },
  inlinePickerItemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  selectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '800',
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  categoryOptionRowActive: {
    backgroundColor: '#F0FDF4',
  },
  catCircleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryOptionLabelActive: {
    color: '#059669',
    fontWeight: '800',
  },
  accountOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  accountOptionRowActive: {
    backgroundColor: '#F0FDF4',
  },
  accountOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  accountOptionNameActive: {
    color: '#059669',
    fontWeight: '800',
  },
  accountOptionBalance: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  timeSwitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timeDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  timeCol: {
    flex: 1,
  },
  dateCol: {
    flex: 1,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeDateInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  accOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  accOptionPillActive: {
    backgroundColor: '#E8F8F0',
    borderColor: '#059669',
  },
  accOptionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  accOptionPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  catOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  catOptionPillActive: {
    backgroundColor: '#E8F8F0',
    borderColor: '#059669',
  },
  catOptionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  catOptionPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  submitActionBtn: {
    backgroundColor: '#00A86B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  searchUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  inviteActionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00A86B',
  },
  noUserFoundText: {
    textAlign: 'center',
    fontSize: 12.5,
    color: '#94A3B8',
    marginVertical: 16,
  },
  searchHintText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginVertical: 16,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
