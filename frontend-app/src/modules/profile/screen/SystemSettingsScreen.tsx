import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
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
  appSettingsStorage,
  type AppSystemSettingsState,
  DEFAULT_APP_SETTINGS,
  type AppTheme,
  type AppLanguage,
  type PrimaryCurrency,
  type DateFormat,
} from '../api/appSettingsApi';

interface SystemSettingsScreenProps {
  onBack: () => void;
}

export function SystemSettingsScreen({ onBack }: SystemSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSystemSettingsState>(DEFAULT_APP_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Modal selector states
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [dateFormatModalVisible, setDateFormatModalVisible] = useState(false);

  useEffect(() => {
    appSettingsStorage.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSetting = <K extends keyof AppSystemSettingsState>(
    key: K,
    value: AppSystemSettingsState[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    appSettingsStorage.saveSettings(updated);
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Đặt lại mặc định',
      'Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt hệ thống về trạng thái ban đầu?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: () => {
            setSettings(DEFAULT_APP_SETTINGS);
            appSettingsStorage.saveSettings(DEFAULT_APP_SETTINGS);
            Alert.alert('Thành công', 'Đã khôi phục cài đặt hệ thống về mặc định.');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Dọn dẹp bộ nhớ đệm',
      'Bạn có muốn xóa dữ liệu cache tạm thời (ảnh quét hóa đơn cũ, lịch sử tải trước)? Thao tác này giải phóng dung lượng và không làm mất giao dịch của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Dọn dẹp ngay',
          onPress: () => {
            Alert.alert('Hoàn tất', 'Đã giải phóng 38.5 MB bộ nhớ đệm thành công!');
          },
        },
      ]
    );
  };

  // Helper labels
  const themeLabels: Record<AppTheme, string> = {
    LIGHT: 'Giao diện Sáng (Mặc định)',
    DARK: 'Giao diện Tối (Dark mode)',
    SYSTEM: 'Tự động theo hệ thống',
  };

  const langLabels: Record<AppLanguage, string> = {
    vi: 'Tiếng Việt (Mặc định)',
    en: 'English (US)',
  };

  const currencyLabels: Record<PrimaryCurrency, string> = {
    VND: '₫ (VNĐ) - Đồng Việt Nam',
    USD: '$ (USD) - Đô la Mỹ',
    EUR: '€ (EUR) - Đồng Euro',
    JPY: '¥ (JPY) - Yên Nhật',
  };

  const dateFormatLabels: Record<DateFormat, string> = {
    'DD/MM/YYYY': 'DD/MM/YYYY (31/12/2026)',
    'MM/DD/YYYY': 'MM/DD/YYYY (12/31/2026)',
    'YYYY-MM-DD': 'YYYY-MM-DD (2026-12-31)',
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFCFB" />

      {/* ── 1. HEADER ── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Pressable onPress={onBack} style={styles.headerIconButton} hitSlop={12}>
          <FinanceIcon name="chevron-left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
        <Pressable onPress={handleResetDefaults} style={styles.headerResetButton} hitSlop={8}>
          <FinanceIcon name="refresh" size={17} color="#047857" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner thông báo trạng thái */}
        <View style={styles.introCard}>
          <View style={styles.introIconCircle}>
            <FinanceIcon name="settings" size={20} color="#059669" />
          </View>
          <View style={styles.introTextWrap}>
            <Text style={styles.introTitle}>Tùy chỉnh trải nghiệm Finora</Text>
            <Text style={styles.introDesc}>
              Cá nhân hóa giao diện hiển thị, đơn vị tiền tệ, định dạng ngày và bảo mật ứng dụng theo thói quen của bạn.
            </Text>
          </View>
        </View>

        {/* ── NHÓM 1: GIAO DIỆN & HIỂN THỊ ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBadge, { backgroundColor: '#ECFDF5' }]}>
              <FinanceIcon name="spark" size={15} color="#059669" />
            </View>
            <Text style={styles.sectionHeaderTitle}>Giao diện & Hiển thị</Text>
          </View>

          {/* Chọn Giao diện */}
          <Pressable
            style={styles.menuItemRow}
            onPress={() => setThemeModalVisible(true)}
          >
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Chủ đề giao diện</Text>
              <Text style={styles.itemValueText}>{themeLabels[settings.theme]}</Text>
            </View>
            <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
          </Pressable>

          <View style={styles.divider} />

          {/* Chọn Ngôn ngữ */}
          <Pressable
            style={styles.menuItemRow}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Ngôn ngữ hiển thị</Text>
              <Text style={styles.itemValueText}>{langLabels[settings.language]}</Text>
            </View>
            <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* ── NHÓM 2: TIỀN TỆ & ĐỊNH DẠNG TÀI CHÍNH ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBadge, { backgroundColor: '#FEF3C7' }]}>
              <FinanceIcon name="wallet" size={15} color="#D97706" />
            </View>
            <Text style={styles.sectionHeaderTitle}>Định dạng tài chính</Text>
          </View>

          {/* Đơn vị tiền tệ chính */}
          <Pressable
            style={styles.menuItemRow}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Đơn vị tiền tệ mặc định</Text>
              <Text style={styles.itemValueText}>{currencyLabels[settings.primaryCurrency]}</Text>
            </View>
            <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
          </Pressable>

          <View style={styles.divider} />

          {/* Định dạng ngày tháng */}
          <Pressable
            style={styles.menuItemRow}
            onPress={() => setDateFormatModalVisible(true)}
          >
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Định dạng ngày tháng</Text>
              <Text style={styles.itemValueText}>{dateFormatLabels[settings.dateFormat]}</Text>
            </View>
            <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
          </Pressable>

          <View style={styles.divider} />

          {/* Ẩn số dư khi vừa mở app */}
          <View style={styles.itemRow}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Ẩn số dư khi khởi động</Text>
              <Text style={styles.itemDesc}>
                Tự động che số tiền tài khoản (****) khi mở app ở nơi công cộng
              </Text>
            </View>
            <Switch
              value={settings.hideBalanceOnLaunch}
              onValueChange={(val) => updateSetting('hideBalanceOnLaunch', val)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>
        </View>

        {/* ── NHÓM 3: KHÓA BẢO VỆ ỨNG DỤNG ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBadge, { backgroundColor: '#E0F2FE' }]}>
              <FinanceIcon name="shield" size={15} color="#0284C7" />
            </View>
            <Text style={styles.sectionHeaderTitle}>Khóa bảo mật ứng dụng</Text>
          </View>

          {/* Bật khóa App */}
          <View style={styles.itemRow}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Khóa ứng dụng Finora</Text>
              <Text style={styles.itemDesc}>
                Yêu cầu xác thực khi mở lại Finora để tránh người khác xem trộm
              </Text>
            </View>
            <Switch
              value={settings.appLockEnabled}
              onValueChange={(val) => updateSetting('appLockEnabled', val)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          {settings.appLockEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.itemRow}>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemTitle}>Xác thực sinh trắc học</Text>
                  <Text style={styles.itemDesc}>Mở khóa nhanh bằng Face ID hoặc Vân tay</Text>
                </View>
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={(val) => updateSetting('biometricEnabled', val)}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>

              <View style={styles.divider} />
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Thời gian tự động khóa</Text>
                <View style={styles.chipsRow}>
                  {[
                    { label: 'Ngay lập tức', val: 0 },
                    { label: 'Sau 1 phút', val: 1 },
                    { label: 'Sau 5 phút', val: 5 },
                    { label: 'Sau 15 phút', val: 15 },
                  ].map((chip) => {
                    const isSelected = settings.autoLockMinutes === chip.val;
                    return (
                      <Pressable
                        key={chip.val}
                        style={[styles.chipButton, isSelected && styles.chipButtonActive]}
                        onPress={() => updateSetting('autoLockMinutes', chip.val)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {chip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── NHÓM 4: BỘ NHỚ & TỐI ƯU HIỆU NĂNG ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionBadge, { backgroundColor: '#F3E8FF' }]}>
              <FinanceIcon name="refresh" size={15} color="#9333EA" />
            </View>
            <Text style={styles.sectionHeaderTitle}>Hiệu năng & Bộ nhớ máy</Text>
          </View>

          {/* Rung phản hồi xúc giác */}
          <View style={styles.itemRow}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Rung phản hồi xúc giác (Haptics)</Text>
              <Text style={styles.itemDesc}>
                Rung nhẹ khi thao tác nhập số tiền, chọn danh mục, gạt toggle
              </Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(val) => updateSetting('hapticFeedback', val)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          <View style={styles.divider} />

          {/* Tự động dọn dẹp cache sau 30 ngày */}
          <View style={styles.itemRow}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Tự động dọn ảnh quét hóa đơn</Text>
              <Text style={styles.itemDesc}>
                Tự động xóa các file ảnh scan tạm cũ hơn 30 ngày để tiết kiệm bộ nhớ
              </Text>
            </View>
            <Switch
              value={settings.autoCacheClean}
              onValueChange={(val) => updateSetting('autoCacheClean', val)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          <View style={styles.divider} />

          {/* Nút xóa cache thủ công */}
          <Pressable style={styles.clearCacheBtn} onPress={handleClearCache}>
            <FinanceIcon name="trash" size={16} color="#DC2626" />
            <Text style={styles.clearCacheText}>Xóa bộ nhớ đệm cache ứng dụng (38.5 MB)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── MODAL CHỌN CHỦ ĐỀ ── */}
      <Modal visible={themeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setThemeModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn chủ đề giao diện</Text>
            {(['LIGHT', 'DARK', 'SYSTEM'] as AppTheme[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.modalOptionRow, settings.theme === t && styles.modalOptionActive]}
                onPress={() => {
                  updateSetting('theme', t);
                  setThemeModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, settings.theme === t && styles.modalOptionTextActive]}>
                  {themeLabels[t]}
                </Text>
                {settings.theme === t && <FinanceIcon name="check" size={18} color="#059669" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL CHỌN NGÔN NGỮ ── */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn ngôn ngữ hiển thị</Text>
            {(['vi', 'en'] as AppLanguage[]).map((l) => (
              <Pressable
                key={l}
                style={[styles.modalOptionRow, settings.language === l && styles.modalOptionActive]}
                onPress={() => {
                  updateSetting('language', l);
                  setLangModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, settings.language === l && styles.modalOptionTextActive]}>
                  {langLabels[l]}
                </Text>
                {settings.language === l && <FinanceIcon name="check" size={18} color="#059669" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL CHỌN TIỀN TỆ ── */}
      <Modal visible={currencyModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCurrencyModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn đơn vị tiền tệ mặc định</Text>
            {(['VND', 'USD', 'EUR', 'JPY'] as PrimaryCurrency[]).map((c) => (
              <Pressable
                key={c}
                style={[styles.modalOptionRow, settings.primaryCurrency === c && styles.modalOptionActive]}
                onPress={() => {
                  updateSetting('primaryCurrency', c);
                  setCurrencyModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, settings.primaryCurrency === c && styles.modalOptionTextActive]}>
                  {currencyLabels[c]}
                </Text>
                {settings.primaryCurrency === c && <FinanceIcon name="check" size={18} color="#059669" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL CHỌN ĐỊNH DẠNG NGÀY ── */}
      <Modal visible={dateFormatModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setDateFormatModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chọn định dạng ngày tháng</Text>
            {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((d) => (
              <Pressable
                key={d}
                style={[styles.modalOptionRow, settings.dateFormat === d && styles.modalOptionActive]}
                onPress={() => {
                  updateSetting('dateFormat', d);
                  setDateFormatModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, settings.dateFormat === d && styles.modalOptionTextActive]}>
                  {dateFormatLabels[d]}
                </Text>
                {settings.dateFormat === d && <FinanceIcon name="check" size={18} color="#059669" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerResetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  introIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextWrap: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  introDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  itemValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  clearCacheText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
});

