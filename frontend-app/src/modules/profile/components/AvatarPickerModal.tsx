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
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { userProfileApi } from '../api/userProfileApi';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

// Danh sách các Avatar chọn sẵn theo bộ nhận diện Finora & 3D hiện đại
export const PRESET_AVATARS = [
  {
    id: 'finora-ai',
    title: 'Fin AI Mascot',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    type: 'female',
  },
  {
    id: 'avatar-male-1',
    title: 'Doanh nhân trẻ',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    type: 'male',
  },
  {
    id: 'avatar-female-1',
    title: 'Chuyên gia tài chính',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    type: 'female',
  },
  {
    id: 'avatar-male-2',
    title: 'Nhà đầu tư cá nhân',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80',
    type: 'male',
  },
  {
    id: 'avatar-female-2',
    title: 'Thành viên năng động',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    type: 'female',
  },
  {
    id: 'avatar-male-3',
    title: 'Kỹ sư công nghệ',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    type: 'male',
  },
  {
    id: 'avatar-3d-boy',
    title: 'Phong cách 3D (Boy)',
    url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=400&auto=format&fit=crop&q=80',
    type: '3d',
  },
  {
    id: 'avatar-3d-girl',
    title: 'Phong cách 3D (Girl)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    type: '3d',
  },
];

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onAvatarUpdated: (newAvatarUrl: string | null) => void;
}

export function AvatarPickerModal({
  visible,
  onClose,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarPickerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang xử lý...');

  const formattedCurrent = userProfileApi.formatAvatarUrl(currentAvatarUrl);

  /**
   * Helper: Gửi file ảnh lên Spring Boot Backend (/api/v1/users/me/avatar) qua multipart/form-data
   * Sử dụng XMLHttpRequest chuẩn của React Native để tránh lỗi "Unsupported FormDataPart implementation" của Expo fetch
   */
  const uploadImageFileToBackend = async (uri: string, mimeType?: string, fileName?: string) => {
    const token = authStorage.getToken();
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');

    const name = fileName || `avatar_${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    const formData = new FormData();

    if (typeof window !== 'undefined' && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, name);
    } else {
      // @ts-ignore React Native FormData file convention
      formData.append('file', {
        uri,
        name,
        type,
      });
    }

    const updatedUser = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/users/me/avatar`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      // Không tự set Content-Type để XMLHttpRequest tự sinh boundary multipart

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res?.data || res);
          } else {
            reject(new Error(res?.message || `Lỗi tải lên (${xhr.status})`));
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({});
          } else {
            reject(new Error(`Máy chủ phản hồi lỗi HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải ảnh lên.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Quá thời gian tải ảnh lên máy chủ.'));
      };

      xhr.timeout = 60000;
      xhr.send(formData);
    });

    const finalAvatarUrl = updatedUser.avatarUrl || null;

    // Cập nhật lại local authStorage
    const currentUser = authStorage.getUser();
    if (currentUser) {
      authStorage.setAuth(
        {
          ...currentUser,
          avatarUrl: finalAvatarUrl,
        },
        {
          access_token: token,
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 3600,
        }
      );
    }

    onAvatarUpdated(finalAvatarUrl);
    Alert.alert('Thành công', 'Đã tải ảnh lên máy chủ và cập nhật ảnh đại diện thành công!');
    onClose();
  };

  /**
   * 1. CHỤP ẢNH MỚI TỪ CAMERA VÀ TẢI THẲNG XUỐNG BACKEND
   */
  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Quyền truy cập Camera',
          'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLoading(true);
        setLoadingText('Đang tải ảnh chụp lên máy chủ...');
        await uploadImageFileToBackend(asset.uri, asset.mimeType, asset.fileName || undefined);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chụp ảnh', err?.message || 'Không thể chụp ảnh vào lúc này.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2. CHỌN ẢNH TỪ THƯ VIỆN THIẾT BỊ VÀ TẢI THẲNG XUỐNG BACKEND
   */
  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Quyền truy cập Ảnh',
          'Vui lòng cấp quyền truy cập thư viện để chọn ảnh đại diện.'
        );
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
        setLoading(true);
        setLoadingText('Đang tải ảnh từ thiết bị lên máy chủ...');
        await uploadImageFileToBackend(asset.uri, asset.mimeType, asset.fileName || undefined);
      }
    } catch (err: any) {
      Alert.alert('Lỗi tải ảnh', err?.message || 'Không thể chọn ảnh từ thiết bị.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. CHỌN MẪU AVATAR CÓ SẴN (ĐỒNG BỘ QUA API PUT /users/me)
   */
  const handleSelectPreset = async (url: string) => {
    setSelectedPreset(url);
    setLoading(true);
    setLoadingText('Đang áp dụng ảnh đại diện...');
    try {
      const updated = await userProfileApi.updateProfile({
        avatarUrl: url,
      });
      onAvatarUpdated(updated.avatarUrl);
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới!');
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4. XÓA ẢNH ĐẠI DIỆN (GỌI API DELETE /users/me/avatar)
   */
  const handleDeleteAvatar = async () => {
    Alert.alert(
      'Xóa ảnh đại diện',
      'Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại trên hệ thống và quay về mặc định?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ảnh',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setLoadingText('Đang xóa ảnh trên máy chủ...');
            try {
              await userProfileApi.deleteAvatar();
              onAvatarUpdated(null);
              Alert.alert('Thành công', 'Đã xóa ảnh đại diện thành công');
              onClose();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa ảnh đại diện');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FinanceIcon name="camera" size={16} color="#047857" />
              </View>
              <Text style={styles.modalTitle}>Cập nhật ảnh đại diện</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* Thẻ hiển thị avatar hiện tại */}
            <View style={styles.previewBox}>
              <View style={styles.previewAvatarCircle}>
                {formattedCurrent ? (
                  <Image source={{ uri: formattedCurrent }} style={styles.previewImg} />
                ) : (
                  <Image
                    source={require('../../../assets/default-avatar.png')}
                    style={styles.previewImg}
                  />
                )}
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>Ảnh đại diện hiện tại</Text>
                <Text style={styles.previewSub}>
                  Chụp ảnh trực tiếp hoặc tải ảnh từ thiết bị lên máy chủ backend
                </Text>
              </View>
            </View>

            {/* ── 2 TÙY CHỌN TẢI LÊN & CHỤP ẢNH ĐẨY XUỐNG BACKEND ── */}
            <View style={styles.primaryActionRow}>
              {/* Nút 1: Chụp ảnh trực tiếp */}
              <Pressable
                onPress={handleTakePhoto}
                disabled={loading}
                style={({ pressed }) => [styles.primaryOptionBtn, pressed && styles.pressed]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#E8F8F0' }]}>
                  <FinanceIcon name="camera" size={22} color="#047857" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Chụp ảnh mới</Text>
                  <Text style={styles.optionDesc}>Mở camera chụp và tải lên máy chủ</Text>
                </View>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>

              {/* Nút 2: Tải lên từ bộ sưu tập thiết bị */}
              <Pressable
                onPress={handlePickFromGallery}
                disabled={loading}
                style={({ pressed }) => [styles.primaryOptionBtn, pressed && styles.pressed]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <FinanceIcon name="cloud" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Tải ảnh từ thiết bị lên</Text>
                  <Text style={styles.optionDesc}>Chọn từ thư viện ảnh máy và tải lên</Text>
                </View>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>
            </View>

            {/* Nút xóa ảnh nếu đang có avatar tùy chỉnh */}
            {formattedCurrent && (
              <View style={{ marginBottom: 14 }}>
                <Pressable
                  onPress={handleDeleteAvatar}
                  disabled={loading}
                  style={[styles.actionBtn, styles.deleteBtn]}
                >
                  <FinanceIcon name="trash" size={15} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Xóa ảnh đại diện hiện tại</Text>
                </Pressable>
              </View>
            )}

            {/* Bộ sưu tập Avatar có sẵn */}
            <Text style={styles.sectionHeading}>Hoặc chọn nhanh ảnh đại diện mẫu</Text>
            <Text style={styles.sectionSubtitle}>
              Chạm vào bất kỳ ảnh mẫu nào để cập nhật hồ sơ
            </Text>

            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((avatar) => {
                const isSelected =
                  currentAvatarUrl === avatar.url || selectedPreset === avatar.url;

                return (
                  <Pressable
                    key={avatar.id}
                    onPress={() => handleSelectPreset(avatar.url)}
                    disabled={loading}
                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  >
                    <Image source={{ uri: avatar.url }} style={styles.presetImage} />
                    {isSelected && (
                      <View style={styles.selectedTick}>
                        <FinanceIcon name="check" size={11} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles.presetName} numberOfLines={1}>
                      {avatar.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#047857" />
              <Text style={styles.loadingText}>{loadingText}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewAvatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#047857',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  previewSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  /* Primary Action Options */
  primaryActionRow: {
    gap: 10,
    marginBottom: 16,
  },
  primaryOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  optionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  optionChevron: {
    fontSize: 22,
    color: '#94A3B8',
    marginLeft: 4,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },

  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  presetCard: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  presetCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  presetImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  selectedTick: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  presetName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#047857',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
