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
import { ChevronLeft, AlertTriangle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/authApi';
import { styles } from './ForgotPasswordScreen.styles';

type Props = {
  onBack: () => void;
  onSwitchToLogin: () => void;
};

export function ForgotPasswordScreen({ onBack, onSwitchToLogin }: Props) {
  // 3 bước chuẩn web: 1. email -> 2. otp -> 3. new_password
  const [step, setStep] = React.useState<'email' | 'otp' | 'new_password'>('email');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [emailFocused, setEmailFocused] = React.useState(false);
  const [otpFocused, setOtpFocused] = React.useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = React.useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [error, setError] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

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

  const { width, height } = useWindowDimensions();
  const isSmallScreen = width <= 375;
  const isTablet = width >= 600;
  const containerMaxWidth = isTablet ? 560 : 480;
  const isCompactHeight = height < 750;
  const inputHeight = Math.max(40, Math.min(48, Math.round(height * (isCompactHeight ? 0.048 : 0.054))));
  const ctaButtonHeight = Math.max(44, Math.min(52, Math.round(height * (isCompactHeight ? 0.052 : 0.058))));
  const contentPaddingHorizontal = isSmallScreen ? 16 : 22;

  // Bước 1: Gửi OTP khôi phục
  const handleSendOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return setError('Vui lòng nhập địa chỉ email hợp lệ');
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(cleanEmail);
      setSuccessMsg(res.message || 'Mã xác thực 6 số đã được gửi tới email của bạn');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP
  const handleVerifyOtp = async () => {
    setError('');
    setSuccessMsg('');

    if (otp.trim().length !== 6) {
      return setError('Vui lòng nhập đủ 6 chữ số mã OTP');
    }

    setLoading(true);
    try {
      await authApi.verifyResetOtp(email.trim(), otp.trim());
      setSuccessMsg('Mã xác thực chính xác! Vui lòng thiết lập mật khẩu mới.');
      setStep('new_password');
    } catch (err: any) {
      setError(err?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);

    try {
      await authApi.forgotPassword(email.trim());
      setSuccessMsg('Mã OTP mới đã được gửi vào email của bạn!');
      startCountdown();
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setResending(false);
    }
  };

  // Bước 3: Đổi mật khẩu mới
  const handleResetPassword = async () => {
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      return setError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*]/.test(newPassword)
    ) {
      return setError('Mật khẩu cần tối thiểu 8 ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt)');
    }

    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: otp.trim(),
        newPassword,
      });
      setSuccessMsg('Đặt lại mật khẩu thành công! Đang chuyển về Đăng nhập...');
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
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
            <View
              style={[
                styles.screenContainer,
                { maxWidth: containerMaxWidth, paddingHorizontal: contentPaddingHorizontal },
              ]}
            >
              {/* 1. Header Block */}
              <View style={styles.headerBlock}>
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [styles.inlineBackBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  hitSlop={10}
                >
                  <ChevronLeft size={18} color="#006747" strokeWidth={2.5} />
                  <Text style={styles.inlineBackText}>Quay lại</Text>
                </Pressable>

                {/* Step indicator */}
                <View style={styles.stepIndicatorRow}>
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                  <View style={[styles.stepLine, step !== 'email' && styles.stepLineActive]} />
                  <View
                    style={[
                      styles.stepDot,
                      (step === 'otp' || step === 'new_password') && styles.stepDotActive,
                    ]}
                  />
                  <View style={[styles.stepLine, step === 'new_password' && styles.stepLineActive]} />
                  <View
                    style={[styles.stepDot, step === 'new_password' && styles.stepDotActive]}
                  />
                </View>

                <Text style={styles.title}>Quên mật khẩu</Text>
                <Text style={styles.subtitle}>
                  {step === 'email' &&
                    'Nhập email đã đăng ký để nhận mã OTP 6 số khôi phục tài khoản.'}
                  {step === 'otp' && `Nhập mã OTP 6 số vừa được gửi đến: ${email}`}
                  {step === 'new_password' &&
                    'Thiết lập mật khẩu mới an toàn cho tài khoản Finora của bạn.'}
                </Text>

                {/* Thông báo lỗi */}
                {error ? (
                  <View style={styles.alertBox}>
                    <AlertTriangle size={16} color="#DC2626" strokeWidth={2.2} />
                    <Text style={styles.alertText}>{error}</Text>
                  </View>
                ) : null}

                {/* Thông báo thành công */}
                {successMsg ? (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={16} color="#00A86B" strokeWidth={2.2} />
                    <Text style={styles.successText}>{successMsg}</Text>
                  </View>
                ) : null}
              </View>

              {/* 2. Form Body tuỳ theo từng bước */}
              <View style={styles.formBlock}>
                {/* BƯỚC 1: NHẬP EMAIL */}
                {step === 'email' && (
                  <View style={styles.stepWrap}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        Địa chỉ Email <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          { height: inputHeight },
                          emailFocused && styles.inputWrapFocused,
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
                          style={styles.input}
                          returnKeyType="done"
                          onSubmitEditing={handleSendOtp}
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={handleSendOtp}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaBtn,
                        { height: ctaButtonHeight },
                        loading && styles.ctaBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.ctaBtnText}>Gửi mã xác thực OTP →</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {/* BƯỚC 2: NHẬP MÃ OTP 6 SỐ */}
                {step === 'otp' && (
                  <View style={styles.stepWrap}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        Mã xác thực OTP (6 chữ số) <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          { height: inputHeight },
                          otpFocused && styles.inputWrapFocused,
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
                          placeholder="123456"
                          placeholderTextColor="#9ca3af"
                          style={[styles.input, styles.otpInput]}
                          returnKeyType="done"
                          onSubmitEditing={handleVerifyOtp}
                        />
                      </View>
                    </View>

                    <View style={styles.otpActionRow}>
                      <Pressable
                        onPress={() => {
                          setError('');
                          setSuccessMsg('');
                          setStep('email');
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.changeEmailText}>← Đổi email khác</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleResendOtp}
                        disabled={countdown > 0 || resending}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.resendOtpText,
                            (countdown > 0 || resending) && styles.resendOtpDisabled,
                          ]}
                        >
                          {resending
                            ? 'Đang gửi...'
                            : countdown > 0
                            ? `Gửi lại mã (${countdown}s)`
                            : 'Gửi lại mã OTP'}
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaBtn,
                        { height: ctaButtonHeight },
                        loading && styles.ctaBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.ctaBtnText}>Xác thực OTP →</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {/* BƯỚC 3: THIẾT LẬP MẬT KHẨU MỚI */}
                {step === 'new_password' && (
                  <View style={styles.stepWrap}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        Mật khẩu mới <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          { height: inputHeight },
                          newPasswordFocused && styles.inputWrapFocused,
                        ]}
                      >
                        <TextInput
                          value={newPassword}
                          onChangeText={(val) => {
                            setNewPassword(val);
                            if (error) setError('');
                          }}
                          onFocus={() => setNewPasswordFocused(true)}
                          onBlur={() => setNewPasswordFocused(false)}
                          secureTextEntry={!showPassword}
                          placeholder="Tối thiểu 8 ký tự"
                          placeholderTextColor="#9ca3af"
                          style={styles.input}
                          returnKeyType="next"
                        />
                        <Pressable
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeBtn}
                          hitSlop={8}
                        >
                          {showPassword ? (
                            <Eye size={20} color="#6b7571" strokeWidth={1.8} />
                          ) : (
                            <EyeOff size={20} color="#8c9c93" strokeWidth={1.8} />
                          )}
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        Xác nhận mật khẩu mới <Text style={styles.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          { height: inputHeight },
                          confirmPasswordFocused && styles.inputWrapFocused,
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
                          placeholder="Nhập lại mật khẩu mới"
                          placeholderTextColor="#9ca3af"
                          style={styles.input}
                          returnKeyType="done"
                          onSubmitEditing={handleResetPassword}
                        />
                        <Pressable
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeBtn}
                          hitSlop={8}
                        >
                          {showConfirmPassword ? (
                            <Eye size={20} color="#6b7571" strokeWidth={1.8} />
                          ) : (
                            <EyeOff size={20} color="#8c9c93" strokeWidth={1.8} />
                          )}
                        </Pressable>
                      </View>
                    </View>

                    {/* Hint box */}
                    <View style={styles.passwordHintBox}>
                      <Lock size={14} color="#006747" strokeWidth={2} />
                      <Text style={styles.passwordHintText}>
                        Mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*).
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleResetPassword}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaBtn,
                        { height: ctaButtonHeight },
                        loading && styles.ctaBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.ctaBtnText}>Lưu mật khẩu mới →</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>

              {/* 3. Footer Block */}
              <View style={styles.bottomBlock}>
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>
                    Nhớ mật khẩu rồi?{' '}
                    <Text style={styles.footerLink} onPress={onSwitchToLogin}>
                      Quay lại Đăng nhập
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
    </View>
  );
}

