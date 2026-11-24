import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert as Alert } from '../../../context/DialogContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { BirthDatePicker } from '../../core/components/BirthDatePicker';
import { userProfileApi, type UserProfileResponse } from '../api/userProfileApi';
import { AvatarPickerModal } from './AvatarPickerModal';
import { useAppTheme } from '../../../context/ThemeContext';

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
  const { isDark, colors: themeColors } = useAppTheme();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null
  );
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Sync khi mở modal
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setDateOfBirth(profile.dateOfBirth ? new Date(profile.dateOfBirth) : null);
    }
  }, [profile, visible]);

  const rawAvatar = profile?.avatarUrl;
  const avatarUri = userProfileApi.formatAvatarUrl(rawAvatar);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Họ và tên không được để trống.');
      return;
    }

    setLoading(true);
    try {
      let dobString: string | undefined = undefined;
      if (dateOfBirth) {
        const y = dateOfBirth.getFullYear();
        const m = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
        const d = String(dateOfBirth.getDate()).padStart(2, '0');
        dobString = `${y}-${m}-${d}`;
      }

      const updated = await userProfileApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dobString,
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
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? themeColors.background : '#FFFFFF'}
      />
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 14) + 4,
            backgroundColor: isDark ? themeColors.background : '#FFFFFF',
          },
        ]}
      >
        {/* Top Header */}
        <View
          style={[
            styles.topHeader,
            {
              backgroundColor: isDark ? themeColors.background : '#FFFFFF',
              borderBottomColor: isDark ? themeColors.cardBorder : '#E2E8F0',
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12} style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
            <FinanceIcon name="chevron-left" size={18} color={isDark ? themeColors.accentGreen : '#074838'} />
            <Text style={[styles.backBtnText, isDark && { color: themeColors.accentGreen }]}>Quay lại</Text>
          </Pressable>
          <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>Hồ sơ tài khoản</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
        >
          {/* Card Hero Avatar */}
          <View style={[styles.heroProfileCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarImgCircle, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.accentGreen }]}>
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
                style={[styles.avatarCameraBadge, isDark && { backgroundColor: themeColors.primary, borderColor: themeColors.surface }]}
              >
                <FinanceIcon name="camera" size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.heroMetaWrap}>
              <Text style={[styles.heroNameText, isDark && { color: themeColors.textPrimary }]}>{fullName || 'Người dùng Finora'}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.verifiedTag, isDark && { backgroundColor: '#064E3B', borderColor: '#059669' }]}>
                  <FinanceIcon name="shield" size={12} color={isDark ? themeColors.accentGreen : '#059669'} />
                  <Text style={[styles.verifiedTagText, isDark && { color: themeColors.accentGreen }]}>Đã xác thực</Text>
                </View>
                <View style={[styles.tierTag, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <Text style={[styles.tierTagText, isDark && { color: themeColors.accentGreen }]}>
                    ⭐ {profile?.subscriptionTier || 'Gói Tiêu Chuẩn'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── FORM THÔNG TIN ── */}
          <View style={[styles.formCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
            {/* Họ và tên */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.textSecondary }]}>Họ và tên *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên đầy đủ..."
                placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
              />
            </View>

            {/* Tên đăng nhập (Username) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isDark && { color: themeColors.textSecondary }]}>Tên đăng nhập (Username)</Text>
                <View style={[styles.lockBadge, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <FinanceIcon name="lock" size={10} color={isDark ? themeColors.textMuted : '#64748B'} />
                  <Text style={[styles.lockBadgeText, isDark && { color: themeColors.textMuted }]}>Cố định</Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  styles.readonlyInput,
                  isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textSecondary },
                ]}
                value={profile?.username || (profile?.email ? profile.email.split('@')[0] : '')}
                editable={false}
              />
              <Text style={[styles.fieldHelpText, isDark && { color: themeColors.textMuted }]}>
                Tên đăng nhập dùng cho định danh hệ thống và không thể thay đổi sau khi tạo.
              </Text>
            </View>

            {/* Email (Readonly) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isDark && { color: themeColors.textSecondary }]}>Địa chỉ Email</Text>
                <View style={[styles.lockBadge, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                  <FinanceIcon name="lock" size={10} color={isDark ? themeColors.textMuted : '#64748B'} />
                  <Text style={[styles.lockBadgeText, isDark && { color: themeColors.textMuted }]}>Đã liên kết</Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  styles.readonlyInput,
                  isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textSecondary },
                ]}
                value={profile?.email || ''}
                editable={false}
                placeholder="email@domain.com"
                placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
              />
              <Text style={[styles.fieldHelpText, isDark && { color: themeColors.textMuted }]}>
                Email dùng để đăng nhập và nhận mã OTP xác thực 2 bước.
              </Text>
            </View>

            {/* Số điện thoại */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.textSecondary }]}>Số điện thoại liên lạc</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder, color: themeColors.textPrimary },
                ]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="0912 345 678"
                placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
              />
            </View>

            {/* Ngày sinh */}
            <View style={styles.fieldGroup}>
              <BirthDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                label="Ngày sinh"
                placeholder="Chọn ngày sinh của bạn"
              />
            </View>
          </View>

          {/* Nút Lưu thay đổi */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [
              styles.saveBtn,
              isDark && { backgroundColor: themeColors.primary },
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
    backgroundColor: '#FFFFFF',
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
