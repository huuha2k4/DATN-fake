import { useState } from 'react';
import { LoginModal } from '../components/LoginModal';
import { RegisterModal } from '../components/RegisterModal';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useTheme } from '../../core/context/ThemeContext';
import logoImg from '../../../assets/logo.png';
import './LandingScreen.css';

interface LandingScreenProps {
  onAuthenticated: () => void;
}

export function LandingScreen({ onAuthenticated }: LandingScreenProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  const handleLoginSuccess = () => {
    setShowLogin(false);
    onAuthenticated();
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
    onAuthenticated();
  };

  const switchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  return (
    <div className="landing-page-wrapper">
      {/* Dynamic ambient backdrop lights */}
      <div className="bg-ambient-layer">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
        <div className="ambient-blob blob-3" />
      </div>

      <div className="landing-content-container">
        {/* Navigation Bar */}
        <header className="landing-navbar">
          <a href="#" className="nav-brand" aria-label="Finora Trang chủ">
            <span className="brand-icon-box overflow-hidden p-0">
              <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
            </span>
            <div className="brand-title-group">
              <strong>Finora</strong>
              <span>INTELLIGENCE</span>
            </div>
          </a>

          <nav className="nav-links-desktop" aria-label="Điều hướng chính">
            <a href="#features">Tính năng nổi bật</a>
            <a href="#ai-assistant">Trợ lý Finora</a>
            <a href="#preview">Giao diện mẫu</a>
            <a href="#security">Bảo mật</a>
          </nav>

          <div className="nav-auth-actions">
            <button
              type="button"
              className="landing-theme-toggle"
              aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              onClick={toggleTheme}
              title={isDark ? 'Chế độ tối (Bấm để chuyển sáng)' : 'Chế độ sáng (Bấm để chuyển tối)'}
            >
              <FinanceIcon name={isDark ? 'sun' : 'moon'} size={18} />
            </button>
            <button
              type="button"
              className="btn-nav-login"
              onClick={() => setShowLogin(true)}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className="btn-nav-cta"
              onClick={() => setShowRegister(true)}
            >
              Bắt đầu miễn phí
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-pill-badge">
            <span className="sparkle">✨</span>
            <span>Finora · Nền tảng quản lý tài chính thông minh</span>
          </div>

          <h1 className="hero-h1">
            Chủ động tài chính thông minh cùng{' '}
            <span className="gradient-emerald-gold">Trí tuệ nhân tạo</span>
          </h1>

          <p className="hero-subtitle">
            Tự động theo dõi dòng tiền, quét hóa đơn bằng OCR thông minh, tối ưu ngân sách
            và nhận đề xuất dự báo tài chính chính xác từ trợ lý Finora.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => setShowRegister(true)}
            >
              <span>Trải nghiệm miễn phí ngay</span>
              <FinanceIcon name="arrow" size={18} />
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => setShowLogin(true)}
            >
              <FinanceIcon name="wallet" size={18} />
              <span>Đăng nhập hệ thống</span>
            </button>
          </div>

          <div className="hero-social-proof">
            <span><strong className="check-icon-green">✓</strong> Không phí phát sinh</span>
            <span><strong className="check-icon-green">✓</strong> Nhận diện hóa đơn OCR tự động</span>
            <span><strong className="check-icon-green">✓</strong> Bảo mật dữ liệu chuẩn ngân hàng</span>
          </div>

          {/* Interactive Mockup Dashboard Preview */}
          <div className="mockup-preview-wrapper" id="preview">
            <div className="mockup-window-header">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="mockup-url-bar">
                <span>🔒</span>
                <span>app.finora.vn/dashboard</span>
              </div>
              <div className="mockup-badge-live">
                <span className="live-pulse" />
                <span>Trực quan thời gian thực</span>
              </div>
            </div>

            <div className="mockup-window-body">
              {/* Quick stats ribbon */}
              <div className="mockup-stats-strip">
                <div className="mini-stat-card featured">
                  <div className="mini-stat-label">
                    <span>TỔNG TÀI SẢN KHẢ DỤNG</span>
                    <span>₫</span>
                  </div>
                  <div className="mini-stat-val">128.450.000 ₫</div>
                  <div className="mini-stat-sub">▲ +12.5% so với tháng trước</div>
                </div>

                <div className="mini-stat-card">
                  <div className="mini-stat-label">
                    <span>THU NHẬP THÁNG 10</span>
                    <FinanceIcon name="income" size={14} />
                  </div>
                  <div className="mini-stat-val">45.000.000 ₫</div>
                  <div className="mini-stat-sub" style={{ color: '#087557' }}>● Đạt 100% mục tiêu</div>
                </div>

                <div className="mini-stat-card">
                  <div className="mini-stat-label">
                    <span>CHI TIÊU ĐÃ KIỂM SOÁT</span>
                    <FinanceIcon name="expense" size={14} />
                  </div>
                  <div className="mini-stat-val">16.320.000 ₫</div>
                  <div className="mini-stat-sub" style={{ color: '#2563eb' }}>Đã dùng 54% hạn mức</div>
                </div>
              </div>

              {/* Chart & AI Assistant preview row */}
              <div className="mockup-dashboard-layout">
                <div className="mockup-chart-card">
                  <div className="mockup-card-title">
                    <span>Biểu đồ dòng tiền 4 tuần gần nhất</span>
                    <span style={{ fontSize: '11px', color: '#62776c' }}>Cập nhật hôm nay</span>
                  </div>
                  <div className="mockup-bars">
                    <div className="bar-col">
                      <div className="bar-pair-mockup">
                        <div className="bar-green" style={{ height: '70%' }} />
                        <div className="bar-light" style={{ height: '35%' }} />
                      </div>
                      <span>T1</span>
                    </div>
                    <div className="bar-col">
                      <div className="bar-pair-mockup">
                        <div className="bar-green" style={{ height: '55%' }} />
                        <div className="bar-light" style={{ height: '40%' }} />
                      </div>
                      <span>T2</span>
                    </div>
                    <div className="bar-col">
                      <div className="bar-pair-mockup">
                        <div className="bar-green" style={{ height: '85%' }} />
                        <div className="bar-light" style={{ height: '48%' }} />
                      </div>
                      <span>T3</span>
                    </div>
                    <div className="bar-col">
                      <div className="bar-pair-mockup">
                        <div className="bar-green" style={{ height: '62%' }} />
                        <div className="bar-light" style={{ height: '28%' }} />
                      </div>
                      <span>T4</span>
                    </div>
                  </div>
                </div>

                <div className="mockup-ai-card" id="ai-assistant">
                  <div>
                    <div className="ai-pill">
                      <FinanceIcon name="spark" size={12} />
                      Finora Advisor
                    </div>
                    <div className="ai-bubble">
                      "Tháng này bạn đã tiết kiệm vượt kế hoạch <strong>2.800.000 ₫</strong>. Finora khuyên bạn chuyển vào Quỹ khẩn cấp để sinh lãi tối ưu."
                    </div>
                  </div>
                  <div className="ai-actions-preview">
                    <span className="ai-tag">💡 Gợi ý tích lũy</span>
                    <span className="ai-tag">📊 Tự động phân loại</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="features-section" id="features">
          <div className="section-head">
            <span className="section-eyebrow">HỆ SINH THÁI TÀI CHÍNH TOÀN DIỆN</span>
            <h2 className="section-title">Mọi công cụ bạn cần để quản trị tiền bạc hiệu quả</h2>
            <p className="section-desc">
              Được thiết kế tinh gọn, sang trọng và chuẩn xác, giúp bạn nắm bắt sức khỏe tài chính trong nháy mắt.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="arrows" size={26} />
              </div>
              <h3 className="feature-card-title">Quản lý Dòng tiền Thu & Chi</h3>
              <p className="feature-card-text">
                Theo dõi từng nguồn tiền vào ra linh hoạt, đối chiếu theo ngày, tuần, tháng với độ chính xác tuyệt đối.
              </p>
              <span className="feature-card-link">Khám phá module &rarr;</span>
            </div>

            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="receipt" size={26} />
              </div>
              <h3 className="feature-card-title">Quét Hóa Đơn Tự Động (OCR)</h3>
              <p className="feature-card-text">
                Chỉ cần tải ảnh hóa đơn mua sắm, công nghệ AI tự động nhận dạng số tiền, ngày giờ và danh mục chi tiêu.
              </p>
              <span className="feature-card-link">Thử nghiệm OCR &rarr;</span>
            </div>

            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="spark" size={26} />
              </div>
              <h3 className="feature-card-title">Trợ Lý AI & Dự Báo Tài Chính</h3>
              <p className="feature-card-text">
                Phân tích thói quen tiêu dùng, cảnh báo nguy cơ vượt định mức và đưa ra dự báo số dư cho các tháng tiếp theo.
              </p>
              <span className="feature-card-link">Hỏi đáp với AI &rarr;</span>
            </div>

            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="wallet" size={26} />
              </div>
              <h3 className="feature-card-title">Lập Ngân Sách & Mục Tiêu</h3>
              <p className="feature-card-text">
                Thiết lập hạn mức chi tiêu cho từng danh mục, đặt mục tiêu mua sắm, tích lũy đầu tư rõ ràng từng bước.
              </p>
              <span className="feature-card-link">Tạo kế hoạch mới &rarr;</span>
            </div>

            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="bell" size={26} />
              </div>
              <h3 className="feature-card-title">Nhắc Nhở & Hóa Đơn Định Kỳ</h3>
              <p className="feature-card-text">
                Không còn lo trễ hạn thanh toán tiền điện, nước, internet hoặc các khoản vay định kỳ hàng tháng.
              </p>
              <span className="feature-card-link">Cài đặt lịch thông báo &rarr;</span>
            </div>

            <div className="feature-premium-card">
              <div className="feature-card-icon">
                <FinanceIcon name="bank" size={26} />
              </div>
              <h3 className="feature-card-title">Đa Nguồn Tiền & Tài Khoản</h3>
              <p className="feature-card-text">
                Tích hợp quản lý ví điện tử, tài khoản ngân hàng và quỹ tiền mặt trên một bảng điều khiển tập trung duy nhất.
              </p>
              <span className="feature-card-link">Quản lý tài khoản &rarr;</span>
            </div>
          </div>
        </section>

        {/* Impressive metrics banner */}
        <section className="metrics-banner">
          <div className="metrics-grid">
            <div>
              <div className="metric-number">99.8%</div>
              <div className="metric-label">Độ chính xác nhận diện OCR</div>
            </div>
            <div>
              <div className="metric-number">3.2x</div>
              <div className="metric-label">Tốc độ tiết kiệm tăng trung bình</div>
            </div>
            <div>
              <div className="metric-number">256-bit</div>
              <div className="metric-label">Mã hóa chuẩn ngân hàng</div>
            </div>
            <div>
              <div className="metric-number">24/7</div>
              <div className="metric-label">Trợ lý AI sẵn sàng giải đáp</div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="trust-section" id="security">
          <div className="trust-info-side">
            <span className="section-eyebrow">AN TOÀN TUYỆT ĐỐI</span>
            <h2 className="section-title">Bảo mật cấp độ cao nhất cho tài sản và dữ liệu của bạn</h2>
            <p className="section-desc">
              Finora cam kết bảo vệ toàn vẹn thông tin tài chính cá nhân của bạn với các tiêu chuẩn an ninh nghiêm ngặt và mã hóa đầu cuối.
            </p>
          </div>

          <div className="trust-card-grid">
            <div className="trust-card">
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <strong>Mã hóa chuẩn SSL/TLS</strong>
              <p>Mọi giao tiếp giữa trình duyệt và máy chủ đều được mã hóa tối tân 256-bit.</p>
            </div>
            <div className="trust-card">
              <span style={{ fontSize: '24px' }}>🔑</span>
              <strong>Xác thực đa yếu tố</strong>
              <p>Hỗ trợ bảo mật mật khẩu nhiều lớp và phiên truy cập an toàn.</p>
            </div>
            <div className="trust-card">
              <span style={{ fontSize: '24px' }}>👁️</span>
              <strong>Quyền riêng tư tuyệt đối</strong>
              <p>Dữ liệu tài chính chỉ thuộc về bạn, không bán hoặc chia sẻ cho bên thứ ba.</p>
            </div>
            <div className="trust-card">
              <span style={{ fontSize: '24px' }}>☁️</span>
              <strong>Sao lưu đám mây liên tục</strong>
              <p>Dữ liệu được sao lưu định kỳ, phòng ngừa rủi ro mất mát bất ngờ.</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Box */}
        <section className="landing-cta-box">
          <h2>Sẵn sàng làm chủ tài chính của bạn?</h2>
          <p>
            Gia nhập cộng đồng người dùng thông minh, quản lý thu chi chuẩn xác và tối ưu tương lai tài chính ngay hôm nay.
          </p>
          <div className="hero-cta-group" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => setShowRegister(true)}
            >
              <span>Tạo tài khoản Finora miễn phí</span>
              <FinanceIcon name="arrow" size={18} />
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => setShowLogin(true)}
            >
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-top">
            <div className="nav-brand">
              <span className="brand-icon-box overflow-hidden p-0" style={{ width: '40px', height: '40px' }}>
                <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
              </span>
              <div className="brand-title-group">
                <strong style={{ fontSize: '16px' }}>Finora</strong>
                <span style={{ fontSize: '9px' }}>INTELLIGENCE</span>
              </div>
            </div>

            <div className="nav-links-desktop">
              <a href="#features">Tính năng</a>
              <a href="#ai-assistant">Trợ lý AI</a>
              <a href="#preview">Giao diện</a>
              <a href="#security">Bảo mật</a>
            </div>
          </div>

          <div className="footer-copyright">
            © {new Date().getFullYear()} Finora Intelligence. Tất cả các quyền được bảo lưu. Thiết kế giao diện tài chính chuẩn mực.
          </div>
        </footer>
      </div>

      {/* Modals */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={switchToRegister}
        />
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleRegisterSuccess}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </div>
  );
}
