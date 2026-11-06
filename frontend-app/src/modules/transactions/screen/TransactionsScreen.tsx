import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import { transactionApi, type TransactionType } from '../../add-transaction/api/transactionApi';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

type Props = {
  onBack: () => void;
  onAddTransaction: () => void;
};

export interface TransactionItem {
  id: string;
  transactionType: TransactionType;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  amount: number;
  currencyCode: string;
  description: string;
  transactionDate: string;
  transactionTime?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
}

export function TransactionsScreen({ onBack, onAddTransaction }: Props) {
  const insets = useSafeAreaInsets();

  // Tab lọc: Tất cả | Chi tiêu | Thu nhập | Chuyển khoản
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<CashflowSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    transactionCount: 0,
  });

  const [monthModalVisible, setMonthModalVisible] = useState(false);

  // Danh sách 12 tháng gần nhất để lọc
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        key: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    return list;
  }, []);

  // Fetch dữ liệu giao dịch từ API thực tế Backend (/api/v1/transactions)
  const fetchTransactions = async (isRefresh = false) => {
    const token = authStorage.getToken();
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL(`${API_BASE_URL}/transactions`);
      url.searchParams.append('pageSize', '100');

      if (selectedMonth && selectedMonth !== 'ALL') {
        const [year, month] = selectedMonth.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        url.searchParams.append('fromDate', `${selectedMonth}-01`);
        url.searchParams.append('toDate', `${selectedMonth}-${String(lastDay).padStart(2, '0')}`);
      }

      const res = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const json = await res.json();
        const txList = json?.transactions || json?.data?.transactions || [];
        const sum = json?.summary || json?.data?.summary;

        setTransactions(txList);
        if (sum) {
          setSummary({
            totalIncome: sum.totalIncome || 0,
            totalExpense: sum.totalExpense || 0,
            netCashFlow: (sum.totalIncome || 0) - (sum.totalExpense || 0),
            transactionCount: sum.transactionCount || txList.length,
          });
        } else {
          // Tính toán thủ công nếu backend không trả summary
          let inc = 0;
          let exp = 0;
          txList.forEach((t: TransactionItem) => {
            if (t.transactionType === 'INCOME') inc += t.amount;
            else if (t.transactionType === 'EXPENSE') exp += t.amount;
          });
          setSummary({
            totalIncome: inc,
            totalExpense: exp,
            netCashFlow: inc - exp,
            transactionCount: txList.length,
          });
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth]);

  // Lọc giao dịch theo Tab & Tìm kiếm
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      // Lọc tab
      if (activeTab !== 'ALL' && t.transactionType !== activeTab) return false;
      // Lọc tìm kiếm
      if (query) {
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchCat = t.category?.name?.toLowerCase().includes(query);
        const matchAcc = t.accountName?.toLowerCase().includes(query);
        return matchDesc || matchCat || matchAcc;
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  // Gom nhóm giao dịch theo Ngày (DD/MM/YYYY)
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.transactionDate || 'Chưa xác định';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(tx);
    });

    return Array.from(map.entries()).map(([dateStr, items]) => {
      // Chuyển đổi định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
      let displayDate = dateStr;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Tính tổng dòng tiền trong ngày
      let dayTotal = 0;
      items.forEach((item) => {
        if (item.transactionType === 'INCOME') dayTotal += item.amount;
        else if (item.transactionType === 'EXPENSE') dayTotal -= item.amount;
      });

      return {
        dateStr,
        displayDate,
        dayTotal,
        items,
      };
    });
  }, [filteredTransactions]);

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const selectedMonthLabel = availableMonths.find((m) => m.key === selectedMonth)?.label || 'Tháng này';

  return (
    <View style={styles.screen}>
      {/* ── 1. HEADER XANH RỪNG SANG TRỌNG PHỦ TRÀN TAI THỎ ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Quản lý Thu & Chi</Text>

        {/* Nút chọn tháng lọc nhanh */}
        <Pressable
          onPress={() => setMonthModalVisible(true)}
          style={styles.monthBadgeBtn}
          hitSlop={8}
        >
          <Text style={styles.monthBadgeText}>{selectedMonthLabel}</Text>
          <Text style={styles.monthChevron}>⌄</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTransactions(true)}
            colors={['#00A86B']}
            tintColor="#00A86B"
          />
        }
      >
        {/* ── 2. CARDS TỔNG KẾT DÒNG TIỀN (THU NHẬP - CHI TIÊU - SỐ DƯ RÒNG) ── */}
        <View style={styles.summaryRibbon}>
          {/* Card Thu nhập */}
          <View style={[styles.summaryCard, styles.summaryCardIncome]}>
            <View style={styles.summaryCardTop}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#E6F4EA' }]}>
                <FinanceIcon name="income" size={16} color="#137333" />
              </View>
              <Text style={styles.summaryCardBadgeText}>Dòng tiền vào</Text>
            </View>
            <Text style={styles.summaryCardLabel}>TỔNG THU</Text>
            <Text style={styles.summaryCardValueIncome} numberOfLines={1}>
              +{formatVND(summary.totalIncome)} <Text style={styles.unitSmall}>đ</Text>
            </Text>
          </View>

          {/* Card Chi tiêu */}
          <View style={[styles.summaryCard, styles.summaryCardExpense]}>
            <View style={styles.summaryCardTop}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#FCE8E6' }]}>
                <FinanceIcon name="expense" size={16} color="#C5221F" />
              </View>
              <Text style={[styles.summaryCardBadgeText, { color: '#C5221F' }]}>Dòng tiền ra</Text>
            </View>
            <Text style={styles.summaryCardLabel}>TỔNG CHI</Text>
            <Text style={styles.summaryCardValueExpense} numberOfLines={1}>
              -{formatVND(summary.totalExpense)} <Text style={styles.unitSmall}>đ</Text>
            </Text>
          </View>
        </View>

        {/* Thẻ Thặng dư ròng */}
        <View style={styles.netCashflowCard}>
          <Text style={styles.netCashflowLabel}>THẶNG DƯ RÒNG (THU - CHI)</Text>
          <Text
            style={[
              styles.netCashflowValue,
              summary.netCashFlow >= 0 ? styles.netPositive : styles.netNegative,
            ]}
          >
            {summary.netCashFlow >= 0 ? '+' : ''}
            {formatVND(summary.netCashFlow)} đ
          </Text>
        </View>

        {/* ── 3. THANH TÌM KIẾM GIAO DỊCH ── */}
        <View style={styles.searchBarBox}>
          <Text style={styles.searchBarIcon}>⌕</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo nội dung, danh mục, tên ví..."
            placeholderTextColor="#94A3B8"
            style={styles.searchBarInput}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ── 4. TAB PHÂN LOẠI: TẤT CẢ | CHI TIÊU | THU NHẬP | CHUYỂN KHOẢN ── */}
        <View style={styles.tabsRow}>
          {(
            [
              ['ALL', 'Tất cả'],
              ['EXPENSE', 'Tiền chi'],
              ['INCOME', 'Tiền thu'],
              ['TRANSFER', 'Chuyển khoản'],
            ] as const
          ).map(([key, label]) => {
            const isSelected = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── 5. DANH SÁCH GIAO DỊCH GOM THEO NGÀY (GIAO DIỆN CHUẨN ĐẸP) ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00A86B" />
            <Text style={styles.loadingText}>Đang nạp danh sách giao dịch...</Text>
          </View>
        ) : groupedTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
            <Text style={styles.emptySub}>
              Không tìm thấy khoản thu chi nào trong {selectedMonthLabel}.
            </Text>
          </View>
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.dateStr} style={styles.dateGroupContainer}>
              {/* Header ngày */}
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupTitle}>{group.displayDate}</Text>
                <Text
                  style={[
                    styles.dateGroupTotal,
                    group.dayTotal >= 0 ? styles.colorIncome : styles.colorExpense,
                  ]}
                >
                  {group.dayTotal >= 0 ? '+' : ''}
                  {formatVND(group.dayTotal)} đ
                </Text>
              </View>

              {/* Danh sách các item trong ngày */}
              <View style={styles.dayItemsCard}>
                {group.items.map((tx, idx) => {
                  const isIncome = tx.transactionType === 'INCOME';
                  const isTransfer = tx.transactionType === 'TRANSFER';
                  const iconName = resolveCategoryIconName(
                    tx.category?.icon,
                    tx.transactionType,
                    tx.category?.name || tx.description
                  );

                  return (
                    <View key={tx.id || idx}>
                      <View style={styles.txRow}>
                        {/* Icon vuông bo góc mềm mại */}
                        <View
                          style={[
                            styles.txIconBox,
                            isIncome
                              ? styles.txIconBoxIncome
                              : isTransfer
                              ? styles.txIconBoxTransfer
                              : styles.txIconBoxExpense,
                          ]}
                        >
                          <FinanceIcon
                            name={iconName}
                            size={18}
                            color={
                              isIncome ? '#00A86B' : isTransfer ? '#0284C7' : '#E53E3E'
                            }
                          />
                        </View>

                        {/* Nội dung diễn giải + Nguồn ví */}
                        <View style={styles.txInfoCol}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.description || tx.category?.name || 'Giao dịch'}
                          </Text>
                          <View style={styles.txSubRow}>
                            <View
                              style={[
                                styles.txCatPill,
                                isIncome
                                  ? styles.txCatPillIncome
                                  : isTransfer
                                  ? styles.txCatPillTransfer
                                  : styles.txCatPillExpense,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txCatPillText,
                                  isIncome
                                    ? styles.colorIncome
                                    : isTransfer
                                    ? { color: '#0284C7' }
                                    : styles.colorExpense,
                                ]}
                              >
                                {isTransfer
                                  ? 'Chuyển khoản'
                                  : tx.category?.name || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                              </Text>
                            </View>
                            <Text style={styles.txAccountName} numberOfLines={1}>
                              {isTransfer
                                ? `${tx.accountName} → ${tx.toAccountName || 'Ví nhận'}`
                                : tx.accountName || 'Ví tiền mặt'}
                            </Text>
                          </View>
                        </View>

                        {/* Số tiền & giờ */}
                        <View style={styles.txAmountCol}>
                          <Text
                            style={[
                              styles.txAmountText,
                              isIncome
                                ? styles.colorIncome
                                : isTransfer
                                ? { color: '#0284C7' }
                                : styles.colorExpense,
                            ]}
                          >
                            {isIncome ? '+' : isTransfer ? '' : '-'}
                            {formatVND(tx.amount)} đ
                          </Text>
                          {tx.transactionTime ? (
                            <Text style={styles.txTimeText}>
                              {tx.transactionTime.slice(0, 5)}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {idx < group.items.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── NÚT TẠO GIAO DỊCH MỚI NỔI NỔI BẬT GÓC DƯỚI ── */}
      <Pressable
        onPress={onAddTransaction}
        style={({ pressed }) => [styles.floatingAddBtn, pressed && styles.floatingAddBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Thêm giao dịch mới"
      >
        <Text style={styles.floatingAddIcon}>+</Text>
        <Text style={styles.floatingAddText}>Thêm giao dịch</Text>
      </Pressable>

      {/* ── MODAL CHỌN THÁNG LỌC ── */}
      <Modal visible={monthModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTopTitle}>Chọn kỳ báo cáo / Tháng</Text>
              <Pressable onPress={() => setMonthModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }}>
              {availableMonths.map((m) => {
                const isSelected = selectedMonth === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setSelectedMonth(m.key);
                      setMonthModalVisible(false);
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
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#074838',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  monthBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  monthBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  monthChevron: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: -2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  summaryRibbon: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardIncome: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#10B981',
  },
  summaryCardExpense: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#F43F5E',
  },
  summaryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#137333',
  },
  summaryCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  summaryCardValueIncome: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 2,
  },
  summaryCardValueExpense: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#F43F5E',
    marginTop: 2,
  },
  unitSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  netCashflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netCashflowLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  netCashflowValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  netPositive: {
    color: '#059669',
  },
  netNegative: {
    color: '#DC2626',
  },
  searchBarBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarIcon: {
    fontSize: 20,
    color: '#94A3B8',
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 2,
  },
  tabButton: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabButtonActive: {
    backgroundColor: '#074838',
    borderColor: '#074838',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  dateGroupContainer: {
    marginTop: 4,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  dateGroupTotal: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayItemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconBoxIncome: {
    backgroundColor: '#E8F8F0',
  },
  txIconBoxExpense: {
    backgroundColor: '#FEE2E2',
  },
  txIconBoxTransfer: {
    backgroundColor: '#E0F2FE',
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCatPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCatPillIncome: {
    backgroundColor: '#E6F4EA',
  },
  txCatPillExpense: {
    backgroundColor: '#FCE8E6',
  },
  txCatPillTransfer: {
    backgroundColor: '#E0F2FE',
  },
  txCatPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  txAccountName: {
    fontSize: 11,
    color: '#64748B',
    flexShrink: 1,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  txTimeText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
  colorIncome: {
    color: '#00A86B',
  },
  colorExpense: {
    color: '#E53E3E',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 54,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    backgroundColor: '#00A86B',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#00A86B',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  floatingAddBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  floatingAddIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: -2,
  },
  floatingAddText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 26,
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
    fontWeight: '900',
    color: '#00A86B',
  },
});
