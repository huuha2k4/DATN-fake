import React from 'react';
import {
  ActivityIndicator,
  Image,
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
import { Eye, EyeOff, ChevronLeft, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../api/authApi';
import { styles } from './LoginScreen.styles';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { useAppTheme } from '../../../context/ThemeContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const heroImage = require('../../../assets/login-hero.jpg');

type Props = {
  onBack: () => void;
  onSuccess: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
};

export function LoginScreen({
  onBack,
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
}: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
  const [identity, setIdentity] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [identityFocused, setIdentityFocused] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [forgotModalVisible, setForgotModalVisible] = React.useState(false);

  // Hook đăng nhập bằng Google
  const {
    promptAsync: promptGoogleLogin,
    loading: googleLoading,
    error: googleError,
  } = useGoogleAuth(onSuccess);

  React.useEffect(() => {
    if (googleError) {
      setError(googleError);
    }
  }, [googleError]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Tỷ lệ chuẩn: Banner chiếm 35% màn hình, Form trắng chiếm 65%
  const isSmallScreen = width <= 375;
  const isShortScreen = height < 750;
  // Chiều cao banner chiếm đúng 35% chiều cao màn hình của từng thiết bị
  const heroHeight = Math.round(height * 0.35);
  const inputHeight = isShortScreen ? 44 : 48;
  const cardPadding = isSmallScreen ? 16 : 20;

  const handleLogin = async () => {
    if (!identity.trim() || !password) {
      return setError('Vui lòng nhập email/tên tài khoản và mật khẩu.');
    }

    setError('');
    setLoading(true);

    try {
      await authApi.login({
        login: identity.trim(),
        password,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.loginPage, isDark && { backgroundColor: themeColors.background }]}>
      <SafeAreaView style={styles.flexOne} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, isDark && { backgroundColor: themeColors.background }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* .login-hero: Phần đầu màu xanh */}
            <View style={[styles.loginHero, { height: heroHeight }, isDark && { backgroundColor: '#022C22' }]}>
              {/* .login-back: Nút quay lại */}
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.loginBack,
                  { top: insets.top ? insets.top + 8 : 20 },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={8}
              >
                <ChevronLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.loginBackText}>Quay lại</Text>
              </Pressable>

              {/* .login-hero-image: Ảnh banner thiết kế */}
              <Image
                source={heroImage}
                style={styles.loginHeroImage}
                resizeMode="contain"
                accessibilityLabel="Finora AI Quản lý tài chính thông minh"
              />
            </View>

            {/* .login-card: Form bo góc */}
            <View style={[
              styles.loginCard,
              { paddingHorizontal: cardPadding },
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
                borderTopWidth: 1,
              },
            ]}>
              {/* .login-title: Tiêu đề */}
              <Text
                style={[
                  styles.loginTitle,
                  isSmallScreen && { fontSize: 24 },
                  isDark && { color: themeColors.textPrimary },
                ]}
              >
                Đăng nhập vào{' '}
                <Text style={[styles.loginTitleSpan, isDark && { color: themeColors.accentGreen }]}>Finora</Text>
              </Text>

              {/* .login-subtitle */}
              <Text style={[styles.loginSubtitle, isDark && { color: themeColors.textSecondary }]}>
                Truy cập không gian quản lý tài chính và trợ lý AI của bạn.
              </Text>

              {/* Thông báo lỗi nếu có */}
              {error ? (
                <View style={styles.alertBox}>
                  <AlertTriangle size={16} color="#DC2626" strokeWidth={2.2} />
                  <Text style={styles.alertText}>{error}</Text>
                </View>
              ) : null}

              {/* Form group: Email / Tên tài khoản */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && { color: themeColors.textSecondary }]}>Email hoặc Tên tài khoản</Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                    identityFocused && styles.formInputWrapFocused,
                    identityFocused && isDark && { borderColor: themeColors.accentGreen },
                  ]}
                >
                  <TextInput
                    value={identity}
                    onChangeText={(val) => {
                      setIdentity(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setIdentityFocused(true)}
                    onBlur={() => setIdentityFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="nguyenvan@gmail.com"
                    placeholderTextColor={isDark ? themeColors.textMuted : '#9ca3af'}
                    style={[styles.formInput, isDark && { color: themeColors.textPrimary }]}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Form group: Mật khẩu */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={[styles.formLabel, isDark && { color: themeColors.textSecondary }]}>Mật khẩu</Text>
                  <Pressable
                    onPress={() => {
                      if (onForgotPassword) {
                        onForgotPassword();
                      } else {
                        setForgotModalVisible(true);
                      }
                    }}
                    hitSlop={8}
                    style={styles.forgotBtn}
                  >
                    <Text style={[styles.forgotText, isDark && { color: themeColors.accentGreen }]}>Quên mật khẩu?</Text>
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                    passwordFocused && styles.formInputWrapFocused,
                    passwordFocused && isDark && { borderColor: themeColors.accentGreen },
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
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor={isDark ? themeColors.textMuted : '#9ca3af'}
                    style={[styles.formInput, isDark && { color: themeColors.textPrimary }]}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? (
                      <Eye size={20} color={isDark ? themeColors.accentGreen : '#6b7571'} strokeWidth={1.8} />
                    ) : (
                      <EyeOff size={20} color={isDark ? themeColors.textSecondary : '#8c9c93'} strokeWidth={1.8} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* .login-button: Nút Đăng nhập */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginButton,
                  isDark && { backgroundColor: themeColors.primaryDark },
                  loading && styles.loginButtonDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Đăng nhập →</Text>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerBox}>
                <View style={[styles.dividerLine, isDark && { backgroundColor: themeColors.cardBorder }]} />
                <Text style={[styles.dividerText, isDark && { color: themeColors.textSecondary }]}>HOẶC</Text>
                <View style={[styles.dividerLine, isDark && { backgroundColor: themeColors.cardBorder }]} />
              </View>

              {/* .google-button: Nút Google với chuẩn Logo 4 màu sắc nét */}
              <Pressable
                onPress={() => promptGoogleLogin()}
                disabled={loading || googleLoading}
                style={({ pressed }) => [
                  styles.googleButton,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                  },
                  (loading || googleLoading) && { opacity: 0.7 },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tiếp tục với Google"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={isDark ? '#34D399' : '#059669'} />
                ) : (
                  <>
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
                    <Text style={[styles.googleButtonText, isDark && { color: themeColors.textPrimary }]}>Tiếp tục với Google</Text>
                  </>
                )}
              </Pressable>

              {/* .login-footer: Chuyển tiếp Đăng ký */}
              <View style={styles.loginFooter}>
                <Text style={[styles.loginFooterText, isDark && { color: themeColors.textSecondary }]}>
                  Chưa có tài khoản Finora?{' '}
                  <Text
                    style={[styles.loginFooterLink, isDark && { color: themeColors.accentGreen }]}
                    onPress={onSwitchToRegister}
                  >
                    Đăng ký tài khoản mới
                  </Text>
                </Text>
                <Text style={[styles.copyrightText, isDark && { color: themeColors.textMuted }]}>
                  🛡️ 2026 Finora Intelligence · Bảo mật & Riêng tư
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal Popup Quên mật khẩu nổi ngay trên màn hình đăng nhập */}
      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
      />
    </View>
  );
}
