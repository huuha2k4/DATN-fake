import { useState } from 'react';
import { authApi } from '../api/authApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './AuthModal.css';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function ForgotPasswordModal({ onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setSuccessMsg(res.message || 'Mã xác thực 6 số đã được gửi tới email của bạn');
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length < 6) {
      setError('Mã xác thực OTP gồm 6 chữ số');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
      setError('Mật khẩu cần tối thiểu 8 ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: otp.trim(),
        newPassword,
      });
      setSuccessMsg('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSuccessMsg('Mã OTP mới đã được gửi vào email của bạn!');
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
          ✕
        </button>

        <h2 className="modal-header-title">Quên mật khẩu</h2>
        <p className="modal-subtitle">
          {step === 'email'
            ? 'Nhập email để nhận mã xác thực 6 số khôi phục tài khoản'
            : `Nhập mã OTP 6 số đã gửi đến ${email}`}
        </p>

        {error && (
          <div className="form-alert error" role="alert">
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="form-alert success" role="alert" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <span style={{ fontSize: '16px' }}>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="form-field">
              <label className="form-label" htmlFor="forgot-email">
                Địa chỉ Email
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="mail" size={17} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn-submit-emerald" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Đang gửi mã...</span>
                </>
              ) : (
                <>
                  <span>Gửi mã xác thực OTP</span>
                  <FinanceIcon name="arrow" size={17} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-field">
              <label className="form-label" htmlFor="otp-code">
                Mã xác thực OTP (6 chữ số)
              </label>
              <div className="form-input-wrapper">
                <input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="VD: 123456"
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: 'bold' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="new-pass">
                Mật khẩu mới
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={17} />
                </span>
                <input
                  id="new-pass"
                  type={showPassword ? 'text' : 'password'}
                  className="with-toggle"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="confirm-pass">
                Xác nhận mật khẩu mới
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={17} />
                </span>
                <input
                  id="confirm-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs my-1">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-gray-500 hover:underline"
              >
                ← Đổi email khác
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="btn-text-emerald font-semibold"
              >
                Gửi lại mã OTP
              </button>
            </div>

            <button type="submit" className="btn-submit-emerald" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Đang đặt lại mật khẩu...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận mật khẩu mới</span>
                  <FinanceIcon name="arrow" size={17} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="modal-footer-box">
          <p className="modal-footer-text">
            Nhớ mật khẩu rồi?{' '}
            <button
              type="button"
              className="btn-text-emerald"
              onClick={onSwitchToLogin}
            >
              Quay lại Đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

