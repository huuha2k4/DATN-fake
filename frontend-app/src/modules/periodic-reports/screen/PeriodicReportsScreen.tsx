import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  periodicReportsApi,
  getFallbackReportData,
  type ReportSummaryData,
} from '../api/periodicReportsApi';
import { exportReportToExcelFile } from '../utils/exportReportHelper';
import { exportReportToPdfHtmlFile } from '../utils/exportReportPdfHelper';

interface PeriodicReportsScreenProps {
  onBack: () => void;
  initialPresetId?: 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR';
  initialFromDate?: string;
  initialToDate?: string;
}

type TabType = 'INCOME_EXPENSE' | 'CATEGORY' | 'COMPARISON';

export function PeriodicReportsScreen({
  onBack,
  initialPresetId,
  initialFromDate,
  initialToDate,
}: PeriodicReportsScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('INCOME_EXPENSE');

  // Helper tính khoảng thời gian động dựa trên ngày hiện tại
  const periodPresets = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // 1. Tuần này (Thứ 2 -> Chủ nhật)
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() + diffToMonday);
    const sundayThisWeek = new Date(mondayThisWeek);
    sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);

    // 2. Tuần trước
    const mondayLastWeek = new Date(mondayThisWeek);
    mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
    const sundayLastWeek = new Date(mondayLastWeek);
    sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);

    // 3. Tháng này
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 4. Tháng trước
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 5. Quý hiện tại
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const firstDayQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const lastDayQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

    // 6. Năm hiện tại
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    const lastDayYear = new Date(now.getFullYear(), 11, 31);

    const fmtDM = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

    return [
      {
        id: 'THIS_WEEK',
        label: `Tuần này (${fmtDM(mondayThisWeek)} → ${fmtDM(sundayThisWeek)})`,
        from: toYMD(mondayThisWeek),
        to: toYMD(sundayThisWeek),
        periodName: `${fmtDM(mondayThisWeek)} - ${fmtDM(sundayThisWeek)}`,
      },
      {
        id: 'LAST_WEEK',
        label: `Tuần trước (${fmtDM(mondayLastWeek)} → ${fmtDM(sundayLastWeek)})`,
        from: toYMD(mondayLastWeek),
        to: toYMD(sundayLastWeek),
        periodName: `${fmtDM(mondayLastWeek)} - ${fmtDM(sundayLastWeek)}`,
      },
      {
        id: 'THIS_MONTH',
        label: `Tháng này (${pad(now.getMonth() + 1)}/${now.getFullYear()})`,
        from: toYMD(firstDayThisMonth),
        to: toYMD(lastDayThisMonth),
        periodName: `Tháng ${pad(now.getMonth() + 1)}`,
      },
      {
        id: 'LAST_MONTH',
        label: `Tháng trước (${pad(firstDayLastMonth.getMonth() + 1)}/${firstDayLastMonth.getFullYear()})`,
        from: toYMD(firstDayLastMonth),
        to: toYMD(lastDayLastMonth),
        periodName: `Tháng ${pad(firstDayLastMonth.getMonth() + 1)}`,
      },
      {
        id: 'THIS_QUARTER',
        label: `Quý ${currentQuarter + 1} (${fmtDM(firstDayQuarter)} → ${fmtDM(lastDayQuarter)})`,
        from: toYMD(firstDayQuarter),
        to: toYMD(lastDayQuarter),
        periodName: `Quý ${currentQuarter + 1}`,
      },
      {
        id: 'THIS_YEAR',
        label: `Năm ${now.getFullYear()} (01/01 → 31/12)`,
        from: toYMD(firstDayYear),
        to: toYMD(lastDayYear),
        periodName: `Năm ${now.getFullYear()}`,
      },
    ];
  }, []);

  // Bộ lọc thời gian (ưu tiên khoảng thời gian hoặc preset được truyền từ thông báo, mặc định lấy tháng hiện tại)
  const initialRange = useMemo(() => {
    if (initialFromDate && initialToDate) {
      return { from: initialFromDate, to: initialToDate };
    }
    if (initialPresetId) {
      const found = periodPresets.find((p) => p.id === initialPresetId);
      if (found) {
        return { from: found.from, to: found.to };
      }
    }
    return { from: periodPresets[2].from, to: periodPresets[2].to };
  }, [initialPresetId, initialFromDate, initialToDate, periodPresets]);

  const [fromDate, setFromDate] = useState<string>(() => initialRange.from);
  const [toDate, setToDate] = useState<string>(() => initialRange.to);

  useEffect(() => {
    setFromDate(initialRange.from);
    setToDate(initialRange.to);
  }, [initialRange.from, initialRange.to]);

  // Bộ lọc tài khoản ví
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Dữ liệu báo cáo (khởi tạo sẵn fallback để không bao giờ bị trắng màn hình)
  const [reportData, setReportData] = useState<ReportSummaryData>(() => getFallbackReportData());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Nạp danh sách ví
  useEffect(() => {
    periodicReportsApi.getAccounts().then((accs) => {
      setAccounts(accs || []);
    });
  }, []);

  // Nạp dữ liệu báo cáo
  const loadData = async () => {
    try {
      const data = await periodicReportsApi.getReportData(fromDate, toDate, selectedAccountId);
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.warn('Lỗi nạp báo cáo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, selectedAccountId]);

  const formatVND = (num: number = 0) => {
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const selectedAccountInfo = useMemo(() => {
    if (selectedAccountId === 'ALL') {
      return {
        label: 'Tất cả ví',
        icon: 'wallet' as const,
        color: '#059669',
      };
    }
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return {
      label: acc ? acc.name : 'Tất cả ví',
      icon: (acc?.icon || 'wallet') as any,
      color: acc?.color || '#059669',
    };
  }, [selectedAccountId, accounts]);

  const selectedAccountLabel = selectedAccountInfo.label;

  const dateRangeDisplay = useMemo(() => {
    // 1. Kiểm tra xem có khớp với preset nào không
    const matched = periodPresets.find((p) => p.from === fromDate && p.to === toDate);
    if (matched) {
      if (matched.id === 'THIS_WEEK' || matched.id === 'LAST_WEEK') {
        const fromParts = fromDate.split('-');
        const toParts = toDate.split('-');
        return `${fromParts[2]}/${fromParts[1]} - ${toParts[2]}/${toParts[1]}`;
      }
      if (matched.id === 'THIS_MONTH' || matched.id === 'LAST_MONTH') {
        const parts = fromDate.split('-');
        return `Tháng ${parts[1]}/${parts[0]}`;
      }
      if (matched.id === 'THIS_QUARTER') {
        const fromParts = fromDate.split('-');
        const toParts = toDate.split('-');
        return `${fromParts[1]}/${fromParts[0]} - ${toParts[1]}/${toParts[0]}`;
      }
      if (matched.id === 'THIS_YEAR') {
        const parts = fromDate.split('-');
        return `Năm ${parts[0]}`;
      }
    }

    // 2. Tính toán khoảng ngày tùy chỉnh
    const fParts = fromDate.split('-');
    const tParts = toDate.split('-');
    if (fParts.length === 3 && tParts.length === 3) {
      // Cùng 1 tháng trọn vẹn (ngày 1 đến ngày cuối tháng)
      const fDate = new Date(fromDate);
      const tDate = new Date(toDate);
      const isStartOfMonth = fDate.getDate() === 1;
      const isEndOfMonth = new Date(tDate.getFullYear(), tDate.getMonth() + 1, 0).getDate() === tDate.getDate();

      if (fParts[0] === tParts[0] && fParts[1] === tParts[1] && isStartOfMonth && isEndOfMonth) {
        return `Tháng ${fParts[1]}/${fParts[0]}`;
      }

      // Khoảng nhiều tháng (VD 3 tháng: 08/2026 - 11/2026)
      if (isStartOfMonth && isEndOfMonth && (fParts[0] !== tParts[0] || fParts[1] !== tParts[1])) {
        return `${fParts[1]}/${fParts[0]} - ${tParts[1]}/${tParts[0]}`;
      }

      // Khoảng ngày ngắn (ví dụ theo tuần): dd/MM - dd/MM
      if (fParts[0] === tParts[0]) {
        return `${fParts[2]}/${fParts[1]} - ${tParts[2]}/${tParts[1]}`;
      }

      return `${fParts[2]}/${fParts[1]}/${fParts[0]} - ${tParts[2]}/${tParts[1]}/${tParts[0]}`;
    }

    return `${fromDate} - ${toDate}`;
  }, [fromDate, toDate, periodPresets]);

  const currentPeriodName = useMemo(() => {
    const matched = periodPresets.find((p) => p.from === fromDate && p.to === toDate);
    if (matched) {
      if (matched.id === 'THIS_WEEK' || matched.id === 'LAST_WEEK') {
        const fParts = fromDate.split('-');
        const tParts = toDate.split('-');
        return `${fParts[2]}/${fParts[1]} - ${tParts[2]}/${tParts[1]}`;
      }
      return matched.periodName.toUpperCase();
    }
    const fParts = fromDate.split('-');
    const tParts = toDate.split('-');
    if (fParts.length === 3 && tParts.length === 3) {
      if (fParts[0] === tParts[0] && fParts[1] === tParts[1]) {
        // Cùng tháng
        return `THÁNG ${fParts[1]}`;
      }
      return `${fParts[2]}/${fParts[1]} - ${tParts[2]}/${tParts[1]}`;
    }
    return 'BÁO CÁO';
  }, [fromDate, toDate, periodPresets]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFCFB" />

      {/* ── 1. TOP HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.headerIconBtn} hitSlop={12}>
          <FinanceIcon name="chevron-left" size={22} color="#047857" />
        </Pressable>
        <Text style={styles.headerTitle}>Báo cáo tài chính</Text>
        <Pressable
          style={styles.headerIconBtn}
          hitSlop={12}
          onPress={() => setExportModalVisible(true)}
        >
          <FinanceIcon name="share-2" size={20} color="#047857" />
        </Pressable>
      </View>

      {/* ── 2. THANH TAB NỀN XANH LÁ ĐẬM CHUẨN MẪU (Thu - Chi, Danh mục, So sánh) ── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabTrack}>
          <Pressable
            style={[styles.tabItem, activeTab === 'INCOME_EXPENSE' && styles.tabItemActive]}
            onPress={() => setActiveTab('INCOME_EXPENSE')}
          >
            <FinanceIcon
              name="arrows"
              size={15}
              color={activeTab === 'INCOME_EXPENSE' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'INCOME_EXPENSE' && styles.tabTextActive]}>
              Thu - Chi
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'CATEGORY' && styles.tabItemActive]}
            onPress={() => setActiveTab('CATEGORY')}
          >
            <FinanceIcon
              name="layers"
              size={15}
              color={activeTab === 'CATEGORY' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'CATEGORY' && styles.tabTextActive]}>
              Danh mục
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'COMPARISON' && styles.tabItemActive]}
            onPress={() => setActiveTab('COMPARISON')}
          >
            <FinanceIcon
              name="trending-up"
              size={15}
              color={activeTab === 'COMPARISON' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'COMPARISON' && styles.tabTextActive]}>
              So sánh
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── 3. THANH BỘ LỌC KỲ THỜI GIAN & TÀI KHOẢN VÍ ── */}
      <View style={styles.filterRow}>
        {/* Bộ chọn ngày */}
        <Pressable
          style={styles.filterPill}
          onPress={() => setDatePickerVisible(true)}
        >
          <FinanceIcon name="calendar" size={15} color="#059669" />
          <Text style={styles.filterPillText}>{dateRangeDisplay}</Text>
          <FinanceIcon name="chevron-down" size={14} color="#94A3B8" />
        </Pressable>

        {/* Bộ chọn ví */}
        <Pressable
          style={[styles.filterPill, { flex: 0.85 }]}
          onPress={() => setAccountPickerVisible(true)}
        >
          <FinanceIcon name={selectedAccountInfo.icon} size={15} color={selectedAccountInfo.color} />
          <Text style={styles.filterPillText} numberOfLines={1}>
            {selectedAccountLabel}
          </Text>
          <FinanceIcon name="chevron-down" size={14} color="#94A3B8" />
        </Pressable>
      </View>

      {/* ── 4. NỘI DUNG THEO TỪNG TAB ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Đang tổng hợp báo cáo tài chính...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: THU - CHI */}
          {activeTab === 'INCOME_EXPENSE' && reportData && (
            <TabThuChi report={reportData} formatVND={formatVND} dateRangeDisplay={dateRangeDisplay} />
          )}

          {/* TAB 2: DANH MỤC */}
          {activeTab === 'CATEGORY' && reportData && (
            <TabDanhMuc report={reportData} formatVND={formatVND} periodName={currentPeriodName} />
          )}

          {/* TAB 3: SO SÁNH */}
          {activeTab === 'COMPARISON' && reportData && (
            <TabSoSanh report={reportData} formatVND={formatVND} />
          )}
        </ScrollView>
      )}

      {/* ── MODAL CHỌN VÍ TÀI KHOẢN ── */}
      <Modal visible={accountPickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Chọn ví tài khoản</Text>
            
            {/* Tùy chọn: Tất cả ví */}
            <Pressable
              style={[
                styles.modalOptionRow,
                selectedAccountId === 'ALL' && styles.modalOptionActive,
              ]}
              onPress={() => {
                setSelectedAccountId('ALL');
                setAccountPickerVisible(false);
              }}
            >
              <View style={[styles.accIconBox, { backgroundColor: '#ECFDF5' }]}>
                <FinanceIcon name="wallet" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedAccountId === 'ALL' && styles.modalOptionTextActive,
                  ]}
                >
                  Tất cả ví
                </Text>
                <Text style={styles.modalOptionSub}>
                  {accounts.length} ví đang hoạt động
                </Text>
              </View>
              {selectedAccountId === 'ALL' && <FinanceIcon name="check" size={18} color="#059669" />}
            </Pressable>

            {/* Từng tài khoản ví cụ thể */}
            {accounts.map((acc) => {
              const accType = String(acc.accountType || '').toUpperCase();
              let iconName: any = 'wallet';
              let iconBg = '#F1F5F9';
              let iconColor = '#475569';

              if (acc.icon) {
                iconName = acc.icon;
              } else if (accType.includes('BANK') || String(acc.name).toLowerCase().includes('vietcombank') || String(acc.name).toLowerCase().includes('mbbank')) {
                iconName = 'bank';
                iconBg = '#EFF6FF';
                iconColor = '#2563EB';
              } else if (accType.includes('CREDIT') || String(acc.name).toLowerCase().includes('thẻ') || String(acc.name).toLowerCase().includes('tín dụng')) {
                iconName = 'credit-card';
                iconBg = '#FFFBEB';
                iconColor = '#D97706';
              } else if (accType.includes('CASH') || String(acc.name).toLowerCase().includes('tiền mặt')) {
                iconName = 'wallet';
                iconBg = '#ECFDF5';
                iconColor = '#059669';
              } else if (accType.includes('SAVING') || String(acc.name).toLowerCase().includes('tiết kiệm')) {
                iconName = 'piggy-bank';
                iconBg = '#FAF5FF';
                iconColor = '#9333EA';
              }

              return (
                <Pressable
                  key={acc.id}
                  style={[
                    styles.modalOptionRow,
                    selectedAccountId === acc.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedAccountId(acc.id);
                    setAccountPickerVisible(false);
                  }}
                >
                  <View style={[styles.accIconBox, { backgroundColor: iconBg }]}>
                    <FinanceIcon name={iconName} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedAccountId === acc.id && styles.modalOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {acc.name}
                    </Text>
                    <Text style={styles.modalOptionSub}>
                      Số dư: {formatVND(acc.balance || 0)}
                    </Text>
                  </View>
                  {selectedAccountId === acc.id && <FinanceIcon name="check" size={18} color="#059669" />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL CHỌN KỲ BÁO CÁO NHANH ── */}
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Chọn kỳ báo cáo</Text>
            {periodPresets.map((period) => (
              <Pressable
                key={period.id}
                style={[
                  styles.modalOptionRow,
                  fromDate === period.from && toDate === period.to && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setFromDate(period.from);
                  setToDate(period.to);
                  setDatePickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    fromDate === period.from && toDate === period.to && styles.modalOptionTextActive,
                  ]}
                >
                  {period.label}
                </Text>
                {fromDate === period.from && toDate === period.to && (
                  <FinanceIcon name="check" size={18} color="#059669" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      {/* ── MODAL XUẤT BÁO CÁO (EXCEL & PDF) ── */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setExportModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Chia sẻ & Xuất báo cáo</Text>
            <Text style={[styles.sectionCardSub, { textAlign: 'center', marginBottom: 16 }]}>
              Kỳ: {dateRangeDisplay} • {selectedAccountLabel}
            </Text>

            {/* Nút Xuất Excel */}
            <Pressable
              style={styles.exportOptionCard}
              onPress={() => {
                Alert.alert('Đang chuẩn bị dữ liệu', 'Đang tạo bảng tính Excel...');
                setExportModalVisible(false);
                setTimeout(async () => {
                  try {
                    const dataToExport = reportData || getFallbackReportData();
                    console.log('Bắt đầu chia sẻ Excel:', { dateRangeDisplay, selectedAccountLabel });
                    await exportReportToExcelFile(dataToExport, dateRangeDisplay, selectedAccountLabel);
                  } catch (err: any) {
                    Alert.alert('Lỗi xuất Excel', err?.message || 'Không thể chia sẻ file.');
                  }
                }, 400);
              }}
            >
              <View style={[styles.exportIconBox, { backgroundColor: '#ECFDF5' }]}>
                <FinanceIcon name="file-excel" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>Chia sẻ file Excel (.csv / .xlsx)</Text>
                <Text style={styles.exportOptionSub}>
                  Gửi qua Zalo, Gmail, Drive hoặc mở trên máy tính (đầy đủ bảng tổng hợp, danh mục, top chi tiêu theo chuẩn Web)
                </Text>
              </View>
              <FinanceIcon name="share-2" size={16} color="#059669" />
            </Pressable>

            {/* Nút Xuất PDF */}
            <Pressable
              style={styles.exportOptionCard}
              onPress={() => {
                Alert.alert('Đang chuẩn bị dữ liệu', 'Đang tạo tài liệu PDF...');
                setExportModalVisible(false);
                setTimeout(async () => {
                  try {
                    const dataToExport = reportData || getFallbackReportData();
                    console.log('Bắt đầu chia sẻ PDF:', { dateRangeDisplay, selectedAccountLabel });
                    await exportReportToPdfHtmlFile(dataToExport, dateRangeDisplay, selectedAccountLabel);
                  } catch (err: any) {
                    Alert.alert('Lỗi xuất PDF', err?.message || 'Không thể chia sẻ file.');
                  }
                }, 400);
              }}
            >
              <View style={[styles.exportIconBox, { backgroundColor: '#FEF2F2' }]}>
                <FinanceIcon name="file-text" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>Chia sẻ bản in PDF (.pdf / A4)</Text>
                <Text style={styles.exportOptionSub}>
                  Giao diện đồ họa Finora cao cấp, 4 thẻ KPI, bảng cơ cấu danh mục & đối chiếu biến động
                </Text>
              </View>
              <FinanceIcon name="share-2" size={16} color="#DC2626" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT TAB 1: THU - CHI
// ─────────────────────────────────────────────────────────────
function TabThuChi({
  report,
  formatVND,
  dateRangeDisplay,
}: {
  report: ReportSummaryData;
  formatVND: (n: number) => string;
  dateRangeDisplay?: string;
}) {
  // Tìm giá trị max để vẽ biểu đồ cột và các mốc trục Y
  const { maxBarValue, yAxisLabels } = useMemo(() => {
    let max = 100000;
    report.dailyTrend.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    // Làm tròn lên mốc chẵn
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const roundedMax = Math.ceil(max / magnitude) * magnitude;

    const formatAxis = (num: number) => {
      if (num >= 1000000) {
        const m = num / 1000000;
        return `${Number(m.toFixed(1))}M`;
      }
      if (num >= 1000) {
        const k = num / 1000;
        return `${Number(k.toFixed(0))}K`;
      }
      return `${num}`;
    };

    const labels = [
      formatAxis(roundedMax),
      formatAxis(roundedMax * 0.75),
      formatAxis(roundedMax * 0.5),
      formatAxis(roundedMax * 0.25),
      '0',
    ];

    return { maxBarValue: roundedMax, yAxisLabels: labels };
  }, [report.dailyTrend]);

  return (
    <>
      {/* 4 Thẻ chỉ số tổng quan 2x2 */}
      <View style={styles.grid2x2}>
        {/* Tổng thu nhập */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Tổng thu nhập</Text>
            <View style={[styles.arrowBadge, { backgroundColor: '#ECFDF5' }]}>
              <FinanceIcon name="arrow-up" size={12} color="#059669" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#047857' }]}>
            {formatVND(report.totalIncome)}
          </Text>
          <View style={styles.statCardFooter}>
            <View style={[styles.tinyDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.statCardSub}>Thu thực tế ghi nhận</Text>
          </View>
        </View>

        {/* Tổng chi tiêu */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Tổng chi tiêu</Text>
            <View style={[styles.arrowBadge, { backgroundColor: '#FEE2E2' }]}>
              <FinanceIcon name="arrow-down" size={12} color="#DC2626" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#DC2626' }]}>
            {formatVND(report.totalExpense)}
          </Text>
          <View style={styles.statCardFooter}>
            <Text style={styles.statCardSub}>
              Trung bình: {formatVND(report.averageDailyExpense)}/ngày
            </Text>
          </View>
        </View>

        {/* Dòng tiền ròng */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Dòng tiền ròng</Text>
            <View style={[styles.arrowBadge, { backgroundColor: '#ECFDF5' }]}>
              <FinanceIcon name="trending-up" size={12} color="#059669" />
            </View>
          </View>
          <Text
            style={[
              styles.statCardValue,
              { color: report.netCashFlow >= 0 ? '#047857' : '#DC2626' },
            ]}
          >
            {report.netCashFlow >= 0 ? '+' : ''}
            {formatVND(report.netCashFlow)}
          </Text>
          <View style={styles.pillBadgeSuccess}>
            <Text style={styles.pillBadgeSuccessText}>
              {report.netCashFlow >= 0 ? 'Thặng dư tích lũy' : 'Thâm hụt chi tiêu'}
            </Text>
          </View>
        </View>

        {/* Tỷ lệ tiết kiệm */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Tỷ lệ tiết kiệm</Text>
            <View style={[styles.arrowBadge, { backgroundColor: '#E0F2FE' }]}>
              <FinanceIcon name="shield" size={12} color="#0284C7" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#0F172A' }]}>
            {report.savingRate}%
          </Text>
          <View style={styles.statCardFooter}>
            <Text style={styles.statCardSub}>
              Tổng cộng: {report.transactionCount} giao dịch
            </Text>
          </View>
        </View>
      </View>

      {/* Thẻ FinAI Nhận định */}
      {report.aiInsight && (
        <View style={styles.aiInsightCard}>
          <View style={styles.aiIconCircle}>
            <FinanceIcon name="spark" size={16} color="#059669" />
          </View>
          <View style={styles.aiTextWrap}>
            <Text style={styles.aiInsightTitle}>FinAI Nhận định:</Text>
            <Text style={styles.aiInsightText}>{report.aiInsight.text}</Text>
          </View>
          <FinanceIcon name="chevron-right" size={16} color="#059669" />
        </View>
      )}

      {/* Thẻ Biểu đồ Cột Thu - Chi Theo Ngày */}
      <View style={styles.sectionCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.sectionCardTitle}>Biến động Thu - Chi Theo Ngày</Text>
            <Text style={styles.sectionCardSub}>{dateRangeDisplay || 'Kỳ đã chọn'}</Text>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.legendLabel}>Thu</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendLabel}>Chi</Text>
            </View>
          </View>
        </View>

        {/* Trục Y và Cột biểu đồ */}
        <View style={styles.barChartContainer}>
          {/* Cột trục Y */}
          <View style={styles.yAxisCol}>
            {yAxisLabels.map((yl, i) => (
              <Text key={i} style={styles.axisLabel}>{yl}</Text>
            ))}
          </View>

          {/* Khung vẽ các cặp cột */}
          <View style={styles.barsArea}>
            <View style={styles.gridLine} />
            <View style={[styles.gridLine, { top: '25%' }]} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { top: '75%' }]} />
            <View style={[styles.gridLine, { top: '100%' }]} />

            {/* KHI LÀ TUẦN (<= 7 ngày): Mỗi cột và nhãn ngày nằm chung 1 group để luôn thẳng tâm 100% */}
            {report.dailyTrend.length <= 7 ? (
              <View style={styles.weekBarsContainer}>
                {report.dailyTrend.map((d, idx) => {
                  const incomeH = Math.min(100, Math.max(0, (d.income / maxBarValue) * 100));
                  const expenseH = Math.min(100, Math.max(0, (d.expense / maxBarValue) * 100));
                  const isZero = d.income === 0 && d.expense === 0;

                  return (
                    <View key={idx} style={styles.weekBarGroup}>
                      <View style={styles.weekBarsPair}>
                        {d.income > 0 ? (
                          <View style={[styles.weekBarCol, { height: `${incomeH}%`, backgroundColor: '#059669' }]} />
                        ) : null}
                        {d.expense > 0 ? (
                          <View style={[styles.weekBarCol, { height: `${expenseH}%`, backgroundColor: '#DC2626' }]} />
                        ) : null}
                        {isZero && (
                          <View style={[styles.weekBarCol, { height: 2, backgroundColor: '#E2E8F0' }]} />
                        )}
                      </View>
                      <Text style={styles.weekXLabel}>{d.date}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              // KHI LÀ THÁNG (30 ngày): 30 cột thanh mảnh kèm 5 mốc ngày ngang ở đáy
              <>
                <View style={styles.barsFitRow}>
                  {report.dailyTrend.map((d, idx) => {
                    const incomeH = Math.min(100, Math.max(0, (d.income / maxBarValue) * 100));
                    const expenseH = Math.min(100, Math.max(0, (d.expense / maxBarValue) * 100));
                    const isZero = d.income === 0 && d.expense === 0;

                    return (
                      <View key={idx} style={styles.fitBarItem}>
                        <View style={styles.fitBarsPair}>
                          {d.income > 0 ? (
                            <View style={[styles.fitBarCol, { height: `${incomeH}%`, backgroundColor: '#059669' }]} />
                          ) : null}
                          {d.expense > 0 ? (
                            <View style={[styles.fitBarCol, { height: `${expenseH}%`, backgroundColor: '#DC2626' }]} />
                          ) : null}
                          {isZero && (
                            <View style={[styles.fitBarCol, { height: 2, backgroundColor: '#E2E8F0' }]} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.xAxisRow}>
                  {(() => {
                    if (report.dailyTrend.length === 0) return null;
                    const total = report.dailyTrend.length;
                    const indices = [
                      0,
                      Math.floor(total * 0.25),
                      Math.floor(total * 0.5),
                      Math.floor(total * 0.75),
                      total - 1,
                    ];
                    // Khử trùng lặp index nếu ít ngày
                    const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b);
                    return uniqueIndices.map((i) => {
                      const item = report.dailyTrend[i];
                      let label = item.date;
                      if (item.fullDate) {
                        const parts = item.fullDate.split('-');
                        if (parts.length === 3) {
                          label = `${parts[2]}/${parts[1]}`;
                        }
                      }
                      return (
                        <Text key={i} style={styles.xAxisLabelMonth}>
                          {label}
                        </Text>
                      );
                    });
                  })()}
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Danh sách 5 Khoản Chi Tiêu Lớn Nhất */}
      <View style={styles.sectionCard}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionCardTitle}>5 Khoản Chi Tiêu Lớn Nhất</Text>
          <Pressable style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <FinanceIcon name="chevron-right" size={14} color="#059669" />
          </Pressable>
        </View>

        <View style={styles.transactionsList}>
          {report.topTransactions.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>Không có khoản chi tiêu nào trong kỳ</Text>
            </View>
          ) : (
            report.topTransactions.map((tx, idx) => {
              // Màu nền mềm cho icon theo loại
              const getIconBgColor = (icon: string) => {
                switch (icon) {
                  case 'utensils': return '#FEF2F2';
                  case 'users': return '#F5F3FF';
                  case 'credit-card': return '#FFFBEB';
                  case 'car': return '#F0F9FF';
                  case 'home': return '#ECFDF5';
                  case 'piggy-bank': return '#FAF5FF';
                  default: return '#F1F5F9';
                }
              };

              const getIconColor = (icon: string) => {
                switch (icon) {
                  case 'utensils': return '#EF4444';
                  case 'users': return '#8B5CF6';
                  case 'credit-card': return '#F59E0B';
                  case 'car': return '#0EA5E9';
                  case 'home': return '#10B981';
                  case 'piggy-bank': return '#A855F7';
                  default: return '#64748B';
                }
              };

              return (
                <View key={tx.id || idx}>
                  {idx > 0 && <View style={styles.itemDivider} />}
                  <View style={styles.txRow}>
                    <View style={[styles.txIconBox, { backgroundColor: getIconBgColor(tx.icon) }]}>
                      <FinanceIcon name={tx.icon as any} size={18} color={getIconColor(tx.icon)} />
                    </View>
                    <View style={styles.txInfoWrap}>
                      <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                      <Text style={styles.txSub}>{tx.sub}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: '#DC2626' }]}>
                      -{formatVND(tx.amount)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT TAB 2: DANH MỤC
// ─────────────────────────────────────────────────────────────
function TabDanhMuc({
  report,
  formatVND,
  periodName = 'THÁNG NÀY',
}: {
  report: ReportSummaryData;
  formatVND: (n: number) => string;
  periodName?: string;
}) {
  const totalCatCount = report.categories.length;

  return (
    <>
      {/* Khối 1: Tỷ trọng cơ cấu chi tiêu & Donut Chart */}
      <View style={styles.sectionCard}>
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.sectionCardTitle}>Tỷ trọng cơ cấu chi tiêu</Text>
            <Text style={styles.sectionCardSub}>Phân bổ theo nhóm danh mục</Text>
          </View>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{totalCatCount} nhóm</Text>
          </View>
        </View>

        <View style={styles.donutLayoutRow}>
          {/* Donut Chart SVG */}
          <View style={styles.donutBox}>
            <Svg width={130} height={130} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="18" fill="none" />
              {/* Phác họa các lát tròn */}
              {(() => {
                const totalCatPercent = report.categories.reduce((acc, c) => acc + (c.percentage || 0), 0) || 100;
                let cumulativePercent = 0;
                const circumference = 2 * Math.PI * 38; // ~238.7
                return report.categories.map((c, idx) => {
                  const normalizedPercent = (c.percentage / totalCatPercent) * 100;
                  const strokeDasharray = `${(normalizedPercent / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                  cumulativePercent += normalizedPercent;

                  return (
                    <Circle
                      key={c.id || idx}
                      cx="50"
                      cy="50"
                      r="38"
                      stroke={c.color}
                      strokeWidth="18"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                    />
                  );
                });
              })()}
            </Svg>
            <View style={styles.donutCenterLabel}>
              <Text style={styles.donutCenterValue}>
                {Math.round(report.totalExpense / 1000)}k
              </Text>
              <Text style={styles.donutCenterSub}>{periodName}</Text>
            </View>
          </View>

          {/* Chú thích bên phải */}
          <View style={styles.donutLegendList}>
            {report.categories.map((c) => (
              <View key={c.id} style={styles.donutLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                <Text style={styles.donutLegendName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.donutLegendAmount}>
                  {formatVND(c.amount)} ({c.percentage}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Khối 2: Bảng thống kê chi tiết danh mục */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Bảng thống kê chi tiết danh mục</Text>
        <Text style={styles.sectionCardSub}>Số tiền, tỷ trọng, số lần chi và mức chi tiêu trung bình</Text>

        <View style={styles.tableWrap}>
          {/* Header Bảng */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>Danh mục</Text>
            <Text style={[styles.tableColHeader, { flex: 1.3, textAlign: 'right' }]}>Tổng chi</Text>
            <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center' }]}>Tỷ trọng</Text>
            <Text style={[styles.tableColHeader, { flex: 0.8, textAlign: 'center' }]}>Số lần</Text>
            <Text style={[styles.tableColHeader, { flex: 1.4, textAlign: 'right' }]}>TB / lần</Text>
          </View>

          {/* Dòng dữ liệu */}
          {report.categories.map((cat, idx) => (
            <View key={cat.id || idx}>
              <View style={styles.tableDataRow}>
                <View style={[styles.tableCatNameCell, { flex: 1.5 }]}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.tableCatText} numberOfLines={1}>{cat.name}</Text>
                </View>

                <Text style={[styles.tableAmountText, { flex: 1.3, textAlign: 'right' }]}>
                  -{formatVND(cat.amount)}
                </Text>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={styles.tablePctBadge}>
                    <Text style={styles.tablePctText}>{cat.percentage}.0%</Text>
                  </View>
                </View>

                <Text style={[styles.tableCountText, { flex: 0.8, textAlign: 'center' }]}>
                  {cat.count}
                </Text>

                <Text style={[styles.tableAvgText, { flex: 1.4, textAlign: 'right' }]}>
                  {formatVND(cat.avgPerTx)}
                </Text>
              </View>
              {idx < report.categories.length - 1 && <View style={styles.tableDivider} />}
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT TAB 3: SO SÁNH
// ─────────────────────────────────────────────────────────────
function TabSoSanh({ report, formatVND }: { report: ReportSummaryData; formatVND: (n: number) => string }) {
  const comp = report.comparison;

  return (
    <>
      {/* 3 Thẻ chỉ số so sánh kỳ trước */}
      <View style={styles.grid3Cols}>
        {/* Biến động thu nhập */}
        <View style={styles.compCard}>
          <Text style={styles.compCardLabel}>Biến động thu nhập</Text>
          <Text style={styles.compCardValue}>{formatVND(report.totalIncome)}</Text>
          {(() => {
            const incPct = comp?.incomeChangePercent || 0;
            const isInc = incPct > 0;
            const isDec = incPct < 0;
            return (
              <View
                style={[
                  styles.compChangePill,
                  { backgroundColor: isInc ? '#ECFDF5' : isDec ? '#FEE2E2' : '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.compChangeText,
                    { color: isInc ? '#059669' : isDec ? '#DC2626' : '#64748B' },
                  ]}
                >
                  {isInc ? `↑ +${incPct}%` : isDec ? `↓ -${Math.abs(incPct)}%` : '→ 0%'}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Biến động chi tiêu */}
        <View style={styles.compCard}>
          <Text style={styles.compCardLabel}>Biến động chi tiêu</Text>
          <Text style={styles.compCardValue}>{formatVND(report.totalExpense)}</Text>
          {(() => {
            const expPct = comp?.expenseChangePercent || 0;
            const isInc = expPct > 0;
            const isDec = expPct < 0;
            return (
              <View
                style={[
                  styles.compChangePill,
                  { backgroundColor: isInc ? '#FEE2E2' : isDec ? '#ECFDF5' : '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.compChangeText,
                    { color: isInc ? '#DC2626' : isDec ? '#059669' : '#64748B' },
                  ]}
                >
                  {isInc ? `↑ +${expPct}%` : isDec ? `↓ -${Math.abs(expPct)}%` : '→ 0%'}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Dòng tiền ròng */}
        <View style={styles.compCard}>
          <Text style={styles.compCardLabel}>Dòng tiền ròng</Text>
          <Text style={styles.compCardValue}>
            {report.netCashFlow >= 0 ? '+' : ''}
            {formatVND(report.netCashFlow)}
          </Text>
          <View style={[styles.compChangePill, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.compChangeText, { color: '#059669' }]}>
              ↑ Cải thiện
            </Text>
          </View>
        </View>
      </View>

      {/* Đối chiếu chi tiêu theo danh mục */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Đối chiếu chi tiêu theo danh mục</Text>
        <Text style={styles.sectionCardSub}>So sánh kỳ này với kỳ trước để đánh giá biến động</Text>

        <View style={styles.tableWrap}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { flex: 1.4 }]}>Danh mục</Text>
            <Text style={[styles.tableColHeader, { flex: 1.1, textAlign: 'right' }]}>Kỳ trước</Text>
            <Text style={[styles.tableColHeader, { flex: 1.1, textAlign: 'right' }]}>Kỳ này</Text>
            <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Chênh lệch</Text>
            <Text style={[styles.tableColHeader, { flex: 1.1, textAlign: 'right' }]}>% Biến động</Text>
          </View>

          {/* Table Rows */}
          {comp?.categoryComparisons.map((c, idx) => {
            const isIncrease = c.percentChange > 0;
            const isDecrease = c.percentChange < 0;

            return (
              <View key={c.id || idx}>
                <View style={styles.tableDataRow}>
                  <View style={[styles.tableCatNameCell, { flex: 1.4 }]}>
                    <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                    <Text style={styles.tableCatText} numberOfLines={1}>{c.name}</Text>
                  </View>

                  <Text style={[styles.tableCompAmount, { flex: 1.1, textAlign: 'right' }]}>
                    {formatVND(c.prevAmount)}
                  </Text>

                  <Text style={[styles.tableCompAmount, { flex: 1.1, textAlign: 'right', fontWeight: '700' }]}>
                    {formatVND(c.currentAmount)}
                  </Text>

                  <Text
                    style={[
                      styles.tableCompAmount,
                      {
                        flex: 1.2,
                        textAlign: 'right',
                        color: isIncrease ? '#DC2626' : isDecrease ? '#059669' : '#64748B',
                      },
                    ]}
                  >
                    {isIncrease ? '+' : isDecrease ? '-' : ''}
                    {formatVND(Math.abs(c.diffAmount))}
                  </Text>

                  <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
                    <View
                      style={[
                        styles.changePillSmall,
                        {
                          backgroundColor: isIncrease ? '#FEE2E2' : isDecrease ? '#ECFDF5' : '#F1F5F9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.changePillSmallText,
                          {
                            color: isIncrease ? '#DC2626' : isDecrease ? '#059669' : '#64748B',
                          },
                        ]}
                      >
                        {isIncrease
                          ? `↑ +${Math.abs(c.percentChange)}%`
                          : isDecrease
                          ? `↓ -${Math.abs(c.percentChange)}%`
                          : '→ 0%'}
                      </Text>
                    </View>
                  </View>
                </View>
                {idx < comp.categoryComparisons.length - 1 && <View style={styles.tableDivider} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* Khối Nhận xét so sánh */}
      <View style={styles.notesCard}>
        <View style={styles.notesHeaderRow}>
          <View style={styles.notesIconBox}>
            <FinanceIcon name="trending-up" size={16} color="#059669" />
          </View>
          <Text style={styles.notesTitle}>Nhận xét so sánh</Text>
        </View>

        <View style={styles.notesList}>
          {comp?.notes.map((note, idx) => (
            <View key={idx} style={styles.noteItemRow}>
              <View style={styles.noteBullet} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#047857',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  arrowBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  statCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tinyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statCardSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  pillBadgeSuccess: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillBadgeSuccessText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  aiInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  aiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextWrap: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  aiInsightText: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 140,
    marginTop: 6,
  },
  yAxisCol: {
    justifyContent: 'space-between',
    paddingRight: 8,
    alignItems: 'flex-end',
    width: 44,
  },
  axisLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },
  barsArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  weekBarsContainer: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  weekBarGroup: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  weekBarsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    height: 110,
    gap: 3,
  },
  weekBarCol: {
    width: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  weekXLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  barsFitRow: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fitBarItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  fitBarsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    height: 110,
    gap: 1,
  },
  fitBarCol: {
    flex: 1,
    maxWidth: 5,
    minWidth: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 2,
    width: '100%',
  },
  xAxisLabelMonth: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },
  xAxisLabelWeek: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  barsGroupRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  singleBarGroup: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 110,
  },
  barColumn: {
    width: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  xAxisLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 6,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  transactionsList: {
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  txIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfoWrap: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  txSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  badgeCount: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  donutLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  donutBox: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutCenterSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  donutLegendList: {
    flex: 1,
    gap: 8,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  donutLegendName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  donutLegendAmount: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  tableWrap: {
    marginTop: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  tableColHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableCatNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableCatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  tableAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  tablePctBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tablePctText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  tableCountText: {
    fontSize: 11,
    color: '#475569',
  },
  tableAvgText: {
    fontSize: 10,
    color: '#64748B',
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  grid3Cols: {
    flexDirection: 'row',
    gap: 8,
  },
  compCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compCardLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  compCardValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  compChangePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compChangeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tableCompAmount: {
    fontSize: 10,
    color: '#334155',
  },
  changePillSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changePillSmallText: {
    fontSize: 9,
    fontWeight: '700',
  },
  notesCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  notesIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  notesList: {
    gap: 6,
  },
  noteItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginTop: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  modalOptionActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalOptionTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  modalOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  accIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 4,
  },
  exportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  exportOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
});
