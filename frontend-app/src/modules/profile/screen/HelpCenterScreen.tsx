import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { feedbackApi, type FeedbackItem } from '../api/feedbackApi';

interface HelpCenterScreenProps {
  onBack: () => void;
  onOpenAiAssistant?: () => void;
}

const FAQS = [
  {
    id: 'faq1',
    question: 'Làm sao để tạo ví / tài khoản tiền mới?',
    answer: 'Bạn vào trang chủ, chọn mục "Ví & Tài khoản" -> Bấm nút "+ Thêm tài khoản", sau đó chọn loại ví (Tiền mặt, Ngân hàng, Ví điện tử), nhập tên và số dư ban đầu để bắt đầu quản lý.',
  },
  {
    id: 'faq2',
    question: 'Tính năng quét hóa đơn tự động (AI Scan) hoạt động ra sao?',
    answer: 'Tại thanh điều hướng dưới cùng, nhấn vào biểu tượng Quét hóa đơn (giữa). Bạn có thể chụp ảnh trực tiếp hóa đơn giấy hoặc tải ảnh từ thư viện. FinAI sẽ tự động nhận diện số tiền, ngày giờ và gợi ý danh mục chi tiêu.',
  },
  {
    id: 'faq3',
    question: 'Lịch tài chính định kỳ hoạt động như thế nào?',
    answer: 'Lịch tài chính giúp bạn theo dõi các khoản thu/chi cố định như tiền lương, tiền trọ, đóng bảo hiểm, trả nợ. Hệ thống sẽ tự động gửi thông báo nhắc bạn trước ngày thanh toán và tính toán dòng tiền dự kiến theo từng tháng.',
  },
  {
    id: 'faq4',
    question: 'Làm thế nào để tạo ví dùng chung cho gia đình / nhóm?',
    answer: 'Bạn vào mục "Nhóm & Gia đình" ở thanh menu dưới, chọn "Tạo nhóm mới", đặt tên và mời các thành viên tham gia bằng mã lời mời. Các khoản chi chung sẽ được thống kê và tính toán chia tiền công bằng.',
  },
  {
    id: 'faq5',
    question: 'Dữ liệu tài chính của tôi có được bảo mật không?',
    answer: 'Toàn bộ dữ liệu của bạn được mã hóa an toàn trên hệ thống máy chủ đám mây. Bạn có thể kích hoạt Xác thực 2 bước (2FA) và khóa bảo mật trong phần "Bảo mật & Đăng nhập".',
  },
];

export function HelpCenterScreen({ onBack, onOpenAiAssistant }: HelpCenterScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'FAQ' | 'TICKETS'>('FAQ');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq1');

  // Danh sách phản hồi người dùng
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal tạo phản hồi mới
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formCategory, setFormCategory] = useState<'QUESTION' | 'BUG' | 'FEATURE' | 'OTHER'>('QUESTION');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadFeedbacks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await feedbackApi.getMyFeedbacks();
      setFeedbacks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'TICKETS') {
      loadFeedbacks();
    }
  }, [activeTab]);

  const handleSubmitFeedback = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề phản hồi.');
      return;
    }
    if (!formContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung thắc mắc / phản hồi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await feedbackApi.sendFeedback({
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
      });

      if (res.success) {
        Alert.alert('Thành công', 'Đã gửi yêu cầu hỗ trợ! Đội ngũ Finora sẽ phản hồi bạn sớm nhất.');
        setFormTitle('');
        setFormContent('');
        setFormCategory('QUESTION');
        setFormPriority('MEDIUM');
        setShowCreateModal(false);
        setActiveTab('TICKETS');
        loadFeedbacks();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể gửi phản hồi.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED') {
      return { text: 'Đã giải quyết', bg: '#ECFDF5', color: '#059669' };
    }
    if (s === 'IN_PROGRESS') {
      return { text: 'Đang xử lý', bg: '#EFF6FF', color: '#2563EB' };
    }
    if (s === 'CLOSED') {
      return { text: 'Đã đóng', bg: '#F1F5F9', color: '#64748B' };
    }
    return { text: 'Chờ phản hồi', bg: '#FFFBEB', color: '#D97706' };
  };

  const getCategoryLabel = (cat: string) => {
    switch ((cat || '').toUpperCase()) {
      case 'BUG':
        return 'Báo lỗi';
      case 'FEATURE':
        return 'Góp ý tính năng';
      case 'QUESTION':
        return 'Hỏi đáp';
      default:
        return 'Khác';
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFCFB" />

      {/* TOP HEADER */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Pressable onPress={onBack} style={styles.headerIconButton} hitSlop={12}>
          <FinanceIcon name="chevron-left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Trung tâm trợ giúp</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* TAB SELECTOR: CÂU HỎI FAQ vs YÊU CẦU HỖ TRỢ CỦA TÔI */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBarPill}>
          <Pressable
            style={[styles.tabButton, activeTab === 'FAQ' && styles.tabButtonActive]}
            onPress={() => setActiveTab('FAQ')}
          >
            <FinanceIcon name="help-circle" size={17} color={activeTab === 'FAQ' ? '#0F172A' : '#64748B'} />
            <Text style={[styles.tabButtonText, activeTab === 'FAQ' && styles.tabButtonTextActive]}>
              Câu hỏi thường gặp
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'TICKETS' && styles.tabButtonActiveDark]}
            onPress={() => setActiveTab('TICKETS')}
          >
            <FinanceIcon name="file-text" size={17} color={activeTab === 'TICKETS' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabButtonText, activeTab === 'TICKETS' && styles.tabButtonTextActiveDark]}>
              Yêu cầu của tôi
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'TICKETS' ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => loadFeedbacks(true)} />
          ) : undefined
        }
      >
        {/* TAB 1: FAQ */}
        {activeTab === 'FAQ' && (
          <View>
            {/* Banner FinAI Assistant */}
            <View style={styles.aiBannerCard}>
              <View style={styles.aiBannerIconWrap}>
                <FinanceIcon name="spark" size={24} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBannerTitle}>Hỏi đáp trực tiếp với FinAI</Text>
                <Text style={styles.aiBannerSub}>
                  Trợ lý tài chính AI luôn sẵn sàng giải đáp thắc mắc và phân tích chi tiêu cho bạn 24/7.
                </Text>
                {onOpenAiAssistant && (
                  <Pressable style={styles.aiBannerBtn} onPress={onOpenAiAssistant}>
                    <Text style={styles.aiBannerBtnText}>Trò chuyện với FinAI</Text>
                    <FinanceIcon name="arrow-right" size={14} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.sectionHeading}>Các chủ đề thường gặp</Text>

            <View style={styles.faqListWrap}>
              {FAQS.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <Pressable
                    key={faq.id}
                    style={[styles.faqCard, isExpanded && styles.faqCardActive]}
                    onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  >
                    <View style={styles.faqHeaderRow}>
                      <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
                        {faq.question}
                      </Text>
                      <FinanceIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={isExpanded ? '#047857' : '#94A3B8'}
                      />
                    </View>
                    {isExpanded && (
                      <View style={styles.faqAnswerWrap}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Hộp liên hệ hỗ trợ thêm */}
            <View style={styles.contactSupportCard}>
              <Text style={styles.contactTitle}>Bạn vẫn chưa tìm được câu trả lời?</Text>
              <Text style={styles.contactDesc}>
                Hãy gửi câu hỏi hoặc phản hồi lỗi cho ban quản trị. Chúng tôi sẽ giải đáp chi tiết cho bạn.
              </Text>
              <Pressable
                style={styles.contactBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <FinanceIcon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.contactBtnText}>Gửi câu hỏi / Phản hồi mới</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 2: YÊU CẦU CỦA TÔI */}
        {activeTab === 'TICKETS' && (
          <View>
            <View style={styles.ticketTopRow}>
              <Text style={styles.sectionHeading}>Lịch sử phản hồi ({feedbacks.length})</Text>
              <Pressable
                style={styles.newTicketPillBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <FinanceIcon name="plus" size={14} color="#047857" />
                <Text style={styles.newTicketPillText}>Tạo mới</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#047857" />
              </View>
            ) : feedbacks.length === 0 ? (
              <View style={styles.emptyWrap}>
                <FinanceIcon name="inbox" size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Chưa có yêu cầu hỗ trợ nào</Text>
                <Text style={styles.emptySub}>
                  Khi bạn gửi phản hồi hoặc báo lỗi, tiến trình xử lý và câu trả lời của admin sẽ xuất hiện tại đây.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => setShowCreateModal(true)}
                >
                  <FinanceIcon name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyActionText}>Gửi phản hồi đầu tiên</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {feedbacks.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <View key={item.id} style={styles.ticketCard}>
                      <View style={styles.ticketHeaderRow}>
                        <View style={styles.ticketCategoryPill}>
                          <Text style={styles.ticketCategoryText}>
                            {getCategoryLabel(item.category)}
                          </Text>
                        </View>
                        <View style={[styles.ticketStatusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.ticketStatusText, { color: badge.color }]}>
                            {badge.text}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.ticketTitle}>{item.title}</Text>
                      <Text style={styles.ticketContent}>{item.content}</Text>

                      {/* Phản hồi từ Ban Quản Trị nếu có */}
                      {Boolean(item.adminReply) && (
                        <View style={styles.adminReplyBox}>
                          <View style={styles.adminReplyHeader}>
                            <FinanceIcon name="shield" size={14} color="#047857" />
                            <Text style={styles.adminReplyTitle}>Phản hồi từ Admin Finora</Text>
                          </View>
                          <Text style={styles.adminReplyContent}>{item.adminReply}</Text>
                        </View>
                      )}

                      <View style={styles.ticketFooterRow}>
                        <Text style={styles.ticketDate}>
                          Gửi ngày: {item.createdAt ? item.createdAt.split('T')[0] : 'Gần đây'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL GỬI PHẢN HỒI / HỎI ĐÁP MỚI ================= */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Gửi phản hồi / Yêu cầu hỗ trợ</Text>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                hitSlop={12}
                style={styles.modalCloseBtn}
              >
                <FinanceIcon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Phân loại phản hồi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Chủ đề phản hồi *</Text>
                <View style={styles.categoryPillsRow}>
                  {[
                    { key: 'QUESTION', label: 'Hỏi đáp' },
                    { key: 'BUG', label: 'Báo lỗi app' },
                    { key: 'FEATURE', label: 'Góp ý tính năng' },
                    { key: 'OTHER', label: 'Khác' },
                  ].map((it) => (
                    <Pressable
                      key={it.key}
                      onPress={() => setFormCategory(it.key as any)}
                      style={[
                        styles.catPillBtn,
                        formCategory === it.key && styles.catPillBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          formCategory === it.key && styles.catPillTextActive,
                        ]}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Mức độ ưu tiên */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mức độ khẩn cấp</Text>
                <View style={styles.categoryPillsRow}>
                  {[
                    { key: 'LOW', label: 'Thấp' },
                    { key: 'MEDIUM', label: 'Bình thường' },
                    { key: 'HIGH', label: 'Cao' },
                    { key: 'URGENT', label: 'Khẩn cấp' },
                  ].map((it) => (
                    <Pressable
                      key={it.key}
                      onPress={() => setFormPriority(it.key as any)}
                      style={[
                        styles.catPillBtn,
                        formPriority === it.key && styles.catPillBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          formPriority === it.key && styles.catPillTextActive,
                        ]}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Tiêu đề */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tiêu đề câu hỏi / phản hồi *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Cần hỗ trợ tạo ngân sách, phản hồi tính năng..."
                  placeholderTextColor="#94A3B8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Nội dung chi tiết */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nội dung chi tiết *</Text>
                <TextInput
                  style={[styles.formInput, { height: 110, textAlignVertical: 'top' }]}
                  placeholder="Mô tả cụ thể vấn đề hoặc ý kiến đóng góp của bạn để ban quản trị hỗ trợ tốt nhất..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={formContent}
                  onChangeText={setFormContent}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Gửi phản hồi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFCFB',
    minHeight: 52,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabBarPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonActiveDark: {
    backgroundColor: '#07543F',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  tabButtonTextActiveDark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  aiBannerCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  aiBannerSub: {
    fontSize: 12.5,
    color: '#047857',
    lineHeight: 18,
    marginBottom: 10,
  },
  aiBannerBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  aiBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  faqListWrap: {
    gap: 10,
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  faqCardActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFCFB',
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 19,
  },
  faqQuestionActive: {
    color: '#047857',
  },
  faqAnswerWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqAnswerText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  contactSupportCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
  contactTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  contactDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#07543F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newTicketPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newTicketPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketCategoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  ticketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  ticketContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  adminReplyBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  adminReplyTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  adminReplyContent: {
    fontSize: 12.5,
    color: '#047857',
    lineHeight: 18,
  },
  ticketFooterRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  ticketDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#07543F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginTop: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#34463B',
    marginBottom: 6,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    backgroundColor: '#F9FBF9',
  },
  catPillBtnActive: {
    borderColor: '#07543F',
    backgroundColor: '#EAF5F0',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#07543F',
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#14251F',
  },
  modalFooter: {
    marginTop: 14,
  },
  modalSubmitBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#07543F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

