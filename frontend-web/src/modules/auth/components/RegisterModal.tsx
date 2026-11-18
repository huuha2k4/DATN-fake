import { useState } from 'react';
import { authApi, saveAuthData, type RegisterRequest } from '../api/authApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LegalTermsModal } from '../../legal/components/LegalTermsModal';
import './AuthModal.css';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ onClose, onSuccess, onSwitchToLogin }: RegisterModalProps) {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    fullName: '',
    username: '',
    otp: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | null>(null);

  // Đếm ngược gửi lại mã OTP (60s)
  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const cleanEmail = formData.email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã');
      return;
    }

    setError('');
    setSendingOtp(true);

    try {
      const res = await authApi.sendRegisterOtp(cleanEmail);
      setSuccessMsg(res.message || 'Mã OTP 6 số đã được gửi tới email của bạn!');
      setOtpSent(true);
      startCountdown();
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại');
    } finally {
      setSendingOtp(false);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn');
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Email không hợp lệ');
      return false;
    }

    if (!formData.otp || formData.otp.trim().length < 6) {
      setError('Vui lòng nhập mã OTP 6 số đã gửi về email của bạn');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return false;
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[!@#$%^&*]/.test(formData.password)) {
      setError('Mật khẩu cần tối thiểu 8 ký tự (gồm chữ hoa, chữ thường, số và ký tự đặc biệt !@#$%^&*)');
      return false;
    }

    if (formData.password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        username: formData.username?.trim() || undefined,
        otp: formData.otp?.trim(),
      });
      saveAuthData(response.data.user, response.data.tokens);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Đăng ký thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet modal-register-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
          ✕
        </button>

        <div className="modal-top-header">
          <h2 className="modal-header-title">Đăng ký tài khoản</h2>
          <p className="modal-subtitle">Trải nghiệm quản lý chi tiêu và trợ lý thông minh ngay hôm nay</p>
        </div>

        {error && (
          <div className="form-alert error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="form-alert success" role="alert" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '8px' }}>
            <span>✅ </span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form compact-form">
          {/* Row 1: Họ và tên & Tên tài khoản chung hàng gọn đẹp */}
          <div className="form-row-2col">
            <div className="form-field">
              <label className="form-label" htmlFor="reg-fullname">Họ và tên *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="user" size={16} />
                </span>
                <input
                  id="reg-fullname"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="reg-username">
                <span>Username</span>
                <span className="form-optional-tag">(tùy chọn)</span>
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="reg-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="VD: nguyen_vana"
                  autoComplete="username"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email & Mã OTP chung một hàng (Email chiếm 60%, OTP 40% có nút Gửi mã) */}
          <div className="form-row-2col">
            <div className="form-field" style={{ flex: '1.4' }}>
              <label className="form-label" htmlFor="reg-email">Email *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-field" style={{ flex: '1.2' }}>
              <label className="form-label" htmlFor="reg-otp">Mã OTP *</label>
              <div className="flex gap-2 items-center">
                <div className="form-input-wrapper flex-1">
                  <span className="input-icon">🔑</span>
                  <input
                    id="reg-otp"
                    type="text"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                    placeholder="6 số OTP"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || countdown > 0}
                  className="btn-submit-emerald whitespace-nowrap"
                  style={{
                    width: 'auto',
                    marginTop: 0,
                    padding: '10px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '11px',
                    minWidth: '82px',
                  }}
                >
                  {sendingOtp ? 'Đang gửi...' : countdown > 0 ? `${countdown}s` : otpSent ? 'Gửi lại' : 'Lấy mã'}
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Password and Confirm password in 2 columns */}
          <div className="form-row-2col">
            <div className="form-field">
              <label className="form-label" htmlFor="reg-pass">Mật khẩu *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={16} />
                </span>
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  className="with-toggle"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn' : 'Hiện'}
                  aria-label="Ẩn hiện mật khẩu"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="reg-confirm-pass">Xác nhận mật khẩu *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={16} />
                </span>
                <input
                  id="reg-confirm-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Compact security notice */}
          <p className="password-policy-hint">
            🔒 Mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)
          </p>

          {/* Điều khoản dịch vụ & Chính sách bảo mật */}
          <p className="privacy-terms-agreement">
            Bằng việc nhấn đăng ký, bạn đồng ý với{' '}
            <button
              type="button"
              className="privacy-link-text-btn"
              onClick={() => setLegalModalTab('terms')}
            >
              Điều khoản dịch vụ
            </button>{' '}
            &{' '}
            <button
              type="button"
              className="privacy-link-text-btn"
              onClick={() => setLegalModalTab('privacy')}
            >
              Chính sách bảo mật
            </button>{' '}
            của Finora Intelligence.
          </p>

          <button
            type="submit"
            className="btn-submit-emerald"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Đang xử lý tạo tài khoản...</span>
              </>
            ) : (
              <>
                <span>Hoàn tất tạo tài khoản</span>
                <FinanceIcon name="arrow" size={17} />
              </>
            )}
          </button>
        </form>

        {/* Hoặc đăng ký nhanh bằng Google */}
        <div className="mt-3 mb-1">
          <div className="relative flex py-1.5 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
            <span className="flex-shrink mx-3 text-gray-400 text-xs font-semibold uppercase">Hoặc</span>
            <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
          </div>
          <GoogleSignInButton
            onSuccess={onSuccess}
            onError={(msg) => setError(msg)}
            text="signup_with"
          />
        </div>

        <div className="modal-footer-box compact-footer">
          <p className="modal-footer-text">
            Đã có tài khoản Finora?{' '}
            <button
              type="button"
              className="btn-text-emerald"
              onClick={onSwitchToLogin}
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>

      {/* Popup nổi Điều khoản & Chính sách */}
      <LegalTermsModal
        isOpen={Boolean(legalModalTab)}
        initialTab={legalModalTab || 'terms'}
        onClose={() => setLegalModalTab(null)}
      />
    </div>
  );
}
