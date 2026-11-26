import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronDown,
  Maximize2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Smile,
  PieChart,
  Target,
  AlertCircle,
  HelpCircle,
  Edit2,
  Trash2,
  ImageIcon,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import {
  groupApi,
  type GroupResponse,
  type GroupMessageResponse,
  type GroupMemberResponse,
} from '../modules/group/api/groupApi';
import { authStorage } from '../modules/auth/api/authApi';
import { userProfileApi } from '../modules/profile/api/userProfileApi';
import {
  finAiAgentApi,
  type FinAiActionResponse,
} from '../modules/ai-assistant/api/finAiAgentApi';
import { FinAiActionCard } from '../modules/ai-assistant/components/FinAiActionCard';
import { finAiSyncEmitter } from '../modules/ai-assistant/api/finAiSyncEmitter';
import { floatingChatEmitter } from './floatingChatEmitter';

const finAiAvatarImg = require('../assets/finai-avatar.png');
const floatingChatDarkImg = require('../assets/icons/floating_chat_dark.png');
const floatingChatLightImg = require('../assets/icons/floating_chat_light.png');

// Avatar mặc định theo loại nhóm chuẩn của hệ thống Finora
const GROUP_DEFAULT_ICONS: Record<string, any> = {
  FAMILY: require('../assets/icons/groups/group_family.png'),
  ROOMMATE: require('../assets/icons/groups/group_roommate.png'),
  TRAVEL: require('../assets/icons/groups/group_travel.png'),
  PROJECT: require('../assets/icons/groups/group_project.png'),
  COUPLE: require('../assets/icons/groups/group_couple.png'),
  OTHER: require('../assets/icons/groups/group_project.png'),
};

interface FloatingChatIconsProps {
  onOpenAiChat: () => void;
  onOpenGroupChat: (groupId: string, groupName: string) => void;
  visible?: boolean;
}

interface GroupChatSummary {
  group: GroupResponse;
  lastMessage?: GroupMessageResponse | null;
  unreadCount: number;
}

interface MiniChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  actions?: FinAiActionResponse[];
}

const AI_QUICK_CHIPS = [
  { text: 'Tháng này tôi chi bao nhiêu?', icon: 'trending' },
  { text: 'Dự báo số dư cuối tháng', icon: 'wallet' },
  { text: 'Gợi ý tiết kiệm hiệu quả', icon: 'sparkles' },
  { text: 'Danh mục nào đang chi nhiều nhất?', icon: 'pie' },
  { text: 'Tôi còn bao nhiêu ngân sách?', icon: 'target' },
  { text: 'Có khoản nợ nào sắp đến hạn không?', icon: 'alert' },
  { text: 'Phân tích dòng tiền tháng này', icon: 'help' },
];

// Hàm sắp xếp tin nhắn tăng dần theo thời gian (cũ ở trên, mới ở dưới)
function sortMessagesChronologically(list: GroupMessageResponse[]): GroupMessageResponse[] {
  return [...list].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
}

// Định dạng vạch phân cách ngày giống trong phòng trò chuyện nhóm & Messenger
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

// Component phân giải text có chứa markdown **in đậm** hoặc header #, ##, ###
function FormattedAiText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle: any;
}) {
  if (!text) return null;

  // Lọc các ký hiệu tiêu đề thô nếu có ở đầu dòng
  const cleanText = text
    .replace(/^###\s?/gm, '')
    .replace(/^##\s?/gm, '')
    .replace(/^#\s?/gm, '');

  // Tách văn bản theo cú pháp **...**
  const parts = cleanText.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={baseStyle}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldContent = part.slice(2, -2);
          return (
            <Text key={idx} style={{ fontWeight: '800' }}>
              {boldContent}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

// Component hiển thị ảnh đính kèm theo đúng tỉ lệ gốc của ảnh (bị giới hạn chiều rộng/cao nhỏ gọn, bấm vào phóng to)
function MiniChatAttachmentImage({
  uri,
  origWidth,
  origHeight,
  onPress,
}: {
  uri: string;
  origWidth?: number;
  origHeight?: number;
  onPress: () => void;
}) {
  useEffect(() => {
    // Chỉ prefetch URL công khai; bỏ qua signed URL riêng tư (no-store)
    if (uri && !uri.includes('signature=')) {
      Image.prefetch(uri).catch(() => { });
    }
  }, [uri]);

  // Lấy thẳng width và height đã lưu ở DB để tính tỷ lệ ngay lập tức, không dùng Image.getSize gây giật giật
  const computedAspectRatio = (origWidth && origHeight && origWidth > 0 && origHeight > 0)
    ? Math.max(0.6, Math.min(1.8, origWidth / origHeight))
    : (4 / 3);
  const isSignedPrivate = uri.includes('signature=');

  return (
    <Pressable
      onPress={onPress}
      style={[styles.attachedImgPressable, { aspectRatio: computedAspectRatio }]}
    >
      <Image
        source={{ uri, cache: isSignedPrivate ? 'default' : 'force-cache' }}
        style={styles.attachedImgSmall}
        resizeMode="cover"
      />
    </Pressable>
  );
}

export function FloatingChatIcons({
  onOpenAiChat,
  onOpenGroupChat,
  visible = true,
}: FloatingChatIconsProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const currentUser = authStorage.getUser();

  // Trạng thái mở popup: null | 'AI' | 'GROUPS' | 'ACTIVE_GROUP_CHAT'
  const [activePopup, setActivePopup] = useState<'AI' | 'GROUPS' | 'ACTIVE_GROUP_CHAT' | null>(null);

  // Nhóm đang mở chat trực tiếp trong popup
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessageResponse[]>([]);
  const [groupInputText, setGroupInputText] = useState('');
  const [sendingGroupMsg, setSendingGroupMsg] = useState(false);
  const [selectedGroupImage, setSelectedGroupImage] = useState<{
    uri: string;
    name: string;
    type: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [uploadingGroupImage, setUploadingGroupImage] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const groupChatScrollRef = useRef<any>(null);

  // ID tin nhắn đang được bấm để bật/tắt hiển thị giờ gửi
  const [selectedMsgTimeId, setSelectedMsgTimeId] = useState<string | null>(null);

  // Reaction menu & Reaction Modal xem ai thả cảm xúc
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [viewingReactionModalMessage, setViewingReactionModalMessage] = useState<GroupMessageResponse | null>(null);
  const [reactionModalTab, setReactionModalTab] = useState<string>('ALL');
  const [groupMembers, setGroupMembers] = useState<GroupMemberResponse[]>([]);

  // Thao tác chỉnh sửa & Thu hồi tin nhắn nổi (đè vào tin nhắn)
  const [activeActionTargetMessage, setActiveActionTargetMessage] = useState<GroupMessageResponse | null>(null);
  const [activeTargetLayout, setActiveTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const messageBubbleRefs = useRef<Record<string, any>>({});
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [recallingMessageId, setRecallingMessageId] = useState<string | null>(null);

  // Lắng nghe bàn phím để nâng popup và cuộn tin nhắn lên
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          if (activePopup === 'AI') {
            aiChatScrollRef.current?.scrollToEnd({ animated: true });
          } else if (activePopup === 'ACTIVE_GROUP_CHAT') {
            groupChatScrollRef.current?.scrollToEnd({ animated: true });
          }
        }, 80);
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
  }, [activePopup]);

  // Phóng to ảnh (Lightbox)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxImageInfo, setLightboxImageInfo] = useState<{ senderName: string; timeStr: string } | null>(null);

  // Danh sách nhóm tóm tắt
  const [groupSummaries, setGroupSummaries] = useState<GroupChatSummary[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [searchGroupQuery, setSearchGroupQuery] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Tin nhắn AI chat nhỏ
  const [aiMessages, setAiMessages] = useState<MiniChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Chào bạn! Tôi là FinAI. Bạn cần kiểm tra chi tiêu, số dư hay lời khuyên tài chính nhanh nào? 😊',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConversationId, setAiConversationId] = useState<string | undefined>(undefined);
  const aiChatScrollRef = useRef<any>(null);

  // Animation mọc từ icon nổi lên
  const animValue = useRef(new Animated.Value(0)).current;

  const openPopupType = (type: 'AI' | 'GROUPS') => {
    setActivePopup(type);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  const closePopup = useCallback(() => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setActivePopup(null);
      setSelectedGroup(null);
    });
  }, [animValue]);

  // Lắng nghe tín hiệu đóng popup khi người dùng điều hướng hoặc chạm vào chức năng khác
  useEffect(() => {
    const unsub = floatingChatEmitter.subscribe(() => {
      if (activePopup) {
        closePopup();
      }
    });
    return unsub;
  }, [activePopup, closePopup]);

  // Nạp danh sách các nhóm
  const loadGroupChats = useCallback(async () => {
    try {
      const groups = await groupApi.getGroups();
      if (!Array.isArray(groups) || groups.length === 0) {
        setGroupSummaries([]);
        setTotalUnread(0);
        return;
      }

      const summaries = await Promise.all(
        groups.map(async (g) => {
          try {
            const msgs = await groupApi.getMessages(g.id).catch(() => []);
            const sorted = sortMessagesChronologically(msgs || []);
            const lastMsg = sorted.length > 0 ? sorted[sorted.length - 1] : null;

            // Tính chính xác số lượng tin nhắn chưa đọc đối với user hiện tại
            let unread = 0;
            const currentUserId = currentUser?.id;
            if (currentUserId && sorted.length > 0) {
              const myIdStr = String(currentUserId).toLowerCase();
              unread = sorted.filter((m) => {
                if (m.senderId === currentUserId) return false;
                const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
                return !readList.includes(myIdStr);
              }).length;
            } else {
              unread = g.unreadMessageCount || 0;
            }

            return {
              group: g,
              lastMessage: lastMsg,
              unreadCount: unread,
            };
          } catch {
            return {
              group: g,
              lastMessage: null,
              unreadCount: 0,
            };
          }
        })
      );

      setGroupSummaries(summaries);
      const sumUnread = summaries.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
      setTotalUnread(sumUnread);
    } catch {
      // ignore
    } finally {
      setLoadingGroups(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setLoadingGroups(true);
    loadGroupChats();
    // Chỉ poll thường xuyên (4s) khi popup chat đang mở & app đang active; khi đóng chỉ kiểm tra mỗi 15s
    const isGroupPopupOpen = activePopup === 'GROUPS' || activePopup === 'ACTIVE_GROUP_CHAT';
    const pollMs = isGroupPopupOpen ? 4000 : 15000;
    const pollInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadGroupChats();
      }
    }, pollMs);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadGroupChats();
    });
    return () => {
      clearInterval(pollInterval);
      appStateSub.remove();
    };
  }, [loadGroupChats, activePopup]);

  // Polling tự động lấy tin nhắn mới mỗi 3.5 giây khi đang mở phòng chat nhóm trong popup
  useEffect(() => {
    if (activePopup !== 'ACTIVE_GROUP_CHAT' || !selectedGroup?.id) return;
    const msgInterval = setInterval(async () => {
      try {
        const msgs = await groupApi.getMessages(selectedGroup.id);
        const sorted = sortMessagesChronologically(msgs || []);
        setGroupMessages(sorted);

        // Tự động đánh dấu đã xem nếu có tin nhắn mới từ người khác
        const myId = currentUser?.id;
        if (myId && sorted.length > 0) {
          const myIdStr = String(myId).toLowerCase();
          const unreadIds = sorted
            .filter((m) => {
              if (m.senderId === myId) return false;
              const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
              return !readList.includes(myIdStr);
            })
            .map((m) => m.id);

          if (unreadIds.length > 0) {
            groupApi.markMessagesAsRead(selectedGroup.id, unreadIds).catch(() => { });
          }
        }
      } catch {
        // ignore polling error
      }
    }, 3500);

    return () => clearInterval(msgInterval);
  }, [activePopup, selectedGroup?.id, currentUser?.id]);

  // Nạp tin nhắn khi mở chat 1 nhóm cụ thể trong popup và tự động đánh dấu đã xem
  const loadActiveGroupMessages = useCallback(async (groupId: string) => {
    try {
      groupApi.getMembers(groupId).then((mems) => setGroupMembers(mems || [])).catch(() => { });
      const msgs = await groupApi.getMessages(groupId);
      const sorted = sortMessagesChronologically(msgs || []);
      setGroupMessages(sorted);

      // Tự động đánh dấu đã xem các tin nhắn chưa đọc của nhóm khi vào xem
      const myId = currentUser?.id;
      if (myId && sorted.length > 0) {
        const myIdStr = String(myId).toLowerCase();
        const unreadIds = sorted
          .filter((m) => {
            if (m.senderId === myId) return false;
            const readList = (m.readByUserIds || []).map((id) => String(id).toLowerCase());
            return !readList.includes(myIdStr);
          })
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          groupApi.markMessagesAsRead(groupId, unreadIds).catch(() => { });
          // Cập nhật ngay unreadCount của nhóm này về 0
          setGroupSummaries((prev) =>
            prev.map((s) => (s.group.id === groupId ? { ...s, unreadCount: 0 } : s))
          );
          setTotalUnread((prev) => Math.max(0, prev - unreadIds.length));
        }
      }

      setTimeout(() => {
        groupChatScrollRef.current?.scrollToEnd({ animated: false });
      }, 120);
    } catch { }
  }, [currentUser?.id]);

  const handleSelectGroup = (group: GroupResponse) => {
    setSelectedGroup(group);
    setActivePopup('ACTIVE_GROUP_CHAT');
    loadActiveGroupMessages(group.id);
  };

  // Chọn ảnh từ thư viện để gửi trong popup chat nhóm
  const handlePickGroupImage = async () => {
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
        setSelectedGroupImage({
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

  // Gửi tin nhắn vào nhóm (hỗ trợ kèm ảnh)
  const handleSendGroupMessage = async () => {
    if (!selectedGroup) return;
    const hasText = groupInputText.trim().length > 0;
    const hasImage = selectedGroupImage !== null;
    if (!hasText && !hasImage) return;
    if (sendingGroupMsg || uploadingGroupImage) return;

    const txt = groupInputText.trim();
    const imageToSend = selectedGroupImage;
    setGroupInputText('');
    setSelectedGroupImage(null);
    setSendingGroupMsg(true);

    try {
      let attachmentsList = undefined;
      if (imageToSend) {
        setUploadingGroupImage(true);
        const uploaded = await groupApi.uploadMessageAttachment(selectedGroup.id, imageToSend);
        attachmentsList = [{
          ...uploaded,
          width: imageToSend.width || uploaded.width,
          height: imageToSend.height || uploaded.height,
        }];
      }

      const newMsg = await groupApi.sendMessage(selectedGroup.id, txt, undefined, attachmentsList);
      setGroupMessages((prev) => [...prev, newMsg]);
      setTimeout(() => {
        groupChatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      loadGroupChats();
    } catch {
      // ignore
    } finally {
      setSendingGroupMsg(false);
      setUploadingGroupImage(false);
    }
  };

  // Thả cảm xúc tin nhắn nhóm
  const handleToggleGroupReaction = async (msgId: string, emoji: string) => {
    if (!selectedGroup) return;
    try {
      setActiveReactionMsgId(null);
      setActiveActionTargetMessage(null);
      setActiveTargetLayout(null);
      const updated = await groupApi.reactToMessage(selectedGroup.id, msgId, emoji);
      setGroupMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setViewingReactionModalMessage((prev) => (prev && prev.id === msgId ? updated : prev));
    } catch {
      // ignore
    }
  };

  // Thu hồi tin nhắn nhóm
  const handleRecallGroupMessage = async (msgId: string) => {
    if (!selectedGroup) return;
    try {
      setActiveActionTargetMessage(null);
      setActiveTargetLayout(null);
      setRecallingMessageId(null);
      const updated = await groupApi.recallMessage(selectedGroup.id, msgId);
      setGroupMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    } catch {
      // ignore
    }
  };

  // Xóa tin nhắn ở phía tôi
  const handleHideGroupMessageForMe = (msgId: string) => {
    setActiveActionTargetMessage(null);
    setActiveTargetLayout(null);
    setRecallingMessageId(null);
    setGroupMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  // Lưu chỉnh sửa tin nhắn
  const handleSaveEditGroupMessage = async () => {
    if (!selectedGroup || !editingMessage) return;
    const txt = editingMessage.text.trim();
    if (!txt) return;
    try {
      const updated = await groupApi.updateMessage(selectedGroup.id, editingMessage.id, txt);
      setGroupMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? updated : m)));
      setEditingMessage(null);
    } catch {
      // ignore
    }
  };

  // Cập nhật action trong tin nhắn AI khi confirm/cancel
  const updateAiActionInMessages = (updatedAction: FinAiActionResponse) => {
    setAiMessages((prev) =>
      prev.map((msg) => {
        if (!msg.actions) return msg;
        return {
          ...msg,
          actions: msg.actions.map((a) =>
            a.actionId === updatedAction.actionId ? updatedAction : a
          ),
        };
      })
    );
  };

  // Xác nhận Action trong chat AI popup
  const handleConfirmAiAction = async (actionId: string) => {
    try {
      const res = await finAiAgentApi.confirmAction(actionId);
      updateAiActionInMessages(res);
      if (res.status === 'COMPLETED') {
        finAiSyncEmitter.emit({
          actionId: res.actionId,
          toolName: res.toolName,
          status: res.status,
          result: res.result,
        });
      }
    } catch {
      try {
        const check = await finAiAgentApi.getAction(actionId);
        updateAiActionInMessages(check);
        if (check.status === 'COMPLETED') {
          finAiSyncEmitter.emit({
            actionId: check.actionId,
            toolName: check.toolName,
            status: check.status,
            result: check.result,
          });
        }
      } catch {
        // ignore
      }
    }
  };

  // Hủy Action trong chat AI popup
  const handleCancelAiAction = async (actionId: string) => {
    try {
      const res = await finAiAgentApi.cancelAction(actionId);
      updateAiActionInMessages(res);
    } catch {
      // ignore
    }
  };

  // Gửi tin nhắn AI
  const handleSendAiMessage = async (textToSend?: string) => {
    const prompt = (textToSend || aiInputText).trim();
    if (!prompt || aiLoading) return;

    const userMsg: MiniChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
    };
    setAiMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setAiInputText('');
    setAiLoading(true);

    setTimeout(() => {
      aiChatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await finAiAgentApi.sendMessage(prompt, aiConversationId);
      if (res.conversationId) {
        setAiConversationId(res.conversationId);
      }
      const aiReply: MiniChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.message || 'Mình đã ghi nhận yêu cầu của bạn.',
        actions: res.actions && res.actions.length > 0 ? res.actions : undefined,
      };
      setAiMessages((prev) => [...prev, aiReply]);
    } catch {
      const errorReply: MiniChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Có lỗi kết nối tạm thời với FinAI. Vui lòng thử lại sau ít giây.',
      };
      setAiMessages((prev) => [...prev, errorReply]);
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        aiChatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  if (!visible) return null;

  // Lấy avatar thực tế đã cài đặt cho nhóm
  const renderGroupAvatar = (group: GroupResponse, size = 42) => {
    const customAvatarUri = group.avatarKey ? userProfileApi.formatAvatarUrl(group.avatarKey) : null;
    const defaultIcon = GROUP_DEFAULT_ICONS[group.groupType] || GROUP_DEFAULT_ICONS.PROJECT;

    return (
      <View style={[styles.groupAvatarWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={customAvatarUri ? { uri: customAvatarUri } : defaultIcon}
          style={[styles.groupAvatarImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      </View>
    );
  };

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const formatMsgTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      if (isYesterday) {
        return 'Hôm qua';
      }
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const bottomPosition = Math.max(insets.bottom, 16) + 65;
  // Khi bàn phím bật lên: đưa card chat nổi sát khít đỉnh bàn phím
  const popupBottom = keyboardHeight > 0
    ? keyboardHeight + 4
    : bottomPosition + 4;

  // Giảm chiều cao popup khi có bàn phím để không vượt quá đỉnh màn hình
  const popupHeight = keyboardHeight > 0
    ? Math.min(screenHeight - keyboardHeight - Math.max(insets.top, 24) - 20, 420)
    : Math.min(screenHeight * 0.65, 540);
  // Chiều ngang rộng rãi, trải dài thoải mái
  const popupWidth = Math.min(screenWidth - 96, 360);

  const filteredSummaries = groupSummaries.filter((s) =>
    s.group.name.toLowerCase().includes(searchGroupQuery.toLowerCase())
  );

  return (
    <>
      {/* 2 ICON NỔI TRÒN BÊN GÓC PHẢI DƯỚI MÀN HÌNH */}
      <View style={[styles.floatingStackContainer, { bottom: bottomPosition }]} pointerEvents="box-none">
        {/* ICON TRÊN: TRÒ CHUYỆN TIN NHẮN CÁC NHÓM */}
        <Pressable
          style={({ pressed }) => [
            styles.floatingBtn,
            styles.chatGroupBtn,
            isDark && styles.floatingBtnDark,
            activePopup === 'GROUPS' || activePopup === 'ACTIVE_GROUP_CHAT' ? styles.floatingBtnActive : null,
            pressed && styles.floatingBtnPressed,
          ]}
          onPress={() => {
            if (activePopup === 'GROUPS' || activePopup === 'ACTIVE_GROUP_CHAT') {
              closePopup();
            } else {
              openPopupType('GROUPS');
            }
          }}
          accessibilityLabel="Trò chuyện tin nhắn các nhóm"
        >
          {activePopup === 'GROUPS' || activePopup === 'ACTIVE_GROUP_CHAT' ? (
            <X size={26} color="#FFFFFF" strokeWidth={2.4} />
          ) : (
            <Image
              source={isDark ? floatingChatDarkImg : floatingChatLightImg}
              style={styles.chatGroupFloatingImg}
              resizeMode="cover"
            />
          )}

          {totalUnread > 0 && activePopup !== 'GROUPS' && activePopup !== 'ACTIVE_GROUP_CHAT' && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          )}
        </Pressable>

        {/* ICON DƯỚI: TRÒ CHUYỆN VỚI FINAI AGENT */}
        <Pressable
          style={({ pressed }) => [
            styles.floatingBtn,
            styles.finAiBtn,
            isDark && styles.floatingBtnDark,
            activePopup === 'AI' ? styles.floatingBtnActive : null,
            pressed && styles.floatingBtnPressed,
          ]}
          onPress={() => {
            if (activePopup === 'AI') {
              closePopup();
            } else {
              openPopupType('AI');
            }
          }}
          accessibilityLabel="Trò chuyện với FinAI Agent"
        >
          {activePopup === 'AI' ? (
            <X size={26} color="#FFFFFF" strokeWidth={2.4} />
          ) : (
            <Image source={finAiAvatarImg} style={styles.finAiAvatarImg} resizeMode="cover" />
          )}
        </Pressable>
      </View>

      {/* POPUP NỔI PHONG CÁCH EMERALD BÊN CẠNH ICON */}
      {activePopup && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={styles.backdropOverlay} onPress={closePopup} />

          <Animated.View
            style={[
              styles.floatingEmeraldCard,
              !isDark && styles.floatingLightCard,
              {
                bottom: popupBottom,
                right: 78,
                width: popupWidth,
                height: popupHeight,
                transform: [
                  {
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1],
                    }),
                  },
                ],
                opacity: animValue,
              },
            ]}
          >
            {/* ──────────────── 1. MÀN HÌNH CHAT FINAI AGENT ──────────────── */}
            {activePopup === 'AI' && (
              <View style={styles.cardContentContainer}>
                {/* Header FinAI */}
                <View style={[styles.cardHeaderEmerald, !isDark && styles.cardHeaderLight]}>
                  <View style={styles.headerLeftRow}>
                    <View style={[styles.aiHeaderAvatarBox, !isDark && styles.aiHeaderAvatarBoxLight]}>
                      <Image source={finAiAvatarImg} style={styles.aiHeaderAvatarImg} resizeMode="contain" />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.headerTitleTxt, !isDark && styles.headerTitleTxtLight]}>FinAI Agent</Text>
                        <View style={styles.verifiedCheckBadge}>
                          <Text style={styles.verifiedCheckTxt}>✓</Text>
                        </View>
                      </View>
                      <Text style={[styles.headerSubTxt, !isDark && styles.headerSubTxtLight]}>Trợ lý điều hướng tài chính</Text>
                    </View>
                  </View>

                  <View style={styles.headerRightActions}>
                    <Pressable
                      onPress={() => {
                        closePopup();
                        onOpenAiChat();
                      }}
                      hitSlop={8}
                      style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}
                      accessibilityLabel="Mở toàn màn hình"
                    >
                      <Maximize2 size={16} color={isDark ? '#A7F3D0' : '#059669'} />
                    </Pressable>
                    <Pressable onPress={closePopup} hitSlop={8} style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}>
                      <X size={18} color={isDark ? '#A7F3D0' : '#475569'} />
                    </Pressable>
                  </View>
                </View>

                {/* Body Messages FinAI */}
                <ScrollView
                  ref={aiChatScrollRef}
                  style={styles.chatScrollView}
                  contentContainerStyle={styles.chatScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {aiMessages.map((msg) => (
                    <View key={msg.id}>
                      <View
                        style={[
                          styles.messageRow,
                          msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAi,
                        ]}
                      >
                        {msg.sender === 'ai' && (
                          <Image source={finAiAvatarImg} style={styles.msgAvatarImg} resizeMode="contain" />
                        )}
                        <View
                          style={[
                            styles.msgBubbleWrap,
                            msg.sender === 'user' ? styles.msgBubbleWrapMe : styles.msgBubbleWrapOther,
                          ]}
                        >
                          <View
                            style={[
                              styles.msgBubble,
                              msg.sender === 'user' ? styles.msgBubbleUser : (isDark ? styles.msgBubbleAi : styles.msgBubbleAiLight),
                            ]}
                          >
                            <FormattedAiText
                              text={msg.text}
                              baseStyle={[
                                styles.msgBubbleTxt,
                                msg.sender === 'user' ? styles.msgBubbleTxtUser : (isDark ? styles.msgBubbleTxtAi : styles.msgBubbleTxtAiLight),
                              ]}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Thẻ hành động FinAiActionCard khi FinAI đề xuất giao dịch/ngân sách */}
                      {msg.actions && msg.actions.length > 0 && (
                        <View style={{ marginTop: 4, marginBottom: 6, paddingLeft: msg.sender === 'ai' ? 34 : 0 }}>
                          {msg.actions.map((act) => (
                            <FinAiActionCard
                              key={act.actionId}
                              action={act}
                              onConfirm={handleConfirmAiAction}
                              onCancel={handleCancelAiAction}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                  {aiLoading && (
                    <View style={[styles.messageRow, styles.messageRowAi]}>
                      <Image source={finAiAvatarImg} style={styles.msgAvatarImg} resizeMode="contain" />
                      <View style={[styles.msgBubble, isDark ? styles.msgBubbleAi : styles.msgBubbleAiLight, { paddingVertical: 10 }]}>
                        <ActivityIndicator size="small" color="#059669" />
                      </View>
                    </View>
                  )}

                  {/* Danh sách Quick Chips gợi ý câu hỏi: CHỈ HIỆN KHI CHƯA CHỌN GỬI VÀ KHÔNG ĐANG LOAD */}
                  {aiMessages.length <= 1 && !aiLoading && (
                    <View style={styles.chipsContainer}>
                      {AI_QUICK_CHIPS.map((chipItem) => (
                        <Pressable
                          key={chipItem.text}
                          style={[styles.quickChipBtn, !isDark && styles.quickChipBtnLight]}
                          onPress={() => handleSendAiMessage(chipItem.text)}
                        >
                          {chipItem.icon === 'trending' ? (
                            <TrendingUp size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : chipItem.icon === 'wallet' ? (
                            <Wallet size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : chipItem.icon === 'pie' ? (
                            <PieChart size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : chipItem.icon === 'target' ? (
                            <Target size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : chipItem.icon === 'alert' ? (
                            <AlertCircle size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : chipItem.icon === 'help' ? (
                            <HelpCircle size={13} color={isDark ? '#34D399' : '#059669'} />
                          ) : (
                            <Sparkles size={13} color={isDark ? '#34D399' : '#059669'} />
                          )}
                          <Text style={[styles.quickChipTxt, !isDark && styles.quickChipTxtLight]}>{chipItem.text}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Input Bar FinAI */}
                <View style={[styles.inputContainer, !isDark && styles.inputContainerLight]}>
                  <TextInput
                    style={[styles.inputField, !isDark && styles.inputFieldLight]}
                    placeholder="Hỏi nhanh FinAI..."
                    placeholderTextColor={isDark ? '#6EE7B7' : '#94A3B8'}
                    value={aiInputText}
                    onChangeText={setAiInputText}
                    onSubmitEditing={() => handleSendAiMessage()}
                    returnKeyType="send"
                  />

                  <Pressable
                    style={[
                      styles.sendBtnRound,
                      !aiInputText.trim() && { opacity: 0.6 },
                    ]}
                    onPress={() => handleSendAiMessage()}
                    disabled={!aiInputText.trim() || aiLoading}
                  >
                    <Send size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* ──────────────── 2. MÀN HÌNH DANH SÁCH NHÓM CỦA TÔI ──────────────── */}
            {activePopup === 'GROUPS' && (
              <View style={styles.cardContentContainer}>
                {/* Header Nhóm của tôi */}
                <View style={[styles.cardHeaderEmerald, !isDark && styles.cardHeaderLight]}>
                  <View style={styles.headerLeftRow}>
                    <View style={styles.groupHeaderBadge}>
                      <Users size={17} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                    <Text style={[styles.headerTitleTxt, !isDark && styles.headerTitleTxtLight]}>Nhóm của tôi</Text>
                  </View>

                  <View style={styles.headerRightActions}>
                    <Pressable
                      onPress={() => {
                        closePopup();
                        onOpenGroupChat(groupSummaries[0]?.group.id || '', groupSummaries[0]?.group.name || '');
                      }}
                      hitSlop={8}
                      style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}
                      accessibilityLabel="Mở toàn màn hình"
                    >
                      <Maximize2 size={16} color={isDark ? '#A7F3D0' : '#059669'} />
                    </Pressable>
                    <Pressable onPress={closePopup} hitSlop={8} style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}>
                      <X size={18} color={isDark ? '#A7F3D0' : '#475569'} />
                    </Pressable>
                  </View>
                </View>

                {/* Thanh tìm kiếm nhóm */}
                <View style={[styles.searchBarBox, !isDark && styles.searchBarBoxLight]}>
                  <TextInput
                    style={[styles.searchBarInput, !isDark && styles.searchBarInputLight]}
                    placeholder="Tìm kiếm nhóm..."
                    placeholderTextColor={isDark ? '#6EE7B7' : '#94A3B8'}
                    value={searchGroupQuery}
                    onChangeText={setSearchGroupQuery}
                  />
                </View>

                {/* Danh sách các nhóm */}
                {loadingGroups && groupSummaries.length === 0 ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#34D399" />
                    <Text style={[styles.loadingText, !isDark && { color: '#059669' }]}>Đang tải danh sách nhóm...</Text>
                  </View>
                ) : filteredSummaries.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Users size={32} color={isDark ? '#047857' : '#94A3B8'} />
                    <Text style={[styles.emptyText, !isDark && { color: '#64748B' }]}>Chưa tìm thấy nhóm nào.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredSummaries}
                    keyExtractor={(item) => item.group.id}
                    style={styles.groupListContainer}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const { group, lastMessage, unreadCount } = item;
                      const lastSenderName =
                        lastMessage?.sender?.fullName || lastMessage?.sender?.username || 'Tin nhắn';
                      const lastContent =
                        lastMessage?.messageType === 'IMAGE'
                          ? '[Hình ảnh]'
                          : lastMessage?.messageType === 'EXPENSE_CARD'
                            ? '[Khoản chi mới]'
                            : lastMessage?.content || 'Chưa có tin nhắn';

                      return (
                        <Pressable
                          style={({ pressed }) => [
                            styles.groupRowEmerald,
                            !isDark && styles.groupRowLight,
                            pressed && (isDark ? styles.groupRowPressed : styles.groupRowPressedLight),
                          ]}
                          onPress={() => handleSelectGroup(group)}
                        >
                          {/* Avatar nhóm đúng ảnh set sẵn */}
                          {renderGroupAvatar(group, 42)}

                          <View style={styles.groupInfoCol}>
                            <View style={styles.groupInfoTop}>
                              <Text style={[styles.groupNameTxtEmerald, !isDark && styles.groupNameTxtLight]} numberOfLines={1}>
                                {group.name}
                              </Text>
                              {lastMessage?.createdAt && (
                                <Text style={[styles.timeTxtEmerald, !isDark && styles.timeTxtLight]}>
                                  {formatMsgTime(lastMessage.createdAt)}
                                </Text>
                              )}
                            </View>

                            <View style={styles.groupInfoBottom}>
                              <Text style={[styles.lastMsgTxtEmerald, !isDark && styles.lastMsgTxtLight]} numberOfLines={1}>
                                {lastMessage ? `${lastSenderName}: ${lastContent}` : 'Chưa có tin nhắn'}
                              </Text>

                              {unreadCount > 0 && (
                                <View style={styles.unreadBadgeEmerald}>
                                  <Text style={styles.unreadBadgeTxtEmerald}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    }}
                  />
                )}
              </View>
            )}

            {/* ──────────────── 3. MÀN HÌNH CHAT CỤ THỂ TRONG NHÓM ──────────────── */}
            {activePopup === 'ACTIVE_GROUP_CHAT' && selectedGroup && (
              <View style={styles.cardContentContainer}>
                {/* Header phòng chat nhóm: CÓ NÚT QUAY LẠI BÊN CẠNH AVATAR */}
                <View style={[styles.cardHeaderEmerald, !isDark && styles.cardHeaderLight]}>
                  <View style={styles.headerLeftRow}>
                    <Pressable
                      style={[styles.backBtnArrow, !isDark && styles.backBtnArrowLight]}
                      onPress={() => setActivePopup('GROUPS')}
                      hitSlop={10}
                    >
                      <ArrowLeft size={18} color={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={2.4} />
                    </Pressable>

                    {renderGroupAvatar(selectedGroup, 34)}

                    <View style={{ flex: 1, marginRight: 4 }}>
                      <Text style={[styles.headerTitleTxt, !isDark && styles.headerTitleTxtLight]} numberOfLines={1}>
                        {selectedGroup.name}
                      </Text>
                      <Text style={[styles.headerSubTxt, !isDark && styles.headerSubTxtLight]}>
                        {selectedGroup.memberCount || 6} thành viên
                      </Text>
                    </View>
                  </View>

                  <View style={styles.headerRightActions}>
                    <Pressable
                      onPress={() => {
                        closePopup();
                        onOpenGroupChat(selectedGroup.id, selectedGroup.name);
                      }}
                      hitSlop={8}
                      style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}
                      accessibilityLabel="Mở toàn màn hình"
                    >
                      <Maximize2 size={16} color={isDark ? '#A7F3D0' : '#059669'} />
                    </Pressable>
                    <Pressable onPress={closePopup} hitSlop={8} style={[styles.headerActionBtn, !isDark && styles.headerActionBtnLight]}>
                      <X size={18} color={isDark ? '#A7F3D0' : '#475569'} />
                    </Pressable>
                  </View>
                </View>

                {/* Danh sách tin nhắn phòng chat */}
                <ScrollView
                  ref={groupChatScrollRef}
                  style={styles.chatScrollView}
                  contentContainerStyle={styles.chatScrollContent}
                  showsVerticalScrollIndicator={false}
                  onScroll={(e) => {
                    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
                    setShowScrollBottomBtn(!isCloseToBottom);
                  }}
                  scrollEventThrottle={16}
                >
                  {groupMessages.map((m, index, arr) => {
                    const isMe = m.senderId === currentUser?.id;
                    const senderName = m.sender?.fullName || m.sender?.username || 'Thành viên';
                    const rawUserAvatar = isMe ? currentUser?.avatarUrl : (m.sender?.avatarKey || (m.sender as any)?.avatarUrl);
                    const userAvatarUri = rawUserAvatar ? userProfileApi.formatAvatarUrl(rawUserAvatar) : null;
                    const timeStr = formatTimeOnly(m.createdAt);
                    const isTimeShown = selectedMsgTimeId === m.id;

                    // Tính vạch phân cách ngày và gom nhóm theo 10 phút
                    const prevMsg = index > 0 ? arr[index - 1] : null;
                    const nextMsg = index < arr.length - 1 ? arr[index + 1] : null;

                    const prevDiffMins = prevMsg && prevMsg.createdAt && m.createdAt
                      ? (new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
                      : 999;
                    const nextDiffMins = nextMsg && nextMsg.createdAt && m.createdAt
                      ? (new Date(nextMsg.createdAt).getTime() - new Date(m.createdAt).getTime()) / 60000
                      : 999;

                    const prevSenderId = prevMsg ? String(prevMsg.senderId || prevMsg.sender?.id || '') : '';
                    const nextSenderId = nextMsg ? String(nextMsg.senderId || nextMsg.sender?.id || '') : '';
                    const curSenderId = String(m.senderId || m.sender?.id || '');

                    const isSameSenderAsPrev = Boolean(prevSenderId && curSenderId && prevSenderId === curSenderId);
                    const isSameSenderAsNext = Boolean(nextSenderId && curSenderId && nextSenderId === curSenderId);

                    // Cách nhau trên 10 phút hoặc khác ngày => hiển thị vạch ngày/giờ
                    const showDateDivider = !prevMsg || prevDiffMins >= 10;
                    const dividerText = showDateDivider && m.createdAt ? formatMessengerDateDivider(m.createdAt) : '';

                    // Trong vòng 10 phút cùng 1 người gửi => gom nhóm (chỉ hiện 1 lần tên và 1 avt)
                    const isFirstInCluster = !isSameSenderAsPrev || showDateDivider;
                    const isNextInSameCluster = isSameSenderAsNext && nextDiffMins < 10;
                    const isLastInCluster = !isNextInSameCluster;

                    const reactionsList = m.reactions || [];
                    const uniqueEmojis = Array.from(new Set(reactionsList.map((r) => r.reaction)));

                    return (
                      <React.Fragment key={m.id}>
                        {/* Vạch phân cách ngày tháng chuẩn Messenger khi cách nhau >= 10 phút */}
                        {showDateDivider && Boolean(dividerText) && (
                          <View style={styles.dateDividerWrapper}>
                            <View style={[styles.dateDividerLine, !isDark && styles.dateDividerLineLight]} />
                            <Text style={[styles.dateDividerText, !isDark && styles.dateDividerTextLight]}>{dividerText}</Text>
                            <View style={[styles.dateDividerLine, !isDark && styles.dateDividerLineLight]} />
                          </View>
                        )}

                        <View
                          style={[
                            styles.messageRow,
                            isMe ? styles.messageRowUser : styles.messageRowAi,
                            !isSameSenderAsPrev || showDateDivider ? { marginTop: 6 } : { marginTop: 1 },
                          ]}
                        >
                          {/* Avatar người gửi: chỉ hiển thị ở tin nhắn cuối cùng trong cụm 10 phút */}
                          {!isMe && (
                            <View style={[styles.userSenderAvatarCircle, !isLastInCluster && { backgroundColor: 'transparent' }]}>
                              {isLastInCluster ? (
                                userAvatarUri ? (
                                  <Image source={{ uri: userAvatarUri }} style={styles.userSenderAvatarImg} />
                                ) : (
                                  <Text style={styles.userSenderAvatarTxt}>
                                    {senderName.charAt(0).toUpperCase()}
                                  </Text>
                                )
                              ) : null}
                            </View>
                          )}

                          <View
                            style={[
                              styles.msgBubbleWrap,
                              isMe ? styles.msgBubbleWrapMe : styles.msgBubbleWrapOther,
                            ]}
                          >
                            {/* Tên người gửi: chỉ hiển thị ở tin nhắn đầu tiên của cụm */}
                            {!isMe && isFirstInCluster && (
                              <Text style={[styles.senderNameLabel, !isDark && styles.senderNameLabelLight]}>
                                {senderName}
                              </Text>
                            )}

                            {/* Nếu tin nhắn có đính kèm ảnh: Giữ chuẩn tỉ lệ gốc của ảnh, bấm vào phóng to */}
                            {m.attachments && m.attachments.length > 0 && (
                              <View style={styles.attachedImgBox}>
                                {m.attachments.map((att, attIdx) => {
                                  const fileUri = userProfileApi.formatAvatarUrl(att.fileKey) || att.fileKey;
                                  return (
                                    <MiniChatAttachmentImage
                                      key={attIdx}
                                      uri={fileUri}
                                      origWidth={att.width}
                                      origHeight={att.height}
                                      onPress={() => {
                                        setLightboxImageUrl(fileUri);
                                        setLightboxImageInfo({
                                          senderName,
                                          timeStr: timeStr || 'Gần đây',
                                        });
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            )}

                            {/* Bong bóng chữ & Nhấn giữ (long press) để mở thanh thả cảm xúc & menu nổi */}
                            {Boolean(m.content && m.content !== '[Hình ảnh]') && (
                              <View
                                ref={(el) => {
                                  messageBubbleRefs.current[m.id] = el;
                                }}
                                collapsable={false}
                              >
                                <Pressable
                                  onLongPress={() => {
                                    const targetNode = messageBubbleRefs.current[m.id];
                                    if (targetNode && targetNode.measureInWindow) {
                                      targetNode.measureInWindow((x: number, y: number, width: number, height: number) => {
                                        setActiveTargetLayout({ x, y, width, height });
                                        setActiveActionTargetMessage(m);
                                      });
                                    } else {
                                      setActiveTargetLayout(null);
                                      setActiveActionTargetMessage(m);
                                    }
                                  }}
                                  onPress={() => {
                                    setSelectedMsgTimeId((prev) => (prev === m.id ? null : m.id));
                                  }}
                                  style={[
                                    styles.msgBubble,
                                    isMe ? styles.msgBubbleUser : (isDark ? styles.msgBubbleAi : styles.msgBubbleAiLight),
                                    // Bo góc nối tiếp mềm mại
                                    !isFirstInCluster && (isMe ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 }),
                                    !isLastInCluster && (isMe ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
                                  ]}
                                >
                                  {m.isEdited && (
                                    <Text style={{ fontSize: 9.5, fontStyle: 'italic', color: isMe ? '#D1FAE5' : (isDark ? '#94A3B8' : '#64748B'), marginBottom: 2 }}>
                                      Đã sửa
                                    </Text>
                                  )}
                                  <Text
                                    style={[
                                      styles.msgBubbleTxt,
                                      isMe ? styles.msgBubbleTxtUser : (isDark ? styles.msgBubbleTxtAi : styles.msgBubbleTxtAiLight),
                                    ]}
                                  >
                                    {m.content}
                                  </Text>
                                </Pressable>
                              </View>
                            )}

                            {/* Badge Reaction dưới tin nhắn (bấm vào để xem danh sách ai đã thả) */}
                            {reactionsList.length > 0 && (
                              <Pressable
                                onPress={() => {
                                  setViewingReactionModalMessage(m);
                                  setReactionModalTab('ALL');
                                }}
                                style={[
                                  styles.reactionsBadgeFloating,
                                  isDark && { backgroundColor: '#111827', borderColor: '#1E293B' },
                                  isMe ? { alignSelf: 'flex-end', marginRight: 4 } : { alignSelf: 'flex-start', marginLeft: 4 },
                                ]}
                              >
                                <View style={styles.reactionsBadgeRow}>
                                  {uniqueEmojis.map((emoji) => (
                                    <Text key={emoji} style={styles.reactionBadgeEmoji}>{emoji}</Text>
                                  ))}
                                  <Text style={[styles.reactionBadgeCount, isDark && { color: '#94A3B8' }]}>
                                    {reactionsList.length}
                                  </Text>
                                </View>
                              </Pressable>
                            )}

                            {/* Chỉ hiển thị giờ gửi KHI BẤM VÀO TIN NHẮN */}
                            {isTimeShown && Boolean(timeStr) && (
                              <View
                                style={[
                                  styles.msgMetaRow,
                                  isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                                ]}
                              >
                                <Text style={[styles.msgTimeSmall, !isDark && styles.msgTimeSmallLight]}>{timeStr}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </ScrollView>

                {/* Nút tròn nổi trượt xuống tin nhắn mới nhất dưới cùng */}
                {showScrollBottomBtn && (
                  <Pressable
                    style={[styles.scrollDownFloatingBtn, !isDark && styles.scrollDownFloatingBtnLight]}
                    onPress={() => {
                      groupChatScrollRef.current?.scrollToEnd({ animated: true });
                      setShowScrollBottomBtn(false);
                    }}
                    hitSlop={8}
                  >
                    <ChevronDown size={18} color={isDark ? '#064E3B' : '#FFFFFF'} strokeWidth={2.6} />
                  </Pressable>
                )}

                {/* Thanh sửa tin nhắn nếu đang edit */}
                {editingMessage && (
                  <View style={[styles.chatEditingBarFloating, isDark && { backgroundColor: '#111827', borderTopColor: '#1E293B' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.chatEditingTitle, isDark && { color: '#34D399' }]}>Chỉnh sửa tin nhắn</Text>
                      <TextInput
                        style={[styles.chatEditingInput, isDark && { color: '#FFFFFF', backgroundColor: '#1E293B' }]}
                        value={editingMessage.text}
                        onChangeText={(txt) => setEditingMessage((prev) => prev ? { ...prev, text: txt } : null)}
                        multiline
                      />
                    </View>
                    <View style={{ gap: 4, marginLeft: 8 }}>
                      <Pressable onPress={handleSaveEditGroupMessage} style={styles.chatEditingSaveBtn}>
                        <Text style={styles.chatEditingSaveBtnText}>Lưu</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingMessage(null)} style={styles.chatEditingCancelBtn}>
                        <Text style={styles.chatEditingCancelBtnText}>Hủy</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Thanh xem trước ảnh đã chọn đính kèm trước khi gửi */}
                {selectedGroupImage && (
                  <View style={[styles.groupImagePreviewBar, !isDark && styles.groupImagePreviewBarLight]}>
                    <Image source={{ uri: selectedGroupImage.uri }} style={styles.groupImagePreviewThumb} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.groupImagePreviewName, !isDark && styles.groupImagePreviewNameLight]} numberOfLines={1}>
                        {selectedGroupImage.name}
                      </Text>
                      <Text style={styles.groupImagePreviewSub}>Sẵn sàng gửi</Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedGroupImage(null)}
                      hitSlop={8}
                      style={styles.groupImageRemoveBtn}
                    >
                      <X size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                )}

                {/* Thanh gõ tin nhắn vào nhóm */}
                <View style={[styles.inputContainer, !isDark && styles.inputContainerLight]}>
                  <Pressable
                    style={[styles.plusIconBtn, !isDark && styles.plusIconBtnLight]}
                    onPress={handlePickGroupImage}
                    disabled={uploadingGroupImage || sendingGroupMsg}
                  >
                    {uploadingGroupImage ? (
                      <ActivityIndicator size="small" color={isDark ? '#34D399' : '#059669'} />
                    ) : (
                      <ImageIcon size={18} color={isDark ? '#A7F3D0' : '#059669'} />
                    )}
                  </Pressable>

                  <TextInput
                    style={[styles.inputField, !isDark && styles.inputFieldLight]}
                    placeholder={selectedGroupImage ? 'Thêm chú thích ảnh...' : 'Nhắn tin vào nhóm...'}
                    placeholderTextColor={isDark ? '#6EE7B7' : '#94A3B8'}
                    value={groupInputText}
                    onChangeText={setGroupInputText}
                    onSubmitEditing={handleSendGroupMessage}
                    returnKeyType="send"
                  />

                  <Pressable
                    style={[
                      styles.sendBtnRound,
                      (!groupInputText.trim() && !selectedGroupImage) && { opacity: 0.6 },
                    ]}
                    onPress={handleSendGroupMessage}
                    disabled={(!groupInputText.trim() && !selectedGroupImage) || sendingGroupMsg || uploadingGroupImage}
                  >
                    {sendingGroupMsg || uploadingGroupImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Send size={14} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      )}

      {/* ── MODAL NỔI NỀN TỐI ĐÈ LÊN TIN NHẮN (CHỌN REACTION / CHỈNH SỬA / THU HỒI) ── */}
      <Modal
        visible={!!activeActionTargetMessage}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveActionTargetMessage(null);
          setActiveTargetLayout(null);
          setRecallingMessageId(null);
        }}
      >
        <Pressable
          style={styles.chatActionModalOverlay}
          onPress={() => {
            setActiveActionTargetMessage(null);
            setActiveTargetLayout(null);
            setRecallingMessageId(null);
          }}
        >
          {activeActionTargetMessage && (() => {
            const target = activeActionTargetMessage;
            const isMe = target.senderId === currentUser?.id;
            const cleanContent = (target.content || '')
              .replace(/^\[\[BALANCE\]\]/, '')
              .replace(/^\[\[LEDGER\|.*?\]\]/, '')
              .replace(/^\[\[TRANSACTION\]\]/, '');

            const { width: winW, height: winH } = Dimensions.get('window');
            const menuW = Math.min(270, winW - 32);
            const placeAbove = activeTargetLayout ? (activeTargetLayout.y > winH * 0.45) : false;

            return (
              <>
                {activeTargetLayout && (
                  <>
                    {/* 1. Tin nhắn nổi lên tại ĐÚNG TỌA ĐỘ VỊ TRÍ GỐC TRÊN MÀN HÌNH */}
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
                      <View
                        style={[
                          styles.msgBubble,
                          isMe ? styles.msgBubbleUser : (isDark ? styles.msgBubbleAi : styles.msgBubbleAiLight),
                          { width: '100%', height: '100%', margin: 0 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.msgBubbleTxt,
                            isMe ? styles.msgBubbleTxtUser : (isDark ? styles.msgBubbleTxtAi : styles.msgBubbleTxtAiLight),
                          ]}
                        >
                          {cleanContent}
                        </Text>
                      </View>
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
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={{ gap: 8 }}>
                        {/* Thanh 6 Emoji cảm xúc */}
                        <View
                          style={[
                            styles.chatReactionPickRowModal,
                            isDark && {
                              backgroundColor: '#111827',
                              borderColor: '#1E293B',
                              borderWidth: 1,
                            },
                          ]}
                        >
                          {['❤️', '😆', '😮', '😢', '😡', '👍'].map((emoji) => (
                            <Pressable
                              key={emoji}
                              onPress={() => handleToggleGroupReaction(target.id, emoji)}
                              style={styles.chatReactionPickBtnModal}
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
                              backgroundColor: '#111827',
                              borderColor: '#1E293B',
                              borderWidth: 1,
                            },
                          ]}
                        >
                          {isMe && (!target.attachments || target.attachments.length === 0) && (
                            <Pressable
                              onPress={() => {
                                setEditingMessage({ id: target.id, text: cleanContent });
                                setActiveActionTargetMessage(null);
                                setActiveTargetLayout(null);
                                setRecallingMessageId(null);
                              }}
                              style={styles.chatActionModalItem}
                            >
                              <Text
                                style={[
                                  styles.chatActionModalItemText,
                                  isDark && { color: '#F8FAFC' },
                                ]}
                              >
                                Chỉnh sửa
                              </Text>
                              <Edit2 size={16} color={isDark ? '#34D399' : '#059669'} />
                            </Pressable>
                          )}

                          {isMe ? (
                            <Pressable
                              onPress={() => setRecallingMessageId((prev) => (prev === target.id ? null : target.id))}
                              style={[
                                styles.chatActionModalItem,
                                (!target.attachments || target.attachments.length === 0) && {
                                  borderTopWidth: 1,
                                  borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                                },
                              ]}
                            >
                              <Text style={[styles.chatActionModalItemText, { color: '#DC2626' }]}>Thu hồi</Text>
                              <Trash2 size={16} color="#DC2626" />
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={() => handleHideGroupMessageForMe(target.id)}
                              style={styles.chatActionModalItem}
                            >
                              <Text
                                style={[
                                  styles.chatActionModalItemText,
                                  isDark && { color: '#F8FAFC' },
                                ]}
                              >
                                Xóa ở phía tôi
                              </Text>
                              <Trash2 size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                            </Pressable>
                          )}
                        </View>

                        {/* Bảng phụ xác nhận Thu hồi 2 lựa chọn (khi bấm Thu hồi) */}
                        {recallingMessageId === target.id && (
                          <View
                            style={[
                              styles.chatRecallSubMenuModalBox,
                              isDark && {
                                backgroundColor: '#111827',
                                borderColor: '#1E293B',
                                borderWidth: 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chatRecallSubMenuTitleModal,
                                isDark && { color: '#94A3B8' },
                              ]}
                            >
                              Bạn muốn thu hồi tin nhắn này ở đâu?
                            </Text>
                            <Pressable
                              onPress={() => handleHideGroupMessageForMe(target.id)}
                              style={styles.chatRecallSubMenuItemModal}
                            >
                              <Text style={[styles.chatRecallSubMenuTextModal, isDark && { color: '#F8FAFC' }]}>Thu hồi với bạn</Text>
                              <Text style={styles.chatRecallSubMenuSubModal}>Tin nhắn chỉ biến mất khỏi thiết bị của bạn</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleRecallGroupMessage(target.id)}
                              style={[
                                styles.chatRecallSubMenuItemModal,
                                { borderTopWidth: 1, borderTopColor: isDark ? '#1E293B' : '#F1F5F9' },
                              ]}
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
              </>
            );
          })()}
        </Pressable>
      </Modal>

      {/* ── MODAL XEM CHI TIẾT AI ĐÃ THẢ CẢM XÚC ── */}
      <Modal
        visible={!!viewingReactionModalMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingReactionModalMessage(null)}
      >
        <View style={styles.reactionModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setViewingReactionModalMessage(null)}
          />
          <View
            style={[
              styles.reactionModalSheet,
              isDark && { backgroundColor: '#111827', borderColor: '#1E293B', borderWidth: 1 },
            ]}
          >
            {(() => {
              if (!viewingReactionModalMessage) return null;
              const reactionsList = viewingReactionModalMessage.reactions || [];
              const uniqueEmojis = Array.from(new Set(reactionsList.map((r) => r.reaction)));
              const filteredList = reactionModalTab === 'ALL'
                ? reactionsList
                : reactionsList.filter((r) => r.reaction === reactionModalTab);

              return (
                <>
                  <View style={styles.reactionModalHeader}>
                    <Text style={[styles.reactionModalTitle, isDark && { color: '#F8FAFC' }]}>
                      Cảm xúc về tin nhắn
                    </Text>
                    <Pressable
                      onPress={() => setViewingReactionModalMessage(null)}
                      hitSlop={8}
                    >
                      <Text style={[styles.reactionModalCloseText, isDark && { color: '#94A3B8' }]}>✕</Text>
                    </Pressable>
                  </View>

                  {/* Tabs Emoji */}
                  <View style={[styles.reactionModalTabsRow, isDark && { borderBottomColor: '#1E293B' }]}>
                    <Pressable
                      onPress={() => setReactionModalTab('ALL')}
                      style={[
                        styles.reactionModalTabItem,
                        reactionModalTab === 'ALL' && styles.reactionModalTabItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reactionModalTabText,
                          isDark && { color: '#94A3B8' },
                          reactionModalTab === 'ALL' && styles.reactionModalTabTextActive,
                        ]}
                      >
                        Tất cả {reactionsList.length}
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
                            reactionModalTab === emoji && styles.reactionModalTabItemActive,
                          ]}
                        >
                          <Text style={[styles.reactionModalTabEmojiText, isDark && { color: '#F8FAFC' }]}>
                            {emoji} {count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Danh sách người thả */}
                  <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                    {filteredList.map((r, rIdx) => {
                      const isCurrentUserReaction = r.userId === currentUser?.id;
                      const memberInfo = groupMembers.find((m) => m.userId === r.userId);
                      const displayName = isCurrentUserReaction
                        ? 'Bạn'
                        : (memberInfo?.user?.fullName || memberInfo?.nickname || memberInfo?.user?.username || 'Thành viên');
                      const rawAvatar = memberInfo?.user?.avatarUrl || memberInfo?.user?.avatarKey;
                      const avatarSrc = isCurrentUserReaction
                        ? (currentUser?.avatarUrl ? userProfileApi.formatAvatarUrl(currentUser.avatarUrl) : null)
                        : (rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null);

                      return (
                        <Pressable
                          key={rIdx}
                          onPress={() => {
                            if (isCurrentUserReaction && viewingReactionModalMessage) {
                              handleToggleGroupReaction(viewingReactionModalMessage.id, r.reaction);
                            }
                          }}
                          style={[
                            styles.reactionModalUserRow,
                            isDark && { borderBottomColor: '#1E293B' },
                          ]}
                        >
                          <View style={styles.reactionModalUserLeft}>
                            <View style={[styles.reactionModalAvatarBox, isDark && { backgroundColor: '#1E293B' }]}>
                              {avatarSrc ? (
                                <Image source={{ uri: avatarSrc }} style={styles.reactionModalAvatarImg} />
                              ) : (
                                <Text style={[styles.reactionModalAvatarInitial, isDark && { color: '#34D399' }]}>
                                  {displayName.slice(0, 1).toUpperCase()}
                                </Text>
                              )}
                            </View>
                            <Text style={[styles.reactionModalUserName, isDark && { color: '#F8FAFC' }]}>
                              {displayName}
                            </Text>
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

      {/* ── MODAL PHÓNG TO ẢNH (LIGHTBOX) KHI BẤM VÀO ẢNH TRONG CHAT ── */}
      <Modal
        visible={!!lightboxImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setLightboxImageUrl(null);
          setLightboxImageInfo(null);
        }}
      >
        <View style={styles.lightboxOverlay}>
          {/* Header Lightbox */}
          <View style={[styles.lightboxHeader, { paddingTop: Math.max(insets.top, 24) }]}>
            <View>
              <Text style={styles.lightboxSenderText}>{lightboxImageInfo?.senderName || 'Hình ảnh'}</Text>
              <Text style={styles.lightboxTimeText}>{lightboxImageInfo?.timeStr || 'Gần đây'}</Text>
            </View>
            <Pressable
              onPress={() => {
                setLightboxImageUrl(null);
                setLightboxImageInfo(null);
              }}
              style={styles.lightboxCloseBtn}
              hitSlop={10}
            >
              <X size={20} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Ảnh xem toàn màn hình */}
          {lightboxImageUrl && (
            <View style={styles.lightboxImageWrapper}>
              <Image
                source={{ uri: lightboxImageUrl }}
                style={styles.lightboxFullImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingStackContainer: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
  },
  floatingBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingBtnDark: {
    shadowOpacity: 0.55,
  },
  floatingBtnActive: {
    backgroundColor: '#064E3B',
    transform: [{ scale: 1.05 }],
  },
  floatingBtnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  chatGroupBtn: {
    backgroundColor: 'transparent',
  },
  chatGroupFloatingImg: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  finAiBtn: {
    backgroundColor: 'transparent',
  },
  finAiAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  sparkleDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 99999,
    elevation: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Màn mờ nhẹ đóng popup */
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9990,
  },

  /* Khung thẻ Emerald viền phát sáng */
  floatingEmeraldCard: {
    position: 'absolute',
    backgroundColor: '#06281E',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#059669',
    zIndex: 9995,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 25,
    overflow: 'hidden',
  },
  cardContentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  /* Header Emerald */
  cardHeaderEmerald: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtnArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiHeaderAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  aiHeaderAvatarImg: {
    width: 26,
    height: 26,
  },
  groupHeaderBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarWrapper: {
    overflow: 'hidden',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarImage: {
    backgroundColor: 'transparent',
  },
  headerTitleTxt: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubTxt: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
  },
  verifiedCheckBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedCheckTxt: {
    color: '#064E3B',
    fontSize: 9,
    fontWeight: '900',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Tìm kiếm nhóm */
  searchBarBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
  },
  searchBarInput: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },

  /* Danh sách nhóm */
  groupListContainer: {
    flex: 1,
  },
  groupRowEmerald: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(16, 185, 129, 0.12)',
    gap: 12,
  },
  groupRowPressed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  groupInfoCol: {
    flex: 1,
  },
  groupInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  groupNameTxtEmerald: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 6,
  },
  timeTxtEmerald: {
    fontSize: 10.5,
    color: '#6EE7B7',
  },
  groupInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsgTxtEmerald: {
    fontSize: 12,
    color: '#A7F3D0',
    flex: 1,
    marginRight: 6,
  },
  unreadBadgeEmerald: {
    backgroundColor: '#10B981',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeTxtEmerald: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Chat Messages View */
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },

  /* Vạch phân cách ngày tháng chuẩn Messenger */
  dateDividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10,
  },
  dateDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6EE7B7',
    paddingHorizontal: 6,
  },

  /* Nút nổi cuộn xuống dưới cùng */
  scrollDownFloatingBtn: {
    position: 'absolute',
    bottom: 58,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 99,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  msgAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginBottom: 2,
    flexShrink: 0,
  },
  userSenderAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 2,
    flexShrink: 0,
  },
  userSenderAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  userSenderAvatarTxt: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  senderNameLabel: {
    fontSize: 10.5,
    color: '#6EE7B7',
    marginBottom: 2,
    fontWeight: '600',
  },

  /* Khung ảnh đính kèm theo tỉ lệ gốc (nhỏ gọn max 180px) */
  attachedImgBox: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 220,
  },
  attachedImgPressable: {
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  attachedImgSmall: {
    width: '100%',
    height: '100%',
  },

  msgBubbleWrap: {
    maxWidth: '82%',
  },
  msgBubbleWrapMe: {
    alignItems: 'flex-end',
  },
  msgBubbleWrapOther: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  msgBubbleAi: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderBottomLeftRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  msgBubbleTxt: {
    fontSize: 13,
    lineHeight: 19,
  },
  msgBubbleTxtAi: {
    color: '#ECFDF5',
  },
  msgBubbleTxtUser: {
    color: '#FFFFFF',
  },
  msgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  msgTimeSmall: {
    fontSize: 9.5,
    color: '#6EE7B7',
  },

  /* Quick chips */
  chipsContainer: {
    marginTop: 6,
    gap: 6,
  },
  quickChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  quickChipTxt: {
    fontSize: 11.5,
    color: '#D1FAE5',
    fontWeight: '500',
  },

  /* Input Container */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(6, 40, 30, 0.98)',
  },
  plusIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  sendBtnRound: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#A7F3D0',
  },
  emptyBox: {
    paddingVertical: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#A7F3D0',
  },

  /* Lightbox Modal (Phóng to ảnh) */
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  lightboxSenderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lightboxTimeText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  lightboxFullImage: {
    width: '100%',
    height: '100%',
  },

  /* Light Theme Styles */
  floatingLightCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 15,
  },
  cardHeaderLight: {
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAF9',
  },
  aiHeaderAvatarBoxLight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  headerTitleTxtLight: {
    color: '#0F172A',
  },
  headerSubTxtLight: {
    color: '#64748B',
  },
  headerActionBtnLight: {
    backgroundColor: '#F1F5F9',
  },
  backBtnArrowLight: {
    backgroundColor: '#F1F5F9',
  },
  searchBarBoxLight: {
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  searchBarInputLight: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  groupRowLight: {
    borderBottomColor: '#F1F5F9',
  },
  groupRowPressedLight: {
    backgroundColor: '#F8FAF9',
  },
  groupNameTxtLight: {
    color: '#0F172A',
  },
  timeTxtLight: {
    color: '#94A3B8',
  },
  lastMsgTxtLight: {
    color: '#64748B',
  },
  inputContainerLight: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
  },
  inputFieldLight: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  plusIconBtnLight: {
    backgroundColor: '#F1F5F9',
  },
  msgBubbleAiLight: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderBottomLeftRadius: 4,
  },
  msgBubbleTxtAiLight: {
    color: '#0F172A',
  },
  quickChipBtnLight: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  quickChipTxtLight: {
    color: '#065F46',
  },
  dateDividerLineLight: {
    backgroundColor: '#E2E8F0',
  },
  dateDividerTextLight: {
    color: '#94A3B8',
  },
  senderNameLabelLight: {
    color: '#059669',
  },
  msgTimeSmallLight: {
    color: '#94A3B8',
  },
  scrollDownFloatingBtnLight: {
    backgroundColor: '#059669',
  },
  /* Floating Reactions & Modal */
  floatingReactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingReactionBtn: {
    padding: 3,
  },
  reactionsBadgeFloating: {
    marginTop: -6,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reactionBadgeEmoji: {
    fontSize: 11,
  },
  reactionBadgeCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reactionModalSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  reactionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reactionModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  reactionModalCloseText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  reactionModalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 10,
    gap: 12,
  },
  reactionModalTabItem: {
    paddingBottom: 4,
  },
  reactionModalTabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  reactionModalTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  reactionModalTabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  reactionModalTabEmojiText: {
    fontSize: 12,
    color: '#334155',
  },
  reactionModalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  reactionModalUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reactionModalAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reactionModalAvatarImg: {
    width: 34,
    height: 34,
  },
  reactionModalAvatarInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reactionModalUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  /* Action Modal Styles khi đè tin nhắn */
  chatActionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  chatReactionPickRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  chatReactionPickBtnModal: {
    padding: 6,
  },
  chatActionMenuModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  chatActionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  chatActionModalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  chatRecallSubMenuModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  chatRecallSubMenuTitleModal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  chatRecallSubMenuItemModal: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  chatRecallSubMenuTextModal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  chatRecallSubMenuSubModal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chatEditingBarFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAF9',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  chatEditingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  chatEditingInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 70,
  },
  chatEditingSaveBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatEditingSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chatEditingCancelBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatEditingCancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  /* Preview đính kèm ảnh trong popup chat nhóm */
  groupImagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#064E3B',
    borderTopWidth: 1,
    borderTopColor: '#047857',
  },
  groupImagePreviewBarLight: {
    backgroundColor: '#ECFDF5',
    borderTopColor: '#A7F3D0',
  },
  groupImagePreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#047857',
  },
  groupImagePreviewName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ECFDF5',
  },
  groupImagePreviewNameLight: {
    color: '#065F46',
  },
  groupImagePreviewSub: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 1,
  },
  groupImageRemoveBtn: {
    padding: 6,
  },
});
