import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { CreateChildWalletRequest, groupApi } from '../../api/groupApi';
import {
  OFFICIAL_KID_AVATARS,
  resolveKidAvatarSource,
  BOY_AVATAR_IMAGE,
  GIRL_AVATAR_IMAGE,
} from './kidAvatarPresets';

export interface CreateChildWalletModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onSubmit: (data: CreateChildWalletRequest) => Promise<void>;
}

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

export const CreateChildWalletModal: React.FC<CreateChildWalletModalProps> = ({
  visible,
  groupId,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();

  // 2 CHẾ ĐỘ VÍ CHUẨN BẢN WEB:
  // MODE_1: Bố mẹ tự quản lý & ghi chép (không cần tài khoản riêng)
  // MODE_2: Tạo tài khoản cho bé tự đăng nhập & ghi chi tiêu (Kids Mode)
  const [walletMode, setWalletMode] = useState<'MODE_1' | 'MODE_2'>('MODE_2');

  const [childName, setChildName] = useState('');
  const [childUsername, setChildUsername] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [weeklyAllowance, setWeeklyAllowance] = useState('');
  const [shareBalance, setShareBalance] = useState(true);

  // Avatar state: Mặc định chọn Bé Trai (kid_boy)
  const [selectedAvatarKey, setSelectedAvatarKey] = useState<string>('kid_boy');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Chọn ảnh từ thiết bị
  const handlePickCustomImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải avatar cho bé.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingAvatar(true);

        const fileName = asset.fileName || `kid_avatar_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        const uploaded = await groupApi.uploadMessageAttachment(groupId, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });

        if (uploaded && uploaded.fileKey) {
          setSelectedAvatarKey(uploaded.fileKey);
        } else {
          Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên máy chủ.');
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể chọn ảnh từ máy.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (!childName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên của bé');
      return;
    }

    if (walletMode === 'MODE_2') {
      if (!childUsername.trim()) {
        Alert.alert('Thông báo', 'Vui lòng đặt tên đăng nhập cho bé');
        return;
      }
      if (!childPassword || childPassword.length < 6) {
        Alert.alert('Thông báo', 'Mật khẩu đăng nhập của bé phải có ít nhất 6 ký tự');
        return;
      }
    }

    const balanceNum = parseInt(initialBalance.replace(/\D/g, '') || '0', 10);
    const allowanceNum = parseInt(weeklyAllowance.replace(/\D/g, '') || '0', 10);

    // Chuẩn hóa định dạng ngày sinh / năm sinh gửi lên Backend (LocalDate YYYY-MM-DD)
    let formattedDob: string | undefined = undefined;
    const trimmedDob = dateOfBirth.trim();
    if (trimmedDob) {
      if (/^\d{4}$/.test(trimmedDob)) {
        // Nếu chỉ nhập năm (VD: 2016) -> chuẩn hóa thành ngày 01/01/2016 để backend lưu LocalDate và tính tuổi chính xác
        formattedDob = `${trimmedDob}-01-01`;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDob)) {
        // Nếu nhập dạng DD/MM/YYYY -> chuyển sang YYYY-MM-DD
        const [d, m, y] = trimmedDob.split('/');
        formattedDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        formattedDob = trimmedDob;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        childName: childName.trim(),
        username: walletMode === 'MODE_2' ? childUsername.trim().toLowerCase() : undefined,
        password: walletMode === 'MODE_2' ? childPassword : undefined,
        avatarKey: selectedAvatarKey || undefined,
        dateOfBirth: formattedDob,
        balance: balanceNum,
        weeklyAllowance: allowanceNum,
        privacyLevel: shareBalance ? 'FULL_ACCESS' : 'PARENT_SUPERVISED',
      });
      // Reset form
      setChildName('');
      setChildUsername('');
      setChildPassword('');
      setDateOfBirth('');
      setInitialBalance('');
      setWeeklyAllowance('');
      setSelectedAvatarKey('kid_boy');
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi tạo ví', err?.message || 'Không thể tạo ví trẻ em');
    } finally {
      setSubmitting(false);
    }
  };

  const previewAvatarSource = resolveKidAvatarSource(selectedAvatarKey);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tạo ví trẻ em 👶</Text>
              <Text style={styles.subtitle}>Quản lý tiền tiêu vặt và giáo dục tài chính cho con</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={16} color="#64748B" />
            </Pressable>
          </View>

          {/* CHỌN LOẠI VÍ (2 CHẾ ĐỘ CHUẨN BẢN WEB) */}
          <View style={styles.modeSelectorCard}>
            <Pressable
              onPress={() => setWalletMode('MODE_2')}
              style={[styles.modeTab, walletMode === 'MODE_2' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, walletMode === 'MODE_2' && styles.modeTabTextActive]}>
                Tài khoản cho bé tự ghi
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setWalletMode('MODE_1')}
              style={[styles.modeTab, walletMode === 'MODE_1' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, walletMode === 'MODE_1' && styles.modeTabTextActive]}>
                Bố mẹ tự quản lý
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* PHẦN CHỌN VÀ HIỂN THỊ AVATAR CỦA BÉ */}
            <View style={styles.avatarSection}>
              <Text style={styles.label}>Ảnh đại diện của bé</Text>
              
              <View style={styles.avatarPreviewRow}>
                <View style={styles.avatarCircleWrap}>
                  <Image source={previewAvatarSource} style={styles.avatarPreviewImg} />
                  {uploadingAvatar && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.avatarHintTitle}>Chọn avatar cho bé</Text>
                  <Text style={styles.avatarHintSub}>
                    Chọn ảnh bé trai, bé gái hoặc tải ảnh riêng của con từ máy.
                  </Text>

                  <Pressable
                    onPress={handlePickCustomImage}
                    disabled={uploadingAvatar}
                    style={({ pressed }) => [styles.btnUploadImage, pressed && { opacity: 0.85 }]}
                  >
                    <FinanceIcon name="camera" size={14} color="#059669" />
                    <Text style={styles.btnUploadImageText}>
                      {uploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh khác từ máy'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Danh sách Avatar Bé Trai / Bé Gái chuẩn ảnh */}
              <Text style={styles.presetListTitle}>Chọn mẫu ảnh có sẵn:</Text>
              <View style={styles.officialAvatarRow}>
                {OFFICIAL_KID_AVATARS.map((preset) => {
                  const isSelected = selectedAvatarKey === preset.key;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => setSelectedAvatarKey(preset.key)}
                      style={[styles.officialAvatarCard, isSelected && styles.officialAvatarCardActive]}
                    >
                      <View style={styles.officialAvatarWrap}>
                        <Image source={preset.localSource} style={styles.officialAvatarImg} />
                        {isSelected && (
                          <View style={styles.presetCheckBadge}>
                            <FinanceIcon name="check" size={11} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.officialAvatarName, isSelected && styles.officialAvatarNameActive]}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Tên bé */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên của bé *</Text>
              <TextInput
                value={childName}
                onChangeText={setChildName}
                placeholder="VD: Bé Bo, Minh Đức, Gia Hân..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            {/* Mode 2: Thông tin đăng nhập cho bé (Kids Mode) */}
            {walletMode === 'MODE_2' && (
              <View style={styles.kidsModeBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 15 }}>🔑</Text>
                  <Text style={styles.kidsModeTitle}>Tài khoản đăng nhập của bé (Kids Mode)</Text>
                </View>
                <Text style={styles.kidsModeSub}>
                  Bé có thể tự đăng nhập trên máy riêng để xem số dư, xin tiền và ghi chép chi tiêu.
                </Text>

                <View style={{ gap: 8, marginTop: 4 }}>
                  <View>
                    <Text style={styles.labelSmall}>Tên đăng nhập của bé *</Text>
                    <TextInput
                      value={childUsername}
                      onChangeText={setChildUsername}
                      placeholder="VD: bebo2015, minhduc"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      style={styles.inputSmall}
                    />
                  </View>

                  <View>
                    <Text style={styles.labelSmall}>Mật khẩu của bé * (tối thiểu 6 ký tự)</Text>
                    <TextInput
                      value={childPassword}
                      onChangeText={setChildPassword}
                      placeholder="••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      style={styles.inputSmall}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Ngày sinh & Số dư ban đầu */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Năm sinh / Tuổi</Text>
                <TextInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="VD: 2014"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1.2 }]}>
                <Text style={styles.label}>Tiền ban đầu (₫)</Text>
                <TextInput
                  value={initialBalance ? formatVND(Number(initialBalance.replace(/\D/g, ''))) : ''}
                  onChangeText={(t) => setInitialBalance(t.replace(/\D/g, ''))}
                  placeholder="0 ₫"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Tiền tiêu vặt định kỳ */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiền tiêu vặt định kỳ hàng tuần (₫)</Text>
              <TextInput
                value={weeklyAllowance ? formatVND(Number(weeklyAllowance.replace(/\D/g, ''))) : ''}
                onChangeText={(t) => setWeeklyAllowance(t.replace(/\D/g, ''))}
                placeholder="VD: 50.000, 100.000 ₫"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            {/* Toggle chia sẻ số dư trong nhóm (Mode 1) */}
            {walletMode === 'MODE_1' && (
              <Pressable
                onPress={() => setShareBalance(!shareBalance)}
                style={styles.toggleRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Chia sẻ số dư với nhóm</Text>
                  <Text style={styles.toggleSub}>
                    Cho phép mọi thành viên trong nhóm nhìn thấy số dư của bé
                  </Text>
                </View>
                <View style={[styles.toggleCheckbox, shareBalance && styles.toggleCheckboxActive]}>
                  {shareBalance && <FinanceIcon name="check" size={12} color="#FFFFFF" />}
                </View>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Tạo ví cho bé</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSelectorCard: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  formScroll: {
    maxHeight: 520,
  },
  avatarSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  avatarCircleWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#10B981',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  avatarHintSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  btnUploadImage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 2,
  },
  btnUploadImageText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  presetListTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    marginBottom: 8,
  },
  officialAvatarRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  officialAvatarCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  officialAvatarCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  officialAvatarWrap: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  officialAvatarImg: {
    width: '100%',
    height: '100%',
  },
  officialAvatarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  officialAvatarNameActive: {
    color: '#059669',
    fontWeight: '800',
  },
  presetCheckBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0F172A',
  },
  kidsModeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  kidsModeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  kidsModeSub: {
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
    marginBottom: 6,
  },
  labelSmall: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  inputSmall: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  toggleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleCheckboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  submitBtn: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
