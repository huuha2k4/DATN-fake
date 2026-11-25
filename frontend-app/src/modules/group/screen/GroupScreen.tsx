import { AppAlert as Alert } from '../../../context/DialogContext';
import { styles } from './GroupScreen.styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
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
  type GroupFundContributionResponse,
  type GroupInvitationResponse,
  type GroupMessageResponse,
  type GroupMemberResponse,
  type GroupMonthlyStatisticsResponse,
  type GroupResponse,
  type GroupType,
  type UserSearchResult,
} from '../api/groupApi';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { userProfileApi } from '../../profile/api/userProfileApi';
import { transactionApi, type AccountItem, type CategoryItem } from '../../add-transaction/api/transactionApi';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import { GroupMembersTab, InviteMemberModal, MemberActionModal } from '../components/members';
import { KidWalletTab, CreateChildWalletModal, ChildWalletDetailModal } from '../components/kid-wallet';
import { GroupBalancesTab } from '../components/balances';
import { GroupSettingsTab } from '../components/settings';
import { DepositFundModal } from '../components/fund';
import { ChildWalletResponse, CreateChildWalletRequest } from '../api/groupApi';
import { useAppTheme } from '../../../context/ThemeContext';

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

// Bộ nhớ tạm tỷ lệ ảnh trong phiên hoạt động để tránh gọi lại Image.getSize
const imageAspectRatioCache: Record<string, number> = {};

// Component hiển thị ảnh đính kèm: Sử dụng width/height lưu sẵn trong DB để hiển thị tỷ lệ chuẩn ngay lập tức, không bị giật lag
function ChatAttachmentImageItem({
  uri,
  width,
  height,
  onPress,
  onLongPress,
}: {
  uri: string;
  width?: number;
  height?: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  useEffect(() => {
    if (uri) {
      // Tải trước vào bộ nhớ cache của máy để hiển thị tức thì
      Image.prefetch(uri).catch(() => {});
    }
  }, [uri]);

  // Nếu có sẵn width & height từ DB: tính aspectRatio chuẩn (giới hạn từ 0.6 đến 1.8)
  const computedAspectRatio = (width && height && width > 0 && height > 0)
    ? Math.max(0.6, Math.min(1.8, width / height))
    : (4 / 3);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.chatAttachmentImgContainer,
        { aspectRatio: computedAspectRatio },
      ]}
    >
      <Image
        source={{ uri, cache: 'force-cache' }}
        style={styles.chatAttachmentImg}
        resizeMode="cover"
      />
    </Pressable>
  );
}

function sortMessagesChronologically(list: GroupMessageResponse[]): GroupMessageResponse[] {
  return [...list].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
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
      // Tin nhắn hôm nay: Không ghi "Hôm nay", chỉ ghi giờ như Messenger
      return timeStr;
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

export function GroupScreen({
  onGroupDetailChange,
  onConsumeInitialNav,
  initialGroupId,
  initialGroupName,
  initialTab,
  initialKidWalletId,
  initialKidSubTab,
}: {
  onGroupDetailChange?: (isOpen: boolean) => void;
  onConsumeInitialNav?: () => void;
  initialGroupId?: string;
  initialGroupName?: string;
  initialTab?: 'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS' | 'KIDS' | 'SETTINGS';
  initialKidWalletId?: string;
  initialKidSubTab?: 'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS';
} = {}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const currentUser = authStorage.getUser();
  const isChildAccount = Boolean(currentUser?.childAccount && currentUser.childWalletGroupId);

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

  // Mời nhiều thành viên khi tạo nhóm
  const createScrollViewRef = useRef<any>(null);
  const [createMemberSearchQuery, setCreateMemberSearchQuery] = useState('');
  const [createMemberSearchResults, setCreateMemberSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingCreateMember, setSearchingCreateMember] = useState(false);
  const [selectedInviteUsers, setSelectedInviteUsers] = useState<UserSearchResult[]>([]);

  // State Chi tiết nhóm (Kèm các tab: Tổng quan | Chi tiêu | Nhắn tin | Cân đối nợ | Thành viên)
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const consumedNavRef = useRef<string | null>(null);

  useEffect(() => {
    onGroupDetailChange?.(selectedGroup !== null);
  }, [selectedGroup, onGroupDetailChange]);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS' | 'KIDS' | 'SETTINGS'>(
    isChildAccount ? 'CHAT' : (initialTab || 'OVERVIEW')
  );

  // Tự động mở đúng nhóm và tab nếu được truyền initialGroupId / initialGroupName / initialTab (VD: từ Thông báo hoặc tài khoản bé)
  useEffect(() => {
    // Nếu là tài khoản trẻ em: luôn tự động mở thẳng nhóm gia đình của bé
    if (isChildAccount && currentUser?.childWalletGroupId) {
      if (groups.length === 0) return;
      const childGroup = groups.find((g) => String(g.id).toLowerCase() === String(currentUser.childWalletGroupId).toLowerCase()) || groups[0];
      if (childGroup && (!selectedGroup || String(selectedGroup.id) !== String(childGroup.id))) {
        setSelectedGroup(childGroup);
        setGroupNotificationEnabled(childGroup.notificationEnabled !== false);
        setDetailTab('CHAT');
        loadGroupDetailData(childGroup.id);
      }
      return;
    }

    if (!initialGroupId && !initialGroupName && !initialTab) {
      consumedNavRef.current = null;
      return;
    }
    if (groups.length === 0) return;

    const navKey = `${initialGroupId || ''}_${initialGroupName || ''}_${initialTab || ''}_${initialKidSubTab || ''}_${initialKidWalletId || ''}`;
    if (consumedNavRef.current === navKey) return;

    // 1. Tìm chính xác nhóm theo ID, hoặc theo Tên nhóm, hoặc theo loại nhóm phù hợp với mục tiêu
    let targetGroup: GroupResponse | undefined;
    if (initialGroupId) {
      targetGroup = groups.find((g) => String(g.id).toLowerCase() === String(initialGroupId).toLowerCase());
    }
    if (!targetGroup && initialGroupName) {
      const normalizedSearch = initialGroupName.trim().toLowerCase();
      targetGroup =
        groups.find((g) => g.name.trim().toLowerCase() === normalizedSearch) ||
        groups.find(
          (g) =>
            g.name.trim().toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(g.name.trim().toLowerCase())
        );
    }
    if (!targetGroup && initialTab === 'KIDS') {
      targetGroup = groups.find((g) => g.groupType === 'FAMILY');
    }
    if (!targetGroup) {
      targetGroup = groups[0];
    }

    if (targetGroup) {
      consumedNavRef.current = navKey;
      // 2. Đối với nhóm Gia đình (FAMILY) và Cặp đôi (COUPLE), giao diện không có tab BALANCES riêng
      // mà Quỹ chung nằm ngay trên tab Tổng quan (OVERVIEW) hoặc Thu & Chi (EXPENSES).
      let resolvedTab = initialTab || 'OVERVIEW';
      const hasBalTab =
        targetGroup.groupType === 'ROOMMATE' ||
        targetGroup.groupType === 'TRAVEL' ||
        targetGroup.groupType === 'PROJECT' ||
        targetGroup.groupType === 'OTHER';
      if (resolvedTab === 'BALANCES' && !hasBalTab) {
        resolvedTab = 'OVERVIEW';
      }

      setSelectedGroup(targetGroup);
      setGroupNotificationEnabled(targetGroup.notificationEnabled !== false);
      setDetailTab(resolvedTab);
      loadGroupDetailData(targetGroup.id);

      // Nếu không cần đợi childWallets để mở modal con thì xóa trạng thái điều hướng ngay sau khi vào tận nơi
      if (resolvedTab !== 'KIDS' || !initialKidSubTab) {
        onConsumeInitialNav?.();
      }
    }
  }, [initialGroupId, initialGroupName, initialTab, initialKidSubTab, initialKidWalletId, groups, onConsumeInitialNav]);

  const [childWallets, setChildWallets] = useState<ChildWalletResponse[]>([]);
  const [selectedChildWallet, setSelectedChildWallet] = useState<ChildWalletResponse | null>(null);
  const [childWalletDetailVisible, setChildWalletDetailVisible] = useState(false);
  const [createChildWalletModalVisible, setCreateChildWalletModalVisible] = useState(false);

  // Nếu chuyển vào tab KIDS và có yêu cầu mở thẳng chi tiết ví của bé (hoặc ví đầu tiên)
  const [activeKidSubTab, setActiveKidSubTab] = useState<'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS' | undefined>(initialKidSubTab);
  useEffect(() => {
    if (detailTab === 'KIDS' && childWallets.length > 0 && initialKidSubTab) {
      const targetWallet = initialKidWalletId
        ? childWallets.find((w) => w.id === initialKidWalletId) || childWallets[0]
        : childWallets[0];
      if (targetWallet) {
        setActiveKidSubTab(initialKidSubTab);
        setSelectedChildWallet(targetWallet);
        setChildWalletDetailVisible(true);
        onConsumeInitialNav?.();
      }
    }
  }, [detailTab, childWallets, initialKidSubTab, initialKidWalletId, onConsumeInitialNav]);
  const [groupNotificationEnabled, setGroupNotificationEnabled] = useState(true);
  const [depositFundModalVisible, setDepositFundModalVisible] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<GroupExpenseResponse | null>(null);
  const [viewingContribution, setViewingContribution] = useState<GroupFundContributionResponse | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Dữ liệu trong chi tiết nhóm
  const [expenses, setExpenses] = useState<GroupExpenseResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [sentPendingInvitations, setSentPendingInvitations] = useState<GroupInvitationResponse[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitationResponse[]>([]);
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<GroupBalanceResponse | null>(null);
  const [fundData, setFundData] = useState<GroupFundResponse | null>(null);
  const [fundContributions, setFundContributions] = useState<GroupFundContributionResponse[]>([]);
  const [messages, setMessages] = useState<GroupMessageResponse[]>([]);
  // Message Actions & State theo chuẩn bản Web
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [activeActionTargetMessage, setActiveActionTargetMessage] = useState<GroupMessageResponse | null>(null);
  const [activeTargetLayout, setActiveTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const messageBubbleRefs = useRef<Record<string, any>>({});
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [viewingReactionModalMessage, setViewingReactionModalMessage] = useState<GroupMessageResponse | null>(null);
  const [reactionModalTab, setReactionModalTab] = useState<string>('ALL');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxToast, setLightboxToast] = useState<string | null>(null);
  const lightboxToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLightboxToast = (msg: string) => {
    if (lightboxToastTimerRef.current) clearTimeout(lightboxToastTimerRef.current);
    setLightboxToast(msg);
    lightboxToastTimerRef.current = setTimeout(() => {
      setLightboxToast(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (lightboxToastTimerRef.current) clearTimeout(lightboxToastTimerRef.current);
    };
  }, []);
  const [lightboxImageInfo, setLightboxImageInfo] = useState<{ timeStr: string; senderName?: string } | null>(null);
  const [selectedMessageTimeId, setSelectedMessageTimeId] = useState<string | null>(null);
  const [recallingMessageId, setRecallingMessageId] = useState<string | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  const [commentsByTarget, setCommentsByTarget] = useState<Record<string, GroupCommentResponse[]>>({});
  const [inlineCommentText, setInlineCommentText] = useState<Record<string, string>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<Record<string, string | null>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({
    // Khởi tạo một số like ban đầu cho sinh động như ảnh mẫu
  });
  const [editingComment, setEditingComment] = useState<{ targetId: string; comment: GroupCommentResponse } | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [commentActionMenuTarget, setCommentActionMenuTarget] = useState<{
    targetId: string;
    comment: GroupCommentResponse;
    anchor?: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImageAttachment, setSelectedImageAttachment] = useState<{ uri: string; name: string; type: string; width?: number; height?: number } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [chatVisibleCount, setChatVisibleCount] = useState<number>(25);
  const chatScrollViewRef = useRef<any>(null);
  const detailTxScrollViewRef = useRef<any>(null);
  const expenseFormScrollViewRef = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const messageItemLayouts = useRef<Record<string, number>>({});
  const hasAutoScrolledOnEnterRef = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Tự động cuộn cuộc trò chuyện hoặc bình luận chi tiết xuống cuối khi bàn phím xuất hiện
        setTimeout(() => {
          chatScrollViewRef.current?.scrollToEnd({ animated: true });
          detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const [groupPickerModalType, setGroupPickerModalType] = useState<'NONE' | 'ACCOUNT' | 'CATEGORY'>('NONE');
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
  const [selectedActionMember, setSelectedActionMember] = useState<GroupMemberResponse | null>(null);
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
  const loadPendingInvitations = async () => {
    try {
      const data = await groupApi.getPendingInvitations();
      setPendingInvitations(Array.isArray(data) ? data : []);
    } catch {
      setPendingInvitations([]);
    }
  };

  const handleAcceptInvitation = async (inv: GroupInvitationResponse) => {
    if (respondingInvitationId) return;
    setRespondingInvitationId(inv.id);
    try {
      await groupApi.acceptInvitation(inv.id);
      setPendingInvitations((prev) => prev.filter((item) => item.id !== inv.id));
      await loadGroups(true);
      Alert.alert('Thành công', `Đã tham gia nhóm "${inv.groupName || 'Nhóm'}"!`);
    } catch {
      Alert.alert('Lỗi', 'Không thể xác nhận tham gia nhóm. Vui lòng thử lại.');
    } finally {
      setRespondingInvitationId(null);
    }
  };

  const handleRejectInvitation = async (inv: GroupInvitationResponse) => {
    if (respondingInvitationId) return;
    setRespondingInvitationId(inv.id);
    try {
      await groupApi.rejectInvitation(inv.id);
      setPendingInvitations((prev) => prev.filter((item) => item.id !== inv.id));
      Alert.alert('Đã từ chối', 'Đã từ chối lời mời tham gia nhóm.');
    } catch {
      Alert.alert('Lỗi', 'Không thể từ chối lời mời. Vui lòng thử lại.');
    } finally {
      setRespondingInvitationId(null);
    }
  };

  const loadGroups = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    loadPendingInvitations();
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
                // Sắp xếp theo thời gian mới nhất (createdAt DESC) để phần tử đầu tiên luôn là tin nhắn mới nhất
                const sortedMsgs = [...msgs].sort((a, b) => {
                  const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return tB - tA;
                });
                const last = sortedMsgs[0];
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
                let previewText = last.content;
                if (!previewText && last.attachments && last.attachments.length > 0) {
                  previewText = '[Hình ảnh]';
                }
                if (!previewText) {
                  previewText = 'Đã gửi một tin nhắn';
                }
                // Tính chính xác số lượng tin nhắn chưa đọc đối với user hiện tại
                const currentUserIdStr = currentUser?.id ? String(currentUser.id).toLowerCase() : '';
                let calculatedUnread = 0;
                if (currentUserIdStr) {
                  calculatedUnread = msgs.filter((m) => {
                    if (m.senderId === currentUser?.id) return false;
                    const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
                    return !readList.includes(currentUserIdStr);
                  }).length;
                } else {
                  calculatedUnread = g.unreadMessageCount || 0;
                }

                return [
                  g.id,
                  {
                    senderName: sender,
                    content: previewText,
                    time: timeStr,
                    unreadCount: calculatedUnread,
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

  // Luôn chủ động nạp comments mới nhất khi mở xem chi tiết giao dịch hoặc nộp quỹ
  useEffect(() => {
    if (selectedGroup && viewingExpense) {
      groupApi.getComments(selectedGroup.id, 'GROUP_EXPENSE', viewingExpense.id).then((cmts) => {
        if (cmts) {
          setCommentsByTarget((prev) => ({ ...prev, [viewingExpense.id]: cmts }));
        }
      }).catch(() => {});
    }
  }, [selectedGroup?.id, viewingExpense?.id]);

  useEffect(() => {
    if (selectedGroup && viewingContribution) {
      groupApi.getComments(selectedGroup.id, 'FUND_CONTRIBUTION', viewingContribution.id).then((cmts) => {
        if (cmts) {
          setCommentsByTarget((prev) => ({ ...prev, [viewingContribution.id]: cmts }));
        }
      }).catch(() => {});
    }
  }, [selectedGroup?.id, viewingContribution?.id]);

  // Nạp dữ liệu chi tiết nhóm khi mở
  const loadGroupDetailData = async (groupId: string) => {
    setLoadingDetail(true);
    try {
      const [expList, memList, bal, fund, contributions, msgList, wallets, pendingInvs] = await Promise.all([
        groupApi.getExpenses(groupId),
        groupApi.getMembers(groupId),
        groupApi.getBalances(groupId),
        groupApi.getFund(groupId),
        groupApi.getFundContributions(groupId),
        groupApi.getMessages(groupId),
        groupApi.getChildWallets(groupId),
        groupApi.getSentPendingInvitations(groupId).catch(() => []),
      ]);
      setExpenses(expList);
      setMembers(memList);
      setBalanceData(bal);
      setFundData(fund);
      setFundContributions(contributions);
      setMessages(sortMessagesChronologically(msgList));
      setChildWallets(wallets || []);
      setSentPendingInvitations(pendingInvs || []);
      loadMonthlyFundStats(groupId, selectedMonth);

      // Nạp danh sách ví cá nhân & danh mục cho modal thêm giao dịch
      transactionApi.getAccounts().then((accs) => {
        if (accs && accs.length > 0) {
          setPersonalAccounts(accs);
          if (!expAccountId) setExpAccountId(accs[0].id);
        } else {
          setPersonalAccounts([]);
          setExpAccountId('');
        }
      }).catch(() => {
        setPersonalAccounts([]);
        setExpAccountId('');
      });

      transactionApi.getCategories('EXPENSE').then((cats) => {
        if (cats && cats.length > 0) {
          setCategoriesList(cats);
          if (!expCategoryId) setExpCategoryId(cats[0].id);
        } else {
          setCategoriesList([]);
          setExpCategoryId('');
        }
      }).catch(() => {
        setCategoriesList([]);
        setExpCategoryId('');
      });

      // Nạp comment cho các khoản chi và các khoản nộp quỹ
      const allCommentTargets: { id: string; type: 'GROUP_EXPENSE' | 'FUND_CONTRIBUTION' }[] = [
        ...(expList || []).map((exp) => ({ id: exp.id, type: 'GROUP_EXPENSE' as const })),
        ...(contributions || []).map((fc) => ({ id: fc.id, type: 'FUND_CONTRIBUTION' as const })),
      ];
      if (allCommentTargets.length > 0) {
        const commentResults = await Promise.all(
          allCommentTargets.map(async (t) => {
            try {
              const cmts = await groupApi.getComments(groupId, t.type, t.id);
              return [t.id, cmts || []] as const;
            } catch {
              return [t.id, []] as const;
            }
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

  // Reset flag tự động cuộn và số lượng tin hiển thị ban đầu khi chuyển tab hoặc đổi nhóm
  useEffect(() => {
    hasAutoScrolledOnEnterRef.current = false;
    setChatVisibleCount(25);
  }, [selectedGroup?.id, detailTab]);

  // Đánh dấu đã đọc và tự động cuộn đến tin nhắn chưa đọc hoặc xuống cuối cùng khi vào tab CHAT
  useEffect(() => {
    if (!selectedGroup || detailTab !== 'CHAT' || messages.length === 0 || !currentUser?.id) return;

    const currentUserIdStr = String(currentUser.id).toLowerCase();
    const unreadMsgs = messages.filter((m) => {
      if (m.senderId === currentUser.id) return false;
      const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
      return !readList.includes(currentUserIdStr);
    });

    // 1. Nếu có tin nhắn chưa đọc, gọi API mark as read
    if (unreadMsgs.length > 0) {
      const unreadIds = unreadMsgs.map((m) => m.id);
      groupApi.markMessagesAsRead(selectedGroup.id, unreadIds).then(() => {
        // Cập nhật state tin nhắn để hiện avatar đã đọc
        setMessages((prev) =>
          prev.map((m) => {
            if (unreadIds.includes(m.id)) {
              const currentReads = m.readByUserIds || [];
              return { ...m, readByUserIds: [...currentReads, currentUser.id] };
            }
            return m;
          })
        );
        // Đồng thời cập nhật badge ngoài danh sách nhóm về 0
        setLastMessageMap((prev) => {
          if (!prev[selectedGroup.id]) return prev;
          return {
            ...prev,
            [selectedGroup.id]: {
              ...prev[selectedGroup.id],
              unreadCount: 0,
            },
          };
        });
      }).catch(() => {});
    }

    // 2. Cuộn thông minh khi lần đầu mở vào tab CHAT
    if (!hasAutoScrolledOnEnterRef.current) {
      hasAutoScrolledOnEnterRef.current = true;
      const firstUnread = unreadMsgs.length > 0 ? unreadMsgs[0] : null;

      setTimeout(() => {
        if (firstUnread && messageItemLayouts.current[firstUnread.id] !== undefined) {
          const targetY = Math.max(0, messageItemLayouts.current[firstUnread.id] - 60);
          chatScrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        } else {
          chatScrollViewRef.current?.scrollToEnd({ animated: false });
        }
      }, 250);
    }
  }, [detailTab, selectedGroup?.id, currentUser?.id, messages.length]);

  // Polling tin nhắn khi đang ở tab CHAT
  useEffect(() => {
    if (!selectedGroup || detailTab !== 'CHAT') return;
    const interval = setInterval(async () => {
      try {
        const msgs = await groupApi.getMessages(selectedGroup.id);
        shouldAutoScrollRef.current = false;
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
          width: asset.width,
          height: asset.height,
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
        attachmentsList = [{
          ...uploaded,
          width: imageToSend.width || uploaded.width,
          height: imageToSend.height || uploaded.height,
        }];
      }

      shouldAutoScrollRef.current = true;
      const msg = await groupApi.sendMessage(selectedGroup.id, text, undefined, attachmentsList);
      setMessages((prev) => [...prev, msg]);
      
      // Cập nhật ngay tin nhắn gần nhất cho nhóm này ở danh sách ngoài
      setLastMessageMap((prev) => ({
        ...prev,
        [selectedGroup.id]: {
          senderName: 'Bạn',
          content: msg.content || (msg.attachments && msg.attachments.length > 0 ? '[Hình ảnh]' : 'Đã gửi một tin nhắn'),
          time: 'Vừa xong',
          unreadCount: 0,
        },
      }));

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

  // Thả cảm xúc tin nhắn (Messenger style chuẩn bản Web)
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!selectedGroup) return;
    try {
      shouldAutoScrollRef.current = false;
      setActiveReactionMessageId(null);
      setActiveMenuMessageId(null);
      setActiveActionTargetMessage(null);
      const updated = await groupApi.reactToMessage(selectedGroup.id, msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setViewingReactionModalMessage((prev) => (prev && prev.id === msgId ? updated : prev));
    } catch {
      Alert.alert('Lỗi', 'Không thể thả cảm xúc.');
    }
  };

  // Thu hồi tin nhắn với mọi người
  const handleRecallMessage = async (msgId: string) => {
    if (!selectedGroup) return;
    try {
      shouldAutoScrollRef.current = false;
      const updated = await groupApi.recallMessage(selectedGroup.id, msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setActiveMenuMessageId(null);
      setRecallingMessageId(null);
      setActiveActionTargetMessage(null);
    } catch {
      Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn này.');
    }
  };

  // Xóa tin nhắn ở phía tôi (thu hồi với bạn)
  const handleHideMessageForMe = (msgId: string) => {
    shouldAutoScrollRef.current = false;
    setHiddenMessageIds((prev) => [...prev, msgId]);
    setActiveMenuMessageId(null);
    setRecallingMessageId(null);
    setActiveActionTargetMessage(null);
  };

  // Lưu chỉnh sửa tin nhắn
  const handleSaveEditMessage = async () => {
    if (!selectedGroup || !editingMessage) return;
    const trimmed = editingMessage.text.trim();
    if (!trimmed) {
      Alert.alert('Thông báo', 'Nội dung tin nhắn không được để trống.');
      return;
    }
    try {
      shouldAutoScrollRef.current = false;
      const updated = await groupApi.updateMessage(selectedGroup.id, editingMessage.id, trimmed);
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? updated : m)));
      setEditingMessage(null);
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu tin nhắn.');
    }
  };

  // Gửi comment vào một khoản chi hoặc nộp quỹ (hỗ trợ trả lời theo luồng)
  const handleSendComment = async (targetId: string, commentableType: 'GROUP_EXPENSE' | 'FUND_CONTRIBUTION' = 'GROUP_EXPENSE') => {
    if (!selectedGroup) return;
    const text = (inlineCommentText[targetId] || '').trim();
    if (!text) return;
    const parentId = replyingToCommentId[targetId] || undefined;

    try {
      const created = await groupApi.createComment(selectedGroup.id, {
        commentableType,
        commentableId: targetId,
        content: text,
        parentCommentId: parentId,
      });
      setCommentsByTarget((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), created],
      }));
      setInlineCommentText((prev) => ({ ...prev, [targetId]: '' }));
      setReplyingToCommentId((prev) => ({ ...prev, [targetId]: null }));
      setTimeout(() => {
        detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
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
    setGroupNotificationEnabled(group.notificationEnabled !== false);
    setDetailTab('OVERVIEW');
    loadGroupDetailData(group.id);
  };

  // Tạo nhóm mới
  // Tìm kiếm người dùng để mời khi tạo nhóm
  const handleSearchCreateMembers = async (q: string) => {
    setCreateMemberSearchQuery(q);
    const trimmed = q.trim();
    if (!trimmed.includes('@')) {
      setCreateMemberSearchResults([]);
      return;
    }
    setSearchingCreateMember(true);
    try {
      const res = await groupApi.searchUsers(trimmed);
      setCreateMemberSearchResults(res);
      if (res.length > 0) {
        setTimeout(() => {
          createScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    } catch {
      setCreateMemberSearchResults([]);
    } finally {
      setSearchingCreateMember(false);
    }
  };

  const toggleSelectInviteUser = (u: UserSearchResult) => {
    setSelectedInviteUsers((prev) => {
      const exists = prev.some((it) => it.id === u.id);
      if (exists) {
        return prev.filter((it) => it.id !== u.id);
      } else {
        return [...prev, u];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên nhóm');
      return;
    }
    setSubmittingGroup(true);
    try {
      const created = await groupApi.createGroup({
        name: newGroupName.trim(),
        groupType: newGroupType,
        description: newGroupDesc.trim() || undefined,
        baseCurrency: 'VND',
      });

      // Mời hàng loạt thành viên đã chọn vào nhóm
      if (created?.id && selectedInviteUsers.length > 0) {
        for (const user of selectedInviteUsers) {
          try {
            await groupApi.addMember(created.id, {
              userId: user.id,
              role: 'MEMBER',
            });
          } catch (e) {
            console.warn(`Lỗi khi mời ${user.fullName}:`, e);
          }
        }
      }

      setCreateModalVisible(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedInviteUsers([]);
      setCreateMemberSearchQuery('');
      setCreateMemberSearchResults([]);
      await loadGroups();
      
      const inviteMsg = selectedInviteUsers.length > 0 
        ? ` và đã gửi lời mời đến ${selectedInviteUsers.length} thành viên`
        : '';
      Alert.alert('Thành công', `Đã tạo nhóm "${newGroupName.trim()}"${inviteMsg}!`);
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
    const trimmed = q.trim();
    // Bắt đầu tìm kiếm ngay khi người dùng gõ có chứa ký tự @
    if (!trimmed.includes('@')) {
      setSearchResults([]);
      return;
    }
    setSearchingUser(true);
    try {
      const res = await groupApi.searchUsers(trimmed);
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

  // Hủy lời mời tham gia nhóm đang chờ phản hồi
  const handleCancelInvitation = async (invitationId: string, inviteeName?: string) => {
    if (!selectedGroup) return;
    Alert.alert(
      'Hủy lời mời',
      `Bạn có chắc chắn muốn hủy lời mời gửi tới ${inviteeName || 'người dùng này'}?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy lời mời',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupApi.cancelInvitation(selectedGroup.id, invitationId);
              setSentPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
              Alert.alert('Thành công', 'Đã hủy lời mời tham gia nhóm.');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy lời mời.');
            }
          },
        },
      ]
    );
  };

  // Cập nhật vai trò thành viên (ADMIN <-> MEMBER)
  const handleUpdateMemberRole = async (mem: GroupMemberResponse, newRole: 'ADMIN' | 'MEMBER') => {
    if (!selectedGroup) return;
    const name = mem.user?.fullName || mem.nickname || mem.fullName || 'thành viên';
    try {
      await groupApi.updateMember(selectedGroup.id, mem.userId, { role: newRole });
      await loadGroupDetailData(selectedGroup.id);
      Alert.alert(
        'Thành công',
        `Đã ${newRole === 'ADMIN' ? 'thăng quyền Quản trị viên' : 'chuyển thành Thành viên'} cho ${name}.`
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật quyền hạn.');
    }
  };

  // Xóa thành viên
  const handleRemoveMember = (mem: GroupMemberResponse) => {
    if (!selectedGroup) return;
    const name = mem.user?.fullName || mem.nickname || mem.fullName || 'thành viên này';
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc chắn muốn xóa ${name} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupApi.removeMember(selectedGroup.id, mem.userId);
              await loadGroupDetailData(selectedGroup.id);
              Alert.alert('Thành công', `Đã xóa ${name} khỏi nhóm.`);
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
    const isOwner = selectedGroup.myRole === 'OWNER' || (currentUser && selectedGroup.ownerId === currentUser.id);
    const isAdmin = isOwner || selectedGroup.myRole === 'ADMIN';

    // Cân đối nợ chỉ có ở nhóm: Ở ghép/Phòng trọ (ROOMMATE), Du lịch (TRAVEL), Dự án (PROJECT), Khác (OTHER)
    // KHÔNG có ở: Gia đình (FAMILY) và Cặp đôi (COUPLE)
    const hasBalancesTab = selectedGroup.groupType === 'ROOMMATE' ||
      selectedGroup.groupType === 'TRAVEL' ||
      selectedGroup.groupType === 'PROJECT' ||
      selectedGroup.groupType === 'OTHER';

    return (
      <View
        style={[
          styles.detailScreenContainer,
          isDark && { backgroundColor: themeColors.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        {/* Header Trang Chi tiết full màn hình - Phong cách sáng & icons tương tác chuẩn mẫu */}
        <View
          style={[
            styles.detailScreenHeaderModern,
            { paddingTop: Math.max(insets.top, 14) + 6 },
            isDark && {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.cardBorder,
            },
          ]}
        >
          {!isChildAccount && (
            <Pressable
              onPress={() => {
                setSelectedGroup(null);
                setDetailTab('OVERVIEW');
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.detailModernBackBtn,
                isDark && {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                pressed && styles.pressed,
              ]}
            >
              <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.textPrimary : '#0F172A'} />
            </Pressable>
          )}

          <View style={[styles.detailModernHeaderCenter, isChildAccount && { marginLeft: 16 }]}>
            <Image
              source={groupIconSource}
              style={styles.detailGroupHeaderIcon}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text
                  style={[
                    styles.detailModernTitle,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {selectedGroup.name}
                </Text>
                {isFamily && <FinanceIcon name="crown" size={14} color="#D97706" />}
              </View>
              <Text
                style={[
                  styles.detailModernSub,
                  isDark && { color: themeColors.textSecondary },
                ]}
              >
                {members.length} thành viên
              </Text>
            </View>
          </View>

          {/* Cụm Action Buttons: Cài đặt nhóm (Ẩn với tài khoản bé) */}
          {!isChildAccount && (
            <View style={styles.detailHeaderActionsRow}>
              <Pressable
                onPress={() => setDetailTab('SETTINGS')}
                style={[
                  styles.detailActionCircleBtn,
                  isDark && {
                    backgroundColor: 'rgba(52, 211, 153, 0.15)',
                    borderColor: 'rgba(52, 211, 153, 0.3)',
                  },
                ]}
                hitSlop={6}
              >
                <FinanceIcon name="settings" size={17} color={isDark ? themeColors.accentGreen : '#059669'} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Thanh Tabs Trượt Ngang (Tab Bar gạch chân xanh chuẩn ảnh mẫu) */}
        <View
          style={[
            styles.tabsScrollWrapper,
            isDark && {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.cardBorder,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.detailTabsScrollContent}
          >
            {(isChildAccount
              ? [
                  { key: 'CHAT', label: 'Trò chuyện', icon: 'message-square' },
                  { key: 'MEMBERS', label: 'Thành viên', icon: 'users' },
                ]
              : [
                  { key: 'OVERVIEW', label: 'Tổng quan', icon: 'chart' },
                  { key: 'EXPENSES', label: 'Thu & Chi', icon: 'history' },
                  { key: 'CHAT', label: 'Trò chuyện', icon: 'message-square' },
                  ...(hasBalancesTab ? [{ key: 'BALANCES', label: 'Cân đối nợ', icon: 'scale' }] : []),
                  { key: 'MEMBERS', label: 'Thành viên', icon: 'users' },
                  ...(isFamily ? [{ key: 'KIDS', label: 'Ví trẻ em', icon: 'wallet' }] : []),
                  { key: 'SETTINGS', label: 'Cài đặt', icon: 'settings' },
                ]
            ).map((tab) => {
              const isSelected = detailTab === tab.key;
              // Tính số lượng tin nhắn chưa đọc đối với tab Trò chuyện
              const unreadChatCount = tab.key === 'CHAT' && currentUser?.id
                ? messages.filter((m) => {
                    if (m.senderId === currentUser.id) return false;
                    const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
                    return !readList.includes(String(currentUser.id).toLowerCase());
                  }).length
                : 0;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setDetailTab(tab.key as any)}
                  style={[styles.detailTabItemUnderline, isSelected && styles.detailTabItemUnderlineActive]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FinanceIcon
                      name={tab.icon as any}
                      size={16}
                      color={
                        isSelected
                          ? (isDark ? themeColors.accentGreen : '#0E964E')
                          : (isDark ? themeColors.textSecondary : '#64748B')
                      }
                    />
                    <Text
                      style={[
                        styles.detailTabItemTextClean,
                        isDark && { color: themeColors.textSecondary },
                        isSelected && [
                          styles.detailTabItemTextCleanActive,
                          isDark && { color: themeColors.accentGreen },
                        ],
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {unreadChatCount > 0 && !isSelected && (
                      <View style={styles.detailTabUnreadBadge}>
                        <Text style={styles.detailTabUnreadBadgeText}>
                          {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.detailActiveIndicatorLine,
                        isDark && { backgroundColor: themeColors.accentGreen },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Nội dung theo Tab */}
        {loadingDetail ? (
          <View style={styles.detailLoadingWrap}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={[styles.detailLoadingText, isDark && { color: themeColors.textSecondary }]}>Đang nạp dữ liệu nhóm...</Text>
          </View>
        ) : detailTab === 'CHAT' ? (
          /* RIÊNG TAB TRÒ CHUYỆN: Chiếm toàn bộ chiều cao còn lại của màn hình (flex: 1), 
             cuộn độc lập bằng ScrollView bên trong, thanh chat ghim cố định ở đáy */
          <KeyboardAvoidingView
            style={[
              styles.chatViewportContainer,
              isDark && { backgroundColor: themeColors.background },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
              <ScrollView
                ref={chatScrollViewRef}
                style={styles.chatMessagesScrollView}
                contentContainerStyle={styles.chatMessagesContentContainer}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  // Nếu cuộn lên cách đáy hơn 80px thì hiển thị nút cuộn xuống
                  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
                  setShowScrollBottomBtn(!isCloseToBottom);
                }}
                onContentSizeChange={() => {
                  if (shouldAutoScrollRef.current) {
                    chatScrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
              >
              {messages.filter((m) => !hiddenMessageIds.includes(m.id)).length === 0 ? (
                <View style={[styles.detailEmptyCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                  <Text style={[styles.detailEmptyTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có cuộc trò chuyện nào</Text>
                  <Text style={[styles.detailEmptySub, isDark && { color: themeColors.textSecondary }]}>
                    Hãy gửi tin nhắn đầu tiên để cùng lên kế hoạch chi tiêu và thảo luận cùng mọi người!
                  </Text>
                </View>
              ) : (
                <View style={styles.chatStreamList}>
                  {(() => {
                    // Tính toán tin nhắn cuối cùng mỗi thành viên đã xem (giống hệt bản Web)
                    const lastSeenMap: Record<string, string> = {};
                    if (currentUser?.id) {
                      members.forEach((m) => {
                        const mId = String(m.userId).toLowerCase();
                        if (mId === String(currentUser.id).toLowerCase()) return;
                        for (let i = messages.length - 1; i >= 0; i--) {
                          const item = messages[i];
                          const readList = (item.readByUserIds || []).map((id) => String(id).toLowerCase());
                          if (readList.includes(mId)) {
                            lastSeenMap[m.userId] = item.id;
                            break;
                          }
                        }
                      });
                    }

                    // Tìm tin nhắn chưa đọc đầu tiên của user hiện tại
                    const currentUserIdStr = currentUser?.id ? String(currentUser.id).toLowerCase() : '';
                    const firstUnreadMsg = currentUserIdStr
                      ? messages.find((m) => {
                          if (m.senderId === currentUser?.id) return false;
                          const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
                          return !readList.includes(currentUserIdStr);
                        })
                      : null;

                    // Chỉ lấy số lượng tin nhắn mới nhất theo chatVisibleCount
                    const nonHiddenMessages = messages.filter((m) => !hiddenMessageIds.includes(m.id));
                    const hasOlderMessages = nonHiddenMessages.length > chatVisibleCount;
                    const visibleMessages = hasOlderMessages
                      ? nonHiddenMessages.slice(-chatVisibleCount)
                      : nonHiddenMessages;

                    return (
                      <>
                        {hasOlderMessages && (
                          <View style={styles.chatLoadMoreWrap}>
                            <Pressable
                              style={[
                                styles.chatLoadMoreBtn,
                                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                              ]}
                              onPress={() => {
                                shouldAutoScrollRef.current = false;
                                setChatVisibleCount((prev) => Math.min(nonHiddenMessages.length, prev + 25));
                              }}
                            >
                              <FinanceIcon name="chevron-up" size={15} color={isDark ? themeColors.textSecondary : '#475569'} />
                              <Text
                                style={[
                                  styles.chatLoadMoreBtnText,
                                  isDark && { color: themeColors.textSecondary },
                                ]}
                              >
                                Xem các tin nhắn cũ hơn ({nonHiddenMessages.length - chatVisibleCount})
                              </Text>
                            </Pressable>
                          </View>
                        )}
                        {visibleMessages.map((msg, index, filteredArr) => {
                      const isFirstUnread = firstUnreadMsg && firstUnreadMsg.id === msg.id;
                      const isMe = msg.senderId === currentUser?.id;
                      const senderName = isMe ? 'Bạn' : (msg.sender?.fullName || msg.sender?.username || 'Thành viên');
                      const prevMsg = index > 0 ? filteredArr[index - 1] : null;
                      const nextMsg = index < filteredArr.length - 1 ? filteredArr[index + 1] : null;

                      const prevSenderId = prevMsg ? String(prevMsg.senderId || prevMsg.sender?.id || '') : '';
                      const nextSenderId = nextMsg ? String(nextMsg.senderId || nextMsg.sender?.id || '') : '';
                      const curSenderId = String(msg.senderId || msg.sender?.id || '');

                      const isSameSenderAsPrev = Boolean(prevSenderId && curSenderId && prevSenderId === curSenderId);
                      const isSameSenderAsNext = Boolean(nextSenderId && curSenderId && nextSenderId === curSenderId);

                      // Tính toán vạch phân cách ngày (Messenger style như Web)
                      const prevDiffMins = prevMsg && prevMsg.createdAt && msg.createdAt
                        ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
                        : 999;
                      const showDateDivider = !prevMsg || prevDiffMins >= 10;
                      const dividerText = showDateDivider && msg.createdAt ? formatMessengerDateDivider(msg.createdAt) : '';

                      // Kiểm tra xem tin nhắn tiếp theo có cùng khối liên tục (trong vòng 10 phút) hay không
                      const nextDiffMins = nextMsg && nextMsg.createdAt && msg.createdAt
                        ? (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / 60000
                        : 999;
                      const isNextInSameCluster = isSameSenderAsNext && nextDiffMins < 10;
                      const isLastInCluster = !isNextInSameCluster;
                      const isFirstInCluster = !isSameSenderAsPrev || showDateDivider;

                      const isRecalled = msg.isRecalled || msg.content === 'Tin nhắn đã bị thu hồi';
                      const isEdited = !isRecalled && (msg.isEdited || (msg.updatedAt && msg.createdAt && new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime() > 2000));

                      // Check file đính kèm giả lập hoặc Excel
                      const isExcelFile = msg.content?.includes('.xlsx') || msg.content?.includes('.xls');
                      const isBalanceProposal = msg.content.startsWith('[[BALANCE]]');
                      const isLedgerCard = msg.content.startsWith('[[LEDGER') || msg.content.startsWith('[[TRANSACTION]]');
                      const cleanContent = msg.content
                        .replace(/^\[\[BALANCE\]\]/, '')
                        .replace(/^\[\[LEDGER\|.*?\]\]/, '')
                        .replace(/^\[\[TRANSACTION\]\]/, '');

                      // Lấy avatar người gửi
                      const rawAvatar = isMe ? currentUser?.avatarUrl : (msg.sender?.avatarKey || (msg.sender as any)?.avatarUrl);
                      const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;

                      // Định dạng thời gian/ngày tháng khi bấm vào tin nhắn (chuẩn Messenger)
                      let detailedTimeStr = '';
                      if (msg.createdAt) {
                        const d = new Date(msg.createdAt);
                        const now = new Date();
                        const timeOnly = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                        const isTodayMsg = d.toDateString() === now.toDateString();
                        const yesterday = new Date(now);
                        yesterday.setDate(now.getDate() - 1);
                        const isYesterdayMsg = d.toDateString() === yesterday.toDateString();

                        if (isTodayMsg) {
                          detailedTimeStr = timeOnly;
                        } else if (isYesterdayMsg) {
                          detailedTimeStr = `Hôm qua lúc ${timeOnly}`;
                        } else {
                          const dateOnly = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                          detailedTimeStr = `${dateOnly} lúc ${timeOnly}`;
                        }
                      }

                      const reactionsList = msg.reactions || [];
                      const uniqueEmojis = Array.from(new Set(reactionsList.map((r) => r.reaction)));

                      // Lấy danh sách thành viên đã xem tin nhắn này
                      // 1. Những người mà tin nhắn này là tin mới nhất họ đã đọc
                      const seenByMembers = members.filter(
                        (m) => String(m.userId).toLowerCase() !== String(msg.senderId).toLowerCase() && lastSeenMap[m.userId] === msg.id
                      );
                      // 2. Toàn bộ người đã đọc tin nhắn này (để hiển thị khi bấm vào tin nhắn)
                      const readList = (msg.readByUserIds || []).map((id) => String(id).toLowerCase());
                      const allReadersOfMessage = members.filter(
                        (m) => String(m.userId).toLowerCase() !== String(msg.senderId).toLowerCase() && readList.includes(String(m.userId).toLowerCase())
                      );
                      const isSelected = selectedMessageTimeId === msg.id;

                      return (
                        <View
                          key={msg.id}
                          onLayout={(e) => {
                            messageItemLayouts.current[msg.id] = e.nativeEvent.layout.y;
                          }}
                        >
                          {/* Vạch phân cách Tin nhắn chưa đọc (chỉ hiện trước tin nhắn chưa đọc đầu tiên) */}
                          {isFirstUnread && (
                            <View style={styles.chatUnreadDividerWrap}>
                              <View style={styles.chatUnreadDividerLine} />
                              <View style={styles.chatUnreadDividerBadge}>
                                <Text style={styles.chatUnreadDividerBadgeText}>Tin nhắn chưa đọc</Text>
                              </View>
                              <View style={styles.chatUnreadDividerLine} />
                            </View>
                          )}

                          {/* Thanh phân cách ngày/giờ động chuẩn như Web & Messenger */}
                          {showDateDivider && (
                            <View style={styles.chatDayDividerWrap}>
                              <View
                                style={[
                                  styles.chatDayPill,
                                  isDark && {
                                    backgroundColor: themeColors.surfaceSubtle,
                                    borderColor: themeColors.cardBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chatDayPillText,
                                    isDark && { color: themeColors.textSecondary },
                                  ]}
                                >
                                  {dividerText || 'Hôm nay'}
                                </Text>
                              </View>
                            </View>
                          )}

                        <View
                          style={[
                            styles.chatRowWrapper,
                            isMe ? styles.chatRowMe : styles.chatRowOther,
                            !isSameSenderAsPrev || showDateDivider ? { marginTop: 12 } : { marginTop: 2 },
                          ]}
                        >
                          {/* Avatar người khác ở bên trái (chỉ hiển thị ở tin nhắn cuối của cụm để gọn đẹp) */}
                          {!isMe && (
                            <View style={styles.chatAvatarBox}>
                              {isLastInCluster ? (
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
                                <View style={{ width: 36, height: 36, backgroundColor: 'transparent' }} />
                              )}
                            </View>
                          )}

                          <View style={{ maxWidth: '82%' }}>
                            {/* Tên người gửi ở trên tin nhắn (chỉ hiện ở tin nhắn đầu của cụm nếu là người khác) */}
                            {!isMe && isFirstInCluster && (
                              <Text style={[styles.chatSenderTitleWeb, isDark && { color: themeColors.accentGreen }]}>
                                {senderName}
                              </Text>
                            )}

                          {/* Trường hợp 1: Thẻ tệp đính kèm Excel (.xlsx) chuẩn mẫu */}
                          {isExcelFile ? (
                            <View style={[styles.chatFileCardWeb, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                              <View style={[styles.chatFileIconBox, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                                <FinanceIcon name="file-excel" size={24} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.chatFileNameText, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>{cleanContent}</Text>
                                <Text style={[styles.chatFileSizeText, isDark && { color: themeColors.textMuted }]}>32 KB</Text>
                              </View>
                              <Pressable hitSlop={8} style={[styles.chatFileDownloadBtn, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                                <FinanceIcon name="download" size={16} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                              </Pressable>
                            </View>
                          ) : msg.attachments && msg.attachments.length > 0 ? (
                            /* Trường hợp Ảnh đính kèm từ thư viện */
                            <View
                              ref={(el) => {
                                messageBubbleRefs.current[msg.id] = el;
                              }}
                              collapsable={false}
                              style={{ gap: 6 }}
                            >
                              {msg.attachments.map((att, aIdx) => {
                                const fileUri = userProfileApi.formatAvatarUrl(att.fileKey) || att.fileKey;
                                return (
                                  <ChatAttachmentImageItem
                                    key={aIdx}
                                    uri={fileUri}
                                    width={att.width}
                                    height={att.height}
                                    onPress={() => {
                                      shouldAutoScrollRef.current = false;
                                      setLightboxImageUrl(fileUri);
                                      setLightboxImageInfo({
                                        timeStr: detailedTimeStr || 'Vừa xong',
                                        senderName: senderName,
                                      });
                                    }}
                                    onLongPress={() => {
                                      shouldAutoScrollRef.current = false;
                                      setActiveMenuMessageId(msg.id);
                                      setActiveReactionMessageId(null);
                                      const targetNode = messageBubbleRefs.current[msg.id];
                                      if (targetNode && targetNode.measureInWindow) {
                                        targetNode.measureInWindow((x, y, width, height) => {
                                          setActiveTargetLayout({ x, y, width, height });
                                          setActiveActionTargetMessage(msg);
                                        });
                                      } else {
                                        setActiveTargetLayout(null);
                                        setActiveActionTargetMessage(msg);
                                      }
                                    }}
                                  />
                                );
                              })}
                              {cleanContent && cleanContent !== 'Đã gửi một ảnh' ? (
                                <View
                                  style={[
                                    styles.chatMessageBubbleWeb,
                                    isMe
                                      ? (isDark ? { backgroundColor: '#059669', borderColor: '#047857' } : styles.chatBubbleMeWeb)
                                      : (isDark ? { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder } : styles.chatBubbleOtherWeb),
                                    // Bo góc cụm tin nhắn
                                    !isFirstInCluster && (isMe ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 }),
                                    !isLastInCluster && (isMe ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
                                  ]}
                                >
                                  {isEdited && !isRecalled && (
                                    <Text style={[styles.chatEditedBadge, isMe ? { color: '#DCFCE7' } : { color: isDark ? themeColors.textMuted : '#64748B' }]}>
                                      Đã sửa
                                    </Text>
                                  )}
                                  <Text
                                    style={[
                                      styles.chatMessageContentWeb,
                                      isMe
                                        ? (isDark ? { color: '#FFFFFF' } : styles.chatMessageTextMeWeb)
                                        : [styles.chatMessageTextOtherWeb, isDark && { color: themeColors.textPrimary }],
                                    ]}
                                  >
                                    {cleanContent}
                                  </Text>
                                </View>
                              ) : null}
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
                          ) : isRecalled ? (
                            /* Tin nhắn đã bị thu hồi */
                            <View
                              style={[
                                styles.chatMessageBubbleWeb,
                                styles.chatRecalledBubble,
                                isDark && {
                                  backgroundColor: themeColors.surfaceSubtle,
                                  borderColor: themeColors.cardBorder,
                                },
                              ]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <FinanceIcon name="alert-circle" size={13} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                                <Text
                                  style={[
                                    styles.chatRecalledText,
                                    isDark && { color: themeColors.textMuted },
                                  ]}
                                >
                                  Tin nhắn đã bị thu hồi
                                </Text>
                              </View>
                            </View>
                          ) : (
                            /* Trường hợp 3: Tin nhắn thông thường chuẩn design */
                            <View
                              ref={(el) => {
                                messageBubbleRefs.current[msg.id] = el;
                              }}
                              collapsable={false}
                            >
                              <Pressable
                                onLongPress={() => {
                                  shouldAutoScrollRef.current = false;
                                  setActiveMenuMessageId(msg.id);
                                  setActiveReactionMessageId(null);
                                  const targetNode = messageBubbleRefs.current[msg.id];
                                  if (targetNode && targetNode.measureInWindow) {
                                    targetNode.measureInWindow((x, y, width, height) => {
                                      setActiveTargetLayout({ x, y, width, height });
                                      setActiveActionTargetMessage(msg);
                                    });
                                  } else {
                                    setActiveTargetLayout(null);
                                    setActiveActionTargetMessage(msg);
                                  }
                                }}
                                onPress={() => {
                                  shouldAutoScrollRef.current = false;
                                  setSelectedMessageTimeId((prev) => (prev === msg.id ? null : msg.id));
                                }}
                                style={[
                                  styles.chatMessageBubbleWeb,
                                  isMe
                                    ? (isDark ? { backgroundColor: '#059669', borderColor: '#047857' } : styles.chatBubbleMeWeb)
                                    : (isDark ? { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder } : styles.chatBubbleOtherWeb),
                                  // Bo góc cụm tin nhắn như Messenger
                                  !isFirstInCluster && (isMe ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 }),
                                  !isLastInCluster && (isMe ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
                                ]}
                              >
                                {isEdited && (
                                  <Text style={[styles.chatEditedBadge, isMe ? { color: '#DCFCE7' } : { color: isDark ? themeColors.textMuted : '#64748B' }]}>
                                    Đã sửa
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.chatMessageContentWeb,
                                    isMe
                                      ? styles.chatMessageTextMeWeb
                                      : [styles.chatMessageTextOtherWeb, isDark && { color: themeColors.textPrimary }],
                                  ]}
                                >
                                  {cleanContent}
                                </Text>
                              </Pressable>
                            </View>
                          )}

                          {/* Hiển thị thanh Reaction badges phía dưới bubble */}
                          {reactionsList.length > 0 && !isRecalled && (
                            <Pressable
                              onPress={() => setViewingReactionModalMessage(msg)}
                              style={[
                                styles.chatReactionsBadgeContainer,
                                isDark && {
                                  backgroundColor: themeColors.surface,
                                  borderColor: themeColors.cardBorder,
                                },
                                isMe ? { alignSelf: 'flex-end', marginRight: 4 } : { alignSelf: 'flex-start', marginLeft: 4 },
                              ]}
                            >
                              <View style={styles.chatReactionsRow}>
                                {uniqueEmojis.map((emoji) => (
                                  <Text key={emoji} style={styles.chatReactionEmojiText}>{emoji}</Text>
                                ))}
                                <Text
                                  style={[
                                    styles.chatReactionCountText,
                                    isDark && { color: themeColors.textSecondary },
                                  ]}
                                >
                                  {reactionsList.length}
                                </Text>
                              </View>
                            </Pressable>
                          )}

                          {/* Khi ấn vào tin nhắn 1 lần: hiện thời gian gửi (giờ/ngày) và dòng "ai đã xem" chuẩn Messenger */}
                          {isSelected && !isRecalled && (
                            <View style={[styles.chatClickedDetailContainer, isMe ? { alignSelf: 'flex-end', marginRight: 4 } : { alignSelf: 'flex-start', marginLeft: 4 }]}>
                              {/* Dòng thời gian gửi: ví dụ "14:30" (hôm nay) hoặc "Hôm qua lúc 14:30" hoặc "05/11/2026 lúc 14:30" */}
                              {detailedTimeStr ? (
                                <Text style={[styles.chatClickedDetailTimeText, isMe ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                                  {detailedTimeStr}
                                </Text>
                              ) : null}

                              {/* Danh sách ai đã xem tin nhắn */}
                              <View style={styles.chatClickedSeenBox}>
                                <View style={styles.chatClickedSeenHeader}>
                                  <FinanceIcon name="seen-eye" size={12} color="#059669" />
                                  <Text style={styles.chatClickedSeenTitle}>
                                    {allReadersOfMessage.length > 0
                                      ? `Đã xem (${allReadersOfMessage.length}):`
                                      : 'Chưa có ai xem'}
                                  </Text>
                                </View>
                                {allReadersOfMessage.length > 0 && (
                                  <View style={styles.chatClickedSeenAvatarsList}>
                                    {allReadersOfMessage.map((sm) => {
                                      const smName = sm.user?.fullName || sm.nickname || sm.user?.email || 'Thành viên';
                                      const rawUrl = sm.userId === currentUser?.id ? currentUser?.avatarUrl : (sm.user?.avatarUrl || sm.user?.avatarKey);
                                      const smAvatar = rawUrl ? userProfileApi.formatAvatarUrl(rawUrl) : null;
                                      return (
                                        <View key={sm.userId} style={styles.chatClickedSeenUserChip}>
                                          <View style={styles.chatSeenAvatarCircle}>
                                            {smAvatar ? (
                                              <Image source={{ uri: smAvatar }} style={styles.chatSeenAvatarImg} />
                                            ) : (
                                              <Text style={styles.chatSeenAvatarChar}>{smName.slice(0, 1).toUpperCase()}</Text>
                                            )}
                                          </View>
                                          <Text style={styles.chatClickedSeenUserName} numberOfLines={1}>{smName}</Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            </View>
                          )}

                          {/* Action Bar nhanh khi bấm chọn tin nhắn (Thả cảm xúc + 3 chấm thao tác) - Chuyển sang Modal chuẩn iOS/Messenger */}
                          {/* (Đã được chuyển ra Modal overlay toàn màn hình để chạm bất cứ đâu bên ngoài đều tự tắt) */}

                        </View>
                      </View>
                    </View>
                  );
                })}
                </>
              );
              })()}
              </View>
              )}
            </ScrollView>

            {/* Popup chọn Emoji / Biểu cảm nhanh chuẩn như Web */}
            {showEmojiPicker && (
              <View
                style={[
                  styles.chatEmojiPickerPopup,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chatEmojiPickerTitle,
                    isDark && { color: themeColors.textSecondary },
                  ]}
                >
                  Biểu cảm nhanh
                </Text>
                <View style={styles.chatEmojiGrid}>
                  {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥', '✨', '💸', '💰', '🍔', '☕', '👶', '🙏', '💯', '👌'].map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        setNewMessageText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.chatEmojiItemBtn,
                        isDark && { backgroundColor: themeColors.surfaceSubtle },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Modal chỉnh sửa tin nhắn chuẩn Web */}
            {editingMessage && (
              <View style={styles.chatEditingBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatEditingBannerTitle}>Đang chỉnh sửa tin nhắn</Text>
                  <TextInput
                    style={styles.chatEditingTextInput}
                    value={editingMessage.text}
                    onChangeText={(val) => setEditingMessage((prev) => (prev ? { ...prev, text: val } : null))}
                    multiline
                  />
                </View>
                <View style={{ gap: 6, marginLeft: 8 }}>
                  <Pressable
                    onPress={handleSaveEditMessage}
                    style={styles.chatEditingSaveBtn}
                  >
                    <Text style={styles.chatEditingSaveBtnText}>Lưu</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingMessage(null)}
                    style={styles.chatEditingCancelBtn}
                  >
                    <Text style={styles.chatEditingCancelBtnText}>Hủy</Text>
                  </Pressable>
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
            <View
              style={[
                styles.chatInputBarContainerWeb,
                { paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 10, 6) : 6 },
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderTopColor: themeColors.cardBorder,
                },
              ]}
            >
              <Pressable
                onPress={handlePickChatImage}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.chatInputAttachmentBtn,
                  isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                  pressed && styles.pressed,
                ]}
              >
                <FinanceIcon name="paperclip" size={20} color={isDark ? themeColors.accentGreen : '#0E964E'} />
              </Pressable>

              <View
                style={[
                  styles.chatInputInnerBox,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.chatTextInputWeb,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                  placeholder={selectedImageAttachment ? 'Thêm chú thích ảnh...' : 'Nhập tin nhắn...'}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={newMessageText}
                  onChangeText={setNewMessageText}
                  onFocus={() => {
                    setTimeout(() => {
                      chatScrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                  multiline
                />
                <Pressable
                  onPress={() => setShowEmojiPicker((prev) => !prev)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.chatEmojiBtn, pressed && styles.pressed]}
                >
                  <FinanceIcon
                    name="smile"
                    size={19}
                    color={showEmojiPicker ? (isDark ? themeColors.accentGreen : '#0E964E') : (isDark ? '#64748B' : '#94A3B8')}
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={handleSendMessage}
                disabled={sendingMessage || uploadingAttachment || (!newMessageText.trim() && !selectedImageAttachment)}
                style={({ pressed }) => [
                  styles.chatSendCircleBtnWeb,
                  isDark && { backgroundColor: '#10B981' },
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

            {/* Nút tròn nổi cuộn xuống tin nhắn mới nhất dưới cùng */}
            {showScrollBottomBtn && (
              <Pressable
                onPress={() => {
                  shouldAutoScrollRef.current = true;
                  chatScrollViewRef.current?.scrollToEnd({ animated: true });
                }}
                style={({ pressed }) => [styles.chatScrollBottomFloatingBtn, pressed && styles.pressed]}
                hitSlop={8}
              >
                <FinanceIcon name="chevron-down" size={20} color="#059669" />
              </Pressable>
            )}

            {/* Modal Overlay đè tin nhắn (Messenger style): Vị trí bám sát tin nhắn & Chạm ngoài tự tắt */}
            <Modal
              visible={activeActionTargetMessage !== null}
              transparent
              animationType="fade"
              onRequestClose={() => {
                setActiveActionTargetMessage(null);
                setActiveTargetLayout(null);
                setActiveMenuMessageId(null);
                setActiveReactionMessageId(null);
                setRecallingMessageId(null);
              }}
            >
              <Pressable
                style={styles.chatActionModalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setActiveActionTargetMessage(null);
                  setActiveTargetLayout(null);
                  setActiveMenuMessageId(null);
                  setActiveReactionMessageId(null);
                  setRecallingMessageId(null);
                }}
              >
                {activeActionTargetMessage && (() => {
                  const target = activeActionTargetMessage;
                  const isMe = target.senderId === currentUser?.id;
                  const cleanContent = target.content
                    .replace(/^\[\[BALANCE\]\]/, '')
                    .replace(/^\[\[LEDGER\|.*?\]\]/, '')
                    .replace(/^\[\[TRANSACTION\]\]/, '');

                  const { width: winW, height: winH } = Dimensions.get('window');
                  // Tính toán vị trí neo (anchor)
                  const menuW = 270;
                  const isRecallingOpen = recallingMessageId === target.id;
                  const estimatedMenuH = isRecallingOpen
                    ? 240
                    : isMe && (!target.attachments || target.attachments.length === 0)
                      ? 145
                      : 100;
                  const menuH = estimatedMenuH;
                  const placeAbove = activeTargetLayout ? (activeTargetLayout.y > winH * 0.45) : false;

                  return (
                    <Pressable
                      style={styles.chatActionModalOverlay}
                      activeOpacity={1}
                      onPress={() => {
                        setActiveActionTargetMessage(null);
                        setActiveTargetLayout(null);
                        setActiveMenuMessageId(null);
                        setActiveReactionMessageId(null);
                        setRecallingMessageId(null);
                      }}
                    >
                      {activeTargetLayout && (
                        <>
                          {/* 1. Tin nhắn / Ảnh nổi lên tại ĐÚNG TỌA ĐỘ VỊ TRÍ GỐC TRÊN MÀN HÌNH */}
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: activeTargetLayout.x,
                              top: activeTargetLayout.y,
                              width: activeTargetLayout.width,
                              height: activeTargetLayout.height,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 6 },
                              shadowOpacity: 0.35,
                              shadowRadius: 14,
                              elevation: 12,
                              zIndex: 10,
                            }}
                          >
                            {target.attachments && target.attachments.length > 0 ? (
                              <View style={[styles.chatAttachmentImgContainer, { width: activeTargetLayout.width, height: activeTargetLayout.height }]}>
                                <Image
                                  source={{ uri: userProfileApi.formatAvatarUrl(target.attachments[0].fileKey) || target.attachments[0].fileKey }}
                                  style={styles.chatAttachmentImg}
                                  resizeMode="cover"
                                />
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.chatMessageBubbleWeb,
                                  isMe
                                    ? (isDark ? { backgroundColor: '#059669', borderColor: '#047857' } : styles.chatBubbleMeWeb)
                                    : (isDark ? { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder } : styles.chatBubbleOtherWeb),
                                  { width: '100%', height: '100%', margin: 0 },
                                ]}
                              >
                                {target.isEdited && (
                                  <Text style={[styles.chatEditedBadge, isMe ? { color: '#DCFCE7' } : { color: isDark ? themeColors.textMuted : '#64748B' }]}>
                                    Đã sửa
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.chatMessageContentWeb,
                                    isMe
                                      ? (isDark ? { color: '#FFFFFF' } : styles.chatMessageTextMeWeb)
                                      : [styles.chatMessageTextOtherWeb, isDark && { color: themeColors.textPrimary }],
                                  ]}
                                >
                                  {cleanContent}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* 2. Menu cảm xúc và hành động gắn ngay trên/dưới tin nhắn gốc */}
                          <Pressable
                            style={{
                              position: 'absolute',
                              ...(placeAbove
                                ? { bottom: Math.max(16, winH - activeTargetLayout.y + 8) }
                                : { top: Math.min(winH - 80, activeTargetLayout.y + activeTargetLayout.height + 8) }),
                              ...(isMe
                                ? { right: Math.max(12, winW - (activeTargetLayout.x + activeTargetLayout.width)) }
                                : { left: Math.max(12, activeTargetLayout.x) }),
                              width: menuW,
                              zIndex: 20,
                            }}
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                          >
                            <View style={{ gap: 8 }}>
                              {/* Thanh 6 Emoji cảm xúc */}
                              <View
                                style={[
                                  styles.chatReactionPickRowModal,
                                  isDark && {
                                    backgroundColor: themeColors.surface,
                                    borderColor: themeColors.cardBorder,
                                  },
                                ]}
                              >
                                {['❤️', '😆', '😮', '😢', '😡', '👍'].map((emoji) => (
                                  <Pressable
                                    key={emoji}
                                    onPress={() => {
                                      handleToggleReaction(target.id, emoji);
                                      setActiveTargetLayout(null);
                                    }}
                                    style={({ pressed }) => [styles.chatReactionPickBtnModal, pressed && styles.pressed]}
                                  >
                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                  </Pressable>
                                ))}
                              </View>

                              {/* Menu các thao tác: Chỉnh sửa / Thu hồi */}
                              <View
                                style={[
                                  styles.chatActionMenuModalBox,
                                  isDark && {
                                    backgroundColor: themeColors.surface,
                                    borderColor: themeColors.cardBorder,
                                  },
                                ]}
                              >
                                {isMe && (!target.attachments || target.attachments.length === 0) && (
                                  <Pressable
                                    onPress={() => {
                                      setEditingMessage({ id: target.id, text: cleanContent });
                                      setActiveActionTargetMessage(null);
                                      setActiveTargetLayout(null);
                                      setActiveMenuMessageId(null);
                                      setRecallingMessageId(null);
                                    }}
                                    style={({ pressed }) => [styles.chatActionModalItem, pressed && styles.pressed]}
                                  >
                                    <Text
                                      style={[
                                        styles.chatActionModalItemText,
                                        isDark && { color: themeColors.textPrimary },
                                      ]}
                                    >
                                      Chỉnh sửa
                                    </Text>
                                    <FinanceIcon name="edit" size={16} color={isDark ? themeColors.textSecondary : '#334155'} />
                                  </Pressable>
                                )}

                                {isMe ? (
                                  <Pressable
                                    onPress={() => setRecallingMessageId((prev) => (prev === target.id ? null : target.id))}
                                    style={({ pressed }) => [
                                      styles.chatActionModalItem,
                                      pressed && styles.pressed,
                                      (!target.attachments || target.attachments.length === 0) && {
                                        borderTopWidth: 1,
                                        borderTopColor: isDark ? themeColors.divider : '#F1F5F9',
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.chatActionModalItemText, { color: '#DC2626' }]}>Thu hồi</Text>
                                    <FinanceIcon name="trash" size={16} color="#DC2626" />
                                  </Pressable>
                                ) : (
                                  <Pressable
                                    onPress={() => {
                                      handleHideMessageForMe(target.id);
                                      setActiveTargetLayout(null);
                                    }}
                                    style={({ pressed }) => [styles.chatActionModalItem, pressed && styles.pressed]}
                                  >
                                    <Text
                                      style={[
                                        styles.chatActionModalItemText,
                                        isDark && { color: themeColors.textPrimary },
                                      ]}
                                    >
                                      Xóa ở phía tôi
                                    </Text>
                                    <FinanceIcon name="trash" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                                  </Pressable>
                                )}
                              </View>

                              {/* Bảng phụ xác nhận Thu hồi 2 lựa chọn (khi bấm Thu hồi) */}
                              {recallingMessageId === target.id && (
                                <View
                                  style={[
                                    styles.chatRecallSubMenuModalBox,
                                    isDark && {
                                      backgroundColor: themeColors.surface,
                                      borderColor: themeColors.cardBorder,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chatRecallSubMenuTitleModal,
                                      isDark && { color: themeColors.textPrimary },
                                    ]}
                                  >
                                    Bạn muốn thu hồi tin nhắn này ở đâu?
                                  </Text>
                                  <Pressable
                                    onPress={() => {
                                      handleHideMessageForMe(target.id);
                                      setActiveTargetLayout(null);
                                    }}
                                    style={({ pressed }) => [styles.chatRecallSubMenuItemModal, pressed && styles.pressed]}
                                  >
                                    <Text style={styles.chatRecallSubMenuTextModal}>Thu hồi với bạn</Text>
                                    <Text style={styles.chatRecallSubMenuSubModal}>Tin nhắn chỉ biến mất khỏi thiết bị của bạn</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      handleRecallMessage(target.id);
                                      setActiveTargetLayout(null);
                                    }}
                                    style={({ pressed }) => [styles.chatRecallSubMenuItemModal, pressed && styles.pressed, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}
                                  >
                                    <Text style={[styles.chatRecallSubMenuTextModal, { color: '#EF4444' }]}>Thu hồi với mọi người</Text>
                                    <Text style={styles.chatRecallSubMenuSubModal}>Tin nhắn sẽ bị thu hồi với tất cả thành viên</Text>
                                  </Pressable>
                                </View>
                              )}
                            </View>
                          </Pressable>
                        </>
                      )}
                    </Pressable>
                  );
                })()}
              </Pressable>
            </Modal>
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
              // Tính phần trăm tăng giảm số dư quỹ so với cuối tháng trước
              let trendPct: number = 0;
              if (monthlyStats?.trendPercentage !== undefined && monthlyStats?.trendPercentage !== null) {
                trendPct = monthlyStats.trendPercentage;
              } else {
                // Tự tính nếu chưa có dữ liệu từ API stats
                const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
                const prevYear = thisMonth === 1 ? thisYear - 1 : thisYear;
                const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

                // Tổng nộp vào quỹ tính đến hết tháng trước
                const prevTotalFundIn = fundContributions
                  .filter((c) => c.contributedAt && new Date(c.contributedAt) <= prevMonthEnd)
                  .reduce((sum, c) => sum + (c.amount || 0), 0);

                // Tổng chi từ quỹ nhóm tính đến hết tháng trước
                const prevTotalFundOut = expenses
                  .filter((e) => (e as any).paymentSource === 'GROUP_FUND' && e.expenseDate && new Date(e.expenseDate) <= prevMonthEnd)
                  .reduce((sum, e) => sum + (e.amount || 0), 0);

                const prevBalance = Math.max(0, prevTotalFundIn - prevTotalFundOut);

                if (prevBalance > 0) {
                  trendPct = ((totalFund - prevBalance) / prevBalance) * 100;
                } else if (totalFund > 0) {
                  // Tháng trước số dư = 0đ, tháng này số dư > 0 -> Tăng 100%
                  trendPct = 100;
                } else {
                  trendPct = 0;
                }
              }

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

                  {/* 1.1 CẶP NÚT THAO TÁC: NỘP QUỸ & THÊM GIAO DỊCH (CHUẨN ẢNH MẪU) */}
                  <View style={styles.heroActionButtonsRow}>
                    {/* Nút Nộp quỹ: Nền xanh lá đậm #059669, chữ trắng, icon ví */}
                    <Pressable
                      onPress={() => setDepositFundModalVisible(true)}
                      style={({ pressed }) => [
                        styles.heroDepositFundBtn,
                        isDark && { backgroundColor: '#10B981' },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <FinanceIcon name="wallet" size={17} color="#FFFFFF" />
                      <Text style={styles.heroDepositFundBtnText}>Nộp quỹ</Text>
                    </Pressable>

                    {/* Nút Thêm giao dịch: Nền trắng viền xanh nhạt #ECFDF5, chữ xanh #059669 */}
                    <Pressable
                      onPress={() => {
                        setExpDescription('');
                        setExpAmount('');
                        setExpenseModalVisible(true);
                      }}
                      style={({ pressed }) => [
                        styles.heroAddTxBtn,
                        isDark && {
                          backgroundColor: 'rgba(52, 211, 153, 0.15)',
                          borderColor: 'rgba(52, 211, 153, 0.3)',
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <FinanceIcon name="plus" size={17} color={isDark ? themeColors.accentGreen : '#059669'} />
                      <Text style={[styles.heroAddTxBtnText, isDark && { color: themeColors.accentGreen }]}>Thêm giao dịch</Text>
                    </Pressable>
                  </View>

                  {/* 2. LƯỚI 4 THẺ THỐNG KÊ (THU, CHI, CÒN LẠI, GIAO DỊCH) */}
                  <View style={styles.stat4Grid}>
                    {/* Thẻ Thu: Mũi tên xanh đi lên */}
                    <View
                      style={[
                        styles.stat4Card,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.stat4IconBox, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : '#DCFCE7' }]}>
                        <FinanceIcon name="income" size={17} color={isDark ? '#34D399' : '#16A34A'} />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={[styles.stat4Label, isDark && { color: themeColors.textSecondary }]}>Thu</Text>
                        <Text style={[styles.stat4Value, { color: isDark ? '#34D399' : '#0F172A' }]}>
                          {formatVND(totalIncome)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Chi: Mũi tên đỏ đi xuống */}
                    <View
                      style={[
                        styles.stat4Card,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.stat4IconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FFE4E6' }]}>
                        <FinanceIcon name="expense" size={17} color={isDark ? '#F87171' : '#E11D48'} />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={[styles.stat4Label, isDark && { color: themeColors.textSecondary }]}>Chi</Text>
                        <Text style={[styles.stat4Value, { color: isDark ? '#F87171' : '#E11D48' }]}>
                          {formatVND(totalExp)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Còn lại */}
                    <View
                      style={[
                        styles.stat4Card,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.stat4IconBox, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : '#DCFCE7' }]}>
                        <FinanceIcon name="credit-card" size={17} color={isDark ? '#34D399' : '#16A34A'} />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={[styles.stat4Label, isDark && { color: themeColors.textSecondary }]}>Còn lại</Text>
                        <Text style={[styles.stat4Value, { color: isDark ? themeColors.textPrimary : '#0F172A' }]}>
                          {formatVND(remaining)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Giao dịch */}
                    <View
                      style={[
                        styles.stat4Card,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.stat4IconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE' }]}>
                        <FinanceIcon name="receipt" size={17} color={isDark ? '#38BDF8' : '#0284C7'} />
                      </View>
                      <View style={styles.stat4Content}>
                        <Text style={[styles.stat4Label, isDark && { color: themeColors.textSecondary }]}>Giao dịch</Text>
                        <Text style={[styles.stat4Value, { color: isDark ? themeColors.textPrimary : '#0F172A' }]}>
                          {txCount} khoản
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 3. BIỂU ĐỒ CHI TIÊU THEO DANH MỤC */}
                  <View
                    style={[
                      styles.categoryChartCard,
                      isDark && {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryChartTitle, isDark && { color: themeColors.textPrimary }]}>Chi tiêu theo danh mục</Text>
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
                          <Text style={[styles.donutCenterLabel, isDark && { color: themeColors.textMuted }]}>Tổng chi</Text>
                          <Text
                            style={[
                              styles.donutCenterValue,
                              isDark ? { color: '#F87171' } : null,
                            ]}
                            numberOfLines={1}
                          >
                            {formatVND(totalExp)}
                          </Text>
                          <Text style={[styles.donutCenterCurrency, isDark && { color: themeColors.textMuted }]}>VNĐ</Text>
                        </View>
                      </View>

                      {/* Chú thích các danh mục */}
                      <View style={styles.chartLegendCol}>
                        {categories.slice(0, 4).map((cat, idx) => (
                          <View key={idx} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: cat.color || '#10B981' }]} />
                            <Text
                              style={[
                                styles.legendName,
                                isDark && { color: themeColors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {cat.categoryName}
                            </Text>
                            <Text
                              style={[
                                styles.legendPercent,
                                isDark && { color: themeColors.textPrimary },
                              ]}
                            >
                              {Math.round(cat.percentage)}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 4. GIAO DỊCH GẦN ĐÂY (HIỂN THỊ CẢ THU VÀ CHI VỚI ĐÚNG ICON THEO DANH MỤC) */}
                  {(() => {
                    // Gom cả khoản Nộp quỹ (Thu) và Khoản chi (Chi) thành danh sách giao dịch tổng hợp
                    type RecentItem = {
                      id: string;
                      type: 'INCOME' | 'EXPENSE';
                      title: string;
                      creatorName: string;
                      dateText: string;
                      amount: number;
                      rawDate: Date;
                      iconName: any;
                      categoryColor: string;
                      originalExpense?: GroupExpenseResponse;
                      originalContribution?: GroupFundContributionResponse;
                    };

                    const formatDisplayDate = (dStr?: string, cStr?: string) => {
                      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                      if (cStr) {
                        const dt = new Date(cStr);
                        if (!isNaN(dt.getTime())) {
                          const now = new Date();
                          const isToday = dt.toDateString() === now.toDateString();
                          const timeStr = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
                          if (isToday) return `${timeStr} • Hôm nay`;
                          return `${timeStr} • ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
                        }
                      }
                      if (dStr) {
                        const parts = dStr.split('-');
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                      }
                      return 'Hôm nay';
                    };

                    const recentList: RecentItem[] = [
                      ...fundContributions.map((c) => {
                        const d = c.createdAt ? new Date(c.createdAt) : new Date(c.contributedAt || Date.now());
                        const foundMem = members.find((m) => m.userId === c.contributorUserId);
                        const cName = c.contributorName || (c.contributorUserId === currentUser?.id ? 'Bạn' : null) || foundMem?.nickname || foundMem?.user?.fullName || 'Thành viên';
                        return {
                          id: `fund-${c.id}`,
                          type: 'INCOME' as const,
                          title: c.note || 'Nộp quỹ nhóm',
                          creatorName: cName,
                          dateText: formatDisplayDate(c.contributedAt, c.createdAt),
                          amount: c.amount || 0,
                          rawDate: d,
                          iconName: 'wallet' as any,
                          categoryColor: '#059669',
                          originalContribution: c,
                        };
                      }),
                      ...expenses.map((exp) => {
                        const d = exp.createdAt ? new Date(exp.createdAt) : new Date(exp.expenseDate || Date.now());
                        const payer = exp.payer?.fullName || (exp.paidByUserId === currentUser?.id ? 'Bạn' : null) || members.find((m) => m.userId === exp.paidByUserId)?.user?.fullName || members.find((m) => m.userId === exp.paidByUserId)?.nickname || 'Thành viên';
                        const catIcon = resolveCategoryIconName(undefined, 'EXPENSE', `${exp.description} ${exp.category?.name || ''}`);
                        return {
                          id: `exp-${exp.id}`,
                          type: 'EXPENSE' as const,
                          title: exp.description || exp.category?.name || 'Chi tiêu nhóm',
                          creatorName: payer,
                          dateText: formatDisplayDate(exp.expenseDate, exp.createdAt),
                          amount: exp.amount || 0,
                          rawDate: d,
                          iconName: catIcon,
                          categoryColor: exp.category?.color || '#E11D48',
                          originalExpense: exp,
                        };
                      }),
                    ];

                    recentList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
                    const topRecent = recentList.slice(0, 4);

                    return (
                      <View
                        style={[
                          styles.recentTxCard,
                          isDark && {
                            backgroundColor: themeColors.surface,
                            borderColor: themeColors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.recentTxHeader}>
                          <Text style={[styles.recentTxTitle, isDark && { color: themeColors.textPrimary }]}>Giao dịch gần đây</Text>
                          <Pressable onPress={() => setDetailTab('EXPENSES')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={[styles.recentTxViewMore, isDark && { color: themeColors.accentGreen }]}>Xem tất cả</Text>
                            <FinanceIcon name="chevron-right" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                          </Pressable>
                        </View>

                        {topRecent.length === 0 ? (
                          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 }}>
                            <FinanceIcon name="receipt" size={28} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                            <Text style={[{ fontSize: 13, fontWeight: '600', color: '#64748B' }, isDark && { color: themeColors.textSecondary }]}>Chưa có giao dịch gần đây</Text>
                            <Text style={[{ fontSize: 11, color: '#94A3B8' }, isDark && { color: themeColors.textMuted }]}>Các khoản nộp quỹ và chi tiêu sẽ xuất hiện tại đây</Text>
                          </View>
                        ) : (
                          topRecent.map((item) => {
                            const isIncome = item.type === 'INCOME';
                            return (
                              <Pressable
                                key={item.id}
                                onPress={() => {
                                  if (item.originalExpense) {
                                    setViewingExpense(item.originalExpense);
                                  } else if (item.originalContribution) {
                                    setViewingContribution(item.originalContribution);
                                  } else {
                                    setDetailTab('EXPENSES');
                                  }
                                }}
                                style={({ pressed }) => [styles.sampleTxItem, pressed && styles.pressed]}
                              >
                                <View
                                  style={[
                                    styles.sampleTxIconWrap,
                                    {
                                      backgroundColor: isIncome
                                        ? (isDark ? 'rgba(52, 211, 153, 0.16)' : '#ECFDF5')
                                        : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FFF1F2'),
                                    },
                                  ]}
                                >
                                  <FinanceIcon
                                    name={item.iconName}
                                    size={18}
                                    color={isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : (item.categoryColor || '#E11D48'))}
                                  />
                                </View>
                                <View style={{ flex: 1, paddingRight: 6 }}>
                                  <Text
                                    style={[
                                      styles.sampleTxDesc,
                                      isDark && { color: themeColors.textPrimary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.title}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.sampleTxCreator,
                                      isDark && { color: themeColors.textSecondary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    bởi {item.creatorName}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.sampleTxTime,
                                      isDark && { color: themeColors.textMuted },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.dateText}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.sampleTxAmount,
                                    {
                                      color: isIncome
                                        ? (isDark ? '#34D399' : '#059669')
                                        : (isDark ? '#F87171' : '#E11D48'),
                                      fontWeight: '800',
                                    },
                                  ]}
                                >
                                  {isIncome ? `+${formatVND(item.amount)} đ` : `-${formatVND(item.amount)} đ`}
                                </Text>
                              </Pressable>
                            );
                          })
                        )}
                      </View>
                    );
                  })()}
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
                originalContribution?: GroupFundContributionResponse;
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

              // Hàm phân tích ngày giờ chính xác, tránh lỗi lệch múi giờ UTC thành 07:00 sáng
              const parseTxDateTime = (dateValue?: string, timeValue?: string) => {
                if (timeValue) {
                  // Nếu có mốc thời gian ISO đầy đủ (createdAt)
                  const dt = new Date(timeValue);
                  if (!isNaN(dt.getTime())) {
                    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                    const datePart = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
                    const timePart = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
                    return { rawDate: dt, dateStr: datePart, timeStr: timePart };
                  }
                }
                if (dateValue) {
                  // Nếu chỉ có ngày YYYY-MM-DD (expenseDate / contributedAt)
                  const parts = dateValue.split('-');
                  if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);
                    const localDate = new Date(y, m, d, 12, 0, 0);
                    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                    return {
                      rawDate: localDate,
                      dateStr: `${y}-${pad(m + 1)}-${pad(d)}`,
                      timeStr: 'Hôm nay',
                    };
                  }
                }
                const now = new Date();
                const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                return {
                  rawDate: now,
                  dateStr: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
                  timeStr: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
                };
              };

              const unifiedList: UnifiedTx[] = [
                ...monthContributions.map((c) => {
                  const { rawDate, dateStr, timeStr } = parseTxDateTime(c.contributedAt, c.createdAt);
                  const displayName = getContributorDisplayName(c);
                  return {
                    id: `fund-${c.id}`,
                    type: 'INCOME' as const,
                    title: c.note || 'Đóng tiền quỹ nhóm',
                    subtitle: `Bởi ${displayName}`,
                    amount: c.amount || 0,
                    dateStr,
                    timeStr,
                    rawDate,
                    categoryName: 'Đóng quỹ',
                    commentCount: (commentsByTarget[c.id] || []).length,
                    originalExpense: undefined,
                    originalContribution: c,
                  };
                }),
                ...monthExpenses.map((e) => {
                  const { rawDate, dateStr, timeStr } = parseTxDateTime(e.expenseDate, e.createdAt);
                  const displayName = getPayerDisplayName(e);
                  return {
                    id: e.id,
                    type: 'EXPENSE' as const,
                    title: e.description,
                    subtitle: `Bởi ${displayName}`,
                    amount: e.amount || 0,
                    dateStr,
                    timeStr,
                    rawDate,
                    categoryName: e.category?.name || 'Chi tiêu',
                    commentCount: (commentsByTarget[e.id] || []).length,
                    originalExpense: e,
                    category: e.category,
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

              // Hàm trả về icon và màu chuẩn: Xanh lá ví/thu quỹ (như bản Web), Đỏ cho chi tiền (Chi)
              const getTxIconMeta = (tx: UnifiedTx) => {
                if (tx.type === 'INCOME') {
                  return { icon: 'wallet' as any, bg: '#E8F8F0', color: '#059669' };
                }
                const iconName = resolveCategoryIconName(undefined, 'EXPENSE', `${tx.title} ${tx.categoryName || ''}`);
                return { icon: iconName as any, bg: '#FCE8E6', color: '#C5221F' };
              };

              return (
                <View style={{ gap: 14, paddingBottom: 80 }}>
                  {/* THANH CHỌN BỘ LỌC (TẤT CẢ | THU | CHI) & BỘ CHỌN THÁNG CHUẨN ẢNH MẪU */}
                  <View style={styles.filterAndMonthHeaderRow}>
                    {/* Cụm Segmented Filter: Tất cả | Thu | Chi */}
                    <View
                      style={[
                        styles.segmentedFilterContainer,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => setTxTypeFilter('ALL')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'ALL' && (isDark ? { backgroundColor: '#10B981' } : styles.segmentedFilterBtnActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            isDark && { color: themeColors.textSecondary },
                            txTypeFilter === 'ALL' && [
                              styles.segmentedFilterTextActive,
                              isDark && { color: '#FFFFFF', fontWeight: '800' },
                            ],
                          ]}
                        >
                          Tất cả
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTxTypeFilter('INCOME')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'INCOME' && (isDark ? { backgroundColor: '#10B981' } : styles.segmentedFilterBtnActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            isDark && { color: themeColors.textSecondary },
                            txTypeFilter === 'INCOME' && [
                              styles.segmentedFilterTextActive,
                              isDark && { color: '#FFFFFF', fontWeight: '800' },
                            ],
                          ]}
                        >
                          Thu
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setTxTypeFilter('EXPENSE')}
                        style={[
                          styles.segmentedFilterBtn,
                          txTypeFilter === 'EXPENSE' && (isDark ? { backgroundColor: '#10B981' } : styles.segmentedFilterBtnActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedFilterText,
                            isDark && { color: themeColors.textSecondary },
                            txTypeFilter === 'EXPENSE' && [
                              styles.segmentedFilterTextActive,
                              isDark && { color: '#FFFFFF', fontWeight: '800' },
                            ],
                          ]}
                        >
                          Chi
                        </Text>
                      </Pressable>
                    </View>

                    {/* Nút chọn tháng thả xuống chuẩn như màn Ví/Thu chi */}
                    <Pressable
                      onPress={() => setMonthModalVisible(true)}
                      style={[
                        styles.monthDropdownPillBtn,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.monthDropdownPillText,
                          isDark && { color: themeColors.textPrimary },
                        ]}
                      >
                        {selectedMonthLabel}
                      </Text>
                      <Text
                        style={[
                          styles.monthDropdownChevron,
                          isDark && { color: themeColors.textMuted },
                        ]}
                      >
                        ⌄
                      </Text>
                    </Pressable>
                  </View>

                  {/* 2 THẺ TỔNG HỢP: TỔNG THU & TỔNG CHI (CHUẨN MÀU BẢN WEB) */}
                  <View style={styles.summaryTopRow}>
                    {/* Thẻ Tổng thu */}
                    <View
                      style={[
                        styles.summaryBoxHalf,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.summaryArrowCircle, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : '#E6F4EA' }]}>
                        <FinanceIcon name="income" size={16} color={isDark ? '#34D399' : '#137333'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryBoxLabel, isDark && { color: themeColors.textSecondary }]}>Tổng thu</Text>
                        <Text
                          style={[
                            styles.summaryBoxIncomeValue,
                            isDark && { color: '#34D399' },
                          ]}
                        >
                          {formatVND(totalIncome)} đ
                        </Text>
                      </View>
                    </View>

                    {/* Thẻ Tổng chi */}
                    <View
                      style={[
                        styles.summaryBoxHalf,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.summaryArrowCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FCE8E6' }]}>
                        <FinanceIcon name="expense" size={16} color={isDark ? '#F87171' : '#C5221F'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryBoxLabel, isDark && { color: themeColors.textSecondary }]}>Tổng chi</Text>
                        <Text
                          style={[
                            styles.summaryBoxExpenseValue,
                            isDark && { color: '#F87171' },
                          ]}
                        >
                          {formatVND(totalExpense)} đ
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* TIÊU ĐỀ DANH SÁCH GIAO DỊCH */}
                  <View style={styles.txSectionHeader}>
                    <Text style={[styles.txSectionTitle, isDark && { color: themeColors.textPrimary }]}>Giao dịch ({unifiedList.length})</Text>
                    <Pressable hitSlop={8}>
                      <FinanceIcon name="search" size={16} color={isDark ? themeColors.textMuted : '#64748B'} />
                    </Pressable>
                  </View>

                  {/* DANH SÁCH GIAO DỊCH GOM THEO NGÀY */}
                  {unifiedList.length === 0 ? (
                    <View
                      style={[
                        styles.detailEmptyCard,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 28, marginBottom: 6 }}>🧾</Text>
                      <Text style={[styles.detailEmptyTitle, isDark && { color: themeColors.textPrimary }]}>Không có giao dịch trong {selectedMonthLabel}</Text>
                      <Text style={[styles.detailEmptySub, isDark && { color: themeColors.textSecondary }]}>
                        Bấm "+ Thêm giao dịch" bên dưới để ghi nhận chi tiêu hoặc nộp quỹ.
                      </Text>
                    </View>
                  ) : (
                    Object.entries(groupedByDate).map(([dateLabel, items]) => (
                      <View key={dateLabel} style={styles.dateGroupContainer}>
                        <View
                          style={[
                            styles.dateBadgePill,
                            isDark && {
                              backgroundColor: themeColors.surfaceSubtle,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.dateBadgeText, isDark && { color: themeColors.textSecondary }]}>{dateLabel}</Text>
                        </View>

                        <View
                          style={[
                            styles.txItemsListCard,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          {items.map((tx, idx) => {
                            const meta = getTxIconMeta(tx);
                            const isIncome = tx.type === 'INCOME';

                            return (
                              <Pressable
                                key={tx.id}
                                onPress={() => {
                                  if (tx.type === 'EXPENSE' && tx.originalExpense) {
                                    setViewingExpense(tx.originalExpense);
                                  } else if (tx.type === 'INCOME' && tx.originalContribution) {
                                    setViewingContribution(tx.originalContribution);
                                  }
                                }}
                                style={[
                                  styles.unifiedTxItemRow,
                                  idx < items.length - 1 && [
                                    styles.unifiedTxItemBorder,
                                    isDark && { borderBottomColor: themeColors.divider },
                                  ],
                                ]}
                              >
                                {/* Icon tròn theo danh mục */}
                                <View
                                  style={[
                                    styles.unifiedTxIconCircle,
                                    {
                                      backgroundColor: isIncome
                                        ? (isDark ? 'rgba(52, 211, 153, 0.16)' : '#E8F8F0')
                                        : (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FCE8E6'),
                                    },
                                  ]}
                                >
                                  <FinanceIcon
                                    name={meta.icon}
                                    size={17}
                                    color={isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#C5221F')}
                                  />
                                </View>

                                {/* Tiêu đề & người tạo */}
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={[
                                      styles.unifiedTxTitle,
                                      isDark && { color: themeColors.textPrimary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {tx.title}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.unifiedTxSub,
                                      isDark && { color: themeColors.textSecondary },
                                    ]}
                                  >
                                    {tx.subtitle} • {tx.timeStr}
                                  </Text>
                                </View>

                                {/* Số tiền & Icon số lượng bình luận */}
                                <View style={styles.unifiedTxRightWrap}>
                                  <Text
                                    style={[
                                      styles.unifiedTxAmount,
                                      isIncome
                                        ? [styles.unifiedTxAmountIncome, isDark && { color: '#34D399' }]
                                        : [styles.unifiedTxAmountExpense, isDark && { color: '#F87171' }],
                                    ]}
                                  >
                                    {isIncome ? `+${formatVND(tx.amount)} đ` : `-${formatVND(tx.amount)} đ`}
                                  </Text>

                                  {/* Icon bong bóng chat kèm số lượng bình luận */}
                                  <View
                                    style={[
                                      styles.commentCountBadge,
                                      isDark && { backgroundColor: themeColors.surfaceSubtle },
                                    ]}
                                  >
                                    <FinanceIcon name="message-square" size={13} color={isDark ? themeColors.textMuted : '#64748B'} />
                                    <Text style={[styles.commentCountText, isDark && { color: themeColors.textSecondary }]}>{tx.commentCount}</Text>
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



            {/* TAB 2: CÂN ĐỐI NỢ & QUYẾT TOÁN (CHỈ HIỂN THỊ Ở NHÓM PHÒNG TRỌ, DU LỊCH, DỰ ÁN, KHÁC) */}
            {detailTab === 'BALANCES' && hasBalancesTab && (
              <GroupBalancesTab
                balanceData={balanceData}
                members={members}
                currentUser={currentUser}
                onSettleDebt={(debt) => handleSettleDebt(debt)}
                onRemindDebt={(debt) => {
                  Alert.alert(
                    'Gửi nhắc nhở',
                    `Bạn muốn gửi lời nhắc thanh toán ${formatVND(debt.amount)} đ đến ${debt.fromUserName} qua phòng chat nhóm không?`,
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Nhắc nhở ngay',
                        onPress: async () => {
                          try {
                            if (!selectedGroup) return;
                            await groupApi.sendMessage(
                              selectedGroup.id,
                              `[[BALANCE]]Nhắc nhở công nợ: @${debt.fromUserName} vui lòng thanh toán ${formatVND(debt.amount)} đ cho @Bạn để cân bằng nợ nhóm nhé!`
                            );
                            Alert.alert('Thành công', 'Đã gửi lời nhắc công nợ vào tin nhắn nhóm.');
                          } catch {
                            Alert.alert('Thông báo', 'Đã ghi nhận yêu cầu nhắc nhở.');
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            )}

            {/* TAB: THÀNH VIÊN & QUẢN LÝ NHÓM */}
            {detailTab === 'MEMBERS' && (
              <GroupMembersTab
                members={members}
                selectedGroup={selectedGroup}
                currentUser={currentUser}
                isChildAccount={isChildAccount}
                sentPendingInvitations={sentPendingInvitations}
                onCancelInvitation={handleCancelInvitation}
                onInvitePress={() => {
                  if (selectedGroup.groupType === 'COUPLE') {
                    const currentCount = members.length + (sentPendingInvitations?.length || 0);
                    if (currentCount >= 2) {
                      Alert.alert('Thông báo', 'Nhóm cặp đôi chỉ có thể có tối đa 2 thành viên.');
                      return;
                    }
                  }
                  setSearchMemberQuery('');
                  setSearchResults([]);
                  setInviteModalVisible(true);
                }}
                onMemberOptionsPress={(member) => {
                  setSelectedActionMember(member);
                }}
                onUpdateMemberRole={(member, newRole) => {
                  handleUpdateMemberRole(member, newRole);
                }}
                onOpenGroupSettings={() => {
                  setDetailTab('SETTINGS');
                }}
                onToggleNotification={async (val) => {
                  setGroupNotificationEnabled(val);
                  if (selectedGroup) {
                    setSelectedGroup({ ...selectedGroup, notificationEnabled: val });
                    await groupApi.toggleNotification(selectedGroup.id, val);
                    loadGroups();
                  }
                }}
                notificationEnabled={groupNotificationEnabled}
              />
            )}

            {/* TAB: VÍ TRẺ EM (KID WALLET) */}
            {detailTab === 'KIDS' && (
              <KidWalletTab
                childWallets={childWallets}
                members={members}
                onAddWalletPress={() => setCreateChildWalletModalVisible(true)}
                onWalletItemPress={(wallet) => {
                  setSelectedChildWallet(wallet);
                  setChildWalletDetailVisible(true);
                }}
                onGoalPress={() => {
                  Alert.alert('Mục tiêu cùng con', 'Tính năng lập mục tiêu tiết kiệm mua sách, đồ chơi cùng con sắp ra mắt!');
                }}
              />
            )}

            {/* TAB: CÀI ĐẶT NHÓM (SETTINGS) */}
            {detailTab === 'SETTINGS' && (
              <GroupSettingsTab
                group={selectedGroup}
                isOwner={selectedGroup.ownerId === currentUser?.id || selectedGroup.myRole === 'OWNER'}
                isAdmin={selectedGroup.myRole === 'ADMIN'}
                notificationEnabled={groupNotificationEnabled}
                onToggleNotification={async (val) => {
                  setGroupNotificationEnabled(val);
                  if (selectedGroup) {
                    setSelectedGroup({ ...selectedGroup, notificationEnabled: val });
                    await groupApi.toggleNotification(selectedGroup.id, val);
                    loadGroups();
                  }
                }}
                onGroupUpdated={(updatedGroup) => {
                  setSelectedGroup(updatedGroup);
                  loadGroups();
                }}
                onGroupDeleted={() => {
                  setSelectedGroup(null);
                  loadGroups();
                }}
                onLeaveGroup={() => {
                  setSelectedGroup(null);
                  loadGroups();
                }}
              />
            )}
          </ScrollView>
        )}

        {/* ── NÚT THÊM GIAO DỊCH NỔI CỐ ĐỊNH Ở DƯỚI CÙNG CHO TAB THU & CHI ── */}
        {detailTab === 'EXPENSES' && (
          <View
            style={[
              styles.bottomStickyBar,
              { paddingBottom: Math.max(insets.bottom, 14) },
              isDark && {
                backgroundColor: themeColors.background,
                borderTopColor: themeColors.cardBorder,
              },
            ]}
          >
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
        <Modal visible={expenseModalVisible} transparent animationType="slide" onRequestClose={() => setExpenseModalVisible(false)}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.inputModalSheet,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                  { maxHeight: '90%', position: 'relative' },
                ]}
              >
                <View style={[styles.inputModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                  <View>
                    <Text style={[styles.inputModalTitle, isDark && { color: themeColors.textPrimary }]}>Thêm giao dịch nhóm</Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? themeColors.textMuted : '#64748B', marginTop: 2 }}>
                      {selectedGroup?.groupType === 'FAMILY' || selectedGroup?.groupType === 'COUPLE'
                        ? 'Khoản chi tiêu chung của gia đình / cặp đôi'
                        : 'Khoản chi sẽ tự động chia đều cho các thành viên trong nhóm'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setExpenseModalVisible(false)} hitSlop={10}>
                    <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#475569'} />
                  </Pressable>
                </View>

                <ScrollView
                  ref={expenseFormScrollViewRef}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  {/* 1. Nội dung chi */}
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Nội dung chi tiêu *</Text>
                  <TextInput
                    value={expDescription}
                    onChangeText={setExpDescription}
                    placeholder="VD: Bữa tối BBQ, Mua đồ siêu thị, Tiền điện..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[
                      styles.textInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                  />

                  {/* 2. Số tiền */}
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Số tiền giao dịch (VNĐ) *</Text>
                  <TextInput
                    value={
                      expAmount ? new Intl.NumberFormat('vi-VN').format(parseInt(expAmount.replace(/\D/g, '') || '0', 10)) : ''
                    }
                    onChangeText={setExpAmount}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    style={[
                      styles.textInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                      { fontSize: 18, fontWeight: '800', color: '#E11D48' },
                    ]}
                  />

                  {/* 3. Nguồn tiền */}
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Nguồn thanh toán *</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <Pressable
                      onPress={() => setExpPaymentSource('GROUP_FUND')}
                      style={[
                        styles.sourceSelectBtn,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                        expPaymentSource === 'GROUP_FUND' && [
                          styles.sourceSelectBtnActive,
                          isDark && {
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: themeColors.accentGreen,
                          },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceSelectBtnText,
                          isDark && { color: themeColors.textSecondary },
                          expPaymentSource === 'GROUP_FUND' && [
                            styles.sourceSelectBtnTextActive,
                            isDark && { color: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        Quỹ chung của nhóm
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setExpPaymentSource('PERSONAL_ACCOUNT')}
                      style={[
                        styles.sourceSelectBtn,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                        expPaymentSource === 'PERSONAL_ACCOUNT' && [
                          styles.sourceSelectBtnActive,
                          isDark && {
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: themeColors.accentGreen,
                          },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceSelectBtnText,
                          isDark && { color: themeColors.textSecondary },
                          expPaymentSource === 'PERSONAL_ACCOUNT' && [
                            styles.sourceSelectBtnTextActive,
                            isDark && { color: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        Ví cá nhân của tôi
                      </Text>
                    </Pressable>
                  </View>

                  {/* Khối hiển thị nguồn tiền cố định chiều cao để không bị giật / nhảy UI */}
                  <View style={{ marginBottom: 14 }}>
                    {expPaymentSource === 'GROUP_FUND' ? (
                      <View
                        style={[
                          styles.dropdownSelectorCard,
                          isDark && {
                            backgroundColor: themeColors.surfaceSubtle,
                            borderColor: themeColors.cardBorder,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.selectIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
                            <FinanceIcon name="banknote" size={18} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.dropdownSelectorTitle, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                              Quỹ chung {selectedGroup?.name || 'nhóm'}
                            </Text>
                            <Text style={[styles.dropdownSelectorSub, isDark && { color: themeColors.textMuted }]}>
                              Số dư quỹ: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(fundData?.balance ?? 0)} đ</Text>
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.sourceFundCheckBadge, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                          <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                        </View>
                      </View>
                    ) : (
                      (() => {
                        const selAcc = personalAccounts.find((a) => a.id === expAccountId) || personalAccounts[0];
                        return (
                          <View>
                            <Pressable
                              onPress={() => setGroupPickerModalType('ACCOUNT')}
                              style={[
                                styles.dropdownSelectorCard,
                                isDark && {
                                  backgroundColor: themeColors.surfaceSubtle,
                                  borderColor: themeColors.cardBorder,
                                },
                              ]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={[styles.selectIconWrap, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE' }]}>
                                  <FinanceIcon name="wallet" size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.dropdownSelectorTitle, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                                    {selAcc?.name || 'Chọn ví thanh toán'}
                                  </Text>
                                  <Text style={[styles.dropdownSelectorSub, isDark && { color: themeColors.textMuted }]}>
                                    Số dư: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(selAcc?.balance || 0)} đ</Text>
                                  </Text>
                                </View>
                              </View>
                              <FinanceIcon name="chevron-down" size={18} color={isDark ? themeColors.accentGreen : '#059669'} />
                            </Pressable>
                          </View>
                        );
                      })()
                    )}
                  </View>

                  {/* 4. Danh mục chi thả xuống (Popup Bottom Sheet mượt mà chuẩn Quản lý nợ) */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Danh mục chi tiêu</Text>
                    {(() => {
                      const selCat = categoriesList.find((c) => c.id === expCategoryId) || categoriesList[0];
                      return (
                        <View>
                          <Pressable
                            onPress={() => setGroupPickerModalType('CATEGORY')}
                            style={[
                              styles.dropdownSelectorCard,
                              isDark && {
                                backgroundColor: themeColors.surfaceSubtle,
                                borderColor: themeColors.cardBorder,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.selectIconWrap, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FEE2E2' }]}>
                                <FinanceIcon
                                  name={resolveCategoryIconName(selCat?.icon, 'EXPENSE', selCat?.name)}
                                  size={18}
                                  color="#E11D48"
                                />
                              </View>
                              <Text style={[styles.dropdownSelectorTitle, isDark && { color: themeColors.textPrimary }]}>
                                {selCat?.name || 'Chọn danh mục chi'}
                              </Text>
                            </View>
                            <FinanceIcon name="chevron-down" size={18} color={isDark ? themeColors.accentGreen : '#059669'} />
                          </Pressable>
                        </View>
                      );
                    })()}
                  </View>

                  {/* 5. Thời gian giao dịch (Toggle Giờ trước - Ngày sau chuẩn AddTransactionScreen) */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={styles.timeSwitchHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Thời gian giao dịch</Text>
                        <Text style={[styles.timeSubLabel, isDark && { color: themeColors.textMuted }]}>
                          {isCustomDateTime ? 'Đang chỉnh giờ & ngày thủ công' : `Tự động: ${expTime} hôm nay`}
                        </Text>
                      </View>
                      <Switch
                        value={isCustomDateTime}
                        onValueChange={setIsCustomDateTime}
                        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#00A86B' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {isCustomDateTime && (
                      <View style={styles.timeDateRow}>
                        {/* Giờ trước */}
                        <View style={styles.timeCol}>
                          <Text style={[styles.microLabel, isDark && { color: themeColors.textMuted }]}>Giờ thực hiện</Text>
                          <TextInput
                            value={expTime}
                            onChangeText={setExpTime}
                            placeholder="HH:mm"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            style={[
                              styles.timeDateInput,
                              isDark && {
                                backgroundColor: themeColors.surfaceSubtle,
                                borderColor: themeColors.cardBorder,
                                color: themeColors.textPrimary,
                              },
                            ]}
                          />
                        </View>

                        {/* Ngày sau */}
                        <View style={styles.dateCol}>
                          <Text style={[styles.microLabel, isDark && { color: themeColors.textMuted }]}>Ngày giao dịch</Text>
                          <TextInput
                            value={expDate}
                            onChangeText={setExpDate}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            style={[
                              styles.timeDateInput,
                              isDark && {
                                backgroundColor: themeColors.surfaceSubtle,
                                borderColor: themeColors.cardBorder,
                                color: themeColors.textPrimary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* 6. Ghi chú */}
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Ghi chú (Tùy chọn)</Text>
                  <TextInput
                    value={expNotes}
                    onChangeText={setExpNotes}
                    placeholder="Thêm mô tả, phân công hoặc địa điểm..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[
                      styles.textInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    onFocus={() => {
                      setTimeout(() => {
                        expenseFormScrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 250);
                    }}
                  />

                  <Pressable
                    onPress={handleAddExpense}
                    disabled={submittingExpense}
                    style={[
                      styles.submitActionBtn,
                      isDark && { backgroundColor: '#10B981' },
                      submittingExpense && styles.disabled,
                    ]}
                  >
                    {submittingExpense ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitActionBtnText}>Lưu giao dịch</Text>
                    )}
                  </Pressable>
                </ScrollView>

                {/* OVERLAY POPUP DROPDOWN (Nằm trực tiếp trong Modal Thêm giao dịch nhóm) */}
                {groupPickerModalType !== 'NONE' && (
                  <View style={[StyleSheet.absoluteFillObject, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
                    <Pressable
                      style={StyleSheet.absoluteFillObject}
                      onPress={() => setGroupPickerModalType('NONE')}
                    />
                    <View
                      style={[
                        styles.pickerModalBox,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.pickerModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                        <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                          {groupPickerModalType === 'ACCOUNT' && 'Chọn ví thanh toán'}
                          {groupPickerModalType === 'CATEGORY' && 'Chọn danh mục chi tiêu'}
                        </Text>
                        <Pressable onPress={() => setGroupPickerModalType('NONE')} hitSlop={10}>
                          <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#64748B'} />
                        </Pressable>
                      </View>

                      <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                        {/* Chọn ví */}
                        {groupPickerModalType === 'ACCOUNT' && (
                          <>
                            {personalAccounts.map((acc) => {
                              const isSelected = expAccountId === acc.id;
                              return (
                                <Pressable
                                  key={acc.id}
                                  onPress={() => {
                                    setExpAccountId(acc.id);
                                    setGroupPickerModalType('NONE');
                                  }}
                                  style={[
                                    styles.pickerItemRow,
                                    isDark && { borderBottomColor: themeColors.divider },
                                    isSelected && [
                                      styles.pickerItemRowActive,
                                      isDark && { backgroundColor: themeColors.surfaceSubtle },
                                    ],
                                  ]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <View style={[styles.selectIconWrap, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE' }]}>
                                      <FinanceIcon name="wallet" size={16} color={isDark ? '#38BDF8' : '#0284C7'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, isSelected && styles.pickerItemTextActive]}>
                                        {acc.name}
                                      </Text>
                                      <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textMuted }]}>
                                        Số dư: {formatVND(acc.balance)} đ
                                      </Text>
                                    </View>
                                  </View>
                                  {isSelected && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#059669'} />}
                                </Pressable>
                              );
                            })}
                          </>
                        )}

                        {/* Chọn danh mục */}
                        {groupPickerModalType === 'CATEGORY' && (
                          <>
                            {categoriesList.map((cat) => {
                              const isSelected = expCategoryId === cat.id;
                              return (
                                <Pressable
                                  key={cat.id}
                                  onPress={() => {
                                    setExpCategoryId(cat.id);
                                    setGroupPickerModalType('NONE');
                                  }}
                                  style={[
                                    styles.pickerItemRow,
                                    isDark && { borderBottomColor: themeColors.divider },
                                    isSelected && [
                                      styles.pickerItemRowActive,
                                      isDark && { backgroundColor: themeColors.surfaceSubtle },
                                    ],
                                  ]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <View style={[styles.catCircleIconWrap, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FEE2E2', width: 34, height: 34 }]}>
                                      <FinanceIcon
                                        name={resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name)}
                                        size={16}
                                        color="#E11D48"
                                      />
                                    </View>
                                    <Text style={[styles.pickerItemText, isDark && { color: themeColors.textPrimary }, isSelected && styles.pickerItemTextActive, { flex: 1 }]}>
                                      {cat.name}
                                    </Text>
                                  </View>
                                  {isSelected && <FinanceIcon name="check" size={16} color={isDark ? themeColors.accentGreen : '#059669'} />}
                                </Pressable>
                              );
                            })}
                          </>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL CHỌN DANH MỤC THẢ XUỐNG DỌC (VERTICAL BOTTOM SHEET) ── */}
        <Modal visible={categoryPickerModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <View style={[styles.modalTopBar, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                <Text style={[styles.modalTopTitle, isDark && { color: themeColors.textPrimary }]}>Chọn danh mục chi tiêu</Text>
                <Pressable onPress={() => setCategoryPickerModalVisible(false)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, isDark && { color: themeColors.textMuted }]}>Đóng</Text>
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
                      style={[
                        styles.categoryOptionRow,
                        isDark && { borderBottomColor: themeColors.divider },
                        isSelected && [
                          styles.categoryOptionRowActive,
                          isDark && { backgroundColor: themeColors.surfaceSubtle },
                        ],
                      ]}
                    >
                      <View style={[styles.catCircleIconWrap, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FEE2E2' }]}>
                        <FinanceIcon
                          name={resolveCategoryIconName(cat.icon, 'EXPENSE', cat.name)}
                          size={18}
                          color="#E11D48"
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryOptionLabel,
                          isDark && { color: themeColors.textPrimary },
                          isSelected && styles.categoryOptionLabelActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && <Text style={[styles.checkmarkIcon, isDark && { color: themeColors.accentGreen }]}>✓</Text>}
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
            <View
              style={[
                styles.modalSheet,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <View style={[styles.modalTopBar, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                <Text style={[styles.modalTopTitle, isDark && { color: themeColors.textPrimary }]}>Chọn ví thanh toán</Text>
                <Pressable onPress={() => setAccountPickerModalVisible(false)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, isDark && { color: themeColors.textMuted }]}>Đóng</Text>
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
                      style={[
                        styles.accountOptionRow,
                        isDark && { borderBottomColor: themeColors.divider },
                        isSelected && [
                          styles.accountOptionRowActive,
                          isDark && { backgroundColor: themeColors.surfaceSubtle },
                        ],
                      ]}
                    >
                      <View style={[styles.catCircleIconWrap, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE' }]}>
                        <FinanceIcon name="wallet" size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.accountOptionName,
                            isDark && { color: themeColors.textPrimary },
                            isSelected && styles.accountOptionNameActive,
                          ]}
                        >
                          {acc.name}
                        </Text>
                        <Text style={[styles.accountOptionBalance, isDark && { color: themeColors.textMuted }]}>
                          Số dư: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(acc.balance)} đ</Text>
                        </Text>
                      </View>
                      {isSelected && <Text style={[styles.checkmarkIcon, isDark && { color: themeColors.accentGreen }]}>✓</Text>}
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
            <View
              style={[
                styles.modalSheet,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <View style={[styles.modalTopBar, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                <Text style={[styles.modalTopTitle, isDark && { color: themeColors.textPrimary }]}>Chọn kỳ báo cáo / Tháng</Text>
                <Pressable onPress={() => setMonthModalVisible(false)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, isDark && { color: themeColors.textMuted }]}>Đóng</Text>
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
                      style={[
                        styles.monthOptionRow,
                        isDark && { borderBottomColor: themeColors.divider },
                        isSelected && [
                          styles.monthOptionRowActive,
                          isDark && { backgroundColor: themeColors.surfaceSubtle },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthOptionLabel,
                          isDark && { color: themeColors.textPrimary },
                          isSelected && styles.monthOptionLabelActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                      {isSelected && <Text style={[styles.checkmarkIcon, isDark && { color: themeColors.accentGreen }]}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL ACTIONS CHO BÌNH LUẬN (BOTTOM SHEET 3 CHẤM) ── */}
        {/* Đã được tích hợp trực tiếp vào trong Modal viewingExpense để hoạt động mượt mà trên cả iOS & Android */}

        {/* ── MODAL CHI TIẾT GIAO DỊCH (CHUẨN DESIGN ẢNH MẪU) ── */}
        <Modal
          visible={!!viewingExpense}
          transparent
          animationType="slide"
          onRequestClose={() => setViewingExpense(null)}
        >
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
          />
          <View
            style={[
              styles.detailTxModalOverlay,
              { backgroundColor: isDark ? themeColors.surface : '#FFFFFF' },
            ]}
          >
            <View
              style={[
                styles.detailTxModalContainer,
                {
                  backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
                  paddingTop: Math.max(insets.top, 14) + 8,
                },
              ]}
            >
              {/* Header Modal */}
              <View
                style={[
                  styles.detailTxHeaderRow,
                  {
                    backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
                    borderBottomColor: isDark ? themeColors.cardBorder : '#F1F5F9',
                  },
                ]}
              >
                <Pressable
                  onPress={() => setViewingExpense(null)}
                  hitSlop={12}
                  style={[
                    styles.detailTxBackBtn,
                    isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                  ]}
                >
                  <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.textPrimary : '#0F172A'} />
                </Pressable>
                <Text
                  style={[
                    styles.detailTxHeaderTitle,
                    isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  Chi tiết giao dịch
                </Text>
                <Pressable
                  hitSlop={12}
                  style={[
                    styles.detailTxOptionBtn,
                    isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                  ]}
                >
                  <FinanceIcon name="more-horizontal" size={18} color={isDark ? themeColors.accentGreen : '#059669'} />
                </Pressable>
              </View>

              {viewingExpense && (() => {
                const exp = viewingExpense;
                const catName = exp.category?.name || 'Chi tiêu';
                const iconName = resolveCategoryIconName(undefined, 'EXPENSE', `${exp.description} ${catName}`);
                // Màu icon đỏ cho khoản chi tiền chuẩn theo thiết kế
                const iconBg = '#FCE8E6';
                const iconColor = '#C5221F';

                const payerName = exp.payer?.fullName || (exp.paidByUserId === currentUser?.id ? 'Bạn' : null) || members.find((m) => m.userId === exp.paidByUserId)?.user?.fullName || 'Thành viên';
                // Sắp xếp bình luận theo thứ tự thời gian cũ trước, mới sau để đọc liền mạch từ trên xuống dưới
                const rawComments = commentsByTarget[exp.id] || [];
                const comments = [...rawComments].sort((a, b) => {
                  const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return tA - tB;
                });
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
                    ref={detailTxScrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      padding: 18,
                      paddingBottom: (Platform.OS === 'ios' ? keyboardHeight : 0) + (keyboardHeight > 0 ? 80 : Math.max(insets.bottom, 16) + 80),
                      gap: 18,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* CARD 1: THÔNG TIN GIAO DỊCH CHÍNH */}
                    <View
                      style={[
                        styles.txDetailMainCard,
                        isDark && {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={styles.txDetailTopRow}>
                        <View style={[styles.unifiedTxIconCircle, { backgroundColor: iconBg }]}>
                          <FinanceIcon name={iconName} size={20} color={iconColor} />
                        </View>
                        <Text
                          style={[
                            styles.txDetailMainTitle,
                            isDark && { color: themeColors.textPrimary },
                          ]}
                        >
                          {exp.description}
                        </Text>
                        <Text style={[styles.txDetailMainAmount, isDark && { color: '#F87171' }]}>
                          -{formatVND(exp.amount)} đ
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.txDetailDivider,
                          isDark && { backgroundColor: themeColors.divider },
                        ]}
                      />

                      <View style={styles.txDetailInfoTable}>
                        {/* Danh mục */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="grid" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                            <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Danh mục</Text>
                          </View>
                          <View
                            style={[
                              styles.txDetailCategoryPill,
                              isDark && { backgroundColor: 'rgba(219, 39, 119, 0.15)' },
                            ]}
                          >
                            <Text style={[styles.txDetailCategoryPillText, isDark && { color: '#F472B6' }]}>{catName}</Text>
                          </View>
                        </View>

                        {/* Thời gian */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="calendar" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                            <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Thời gian</Text>
                          </View>
                          <Text style={[styles.txDetailInfoValue, isDark && { color: themeColors.textPrimary }]}>
                            {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                          </Text>
                        </View>

                        {/* Người tạo */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon name="user" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                            <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Người tạo</Text>
                          </View>
                          <View style={styles.txDetailPayerRow}>
                            <View
                              style={[
                                styles.txDetailSmallAvatar,
                                isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txDetailSmallAvatarText,
                                  isDark && { color: themeColors.accentGreen },
                                ]}
                              >
                                {payerName.slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[styles.txDetailPayerName, isDark && { color: themeColors.textPrimary }]}>{payerName}</Text>
                          </View>
                        </View>

                        {/* Nguồn ví thanh toán: Bảo mật thông tin riêng tư, chỉ hiện Quỹ nhóm hoặc Ví cá nhân */}
                        <View style={styles.txDetailInfoRow}>
                          <View style={styles.txDetailInfoLabelRow}>
                            <FinanceIcon
                              name={exp.paymentSource === 'GROUP_FUND' ? 'banknote' : 'wallet'}
                              size={15}
                              color={isDark ? themeColors.textMuted : '#64748B'}
                            />
                            <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Nguồn tiền</Text>
                          </View>
                          <View
                            style={[
                              styles.txDetailSourceBadge,
                              exp.paymentSource === 'GROUP_FUND'
                                ? (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)' } : { backgroundColor: '#E8F8F0', borderColor: '#A7F3D0' })
                                : (isDark ? { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder } : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }),
                            ]}
                          >
                            <Text
                              style={[
                                styles.txDetailSourceBadgeText,
                                exp.paymentSource === 'GROUP_FUND'
                                  ? { color: isDark ? themeColors.accentGreen : '#059669' }
                                  : { color: isDark ? themeColors.textSecondary : '#475569' },
                              ]}
                            >
                              {exp.paymentSource === 'GROUP_FUND' ? 'Quỹ nhóm' : 'Ví cá nhân'}
                            </Text>
                          </View>
                        </View>

                        {/* Ghi chú */}
                        {exp.notes ? (
                          <View
                            style={[
                              styles.txDetailNotesBox,
                              isDark && { backgroundColor: themeColors.surfaceSubtle },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <FinanceIcon name="edit" size={14} color={isDark ? themeColors.textMuted : '#64748B'} />
                              <Text style={[styles.txDetailNotesLabel, isDark && { color: themeColors.textSecondary }]}>Ghi chú</Text>
                            </View>
                            <Text style={[styles.txDetailNotesText, isDark && { color: themeColors.textPrimary }]}>{exp.notes}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* CARD 2: PHÂN CHIA CHI PHÍ (Ẩn đối với nhóm Gia đình FAMILY và Cặp đôi COUPLE) */}
                    {selectedGroup?.groupType !== 'FAMILY' && selectedGroup?.groupType !== 'COUPLE' && (
                      <View style={styles.txSplitSection}>
                        <View style={styles.txSplitHeaderRow}>
                          <Text style={[styles.txSplitSectionTitle, isDark && { color: themeColors.textPrimary }]}>Phân chia chi phí</Text>
                          <View
                            style={[
                              styles.txSplitMethodBadge,
                              isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                            ]}
                          >
                            <Text style={[styles.txSplitMethodBadgeText, isDark && { color: themeColors.accentGreen }]}>Chia đều</Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.txSplitListCard,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          {splitsList.map((s, idx) => (
                            <View
                              key={s.userId || idx}
                              style={[
                                styles.txSplitMemberRow,
                                idx < splitsList.length - 1 && [
                                  styles.unifiedTxItemBorder,
                                  isDark && { borderBottomColor: themeColors.divider },
                                ],
                              ]}
                            >
                              <View
                                style={[
                                  styles.txSplitAvatarCircle,
                                  isDark && { backgroundColor: 'rgba(56, 189, 248, 0.18)' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.txSplitAvatarText,
                                    isDark && { color: '#38BDF8' },
                                  ]}
                                >
                                  {s.name.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.txSplitMemberName,
                                  isDark && { color: themeColors.textPrimary },
                                ]}
                              >
                                {s.name}
                              </Text>
                              <Text
                                style={[
                                  styles.txSplitAmount,
                                  isDark && { color: themeColors.textPrimary },
                                ]}
                              >
                                {formatVND(s.amount)} đ
                              </Text>
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
                      <Text style={[styles.txCommentSectionTitle, isDark && { color: themeColors.textPrimary }]}>Bình luận ({comments.length})</Text>

                      <View style={{ gap: 10 }}>
                        {comments.length === 0 ? (
                          <Text style={{ fontSize: 12, color: isDark ? themeColors.textMuted : '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                          </Text>
                        ) : (
                          comments.map((c) => {
                            const isMe = c.userId === currentUser?.id;
                            const memberInfo = members.find((m) => m.userId === c.userId);
                            const authorDisplayName = isMe
                              ? 'Bạn'
                              : (c.user?.fullName || memberInfo?.user?.fullName || memberInfo?.nickname || c.user?.username || 'Thành viên');
                            const actualAuthorName = c.user?.fullName || memberInfo?.user?.fullName || memberInfo?.nickname || c.user?.username || (isMe ? (currentUser?.fullName || currentUser?.username || 'Thành viên') : 'Thành viên');
                            const rawAvatar = c.user?.avatarUrl || c.user?.avatarKey || memberInfo?.user?.avatarUrl || (isMe ? currentUser?.avatarUrl : null);
                            const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;
                            const parent = c.parentCommentId ? comments.find((p) => p.id === c.parentCommentId) : null;
                            const parentMemberInfo = parent ? members.find((m) => m.userId === parent.userId) : null;
                            const parentActualName = parent?.user?.fullName || parentMemberInfo?.user?.fullName || parentMemberInfo?.nickname || parent?.user?.username || (parent?.userId === currentUser?.id ? (currentUser?.fullName || currentUser?.username) : null) || 'Thành viên';
                            const isEdited = !!(c.updatedAt && c.createdAt && new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime() + 1000);

                            const timeStr = c.createdAt
                              ? formatMessengerDateDivider(c.createdAt)
                              : 'Vừa xong';

                            const likeInfo = commentLikes[c.id] || { count: 0, liked: false };

                            return (
                              <View
                                key={c.id}
                                style={[
                                  styles.commentMockCard,
                                  isDark && {
                                    backgroundColor: themeColors.surface,
                                    borderColor: themeColors.cardBorder,
                                  },
                                  parent ? { marginLeft: 28 } : null,
                                ]}
                              >
                                <View style={styles.commentMockHeader}>
                                  {/* Avatar thực tế của người dùng */}
                                  <View
                                    style={[
                                      styles.commentMockAvatar,
                                      isDark && { backgroundColor: 'rgba(219, 39, 119, 0.16)' },
                                    ]}
                                  >
                                    {avatarUri ? (
                                      <Image source={{ uri: avatarUri }} style={styles.commentMockAvatarImg} />
                                    ) : (
                                      <Text
                                        style={[
                                          styles.commentMockAvatarText,
                                          isDark && { color: '#F472B6' },
                                        ]}
                                      >
                                        {actualAuthorName.slice(0, 1).toUpperCase()}
                                      </Text>
                                    )}
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    {/* Hàng tên tác giả + giờ ngày + nút ... */}
                                    <View style={styles.commentAuthorRow}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                        <Text
                                          style={[
                                            styles.commentMockAuthor,
                                            isDark && { color: themeColors.textPrimary },
                                          ]}
                                        >
                                          {authorDisplayName}
                                        </Text>
                                        <Text style={[styles.commentMockTimeDot, isDark && { color: themeColors.textMuted }]}>•</Text>
                                        <Text style={[styles.commentMockTimeText, isDark && { color: themeColors.textSecondary }]}>{timeStr}</Text>
                                        {isEdited && (
                                          <Text style={[styles.commentEditedTag, isDark && { color: themeColors.textMuted }]}>
                                            (đã sửa)
                                          </Text>
                                        )}
                                      </View>

                                      {/* Nút 3 chấm dọc cho bình luận */}
                                      <Pressable
                                        onPress={(e) => {
                                          const targetEl = e.currentTarget as any;
                                          if (targetEl && targetEl.measureInWindow) {
                                            targetEl.measureInWindow((x: number, y: number, width: number, height: number) => {
                                              setCommentActionMenuTarget({ targetId: exp.id, comment: c, anchor: { x, y, width, height } });
                                            });
                                          } else {
                                            setCommentActionMenuTarget({ targetId: exp.id, comment: c });
                                          }
                                        }}
                                        hitSlop={8}
                                        style={styles.commentMoreOptionBtn}
                                      >
                                        <Text style={[styles.commentMoreOptionIcon, isDark && { color: themeColors.textMuted }]}>⋮</Text>
                                      </Pressable>
                                    </View>

                                    {/* Nội dung bình luận */}
                                    <Text
                                      style={[
                                        styles.commentMockContent,
                                        isDark && { color: themeColors.textPrimary },
                                      ]}
                                    >
                                      {(() => {
                                        let displayContent = c.content || '';
                                        // Nếu comment đã có liên kết parent và nội dung bắt đầu bằng @... thì làm sạch tag thừa để tránh bị lặp thành 2 cái @
                                        if (parent) {
                                          displayContent = displayContent.replace(/^@\S+\s*/, '');
                                          return (
                                            <>
                                              <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '700' }}>
                                                @{parentActualName}{' '}
                                              </Text>
                                              {displayContent}
                                            </>
                                          );
                                        }
                                        return displayContent;
                                      })()}
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
                                          name="heart"
                                          size={14}
                                          color={likeInfo.liked ? '#E11D48' : (isDark ? themeColors.textMuted : '#64748B')}
                                        />
                                        <Text
                                          style={[
                                            styles.commentLikeCountText,
                                            isDark && { color: themeColors.textSecondary },
                                            likeInfo.liked && styles.commentLikeCountTextActive,
                                          ]}
                                        >
                                          {likeInfo.liked ? 'Đã thích' : 'Thích'}{likeInfo.count > 0 ? ` (${likeInfo.count})` : ''}
                                        </Text>
                                      </Pressable>

                                      <Pressable
                                        onPress={() => {
                                          setReplyingToCommentId((prev) => ({ ...prev, [exp.id]: c.id }));
                                          // Không chèn thêm chuỗi text `@Tên` vào ô nhập để tránh lưu thừa text lặp
                                          setInlineCommentText((prev) => ({
                                            ...prev,
                                            [exp.id]: '',
                                          }));
                                          setTimeout(() => {
                                            detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
                                          }, 200);
                                        }}
                                        style={styles.commentReplyBtn}
                                        hitSlop={6}
                                      >
                                        <Text style={[styles.commentReplyBtnText, isDark && { color: themeColors.textSecondary }]}>Trả lời</Text>
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
                <View
                  style={[
                    styles.detailTxBottomInputBar,
                    isDark && {
                      backgroundColor: themeColors.surface,
                      borderTopColor: themeColors.cardBorder,
                    },
                    {
                      bottom: Platform.OS === 'ios' ? keyboardHeight : 0,
                      paddingBottom: (Platform.OS === 'ios' && keyboardHeight > 0) ? 10 : Math.max(insets.bottom, 12),
                    },
                  ]}
                >
                  {replyingToCommentId[viewingExpense.id] && (() => {
                    const currentExpenseComments = commentsByTarget[viewingExpense.id] || [];
                    const replyingCmt = currentExpenseComments.find((c) => c && c.id === replyingToCommentId[viewingExpense.id]);
                    const repMember = (replyingCmt && members) ? members.find((m) => m && m.userId === replyingCmt.userId) : null;
                    const repName = replyingCmt?.userId === currentUser?.id
                      ? (currentUser?.fullName || currentUser?.username || 'bạn')
                      : (replyingCmt?.user?.fullName || repMember?.user?.fullName || repMember?.nickname || replyingCmt?.user?.username || 'thành viên');

                    return (
                      <View style={styles.replyingNoticeBar}>
                        <Text style={[styles.replyingNoticeText, isDark && { color: themeColors.accentGreen }]}>
                          Đang trả lời <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>@{repName}</Text>
                        </Text>
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
                    );
                  })()}
                  <View
                    style={[
                      styles.detailTxInputWrapper,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.detailTxTextInput,
                        isDark && { color: themeColors.textPrimary },
                      ]}
                      placeholder={replyingToCommentId[viewingExpense.id] ? 'Viết câu trả lời...' : 'Viết bình luận...'}
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={inlineCommentText[viewingExpense.id] || ''}
                      onChangeText={(val) =>
                        setInlineCommentText((prev) => ({ ...prev, [viewingExpense.id]: val }))
                      }
                      onFocus={() => {
                        setTimeout(() => {
                          detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 250);
                      }}
                    />
                    <Pressable
                      onPress={() => handleSendComment(viewingExpense.id)}
                      style={[
                        styles.detailTxSendBtn,
                        isDark && { backgroundColor: '#10B981' },
                      ]}
                    >
                      <FinanceIcon name="send" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ── ACTION MENU CHO BÌNH LUẬN (3 CHẤM) NỔI NGAY TẠI NÚT 3 CHẤM (POPOVER) ── */}
              {commentActionMenuTarget && (
                <Pressable
                  style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', zIndex: 9999 }]}
                  onPress={() => setCommentActionMenuTarget(null)}
                >
                  {(() => {
                    const { targetId, comment, anchor } = commentActionMenuTarget;
                    const isMine = comment.userId === currentUser?.id;
                    const memberInfo = members.find((m) => m.userId === comment.userId);
                    const authorActualName = comment.user?.fullName || memberInfo?.user?.fullName || memberInfo?.nickname || comment.user?.username || (isMine ? (currentUser?.fullName || currentUser?.username || 'Thành viên') : 'Thành viên');
                    const canDelete = isMine || selectedGroup?.myRole === 'OWNER' || selectedGroup?.myRole === 'ADMIN';

                    // Tính toán tọa độ popover bám theo nút 3 chấm
                    const popoverWidth = 160;
                    const popoverTop = anchor ? Math.max(insets.top + 50, anchor.y + anchor.height + 4) : 250;
                    const popoverRight = anchor ? Math.max(16, Dimensions.get('window').width - anchor.x - anchor.width) : 16;

                    return (
                      <Pressable
                        style={[
                          styles.commentPopoverMenu,
                          isDark && {
                            backgroundColor: themeColors.surface,
                            borderColor: themeColors.cardBorder,
                          },
                          {
                            top: popoverTop,
                            right: popoverRight,
                            width: popoverWidth,
                          },
                        ]}
                        onPress={(e) => e.stopPropagation()}
                      >
                        {/* Trả lời */}
                        <Pressable
                          onPress={() => {
                            setCommentActionMenuTarget(null);
                            setReplyingToCommentId((prev) => ({ ...prev, [targetId]: comment.id }));
                            setInlineCommentText((prev) => ({ ...prev, [targetId]: '' }));
                          }}
                          style={[styles.commentPopoverItem, isDark && { borderBottomColor: themeColors.divider }]}
                        >
                          <FinanceIcon name="reply" size={15} color={isDark ? themeColors.accentGreen : '#059669'} />
                          <Text style={[styles.commentPopoverText, isDark && { color: themeColors.textPrimary }]}>Trả lời</Text>
                        </Pressable>

                        {/* Chỉnh sửa nếu là bình luận của mình */}
                        {isMine && (
                          <Pressable
                            onPress={() => {
                              setCommentActionMenuTarget(null);
                              setEditingComment({ targetId, comment });
                              setEditingCommentContent(comment.content);
                            }}
                            style={[styles.commentPopoverItem, isDark && { borderBottomColor: themeColors.divider }]}
                          >
                            <FinanceIcon name="edit" size={15} color={isDark ? '#38BDF8' : '#0284C7'} />
                            <Text style={[styles.commentPopoverText, isDark && { color: themeColors.textPrimary }]}>Chỉnh sửa</Text>
                          </Pressable>
                        )}

                        {/* Xóa nếu là của mình hoặc quản trị viên */}
                        {canDelete && (
                          <Pressable
                            onPress={() => {
                              setCommentActionMenuTarget(null);
                              handleDeleteCommentConfirm(targetId, comment.id);
                            }}
                            style={[styles.commentPopoverItem, { borderBottomWidth: 0 }]}
                          >
                            <FinanceIcon name="trash" size={15} color="#EF4444" />
                            <Text style={[styles.commentPopoverText, { color: '#EF4444' }]}>Xóa</Text>
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })()}
                </Pressable>
              )}

              {/* ── MODAL SỬA BÌNH LUẬN LỒNG TRONG MODAL CHI TIẾT ── */}
              {editingComment && (
                <View style={[StyleSheet.absoluteFill, styles.modalOverlay, { zIndex: 10000 }]}>
                  <View
                    style={[
                      styles.inputModalSheet,
                      isDark && {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.inputModalHeader}>
                      <Text style={[styles.inputModalTitle, isDark && { color: themeColors.textPrimary }]}>Chỉnh sửa bình luận</Text>
                      <Pressable onPress={() => setEditingComment(null)} hitSlop={10}>
                        <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : '#475569'} />
                      </Pressable>
                    </View>

                    <TextInput
                      value={editingCommentContent}
                      onChangeText={setEditingCommentContent}
                      multiline
                      placeholder="Nhập nội dung mới..."
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      style={[
                        styles.textInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                        { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 },
                      ]}
                    />

                    <Pressable
                      onPress={handleSaveEditComment}
                      style={[
                        styles.submitActionBtn,
                        isDark && { backgroundColor: '#10B981' },
                        { marginTop: 12 },
                      ]}
                    >
                      <Text style={styles.submitActionBtnText}>Lưu chỉnh sửa</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

      {/* ── MODAL CHI TIẾT NỘP QUỸ (KÈM BÌNH LUẬN TRÊN BẢN APP) ── */}
      <Modal
        visible={!!viewingContribution}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingContribution(null)}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        <View
          style={[
            styles.detailTxModalOverlay,
            { backgroundColor: isDark ? themeColors.surface : '#FFFFFF' },
          ]}
        >
          <View
            style={[
              styles.detailTxModalContainer,
              {
                backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
                paddingTop: Math.max(insets.top, 14) + 8,
              },
            ]}
          >
            {/* Header Modal */}
            <View
              style={[
                styles.detailTxHeaderRow,
                {
                  backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
                  borderBottomColor: isDark ? themeColors.cardBorder : '#F1F5F9',
                },
              ]}
            >
              <Pressable
                onPress={() => setViewingContribution(null)}
                hitSlop={12}
                style={[
                  styles.detailTxBackBtn,
                  isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                ]}
              >
                <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.textPrimary : '#0F172A'} />
              </Pressable>
              <Text style={[styles.detailTxHeaderTitle, isDark && { color: themeColors.textPrimary }]}>Chi tiết nộp quỹ</Text>
              <View style={{ width: 36 }} />
            </View>

            {viewingContribution && (() => {
              const c = viewingContribution;
              const contributor = getContributorDisplayName(c);
              const rawComments = commentsByTarget[c.id] || [];
              const comments = [...rawComments].sort((a, b) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tA - tB;
              });
              const dtStr = c.createdAt || c.contributedAt
                ? formatMessengerDateDivider(c.createdAt || c.contributedAt)
                : 'Vừa xong';

              return (
                <ScrollView
                  ref={detailTxScrollViewRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    padding: 18,
                    paddingBottom: (Platform.OS === 'ios' && keyboardHeight > 0) ? keyboardHeight + 80 : Math.max(insets.bottom, 16) + 80,
                    gap: 18,
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* CARD 1: THÔNG TIN NỘP QUỸ */}
                  <View
                    style={[
                      styles.txDetailMainCard,
                      isDark && {
                        backgroundColor: themeColors.surface,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.txDetailTopRow}>
                      <View style={[styles.unifiedTxIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6F4EA' }]}>
                        <FinanceIcon name="income" size={20} color={isDark ? themeColors.accentGreen : '#137333'} />
                      </View>
                      <Text style={[styles.txDetailMainTitle, isDark && { color: themeColors.textPrimary }]}>
                        {c.note || 'Nộp quỹ chung'}
                      </Text>
                      <Text style={[styles.txDetailMainAmount, { color: isDark ? themeColors.accentGreen : '#059669' }]}>
                        +{formatVND(c.amount)} đ
                      </Text>
                    </View>

                    <View style={[styles.txDetailDivider, isDark && { backgroundColor: themeColors.divider }]} />

                    <View style={styles.txDetailInfoTable}>
                      <View style={styles.txDetailInfoRow}>
                        <View style={styles.txDetailInfoLabelRow}>
                          <FinanceIcon name="grid" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                          <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Hạng mục</Text>
                        </View>
                        <View style={[styles.txDetailCategoryPill, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                          <Text style={[styles.txDetailCategoryPillText, isDark && { color: themeColors.accentGreen }]}>Đóng quỹ</Text>
                        </View>
                      </View>

                      <View style={styles.txDetailInfoRow}>
                        <View style={styles.txDetailInfoLabelRow}>
                          <FinanceIcon name="calendar" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                          <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Thời gian</Text>
                        </View>
                        <Text style={[styles.txDetailInfoValue, isDark && { color: themeColors.textPrimary }]}>{dtStr}</Text>
                      </View>

                      <View style={styles.txDetailInfoRow}>
                        <View style={styles.txDetailInfoLabelRow}>
                          <FinanceIcon name="user" size={15} color={isDark ? themeColors.textMuted : '#64748B'} />
                          <Text style={[styles.txDetailInfoLabel, isDark && { color: themeColors.textSecondary }]}>Người nộp</Text>
                        </View>
                        <View style={styles.txDetailPayerRow}>
                          <View style={[styles.txDetailSmallAvatar, isDark && { backgroundColor: 'rgba(56, 189, 248, 0.18)' }]}>
                            <Text style={[styles.txDetailSmallAvatarText, isDark && { color: '#38BDF8' }]}>
                              {contributor.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.txDetailPayerName, isDark && { color: themeColors.textPrimary }]}>{contributor}</Text>
                        </View>
                      </View>

                      {c.note ? (
                        <View
                          style={[
                            styles.txDetailNotesBox,
                            isDark && { backgroundColor: themeColors.surfaceSubtle },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <FinanceIcon name="edit" size={14} color={isDark ? themeColors.textMuted : '#64748B'} />
                            <Text style={[styles.txDetailNotesLabel, isDark && { color: themeColors.textSecondary }]}>Ghi chú</Text>
                          </View>
                          <Text style={[styles.txDetailNotesText, isDark && { color: themeColors.textPrimary }]}>{c.note}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* CARD 2: BÌNH LUẬN NỘP QUỸ */}
                  <View style={styles.txCommentSection}>
                    <Text style={[styles.txCommentSectionTitle, isDark && { color: themeColors.textPrimary }]}>
                      Bình luận ({comments.length})
                    </Text>

                    <View style={{ gap: 10 }}>
                      {comments.length === 0 ? (
                        <Text style={{ fontSize: 12, color: isDark ? themeColors.textMuted : '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                          Chưa có bình luận nào cho lần nộp quỹ này.
                        </Text>
                      ) : (
                        comments.map((comment) => {
                          const isMe = comment.userId === currentUser?.id;
                          const memberInfo = members.find((m) => m.userId === comment.userId);
                          const authorDisplayName = isMe
                            ? 'Bạn'
                            : (comment.user?.fullName || memberInfo?.user?.fullName || memberInfo?.nickname || comment.user?.username || 'Thành viên');
                          const actualAuthorName = comment.user?.fullName || memberInfo?.user?.fullName || memberInfo?.nickname || comment.user?.username || 'Thành viên';
                          const rawAvatar = comment.user?.avatarUrl || comment.user?.avatarKey || memberInfo?.user?.avatarUrl || (isMe ? currentUser?.avatarUrl : null);
                          const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;
                          const parent = comment.parentCommentId ? comments.find((p) => p.id === comment.parentCommentId) : null;
                          const parentActualName = parent?.user?.fullName || 'Thành viên';

                          const timeStr = comment.createdAt
                            ? formatMessengerDateDivider(comment.createdAt)
                            : 'Vừa xong';

                          const likeInfo = commentLikes[comment.id] || { count: 0, liked: false };

                          return (
                            <View
                              key={comment.id}
                              style={[
                                styles.commentMockCard,
                                isDark && {
                                  backgroundColor: themeColors.surface,
                                  borderColor: themeColors.cardBorder,
                                },
                                parent ? { marginLeft: 28 } : null,
                              ]}
                            >
                              <View style={styles.commentMockHeader}>
                                <View style={[styles.commentMockAvatar, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                                  {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.commentMockAvatarImg} />
                                  ) : (
                                    <Text style={[styles.commentMockAvatarText, isDark && { color: themeColors.textSecondary }]}>
                                      {actualAuthorName.slice(0, 1).toUpperCase()}
                                    </Text>
                                  )}
                                </View>

                                <View style={{ flex: 1 }}>
                                  <View style={styles.commentAuthorRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                      <Text style={[styles.commentMockAuthor, isDark && { color: themeColors.textPrimary }]}>{authorDisplayName}</Text>
                                      <Text style={[styles.commentMockTimeDot, isDark && { color: themeColors.textMuted }]}>•</Text>
                                      <Text style={[styles.commentMockTimeText, isDark && { color: themeColors.textMuted }]}>{timeStr}</Text>
                                    </View>

                                    <Pressable
                                      onPress={(e) => {
                                        const targetEl = e.currentTarget as any;
                                        if (targetEl && targetEl.measureInWindow) {
                                          targetEl.measureInWindow((x: number, y: number, width: number, height: number) => {
                                            setCommentActionMenuTarget({ targetId: c.id, comment, anchor: { x, y, width, height } });
                                          });
                                        } else {
                                          setCommentActionMenuTarget({ targetId: c.id, comment });
                                        }
                                      }}
                                      hitSlop={8}
                                      style={styles.commentMoreOptionBtn}
                                    >
                                      <Text style={[styles.commentMoreOptionIcon, isDark && { color: themeColors.textMuted }]}>⋮</Text>
                                    </Pressable>
                                  </View>

                                  <Text style={[styles.commentMockContent, isDark && { color: themeColors.textPrimary }]}>
                                    {parent && (
                                      <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '700' }}>
                                        @{parentActualName}{' '}
                                      </Text>
                                    )}
                                    {comment.content}
                                  </Text>

                                  <View style={styles.commentActionFooterRow}>
                                    <Pressable
                                      onPress={() => handleToggleLikeComment(comment.id)}
                                      style={[
                                        styles.commentLikeBtn,
                                        likeInfo.liked && styles.commentLikeBtnActive,
                                      ]}
                                      hitSlop={6}
                                    >
                                      <FinanceIcon
                                        name="heart"
                                        size={14}
                                        color={likeInfo.liked ? '#E11D48' : (isDark ? themeColors.textMuted : '#64748B')}
                                      />
                                      <Text
                                        style={[
                                          styles.commentLikeCountText,
                                          isDark && { color: themeColors.textSecondary },
                                          likeInfo.liked && styles.commentLikeCountTextActive,
                                        ]}
                                      >
                                        {likeInfo.liked ? 'Đã thích' : 'Thích'}{likeInfo.count > 0 ? ` (${likeInfo.count})` : ''}
                                      </Text>
                                    </Pressable>

                                    <Pressable
                                      onPress={() => {
                                        setReplyingToCommentId((prev) => ({ ...prev, [c.id]: comment.id }));
                                        setInlineCommentText((prev) => ({ ...prev, [c.id]: '' }));
                                        setTimeout(() => {
                                          detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
                                        }, 200);
                                      }}
                                      style={styles.commentReplyBtn}
                                      hitSlop={6}
                                    >
                                      <Text style={[styles.commentReplyBtnText, isDark && { color: themeColors.textSecondary }]}>Trả lời</Text>
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

            {/* Khung chat bình luận nộp quỹ */}
            {viewingContribution && (
              <View
                style={[
                  styles.detailTxBottomInputBar,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderTopColor: themeColors.cardBorder,
                  },
                  {
                    bottom: Platform.OS === 'ios' ? keyboardHeight : 0,
                    paddingBottom: (Platform.OS === 'ios' && keyboardHeight > 0) ? 10 : Math.max(insets.bottom, 12),
                  },
                ]}
              >
                {replyingToCommentId[viewingContribution.id] && (() => {
                  const currentFundComments = commentsByTarget[viewingContribution.id] || [];
                  const replyingCmt = currentFundComments.find((c) => c && c.id === replyingToCommentId[viewingContribution.id]);
                  const repMember = (replyingCmt && members) ? members.find((m) => m && m.userId === replyingCmt.userId) : null;
                  const repName = replyingCmt?.userId === currentUser?.id
                    ? (currentUser?.fullName || currentUser?.username || 'bạn')
                    : (replyingCmt?.user?.fullName || repMember?.user?.fullName || repMember?.nickname || replyingCmt?.user?.username || 'thành viên');

                  return (
                    <View style={styles.replyingNoticeBar}>
                      <Text style={[styles.replyingNoticeText, isDark && { color: themeColors.accentGreen }]}>
                        Đang trả lời <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>@{repName}</Text>
                      </Text>
                      <Pressable
                        onPress={() => {
                          setReplyingToCommentId((prev) => ({ ...prev, [viewingContribution.id]: null }));
                          setInlineCommentText((prev) => ({ ...prev, [viewingContribution.id]: '' }));
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.replyingCancelText}>✕ Hủy</Text>
                      </Pressable>
                    </View>
                  );
                })()}
                <View
                  style={[
                    styles.detailTxInputWrapper,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.detailTxTextInput,
                      isDark && { color: themeColors.textPrimary },
                    ]}
                    placeholder={replyingToCommentId[viewingContribution.id] ? 'Viết câu trả lời...' : 'Viết bình luận nộp quỹ...'}
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={inlineCommentText[viewingContribution.id] || ''}
                    onChangeText={(val) =>
                      setInlineCommentText((prev) => ({ ...prev, [viewingContribution.id]: val }))
                    }
                    onFocus={() => {
                      setTimeout(() => {
                        detailTxScrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 250);
                    }}
                  />
                  <Pressable
                    onPress={() => handleSendComment(viewingContribution.id, 'FUND_CONTRIBUTION')}
                    style={[
                      styles.detailTxSendBtn,
                      isDark && { backgroundColor: '#10B981' },
                    ]}
                  >
                    <FinanceIcon name="send" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
        {/* Modal Xem cảm xúc về tin nhắn (Reactions Modal chuẩn Web) */}
        <Modal visible={!!viewingReactionModalMessage} transparent animationType="fade">
          <View style={styles.reactionModalOverlay}>
            <View
              style={[
                styles.reactionModalSheet,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <View style={[styles.reactionModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                <Text style={[styles.reactionModalTitle, isDark && { color: themeColors.textPrimary }]}>Cảm xúc về tin nhắn</Text>
                <Pressable onPress={() => setViewingReactionModalMessage(null)} hitSlop={10}>
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textMuted : '#475569'} />
                </Pressable>
              </View>

              {viewingReactionModalMessage && (() => {
                const reactionsList = viewingReactionModalMessage.reactions || [];
                const uniqueEmojis = Array.from(new Set(reactionsList.map((r) => r.reaction)));
                const filteredList = reactionModalTab === 'ALL'
                  ? reactionsList
                  : reactionsList.filter((r) => r.reaction === reactionModalTab);

                return (
                  <>
                    <View style={[styles.reactionModalTabsRow, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                      <Pressable
                        onPress={() => setReactionModalTab('ALL')}
                        style={[
                          styles.reactionModalTabItem,
                          reactionModalTab === 'ALL' && [
                            styles.reactionModalTabItemActive,
                            isDark && { borderBottomColor: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        <Text
                          style={[
                            styles.reactionModalTabText,
                            isDark && { color: themeColors.textSecondary },
                            reactionModalTab === 'ALL' && [
                              styles.reactionModalTabTextActive,
                              isDark && { color: themeColors.accentGreen },
                            ],
                          ]}
                        >
                          Tất cả ({reactionsList.length})
                        </Text>
                      </Pressable>
                      {uniqueEmojis.map((emoji) => {
                        const count = reactionsList.filter((r) => r.reaction === emoji).length;
                        return (
                          <Pressable
                            key={emoji}
                            onPress={() => setReactionModalTab(emoji)}
                            style={[
                              styles.reactionModalTabItem,
                              reactionModalTab === emoji && [
                                styles.reactionModalTabItemActive,
                                isDark && { borderBottomColor: themeColors.accentGreen },
                              ],
                            ]}
                          >
                            <Text style={styles.reactionModalTabEmojiText}>{emoji} {count}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                      {filteredList.map((r, rIdx) => {
                        const isCurrentUserReaction = r.userId === currentUser?.id;
                        const memberInfo = members.find((m) => m.userId === r.userId);
                        const displayName = isCurrentUserReaction
                          ? 'Bạn'
                          : (r.userName || memberInfo?.user?.fullName || memberInfo?.nickname || 'Thành viên');
                        const rawAvatar = memberInfo?.user?.avatarUrl || memberInfo?.user?.avatarKey;
                        const avatarSrc = isCurrentUserReaction
                          ? (currentUser?.avatarUrl ? userProfileApi.formatAvatarUrl(currentUser.avatarUrl) : null)
                          : (rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null);

                        return (
                          <Pressable
                            key={rIdx}
                            onPress={() => {
                              if (isCurrentUserReaction && viewingReactionModalMessage) {
                                handleToggleReaction(viewingReactionModalMessage.id, r.reaction);
                              }
                            }}
                            style={[
                              styles.reactionModalUserRow,
                              isDark && { borderBottomColor: themeColors.divider },
                            ]}
                          >
                            <View style={styles.reactionModalUserLeft}>
                              <View style={[styles.reactionModalAvatarBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                                {avatarSrc ? (
                                  <Image source={{ uri: avatarSrc }} style={styles.reactionModalAvatarImg} />
                                ) : (
                                  <Text style={[styles.reactionModalAvatarInitial, isDark && { color: themeColors.textSecondary }]}>
                                    {displayName.slice(0, 1).toUpperCase()}
                                  </Text>
                                )}
                              </View>
                              <Text style={[styles.reactionModalUserName, isDark && { color: themeColors.textPrimary }]}>{displayName}</Text>
                            </View>
                            <Text style={{ fontSize: 20 }}>{r.reaction}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* Modal Lightbox Xem Ảnh Phóng To Đầy Đủ (Header ngày giờ, Nút tải về và Nút X thoát) */}
        <Modal visible={!!lightboxImageUrl} transparent animationType="fade">
          <View style={styles.lightboxModalOverlay}>
            {/* Header trên cùng: Ngày giờ gửi và nút Tải về + Nút X đóng */}
            <View style={[styles.lightboxHeaderBar, { paddingTop: Math.max(insets.top, 20) }]}>
              <View style={styles.lightboxHeaderLeft}>
                <Text style={styles.lightboxSenderText}>{lightboxImageInfo?.senderName || 'Hình ảnh'}</Text>
                <Text style={styles.lightboxTimeText}>{lightboxImageInfo?.timeStr || 'Gần đây'}</Text>
              </View>

              <View style={styles.lightboxHeaderRight}>
                {/* Nút Tải ảnh về máy */}
                <Pressable
                  onPress={async () => {
                    if (!lightboxImageUrl) return;
                    try {
                      if (Platform.OS === 'web') {
                        // Trên Web: Tải trực tiếp qua thẻ <a>
                        const downloadUrl = lightboxImageUrl;
                        const filename = `finora_chat_${Date.now()}.jpg`;
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = filename;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showLightboxToast('✓ Đã lưu ảnh thành công!');
                        return;
                      }

                      // Trên Mobile (Android / iOS): Tải và lưu trực tiếp vào Thư viện ảnh (Gallery/Album)
                      // 1. Xin quyền truy cập Thư viện ảnh (Write-only hoặc Full)
                      const permissionRes = await MediaLibrary.requestPermissionsAsync(true);
                      if (permissionRes.status !== 'granted') {
                        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập để Finora có thể lưu ảnh vào Thư viện của bạn.');
                        return;
                      }

                      // 2. Tải ảnh về thư mục tạm trên thiết bị
                      const filenameMatch = lightboxImageUrl.match(/[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/);
                      const ext = filenameMatch ? filenameMatch[0].split('.').pop() : 'jpg';
                      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
                      const fileUri = `${cacheDir}finora_${Date.now()}.${ext}`;

                      const downloadRes = await FileSystem.downloadAsync(lightboxImageUrl, fileUri);
                      if (downloadRes.status === 200 && downloadRes.uri) {
                        // 3. Lưu ảnh trực tiếp vào Thư viện ảnh (Gallery)
                        if (typeof (MediaLibrary as any).saveToLibraryAsync === 'function') {
                          await (MediaLibrary as any).saveToLibraryAsync(downloadRes.uri);
                        } else if (typeof (MediaLibrary as any).createAssetAsync === 'function') {
                          await (MediaLibrary as any).createAssetAsync(downloadRes.uri);
                        }
                        showLightboxToast('✓ Đã lưu ảnh vào Thư viện ảnh!');
                        return;
                      }

                      throw new Error('Tải ảnh không thành công');
                    } catch (err: any) {
                      Alert.alert('Thông báo', 'Không thể lưu ảnh vào thiết bị: ' + (err?.message || ''));
                    }
                  }}
                  style={({ pressed }) => [styles.lightboxActionCircleBtn, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <FinanceIcon name="download" size={18} color="#FFFFFF" />
                </Pressable>

                {/* Nút X đóng Lightbox */}
                <Pressable
                  onPress={() => {
                    setLightboxImageUrl(null);
                    setLightboxImageInfo(null);
                  }}
                  style={({ pressed }) => [styles.lightboxActionCircleBtn, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <FinanceIcon name="close" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Vùng hiển thị toàn bộ ảnh vừa vặn màn hình */}
            {lightboxImageUrl && (
              <View style={styles.lightboxImageWrapper}>
                <Image
                  source={{ uri: lightboxImageUrl }}
                  style={styles.lightboxFullImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {lightboxToast && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: Math.max(insets.bottom + 24, 36),
                  alignSelf: 'center',
                  backgroundColor: 'rgba(5, 150, 105, 0.94)',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {lightboxToast}
                </Text>
              </View>
            )}
          </View>
        </Modal>

        {/* ── 7. MODAL MỜI THÀNH VIÊN HIỆN ĐẠI (ĐẶT TRONG CHI TIẾT NHÓM) ── */}
        <InviteMemberModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
          searchQuery={searchMemberQuery}
          onChangeSearchQuery={handleSearchUsers}
          searchResults={searchResults}
          searching={searchingUser}
          onInviteUser={handleInviteUser}
          existingMemberUserIds={members.map((m) => m.userId)}
        />

        {/* ── 8. MODAL THAO TÁC / SỬA QUYỀN / XÓA THÀNH VIÊN (ĐẶT TRONG CHI TIẾT NHÓM) ── */}
        <MemberActionModal
          visible={selectedActionMember !== null}
          member={selectedActionMember}
          canManage={
            selectedActionMember !== null &&
            (selectedGroup?.myRole === 'OWNER' || selectedGroup?.myRole === 'ADMIN') &&
            String(selectedActionMember.userId).toLowerCase() !== String(currentUser?.id).toLowerCase()
          }
          onClose={() => setSelectedActionMember(null)}
          onUpdateRole={(mem, newRole) => handleUpdateMemberRole(mem, newRole)}
          onRemoveMember={(mem) => handleRemoveMember(mem)}
        />

        {/* ── 9. MODAL THÊM VÍ TRẺ EM (ĐÃ TÁCH COMPONENT) ── */}
        <CreateChildWalletModal
          visible={createChildWalletModalVisible}
          groupId={selectedGroup.id}
          onClose={() => setCreateChildWalletModalVisible(false)}
          onSubmit={async (data) => {
            if (!selectedGroup) return;
            const newWallet = await groupApi.createChildWallet(selectedGroup.id, data);
            setChildWallets((prev) => [newWallet, ...prev]);
            Alert.alert('Thành công', `Đã tạo ví trẻ em cho bé ${data.childName}!`);
          }}
        />

        {/* ── 10. MODAL NỘP QUỸ NHÓM (ĐÃ TÁCH COMPONENT) ── */}
        <DepositFundModal
          visible={depositFundModalVisible}
          onClose={() => setDepositFundModalVisible(false)}
          accounts={personalAccounts}
          groupName={selectedGroup?.name}
          currentFundAmount={fundData?.balance ?? monthlyStats?.fundBalance ?? 0}
          onSubmit={async (data) => {
            if (!selectedGroup) return;
            await groupApi.contributeToFund(selectedGroup.id, {
              sourceAccountId: data.sourceAccountId,
              amount: data.amount,
              contributedAt: new Date().toISOString(),
              note: data.note,
            });
            await loadGroupDetailData(selectedGroup.id);
            Alert.alert('Thành công', `Đã nộp ${new Intl.NumberFormat('vi-VN').format(data.amount)} đ vào quỹ nhóm!`);
          }}
        />

        {/* Modal Chi tiết Ví Trẻ Em (ChildWalletDetailModal) */}
        <ChildWalletDetailModal
          visible={childWalletDetailVisible}
          wallet={selectedChildWallet}
          groupId={selectedGroup?.id || ''}
          isOwnerOrAdmin={isOwner || isAdmin}
          accounts={personalAccounts}
          fundBalance={fundData?.balance ?? monthlyStats?.fundBalance ?? 0}
          initialTab={activeKidSubTab || initialKidSubTab}
          members={members}
          onClose={() => {
            setChildWalletDetailVisible(false);
            setSelectedChildWallet(null);
            setActiveKidSubTab(undefined);
          }}
          onRefreshWallet={async () => {
            if (selectedGroup) {
              const freshWallets = await groupApi.getChildWallets(selectedGroup.id).catch(() => []);
              setChildWallets(freshWallets || []);
              if (selectedChildWallet) {
                const updated = freshWallets?.find((w) => w.id === selectedChildWallet.id);
                if (updated) setSelectedChildWallet(updated);
              }
              await loadGroupDetailData(selectedGroup.id);
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      {/* ── 1. HEADER NỀN TRẮNG THANH LỊCH ĐỒNG BỘ ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            backgroundColor: isDark ? themeColors.surface : '#FFFFFF',
            borderBottomColor: isDark ? themeColors.cardBorder : '#F1F5F9',
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Quản lý nhóm</Text>
        </View>
        <Pressable
          onPress={() => setCreateModalVisible(true)}
          style={({ pressed }) => [
            styles.createGroupBtn,
            isDark && {
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              borderColor: 'rgba(52, 211, 153, 0.3)',
            },
            pressed && styles.pressed,
          ]}
        >
          <FinanceIcon name="plus" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
          <Text style={[styles.createGroupBtnText, isDark && { color: themeColors.accentGreen }]}>Tạo nhóm</Text>
        </Pressable>
      </View>

      {/* ── 2. FILTER PILLS (Tất cả (5), Của tôi (3), Đã tham gia (2)) CHUẨN DESIGN ── */}
      <View
        style={[
          styles.filterPillsRow,
          isDark && { backgroundColor: themeColors.background },
        ]}
      >
        <Pressable
          onPress={() => setActiveFilterTab('ALL')}
          style={[
            styles.filterPill,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
            activeFilterTab === 'ALL' && (isDark ? { backgroundColor: '#10B981', borderColor: '#10B981' } : styles.filterPillActive),
          ]}
        >
          <Text
            style={[
              styles.filterPillText,
              isDark && { color: themeColors.textSecondary },
              activeFilterTab === 'ALL' && (isDark ? { color: '#FFFFFF', fontWeight: '800' } : styles.filterPillTextActive),
            ]}
          >
            Tất cả ({groups.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilterTab('MY_GROUPS')}
          style={[
            styles.filterPill,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
            activeFilterTab === 'MY_GROUPS' && (isDark ? { backgroundColor: '#10B981', borderColor: '#10B981' } : styles.filterPillActive),
          ]}
        >
          <Text
            style={[
              styles.filterPillText,
              isDark && { color: themeColors.textSecondary },
              activeFilterTab === 'MY_GROUPS' && (isDark ? { color: '#FFFFFF', fontWeight: '800' } : styles.filterPillTextActive),
            ]}
          >
            Của tôi ({myGroupsCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilterTab('JOINED')}
          style={[
            styles.filterPill,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
            activeFilterTab === 'JOINED' && (isDark ? { backgroundColor: '#10B981', borderColor: '#10B981' } : styles.filterPillActive),
          ]}
        >
          <Text
            style={[
              styles.filterPillText,
              isDark && { color: themeColors.textSecondary },
              activeFilterTab === 'JOINED' && (isDark ? { color: '#FFFFFF', fontWeight: '800' } : styles.filterPillTextActive),
            ]}
          >
            Đã tham gia ({joinedGroupsCount})
          </Text>
        </Pressable>
      </View>

      {/* ── LỜI MỜI THAM GIA NHÓM ĐANG CHỜ XÁC NHẬN ── */}
      {pendingInvitations.length > 0 && (
        <View
          style={[
            styles.pendingInviteBanner,
            isDark && {
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
            },
          ]}
        >
          <View style={styles.pendingInviteHeader}>
            <View style={styles.pendingInviteTitleRow}>
              <View style={styles.pendingInviteBadge}>
                <Text style={styles.pendingInviteBadgeText}>{pendingInvitations.length}</Text>
              </View>
              <Text style={[styles.pendingInviteTitle, isDark && { color: '#FDE68A' }]}>
                Lời mời tham gia nhóm ({pendingInvitations.length})
              </Text>
            </View>
          </View>

          <View style={styles.pendingInviteList}>
            {pendingInvitations.map((inv) => {
              const isBusy = respondingInvitationId === inv.id;
              const roleLabel =
                inv.role === 'ADMIN' ? 'Quản trị viên' : inv.role === 'OWNER' ? 'Chủ nhóm' : 'Thành viên';
              return (
                <View
                  key={inv.id}
                  style={[
                    styles.pendingInviteCard,
                    isDark && {
                      backgroundColor: themeColors.surface,
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                    },
                  ]}
                >
                  <View style={styles.pendingInviteInfo}>
                    <View
                      style={[
                        styles.pendingInviteIcon,
                        isDark && { backgroundColor: 'rgba(245, 158, 11, 0.18)' },
                      ]}
                    >
                      <FinanceIcon name="users" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
                    </View>
                    <View style={styles.pendingInviteTextWrap}>
                      <Text
                        numberOfLines={1}
                        style={[styles.pendingInviteGroupName, isDark && { color: themeColors.textPrimary }]}
                      >
                        {inv.groupName || 'Nhóm tài chính'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.pendingInviteMeta, isDark && { color: themeColors.textSecondary }]}
                      >
                        Từ: {inv.inviterName || 'Thành viên'} • {roleLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pendingInviteActions}>
                    <Pressable
                      disabled={isBusy}
                      onPress={() => handleRejectInvitation(inv)}
                      style={({ pressed }) => [
                        styles.pendingInviteRejectBtn,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                        (pressed || isBusy) && { opacity: 0.65 },
                      ]}
                    >
                      <Text style={[styles.pendingInviteRejectText, isDark && { color: themeColors.textSecondary }]}>
                        Từ chối
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isBusy}
                      onPress={() => handleAcceptInvitation(inv)}
                      style={({ pressed }) => [
                        styles.pendingInviteAcceptBtn,
                        (pressed || isBusy) && { opacity: 0.7 },
                      ]}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.pendingInviteAcceptText}>Đồng ý</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 3. DANH SÁCH NHÓM ── */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00A86B" />
          <Text style={[styles.centerLoadingText, isDark && { color: themeColors.textSecondary }]}>Đang nạp danh sách nhóm...</Text>
        </View>
      ) : filteredGroups.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có nhóm nào trong mục này</Text>
          <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
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
                style={({ pressed }) => [
                  styles.modernChatGroupCard,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Avatar Icon tròn lớn 3D bên trái */}
                <View
                  style={[
                    styles.modernGroupAvatar,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                  ]}
                >
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
                      <Text
                        style={[
                          styles.modernGroupName,
                          isDark && { color: themeColors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.modernLastTimeText,
                        isDark && { color: themeColors.textMuted },
                      ]}
                    >
                      {lastMsg?.time || 'Hôm nay'}
                    </Text>
                  </View>

                  {/* Hàng 2: Số thành viên • Tag loại nhóm */}
                  <View style={styles.modernSublineRow}>
                    <Text
                      style={[
                        styles.modernMemberCountText,
                        isDark && { color: themeColors.textSecondary },
                      ]}
                    >
                      {item.memberCount || 1} thành viên
                    </Text>
                    <Text style={[styles.modernDotSep, isDark && { color: themeColors.textMuted }]}>•</Text>
                    <View
                      style={[
                        styles.modernTypeBadgePill,
                        {
                          backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : typeInfo.bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modernTypeBadgeText,
                          { color: isDark ? themeColors.accentGreen : typeInfo.color },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Hàng 3: Tin nhắn chat gần nhất + Badge tin nhắn chưa đọc màu xanh */}
                  <View style={styles.modernLastMsgRow}>
                    <Text
                      style={[
                        styles.modernLastMsgText,
                        isDark && { color: themeColors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
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
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
          <View
            style={[
              styles.inputModalSheet,
              { maxHeight: '78%' },
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            {/* Thanh kéo trang trí drag-bar nhỏ mềm mại */}
            <View style={[styles.modalDragBar, isDark && { backgroundColor: themeColors.cardBorder }]} />

            <View style={[styles.inputModalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View>
                <Text style={[styles.inputModalTitle, isDark && { color: themeColors.textPrimary }]}>Tạo nhóm tài chính mới</Text>
                <Text style={[styles.inputModalSubtitle, isDark && { color: themeColors.textSecondary }]}>Quản lý thu chi chung cùng người thân, bạn bè</Text>
              </View>
              <Pressable onPress={() => setCreateModalVisible(false)} hitSlop={10} style={styles.modalCloseBtn}>
                <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : '#64748B'} />
              </Pressable>
            </View>

            <ScrollView
              ref={createScrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Tên nhóm *</Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Ví dụ: Gia đình nhỏ, Chuyến đi Đà Lạt..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.textInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                onFocus={() => {
                  createScrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }}
              />

              <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Loại nhóm *</Text>
              <View style={styles.typeGridRow}>
                {(['FAMILY', 'ROOMMATE', 'TRAVEL', 'PROJECT', 'COUPLE'] as GroupType[]).map((t) => {
                  const info = GROUP_TYPE_MAP[t];
                  const isSelected = newGroupType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setNewGroupType(t)}
                      style={[
                        styles.typeSelectCard,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                        isSelected && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.16)', borderColor: themeColors.accentGreen } : styles.typeSelectCardActive),
                      ]}
                    >
                      {info.imageSource ? (
                        <Image
                          source={info.imageSource}
                          style={styles.typeSelectIconImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <FinanceIcon
                          name={info.iconName}
                          size={24}
                          color={isSelected ? (isDark ? themeColors.accentGreen : '#006747') : (isDark ? themeColors.textMuted : '#64748B')}
                        />
                      )}
                      <Text
                        style={[
                          styles.typeSelectCardText,
                          isDark && { color: themeColors.textSecondary },
                          isSelected && [
                            styles.typeSelectCardTextActive,
                            isDark && { color: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        {info.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Mô tả nhóm (Tùy chọn)</Text>
              <TextInput
                value={newGroupDesc}
                onChangeText={setNewGroupDesc}
                placeholder="Mục đích chi tiêu, quỹ ăn uống..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={[
                  styles.textInput,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                onFocus={() => {
                  setTimeout(() => {
                    createScrollViewRef.current?.scrollTo({ y: 220, animated: true });
                  }, 150);
                }}
              />

              {/* ── MỜI THÀNH VIÊN VÀO NHÓM (CHỌN NHIỀU NGƯỜI) ── */}
              <View style={styles.createInviteSection}>
                <View style={styles.createInviteHeader}>
                  <Text style={styles.inputLabel}>Mời thành viên (Tùy chọn)</Text>
                  {selectedInviteUsers.length > 0 && (
                    <Text style={styles.selectedCountBadge}>
                      Đã chọn {selectedInviteUsers.length} người
                    </Text>
                  )}
                </View>

                {/* Danh sách các thành viên đã chọn mời */}
                {selectedInviteUsers.length > 0 && (
                  <View style={styles.selectedUserTagsRow}>
                    {selectedInviteUsers.map((u) => (
                      <View key={u.id} style={styles.userTagPill}>
                        <Text style={styles.userTagText} numberOfLines={1}>
                          {u.fullName || u.email}
                        </Text>
                        <Pressable
                          onPress={() => toggleSelectInviteUser(u)}
                          hitSlop={6}
                          style={styles.userTagRemoveBtn}
                        >
                          <FinanceIcon name="close" size={12} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Ô tìm kiếm người dùng theo email (@) */}
                <View style={styles.createMemberSearchBox}>
                  <FinanceIcon name="search" size={16} color="#94A3B8" />
                  <TextInput
                    value={createMemberSearchQuery}
                    onChangeText={handleSearchCreateMembers}
                    onFocus={() => {
                      setTimeout(() => {
                        createScrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 200);
                    }}
                    placeholder="Nhập email có chứa @ để tìm..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    style={styles.createMemberSearchInput}
                  />
                  {searchingCreateMember && (
                    <ActivityIndicator size="small" color="#047857" style={{ marginLeft: 6 }} />
                  )}
                </View>

                {/* Kết quả tìm kiếm có thể bấm chọn nhiều người */}
                {createMemberSearchResults.length > 0 && (
                  <View style={styles.createSearchResultsBox}>
                    {createMemberSearchResults.map((u) => {
                      const isSelected = selectedInviteUsers.some((it) => it.id === u.id);
                      return (
                        <Pressable
                          key={u.id}
                          onPress={() => toggleSelectInviteUser(u)}
                          style={[
                            styles.searchResultUserRow,
                            isSelected && styles.searchResultUserRowSelected,
                          ]}
                        >
                          <View style={styles.searchUserAvatar}>
                            <Text style={styles.searchUserAvatarText}>
                              {(u.fullName || u.email || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.searchUserInfoCol}>
                            <Text style={styles.searchUserNameText} numberOfLines={1}>
                              {u.fullName}
                            </Text>
                            <Text style={styles.searchUserEmailText} numberOfLines={1}>
                              {u.email}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.multiSelectCheckCircle,
                              isSelected && styles.multiSelectCheckCircleActive,
                            ]}
                          >
                            {isSelected && <FinanceIcon name="check" size={12} color="#FFFFFF" />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleCreateGroup}
                disabled={submittingGroup}
                style={[styles.submitActionBtn, submittingGroup && styles.disabled]}
              >
                {submittingGroup ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitActionBtnText}>
                    {selectedInviteUsers.length > 0
                      ? `Tạo nhóm & Mời (${selectedInviteUsers.length})`
                      : 'Tạo nhóm ngay'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 7. MODAL MỜI THÀNH VIÊN HIỆN ĐẠI (ĐÃ TÁCH COMPONENT) ── */}
      <InviteMemberModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        searchQuery={searchMemberQuery}
        onChangeSearchQuery={handleSearchUsers}
        searchResults={searchResults}
        searching={searchingUser}
        onInviteUser={handleInviteUser}
        existingMemberUserIds={members.map((m) => m.userId)}
      />

      {/* ── 8. MODAL THAO TÁC / SỬA QUYỀN / XÓA THÀNH VIÊN (ĐÃ TÁCH COMPONENT) ── */}
      <MemberActionModal
        visible={selectedActionMember !== null}
        member={selectedActionMember}
        canManage={
          selectedActionMember !== null &&
          (selectedGroup?.myRole === 'OWNER' || selectedGroup?.myRole === 'ADMIN') &&
          String(selectedActionMember.userId).toLowerCase() !== String(currentUser?.id).toLowerCase()
        }
        onClose={() => setSelectedActionMember(null)}
        onUpdateRole={(mem, newRole) => handleUpdateMemberRole(mem, newRole)}
        onRemoveMember={(mem) => handleRemoveMember(mem)}
      />
    </View>
  );
}

