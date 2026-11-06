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
  const hiddenBtnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let checkInterval: any = null;

    const initGoogleGIS = () => {
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

        if (hiddenBtnRef.current) {
          hiddenBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(hiddenBtnRef.current, {
            type: 'standard',
            size: 'large',
          });
        }
        setReady(true);
        return true;
      } catch (err) {
        console.error('Failed to init Google GIS:', err);
        return false;
      }
    };

    if (!initGoogleGIS()) {
      checkInterval = setInterval(() => {
        if (initGoogleGIS()) {
          if (checkInterval) clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

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

  const handleButtonClick = () => {
    if (loading) return;
    
    // Ưu tiên kích hoạt click vào button thật của Google trong hidden container
    if (hiddenBtnRef.current) {
      const gBtn = hiddenBtnRef.current.querySelector('div[role="button"]') as HTMLElement;
      if (gBtn) {
        gBtn.click();
        return;
      }
    }

    // Dự phòng gọi prompt One Tap
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError('Dịch vụ Google đang tải, vui lòng thử lại sau giây lát.');
    }
  };

  const buttonLabel = text === 'signup_with' ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google';

  return (
    <div className="w-full relative">
      {/* Hidden native Google button */}
      <div
        ref={hiddenBtnRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
          width: 0,
          height: 0,
          overflow: 'hidden',
        }}
      />

      {/* 100% width custom button matching modal */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className="btn-google-custom"
        title={buttonLabel}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <svg className="google-icon" viewBox="0 0 24 24" width="19" height="19">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="google-text">{buttonLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}
