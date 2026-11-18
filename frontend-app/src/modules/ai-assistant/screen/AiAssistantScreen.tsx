import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { authStorage } from '../../auth/api/authApi';
import {
  aiAssistantApi,
  type ChatMessage,
  type ChatSessionItem,
} from '../api/aiChatApi';

const finAiAvatarImg = require('../../../assets/finai-avatar.png');
const finAiBannerHeroImg = require('../../../assets/icons/finai_banner_hero.png');

type Props = {
  onBack: () => void;
};

// 4 câu hỏi nhanh mẫu thông minh đồng bộ bản web
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
    title: 'Ví của con & Tiền tiêu vặt',
    desc: 'Kiểm tra số dư, chi tiêu & xin tiền của bé',
    prompt: 'Ví của con/bé còn bao nhiêu tiền và gần đây bé có xin tiền hay chi tiêu gì không?',
    icon: 'wallet',
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
          title: 'Hoạt động gần đây',
          desc: 'Xem các khoản nạp ví, thưởng và chi tiêu',
          prompt: 'Liệt kê các hoạt động và giao dịch gần đây trong ví của em.',
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  // Modal lịch sử hội thoại
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Nạp danh sách sessions khi mở modal lịch sử
  const handleOpenHistory = async () => {
    setIsHistoryModalVisible(true);
    setLoadingSessions(true);
    try {
      const data = await aiAssistantApi.getSessions();
      setSessions(data);
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  // Chọn 1 session cũ để tiếp tục trò chuyện
  const handleSelectSession = async (session: ChatSessionItem) => {
    setCurrentSessionId(session.id);
    setIsHistoryModalVisible(false);
    setIsLoading(true);
    try {
      const msgs = await aiAssistantApi.getSessionMessages(session.id);
      setMessages(msgs);
    } catch {
      Alert.alert('Thông báo', 'Không thể tải lịch sử cuộc trò chuyện này.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt đầu cuộc trò chuyện mới
  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setIsHistoryModalVisible(false);
  };

  // Gửi tin nhắn đến FinAI Copilot
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');

    // Thêm câu hỏi của user vào danh sách tin nhắn
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      author: 'user',
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await aiAssistantApi.sendMessage(textToSend, currentSessionId);
      if (res.sessionId) {
        setCurrentSessionId(res.sessionId);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        author: 'assistant',
        text: res.answer,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        author: 'assistant',
        text: 'Xin lỗi bạn, kết nối tới máy chủ AI đang gặp gián đoạn. Vui lòng kiểm tra lại dịch vụ AI hoặc thử lại sau giây lát!',
      };
      setMessages((prev) => [...prev, errorMsg]);
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
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── 1. HEADER NỀN TRẮNG TINH TẾ ĐỒNG BỘ MẪU ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <FinanceIcon name="chevron-left" size={22} color="#064E3B" />
          </Pressable>
          <View style={styles.copilotBadge}>
            <View style={styles.avatarMiniWrap}>
              <Image source={finAiAvatarImg} style={styles.avatarMiniImg} resizeMode="cover" />
            </View>
            <View>
              <Text style={styles.headerTitle}>FinAI Copilot</Text>
              <Text style={styles.headerSubtitle}>Trợ lý tài chính thông minh</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={handleOpenHistory}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FinanceIcon name="clock" size={20} color="#064E3B" />
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
            {/* Nút cài đặt nhỏ tròn góc phải */}
            <Pressable
              style={styles.settingFloatBtn}
              hitSlop={10}
              onPress={() => Alert.alert('FinAI Settings', 'FinAI Copilot kết nối trực tiếp với dữ liệu dòng tiền và tài khoản của bạn để phân tích và tối ưu hóa ngân sách.')}
            >
              <FinanceIcon name="settings" size={18} color="#059669" />
            </Pressable>

            {/* Banner Robot FinAI sóng xanh lượn ngang */}
            <View style={styles.heroBannerWrapper}>
              <Image
                source={finAiBannerHeroImg}
                style={styles.heroBannerImage}
                resizeMode="contain"
              />
            </View>

            {/* Tiêu đề chào mừng */}
            <Text style={styles.welcomeMainTitle}>
              Xin chào! Tôi có thể giúp gì cho{' '}
              <Text style={styles.welcomeHighlightTitle}>tài chính</Text> của bạn?
            </Text>
            <View style={styles.titleUnderline} />

            <Text style={styles.welcomeSubDesc}>
              Tôi được kết nối trực tiếp với dòng tiền, ngân sách và lịch sử giao dịch của bạn để phân tích và đưa ra tư vấn chính xác.
            </Text>

            {/* Grid các câu hỏi gợi ý nhanh */}
            <View style={styles.quickGrid}>
              {quickQuestions.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(q.prompt)}
                  style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
                >
                  <View style={styles.quickCardHeader}>
                    <View style={styles.quickIconWrap}>
                      <FinanceIcon name={q.icon as any} size={16} color="#059669" />
                    </View>
                    <Text style={styles.quickCardTitle}>{q.title}</Text>
                  </View>
                  <Text style={styles.quickCardDesc} numberOfLines={2}>
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
                <View style={styles.messageAiAvatar}>
                  <Image source={finAiAvatarImg} style={styles.finAiAvatarImg} resizeMode="cover" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                {!isUser && (
                  <View style={styles.aiTagRow}>
                    <Text style={styles.aiTagText}>✦ FinAI Advisor</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextAi,
                  ]}
                >
                  {renderFormattedText(m.text)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Loading Indicator khi AI đang suy nghĩ */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowAi]}>
            <View style={styles.messageAiAvatar}>
              <Image source={finAiAvatarImg} style={styles.finAiAvatarImg} resizeMode="cover" />
            </View>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.typingText}>FinAI đang phân tích tài chính của bạn...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── 3. KHUNG NHẬP TIN NHẮN (COMPOSER) ── */}
      <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.composerBar}>
          <TextInput
            value={inputQuery}
            onChangeText={setInputQuery}
            placeholder="Hỏi FinAI về chi tiêu, ngân sách, số dư..."
            placeholderTextColor="#94A3B8"
            style={styles.composerInput}
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

      {/* ── MODAL LỊCH SỬ HỘI THOẠI (CHAT SESSIONS) ── */}
      <Modal visible={isHistoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FinanceIcon name="clock" size={20} color="#059669" />
                <Text style={styles.modalTitle}>Lịch sử hội thoại</Text>
              </View>
              <Pressable onPress={() => setIsHistoryModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
              {loadingSessions ? (
                <View style={styles.sessionsLoadingBox}>
                  <ActivityIndicator size="small" color="#00A86B" />
                  <Text style={styles.sessionsLoadingText}>Đang nạp lịch sử...</Text>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.emptySessionsBox}>
                  <Text style={styles.emptySessionsEmoji}>💬</Text>
                  <Text style={styles.emptySessionsTitle}>Chưa có cuộc trò chuyện nào</Text>
                  <Text style={styles.emptySessionsDesc}>
                    Bắt đầu nhắn tin với FinAI để lưu lại lịch sử tư vấn tài chính.
                  </Text>
                </View>
              ) : (
                sessions.map((sess) => {
                  const isCurrent = currentSessionId === sess.id;
                  return (
                    <Pressable
                      key={sess.id}
                      onPress={() => handleSelectSession(sess)}
                      style={({ pressed }) => [
                        styles.sessionItemRow,
                        isCurrent && styles.sessionItemRowActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.sessionItemLeft}>
                        <View style={[styles.sessionIconBox, isCurrent && styles.sessionIconBoxActive]}>
                          <FinanceIcon name="spark" size={16} color={isCurrent ? '#059669' : '#64748B'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sessionTitle, isCurrent && styles.sessionTitleActive]} numberOfLines={1}>
                            {sess.title || 'Cuộc hội thoại tài chính'}
                          </Text>
                          <Text style={styles.sessionDate}>
                            {sess.created_at ? new Date(sess.created_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </Text>
                        </View>
                      </View>
                      {isCurrent && <Text style={styles.currentSessionTag}>Đang mở</Text>}
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarMiniImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  finAiAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  finAiAvatarImgLarge: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  welcomeIntroBox: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
  },
  settingFloatBtn: {
    position: 'absolute',
    top: 60,
    right: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 10,
  },
  heroBannerWrapper: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  welcomeMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 6,
  },
  welcomeHighlightTitle: {
    color: '#059669',
    fontWeight: '900',
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 12,
  },
  welcomeSubDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '92%',
    marginBottom: 20,
  },
  quickGrid: {
    width: '100%',
    gap: 10,
  },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickCardPressed: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
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
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  quickCardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
    backgroundColor: '#E8F8F0',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#074838',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  aiTagRow: {
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageTextAi: {
    color: '#1E293B',
    fontWeight: '500',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    minHeight: 44,
    gap: 6,
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#00A86B',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  sessionsList: {
    padding: 16,
    maxHeight: 380,
  },
  sessionsLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  sessionsLoadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  emptySessionsBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptySessionsEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptySessionsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySessionsDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFCFB',
  },
  sessionItemRowActive: {
    borderColor: '#A7F3D0',
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
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionIconBoxActive: {
    backgroundColor: '#E8F8F0',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sessionTitleActive: {
    color: '#064E3B',
  },
  sessionDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  currentSessionTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  startNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00A86B',
    borderRadius: 16,
    paddingVertical: 14,
  },
  startNewChatBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
