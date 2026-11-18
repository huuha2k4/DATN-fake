import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ChevronLeft, Clock, Calendar, CheckCircle2, RotateCcw, ChevronRight, ChevronDown, Wallet, CalendarCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { authStorage } from '../../auth/api/authApi';
import { groupApi } from '../../group/api/groupApi';
import { resolveChoreIconSource } from '../components/choreIcons';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useAppTheme } from '../../../context/ThemeContext';
import { AppAlert as Alert } from '../../../context/DialogContext';

type Props = {
  onBack: () => void;
};

const formatVND = (val: number) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Không có hạn';
  const [year, month, day] = dateString.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return dateString;
};

export function ChildChoresScreen({ onBack }: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = authStorage.getUser();
  const groupId = user?.childWalletGroupId;
  const walletId = user?.childWalletId;

  const [chores, setChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ASSIGNED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL');

  // Lọc theo Tháng (đồng bộ chuẩn lịch sử giao dịch: ALL hoặc YYYY-MM)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string; shortLabel: string }[] = [
      { key: 'ALL', label: 'Tất cả thời gian', shortLabel: 'Tất cả' },
    ];
    const monthsSet = new Set<string>();
    const now = new Date();
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    chores.forEach((c) => {
      const dateStr = c.createdAt || c.dueDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

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
  }, [chores]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  // Modal xem chi tiết nhiệm vụ
  const [selectedChoreDetail, setSelectedChoreDetail] = useState<any | null>(null);

  const loadData = async () => {
    if (!groupId || !walletId) return;
    try {
      const data = await groupApi.getChores(groupId, walletId);
      setChores(data || []);
    } catch {
      Alert.alert('Thông báo', 'Không thể tải danh sách nhiệm vụ của bé.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitChore = async (chore: any) => {
    if (!groupId || !walletId) return;
    try {
      await groupApi.completeChore(groupId, walletId, chore.id);
      Alert.alert('Thành công', 'Đã báo hoàn thành nhiệm vụ! Chờ bố mẹ duyệt thưởng nhé 🎉');
      loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể báo hoàn thành nhiệm vụ');
    }
  };

  // Lọc theo tháng được chọn
  const monthChores = useMemo(() => {
    return chores.filter((c) => {
      if (selectedMonth === 'ALL') return true;
      const dateStr = c.createdAt || c.dueDate;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return true;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      return `${y}-${m}` === selectedMonth;
    });
  }, [chores, selectedMonth]);

  const selectedMonthObj = availableMonths.find((m) => m.key === selectedMonth);
  const selectedMonthDisplay = selectedMonthObj ? selectedMonthObj.shortLabel : 'Tất cả';

  const filteredChores = useMemo(() => {
    return monthChores.filter((chore) => {
      if (activeTab === 'ASSIGNED') return chore.status === 'ASSIGNED' || chore.status === 'IN_PROGRESS';
      if (activeTab === 'SUBMITTED') return chore.status === 'SUBMITTED';
      if (activeTab === 'APPROVED') return chore.status === 'APPROVED';
      if (activeTab === 'REJECTED') return chore.status === 'REJECTED' || chore.status === 'FAILED';
      return true;
    });
  }, [monthChores, activeTab]);

  const assignedCount = monthChores.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
  const approvedTotalReward = monthChores
    .filter((c) => c.status === 'APPROVED')
    .reduce((sum, c) => sum + (c.rewardAmount || 0), 0);

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 14), height: 54 + Math.max(insets.top, 14) },
          isDark && {
            backgroundColor: themeColors.headerBackground,
            borderBottomColor: themeColors.divider,
          },
        ]}
      >
        <View style={styles.headerLeftCol}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={[
              styles.headerIconBtn,
              isDark && { backgroundColor: themeColors.surfaceSubtle },
            ]}
          >
            <FinanceIcon name="chevron-left" size={22} color={isDark ? themeColors.textPrimary : '#047857'} />
          </Pressable>
          <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
            Nhiệm vụ nhận thưởng
          </Text>
        </View>

        {/* Nút lọc tháng bên phải */}
        <Pressable
          onPress={() => setIsMonthPickerVisible(true)}
          style={[
            styles.monthFilterBtn,
            isDark && {
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              borderColor: 'rgba(52, 211, 153, 0.3)',
            },
          ]}
          hitSlop={8}
        >
          <FinanceIcon name="calendar" size={14} color={isDark ? themeColors.accentGreen : '#047857'} />
          <Text style={[styles.monthFilterText, isDark && { color: themeColors.accentGreen }]}>
            {selectedMonthDisplay}
          </Text>
          <FinanceIcon name="chevron-down" size={12} color={isDark ? themeColors.accentGreen : '#047857'} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={isDark ? themeColors.accentGreen : '#059669'}
          />
        }
      >
        {/* Banner Nhiệm vụ nhận thưởng */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../../assets/icons/kid_chores_banner_complete.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* KPI Banner đôi */}
        <View
          style={[
            styles.kpiRow,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          {/* Ô 1: Cần làm */}
          <Pressable
            style={styles.kpiCard}
            onPress={() => setActiveTab('ASSIGNED')}
          >
            <View
              style={[
                styles.kpiIconWrap,
                { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7' },
              ]}
            >
              <CalendarCheck size={24} color={isDark ? themeColors.accentGreen : '#15803D'} strokeWidth={2.2} />
            </View>
            <View style={styles.kpiInfo}>
              <Text style={[styles.kpiLabel, isDark && { color: themeColors.textSecondary }]}>Cần làm</Text>
              <Text style={[styles.kpiValue, { color: isDark ? themeColors.accentGreen : '#15803D' }]}>
                {assignedCount}
              </Text>
            </View>
          </Pressable>

          {/* Đường phân cách giữa 2 thẻ */}
          <View style={[styles.kpiDivider, isDark && { backgroundColor: themeColors.divider }]} />

          {/* Ô 2: Tổng thưởng */}
          <Pressable
            style={styles.kpiCard}
            onPress={() => setActiveTab('APPROVED')}
          >
            <View
              style={[
                styles.kpiIconWrap,
                { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7' },
              ]}
            >
              <Wallet size={24} color={isDark ? themeColors.accentGreen : '#15803D'} strokeWidth={2.2} />
            </View>
            <View style={styles.kpiInfo}>
              <Text style={[styles.kpiLabel, isDark && { color: themeColors.textSecondary }]}>Tổng thưởng</Text>
              <Text
                style={[styles.kpiValue, { color: isDark ? themeColors.accentGreen : '#15803D' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatVND(approvedTotalReward)}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Tab Filter dàn đều */}
        <View style={[styles.tabsRow, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ASSIGNED', label: 'Cần làm' },
            { key: 'SUBMITTED', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã nhận' },
            { key: 'REJECTED', label: 'Làm lại' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key as any)}
                style={[
                  styles.tabBtn,
                  isActive && [
                    styles.tabBtnActive,
                    isDark && { backgroundColor: themeColors.accentGreen },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isDark && { color: themeColors.textSecondary },
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="small" color={isDark ? themeColors.accentGreen : '#059669'} style={{ marginTop: 40 }} />
        ) : filteredChores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>⭐</Text>
            <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có nhiệm vụ nào</Text>
            <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
              Hãy nhắc bố mẹ giao thêm việc nhà để tích lũy tiền thưởng nhé!
            </Text>
          </View>
        ) : (
          filteredChores.map((chore) => {
            const isAssigned = chore.status === 'ASSIGNED' || chore.status === 'IN_PROGRESS';
            const isSubmitted = chore.status === 'SUBMITTED';
            const isApproved = chore.status === 'APPROVED';
            const isRejected = chore.status === 'REJECTED';

            const iconSource = resolveChoreIconSource(chore.icon, chore.id || chore.title);

            return (
              <Pressable
                key={chore.id}
                style={({ pressed }) => [
                  styles.choreCard,
                  isDark && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.cardBorder,
                  },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => setSelectedChoreDetail(chore)}
              >
                <View style={styles.choreHeader}>
                  <Image source={iconSource} style={styles.choreIconImg} resizeMode="contain" />
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.choreTitle, isDark && { color: themeColors.textPrimary }]}>
                      {chore.title}
                    </Text>
                    {chore.description ? (
                      <Text style={[styles.choreDesc, isDark && { color: themeColors.textSecondary }]} numberOfLines={2}>
                        {chore.description}
                      </Text>
                    ) : null}
                    {chore.dueDate ? (
                      <View style={styles.choreMeta}>
                        <Calendar size={12} color={isDark ? themeColors.textMuted : '#64748B'} />
                        <Text style={[styles.choreMetaText, isDark && { color: themeColors.textSecondary }]}>
                          Hạn: {formatDate(chore.dueDate)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Cột phải: Tiền thưởng & Trạng thái / Nút hành động */}
                  <View style={styles.rewardCol}>
                    <Text style={[styles.choreReward, isDark && { color: themeColors.accentGreen }]}>
                      +{formatVND(chore.rewardAmount)}
                    </Text>
                    {isApproved && (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7',
                          },
                        ]}
                      >
                        <CheckCircle2 size={11} color={isDark ? themeColors.accentGreen : '#15803D'} />
                        <Text style={[styles.statusBadgeText, { color: isDark ? themeColors.accentGreen : '#15803D' }]}>
                          Đã nhận
                        </Text>
                      </View>
                    )}
                    {isSubmitted && (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
                          },
                        ]}
                      >
                        <Clock size={11} color={isDark ? '#C084FC' : '#7E22CE'} />
                        <Text style={[styles.statusBadgeText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>
                          Chờ duyệt
                        </Text>
                      </View>
                    )}
                    {isAssigned && (
                      <Pressable
                        style={[
                          styles.actionBtn,
                          isDark && { backgroundColor: themeColors.accentGreen },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleSubmitChore(chore);
                        }}
                      >
                        <Text style={styles.actionBtnText}>Báo xong ✓</Text>
                      </Pressable>
                    )}
                    {isRejected && (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: '#D97706' }]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleSubmitChore(chore);
                        }}
                      >
                        <RotateCcw size={11} color="#FFF" style={{ marginRight: 3 }} />
                        <Text style={styles.actionBtnText}>Làm lại</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {isRejected && chore.rejectionReason ? (
                  <View
                    style={[
                      styles.rejectNotice,
                      isDark && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                    ]}
                  >
                    <Text style={[styles.rejectNoticeText, isDark && { color: '#FBBF24' }]}>
                      ⚠️ Bố mẹ nhắn: {chore.rejectionReason}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Modal chọn tháng dạng Bottom Sheet chuẩn theo Lịch sử giao dịch */}
      <Modal
        visible={isMonthPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsMonthPickerVisible(false)} />
          <View style={[styles.modalSheet, isDark && { backgroundColor: themeColors.surface }]}>
            <View style={[styles.modalTopBar, isDark && { borderBottomColor: themeColors.divider }]}>
              <Text style={[styles.modalTopTitle, isDark && { color: themeColors.textPrimary }]}>Chọn kỳ / Tháng</Text>
              <Pressable onPress={() => setIsMonthPickerVisible(false)} hitSlop={10}>
                <Text style={[styles.modalCloseText, isDark && { color: themeColors.accentGreen }]}>Đóng</Text>
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
                        isSelected && [
                          styles.monthOptionLabelActive,
                          isDark && { color: themeColors.accentGreen },
                        ],
                      ]}
                    >
                      {m.label}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.checkmarkIcon, isDark && { color: themeColors.accentGreen }]}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Chi tiết Nhiệm vụ nhận thưởng */}
      <Modal visible={Boolean(selectedChoreDetail)} transparent animationType="fade" onRequestClose={() => setSelectedChoreDetail(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedChoreDetail(null)} />
          <View
            style={[
              styles.detailModalCard,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.detailHeader, isDark && { borderBottomColor: themeColors.divider }]}>
              <View style={styles.detailHeaderLeft}>
                <Image
                  source={resolveChoreIconSource(selectedChoreDetail?.icon, selectedChoreDetail?.id || selectedChoreDetail?.title)}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailHeaderTitle, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {selectedChoreDetail?.title}
                  </Text>
                  <Text style={[styles.detailHeaderSub, isDark && { color: themeColors.textSecondary }]}>
                    Nhiệm vụ làm việc nhà nhận thưởng
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setSelectedChoreDetail(null)}
                hitSlop={10}
                style={[
                  styles.detailCloseBtn,
                  isDark && { backgroundColor: themeColors.surfaceSubtle },
                ]}
              >
                <Text style={{ fontSize: 16, color: isDark ? themeColors.textSecondary : '#64748B', fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            {/* Thẻ tiền thưởng */}
            <View
              style={[
                styles.detailAmountBox,
                isDark && {
                  backgroundColor: themeColors.surfaceSubtle,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.detailAmountLabel, isDark && { color: themeColors.accentGreen }]}>TIỀN THƯỞNG NHẬN ĐƯỢC</Text>
              <Text style={[styles.detailAmountValue, isDark && { color: themeColors.accentGreen }]}>
                +{formatVND(selectedChoreDetail?.rewardAmount || 0)}
              </Text>
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'center' }}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedChoreDetail?.status === 'APPROVED'
                          ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7')
                          : selectedChoreDetail?.status === 'SUBMITTED'
                            ? (isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF')
                            : selectedChoreDetail?.status === 'REJECTED'
                              ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7')
                              : (isDark ? themeColors.surfaceSubtle : '#E2E8F0'),
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          selectedChoreDetail?.status === 'APPROVED'
                            ? (isDark ? themeColors.accentGreen : '#15803D')
                            : selectedChoreDetail?.status === 'SUBMITTED'
                              ? (isDark ? '#C084FC' : '#7E22CE')
                              : selectedChoreDetail?.status === 'REJECTED'
                                ? (isDark ? '#FBBF24' : '#B45309')
                                : (isDark ? themeColors.textSecondary : '#475569'),
                      },
                    ]}
                  >
                    {selectedChoreDetail?.status === 'APPROVED'
                      ? '✓ Đã nhận thưởng'
                      : selectedChoreDetail?.status === 'SUBMITTED'
                        ? '⏳ Chờ bố mẹ duyệt'
                        : selectedChoreDetail?.status === 'REJECTED'
                          ? '⚠️ Cần làm lại'
                          : 'Đang thực hiện'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chi tiết nội dung */}
            <View
              style={[
                styles.detailContentGroup,
                isDark && {
                  backgroundColor: themeColors.surfaceSubtle,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              {selectedChoreDetail?.description ? (
                <View style={styles.detailItemRow}>
                  <Text style={[styles.detailItemLabel, isDark && { color: themeColors.textSecondary }]}>Yêu cầu:</Text>
                  <Text style={[styles.detailItemValBold, isDark && { color: themeColors.textPrimary }]}>
                    {selectedChoreDetail.description}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailItemRow}>
                <Text style={[styles.detailItemLabel, isDark && { color: themeColors.textSecondary }]}>Hạn hoàn thành:</Text>
                <Text style={[styles.detailItemVal, isDark && { color: themeColors.textPrimary }]}>
                  {formatDate(selectedChoreDetail?.dueDate)}
                </Text>
              </View>

              <View style={styles.detailItemRow}>
                <Text style={[styles.detailItemLabel, isDark && { color: themeColors.textSecondary }]}>Tần suất lặp:</Text>
                <Text style={[styles.detailItemVal, isDark && { color: themeColors.textPrimary }]}>
                  {selectedChoreDetail?.frequency === 'DAILY'
                    ? 'Hằng ngày'
                    : selectedChoreDetail?.frequency === 'WEEKLY'
                      ? 'Hằng tuần'
                      : 'Một lần'}
                </Text>
              </View>

              {selectedChoreDetail?.status === 'REJECTED' && selectedChoreDetail?.rejectionReason ? (
                <View
                  style={[
                    styles.detailRejectNotice,
                    isDark && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                  ]}
                >
                  <Text style={[styles.detailRejectNoticeText, isDark && { color: '#FBBF24' }]}>
                    ⚠️ Lời nhắn bố mẹ: {selectedChoreDetail.rejectionReason}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Hành động dưới cùng */}
            <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
              {(selectedChoreDetail?.status === 'ASSIGNED' || selectedChoreDetail?.status === 'IN_PROGRESS' || selectedChoreDetail?.status === 'REJECTED') ? (
                <Pressable
                  style={[
                    styles.detailConfirmBtn,
                    { flex: 1, backgroundColor: isDark ? themeColors.accentGreen : '#059669' },
                  ]}
                  onPress={() => {
                    const chore = selectedChoreDetail;
                    setSelectedChoreDetail(null);
                    handleSubmitChore(chore);
                  }}
                >
                  <Text style={styles.detailConfirmBtnText}>Báo xong việc ✓</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.detailConfirmBtn,
                  {
                    flex: 1,
                    backgroundColor: isDark ? themeColors.surfaceSubtle : '#F1F5F9',
                  },
                ]}
                onPress={() => setSelectedChoreDetail(null)}
              >
                <Text style={[styles.detailConfirmBtnText, { color: isDark ? themeColors.textPrimary : '#475569' }]}>
                  Đóng
                </Text>
              </Pressable>
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bannerContainer: {
  width: '100%',
  aspectRatio: 1024 / 341,
  borderRadius: 22,
  overflow: 'hidden',
  marginBottom: 16,
  shadowColor: '#059669',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 3,
},
  bannerImage: {
  width: '100%',
  height: '100%',
},
  kpiRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderRadius: 20,
  padding: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},
  kpiCard: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 6,
},
  kpiIconWrap: {
  width: 48,
  height: 48,
  borderRadius: 14,
  backgroundColor: '#F0FDF4',
  alignItems: 'center',
  justifyContent: 'center',
},
  kpiIconImg: {
  width: 40,
  height: 40,
},
  kpiInfo: {
  flex: 1,
},
  kpiLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#334155',
  lineHeight: 16,
  marginBottom: 3,
},
  kpiValueRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
  kpiValue: {
  fontSize: 18,
  fontWeight: '900',
},
  kpiDivider: {
  width: 1,
  height: 44,
  backgroundColor: '#E2E8F0',
  marginHorizontal: 6,
},
  tabsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#F1F5F9',
  borderRadius: 14,
  padding: 3,
  marginBottom: 16,
  gap: 2,
},
  tabBtn: {
  flex: 1,
  paddingVertical: 7,
  paddingHorizontal: 2,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
},
  tabBtnActive: {
  backgroundColor: '#059669',
  shadowColor: '#059669',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 2,
},
  tabText: {
  fontSize: 11.5,
  fontWeight: '700',
  color: '#64748B',
  textAlign: 'center',
},
  tabTextActive: {
  color: '#FFFFFF',
},
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 30 },
  choreCard: {
  backgroundColor: '#FFF',
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginBottom: 12,
},
  choreHeader: { flexDirection: 'row', alignItems: 'center' },
  choreIconImg: {
  width: 46,
  height: 46,
  marginRight: 12,
},
  choreTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  choreDesc: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },
  choreReward: { fontSize: 15, fontWeight: '800', color: '#059669', textAlign: 'right' },
  rewardCol: {
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: 6,
},
  choreMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  choreMetaText: { fontSize: 11.5, color: '#64748B' },
  rejectNotice: {
  backgroundColor: '#FEF3C7',
  padding: 8,
  borderRadius: 8,
  marginTop: 10,
},
  rejectNoticeText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  actionBtn: {
  backgroundColor: '#059669',
  paddingHorizontal: 12,
  paddingVertical: 5.5,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
},
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  /* Modal Chi tiết */
  detailModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 6,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAmountBox: {
    marginVertical: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },
  detailAmountLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.6,
  },
  detailAmountValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 4,
  },
  detailContentGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItemLabel: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailItemVal: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  detailItemValBold: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailRejectNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  detailRejectNoticeText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '700',
  },
  detailConfirmBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailConfirmBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
