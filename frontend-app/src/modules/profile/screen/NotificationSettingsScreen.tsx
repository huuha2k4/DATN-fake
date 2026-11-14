import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFCFB" />

      {/* ── 1. TOP HEADER ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Pressable onPress={onBack} style={styles.headerIconButton} hitSlop={12}>
          <FinanceIcon name="chevron-left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
        <Pressable onPress={handleReset} style={styles.headerResetButton} hitSlop={8}>
          <FinanceIcon name="refresh" size={17} color="#047857" />
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
            style={styles.historyBannerCard}
            onPress={onViewNotificationsHistory}
          >
            <View style={styles.historyBannerLeft}>
              <View style={styles.historyIconCircle}>
                <FinanceIcon name="bell" size={18} color="#047857" />
              </View>
              <View>
                <Text style={styles.historyBannerTitle}>Lịch sử thông báo hệ thống</Text>
                <Text style={styles.historyBannerSub}>Xem lại tất cả tin nhắn và thông báo đã nhận</Text>
              </View>
            </View>
            <FinanceIcon name="arrow-right" size={16} color="#047857" />
          </Pressable>
        )}

        {/* ── NHÓM 1: LỊCH TÀI CHÍNH & KHOẢN NỢ ── */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeaderRow}>
            <View style={[styles.groupIconBox, { backgroundColor: '#ECFDF5' }]}>
              <FinanceIcon name="calendar" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle}>Lịch tài chính & Khoản nợ</Text>
              <Text style={styles.groupSub}>Nhắc nhở trước hạn và đúng ngày thanh toán</Text>
            </View>
          </View>

          {/* Toggle tổng */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Bật nhắc nhở lịch tài chính</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi tới lịch thu chi hoặc khoản nợ</Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(val) => updateSetting('remindersEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.remindersEnabled ? '#059669' : '#F1F5F9'}
            />
          </View>

          {settings.remindersEnabled && (
            <>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingTitle}>Nhắc nợ phải trả & Cho vay</Text>
                  <Text style={styles.settingDesc}>Báo hạn trả nợ hoặc nhắc người vay thanh toán</Text>
                </View>
                <Switch
                  value={settings.debtDueReminder}
                  onValueChange={(val) => updateSetting('debtDueReminder', val)}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={settings.debtDueReminder ? '#059669' : '#F1F5F9'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingTitle}>Lịch định kỳ (Tiền nhà, Lương, Hóa đơn)</Text>
                  <Text style={styles.settingDesc}>Nhắc các khoản chi tiêu / thu nhập lặp lại</Text>
                </View>
                <Switch
                  value={settings.scheduleDueReminder}
                  onValueChange={(val) => updateSetting('scheduleDueReminder', val)}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={settings.scheduleDueReminder ? '#059669' : '#F1F5F9'}
                />
              </View>

              <View style={styles.divider} />

              {/* Thời điểm nhắc trước */}
              <View style={{ paddingTop: 6 }}>
                <Text style={styles.miniLabel}>Thời gian nhắc nhở trước hạn:</Text>
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
                        settings.remindAdvanceDays === it.days && styles.choicePillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          settings.remindAdvanceDays === it.days && styles.choicePillTextActive,
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
        <View style={styles.groupCard}>
          <View style={styles.groupHeaderRow}>
            <View style={[styles.groupIconBox, { backgroundColor: '#EFF6FF' }]}>
              <FinanceIcon name="pie-chart" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle}>Ngân sách & Cảnh báo chi tiêu</Text>
              <Text style={styles.groupSub}>Bảo vệ hạn mức ngân sách và ngăn ngừa thâm hụt</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Bật cảnh báo hạn mức ngân sách</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi danh mục chi tiêu sắp hoặc đã vượt</Text>
            </View>
            <Switch
              value={settings.budgetAlertEnabled}
              onValueChange={(val) => updateSetting('budgetAlertEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.budgetAlertEnabled ? '#059669' : '#F1F5F9'}
            />
          </View>

          {settings.budgetAlertEnabled && (
            <>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingTitle}>Cảnh báo sớm khi chạm 80%</Text>
                  <Text style={styles.settingDesc}>Nhắc nhở nhẹ để kiểm soát chi tiêu trước khi hết tháng</Text>
                </View>
                <Switch
                  value={settings.budgetThreshold80}
                  onValueChange={(val) => updateSetting('budgetThreshold80', val)}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={settings.budgetThreshold80 ? '#059669' : '#F1F5F9'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingTitle}>Cảnh báo đỏ khi vượt 100%</Text>
                  <Text style={styles.settingDesc}>Thông báo khẩn cấp khi chi tiêu vượt ngân sách tháng</Text>
                </View>
                <Switch
                  value={settings.budgetThreshold100}
                  onValueChange={(val) => updateSetting('budgetThreshold100', val)}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={settings.budgetThreshold100 ? '#059669' : '#F1F5F9'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingTitle}>FinAI dự báo số dư thâm hụt</Text>
                  <Text style={styles.settingDesc}>Cảnh báo khi AI dự báo số dư cuối tháng có nguy cơ âm</Text>
                </View>
                <Switch
                  value={settings.balanceForecastAlert}
                  onValueChange={(val) => updateSetting('balanceForecastAlert', val)}
                  trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                  thumbColor={settings.balanceForecastAlert ? '#059669' : '#F1F5F9'}
                />
              </View>
            </>
          )}
        </View>

        {/* ── NHÓM 3: GIAO DỊCH & QUỸ NHÓM GIA ĐÌNH ── */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeaderRow}>
            <View style={[styles.groupIconBox, { backgroundColor: '#FDF2F8' }]}>
              <FinanceIcon name="users" size={18} color="#DB2777" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle}>Biến động số dư & Quỹ nhóm</Text>
              <Text style={styles.groupSub}>Cập nhật thu chi cá nhân và gia đình</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Thông báo ghi chép giao dịch</Text>
              <Text style={styles.settingDesc}>Xác nhận sau khi thêm giao dịch hoặc quét hóa đơn AI</Text>
            </View>
            <Switch
              value={settings.transactionSuccessNotify}
              onValueChange={(val) => updateSetting('transactionSuccessNotify', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.transactionSuccessNotify ? '#059669' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Chi tiêu trong nhóm & Ví con cái</Text>
              <Text style={styles.settingDesc}>Nhận tin nhắn khi thành viên thêm chi tiêu hoặc yêu cầu duyệt tiền</Text>
            </View>
            <Switch
              value={settings.groupExpenseNotify}
              onValueChange={(val) => updateSetting('groupExpenseNotify', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.groupExpenseNotify ? '#059669' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* ── NHÓM 4: BÁO CÁO TỔNG KẾT ĐỊNH KỲ ── */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeaderRow}>
            <View style={[styles.groupIconBox, { backgroundColor: '#FFFBEB' }]}>
              <FinanceIcon name="file-text" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle}>Báo cáo định kỳ</Text>
              <Text style={styles.groupSub}>Tổng kết dòng tiền và tỷ lệ tiết kiệm</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Báo cáo tuần (Chủ nhật hàng tuần)</Text>
              <Text style={styles.settingDesc}>Tóm tắt tổng chi tiêu và so sánh với tuần trước</Text>
            </View>
            <Switch
              value={settings.weeklyReportNotify}
              onValueChange={(val) => updateSetting('weeklyReportNotify', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.weeklyReportNotify ? '#059669' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Báo cáo tháng (Ngày cuối tháng)</Text>
              <Text style={styles.settingDesc}>Thống kê toàn diện tài sản ròng và phân tích thói quen chi tiêu</Text>
            </View>
            <Switch
              value={settings.monthlyReportNotify}
              onValueChange={(val) => updateSetting('monthlyReportNotify', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.monthlyReportNotify ? '#059669' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* ── NHÓM 5: ÂM THANH & RUNG ── */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeaderRow}>
            <View style={[styles.groupIconBox, { backgroundColor: '#F1F5F9' }]}>
              <FinanceIcon name="settings" size={18} color="#475569" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle}>Âm thanh & Phản hồi</Text>
              <Text style={styles.groupSub}>Tùy chỉnh chuông báo ứng dụng</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Âm thanh thông báo</Text>
              <Text style={styles.settingDesc}>Phát chuông khi có thông báo đẩy mới</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateSetting('soundEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.soundEnabled ? '#059669' : '#F1F5F9'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Rung khi có thông báo</Text>
              <Text style={styles.settingDesc}>Rung nhẹ khi thiết bị nhận thông báo quan trọng</Text>
            </View>
            <Switch
              value={settings.vibrateEnabled}
              onValueChange={(val) => updateSetting('vibrateEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={settings.vibrateEnabled ? '#059669' : '#F1F5F9'}
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

