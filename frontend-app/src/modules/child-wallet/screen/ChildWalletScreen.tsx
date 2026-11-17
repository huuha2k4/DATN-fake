import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Plus, CheckCircle2, Star, Gift, Eye, EyeOff, Calendar, Coins, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStorage } from '../../auth/api/authApi';
import { groupApi } from '../../group/api/groupApi';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';

type Props = {
  onBack: () => void;
  onAddTransaction: () => void;
  onViewChores: () => void;
  onViewRequests: () => void;
  onViewAllTransactions?: () => void;
};

const formatVND = (val: number) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;

export function ChildWalletScreen({
  onBack,
  onAddTransaction,
  onViewChores,
  onViewRequests,
  onViewAllTransactions,
}: Props) {
  const insets = useSafeAreaInsets();
  const user = authStorage.getUser();
  const groupId = user?.childWalletGroupId;
  const walletId = user?.childWalletId;

  const [wallet, setWallet] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const loadData = async () => {
    if (!groupId || !walletId) return;
    try {
      const [walletData, requestData] = await Promise.all([
        groupApi.getChildWallet(groupId, walletId),
        groupApi.getSpendRequests(groupId, walletId),
      ]);
      setWallet(walletData);
      setRequests(requestData || []);
    } catch {
      Alert.alert('Thông báo', 'Không thể tải thông tin ví của bé.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approvedItems = requests.filter((r) => r.status === 'APPROVED');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14), height: 54 + Math.max(insets.top, 14) }]}>
        <View style={styles.headerLeftCol}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.headerIconBtn}>
            <FinanceIcon name="chevron-left" size={22} color="#047857" />
          </Pressable>
          <Text style={styles.headerTitle}>Ví của em</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* ── 1. BANNER NGUYÊN BẢN CHUẨN ĐỒ HỌA BẠN GỬI ── */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../../assets/icons/kid_wallet_complete_banner.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        {/* ── 2. THẺ TRẮNG THÔNG TIN SỐ DƯ & HẠN MỨC (CARD 2 CỘT) ── */}
        <View style={styles.summaryCard}>
          {/* Cột trái: Số dư hiện tại (dùng icon ngoài trang chủ kid_icon_wallet) */}
          <View style={styles.summaryLeft}>
            <View style={styles.walletIconSq}>
              <Image
                source={require('../../../assets/icons/kid_icon_wallet.png')}
                style={styles.walletIconImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.balanceInfo}>
              <View style={styles.balanceLabelRow}>
                <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
                <Pressable onPress={() => setShowBalance(!showBalance)} hitSlop={8}>
                  {showBalance ? (
                    <Eye size={15} color="#059669" />
                  ) : (
                    <EyeOff size={15} color="#94A3B8" />
                  )}
                </Pressable>
              </View>
              <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
                {showBalance ? formatVND(wallet?.balance || 0) : '•••••• đ'}
              </Text>
            </View>
          </View>

          {/* Đường phân cách đứng mờ */}
          <View style={styles.summaryDivider} />

          {/* Cột phải: Hạn mức ngày & Tiêu vặt tuần (Icon đơn giản) */}
          <View style={styles.summaryRight}>
            <View style={styles.metaRow}>
              <View style={[styles.metaIconSq, { backgroundColor: '#DCFCE7' }]}>
                <Calendar size={14} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaTitle}>Hạn mức ngày</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {wallet?.spendLimitDaily ? formatVND(wallet.spendLimitDaily) : 'Không giới hạn'}
                </Text>
              </View>
            </View>

            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <View style={[styles.metaIconSq, { backgroundColor: '#FEF3C7' }]}>
                <Coins size={14} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaTitle}>Tiêu vặt tuần</Text>
                <Text style={[styles.metaValue, { color: '#059669' }]} numberOfLines={1}>
                  {wallet?.weeklyAllowance ? `+${formatVND(wallet.weeklyAllowance)}` : '+0 đ'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. BỘ 3 NÚT CHỨC NĂNG (GIỮ NGUYÊN) ── */}
        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={onAddTransaction}>
            <View style={[styles.navIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Plus size={20} color="#15803D" />
            </View>
            <Text style={styles.navBtnText}>Thêm thu/chi</Text>
          </Pressable>

          <Pressable style={styles.navBtn} onPress={onViewChores}>
            <View style={[styles.navIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Star size={20} color="#D97706" />
            </View>
            <Text style={styles.navBtnText}>Làm nhiệm vụ</Text>
          </Pressable>

          <Pressable style={styles.navBtn} onPress={onViewRequests}>
            <View style={[styles.navIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Gift size={20} color="#0284C7" />
            </View>
            <Text style={styles.navBtnText}>Xin tiền bố mẹ</Text>
          </Pressable>
        </View>

        {/* ── 4. LỊCH SỬ HOẠT ĐỘNG (HIỂN THỊ 6 GIAO DỊCH GẦN NHẤT) ── */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            {onViewAllTransactions ? (
              <Pressable
                onPress={onViewAllTransactions}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                hitSlop={8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>Xem tất cả</Text>
                <ChevronRight size={16} color="#059669" strokeWidth={2.5} />
              </Pressable>
            ) : approvedItems.length > 6 ? (
              <Text style={styles.recentCountText}>Gần đây</Text>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#059669" style={{ marginTop: 20 }} />
          ) : approvedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>👛</Text>
              <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
              <Text style={styles.emptySub}>Hãy hoàn thành việc nhà hoặc xin tiền bố mẹ để tích lũy tiền vào ví nhé!</Text>
            </View>
          ) : (
            approvedItems.slice(0, 6).map((item) => {
              const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
              const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
              const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ');
              const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
              const isIncome = isDeposit || isChoreReward || isGiftIncome || isMoneyReq;

              let displayTitle = item.description || 'Giao dịch';
              // Nếu giao dịch cũ ghi là "Chi tiêu cá nhân của bé" thì chuyển thành "Ăn uống / Mua sắm" tự nhiên
              if (displayTitle === 'Chi tiêu cá nhân của bé') {
                displayTitle = 'Ăn uống / Mua sắm';
              }
              let subText = 'Chi tiêu';
              if (isDeposit) {
                displayTitle = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
                subText = 'Bố/mẹ nạp vào ví';
              } else if (isChoreReward) {
                displayTitle = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
                subText = 'Thưởng làm việc nhà';
              } else if (isGiftIncome) {
                displayTitle = item.description.replace('[INCOME_GIFT] ', '');
                subText = 'Lì xì / Người thân cho';
              } else if (isMoneyReq) {
                displayTitle = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;
                subText = 'Bố/mẹ đã cấp';
              }

              let dateDisplay = 'Gần đây';
              if (item.createdAt) {
                const d = new Date(item.createdAt);
                dateDisplay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
              }

              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View
                      style={[
                        styles.historyIconBox,
                        { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                    >
                      <FinanceIcon
                        name={
                          displayTitle.toLowerCase().includes('tiết kiệm') ||
                          displayTitle.toLowerCase().includes('mục tiêu') ||
                          displayTitle.toLowerCase().includes('đầu tư') ||
                          displayTitle.toLowerCase().includes('quỹ') ||
                          displayTitle.toLowerCase().includes('tích lũy')
                            ? 'piggy-bank'
                            : isDeposit
                            ? 'wallet'
                            : isChoreReward
                            ? 'award'
                            : isMoneyReq
                            ? 'coins'
                            : isGiftIncome
                            ? 'gift'
                            : resolveCategoryIconName(undefined, isIncome ? 'INCOME' : 'EXPENSE', displayTitle)
                        }
                        size={17}
                        color={isIncome ? '#15803D' : '#DC2626'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {displayTitle}
                      </Text>
                      <Text style={styles.historyDate}>{subText} · {dateDisplay}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.historyAmount,
                      { color: isIncome ? '#15803D' : '#DC2626' },
                    ]}
                  >
                    {isIncome ? '+' : '-'}{formatVND(item.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
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
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 14, paddingBottom: 40 },

  /* 1. Banner nguyên bản */
  bannerContainer: {
    width: '100%',
    aspectRatio: 1004 / 314,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 14,
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

  /* 2. Thẻ trắng thông tin số dư */
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLeft: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 6,
  },
  walletIconSq: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#E8FDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconImg: {
    width: 52,
    height: 52,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.3,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  summaryRight: {
    flex: 1.05,
    paddingLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIconSq: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIconImg: {
    width: 22,
    height: 22,
  },
  metaTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },

  /* 3. Bộ 3 nút chức năng */
  navRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  navBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  navIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  navBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  /* 4. Danh sách hoạt động */
  historySection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  recentCountText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  historyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  historyDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '800', color: '#059669' },
});
