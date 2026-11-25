import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { authStorage, API_BASE_URL } from '../../auth/api/authApi';
import { userProfileApi } from '../../profile/api/userProfileApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { BirthDatePicker } from '../../core/components/BirthDatePicker';

interface CompleteProfileModalProps {
  visible: boolean;
  onSuccess: () => void;
  onSkip?: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  visible,
  onSuccess,
  onSkip,
}) => {
  const currentUser = authStorage.getUser();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(currentUser?.avatarUrl || null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(true);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.username) setUsername(currentUser.username);
      if (currentUser.avatarUrl) setAvatarUri(currentUser.avatarUrl);
      if (currentUser.dateOfBirth) setDateOfBirth(currentUser.dateOfBirth);
    }
  }, [currentUser]);

  if (!visible) return null;

  // Kiểm tra độ mạnh mật khẩu
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '#CBD5E1' };
    if (password.length < 6) return { level: 1, text: 'Mật khẩu yếu', color: '#EF4444' };
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    if (password.length >= 8 && hasLetter && hasNumber && hasSpecial) {
      return { level: 3, text: 'Mật khẩu mạnh', color: '#10B981' };
    }
    if (password.length >= 6 && ((hasLetter && hasNumber) || (hasLetter && hasSpecial))) {
      return { level: 2, text: 'Mật khẩu vừa', color: '#F59E0B' };
    }
    return { level: 1, text: 'Mật khẩu yếu', color: '#EF4444' };
  };

  const strength = getPasswordStrength();

  // Validate username
  const handleUsernameChange = (text: string) => {
    const formatted = text.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(formatted);

    if (formatted.length < 4 || formatted.length > 20) {
      setIsUsernameValid(false);
      setUsernameError('Tên đăng nhập từ 4–20 ký tự');
    } else {
      setIsUsernameValid(true);
      setUsernameError(null);
    }
  };

  // Chọn avatar từ thư viện ảnh
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setAvatarUri(localUri);
        // Upload avatar
        setLoading(true);
        try {
          const uploaded = await userProfileApi.uploadAvatar({
            uri: localUri,
            name: `avatar_${Date.now()}.jpg`,
            type: 'image/jpeg',
          });
          if (uploaded.avatarUrl) {
            setAvatarUri(uploaded.avatarUrl);
          }
        } catch (e: any) {
          Alert.alert('Lỗi', e?.message || 'Không thể tải ảnh đại diện lên');
        } finally {
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.log('Pick avatar error:', err);
    }
  };

  // Format ngày sinh khi nhập (DD/MM/YYYY)
  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDateOfBirth(formatted);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên hiển thị');
      return;
    }
    if (!username.trim() || username.length < 4) {
      Alert.alert('Thông báo', 'Tên đăng nhập phải từ 4-20 ký tự (không dấu, không khoảng trắng)');
      return;
    }
    if (password && password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password && password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp');
      return;
    }

    // Format dateOfBirth sang YYYY-MM-DD nếu có dạng DD/MM/YYYY
    let formattedDob: string | undefined = undefined;
    if (dateOfBirth && dateOfBirth.includes('/')) {
      const parts = dateOfBirth.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        formattedDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (dateOfBirth && dateOfBirth.includes('-')) {
      formattedDob = dateOfBirth;
    }

    setLoading(true);
    try {
      await userProfileApi.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim() ? password.trim() : undefined,
        dateOfBirth: formattedDob,
      });

      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu thông tin hồ sơ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Avatar source resolution
  const getAvatarSource = () => {
    if (avatarUri) {
      if (avatarUri.startsWith('http') || avatarUri.startsWith('file:') || avatarUri.startsWith('content:')) {
        return { uri: avatarUri };
      }
      return { uri: `${API_BASE_URL.replace('/api/v1', '')}${avatarUri}` };
    }
    return require('../../../assets/onboarding/default_user_boy.png');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP HERO GRADIENT SECTION */}
        <View style={styles.heroSection}>
          {/* Top Navbar: Brand logo & Title */}
          <View style={styles.topNav}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../../assets/finora-logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>Finora</Text>
            </View>
          </View>

          {/* Heading and Robot Mascot */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Hoàn thiện hồ sơ</Text>
              <Text style={styles.headerSubtitle}>
                Cập nhật thông tin để hoàn tất đăng ký và bảo mật tài khoản Finora nhé!
              </Text>
            </View>
            <Image
              source={require('../../../assets/onboarding/profile_robot_card.png')}
              style={styles.headerRobotImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* WHITE FORM CARD */}
        <View style={styles.formCard}>
          {/* AVATAR CIRCLE PICKER */}
          <View style={styles.avatarPickerWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickAvatar}
              style={styles.avatarTouchable}
            >
              <Image source={getAvatarSource()} style={styles.avatarImg} />
              <View style={styles.cameraBadge}>
                <FinanceIcon name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* FIELD 1: TÊN HIỂN THỊ */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <FinanceIcon name="user" size={15} color="#007B58" />
              <Text style={styles.fieldLabel}>
                Tên hiển thị <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập tên của bạn"
                placeholderTextColor="#94A3B8"
              />
              {fullName.length > 0 && (
                <TouchableOpacity onPress={() => setFullName('')}>
                  <FinanceIcon name="close" size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* FIELD 2: TÊN ĐĂNG NHẬP */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.atSignIcon}>@</Text>
              <Text style={styles.fieldLabel}>
                Tên đăng nhập <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <View style={[styles.inputContainer, usernameError ? styles.inputError : null]}>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="huuha2k4"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
              {isUsernameValid && username.length >= 4 && (
                <FinanceIcon name="check" size={16} color="#10B981" />
              )}
            </View>
            <Text style={styles.fieldHelper}>
              {usernameError || 'Dùng để đăng nhập vào Finora (không dấu, không khoảng trắng, từ 4–20 ký tự).'}
            </Text>
          </View>

          {/* FIELD 3: MẬT KHẨU */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <FinanceIcon name="lock" size={15} color="#007B58" />
              <Text style={styles.fieldLabel}>
                Mật khẩu <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FinanceIcon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {/* Strength meter bars */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBarsContainer}>
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: strength.level >= 1 ? strength.color : '#E2E8F0' },
                    ]}
                  />
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: strength.level >= 2 ? strength.color : '#E2E8F0' },
                    ]}
                  />
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: strength.level >= 3 ? strength.color : '#E2E8F0' },
                    ]}
                  />
                </View>
                <View style={styles.strengthTextRow}>
                  <FinanceIcon name="check" size={12} color={strength.color} />
                  <Text style={[styles.strengthText, { color: strength.color }]}>
                    {strength.text}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* FIELD 4: XÁC NHẬN MẬT KHẨU */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <FinanceIcon name="lock" size={15} color="#007B58" />
              <Text style={styles.fieldLabel}>
                Xác nhận mật khẩu <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <FinanceIcon
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* FIELD 5: NGÀY SINH */}
          <View style={styles.fieldGroup}>
            <BirthDatePicker
              value={dateOfBirth}
              onChange={(_, apiStr) => {
                // Chuyển sang định dạng hiển thị dd/MM/yyyy
                const parts = apiStr.split('-');
                if (parts.length === 3) {
                  setDateOfBirth(`${parts[2]}/${parts[1]}/${parts[0]}`);
                }
              }}
              label="Ngày sinh"
              placeholder="DD/MM/YYYY"
            />
          </View>

          {/* NOTE CALLOUT BOX */}
          <View style={styles.infoCallout}>
            <View style={styles.infoIconWrapper}>
              <Text style={styles.infoIconLetter}>i</Text>
            </View>
            <Text style={styles.infoCalloutText}>
              Bạn có thể sử dụng Tên đăng nhập và Mật khẩu để đăng nhập vào Finora, hoặc tiếp tục đăng nhập bằng Google.
            </Text>
          </View>

          {/* ACTION BUTTONS */}
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.submitBtnText}>Hoàn tất</Text>
                <FinanceIcon name="arrow-right" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity
              style={styles.skipBtn}
              activeOpacity={0.7}
              onPress={onSkip}
              disabled={loading}
            >
              <Text style={styles.skipBtnText}>Bỏ qua</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#003F32',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#003F32',
  },
  heroSection: {
    backgroundColor: '#004A3B',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoImg: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400',
  },
  headerRobotImg: {
    width: 175,
    height: 122,
    marginTop: -16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: 500,
  },
  avatarPickerWrapper: {
    alignItems: 'center',
    marginTop: -42,
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0F2FE',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007B58',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 13,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  atSignIcon: {
    color: '#007B58',
    fontSize: 15,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  requiredStar: {
    color: '#EF4444',
  },
  optionalText: {
    color: '#64748B',
    fontWeight: '400',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 44,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  fieldHelper: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  strengthBarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginBottom: 16,
    gap: 8,
  },
  infoIconWrapper: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoIconLetter: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: '#007B58',
    borderRadius: 24,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007B58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
