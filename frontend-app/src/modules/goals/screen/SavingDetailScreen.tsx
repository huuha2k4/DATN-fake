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
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  goalsApi,
  GoalDetailData,
  ContributionHistoryItem,
} from '../api/goalsApi';
import { ContributeGoalModal } from './ContributeGoalModal';
import { EditSavingModal } from './EditSavingModal';
import { WithdrawGoalModal } from './WithdrawGoalModal';

const { width } = Dimensions.get('window');

type Props = {
  savingId: string;
  onBack: () => void;
};

function formatVND(amount: number): string {
  return Math.round(amount || 0).toLocaleString('vi-VN') + ' đ';
}

function getSavingCategoryIcon(iconKey?: string, categoryName?: string) {
  const key = (iconKey || categoryName || '').toLowerCase();
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

export function SavingDetailScreen({ savingId, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState<GoalDetailData | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<ContributionHistoryItem | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await goalsApi.getGoalDetail(savingId);
      setSaving(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [savingId]);

  const handleDelete = () => {
    if (!saving) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa khoản tiết kiệm "${saving.title}" không? Toàn bộ lịch sử đóng góp sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const ok = await goalsApi.deleteGoal(saving.id);
            if (ok) {
              Alert.alert('Thành công', 'Đã xóa khoản tiết kiệm.');
            }
            onBack();
          },
        },
      ]
    );
  };

  if (isLoading || !saving) {
    return (
      <View style={[styles.screen, styles.centerWrap]}>
        <ActivityIndicator size="large" color="#006747" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar barStyle="dark-content" />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <FinanceIcon name="chevron-left" size={24} color="#006747" />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết khoản tiết kiệm</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contentScroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: THÔNG TIN KHOẢN TIẾT KIỆM (Loại tiết kiệm ngang hàng với tên ở cuối) */}
        <View style={styles.card}>
          <View style={styles.topInfoRow}>
            {/* 3D CATEGORY ICON */}
            <View style={styles.icon3dBox}>
              <Image
                source={getSavingCategoryIcon(saving.icon, saving.category || saving.title)}
                style={styles.icon3dImg}
                resizeMode="contain"
              />
            </View>

            {/* TEXT INFO */}
            <View style={styles.topTextCol}>
              <View style={styles.titleCategoryRow}>
                <Text style={styles.savingTitle} numberOfLines={2}>
                  {saving.title}
                </Text>
                
                {/* Loại tiết kiệm đưa lên ngang hàng ở cuối */}
                <View style={styles.tagPillInline}>
                  <FinanceIcon name="wallet" size={12} color="#16A34A" />
                  <Text style={styles.tagPillInlineText}>
                    {saving.category || 'Tiết kiệm'}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.descriptionText}>
                {saving.description || 'Tích lũy tài chính tự do, linh hoạt rút nộp khi cần.'}
              </Text>
            </View>
          </View>
        </View>

        {/* CARD 2: TỔNG SỐ TIỀN TIẾT KIỆM HIỆN CÓ (KHÔNG CÓ MỤC TIÊU HAY THỜI HẠN) */}
        <View style={styles.card}>
          <View style={styles.balanceHeaderRow}>
            <View>
              <Text style={styles.balanceLabel}>Tổng số tiền đã tích lũy</Text>
              <Text style={styles.balanceAmountText}>{formatVND(saving.currentAmount)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <FinanceIcon name="check-circle" size={14} color="#16A34A" />
              <Text style={styles.statusBadgeText}>Đang tích lũy</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statInfoRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconSquircle}>
                <FinanceIcon name="calendar" size={16} color="#006747" />
              </View>
              <View>
                <Text style={styles.statItemLabel}>Hình thức</Text>
                <Text style={styles.statItemValue}>Linh hoạt tự do</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconSquircle}>
                <FinanceIcon name="file-text" size={16} color="#006747" />
              </View>
              <View>
                <Text style={styles.statItemLabel}>Giao dịch</Text>
                <Text style={styles.statItemValue}>{saving.history?.length || 0} lần nộp/rút</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CỤM NÚT THAO TÁC: NỘP TIỀN / RÚT TIỀN + 2 NÚT CHỈNH SỬA & XÓA */}
        <View style={styles.actionButtonGroup}>
          {/* HÀNG 2 NÚT CHÍNH: NỘP TIỀN & RÚT TIỀN */}
          <View style={styles.mainActionRow}>
            {/* PRIMARY BUTTON: + NỘP THÊM TIẾT KIỆM */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryActionBtn,
                styles.mainActionBtnHalf,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => setShowContributeModal(true)}
            >
              <FinanceIcon name="plus" size={17} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Nộp thêm</Text>
            </Pressable>

            {/* WITHDRAW BUTTON: RÚT TIỀN */}
            <Pressable
              style={({ pressed }) => [
                styles.withdrawActionBtn,
                styles.mainActionBtnHalf,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => setShowWithdrawModal(true)}
            >
              <View style={styles.withdrawIconSquircle}>
                <FinanceIcon name="arrow-up" size={15} color="#DC2626" />
              </View>
              <Text style={styles.withdrawActionBtnText}>Rút tiền</Text>
            </Pressable>
          </View>

          {/* 2 NÚT CHỈNH SỬA VÀ XÓA KHOẢN TIẾT KIỆM */}
          <View style={styles.secondaryActionRow}>
            {/* Chỉnh sửa */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                styles.editBtn,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setShowEditModal(true)}
            >
              <FinanceIcon name="edit" size={16} color="#006747" />
              <Text style={styles.editBtnText}>Chỉnh sửa</Text>
            </Pressable>

            {/* Xóa khoản tiết kiệm */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                styles.deleteBtn,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleDelete}
            >
              <FinanceIcon name="trash" size={16} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Xóa khoản tiết kiệm</Text>
            </Pressable>
          </View>
        </View>

        {/* CARD 3: LỊCH SỬ NỘP / RÚT TIỀN TÍCH LŨY */}
        <View style={styles.card}>
          <View style={styles.historyHeaderRow}>
            <View style={styles.historyTitleWrap}>
              <FinanceIcon name="file-text" size={18} color="#006747" />
              <Text style={styles.cardSectionTitle}>Lịch sử tích lũy</Text>
            </View>
          </View>

          {/* History Item List */}
          <View style={styles.historyList}>
            {saving.history && saving.history.length > 0 ? (
              saving.history.map((hist, index) => {
                const isWithdraw = hist.type === 'withdraw';
                return (
                  <Pressable
                    key={hist.id}
                    style={({ pressed }) => [
                      styles.historyItemRowWrap,
                      pressed && { backgroundColor: '#F8FAFC' },
                      index === saving.history.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                    ]}
                    onPress={() => setSelectedContribution(hist)}
                  >
                    {/* Icon status */}
                    <View
                      style={[
                        styles.historyIconCircle,
                        isWithdraw && { backgroundColor: '#FEE2E2' },
                      ]}
                    >
                      <FinanceIcon
                        name={isWithdraw ? 'arrow-down' : 'arrow-up'}
                        size={14}
                        color={isWithdraw ? '#DC2626' : '#16A34A'}
                      />
                    </View>

                    {/* Text info */}
                    <View style={styles.historyInfoCol}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {hist.title || (isWithdraw ? 'Rút tiền' : 'Nộp tiền tích lũy')}
                      </Text>
                      <Text style={styles.historyDateText}>{hist.date}</Text>
                    </View>

                    {/* Amount */}
                    <View style={styles.historyAmountCol}>
                      <Text
                        style={[
                          styles.historyAmountText,
                          isWithdraw ? styles.historyAmountMinus : styles.historyAmountPlus,
                        ]}
                      >
                        {isWithdraw ? '-' : '+'}
                        {formatVND(hist.amount)}
                      </Text>
                      <FinanceIcon name="chevron-right" size={14} color="#CBD5E1" />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyHistoryWrap}>
                <Text style={styles.emptyHistoryText}>Chưa có giao dịch tích lũy nào</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* MODAL CHI TIẾT GIAO DỊCH */}
      {selectedContribution && (
        <Modal
          visible={!!selectedContribution}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedContribution(null)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setSelectedContribution(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
                <Pressable
                  onPress={() => setSelectedContribution(null)}
                  hitSlop={10}
                  style={styles.modalCloseBtn}
                >
                  <FinanceIcon name="close" size={20} color="#64748B" />
                </Pressable>
              </View>

              {/* Amount badge */}
              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>Số tiền giao dịch</Text>
                <Text
                  style={[
                    styles.modalAmountValue,
                    selectedContribution.type === 'withdraw'
                      ? { color: '#DC2626' }
                      : { color: '#006747' },
                  ]}
                >
                  {selectedContribution.type === 'withdraw' ? '-' : '+'}
                  {formatVND(selectedContribution.amount)}
                </Text>
              </View>

              <View style={styles.modalInfoList}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoKey}>Loại giao dịch</Text>
                  <Text style={styles.modalInfoVal}>
                    {selectedContribution.type === 'withdraw' ? 'Rút tiền' : 'Nộp tiền tích lũy'}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoKey}>Thời gian</Text>
                  <Text style={styles.modalInfoVal}>{selectedContribution.date}</Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoKey}>Tài khoản</Text>
                  <Text style={styles.modalInfoVal}>
                    {selectedContribution.accountName || 'Tài khoản thanh toán'}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoKey}>Ghi chú</Text>
                  <Text style={styles.modalInfoVal}>
                    {selectedContribution.note || selectedContribution.title || 'Không có ghi chú'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.modalCloseConfirmBtn}
                onPress={() => setSelectedContribution(null)}
              >
                <Text style={styles.modalCloseConfirmText}>Đóng</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* CONTRIBUTE GOAL MODAL */}
      <ContributeGoalModal
        visible={showContributeModal}
        goalId={saving.id}
        goalTitle={saving.title}
        onClose={() => setShowContributeModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* EDIT SAVING MODAL */}
      <EditSavingModal
        visible={showEditModal}
        saving={saving}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* WITHDRAW GOAL/SAVING MODAL */}
      <WithdrawGoalModal
        visible={showWithdrawModal}
        goalId={saving.id}
        goalTitle={saving.title}
        maxAmount={saving.currentAmount}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  centerWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  contentScroll: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  topInfoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  icon3dBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon3dImg: {
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
  savingTitle: {
    fontSize: 16,
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
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmountText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#006747',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  statInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItemLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  statItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  actionButtonGroup: {
    gap: 10,
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
    borderRadius: 18,
    gap: 8,
    shadowColor: '#006747',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  withdrawActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 18,
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
  historyHeaderRow: {
    marginBottom: 12,
  },
  historyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyList: {
    gap: 10,
  },
  historyItemRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyInfoCol: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  historyDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyAmountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyAmountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyAmountPlus: {
    color: '#16A34A',
  },
  historyAmountMinus: {
    color: '#DC2626',
  },
  emptyHistoryWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  modalAmountBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAmountLabel: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 4,
  },
  modalAmountValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  modalInfoList: {
    gap: 12,
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalInfoKey: {
    fontSize: 13,
    color: '#64748B',
  },
  modalInfoVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalCloseConfirmBtn: {
    backgroundColor: '#006747',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalCloseConfirmText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});

