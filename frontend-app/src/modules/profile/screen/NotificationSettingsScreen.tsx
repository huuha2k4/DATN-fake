import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import { AppAlert as Alert } from '../../../context/DialogContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useAppTheme } from '../../../context/ThemeContext';
import {
  notificationSettingsStorage,
  type NotificationSettingsState,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../api/notificationSettingsApi';

interface NotificationSettingsScreenProps {
  onBack: () => void;
  onViewNotificationsHistory?: () => void;
}

export function NotificationSettingsScreen({
  onBack,
  onViewNotificationsHistory,
}: NotificationSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();
  const [settings, setSettings] = useState<NotificationSettingsState>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    notificationSettingsStorage.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSetting = <K extends keyof NotificationSettingsState>(
    key: K,
    value: NotificationSettingsState[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    notificationSettingsStorage.saveSettings(updated);
  };

  const handleReset = () => {
    Alert.alert(
      'Đặt lại mặc định',
      'Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt thông báo về trạng thái ban đầu?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: () => {
            setSettings(DEFAULT_NOTIFICATION_SETTINGS);
            notificationSettingsStorage.saveSettings(DEFAULT_NOTIFICATION_SETTINGS);
            Alert.alert('Thành công', 'Đã khôi phục cài đặt thông báo về mặc định.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, isDark && { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? themeColors.background : "#FAFCFB"} />

      {/* ── 1. TOP HEADER ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }, isDark && { backgroundColor: themeColors.surface, borderBottomColor: themeColors.cardBorder }]}>
        <Pressable
          onPress={onBack}
          style={[styles.headerIconButton, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          hitSlop={12}
        >
          <FinanceIcon name="chevron-left" size={24} color={isDark ? themeColors.textPrimary : "#0F172A"} />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Cài đặt thông báo</Text>
        <Pressable
          onPress={handleReset}
          style={[styles.headerResetButton, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
          hitSlop={8}
        >
          <FinanceIcon name="refresh" size={17} color={isDark ? themeColors.accentGreen : "#047857"} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner dẫn tới Hộp thư thông báo */}
        {onViewNotificationsHistory && (
          <Pressable
            style={[
              styles.historyBannerCard,
              isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder },
            ]}
            onPress={onViewNotificationsHistory}
          >
            <View style={styles.historyBannerLeft}>
              <View style={[styles.historyIconCircle, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
                <FinanceIcon name="bell" size={18} color={isDark ? '#34D399' : '#047857'} />
              </View>
              <View>
                <Text style={[styles.historyBannerTitle, isDark && { color: themeColors.textPrimary }]}>Lịch sử thông báo hệ thống</Text>
                <Text style={[styles.historyBannerSub, isDark && { color: themeColors.accentGreen }]}>Xem lại tất cả tin nhắn và thông báo đã nhận</Text>
              </View>
            </View>
            <FinanceIcon name="arrow-right" size={16} color={isDark ? themeColors.accentGreen : '#047857'} />
          </Pressable>
        )}

        {/* ── NHÓM 1: LỊCH TÀI CHÍNH & KHOẢN NỢ ── */}
        <View style={[styles.groupCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.groupHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
            <View style={[styles.groupIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5' }]}>
              <FinanceIcon name="calendar" size={18} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupTitle, isDark && { color: themeColors.textPrimary }]}>Lịch tài chính & Khoản nợ</Text>
              <Text style={[styles.groupSub, isDark && { color: themeColors.textSecondary }]}>Nhắc nhở trước hạn và đúng ngày thanh toán</Text>
            </View>
          </View>

          {/* Toggle tổng */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Bật nhắc nhở lịch tài chính</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Nhận thông báo khi tới lịch thu chi hoặc khoản nợ</Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(val) => updateSetting('remindersEnabled', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.remindersEnabled ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>

          {settings.remindersEnabled && (
            <>
              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Nhắc nợ phải trả & Cho vay</Text>
                  <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Báo hạn trả nợ hoặc nhắc người vay thanh toán</Text>
                </View>
                <Switch
                  value={settings.debtDueReminder}
                  onValueChange={(val) => updateSetting('debtDueReminder', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
                  thumbColor={settings.debtDueReminder ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
                />
              </View>

              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Lịch định kỳ (Tiền nhà, Lương, Hóa đơn)</Text>
                  <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Nhắc các khoản chi tiêu / thu nhập lặp lại</Text>
                </View>
                <Switch
                  value={settings.scheduleDueReminder}
                  onValueChange={(val) => updateSetting('scheduleDueReminder', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
                  thumbColor={settings.scheduleDueReminder ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
                />
              </View>

              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              {/* Thời điểm nhắc trước */}
              <View style={{ paddingTop: 6 }}>
                <Text style={[styles.miniLabel, isDark && { color: themeColors.textSecondary }]}>Thời gian nhắc nhở trước hạn:</Text>
                <View style={styles.pillsRow}>
                  {[
                    { days: 0, label: 'Đúng ngày' },
                    { days: 1, label: 'Trước 1 ngày' },
                    { days: 2, label: 'Trước 2 ngày' },
                    { days: 3, label: 'Trước 3 ngày' },
                  ].map((it) => (
                    <Pressable
                      key={it.days}
                      onPress={() => updateSetting('remindAdvanceDays', it.days)}
                      style={[
                        styles.choicePill,
                        isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                        settings.remindAdvanceDays === it.days && (isDark ? { backgroundColor: 'rgba(16, 185, 129, 0.16)', borderColor: themeColors.accentGreen } : styles.choicePillActive),
                      ]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          isDark && { color: themeColors.textSecondary },
                          settings.remindAdvanceDays === it.days && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.choicePillTextActive),
                        ]}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── NHÓM 2: NGÂN SÁCH & CẢNH BÁO BỘI CHI ── */}
        <View style={[styles.groupCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.groupHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
            <View style={[styles.groupIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF' }]}>
              <FinanceIcon name="pie-chart" size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupTitle, isDark && { color: themeColors.textPrimary }]}>Ngân sách & Cảnh báo chi tiêu</Text>
              <Text style={[styles.groupSub, isDark && { color: themeColors.textSecondary }]}>Bảo vệ hạn mức ngân sách và ngăn ngừa thâm hụt</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Bật cảnh báo hạn mức ngân sách</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Nhận thông báo khi danh mục chi tiêu sắp hoặc đã vượt</Text>
            </View>
            <Switch
              value={settings.budgetAlertEnabled}
              onValueChange={(val) => updateSetting('budgetAlertEnabled', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.budgetAlertEnabled ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>

          {settings.budgetAlertEnabled && (
            <>
              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Cảnh báo sớm khi chạm 80%</Text>
                  <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Nhắc nhở nhẹ để kiểm soát chi tiêu trước khi hết tháng</Text>
                </View>
                <Switch
                  value={settings.budgetThreshold80}
                  onValueChange={(val) => updateSetting('budgetThreshold80', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
                  thumbColor={settings.budgetThreshold80 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
                />
              </View>

              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Cảnh báo đỏ khi vượt 100%</Text>
                  <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Thông báo khẩn cấp khi chi tiêu vượt ngân sách tháng</Text>
                </View>
                <Switch
                  value={settings.budgetThreshold100}
                  onValueChange={(val) => updateSetting('budgetThreshold100', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
                  thumbColor={settings.budgetThreshold100 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
                />
              </View>

              <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>FinAI dự báo số dư thâm hụt</Text>
                  <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Cảnh báo khi AI dự báo số dư cuối tháng có nguy cơ âm</Text>
                </View>
                <Switch
                  value={settings.balanceForecastAlert}
                  onValueChange={(val) => updateSetting('balanceForecastAlert', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
                  thumbColor={settings.balanceForecastAlert ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
                />
              </View>
            </>
          )}
        </View>

        {/* ── NHÓM 3: GIAO DỊCH & QUỸ NHÓM GIA ĐÌNH ── */}
        <View style={[styles.groupCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.groupHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
            <View style={[styles.groupIconBox, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.16)' : '#FDF2F8' }]}>
              <FinanceIcon name="users" size={18} color={isDark ? '#F472B6' : '#DB2777'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupTitle, isDark && { color: themeColors.textPrimary }]}>Biến động số dư & Quỹ nhóm</Text>
              <Text style={[styles.groupSub, isDark && { color: themeColors.textSecondary }]}>Cập nhật thu chi cá nhân và gia đình</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Thông báo ghi chép giao dịch</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Xác nhận sau khi thêm giao dịch hoặc quét hóa đơn AI</Text>
            </View>
            <Switch
              value={settings.transactionSuccessNotify}
              onValueChange={(val) => updateSetting('transactionSuccessNotify', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.transactionSuccessNotify ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>

          <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Chi tiêu trong nhóm & Ví con cái</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Nhận tin nhắn khi thành viên thêm chi tiêu hoặc yêu cầu duyệt tiền</Text>
            </View>
            <Switch
              value={settings.groupExpenseNotify}
              onValueChange={(val) => updateSetting('groupExpenseNotify', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.groupExpenseNotify ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>
        </View>

        {/* ── NHÓM 4: BÁO CÁO TỔNG KẾT ĐỊNH KỲ ── */}
        <View style={[styles.groupCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.groupHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
            <View style={[styles.groupIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB' }]}>
              <FinanceIcon name="file-text" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupTitle, isDark && { color: themeColors.textPrimary }]}>Báo cáo định kỳ</Text>
              <Text style={[styles.groupSub, isDark && { color: themeColors.textSecondary }]}>Tổng kết dòng tiền và tỷ lệ tiết kiệm</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Báo cáo tuần (Chủ nhật hàng tuần)</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Tóm tắt tổng chi tiêu và so sánh với tuần trước</Text>
            </View>
            <Switch
              value={settings.weeklyReportNotify}
              onValueChange={(val) => updateSetting('weeklyReportNotify', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.weeklyReportNotify ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>

          <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Báo cáo tháng (Ngày cuối tháng)</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Thống kê toàn diện tài sản ròng và phân tích thói quen chi tiêu</Text>
            </View>
            <Switch
              value={settings.monthlyReportNotify}
              onValueChange={(val) => updateSetting('monthlyReportNotify', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.monthlyReportNotify ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>
        </View>

        {/* ── NHÓM 5: ÂM THANH & RUNG ── */}
        <View style={[styles.groupCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.groupHeaderRow, isDark && { borderBottomColor: themeColors.divider }]}>
            <View style={[styles.groupIconBox, { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.16)' : '#F1F5F9' }]}>
              <FinanceIcon name="settings" size={18} color={isDark ? '#94A3B8' : '#475569'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupTitle, isDark && { color: themeColors.textPrimary }]}>Âm thanh & Phản hồi</Text>
              <Text style={[styles.groupSub, isDark && { color: themeColors.textSecondary }]}>Tùy chỉnh chuông báo ứng dụng</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Âm thanh thông báo</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Phát chuông khi có thông báo đẩy mới</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateSetting('soundEnabled', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.soundEnabled ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>

          <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.settingTitle, isDark && { color: themeColors.textPrimary }]}>Rung khi có thông báo</Text>
              <Text style={[styles.settingDesc, isDark && { color: themeColors.textSecondary }]}>Rung nhẹ khi thiết bị nhận thông báo quan trọng</Text>
            </View>
            <Switch
              value={settings.vibrateEnabled}
              onValueChange={(val) => updateSetting('vibrateEnabled', val)}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#059669' : '#A7F3D0' }}
              thumbColor={settings.vibrateEnabled ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#F1F5F9')}
            />
          </View>
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  headerResetButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  historyBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14,
  },
  historyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyBannerSub: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 1,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  groupIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  groupSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  settingTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 6,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  choicePillActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  choicePillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
});

