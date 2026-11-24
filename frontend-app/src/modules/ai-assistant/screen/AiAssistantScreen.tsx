import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { AppAlert as Alert } from '../../../context/DialogContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { authStorage } from '../../auth/api/authApi';
import {
  finAiAgentApi,
  FinAiActionResponse,
  FinAiConversationSummary,
} from '../api/finAiAgentApi';
import { finAiSyncEmitter } from '../api/finAiSyncEmitter';
import { FinAiActionCard } from '../components/FinAiActionCard';
import { useAppTheme } from '../../../context/ThemeContext';

const finAiAvatarImg = require('../../../assets/finai-avatar.png');
const finAiBannerHeroImg = require('../../../assets/icons/finai_banner_hero.png');

interface DisplayMessage {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  actions?: FinAiActionResponse[];
}

type Props = {
  onBack: () => void;
};

const QUICK_QUESTIONS = [
  {
    title: 'Tổng chi tiêu tháng này',
    desc: 'Đã tiêu bao nhiêu tiền và mục nào nhiều nhất?',
    prompt: 'Tháng này tôi đã chi tiêu hết bao nhiêu tiền? Danh mục nào chiếm nhiều nhất?',
    icon: 'wallet',
  },
  {
    title: 'Dự báo số dư tài khoản',
    desc: 'Dự đoán số dư cuối tháng bằng mô hình AI',
    prompt: 'Dự báo số dư tài khoản của tôi đến cuối tháng còn lại bao nhiêu?',
    icon: 'trend',
  },
  {
    title: 'Ghi chi tiêu ăn uống 50k',
    desc: 'Đề xuất tạo giao dịch ăn trưa hôm nay',
    prompt: 'Tạo giúp tôi giao dịch vừa ăn trưa hết 50000 tiền mặt',
    icon: 'receipt',
  },
  {
    title: 'Lời khuyên 50/30/20',
    desc: 'Đánh giá thói quen tài chính & tiết kiệm',
    prompt: 'Đánh giá chi tiêu của tôi theo quy tắc 50/30/20 và cho lời khuyên tiết kiệm.',
    icon: 'check',
  },
];

export function AiAssistantScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const user = authStorage.getUser();
  const isChildAccount = Boolean(user?.childAccount && user?.childWalletGroupId);

  const quickQuestions = useMemo(() => {
    if (isChildAccount) {
      return [
        {
          title: 'Số dư ví của em',
          desc: 'Hiện tại ví của em còn bao nhiêu tiền?',
          prompt: 'Ví của em hiện tại còn bao nhiêu tiền và tuần này được bố mẹ cấp bao nhiêu?',
          icon: 'wallet',
        },
        {
          title: 'Chi tiêu tháng này',
          desc: 'Em đã tiêu bao nhiêu tiền và vào những gì?',
          prompt: 'Tháng này em đã chi tiêu bao nhiêu tiền và đã mua những món gì?',
          icon: 'receipt',
        },
        {
          title: 'Ghi chép tiền tiêu vặt',
          desc: 'Tạo giao dịch mua đồ dùng học tập',
          prompt: 'Em vừa mua bút thước hết 20000 tiền mặt, ghi giúp em nhé',
          icon: 'clock',
        },
        {
          title: 'Lời khuyên tiết kiệm',
          desc: 'Làm sao để tích lũy được nhiều tiền hơn?',
          prompt: 'Cho em lời khuyên làm sao để hoàn thành nhiệm vụ và tiết kiệm tiền vào ví thật tốt nhé!',
          icon: 'spark',
        },
      ];
    }
    return QUICK_QUESTIONS;
  }, [isChildAccount]);

  const scrollViewRef = useRef<ScrollView>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Modal lịch sử hội thoại
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [conversations, setConversations] = useState<FinAiConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Theo dõi trạng thái bàn phím để loại bỏ phần hở đệm đáy trên iOS
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Nạp danh sách conversations khi mở modal lịch sử
  const handleOpenHistory = async () => {
    setIsHistoryModalVisible(true);
    setLoadingConversations(true);
    try {
      const data = await finAiAgentApi.getConversations();
      setConversations(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingConversations(false);
    }
  };

  // Chọn 1 conversation cũ để tiếp tục trò chuyện
  const handleSelectConversation = async (conv: FinAiConversationSummary) => {
    setCurrentConversationId(conv.conversationId);
    setIsHistoryModalVisible(false);
    setIsLoading(true);
    try {
      const detail = await finAiAgentApi.getConversation(conv.conversationId);
      const allActions = detail.actions || [];
      const actionMap = new Map<string, FinAiActionResponse>();
      allActions.forEach((act) => actionMap.set(act.actionId, act));

      const loadedMsgs: DisplayMessage[] = (detail.messages || []).map((m, idx) => {
        let msgActions: FinAiActionResponse[] | undefined = undefined;
        if (m.actions && m.actions.length > 0) {
          msgActions = m.actions;
        } else if (m.actionIds && m.actionIds.length > 0) {
          msgActions = m.actionIds.map((id) => actionMap.get(id)!).filter(Boolean);
        }

        return {
          id: m.id || `msg-${idx}`,
          author: m.author,
          text: m.text,
          actions: msgActions && msgActions.length > 0 ? msgActions : undefined,
        };
      });

      setMessages(loadedMsgs);
    } catch {
      Alert.alert('Thông báo', 'Không thể tải lịch sử cuộc trò chuyện này.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt đầu cuộc trò chuyện mới
  const handleNewChat = () => {
    setCurrentConversationId(undefined);
    setMessages([]);
    setIsHistoryModalVisible(false);
  };

  // Cập nhật trạng thái của 1 action trong danh sách tin nhắn
  const updateActionInMessages = (updatedAction: FinAiActionResponse) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.actions || msg.actions.length === 0) return msg;
        const exists = msg.actions.some((a) => a.actionId === updatedAction.actionId);
        if (!exists) return msg;
        return {
          ...msg,
          actions: msg.actions.map((a) =>
            a.actionId === updatedAction.actionId ? updatedAction : a
          ),
        };
      })
    );
  };

  // Polling cho action đang EXECUTING hoặc CONFIRMED
  const pollActionUntilComplete = async (actionId: string) => {
    const maxPolls = 15; // 15 x 2s = 30s
    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const latest = await finAiAgentApi.getAction(actionId);
        updateActionInMessages(latest);

        if (latest.status === 'COMPLETED') {
          clearInterval(interval);
          setIsProcessingAction(false);
          finAiSyncEmitter.emit({
            actionId: latest.actionId,
            toolName: latest.toolName,
            status: latest.status,
            result: latest.result,
          });
        } else if (
          latest.status === 'FAILED' ||
          latest.status === 'CANCELLED' ||
          latest.status === 'EXPIRED'
        ) {
          clearInterval(interval);
          setIsProcessingAction(false);
        } else if (pollCount >= maxPolls) {
          clearInterval(interval);
          setIsProcessingAction(false);
        }
      } catch {
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setIsProcessingAction(false);
        }
      }
    }, 2000);
  };

  // Xác nhận thực thi Action (create_transaction, create_budget, etc.)
  const handleConfirmAction = async (actionId: string) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);

    try {
      const res = await finAiAgentApi.confirmAction(actionId);
      updateActionInMessages(res);

      if (res.status === 'COMPLETED') {
        setIsProcessingAction(false);
        finAiSyncEmitter.emit({
          actionId: res.actionId,
          toolName: res.toolName,
          status: res.status,
          result: res.result,
        });
        Alert.alert('Thành công', 'Hành động đã được thực hiện thành công!');
      } else if (res.status === 'EXECUTING' || res.status === 'CONFIRMED') {
        pollActionUntilComplete(actionId);
      } else {
        setIsProcessingAction(false);
      }
    } catch (err: any) {
      setIsProcessingAction(false);
      // Timeout hoặc network: khôi phục trạng thái từ server trước khi báo lỗi
      try {
        const check = await finAiAgentApi.getAction(actionId);
        updateActionInMessages(check);
        if (check.status === 'COMPLETED') {
          finAiSyncEmitter.emit({
            actionId: check.actionId,
            toolName: check.toolName,
            status: check.status,
            result: check.result,
          });
          Alert.alert('Thành công', 'Hành động đã được ghi nhận hoàn thành!');
          return;
        }
      } catch {
        // bỏ qua
      }
      Alert.alert(
        'Không thể hoàn thành',
        err?.message || 'Có lỗi xảy ra khi xác nhận hành động. Vui lòng thử lại.'
      );
    }
  };

  // Hủy bỏ Action
  const handleCancelAction = async (actionId: string) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);

    try {
      const res = await finAiAgentApi.cancelAction(actionId);
      updateActionInMessages(res);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể hủy đề xuất vào lúc này.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Gửi tin nhắn đến FinAI Agent
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');

    // Thêm câu hỏi của user vào danh sách tin nhắn
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      author: 'user',
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await finAiAgentApi.sendMessage(textToSend, currentConversationId);
      if (res.conversationId) {
        setCurrentConversationId(res.conversationId);
      }

      const aiMsg: DisplayMessage = {
        id: `ai-${Date.now()}`,
        author: 'assistant',
        text: res.message || 'Tôi đã xử lý yêu cầu của bạn.',
        actions: res.actions && res.actions.length > 0 ? res.actions : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      // Timeout recovery: thử kiểm tra conversation xem server đã lưu chưa
      let recovered = false;
      if (currentConversationId) {
        try {
          const detail = await finAiAgentApi.getConversation(currentConversationId);
          if (detail.messages && detail.messages.length > messages.length) {
            const lastMsg = detail.messages[detail.messages.length - 1];
            if (lastMsg.author === 'assistant') {
              const recoveredAiMsg: DisplayMessage = {
                id: lastMsg.id || `ai-${Date.now()}`,
                author: 'assistant',
                text: lastMsg.text,
                actions: detail.actions || [],
              };
              setMessages((prev) => [...prev, recoveredAiMsg]);
              recovered = true;
            }
          }
        } catch {
          // recovery failed
        }
      }

      if (!recovered) {
        const errorMsg: DisplayMessage = {
          id: `err-${Date.now()}`,
          author: 'assistant',
          text:
            err?.message ||
            'Xin lỗi bạn, kết nối tới máy chủ FinAI đang gặp gián đoạn. Vui lòng kiểm tra lại mạng hoặc thử lại sau giây lát!',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // Hàm render văn bản đơn giản (lọc bỏ các ký hiệu markdown thô)
  const renderFormattedText = (rawText: string) => {
    return rawText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/###\s?/g, '')
      .replace(/##\s?/g, '')
      .replace(/#\s?/g, '');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── 1. HEADER NỀN TRẮNG TINH TẾ ĐỒNG BỘ MẪU ── */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 4 },
          isDark && { backgroundColor: themeColors.background, borderBottomColor: themeColors.cardBorder },
        ]}
      >
        <View style={styles.headerLeft}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={[styles.backBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          >
            <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.accentGreen : '#064E3B'} />
          </Pressable>
          <View style={styles.copilotBadge}>
            <View
              style={[
                styles.avatarMiniWrap,
                isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
              ]}
            >
              <Image source={finAiAvatarImg} style={styles.avatarMiniImg} resizeMode="cover" />
            </View>
            <View>
              <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>FinAI Agent</Text>
              <Text style={[styles.headerSubtitle, isDark && { color: themeColors.textSecondary }]}>Trợ lý điều hướng tài chính</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={handleOpenHistory}
            style={({ pressed }) => [
              styles.headerBtn,
              isDark && { backgroundColor: themeColors.surfaceSubtle },
              pressed && styles.pressed,
            ]}
            hitSlop={8}
          >
            <FinanceIcon name="clock" size={20} color={isDark ? themeColors.accentGreen : '#064E3B'} />
          </Pressable>

          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [styles.headerBtnPrimary, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FinanceIcon name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.newChatText}>Mới</Text>
          </Pressable>
        </View>
      </View>

      {/* ── 2. KHU VỰC TIN NHẮN (CHAT FEED) ── */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner giới thiệu FinAI khi chưa có tin nhắn */}
        {messages.length === 0 && (
          <View style={styles.welcomeIntroBox}>
            <View style={styles.heroBannerWrapper}>
              <Image
                source={finAiBannerHeroImg}
                style={styles.heroBannerImage}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.welcomeMainTitle, isDark && { color: themeColors.textPrimary }]}>
              Xin chào! Tôi có thể giúp gì cho{' '}
              <Text style={[styles.welcomeHighlightTitle, isDark && { color: themeColors.accentGreen }]}>tài chính</Text> của bạn?
            </Text>
            <View style={[styles.titleUnderline, isDark && { backgroundColor: themeColors.accentGreen }]} />

            <Text style={[styles.welcomeSubDesc, isDark && { color: themeColors.textSecondary }]}>
              Tôi có thể tra cứu chi tiêu, phân tích ngân sách và đề xuất tạo giao dịch, dự toán chi tiêu tự động với sự xác nhận từ bạn.
            </Text>

            {/* Grid các câu hỏi gợi ý nhanh */}
            <View style={styles.quickGrid}>
              {quickQuestions.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(q.prompt)}
                  style={({ pressed }) => [
                    styles.quickCard,
                    isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                    pressed && styles.quickCardPressed,
                    pressed && isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.accentGreen },
                  ]}
                >
                  <View style={styles.quickCardHeader}>
                    <View style={[styles.quickIconWrap, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)' }]}>
                      <FinanceIcon name={q.icon as any} size={16} color={isDark ? themeColors.accentGreen : '#059669'} />
                    </View>
                    <Text style={[styles.quickCardTitle, isDark && { color: themeColors.textPrimary }]}>{q.title}</Text>
                  </View>
                  <Text style={[styles.quickCardDesc, isDark && { color: themeColors.textSecondary }]} numberOfLines={2}>
                    {q.desc}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Danh sách các tin nhắn trao đổi */}
        {messages.map((m) => {
          const isUser = m.author === 'user';
          return (
            <View
              key={m.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {!isUser && (
                <View
                  style={[
                    styles.messageAiAvatar,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                  ]}
                >
                  <Image source={finAiAvatarImg} style={styles.finAiAvatarImg} resizeMode="cover" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAi,
                  isUser && isDark && { backgroundColor: '#064E3B' },
                  !isUser && isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
                ]}
              >
                {!isUser && (
                  <View style={styles.aiTagRow}>
                    <Text style={[styles.aiTagText, isDark && { color: themeColors.accentGreen }]}>✦ FinAI Agent</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextAi,
                    !isUser && isDark && { color: themeColors.textPrimary },
                  ]}
                >
                  {renderFormattedText(m.text)}
                </Text>

                {/* Render Action Proposal Cards if any */}
                {m.actions && m.actions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    {m.actions.map((act) => (
                      <FinAiActionCard
                        key={act.actionId}
                        action={act}
                        onConfirm={handleConfirmAction}
                        onCancel={handleCancelAction}
                        isProcessing={isProcessingAction}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Loading Indicator khi AI đang suy nghĩ */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowAi]}>
            <View
              style={[
                styles.messageAiAvatar,
                isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
              ]}
            >
              <Image source={finAiAvatarImg} style={styles.finAiAvatarImg} resizeMode="cover" />
            </View>
            <View
              style={[
                styles.bubble,
                styles.bubbleAi,
                styles.typingBubble,
                isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
              ]}
            >
              <ActivityIndicator size="small" color={isDark ? themeColors.accentGreen : '#059669'} />
              <Text style={[styles.typingText, isDark && { color: themeColors.accentGreen }]}>
                FinAI đang xử lý yêu cầu của bạn...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── 3. KHUNG NHẬP TIN NHẮN (COMPOSER) ── */}
      <View
        style={[
          styles.composerContainer,
          { paddingBottom: isKeyboardVisible ? 6 : Math.max(insets.bottom, 12) },
          isDark && { backgroundColor: themeColors.background, borderTopColor: themeColors.cardBorder },
        ]}
      >
        <View
          style={[
            styles.composerBar,
            isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
          ]}
        >
          <TextInput
            value={inputQuery}
            onChangeText={setInputQuery}
            placeholder="Hỏi hoặc bảo FinAI..."
            placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
            style={[styles.composerInput, isDark && { color: themeColors.textPrimary }]}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!inputQuery.trim() || isLoading}
            style={({ pressed }) => [
              styles.sendBtn,
              inputQuery.trim() && !isLoading ? styles.sendBtnActive : styles.sendBtnDisabled,
              inputQuery.trim() && !isLoading && isDark && { backgroundColor: themeColors.accentGreen },
              !inputQuery.trim() && isDark && { backgroundColor: themeColors.surfaceSubtle },
              pressed && styles.pressed,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── MODAL LỊCH SỬ HỘI THOẠI (CHAT CONVERSATIONS) ── */}
      <Modal visible={isHistoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, isDark && { backgroundColor: themeColors.surface }]}>
            <View style={[styles.modalHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FinanceIcon name="clock" size={20} color={isDark ? themeColors.accentGreen : '#059669'} />
                <Text style={[styles.modalTitle, isDark && { color: themeColors.textPrimary }]}>Lịch sử hội thoại</Text>
              </View>
              <Pressable onPress={() => setIsHistoryModalVisible(false)} hitSlop={10}>
                <Text style={[styles.modalCloseText, isDark && { color: themeColors.textSecondary }]}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
              {loadingConversations ? (
                <View style={styles.sessionsLoadingBox}>
                  <ActivityIndicator size="small" color={isDark ? themeColors.accentGreen : '#00A86B'} />
                  <Text style={[styles.sessionsLoadingText, isDark && { color: themeColors.textSecondary }]}>Đang nạp lịch sử...</Text>
                </View>
              ) : conversations.length === 0 ? (
                <View style={styles.emptySessionsBox}>
                  <Text style={styles.emptySessionsEmoji}>💬</Text>
                  <Text style={[styles.emptySessionsTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có cuộc trò chuyện nào</Text>
                  <Text style={[styles.emptySessionsDesc, isDark && { color: themeColors.textSecondary }]}>
                    Bắt đầu nhắn tin với FinAI để lưu lại lịch sử tư vấn và hành động tài chính.
                  </Text>
                </View>
              ) : (
                conversations.map((conv) => {
                  const isCurrent = currentConversationId === conv.conversationId;
                  return (
                    <Pressable
                      key={conv.conversationId}
                      onPress={() => handleSelectConversation(conv)}
                      style={({ pressed }) => [
                        styles.sessionItemRow,
                        isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                        isCurrent && styles.sessionItemRowActive,
                        isCurrent && isDark && { borderColor: themeColors.accentGreen, backgroundColor: 'rgba(52, 211, 153, 0.12)' },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.sessionItemLeft}>
                        <View
                          style={[
                            styles.sessionIconBox,
                            isDark && { backgroundColor: themeColors.surface },
                            isCurrent && styles.sessionIconBoxActive,
                            isCurrent && isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)' },
                          ]}
                        >
                          <FinanceIcon
                            name="spark"
                            size={16}
                            color={isCurrent ? (isDark ? themeColors.accentGreen : '#059669') : isDark ? themeColors.textMuted : '#64748B'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.sessionTitle,
                              isDark && { color: themeColors.textPrimary },
                              isCurrent && styles.sessionTitleActive,
                              isCurrent && isDark && { color: themeColors.accentGreen },
                            ]}
                            numberOfLines={1}
                          >
                            {conv.title || 'Cuộc hội thoại tài chính'}
                          </Text>
                          <Text style={[styles.sessionDate, isDark && { color: themeColors.textMuted }]}>
                            {conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <Text
                          style={[
                            styles.currentSessionTag,
                            isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)', color: themeColors.accentGreen },
                          ]}
                        >
                          Đang mở
                        </Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleNewChat}
                style={({ pressed }) => [styles.startNewChatBtn, pressed && styles.pressed]}
              >
                <FinanceIcon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.startNewChatBtnText}>Tạo cuộc trò chuyện mới</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copilotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarMiniWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarMiniImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#059669',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  newChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  welcomeIntroBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroBannerWrapper: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroBannerImage: {
    width: '100%',
    height: 120,
  },
  welcomeMainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  welcomeHighlightTitle: {
    color: '#059669',
  },
  titleUnderline: {
    width: 48,
    height: 3,
    backgroundColor: '#059669',
    borderRadius: 2,
    marginBottom: 12,
  },
  welcomeSubDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  quickGrid: {
    width: '100%',
    gap: 10,
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickCardPressed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
  },
  quickCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  quickIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  quickCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 10,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageAiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  finAiAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiTagRow: {
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAi: {
    color: '#1E293B',
  },
  actionsContainer: {
    marginTop: 8,
    width: '100%',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typingText: {
    fontSize: 13,
    color: '#059669',
    fontStyle: 'italic',
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 90,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#059669',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  sessionsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sessionsLoadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  sessionsLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptySessionsBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptySessionsEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptySessionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySessionsDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sessionItemRowActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sessionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIconBoxActive: {
    backgroundColor: '#ECFDF5',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  sessionTitleActive: {
    color: '#059669',
  },
  sessionDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  currentSessionTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  startNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startNewChatBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
