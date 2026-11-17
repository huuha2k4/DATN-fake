import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { userProfileApi, type UserProfileResponse } from '../api/userProfileApi';
import { AvatarPickerModal } from './AvatarPickerModal';

interface AccountInfoModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfileResponse | null;
  onUpdated: (updated: UserProfileResponse) => void;
}

export function AccountInfoModal({
  visible,
  onClose,
  profile,
  onUpdated,
}: AccountInfoModalProps) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [preferredCurrency, setPreferredCurrency] = useState('VND');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [language, setLanguage] = useState('vi-VN');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFO' | 'PREFERENCES'>('INFO');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Sync khi mở modal
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
    }
  }, [profile, visible]);

  const rawAvatar = profile?.avatarUrl;
  const avatarUri = userProfileApi.formatAvatarUrl(rawAvatar);

  const handleReset = () => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setPreferredCurrency('VND');
      setTimezone('Asia/Ho_Chi_Minh');
      setLanguage('vi-VN');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Họ và tên không được để trống.');
      return;
    }

    setLoading(true);
    try {
      const updated = await userProfileApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        preferredCurrency,
        timezone,
        language,
      });

      Alert.alert('Thành công', 'Đã lưu thay đổi hồ sơ tài khoản thành công!');
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu thay đổi vào lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 14) + 4 }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
            <FinanceIcon name="chevron-left" size={18} color="#074838" />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Hồ sơ tài khoản</Text>
          <Pressable onPress={handleReset} hitSlop={12} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Đặt lại</Text>
          </Pressable>
        </View>

        {/* Tab switch kiểu Web */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('INFO')}
            style={[styles.tabItem, activeTab === 'INFO' && styles.tabItemActive]}
          >
            <FinanceIcon name="user" size={14} color={activeTab === 'INFO' ? '#074838' : '#64748B'} />
            <Text style={[styles.tabItemText, activeTab === 'INFO' && styles.tabItemTextActive]}>
              Thông tin cá nhân
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('PREFERENCES')}
            style={[styles.tabItem, activeTab === 'PREFERENCES' && styles.tabItemActive]}
          >
            <FinanceIcon name="settings" size={14} color={activeTab === 'PREFERENCES' ? '#074838' : '#64748B'} />
            <Text style={[styles.tabItemText, activeTab === 'PREFERENCES' && styles.tabItemTextActive]}>
              Tùy chọn hiển thị
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
        >
          {/* Card Hero Avatar */}
          <View style={styles.heroProfileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarImgCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Image
                    source={require('../../../assets/default-avatar.png')}
                    style={styles.avatarImg}
                  />
                )}
              </View>
              <Pressable
                onPress={() => setShowAvatarPicker(true)}
                style={styles.avatarCameraBadge}
              >
                <FinanceIcon name="camera" size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.heroMetaWrap}>
              <Text style={styles.heroNameText}>{fullName || 'Người dùng Finora'}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.verifiedTag}>
                  <FinanceIcon name="shield" size={12} color="#059669" />
                  <Text style={styles.verifiedTagText}>Đã xác thực</Text>
                </View>
                <View style={styles.tierTag}>
                  <Text style={styles.tierTagText}>
                    ⭐ {profile?.subscriptionTier || 'Gói Tiêu Chuẩn'}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroIdText}>
                ID: {profile?.id ? `${profile.id.slice(0, 8)}...` : 'N/A'}
              </Text>
            </View>
          </View>

          {activeTab === 'INFO' ? (
            /* ── TAB 1: THÔNG TIN CÁ NHÂN ── */
            <View style={styles.formCard}>
              {/* Họ và tên */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên đầy đủ..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Tên đăng nhập (Username) */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Tên đăng nhập (Username)</Text>
                  <View style={styles.lockBadge}>
                    <FinanceIcon name="lock" size={10} color="#64748B" />
                    <Text style={styles.lockBadgeText}>Cố định</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.textInput, styles.readonlyInput]}
                  value={profile?.username || (profile?.email ? profile.email.split('@')[0] : '')}
                  editable={false}
                />
                <Text style={styles.fieldHelpText}>
                  Tên đăng nhập dùng cho định danh hệ thống và không thể thay đổi sau khi tạo.
                </Text>
              </View>

              {/* Email (Readonly) */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Địa chỉ Email</Text>
                  <View style={styles.lockBadge}>
                    <FinanceIcon name="lock" size={10} color="#64748B" />
                    <Text style={styles.lockBadgeText}>Đã liên kết</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.textInput, styles.readonlyInput]}
                  value={profile?.email || ''}
                  editable={false}
                  placeholder="email@domain.com"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.fieldHelpText}>
                  Email dùng để đăng nhập và nhận mã OTP xác thực 2 bước.
                </Text>
              </View>

              {/* Số điện thoại */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Số điện thoại liên lạc</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="0912 345 678"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          ) : (
            /* ── TAB 2: TÙY CHỌN HIỂN THỊ (CHUẨN WEB) ── */
            <View style={styles.formCard}>
              {/* Tiền tệ mặc định */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Đơn vị tiền tệ hiển thị</Text>
                <View style={styles.currencySelectCol}>
                  {[
                    { key: 'VND', label: 'VND (₫) - Việt Nam Đồng' },
                    { key: 'USD', label: 'USD ($) - Đô la Mỹ' },
                    { key: 'EUR', label: 'EUR (€) - Đồng Euro' },
                    { key: 'JPY', label: 'JPY (¥) - Yên Nhật' },
                  ].map((curr) => {
                    const isSel = preferredCurrency === curr.key;
                    return (
                      <Pressable
                        key={curr.key}
                        onPress={() => setPreferredCurrency(curr.key)}
                        style={[styles.selectOptionPill, isSel && styles.selectOptionPillActive]}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            isSel && styles.selectOptionTextActive,
                          ]}
                        >
                          {curr.label}
                        </Text>
                        {isSel && <FinanceIcon name="check" size={14} color="#074838" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Múi giờ hệ thống */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Múi giờ hệ thống</Text>
                <View style={styles.currencySelectCol}>
                  {[
                    { key: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (GMT+7)' },
                    { key: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
                    { key: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
                    { key: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
                  ].map((tz) => {
                    const isSel = timezone === tz.key;
                    return (
                      <Pressable
                        key={tz.key}
                        onPress={() => setTimezone(tz.key)}
                        style={[styles.selectOptionPill, isSel && styles.selectOptionPillActive]}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            isSel && styles.selectOptionTextActive,
                          ]}
                        >
                          {tz.label}
                        </Text>
                        {isSel && <FinanceIcon name="check" size={14} color="#074838" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Ngôn ngữ */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ngôn ngữ giao diện</Text>
                <View style={styles.currencySelectCol}>
                  {[
                    { key: 'vi-VN', label: 'Tiếng Việt (vi-VN)' },
                    { key: 'en-US', label: 'English (en-US)' },
                  ].map((lang) => {
                    const isSel = language === lang.key;
                    return (
                      <Pressable
                        key={lang.key}
                        onPress={() => setLanguage(lang.key)}
                        style={[styles.selectOptionPill, isSel && styles.selectOptionPillActive]}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            isSel && styles.selectOptionTextActive,
                          ]}
                        >
                          {lang.label}
                        </Text>
                        {isSel && <FinanceIcon name="check" size={14} color="#074838" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Nút Lưu thay đổi */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [
              styles.saveBtn,
              loading && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thay đổi hồ sơ</Text>
            )}
          </Pressable>
        </ScrollView>

        {/* Modal Chọn / Đổi ảnh đại diện */}
        <AvatarPickerModal
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          currentAvatarUrl={profile?.avatarUrl}
          onAvatarUpdated={(newAvatarUrl) => {
            if (profile) {
              const updatedProfile = { ...profile, avatarUrl: newAvatarUrl };
              onUpdated(updatedProfile);
            }
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#074838',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#074838',
  },
  tabItemText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#074838',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  /* Hero card */
  heroProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImgCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#059669',
    overflow: 'hidden',
    backgroundColor: '#E8F8F0',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#074838',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroMetaWrap: {
    flex: 1,
  },
  heroNameText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  tierTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  heroIdText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Form */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  readonlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  fieldHelpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Options list */
  currencySelectCol: {
    gap: 8,
    marginTop: 4,
  },
  selectOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  selectOptionPillActive: {
    borderColor: '#059669',
    backgroundColor: '#E8F8F0',
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  selectOptionTextActive: {
    color: '#074838',
    fontWeight: '800',
  },

  saveBtn: {
    backgroundColor: '#074838',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#074838',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
