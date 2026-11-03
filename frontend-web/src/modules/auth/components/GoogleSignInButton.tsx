import { useEffect, useRef, useState } from 'react';
import { authApi, saveAuthData } from '../api/authApi';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleSignInButton({ onSuccess, onError, text = 'continue_with' }: GoogleSignInButtonProps) {
  const btnContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let checkInterval: any = null;

    const initGoogleBtn = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        return false;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (btnContainerRef.current) {
          btnContainerRef.current.innerHTML = '';
          const containerWidth = btnContainerRef.current.offsetWidth || 400;
          const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';

          window.google.accounts.id.renderButton(btnContainerRef.current, {
            theme: isDark ? 'filled_black' : 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: text,
            logo_alignment: 'left',
            width: Math.min(Math.max(containerWidth, 280), 460),
            locale: 'vi',
          });
        }
        return true;
      } catch (err) {
        console.error('Failed to render Google Sign-In button:', err);
        return false;
      }
    };

    if (!initGoogleBtn()) {
      checkInterval = setInterval(() => {
        if (initGoogleBtn()) {
          if (checkInterval) clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [text]);

  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      onError('Không nhận được thông tin xác thực từ Google');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.loginWithGoogle(response.credential);
      saveAuthData(res.data.user, res.data.tokens);
      onSuccess();
    } catch (err: any) {
      onError(err?.message || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center my-1 relative google-signin-wrapper">
      {loading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 z-10 flex items-center justify-center rounded-full">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={btnContainerRef} className="w-full flex justify-center min-h-[44px]" />
    </div>
  );
}

