import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanCardItem {
  id: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  name: string;
  tagline: string;
  badge?: string;
  price: number;
  popular?: boolean;
  features: PlanFeature[];
}

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
  currentTier?: string;
  onSelectPlan?: (planId: string) => void;
}

export function PricingModal({
  visible,
  onClose,
  currentTier = 'FREE',
  onSelectPlan,
}: PricingModalProps) {
  const insets = useSafeAreaInsets();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const premiumMonthly = 49000;
  const enterpriseMonthly = 199000;

  const plans: PlanCardItem[] = [
    {
      id: 'FREE',
      name: 'Khởi Đầu (Free)',
      tagline: 'Dành cho cá nhân bắt đầu ghi chép và kiểm soát chi tiêu đơn giản.',
      price: 0,
      features: [
        { text: 'Tối đa 3 ví tài khoản cá nhân', included: true },
        { text: 'Quét 10 hóa đơn OCR mỗi tháng', included: true },
        { text: 'Ghi chép thu chi & phân loại tự động', included: true },
        { text: 'Báo cáo tài chính cơ bản', included: true },
        { text: 'FinAI Trợ lý tài chính nâng cao', included: false },
        { text: 'Dự báo dòng tiền tương lai', included: false },
        { text: 'Không giới hạn tạo nhóm chi tiêu', included: false },
      ],
    },
    {
      id: 'PREMIUM',
      name: 'Cá Nhân (Premium)',
      tagline: 'Lựa chọn số 1 để làm chủ tài chính thông minh cùng trí tuệ nhân tạo.',
      badge: 'Khuyên Dùng ★',
      popular: true,
      price: Math.round(premiumMonthly * (billingCycle === 'yearly' ? 10 : 1)),
      features: [
        { text: 'Không giới hạn số lượng ví & tài khoản ngân hàng', included: true, highlight: true },
        { text: 'Quét 100 hóa đơn OCR thông minh mỗi tháng', included: true, highlight: true },
        { text: 'FinAI Cố vấn tài chính chuyên sâu 24/7', included: true, highlight: true },
        { text: 'Dự báo tài chính & xu hướng chi tiêu tương lai', included: true },
        { text: 'Xuất báo cáo PDF, Excel chi tiết không giới hạn', included: true },
        { text: 'Quản lý vay nợ & nhắc lịch trả nợ tự động', included: true },
        { text: 'Hỗ trợ ưu tiên từ chuyên viên Finora', included: true },
      ],
    },
    {
      id: 'ENTERPRISE',
      name: 'Gia Đình & Nhóm (VIP)',
      tagline: 'Giải pháp trọn gói hoàn hảo cho gia đình, nhóm bạn hoặc tổ chức.',
      badge: 'Đặc Quyền VIP',
      price: Math.round(enterpriseMonthly * (billingCycle === 'yearly' ? 10 : 1)),
      features: [
        { text: 'Mọi quyền lợi vượt trội của gói Premium', included: true },
        { text: 'Không giới hạn quét hóa đơn OCR', included: true, highlight: true },
        { text: 'Không giới hạn số lượng quỹ nhóm & thành viên', included: true, highlight: true },
        { text: 'Ví trẻ em & nhiệm vụ việc nhà nhận tiền tiêu vặt', included: true },
        { text: 'Phân tích tài chính liên tài khoản chuyên sâu', included: true },
        { text: 'Kênh hỗ trợ kỹ thuật VIP 1-1 riêng biệt', included: true },
      ],
    },
  ];

  const handleChoosePlan = (plan: PlanCardItem) => {
    if (plan.id === currentTier) {
      Alert.alert('Thông báo', 'Bạn hiện đang sử dụng gói dịch vụ này!');
      return;
    }

    setProcessingPlanId(plan.id);
    setTimeout(() => {
      setProcessingPlanId(null);
      Alert.alert(
        'Đăng ký thành công',
        `Hệ thống đã ghi nhận yêu cầu nâng cấp lên gói ${plan.name}. Vui lòng hoàn tất thanh toán để kích hoạt!`,
        [
          {
            text: 'Đồng ý',
            onPress: () => {
              if (onSelectPlan) onSelectPlan(plan.id);
              onClose();
            },
          },
        ]
      );
    }, 600);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.modalScreen, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        {/* Header với nút đóng */}
        <View style={styles.topHeaderBar}>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.closeBtn, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
            <FinanceIcon name="chevron-left" size={18} color="#074838" />
            <Text style={styles.closeBtnText}>Quay lại</Text>
          </Pressable>
          <Text style={styles.topHeaderTitle}>Gói hội viên Finora</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
        >
          {/* Banner giới thiệu */}
          <View style={styles.heroSection}>
            <View style={styles.badgePill}>
              <FinanceIcon name="spark" size={13} color="#059669" />
              <Text style={styles.badgePillText}>BẢNG GIÁ DỊCH VỤ FINORA INTELLIGENCE</Text>
            </View>
            <Text style={styles.heroTitle}>Đầu Tư Xứng Đáng Cho Tương Lai Tài Chính Của Bạn</Text>
            <Text style={styles.heroDesc}>
              Linh hoạt nâng cấp hoặc thay đổi gói cước bất kỳ lúc nào. Không ràng buộc, minh bạch chi phí 100%.
            </Text>

            {/* Switch Hàng tháng / Hàng năm */}
            <View style={styles.switchWrapper}>
              <Pressable
                onPress={() => setBillingCycle('monthly')}
                style={[styles.switchTab, billingCycle === 'monthly' && styles.switchTabActive]}
              >
                <Text
                  style={[
                    styles.switchTabText,
                    billingCycle === 'monthly' && styles.switchTabTextActive,
                  ]}
                >
                  Hàng tháng
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBillingCycle('yearly')}
                style={[styles.switchTab, billingCycle === 'yearly' && styles.switchTabActive]}
              >
                <Text
                  style={[
                    styles.switchTabText,
                    billingCycle === 'yearly' && styles.switchTabTextActive,
                  ]}
                >
                  Hàng năm
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>-15%</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Danh sách 3 Gói Card */}
          <View style={styles.planCardList}>
            {plans.map((plan) => {
              const isCurrent = plan.id === currentTier;
              const isPopular = plan.popular;

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isPopular && styles.planCardPopular,
                    isCurrent && styles.planCardCurrent,
                  ]}
                >
                  {/* Top Badge */}
                  {plan.badge && (
                    <View
                      style={[
                        styles.planBadgeWrap,
                        isPopular ? { backgroundColor: '#074838' } : { backgroundColor: '#7C3AED' },
                      ]}
                    >
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}

                  <Text style={styles.planNameText}>{plan.name}</Text>
                  <Text style={styles.planTaglineText}>{plan.tagline}</Text>

                  {/* Giá tiền */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmountText}>
                      {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')} ₫`}
                    </Text>
                    {plan.price > 0 && (
                      <Text style={styles.pricePeriodText}>
                        {billingCycle === 'yearly' ? '/năm' : '/tháng'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.dividerLine} />

                  {/* Danh sách tính năng */}
                  <View style={styles.featuresList}>
                    {plan.features.map((feat, idx) => (
                      <View key={idx} style={styles.featureItemRow}>
                        <View
                          style={[
                            styles.featureIconWrap,
                            feat.included
                              ? { backgroundColor: '#E8F8F0' }
                              : { backgroundColor: '#F1F5F9' },
                          ]}
                        >
                          <FinanceIcon
                            name={feat.included ? 'check' : 'close'}
                            size={12}
                            color={feat.included ? '#059669' : '#94A3B8'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.featureItemText,
                            !feat.included && styles.featureExcludedText,
                            feat.highlight && styles.featureHighlightText,
                          ]}
                        >
                          {feat.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Nút hành động */}
                  <Pressable
                    onPress={() => handleChoosePlan(plan)}
                    disabled={isCurrent || processingPlanId === plan.id}
                    style={({ pressed }) => [
                      styles.planActionBtn,
                      isCurrent
                        ? styles.btnCurrentPlan
                        : isPopular
                        ? styles.btnPrimaryPlan
                        : styles.btnSecondaryPlan,
                      pressed && styles.pressed,
                    ]}
                  >
                    {processingPlanId === plan.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.planActionBtnText,
                          isCurrent
                            ? styles.btnCurrentPlanText
                            : isPopular
                            ? styles.btnPrimaryPlanText
                            : styles.btnSecondaryPlanText,
                        ]}
                      >
                        {isCurrent
                          ? 'Gói hiện tại của bạn'
                          : isPopular
                          ? 'Nâng cấp Premium ngay'
                          : plan.id === 'ENTERPRISE'
                          ? 'Trải nghiệm VIP'
                          : 'Dùng gói Cơ bản'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#074838',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 18,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8F0',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 10,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  switchWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
  },
  switchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
  },
  switchTabActive: {
    backgroundColor: '#074838',
  },
  switchTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  switchTabTextActive: {
    color: '#FFFFFF',
  },
  saveBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planCardList: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#FAFCFA',
  },
  planCardCurrent: {
    borderColor: '#38BDF8',
  },
  planBadgeWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  planTaglineText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  priceAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  pricePeriodText: {
    fontSize: 12.5,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  featuresList: {
    gap: 10,
    marginBottom: 20,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureItemText: {
    fontSize: 12.5,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  featureExcludedText: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  featureHighlightText: {
    fontWeight: '800',
    color: '#065F46',
  },
  planActionBtn: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryPlan: {
    backgroundColor: '#074838',
  },
  btnPrimaryPlanText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnSecondaryPlan: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnSecondaryPlanText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13.5,
  },
  btnCurrentPlan: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  btnCurrentPlanText: {
    color: '#0284C7',
    fontWeight: '800',
    fontSize: 13.5,
  },
  planActionBtnText: {
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

