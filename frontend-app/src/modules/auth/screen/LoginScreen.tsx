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
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi, API_BASE_URL } from '../api/authApi';
import { styles } from './LoginScreen.styles';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

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
  const [identity, setIdentity] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [identityFocused, setIdentityFocused] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [forgotModalVisible, setForgotModalVisible] = React.useState(false);

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
      setError(`[${API_BASE_URL}] ${err?.message || 'Lỗi kết nối máy chủ'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginPage}>
      <SafeAreaView style={styles.flexOne} edges={['bottom']}>
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
            {/* .login-hero: Phần đầu màu xanh */}
            <View style={[styles.loginHero, { height: heroHeight }]}>
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
                <Text style={styles.loginBackArrow}>‹</Text>
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

            {/* .login-card: Form trắng bo góc */}
            <View style={[styles.loginCard, { paddingHorizontal: cardPadding }]}>
              {/* .login-title: Tiêu đề */}
              <Text
                style={[
                  styles.loginTitle,
                  isSmallScreen && { fontSize: 24 },
                ]}
              >
                Đăng nhập vào{' '}
                <Text style={styles.loginTitleSpan}>Finora</Text>
              </Text>

              {/* .login-subtitle */}
              <Text style={styles.loginSubtitle}>
                Truy cập không gian quản lý tài chính và trợ lý AI của bạn.
              </Text>

              {/* Thông báo lỗi nếu có */}
              {error ? (
                <View style={styles.alertBox}>
                  <Text style={styles.alertIcon}>⚠️</Text>
                  <Text style={styles.alertText}>{error}</Text>
                </View>
              ) : null}

              {/* Debug Server URL để bạn biết chắc chắn App đang gọi đi đâu */}
              <View style={{ marginBottom: 12, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 }}>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  📡 API Server: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{API_BASE_URL}</Text>
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  ENV: {String(process.env.EXPO_PUBLIC_API_URL)}
                </Text>
              </View>

              {/* Form group: Email / Tên tài khoản */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email hoặc Tên tài khoản</Text>
                <View
                  style={[
                    styles.formInputWrap,
                    { height: inputHeight },
                    identityFocused && styles.formInputWrapFocused,
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
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Form group: Mật khẩu */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>Mật khẩu</Text>
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
                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                  </Pressable>
                </View>
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
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor="#9ca3af"
                    style={styles.formInput}
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
                      /* Eye Open Icon - Tinh tế, đơn giản */
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                          stroke="#6b7571"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Circle
                          cx={12}
                          cy={12}
                          r={3}
                          stroke="#6b7571"
                          strokeWidth={1.8}
                        />
                      </Svg>
                    ) : (
                      /* Eye Off (Gạch chéo) Icon - Hiện đại, rõ ràng */
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                          stroke="#8c9c93"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
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
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>HOẶC</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* .google-button: Nút Google với chuẩn Logo 4 màu sắc nét */}
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tiếp tục với Google"
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
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </Pressable>

              {/* .login-footer: Chuyển tiếp Đăng ký */}
              <View style={styles.loginFooter}>
                <Text style={styles.loginFooterText}>
                  Chưa có tài khoản Finora?{' '}
                  <Text
                    style={styles.loginFooterLink}
                    onPress={onSwitchToRegister}
                  >
                    Đăng ký tài khoản mới
                  </Text>
                </Text>
                <Text style={styles.copyrightText}>
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
