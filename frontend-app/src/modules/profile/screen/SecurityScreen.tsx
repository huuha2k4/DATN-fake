import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { userProfileApi } from '../api/userProfileApi';
import { authStorage } from '../../auth/api/authApi';

interface SecurityScreenProps {
  onBack: () => void;
  userEmail?: string;
  onLogoutRequested?: () => void;
}

export function SecurityScreen({
  onBack,
  userEmail,
  onLogoutRequested,
}: SecurityScreenProps) {
  const insets = useSafeAreaInsets();

  // Trạng thái màn hình bên trong: 'OVERVIEW' | 'CHANGE_PASSWORD'
  const [currentView, setCurrentView] = useState<'OVERVIEW' | 'CHANGE_PASSWORD'>('OVERVIEW');

  // Form đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // Tùy chọn bảo mật nhanh (sinh trắc học, 2FA)
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlertEnabled, setLoginAlertEnabled] = useState(true);

  // Danh sách thiết bị đăng nhập từ server (đã gộp theo loại thiết bị)
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);

  // Hàm chuẩn hóa & phân loại thông minh thiết bị: Laptop/Máy tính, iPhone (iOS), Android
  const resolveDeviceCategory = (rawName?: string, rawDevId?: string) => {
    const text = `${rawName || ''} ${rawDevId || ''}`.toLowerCase();
    if (text.includes('iphone') || text.includes('ios') || text.includes('apple') || text.includes('ipad')) {
      return {
        type: 'IOS',
        name: 'Điện thoại Apple iPhone (iOS)',
        icon: '📱',
      };
    }
    if (text.includes('android') || text.includes('samsung') || text.includes('xiaomi') || text.includes('oppo') || text.includes('pixel') || text.includes('vivo')) {
      // Nhận diện hãng nếu có
      let brand = 'Android';
      if (text.includes('samsung')) brand = 'Samsung';
      else if (text.includes('xiaomi')) brand = 'Xiaomi';
      else if (text.includes('oppo')) brand = 'OPPO';
      else if (text.includes('vivo')) brand = 'Vivo';
      else if (text.includes('pixel')) brand = 'Google Pixel';
      return {
        type: 'ANDROID',
        name: `Điện thoại ${brand} (Android)`,
        icon: '📱',
      };
    }
    if (text.includes('web') || text.includes('chrome') || text.includes('windows') || text.includes('mac') || text.includes('pc') || text.includes('laptop')) {
      let os = 'Windows / Mac';
      if (text.includes('windows')) os = 'Windows';
      else if (text.includes('mac')) os = 'macOS';
      return {
        type: 'LAPTOP',
        name: `Máy tính / Laptop (${os})`,
        icon: '💻',
      };
    }
    // Mặc định
    return {
      type: 'OTHER',
      name: rawName || 'Thiết bị khác',
      icon: '💻',
    };
  };

  useEffect(() => {
    // 1. Nạp trạng thái 2FA và Cảnh báo đăng nhập từ thông tin profile
    userProfileApi.getProfile().then((data) => {
      if (data) {
        if (typeof data.mfaEnabled === 'boolean') {
          setTwoFactorEnabled(data.mfaEnabled);
        }
        if (typeof data.loginAlertEnabled === 'boolean') {
          setLoginAlertEnabled(data.loginAlertEnabled);
        }
      }
    });

    // 2. Nạp danh sách thiết bị
    setIsLoadingDevices(true);
    userProfileApi
      .getActiveDevices()
      .then((res) => {
        if (res && res.devices) {
          // Gộp các phiên đăng nhập cùng 1 loại thiết bị lại làm 1 dòng duy nhất, lấy thời gian mới nhất
          const groupMap: Record<string, any> = {};

          res.devices.forEach((dev: any) => {
            const cat = resolveDeviceCategory(dev.deviceName, dev.deviceId);
            const key = cat.type;

            const existing = groupMap[key];
            const devDate = dev.createdAt ? new Date(dev.createdAt).getTime() : 0;

            if (!existing || devDate > existing.timestamp) {
              groupMap[key] = {
                ...dev,
                type: cat.type,
                displayName: cat.name,
                icon: cat.icon,
                timestamp: devDate,
                sessionCount: (existing?.sessionCount || 0) + 1,
              };
            } else {
              groupMap[key].sessionCount = (groupMap[key].sessionCount || 1) + 1;
            }
          });

          setDeviceList(Object.values(groupMap));
        }
      })
      .finally(() => {
        setIsLoadingDevices(false);
      });
  }, []);

  const resetPassForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    setIsSubmittingPass(true);
    try {
      const res = await userProfileApi.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      Alert.alert('Thành công', res.message || 'Mật khẩu của bạn đã được cập nhật thành công!');
      resetPassForm();
      setCurrentView('OVERVIEW');
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể đổi mật khẩu, vui lòng kiểm tra lại');
    } finally {
      setIsSubmittingPass(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER THANH ĐIỀU HƯỚNG TRANG ── */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 14) + 4 }]}>
        <Pressable
          onPress={() => {
            if (currentView === 'CHANGE_PASSWORD') {
              resetPassForm();
              setCurrentView('OVERVIEW');
            } else {
              onBack();
            }
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={10}
        >
          <FinanceIcon name="chevron-left" size={20} color="#0F172A" />
        </Pressable>

        <Text style={styles.headerTitle}>
          {currentView === 'CHANGE_PASSWORD' ? 'Đổi mật khẩu' : 'Đăng nhập & Bảo mật'}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {currentView === 'OVERVIEW' ? (
            <>
              {/* 1. KHỐI TÀI KHOẢN ĐĂNG NHẬP */}
              <View style={styles.infoBannerCard}>
                <View style={styles.infoBannerIcon}>
                  <FinanceIcon name="user" size={19} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerLabel}>Tài khoản liên kết</Text>
                  <Text style={styles.infoBannerValue} numberOfLines={1}>
                    {userEmail || authStorage.getUser()?.email || 'Chưa cập nhật email'}
                  </Text>
                </View>
                <View style={styles.badgeActive}>
                  <Text style={styles.badgeActiveText}>Đã xác minh</Text>
                </View>
              </View>

              {/* 2. NHÓM BẢO MẬT MẬT KHẨU */}
              <Text style={styles.sectionTitle}>MẬT KHẨU & ĐĂNG NHẬP</Text>
              <View style={styles.menuCard}>
                <Pressable
                  onPress={() => setCurrentView('CHANGE_PASSWORD')}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: '#E8F8F0' }]}>
                    <FinanceIcon name="shield" size={17} color="#059669" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuRowTitle}>Đổi mật khẩu</Text>
                    <Text style={styles.menuRowSub}>Cập nhật mật khẩu định kỳ để an toàn</Text>
                  </View>
                  <Text style={styles.menuRowChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <View style={styles.menuRow}>
                  <View style={[styles.menuIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <FinanceIcon name="scan" size={17} color="#059669" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuRowTitle}>Mở khóa sinh trắc học</Text>
                    <Text style={styles.menuRowSub}>Vân tay / FaceID khi mở Finora</Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* 3. NHÓM BẢO VỆ NÂNG CAO */}
              <Text style={styles.sectionTitle}>BẢO VỆ NÂNG CAO</Text>
              <View style={styles.menuCard}>
                <View style={styles.menuRow}>
                  <View style={[styles.menuIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <FinanceIcon name="shield" size={17} color="#2563EB" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuRowTitle}>Xác thực 2 yếu tố (2FA)</Text>
                    <Text style={styles.menuRowSub}>Yêu cầu mã OTP qua Email khi đăng nhập máy lạ</Text>
                  </View>
                  <Switch
                    value={twoFactorEnabled}
                    onValueChange={async (val) => {
                      setTwoFactorEnabled(val);
                      try {
                        await userProfileApi.updateSecuritySettings({ twoFactorEnabled: val });
                        Alert.alert(
                          'Xác thực 2 bước (2FA)',
                          val
                            ? 'Đã BẬT xác thực 2 bước. Lần đăng nhập tiếp theo hệ thống sẽ gửi mã OTP xác nhận về Email của bạn.'
                            : 'Đã TẮT xác thực 2 bước.'
                        );
                      } catch (err: any) {
                        setTwoFactorEnabled(!val);
                        Alert.alert('Lỗi', err.message || 'Không thể cập nhật 2FA');
                      }
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.menuRow}>
                  <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <FinanceIcon name="bell" size={17} color="#D97706" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuRowTitle}>Cảnh báo đăng nhập lạ</Text>
                    <Text style={styles.menuRowSub}>Gửi thông báo khi có thiết bị mới truy cập</Text>
                  </View>
                  <Switch
                    value={loginAlertEnabled}
                    onValueChange={async (val) => {
                      setLoginAlertEnabled(val);
                      try {
                        await userProfileApi.updateSecuritySettings({ loginAlertEnabled: val });
                      } catch (err: any) {
                        setLoginAlertEnabled(!val);
                        Alert.alert('Lỗi', err.message || 'Không thể cập nhật cảnh báo');
                      }
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#D97706' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* 4. PHIÊN ĐĂNG NHẬP HIỆN TẠI & CÁC THIẾT BỊ KHÁC */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  THIẾT BỊ ĐÃ ĐĂNG NHẬP ({Math.max(deviceList.length, 1)})
                </Text>
                {isLoadingDevices && <ActivityIndicator size="small" color="#059669" />}
              </View>

              <View style={styles.menuCard}>
                {/* Thiết bị hiện tại */}
                <View style={styles.deviceRow}>
                  <View style={styles.deviceIconCircle}>
                    <Text style={{ fontSize: 18 }}>{Platform.OS === 'ios' ? '📱' : '📱'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>
                      {Platform.OS === 'ios' ? 'Điện thoại Apple iPhone (iOS)' : 'Điện thoại Android'}
                    </Text>
                    <Text style={styles.deviceSub}>Thiết bị này • Đang trực tuyến</Text>
                  </View>
                  <View style={styles.currentDeviceBadge}>
                    <Text style={styles.currentDeviceBadgeText}>Hiện tại</Text>
                  </View>
                </View>

                {/* Danh sách các loại thiết bị khác (đã gộp theo loại) */}
                {deviceList.map((dev, idx) => {
                  const currentPlatformType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
                  // Nếu trùng loại với thiết bị hiện tại và chỉ có 1 phiên thì không lặp lại
                  if (dev.type === currentPlatformType && dev.sessionCount <= 1) return null;

                  const createdDate = dev.createdAt ? new Date(dev.createdAt) : null;
                  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                  const timeFormatted = createdDate
                    ? `${pad(createdDate.getHours())}:${pad(createdDate.getMinutes())} • ${pad(createdDate.getDate())}/${pad(createdDate.getMonth() + 1)}/${createdDate.getFullYear()}`
                    : 'Gần đây';

                  return (
                    <React.Fragment key={dev.id || idx}>
                      <View style={styles.rowDivider} />
                      <View style={styles.deviceRow}>
                        <View style={[styles.deviceIconCircle, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={{ fontSize: 18 }}>{dev.icon || '💻'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.deviceName}>{dev.displayName}</Text>
                          <Text style={styles.deviceSub}>
                            Truy cập lần cuối: {timeFormatted}
                            {dev.sessionCount > 1 ? ` (${dev.sessionCount} phiên)` : ''}
                          </Text>
                        </View>
                        <View style={[styles.currentDeviceBadge, { backgroundColor: '#F8FAFC' }]}>
                          <Text style={[styles.currentDeviceBadgeText, { color: '#64748B' }]}>Đã lưu</Text>
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Thông báo cơ chế duy trì phiên */}
              <View style={styles.sessionPolicyNotice}>
                <FinanceIcon name="leaf" size={14} color="#059669" />
                <Text style={styles.sessionPolicyText}>
                  Finora duy trì phiên đăng nhập tự động. Tài khoản chỉ tự động đăng xuất nếu không truy cập app trong vòng 3 ngày liên tục.
                </Text>
              </View>

              {/* Nút Đăng xuất thiết bị */}
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Đăng xuất phiên làm việc',
                    'Bạn có muốn đăng xuất khỏi tài khoản trên thiết bị này?',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Đăng xuất',
                        style: 'destructive',
                        onPress: () => {
                          onLogoutRequested?.();
                        },
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [styles.logoutCardBtn, pressed && styles.pressed]}
              >
                <Text style={styles.logoutCardBtnText}>Đăng xuất khỏi thiết bị này</Text>
              </Pressable>
            </>
          ) : (
            /* VIEW: ĐỔI MẬT KHẨU */
            <View style={styles.formContainer}>
              <Text style={styles.formGuideText}>
                Mật khẩu mới cần dài ít nhất 6 ký tự, kết hợp chữ cái và số để đảm bảo độ an toàn cao nhất cho tài khoản của bạn.
              </Text>

              {/* Mật khẩu hiện tại */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu hiện tại *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showCurrentPass}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowCurrentPass(!showCurrentPass)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                  >
                    <Text style={{ fontSize: 13, color: '#047857', fontWeight: '700' }}>
                      {showCurrentPass ? 'Ẩn' : 'Hiện'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Mật khẩu mới */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu mới *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPass}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowNewPass(!showNewPass)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                  >
                    <Text style={{ fontSize: 13, color: '#047857', fontWeight: '700' }}>
                      {showNewPass ? 'Ẩn' : 'Hiện'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Xác nhận mật khẩu mới */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPass}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPass(!showConfirmPass)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                  >
                    <Text style={{ fontSize: 13, color: '#047857', fontWeight: '700' }}>
                      {showConfirmPass ? 'Ẩn' : 'Hiện'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* NÚT CẬP NHẬT MẬT KHẨU */}
              <Pressable
                onPress={handleChangePassword}
                disabled={isSubmittingPass}
                style={({ pressed }) => [
                  styles.primarySubmitBtn,
                  pressed && styles.pressed,
                  isSubmittingPass && { opacity: 0.7 },
                ]}
              >
                {isSubmittingPass ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primarySubmitBtnText}>Cập nhật mật khẩu</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  infoBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  infoBannerValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeActive: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeActiveText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuRowSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  menuRowChevron: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 4,
  },
  sessionPolicyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  sessionPolicyText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  deviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDotOnline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  deviceSub: {
    fontSize: 11,
    color: '#64748B',
  },
  currentDeviceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentDeviceBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  logoutCardBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  logoutCardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  /* FORM ĐỔI MẬT KHẨU */
  formContainer: {
    paddingTop: 4,
  },
  formGuideText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 11,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  primarySubmitBtn: {
    backgroundColor: '#047857',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primarySubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

