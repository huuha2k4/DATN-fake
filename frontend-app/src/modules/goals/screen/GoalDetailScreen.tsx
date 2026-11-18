import { AppAlert as Alert, useAppDialog } from '../../../context/DialogContext';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  goalsApi,
  GoalDetailData,
  ContributionHistoryItem,
  fallbackGoalDetail,
} from '../api/goalsApi';
import { EditGoalModal } from './EditGoalModal';
import { ContributeGoalModal } from './ContributeGoalModal';
import { WithdrawGoalModal } from './WithdrawGoalModal';
import { useAppTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

type Props = {
  goalId?: string;
  onBack: () => void;
};

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

function getGoalCategoryIcon(iconKey?: string, categoryName?: string, isSaving?: boolean) {
  const key = (iconKey || categoryName || '').toLowerCase();
  if (isSaving || key.includes('saving') || key.includes('tiết kiệm') || key.includes('dự phòng')) {
    if (key.includes('emergency') || key.includes('khẩn cấp') || key.includes('dự phòng')) {
      return require('../../../assets/icons/saving_cat_emergency_3d.png');
    }
    if (key.includes('term') || key.includes('kỳ hạn') || key.includes('kì hạn')) {
      return require('../../../assets/icons/saving_cat_term_3d.png');
    }
    if (key.includes('longterm') || key.includes('dài hạn')) {
      return require('../../../assets/icons/saving_cat_longterm_3d.png');
    }
    if (key.includes('other') || key.includes('khác')) {
      return require('../../../assets/icons/saving_cat_other_3d.png');
    }
    return require('../../../assets/icons/saving_cat_free_3d.png');
  }

  if (key.includes('travel') || key.includes('du lịch') || key.includes('plane')) {
    return require('../../../assets/icons/goal_cat_travel_3d.png');
  }
  if (key.includes('education') || key.includes('học tập') || key.includes('cap')) {
    return require('../../../assets/icons/goal_cat_education_3d.png');
  }
  if (key.includes('investment') || key.includes('đầu tư')) {
    return require('../../../assets/icons/goal_cat_investment_3d.png');
  }
  if (key.includes('debt') || key.includes('nợ') || key.includes('thanh toán')) {
    return require('../../../assets/icons/goal_cat_debt_3d.png');
  }
  if (key.includes('family') || key.includes('gia đình')) {
    return require('../../../assets/icons/goal_cat_family_3d.png');
  }
  if (key.includes('other') || key.includes('khác')) {
    return require('../../../assets/icons/goal_cat_other_3d.png');
  }
  // Mua sắm lớn (laptop, điện thoại, xe máy...)
  return require('../../../assets/icons/goal_cat_shopping_3d.png');
}

export function GoalDetailScreen({ goalId, onBack }: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [goal, setGoal] = useState<GoalDetailData>(fallbackGoalDetail);
  const [selectedContribution, setSelectedContribution] = useState<ContributionHistoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await goalsApi.getGoalDetail(goalId || 'default');
      setGoal(data);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [goalId]);

  const handleAddSavings = () => {
    setShowContributeModal(true);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa mục tiêu',
      'Bạn có chắc chắn muốn xóa mục tiêu này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const ok = await goalsApi.deleteGoal(goal.id);
            if (ok) {
              Alert.alert('Thành công', 'Đã xóa mục tiêu tài chính.');
            }
            onBack();
          },
        },
      ]
    );
  };

  // SVG Gauge calculations
  // Center (75, 75), radius = 56, strokeWidth = 11
  // Start: 135 deg (bottom-left) -> End: 45 deg (bottom-right)
  // Arc length = 2 * PI * 56 * (270 / 360) = 263.89
  const totalArcLen = 263.89;
  const pctRatio = Math.min(1, Math.max(0, goal.percentage / 100));
  const strokeDashoffset = totalArcLen * (1 - pctRatio);

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? themeColors.background : '#F7FBF9'}
      />

      {/* TOP HEADER */}
      <View style={[styles.topHeader, isDark && { backgroundColor: themeColors.background }]}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={[styles.backBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <FinanceIcon name="chevron-left" size={24} color={isDark ? themeColors.accentGreen : '#006747'} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>
          {goal.isSaving ? 'Chi tiết khoản tiết kiệm' : 'Chi tiết mục tiêu'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contentScroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: THÔNG TIN KHOẢN TIẾT KIỆM (Loại mục tiêu ngang hàng với tên ở cuối) */}
        <View style={[styles.card, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={styles.topInfoRow}>
            {/* 3D CATEGORY ICON */}
            <View style={styles.iconPiggyBox}>
              <Image
                source={getGoalCategoryIcon(goal.icon, goal.category || goal.title, goal.isSaving)}
                style={styles.iconPiggyImg}
                resizeMode="contain"
              />
            </View>

            {/* TEXT INFO */}
            <View style={styles.topTextCol}>
              <View style={styles.titleCategoryRow}>
                <Text style={[styles.goalTitle, isDark && { color: themeColors.textPrimary }]} numberOfLines={2}>{goal.title}</Text>
                
                {/* Loại mục tiêu / loại tiết kiệm đưa lên ngang hàng ở cuối */}
                <View style={[styles.tagPillInline, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)' }]}>
                  <FinanceIcon name={goal.isSaving ? 'wallet' : 'target'} size={12} color={isDark ? themeColors.accentGreen : '#16A34A'} />
                  <Text style={[styles.tagPillInlineText, isDark && { color: themeColors.accentGreen }]}>{goal.category || (goal.isSaving ? 'Tiết kiệm' : 'Mục tiêu')}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={[styles.descriptionText, isDark && { color: themeColors.textSecondary }]}>
                {goal.description || (goal.isSaving ? 'Tích lũy tài chính tự do, linh hoạt rút nộp khi cần.' : 'Dành tiền để mua sắm và tiết kiệm phục vụ kế hoạch tương lai.')}
              </Text>
            </View>
          </View>
        </View>

        {/* CARD 2: TIẾN ĐỘ TIẾT KIỆM VỚI ĐỒ THỊ VÒNG CUNG GAUGE & 3 CHỈ SỐ */}
        <View style={[styles.card, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={styles.progressHeaderRow}>
            <Text style={[styles.cardSectionTitle, isDark && { color: themeColors.textPrimary }]}>Tiến độ tiết kiệm</Text>
            <Text style={[styles.progressPctText, isDark && { color: themeColors.accentGreen }]}>{goal.percentage.toFixed(1).replace('.', ',')}%</Text>
          </View>

          {/* Body: Left Gauge Arc + Right 3 Stats */}
          <View style={styles.progressBodyRow}>
            {/* Left Circular Gauge */}
            <View style={styles.gaugeContainer}>
              <Svg width={150} height={150} viewBox="0 0 150 150">
                {/* Background Track */}
                <Path
                  d="M 35.4 114.6 A 56 56 0 1 1 114.6 114.6"
                  fill="none"
                  stroke={isDark ? themeColors.surfaceSubtle : '#E2E8F0'}
                  strokeWidth={11}
                  strokeLinecap="round"
                />
                {/* Active Progress Track */}
                <Path
                  d="M 35.4 114.6 A 56 56 0 1 1 114.6 114.6"
                  fill="none"
                  stroke={isDark ? themeColors.accentGreen : '#006747'}
                  strokeWidth={11}
                  strokeLinecap="round"
                  strokeDasharray={`${totalArcLen}`}
                  strokeDashoffset={strokeDashoffset}
                />
              </Svg>

              {/* Inside Gauge Center Content */}
              <View style={styles.gaugeCenterOverlay}>
                <Image
                  source={require('../../../assets/icons/gauge_pouch_icon.png')}
                  style={styles.pouchIconImg}
                  resizeMode="contain"
                />
                <Text style={[styles.gaugeCurrentAmountText, isDark && { color: themeColors.textPrimary }]}>{formatVND(goal.currentAmount)}</Text>
                <Text style={[styles.gaugeTargetSubText, isDark && { color: themeColors.textMuted }]}>/ {formatVND(goal.targetAmount)}</Text>
              </View>
            </View>

            {/* Right 3 Metric Items */}
            <View style={styles.metricsCol}>
              {/* 1. Mục tiêu */}
              <View style={styles.metricItemRow}>
                <View style={[styles.metricIconSquircle, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <FinanceIcon name="target" size={17} color={isDark ? themeColors.accentGreen : '#006747'} />
                </View>
                <View style={styles.metricTextCol}>
                  <Text style={[styles.metricLabel, isDark && { color: themeColors.textMuted }]}>Mục tiêu</Text>
                  <Text style={[styles.metricValueBold, isDark && { color: themeColors.textPrimary }]}>{formatVND(goal.targetAmount)}</Text>
                </View>
              </View>

              {/* 2. Đã tiết kiệm */}
              <View style={styles.metricItemRow}>
                <View style={[styles.metricIconSquircle, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <FinanceIcon name="wallet" size={17} color={isDark ? themeColors.accentGreen : '#006747'} />
                </View>
                <View style={styles.metricTextCol}>
                  <Text style={[styles.metricLabel, isDark && { color: themeColors.textMuted }]}>Đã tiết kiệm</Text>
                  <Text style={[styles.metricValueGreen, isDark && { color: themeColors.accentGreen }]}>{formatVND(goal.currentAmount)}</Text>
                </View>
              </View>

              {/* 3. Còn thiếu */}
              <View style={styles.metricItemRow}>
                <View style={[styles.metricIconSquircle, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <FinanceIcon name="chart" size={17} color={isDark ? themeColors.accentGreen : '#006747'} />
                </View>
                <View style={styles.metricTextCol}>
                  <Text style={[styles.metricLabel, isDark && { color: themeColors.textMuted }]}>Còn thiếu</Text>
                  <Text style={[styles.metricValueBold, isDark && { color: themeColors.textPrimary }]}>{formatVND(goal.additionalNeeded)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* CARD 3: THỜI HẠN & TẦN SUẤT ĐÓNG GÓP (2 CỘT TÁCH BIỆT) */}
        <View style={styles.twoColsRow}>
          {/* Cột 1: Thời hạn */}
          <View style={[styles.colCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
            <View style={[styles.colIconBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
              <FinanceIcon name="calendar" size={19} color={isDark ? themeColors.accentGreen : '#006747'} />
            </View>
            <View style={styles.colTextCol}>
              <Text style={[styles.colLabel, isDark && { color: themeColors.textMuted }]}>Thời hạn</Text>
              <Text style={[styles.colValue, isDark && { color: themeColors.textPrimary }]}>{goal.deadline || '30/04/2027'}</Text>
              <Text style={[styles.colSubGreen, isDark && { color: themeColors.accentGreen }]}>Còn {goal.daysRemaining ?? 173} ngày</Text>
            </View>
          </View>

          {/* Cột 2: Tần suất đóng góp */}
          <View style={[styles.colCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
            <View style={[styles.colIconBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
              <FinanceIcon name="calendar" size={19} color={isDark ? themeColors.accentGreen : '#006747'} />
            </View>
            <View style={styles.colTextCol}>
              <Text style={[styles.colLabel, isDark && { color: themeColors.textMuted }]}>Tần suất đóng góp</Text>
              <Text style={[styles.colValue, isDark && { color: themeColors.textPrimary }]}>{goal.frequency || 'Hàng tháng'}</Text>
            </View>
          </View>
        </View>

        {/* CỤM NÚT THAO TÁC: NẠP THÊM / RÚT TIỀN + 2 NÚT CHỈNH SỬA & XÓA */}
        <View style={styles.actionButtonGroup}>
          {/* HÀNG 2 NÚT CHÍNH: NẠP TIỀN & RÚT TIỀN */}
          <View style={styles.mainActionRow}>
            {/* PRIMARY BUTTON: + NẠP THÊM TIẾT KIỆM */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryActionBtn,
                styles.mainActionBtnHalf,
                isDark && { backgroundColor: '#059669', shadowColor: '#059669' },
                pressed && { opacity: 0.9 },
              ]}
              onPress={handleAddSavings}
            >
              <FinanceIcon name="plus" size={17} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Nạp thêm</Text>
            </Pressable>

            {/* WITHDRAW BUTTON: RÚT TIỀN */}
            <Pressable
              style={({ pressed }) => [
                styles.withdrawActionBtn,
                styles.mainActionBtnHalf,
                isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => setShowWithdrawModal(true)}
            >
              <View style={[styles.withdrawIconSquircle, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <FinanceIcon name="arrow-up" size={15} color="#EF4444" />
              </View>
              <Text style={[styles.withdrawActionBtnText, isDark && { color: '#F87171' }]}>Rút tiền</Text>
            </Pressable>
          </View>

          {/* 2 NÚT CHỈNH SỬA VÀ XÓA MỤC TIÊU NGAY DƯỚI */}
          <View style={styles.secondaryActionRow}>
            {/* Chỉnh sửa */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                styles.editBtn,
                isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleEdit}
            >
              <FinanceIcon name="edit" size={16} color={isDark ? themeColors.accentGreen : '#006747'} />
              <Text style={[styles.editBtnText, isDark && { color: themeColors.accentGreen }]}>Chỉnh sửa</Text>
            </Pressable>

            {/* Xóa mục tiêu */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                styles.deleteBtn,
                isDark && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleDelete}
            >
              <FinanceIcon name="trash" size={16} color="#EF4444" />
              <Text style={[styles.deleteBtnText, isDark && { color: '#F87171' }]}>Xóa mục tiêu</Text>
            </Pressable>
          </View>
        </View>

        {/* CARD 4: LỊCH SỬ ĐÓNG GÓP */}
        <View style={[styles.card, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={styles.historyHeaderRow}>
            <View style={styles.historyTitleWrap}>
              <FinanceIcon name="file-text" size={18} color={isDark ? themeColors.accentGreen : '#006747'} />
              <Text style={[styles.cardSectionTitle, isDark && { color: themeColors.textPrimary }]}>Lịch sử đóng góp</Text>
            </View>
          </View>

          {/* History Item List */}
          <View style={styles.historyList}>
            {goal.history.map((hist, index) => {
              const isWithdraw = hist.type === 'withdraw';
              return (
                <Pressable
                  key={hist.id}
                  style={({ pressed }) => [
                    styles.historyItemRowWrap,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setSelectedContribution(hist)}
                >
                  <View style={styles.historyItemRow}>
                    {/* Circle icon */}
                    <View
                      style={[
                        styles.historyIconCircle,
                        isDark && { backgroundColor: 'rgba(52, 211, 153, 0.16)' },
                        isWithdraw && (isDark ? { backgroundColor: 'rgba(239, 68, 68, 0.2)' } : styles.historyIconCircleWithdraw),
                      ]}
                    >
                      <FinanceIcon
                        name={isWithdraw ? 'arrow-up' : 'arrow-down'}
                        size={15}
                        color={isWithdraw ? '#EF4444' : (isDark ? themeColors.accentGreen : '#006747')}
                      />
                    </View>

                    <View style={styles.historyInfoCol}>
                      <Text style={[styles.historyItemTitle, isDark && { color: themeColors.textPrimary }]}>{hist.title}</Text>
                      <Text style={[styles.historyItemDate, isDark && { color: themeColors.textMuted }]}>{hist.date}</Text>
                    </View>

                    <View style={styles.historyRightCol}>
                      <Text
                        style={[
                          styles.historyAmountText,
                          isDark && { color: themeColors.accentGreen },
                          isWithdraw && (isDark ? { color: '#F87171' } : styles.historyAmountTextWithdraw),
                        ]}
                      >
                        {isWithdraw ? '-' : '+'}{formatVND(hist.amount)}
                      </Text>
                      <FinanceIcon name="chevron-right" size={13} color={isDark ? themeColors.textSecondary : '#94A3B8'} />
                    </View>
                  </View>

                  {index < goal.history.length - 1 && (
                    <View style={[styles.historyDivider, isDark && { backgroundColor: themeColors.divider }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* MODAL XEM CHI TIẾT KHOẢN ĐÓNG / RÚT TIỀN */}
      <Modal
        visible={!!selectedContribution}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedContribution(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedContribution(null)}
        >
          <Pressable
            style={[styles.modalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
              <Text style={[styles.modalHeaderTitle, isDark && { color: themeColors.textPrimary }]}>Chi tiết giao dịch</Text>
              <Pressable
                onPress={() => setSelectedContribution(null)}
                hitSlop={10}
                style={[styles.modalCloseBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
              >
                <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : '#64748B'} />
              </Pressable>
            </View>

            {selectedContribution && (
              <View style={styles.modalBody}>
                {/* Amount Highlight */}
                <View style={[styles.modalAmountBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
                  <Text style={[styles.modalAmountLabel, isDark && { color: themeColors.textMuted }]}>
                    {selectedContribution.type === 'withdraw' ? 'Số tiền đã rút' : 'Số tiền đã đóng góp'}
                  </Text>
                  <Text
                    style={[
                      styles.modalAmountValue,
                      selectedContribution.type === 'withdraw'
                        ? (isDark ? { color: '#F87171' } : styles.modalAmountValueWithdraw)
                        : (isDark ? { color: themeColors.accentGreen } : styles.modalAmountValueDeposit),
                    ]}
                  >
                    {selectedContribution.type === 'withdraw' ? '-' : '+'}
                    {formatVND(selectedContribution.amount)}
                  </Text>
                </View>

                {/* Detail info rows */}
                <View style={styles.modalDetailRows}>
                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailKey, isDark && { color: themeColors.textMuted }]}>Loại giao dịch</Text>
                    <Text style={[styles.modalDetailValBold, isDark && { color: themeColors.textPrimary }]}>
                      {selectedContribution.type === 'withdraw' ? 'Rút tiền từ mục tiêu' : 'Nộp tiền vào mục tiêu'}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailKey, isDark && { color: themeColors.textMuted }]}>Thời gian</Text>
                    <Text style={[styles.modalDetailVal, isDark && { color: themeColors.textPrimary }]}>{selectedContribution.date}</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailKey, isDark && { color: themeColors.textMuted }]}>Mục tiêu</Text>
                    <Text style={[styles.modalDetailVal, isDark && { color: themeColors.textPrimary }]}>{goal.title}</Text>
                  </View>

                  {selectedContribution.accountName && (
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailKey, isDark && { color: themeColors.textMuted }]}>Tài khoản trích</Text>
                      <Text style={[styles.modalDetailVal, isDark && { color: themeColors.textPrimary }]}>{selectedContribution.accountName}</Text>
                    </View>
                  )}

                  {selectedContribution.note && (
                    <View style={styles.modalDetailRow}>
                      <Text style={[styles.modalDetailKey, isDark && { color: themeColors.textMuted }]}>Ghi chú</Text>
                      <Text style={[styles.modalDetailVal, isDark && { color: themeColors.textPrimary }]}>{selectedContribution.note}</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={[styles.modalConfirmBtn, isDark && { backgroundColor: '#059669' }]}
                  onPress={() => setSelectedContribution(null)}
                >
                  <Text style={styles.modalConfirmBtnText}>Đóng</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL CHỈNH SỬA MỤC TIÊU */}
      <EditGoalModal
        visible={showEditModal}
        goal={goal}
        onClose={() => setShowEditModal(false)}
        onSuccess={loadData}
      />

      {/* MODAL NỘP TIỀN VÀO MỤC TIÊU */}
      <ContributeGoalModal
        visible={showContributeModal}
        goalId={goal.id}
        goalTitle={goal.title}
        onClose={() => setShowContributeModal(false)}
        onSuccess={loadData}
      />

      {/* MODAL RÚT TIỀN TỪ MỤC TIÊU */}
      <WithdrawGoalModal
        visible={showWithdrawModal}
        goalId={goal.id}
        goalTitle={goal.title}
        maxAmount={goal.currentAmount}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAF9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },

  /* Card container */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },

  /* Top info card */
  /* Saving Balance Card styling */
  savingBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savingBalanceLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  savingBalanceAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#006747',
  },
  savingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  savingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  savingSubHint: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },

  topInfoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  iconPiggyBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconPiggyImg: {
    width: 66,
    height: 66,
  },
  topTextCol: {
    flex: 1,
  },
  titleCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  tagPillInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  tagPillInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  descriptionText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },

  /* Progress section */
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressPctText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006747',
  },

  progressBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  /* Left Gauge Arc */
  gaugeContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeCenterOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 34,
  },
  pouchIconImg: {
    width: 25,
    height: 28,
    marginBottom: 4,
  },
  gaugeCurrentAmountText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  gaugeTargetSubText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },

  /* Right 3 Metrics */
  metricsCol: {
    flex: 1,
    paddingLeft: 12,
    gap: 12,
  },
  metricItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 1,
  },
  metricValueBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricValueGreen: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#006747',
  },

  /* Two cols row (Thời hạn & Tần suất) */
  twoColsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  colIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colTextCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  colValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  colSubGreen: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 2,
  },

  /* Action Buttons Group */
  actionButtonGroup: {
    gap: 10,
    marginTop: 2,
  },
  mainActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mainActionBtnHalf: {
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006747',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#006747',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  withdrawIconSquircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  editBtn: {
    backgroundColor: '#DCFCE7',
  },
  editBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#006747',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* History Card */
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyList: {
    gap: 6,
  },
  historyItemRowWrap: {},
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 12,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconCircleWithdraw: {
    backgroundColor: '#FEE2E2',
  },
  historyInfoCol: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: 11,
    color: '#64748B',
  },
  historyRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyAmountText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#006747',
  },
  historyAmountTextWithdraw: {
    color: '#DC2626',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 6,
  },

  /* Modal Details */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 16,
  },
  modalAmountBox: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAmountLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  modalAmountValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalAmountValueDeposit: {
    color: '#006747',
  },
  modalAmountValueWithdraw: {
    color: '#DC2626',
  },
  modalDetailRows: {
    gap: 12,
    paddingHorizontal: 4,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDetailKey: {
    fontSize: 13,
    color: '#64748B',
  },
  modalDetailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalDetailValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalConfirmBtn: {
    backgroundColor: '#006747',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
