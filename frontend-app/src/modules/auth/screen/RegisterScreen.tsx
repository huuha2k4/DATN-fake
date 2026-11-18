import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Eye, EyeOff, ChevronLeft, AlertTriangle, CheckCircle2, Lock } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../api/authApi';
import { styles } from './RegisterScreen.styles';
import { LegalTermsModal } from '../../legal/components/LegalTermsModal';

type Props = {
  onBack: () => void;
  onSuccess: () => void;
  onSwitchToLogin: () => void;
};

export function RegisterScreen({
  onBack,
  onSuccess,
  onSwitchToLogin,
}: Props) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [fullNameFocused, setFullNameFocused] = React.useState(false);
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [usernameFocused, setUsernameFocused] = React.useState(false);
  const [otpFocused, setOtpFocused] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [error, setError] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [legalModalVisible, setLegalModalVisible] = React.useState(false);
  const [legalModalTab, setLegalModalTab] = React.useState<'terms' | 'privacy'>('terms');

  const countdownRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return setError('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã.');
    }

    setError('');
    setSuccessMsg('');
    setSendingOtp(true);

    try {
      const res = await authApi.sendRegisterOtp(cleanEmail);
      setSuccessMsg(res.message || 'Mã OTP 6 số đã được gửi tới email của bạn!');
      setOtpSent(true);
      startCountdown();
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại.');
    } finally {
      setSendingOtp(false);
    }
  };

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallScreen = width <= 375;
  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 560 : 480;

  // Tính toán dynamic theo chiều cao màn hình như SplashScreen
  // Giúp vừa khít chính xác 1 màn hình cho cả iPhone SE, màn chuẩn lẫn màn dài Pro Max
  const isCompactHeight = height < 750;
  const inputHeight = Math.max(36, Math.min(46, Math.round(height * (isCompactHeight ? 0.046 : 0.052))));
  const ctaButtonHeight = Math.max(42, Math.min(50, Math.round(height * (isCompactHeight ? 0.052 : 0.058))));
  const contentPaddingHorizontal = isSmallScreen ? 16 : 22;

  const handleRegister = async () => {
    if (!fullName.trim()) {
      return setError('Vui lòng nhập họ và tên của bạn.');
    }
    if (!email.trim() || !email.includes('@')) {
      return setError('Vui lòng nhập địa chỉ email hợp lệ.');
    }
    if (!otp.trim() || otp.trim().length < 6) {
      return setError('Vui lòng nhập mã OTP 6 số đã gửi về email của bạn.');
    }
    if (!password) {
      return setError('Vui lòng nhập mật khẩu.');
    }
    if (password.length < 8) {
      return setError('Mật khẩu phải chứa ít nhất 8 ký tự.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      return setError('Mật khẩu cần gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*).');
    }
    if (password !== confirmPassword) {
      return setError('Mật khẩu xác nhận không trùng khớp.');
    }

    setError('');
    setLoading(true);

    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim() || undefined,
        otp: otp.trim(),
        password,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.registerPage}>
      <SafeAreaView style={styles.flexOne} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.screenContainer, { maxWidth: containerMaxWidth, paddingHorizontal: contentPaddingHorizontal }]}>
            {/* 1. Header có nút Quay lại */}
            <View style={styles.headerBlock}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.inlineBackBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={10}
              >
                <ChevronLeft size={18} color="#006747" strokeWidth={2.5} />
                <Text style={styles.inlineBackText}>Quay lại</Text>
              </Pressable>

              <Text style={styles.registerTitle}>Đăng ký tài khoản</Text>
              <Text style={styles.registerSubtitle}>
                Bắt đầu quản lý tài chính thông minh cùng Finora.
              </Text>

              {/* Thông báo lỗi */}
              {error ? (
                <View style={styles.alertBox}>
                  <AlertTriangle size={16} color="#DC2626" strokeWidth={2.2} />
                  <Text style={styles.alertText}>{error}</Text>
                </View>
              ) : null}

              {/* Thông báo thành công gửi OTP */}
              {successMsg ? (
                <View style={styles.successBox}>
                  <CheckCircle2 size={16} color="#00A86B" strokeWidth={2.2} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}
            </View>

            {/* 2. Middle Block: 6 trường nhập trải đều linh hoạt */}
            <View style={styles.formBlock}>
              {/* Họ và tên */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Họ và tên <Text style={styles.formLabelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    fullNameFocused && styles.formInputWrapFocused,
                  ]}
                >
                  <TextInput
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setFullNameFocused(true)}
                    onBlur={() => setFullNameFocused(false)}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Tên tài khoản */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Username <Text style={styles.formOptionalText}>(tùy chọn)</Text>
                </Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    usernameFocused && styles.formInputWrapFocused,
                  ]}
                >
                  <TextInput
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="VD: nguyen_vana"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Email <Text style={styles.formLabelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    emailFocused && styles.formInputWrapFocused,
                  ]}
                >
                  <TextInput
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="name@email.com"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Mã OTP */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Mã OTP <Text style={styles.formLabelRequired}>*</Text>
                </Text>
                <View style={styles.otpRowWrap}>
                  <View
                    style={[
                      styles.formInputWrap,
                      styles.otpInputWrap,
                      { height: inputHeight },
                      otpFocused && styles.formInputWrapFocused,
                    ]}
                  >
                    <TextInput
                      value={otp}
                      onChangeText={(val) => {
                        setOtp(val.replace(/\D/g, ''));
                        if (error) setError('');
                      }}
                      onFocus={() => setOtpFocused(true)}
                      onBlur={() => setOtpFocused(false)}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="Nhập 6 số OTP"
                      placeholderTextColor="#9ca3af"
                      style={styles.formInput}
                      returnKeyType="next"
                    />
                  </View>
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={sendingOtp || countdown > 0}
                    style={({ pressed }) => [
                      styles.otpSendBtn,
                      { height: inputHeight },
                      (sendingOtp || countdown > 0) && styles.otpSendBtnDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.otpSendBtnText}>
                        {countdown > 0 ? `${countdown}s` : otpSent ? 'Gửi lại mã' : 'Lấy mã OTP'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Mật khẩu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Mật khẩu <Text style={styles.formLabelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    passwordFocused && styles.formInputWrapFocused,
                  ]}
                >
                  <TextInput
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    placeholder="Tối thiểu 8 ký tự"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="next"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? (
                      <Eye size={20} color="#6b7571" strokeWidth={1.8} />
                    ) : (
                      <EyeOff size={20} color="#8c9c93" strokeWidth={1.8} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Xác nhận mật khẩu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Xác nhận mật khẩu <Text style={styles.formLabelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    confirmPasswordFocused && styles.formInputWrapFocused,
                  ]}
                >
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? (
                      <Eye size={20} color="#6b7571" strokeWidth={1.8} />
                    ) : (
                      <EyeOff size={20} color="#8c9c93" strokeWidth={1.8} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Password requirement hint */}
              <View style={styles.passwordHintBox}>
                <Lock size={14} color="#006747" strokeWidth={2} />
                <Text style={styles.passwordHintText}>
                  Mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*).
                </Text>
              </View>
            </View>

            {/* 3. Bottom Block: Điều khoản, Nút bấm & Copyright */}
            <View style={styles.bottomBlock}>
              {/* Điều khoản dịch vụ & Chính sách bảo mật */}
              <Text style={styles.termsAgreementText}>
                Bằng việc nhấn đăng ký, bạn đồng ý với{' '}
                <Text
                  style={styles.termsAgreementLink}
                  onPress={() => {
                    setLegalModalTab('terms');
                    setLegalModalVisible(true);
                  }}
                >
                  Điều khoản dịch vụ
                </Text>
                {' '}&{' '}
                <Text
                  style={styles.termsAgreementLink}
                  onPress={() => {
                    setLegalModalTab('privacy');
                    setLegalModalVisible(true);
                  }}
                >
                  Chính sách bảo mật
                </Text>
                {' '}của Finora Intelligence.
              </Text>

              {/* Nút Hoàn tất tạo tài khoản */}
              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={({ pressed }) => [
                  styles.registerButton,
                  { height: ctaButtonHeight },
                  loading && styles.registerButtonDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Hoàn tất tạo tài khoản"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>Hoàn tất tạo tài khoản →</Text>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerBox}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>HOẶC</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Nút Đăng ký bằng Google với chuẩn SVG 4 màu */}
              <Pressable
                onPress={() => { }}
                style={({ pressed }) => [
                  styles.googleButton,
                  { height: ctaButtonHeight - 4 },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Đăng ký bằng Google"
              >
                <Svg width={18} height={18} viewBox="0 0 48 48">
                  <Path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <Path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <Path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </Svg>
                <Text style={styles.googleButtonText}>Đăng ký bằng Google</Text>
              </Pressable>

              {/* Chuyển tiếp Đăng nhập */}
              <View style={styles.registerFooter}>
                <Text style={styles.registerFooterText}>
                  Đã có tài khoản Finora?{' '}
                  <Text
                    style={styles.registerFooterLink}
                    onPress={onSwitchToLogin}
                  >
                    Đăng nhập ngay
                  </Text>
                </Text>
                <Text style={styles.copyrightText}>
                  🛡️ 2026 Finora Intelligence · Bảo mật & Riêng tư
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

    {/* Modal Điều khoản dịch vụ & Chính sách bảo mật */}
    <LegalTermsModal
        visible={legalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setLegalModalVisible(false)}
      />
    </View>
  );
}

