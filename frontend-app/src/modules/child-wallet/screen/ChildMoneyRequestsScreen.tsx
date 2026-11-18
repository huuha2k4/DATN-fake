import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { ChevronLeft, Clock, Plus, CheckCircle2, XCircle, Hourglass, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStorage } from '../../auth/api/authApi';
import { groupApi } from '../../group/api/groupApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

type Props = {
  onBack: () => void;
};

const formatVND = (val: number) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

export function ChildMoneyRequestsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const user = authStorage.getUser();
  const groupId = user?.childWalletGroupId;
  const walletId = user?.childWalletId;

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modal tạo yêu cầu
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Chi tiết yêu cầu xin tiền
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  // Bộ lọc theo Tháng (đồng bộ chuẩn Lịch sử giao dịch: ALL hoặc YYYY-MM)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string; shortLabel: string }[] = [
      { key: 'ALL', label: 'Tất cả thời gian', shortLabel: 'Tất cả' },
    ];
    const monthsSet = new Set<string>();
    const now = new Date();
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    // Đưa tất cả các tháng thực tế có trong danh sách requests vào
    requests.forEach((req) => {
      const dateStr = req.createdAt || req.createdDate || req.requestDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

    // Bổ sung thêm các tháng gần nhất
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const sorted = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    sorted.forEach((key) => {
      const [y, m] = key.split('-');
      list.push({
        key,
        label: `Tháng ${m}/${y}`,
        shortLabel: `${m}/${y}`,
      });
    });

    return list;
  }, [requests]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const loadData = async () => {
    if (!groupId || !walletId) return;
    try {
      const data = await groupApi.getSpendRequests(groupId, walletId);
      const filtered = (data || [])
        .filter((r: any) => r.description?.startsWith('[MONEY_REQUEST] ') || r.status === 'PENDING')
        .map((r: any) => ({
          ...r,
          cleanDesc: r.description?.replace(/^\[MONEY_REQUEST\]\s*/, '') || 'Xin tiền tiêu vặt',
        }));
      setRequests(filtered);
    } catch {
      Alert.alert('Thông báo', 'Không thể tải lịch sử yêu cầu xin tiền.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async () => {
    const num = Number(amount.replace(/[^0-9]/g, ''));
    if (!num || num <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền muốn xin');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mục đích xin tiền');
      return;
    }
    if (!groupId || !walletId) return;

    try {
      setSubmitting(true);
      await groupApi.createChildSpendRequest(groupId, walletId, {
        amount: num,
        description: `[MONEY_REQUEST] ${description.trim()}`,
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu xin tiền tới bố mẹ! Chờ bố mẹ xem và duyệt nhé 🎉');
      setAmount('');
      setDescription('');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc theo tháng được chọn
  const monthRequests = useMemo(() => {
    return requests.filter((r) => {
      if (selectedMonth === 'ALL') return true;
      const dateStr = r.createdAt || r.createdDate || r.requestDate;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return true;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      return `${y}-${m}` === selectedMonth;
    });
  }, [requests, selectedMonth]);

  const selectedMonthObj = availableMonths.find((m) => m.key === selectedMonth);
  const selectedMonthDisplay = selectedMonthObj ? selectedMonthObj.shortLabel : 'Tất cả';

  const filtered = monthRequests.filter((r) => {
    if (activeTab === 'PENDING') return r.status === 'PENDING';
    if (activeTab === 'APPROVED') return r.status === 'APPROVED';
    if (activeTab === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  const pendingCount = monthRequests.filter((r) => r.status === 'PENDING').length;
  const approvedTotal = monthRequests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14), height: 54 + Math.max(insets.top, 14) }]}>
        <View style={styles.headerLeftCol}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.headerIconBtn}>
            <FinanceIcon name="chevron-left" size={22} color="#047857" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Xin tiền bố mẹ</Text>
        </View>

        {/* Nút lọc tháng nằm ở giữa chữ Xin tiền bố mẹ và nút Xin tiền */}
        <Pressable
          onPress={() => setIsMonthPickerVisible(true)}
          style={styles.monthFilterBtn}
          hitSlop={8}
        >
          <FinanceIcon name="calendar" size={14} color="#047857" />
          <Text style={styles.monthFilterText}>{selectedMonthDisplay}</Text>
          <FinanceIcon name="chevron-down" size={12} color="#047857" />
        </Pressable>

        <Pressable onPress={() => setShowModal(true)} style={styles.headerAddBtn}>
          <Plus size={16} color="#FFF" />
          <Text style={styles.headerAddText}>Xin tiền</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Banner Xin tiền bố mẹ */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require('../../../assets/icons/child_money_request_banner.jpg')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* KPI Banner */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#FFEDD5' }]}>
              <Hourglass size={22} color="#EA580C" strokeWidth={2.3} />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>Chờ duyệt</Text>
              <Text style={[styles.kpiValue, { color: '#EA580C' }]}>{pendingCount}</Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
              <Wallet size={22} color="#16A34A" strokeWidth={2.3} />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>Đã được cấp</Text>
              <Text style={[styles.kpiValue, { color: '#16A34A' }]}>+{formatVND(approvedTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Tab Filter */}
        <View style={styles.tabsRow}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Từ chối' },
          ].map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key as any)}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="small" color="#059669" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📩</Text>
            <Text style={styles.emptyTitle}>Chưa có yêu cầu nào</Text>
            <Text style={styles.emptySub}>Bấm "Xin tiền" ở góc trên để gửi yêu cầu xin tiền tiêu vặt tới bố mẹ nhé!</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const isApproved = item.status === 'APPROVED';
            const isPending = item.status === 'PENDING';
            const isRejected = item.status === 'REJECTED';

            const statusIcon = isApproved
              ? require('../../../assets/icons/money_request_approved.png')
              : isPending
                ? require('../../../assets/icons/money_request_pending.png')
                : require('../../../assets/icons/money_request_rejected.png');

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.9 }]}
                onPress={() => setSelectedDetail(item)}
              >
                <View style={styles.requestCardRow}>
                  {/* Icon 3D trạng thái to đẹp ở bên trái */}
                  <Image source={statusIcon} style={styles.status3DIcon} resizeMode="contain" />

                  {/* Thông tin mô tả bên giữa */}
                  <View style={styles.requestInfoCol}>
                    <Text style={styles.requestDesc} numberOfLines={2}>
                      {item.cleanDesc}
                    </Text>
                    <Text style={styles.requestDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                    </Text>
                  </View>

                  {/* Cột phải: Số tiền ở trên, Trạng thái ở ngay dưới */}
                  <View style={styles.requestRightCol}>
                    <Text style={styles.requestAmount}>+{formatVND(item.amount)}</Text>
                    {isApproved && (
                      <View style={[styles.statusPill, { backgroundColor: '#DCFCE7' }]}>
                        <CheckCircle2 size={11} color="#15803D" />
                        <Text style={[styles.statusPillText, { color: '#15803D' }]}>Đã duyệt</Text>
                      </View>
                    )}
                    {isPending && (
                      <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
                        <Clock size={11} color="#B45309" />
                        <Text style={[styles.statusPillText, { color: '#B45309' }]}>Chờ duyệt</Text>
                      </View>
                    )}
                    {isRejected && (
                      <View style={[styles.statusPill, { backgroundColor: '#FFE4E6' }]}>
                        <XCircle size={11} color="#E11D48" />
                        <Text style={[styles.statusPillText, { color: '#E11D48' }]}>Từ chối</Text>
                      </View>
                    )}
                  </View>
                </View>

                {isRejected && item.rejectionReason ? (
                  <View style={styles.rejectNotice}>
                    <Text style={styles.rejectNoticeText}>❌ Lý do từ chối: {item.rejectionReason}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Modal Xin tiền */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xin tiền bố mẹ</Text>
            <Text style={styles.modalSub}>Nhập số tiền và lý do để bố mẹ xét duyệt nhé</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền muốn xin (₫)</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Quick choices */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 6 }}>
                Gợi ý số tiền:
              </Text>
              <View style={styles.quickChoices}>
                {['5000', '10000', '20000', '50000'].map((val) => (
                  <Pressable
                    key={val}
                    style={styles.quickBtn}
                    onPress={() => setAmount(val)}
                  >
                    <Text style={styles.quickBtnText}>{formatVND(Number(val))}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mục đích sử dụng</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Ví dụ: Mua vở bài tập, ăn sáng..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowModal(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={handleCreateRequest}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Chi tiết Yêu cầu xin tiền */}
      <Modal visible={Boolean(selectedDetail)} transparent animationType="fade" onRequestClose={() => setSelectedDetail(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedDetail(null)} />
          <View style={styles.detailModalCard}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <Image
                  source={
                    selectedDetail?.status === 'APPROVED'
                      ? require('../../../assets/icons/money_request_approved.png')
                      : selectedDetail?.status === 'REJECTED'
                        ? require('../../../assets/icons/money_request_rejected.png')
                        : require('../../../assets/icons/money_request_pending.png')
                  }
                  style={{ width: 38, height: 38 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailHeaderTitle}>Chi tiết yêu cầu</Text>
                  <Text style={styles.detailHeaderSub}>Thông tin phê duyệt từ bố mẹ</Text>
                </View>
              </View>
              <Pressable onPress={() => setSelectedDetail(null)} hitSlop={10} style={styles.detailCloseBtn}>
                <Text style={{ fontSize: 16, color: '#64748B', fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            {/* Thẻ tiền nổi bật */}
            <View style={styles.detailAmountBox}>
              <Text style={styles.detailAmountLabel}>SỐ TIỀN XIN CẤP</Text>
              <Text style={styles.detailAmountValue}>+{formatVND(selectedDetail?.amount || 0)}</Text>
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'center' }}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        selectedDetail?.status === 'APPROVED'
                          ? '#DCFCE7'
                          : selectedDetail?.status === 'REJECTED'
                            ? '#FFE4E6'
                            : '#FEF3C7',
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color:
                          selectedDetail?.status === 'APPROVED'
                            ? '#15803D'
                            : selectedDetail?.status === 'REJECTED'
                              ? '#E11D48'
                              : '#B45309',
                      },
                    ]}
                  >
                    {selectedDetail?.status === 'APPROVED'
                      ? '✓ Đã được duyệt'
                      : selectedDetail?.status === 'REJECTED'
                        ? '✕ Bị từ chối'
                        : '⏳ Đang chờ duyệt'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chi tiết nội dung */}
            <View style={styles.detailContentGroup}>
              <View style={styles.detailItemRow}>
                <Text style={styles.detailItemLabel}>Mục đích sử dụng:</Text>
                <Text style={styles.detailItemValBold}>{selectedDetail?.cleanDesc}</Text>
              </View>

              <View style={styles.detailItemRow}>
                <Text style={styles.detailItemLabel}>Thời gian gửi:</Text>
                <Text style={styles.detailItemVal}>
                  {selectedDetail?.createdAt
                    ? new Date(selectedDetail.createdAt).toLocaleString('vi-VN')
                    : 'Gần đây'}
                </Text>
              </View>

              <View style={styles.detailItemRow}>
                <Text style={styles.detailItemLabel}>Phản hồi từ:</Text>
                <Text style={styles.detailItemVal}>
                  {selectedDetail?.respondedByUserName || (selectedDetail?.status === 'PENDING' ? 'Đang đợi bố mẹ' : 'Bố mẹ')}
                </Text>
              </View>

              {selectedDetail?.status === 'REJECTED' && selectedDetail?.rejectionReason ? (
                <View style={styles.detailRejectNotice}>
                  <Text style={styles.detailRejectNoticeText}>
                    ❌ Lý do từ chối: {selectedDetail.rejectionReason}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Nút đóng */}
            <Pressable style={styles.detailConfirmBtn} onPress={() => setSelectedDetail(null)}>
              <Text style={styles.detailConfirmBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal chọn tháng dạng Bottom Sheet chuẩn theo Lịch sử giao dịch */}
      <Modal
        visible={isMonthPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsMonthPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTopTitle}>Chọn kỳ / Tháng</Text>
              <Pressable onPress={() => setIsMonthPickerVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              {availableMonths.map((m) => {
                const isSelected = selectedMonth === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setSelectedMonth(m.key);
                      setIsMonthPickerVisible(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    marginRight: 'auto',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  monthFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  headerAddText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bannerWrapper: {
    width: '100%',
    aspectRatio: 1024 / 341,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 10,
  },
  kpiIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 2 },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  tabBtnActive: { backgroundColor: '#059669' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#FFF' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 30 },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  requestCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  status3DIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  requestInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  requestDesc: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 20 },
  requestDate: { fontSize: 12, color: '#64748B', marginTop: 3 },
  requestRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  requestAmount: { fontSize: 15, fontWeight: '800', color: '#059669' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  rejectNotice: {
    backgroundColor: '#FFE4E6',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  rejectNoticeText: { fontSize: 12, color: '#BE123C', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  amountInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  quickChoices: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
  },
  quickBtnText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  submitBtn: { backgroundColor: '#059669' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Modal Chi tiết */
  detailModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAmountBox: {
    marginVertical: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },
  detailAmountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  detailAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 4,
  },
  detailContentGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailItemVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  detailItemValBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailRejectNotice: {
    backgroundColor: '#FFE4E6',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  detailRejectNoticeText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '700',
  },
  detailConfirmBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailConfirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 20,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  monthOptionRowActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 8,
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
    fontWeight: '800',
    color: '#00A86B',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});
