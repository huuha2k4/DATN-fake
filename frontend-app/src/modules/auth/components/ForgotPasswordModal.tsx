import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyRound, X, AlertTriangle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react-native';
import { authApi } from '../api/authApi';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ForgotPasswordModal({
  visible,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  // 3 bước rõ ràng: 1. email -> 2. otp -> 3. new_password
  const [step, setStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const countdownRef = React.useRef<any>(null);

  // Reset state mỗi khi mở modal
  React.useEffect(() => {
    if (visible) {
      setStep('email');
      setError('');
      setSuccessMsg('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setCountdown(0);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [visible]);

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
      setSuccessMsg('Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            {/* Header popup */}
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <View style={styles.keyIconBox}>
                  <KeyRound size={20} color="#006747" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.title}>Quên mật khẩu</Text>
                  <Text style={styles.subtitle}>
                    {step === 'email' && 'Nhập email để nhận mã OTP 6 số khôi phục'}
                    {step === 'otp' && `Nhập mã OTP 6 số đã gửi tới ${email}`}
                    {step === 'new_password' && 'Thiết lập mật khẩu mới cho tài khoản'}
                  </Text>
                </View>
              </View>

              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <X size={18} color="#475569" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Stepper Dots */}
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

            {/* Alert thông báo */}
            {error ? (
              <View style={styles.alertBox}>
                <AlertTriangle size={16} color="#DC2626" strokeWidth={2.2} />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color="#00A86B" strokeWidth={2.2} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            <View style={styles.scrollBody}>
              {/* BƯỚC 1: NHẬP EMAIL */}
              {step === 'email' && (
                <View style={styles.stepGroup}>
                  <Text style={styles.formLabel}>
                    Địa chỉ Email <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
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

                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.ctaBtn,
                      loading && styles.ctaBtnDisabled,
                      pressed && styles.pressed,
                    ]}
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
                <View style={styles.stepGroup}>
                  <Text style={styles.formLabel}>
                    Mã xác thực OTP (6 chữ số) <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
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
                          ? `Gửi lại (${countdown}s)`
                          : 'Gửi lại mã OTP'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.ctaBtn,
                      loading && styles.ctaBtnDisabled,
                      pressed && styles.pressed,
                    ]}
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
                <View style={styles.stepGroup}>
                  <Text style={styles.formLabel}>
                    Mật khẩu mới <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
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

                  <Text style={styles.formLabel}>
                    Xác nhận mật khẩu mới <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
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

                  <View style={styles.passwordHintBox}>
                    <Lock size={14} color="#006747" strokeWidth={2} />
                    <Text style={styles.passwordHintText}>
                      Mật khẩu từ 8 ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt).
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleResetPassword}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.ctaBtn,
                      loading && styles.ctaBtnDisabled,
                      pressed && styles.pressed,
                    ]}
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

            {/* Footer popup */}
            <View style={styles.footerBox}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Quay lại Đăng nhập</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 37, 28, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#00281e',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  keyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12251f',
  },
  subtitle: {
    fontSize: 11,
    color: '#69756f',
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#576b61',
  },

  /* Step Indicator */
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dce3df',
  },
  stepDotActive: {
    backgroundColor: '#006747',
    width: 16,
    borderRadius: 3,
  },
  stepLine: {
    width: 16,
    height: 2,
    backgroundColor: '#e5e9e7',
  },
  stepLineActive: {
    backgroundColor: '#006747',
  },

  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFD8D6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 4,
  },
  alertIcon: {
    fontSize: 12,
  },
  alertText: {
    fontSize: 11.5,
    color: '#D93025',
    fontWeight: '600',
    flex: 1,
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 4,
  },
  successIcon: {
    fontSize: 12,
  },
  successText: {
    fontSize: 11.5,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },

  scrollBody: {
    paddingVertical: 4,
  },

  stepGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#12251f',
  },
  required: {
    color: '#006747',
  },
  inputWrap: {
    width: '100%',
    height: 42,
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputWrapFocused: {
    borderColor: '#009a70',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: '#12251f',
    height: '100%',
    paddingVertical: 0,
    letterSpacing: 0,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#006747',
  },
  eyeBtn: {
    padding: 6,
  },

  otpActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: -2,
  },
  changeEmailText: {
    fontSize: 11.5,
    color: '#6b7571',
    fontWeight: '600',
  },
  resendOtpText: {
    fontSize: 11.5,
    color: '#006747',
    fontWeight: '700',
  },
  resendOtpDisabled: {
    color: '#9ca3af',
  },

  passwordHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF8F1',
    borderWidth: 1,
    borderColor: '#C7E8D8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  passwordHintIcon: {
    fontSize: 11,
  },
  passwordHintText: {
    fontSize: 10.5,
    color: '#006747',
    flex: 1,
    lineHeight: 14,
  },

  ctaBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#006747',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#004c3b',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  footerBox: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f2',
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#006747',
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.988 }],
  },
});

