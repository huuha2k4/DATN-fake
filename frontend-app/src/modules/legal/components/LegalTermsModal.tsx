import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface LegalTermsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export function LegalTermsModal({
  visible,
  onClose,
  initialTab = 'terms',
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.titleWrap}>
              <Text style={modalStyles.icon}>📜</Text>
              <View>
                <Text style={modalStyles.title}>
                  {activeTab === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật'}
                </Text>
                <Text style={modalStyles.subtitle}>Finora Intelligence • Quản lý tài chính</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={modalStyles.closeBtn} hitSlop={12}>
              <Text style={modalStyles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Tab switch */}
          <View style={modalStyles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('terms')}
              style={[
                modalStyles.tabBtn,
                activeTab === 'terms' && modalStyles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  modalStyles.tabText,
                  activeTab === 'terms' && modalStyles.tabTextActive,
                ]}
              >
                ⚖️ Điều khoản dịch vụ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('privacy')}
              style={[
                modalStyles.tabBtn,
                activeTab === 'privacy' && modalStyles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  modalStyles.tabText,
                  activeTab === 'privacy' && modalStyles.tabTextActive,
                ]}
              >
                🛡️ Chính sách bảo mật
              </Text>
            </Pressable>
          </View>

          {/* Nội dung chi tiết */}
          <ScrollView
            style={modalStyles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'terms' ? (
              <View style={modalStyles.contentBody}>
                <View style={modalStyles.introCard}>
                  <Text style={modalStyles.introText}>
                    Bằng việc đăng ký tài khoản Finora, bạn cam kết tuân thủ các quy định sử dụng dịch vụ nhằm đảm bảo an toàn cho chính bạn và cộng đồng.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>1. Đăng ký & Bảo mật tài khoản</Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Cung cấp email hợp lệ và tự chịu trách nhiệm bảo quản mật khẩu, mã xác thực OTP.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Không chia sẻ hoặc sử dụng chung tài khoản với người khác để đảm bảo tính riêng tư của dữ liệu tài chính.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>2. Trợ lý AI FinAI & Giới hạn trách nhiệm</Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Các phân tích dòng tiền và gợi ý từ trợ lý ảo FinAI mang tính chất tham khảo dựa trên thống kê số liệu.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • FinAI không phải là tư vấn viên chứng khoán hay đầu tư tài chính được cấp phép. Quyết định chi tiêu thực tế thuộc trách nhiệm của bạn.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>3. Các hành vi nghiêm cấm</Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Nghiêm cấm dùng Finora cho các hành vi gian lận tài chính, rửa tiền, giao dịch phi pháp.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Nghiêm cấm cố ý tấn công hệ thống, khai thác lỗ hổng hoặc sao chép mã nguồn, thuật toán của nền tảng.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>4. Liên hệ hỗ trợ</Text>
                  <Text style={modalStyles.bodyText}>
                    Mọi thắc mắc về điều khoản dịch vụ xin vui lòng gửi email về:{' '}
                    <Text style={modalStyles.highlightText}>finora.3congian@gmail.com</Text>.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={modalStyles.contentBody}>
                <View style={modalStyles.introCard}>
                  <Text style={modalStyles.introText}>
                    Finora Intelligence cam kết bảo vệ dữ liệu tài chính của bạn theo quy chuẩn an ninh thông tin quốc tế.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>1. Dữ liệu thu thập</Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Thông tin cơ bản: Email, họ tên, ảnh đại diện.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Dữ liệu tài chính: Giao dịch thu/chi, ví tiền, hạn mức ngân sách, hình ảnh hóa đơn OCR.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>2. Cam kết bảo mật & Quyền riêng tư</Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Tuyệt đối không bán hoặc chia sẻ dữ liệu tài chính cá nhân cho bất kỳ bên thứ ba nào.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Mã hóa đầu cuối TLS 1.3 / SSL 256-bit và mật khẩu băm chuẩn bcrypt có Salt.
                  </Text>
                  <Text style={modalStyles.bulletPoint}>
                    • Bạn có toàn quyền trích xuất hoặc xóa sạch tài khoản và dữ liệu vĩnh viễn khỏi hệ thống bất kỳ lúc nào.
                  </Text>
                </View>

                <View style={modalStyles.secCard}>
                  <Text style={modalStyles.secHeading}>3. Email liên hệ hỗ trợ</Text>
                  <Text style={modalStyles.bodyText}>
                    Email chính thức:{' '}
                    <Text style={modalStyles.highlightText}>finora.3congian@gmail.com</Text>.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Button */}
          <View style={modalStyles.footer}>
            <Pressable onPress={onClose} style={modalStyles.confirmBtn}>
              <Text style={modalStyles.confirmBtnText}>Tôi đã hiểu & đồng ý</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f3',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12251f',
  },
  subtitle: {
    fontSize: 12,
    color: '#69756f',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f3',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#69756f',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#006747',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#006747',
    fontWeight: '700',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  contentBody: {
    paddingBottom: 14,
  },
  introCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  introText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  secCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  secHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#12251f',
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
  },
  highlightText: {
    color: '#006747',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  confirmBtn: {
    backgroundColor: '#006747',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

