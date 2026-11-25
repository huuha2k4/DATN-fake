import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { authApi } from '../api/authApi';

WebBrowser.maybeCompleteAuthSession();

// Kiểm tra xem ứng dụng có đang chạy trong Expo Go client hay không
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export interface UseGoogleAuthReturn {
  promptAsync: () => Promise<any>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGoogleAuth(onSuccess?: (authResult?: any) => void): UseGoogleAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client ID lấy từ .env (EXPO_PUBLIC_*)
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '1028251172273-prffrl7gbo392um76rpsqs2tsolt7gic.apps.googleusercontent.com';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '1028251172273-tuau16qj3gg72k2sebdvcoeitvm2sfsg.apps.googleusercontent.com';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '1028251172273-6huhmosirbqauekdf4l9loh3jrvp2n6k.apps.googleusercontent.com';

  // Lấy reversed client id từ iOS Client ID (dạng com.googleusercontent.apps.1028251172273-tuau16qj3gg7...)
  const iosReversedClientId = iosClientId.includes('.apps.googleusercontent.com')
    ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
    : undefined;

  // Xác định redirectUri chuẩn theo từng nền tảng:
  // - Trên iOS: giữ nguyên reversed client ID chuẩn của Google (com.googleusercontent.apps.<ID>:/oauthredirect)
  // - Trên Android: để undefined để expo-auth-session tự dùng chuẩn <package_name>:/oauthredirect (com.finora.app:/oauthredirect),
  //   tránh dùng scheme finora:// khiến Google báo Lỗi 400 invalid_request
  // - Trên Web: giữ nguyên makeRedirectUri
  const redirectUri = Platform.OS === 'ios' && iosReversedClientId
    ? `${iosReversedClientId}:/oauthredirect`
    : Platform.OS === 'android'
      ? undefined
      : makeRedirectUri({
          scheme: 'finora',
          path: 'oauthredirect',
        });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Platform.select({ ios: iosClientId, android: androidClientId, default: webClientId }),
    webClientId: webClientId,
    iosClientId: iosClientId,
    androidClientId: androidClientId,
    redirectUri: redirectUri,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication, params } = response;
      const idToken = authentication?.idToken || (params as any)?.id_token;

      if (idToken) {
        handleBackendGoogleLogin(idToken);
      } else if (authentication?.accessToken) {
        // Nếu dùng access token qua Expo Go auth flow
        fetchGoogleUserAndBackend(authentication.accessToken);
      } else {
        setError('Không nhận được thông tin xác thực từ Google');
        setLoading(false);
      }
    } else if (response?.type === 'error') {
      const errMsg = (response.error as any)?.message || (response.error as any)?.error_description || 'Đăng nhập Google thất bại';
      setError(errMsg);
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  // Tra cứu user info nếu luồng OAuth chỉ trả về Access Token (thường gặp khi chạy Expo Go flow)
  const fetchGoogleUserAndBackend = async (accessToken: string) => {
    try {
      setLoading(true);
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();
      if (!userInfo?.email) {
        throw new Error('Không thể lấy thông tin email từ Google.');
      }
      // Gửi accessToken hoặc idToken tương ứng
      const idToken = response?.type === 'success' ? (response.authentication?.idToken || response.params?.id_token) : null;
      if (idToken) {
        await handleBackendGoogleLogin(idToken);
      } else {
        throw new Error('Cần xác thực Google ID Token với máy chủ.');
      }
    } catch (err: any) {
      setError(err?.message || 'Xác thực Google thất bại.');
      setLoading(false);
    }
  };

  const handleBackendGoogleLogin = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.loginWithGoogle(idToken);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập Google với hệ thống thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrompt = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await promptAsync();
      if (res?.type === 'cancel' || res?.type === 'dismiss') {
        setLoading(false);
      }
      return res;
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Không thể mở trang đăng nhập Google');
      return null;
    }
  };

  return {
    promptAsync: handlePrompt,
    loading,
    error,
    clearError: () => setError(null),
  };
}
