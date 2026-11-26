import { useState } from 'react';
import {
  Wallet,
  Layers,
  Target,
  PiggyBank,
  Handshake,
  CreditCard,
  Users,
  Baby,
  ScanLine,
  Sparkles,
  TrendingUp,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Check,
  ChevronRight,
  ArrowRight,
  Sun,
  Moon,
  Mail,
  Globe
} from 'lucide-react';
import { LoginModal } from '../components/LoginModal';
import { RegisterModal } from '../components/RegisterModal';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { LegalTermsModal, type LegalModalTab } from '../../legal/components/LegalTermsModal';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useTheme } from '../../core/context/ThemeContext';
import { OrganicMintBackground } from '../components/OrganicMintBackground';

// Assets
import logoImg from '../../../assets/logo.png';
import heroMockupBannerImg from '../../../assets/landing/hero_mockup_banner.png';
import finaiRobotTransparentImg from '../../../assets/landing/finai_robot_transparent.png';
import kidMascot3dImg from '../../../assets/landing/kid_mascot_3d.png';
import faqBook3dImg from '../../../assets/landing/faq_book_3d.png';

// 6 Official Solution 3D Icons
import solWalletCoins3dImg from '../../../assets/landing/sol_wallet_coins_3d.png';
import solChartBars3dImg from '../../../assets/landing/sol_chart_bars_3d.png';
import solTargetArrow3dImg from '../../../assets/landing/sol_target_arrow_3d.png';
import solPiggy3dImg from '../../../assets/landing/sol_piggy_3d.png';
import solHandshakeShield3dImg from '../../../assets/landing/sol_handshake_shield_3d.png';
import solWalletCards3dImg from '../../../assets/landing/sol_wallet_cards_3d.png';

import groupFamilyImg from '../../../assets/landing/group_family.png';
import groupRoommateImg from '../../../assets/landing/group_roommate.png';
import avatarUser1 from '../../../assets/landing/avatar_user_1.png';
import avatarUser2 from '../../../assets/landing/avatar_user_2.png';
import avatarUser3 from '../../../assets/landing/avatar_user_3.png';
import expoGoPhoneImg from '../../../assets/landing/expo_go_phone.png';
import expoGoQrImg from '../../../assets/landing/expo_go_qr.png';

import './LandingScreen.css';

interface LandingScreenProps {
  onAuthenticated: (authRes?: any) => void;
}

export function LandingScreen({ onAuthenticated }: LandingScreenProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<LegalModalTab | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const openLegalModal = (tab: LegalModalTab) => {
    setLegalModalTab(tab);
  };

  const isDark = theme === 'dark';

  const handleLoginSuccess = (authRes?: any) => {
    setShowLogin(false);
    onAuthenticated(authRes);
  };

  const handleRegisterSuccess = (authRes?: any) => {
    setShowRegister(false);
    onAuthenticated(authRes);
  };

  const switchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setShowForgotPassword(false);
    setShowLogin(true);
  };

  const openForgotPassword = () => {
    setShowLogin(false);
    setShowRegister(false);
    setShowForgotPassword(true);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const quickFeatures = [
    { LucideIcon: Wallet, label: 'Quản lý thu chi' },
    { LucideIcon: Layers, label: 'Ngân sách thông minh' },
    { LucideIcon: Target, label: 'Mục tiêu tài chính' },
    { LucideIcon: PiggyBank, label: 'Tiết kiệm đa dạng' },
    { LucideIcon: Handshake, label: 'Quản lý nợ' },
    { LucideIcon: CreditCard, label: 'Tài khoản & ví' },
    { LucideIcon: Users, label: 'Tài chính nhóm' },
    { LucideIcon: Baby, label: 'Ví trẻ em' },
    { LucideIcon: ScanLine, label: 'Quét hóa đơn (OCR)' },
    { LucideIcon: Sparkles, label: 'FinAI Agent' },
    { LucideIcon: TrendingUp, label: 'Phân tích & dự báo' },
  ];

  const mainSolutions = [
    {
      title: 'Quản lý thu chi',
      desc: 'Ghi lại mọi khoản thu, chi, chuyển tiền và phân loại tự động.',
      img: solWalletCoins3dImg,
      LucideIcon: Wallet,
    },
    {
      title: 'Ngân sách thông minh',
      desc: 'Lập, theo dõi ngân sách theo danh mục, cảnh báo khi vượt mức.',
      img: solChartBars3dImg,
      LucideIcon: Layers,
    },
    {
      title: 'Mục tiêu tài chính',
      desc: 'Đặt mục tiêu dài hạn (mua xe, du lịch, học tập,...) và theo dõi tiến độ.',
      img: solTargetArrow3dImg,
      LucideIcon: Target,
    },
    {
      title: 'Tiết kiệm',
      desc: 'Tạo quỹ tiết kiệm: dự phòng, du lịch, mua sắm, học tập,...',
      img: solPiggy3dImg,
      LucideIcon: PiggyBank,
    },
    {
      title: 'Quản lý nợ',
      desc: 'Theo dõi khoản vay - cho vay, nhắc nhở thanh toán đúng hạn.',
      img: solHandshakeShield3dImg,
      LucideIcon: Handshake,
    },
    {
      title: 'Tài khoản & ví',
      desc: 'Quản lý nhiều ví, tài khoản ngân hàng và số dư tập trung.',
      img: solWalletCards3dImg,
      LucideIcon: CreditCard,
    },
  ];

  const faqs = [
    {
      q: 'Finora có miễn phí không?',
      a: 'Finora hoàn toàn miễn phí cho các nhu cầu quản lý tài chính cá nhân, ngân sách và theo dõi thu chi cơ bản. Chúng tôi cũng cung cấp các tính năng AI nâng cao và quản trị gia đình chuyên sâu.',
    },
    {
      q: 'Dữ liệu của tôi có an toàn không?',
      a: 'Tuyệt đối an toàn. Dữ liệu tài chính được mã hóa chuẩn ngân hàng SSL 256-bit, lưu trữ bảo mật và không bao giờ chia sẻ cho bất kỳ bên thứ ba nào.',
    },
    {
      q: 'Tôi có thể sử dụng trên những thiết bị nào?',
      a: 'Bạn có thể sử dụng mượt mà trên Trình duyệt Web (máy tính, tablet) và ứng dụng di động Mobile App (iOS / Android) với tính năng đồng bộ thời gian thực 100%.',
    },
    {
      q: 'FinAI có thể làm những gì?',
      a: 'FinAI tự động nhập liệu giao dịch qua câu nói tự nhiên tiếng Việt, bóc tách hóa đơn OCR, dự báo dòng tiền tương lai và đề xuất tối ưu hóa chi tiêu.',
    },
  ];

  return (
    <>
    <OrganicMintBackground className={`landing-page-wrapper ${isDark ? 'dark' : ''}`}>
      {/* Navigation Bar (Solid 100% opaque background, no green bleed) */}
      <div className="landing-navbar-sticky-wrapper">
        <div className="landing-content-container">
          <header className="landing-navbar">
            <div className="nav-brand">
              <span className="brand-icon-box">
                <img src={logoImg} alt="Finora Logo" className="brand-logo-img" />
              </span>
              <div className="brand-title-group">
                <strong className="brand-name">Finora</strong>
                <span className="brand-subtext">INTELLIGENCE</span>
              </div>
            </div>

            <nav className="nav-links-desktop">
              <a href="#hero" className="active">Trang chủ</a>
              <a href="#solutions">Tính năng</a>
              <a href="#finai">FinAI</a>
              <a href="#solutions">Giải pháp</a>
              <a href="#why-finora">Vì sao chọn</a>
              <a href="#faq">Hướng dẫn</a>
            </nav>

            <div className="nav-auth-actions">
              <button
                type="button"
                className="landing-theme-toggle"
                onClick={toggleTheme}
                title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              >
                {isDark ? (
                  <Sun size={17} strokeWidth={2.2} className="theme-toggle-sun-icon" />
                ) : (
                  <Moon size={17} strokeWidth={2.2} className="theme-toggle-moon-icon" />
                )}
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
                Đăng ký
              </button>
            </div>
          </header>
        </div>
      </div>

      <div className="landing-content-container">
        {/* =========================================================================
            HERO SECTION: 2 COLUMNS (ORGANIC MINT AURA BEHIND MOCKUP)
           ========================================================================= */}
        <section className="hero-modern-section" id="hero">
          <div className="hero-modern-grid">
            {/* Left Content Column */}
            <div className="hero-left-col">
              <div className="hero-pill-badge">
                <span className="sparkle">✨</span>
                <span>Quản lý tài chính thông minh với AI</span>
              </div>

              <h1 className="hero-modern-h1">
                Finora – Nền tảng quản lý tài chính cá nhân &amp; gia đình toàn diện
              </h1>

              <p className="hero-modern-desc">
                Ghi chép, kiểm soát chi tiêu, lập ngân sách, đạt mục tiêu, quản lý nhóm, chăm sóc tài chính cho con và nhận phân tích, đề xuất thông minh từ FinAI.
              </p>

              <div className="hero-modern-cta-row">
                <button
                  type="button"
                  className="btn-hero-primary"
                  onClick={() => setShowRegister(true)}
                >
                  <span>Bắt đầu miễn phí</span>
                  <FinanceIcon name="arrow" size={16} />
                </button>

                <a href="#mobile-app-expo" className="btn-hero-outline">
                  <Smartphone size={17} strokeWidth={2.2} className="text-[#007F53] dark:text-[#34D399]" />
                  <span>Trải nghiệm ứng dụng</span>
                </a>
              </div>

              <div className="hero-platforms-row">
                <div className="plat-badge">
                  <span>💻</span>
                  <span>Web App</span>
                </div>
                <a href="#mobile-app-expo" className="plat-badge plat-badge-link">
                  <span>📱</span>
                  <span>Mobile App (iOS &amp; Android)</span>
                </a>
                <div className="plat-badge">
                  <span>🛡️</span>
                  <span>Bảo mật &amp; an toàn</span>
                </div>
              </div>
            </div>

            {/* Right Showcase Column (Laptop + Mobile + Bot in Organic Depth Layer) */}
            <div className="hero-right-col">
              <div className="hero-mockup-organic-stage">
                {/* LỚP A – AMBIENT MINT GLOW: Radial-gradient hình elip rất nhạt, tập trung phía sau laptop */}
                <div className="hero-ambient-glow" aria-hidden="true" />

                {/* LỚP B – ORGANIC FLOWING WAVE: SVG dải xanh uốn lượn mềm mại dạng dải lụa/sóng hữu cơ */}
                <svg
                  className="hero-organic-waves"
                  viewBox="0 0 900 600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  <defs>
                    {/* Gradient 1: Dải xanh mint chủ đạo dưới điện thoại & vòng quanh robot */}
                    <linearGradient id="mintFlowGrad1" x1="0%" y1="80%" x2="100%" y2="20%">
                      <stop offset="0%" stopColor="#91E5BB" stopOpacity="0.85" />
                      <stop offset="45%" stopColor="#B9EFD4" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="#D8F8E8" stopOpacity="0.4" />
                    </linearGradient>

                    {/* Gradient 2: Dải xanh mint nhạt uốn cong phía sau vòm laptop & bên phải */}
                    <linearGradient id="mintFlowGrad2" x1="10%" y1="100%" x2="90%" y2="0%">
                      <stop offset="0%" stopColor="#B9EFD4" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#D8F8E8" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#E6FAF0" stopOpacity="0.25" />
                    </linearGradient>

                    {/* Gradient 3: Làn sóng mỏng phụ tăng độ tương phản và nét lụa */}
                    <linearGradient id="mintFlowGrad3" x1="85%" y1="90%" x2="15%" y2="10%">
                      <stop offset="0%" stopColor="#A2E9C5" stopOpacity="0.7" />
                      <stop offset="60%" stopColor="#C8F5DF" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#EFFDF6" stopOpacity="0.15" />
                    </linearGradient>

                    {/* Filter làm mượt viền nhẹ nhàng nhưng vẫn giữ dáng organic wave */}
                    <filter id="waveSoftBlur" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Wave 2 (Lớp sau): Dải uốn cong lớn phía sau góc trên bên phải & vòm laptop */}
                  <path
                    d="M 120 480 
                       C 220 540, 420 560, 620 500 
                       C 780 450, 880 340, 850 200 
                       C 820 80, 680 40, 520 70 
                       C 380 96, 260 210, 180 320 
                       C 130 390, 80 440, 120 480 Z"
                    fill="url(#mintFlowGrad2)"
                  />

                  {/* Wave 1 (Lớp chính - dải uốn lượn dưới chân điện thoại và laptop sang robot) */}
                  <path
                    d="M 40 430 
                       C 80 490, 200 550, 340 540 
                       C 480 530, 560 480, 680 510 
                       C 780 534, 850 480, 860 420 
                       C 870 350, 800 320, 720 350 
                       C 630 384, 540 430, 420 430 
                       C 290 430, 180 380, 90 360 
                       C 40 350, 15 390, 40 430 Z"
                    fill="url(#mintFlowGrad1)"
                    filter="url(#waveSoftBlur)"
                  />

                  {/* Wave 3 (Lớp lụa phụ): Tạo điểm nhấn mượt mà uốn quanh chân điện thoại & FinAI */}
                  <path
                    d="M 70 410 
                       C 160 480, 280 490, 380 470 
                       C 510 444, 640 460, 750 485 
                       C 820 502, 870 460, 850 400 
                       C 825 325, 750 360, 660 380 
                       C 530 410, 410 400, 300 415 
                       C 200 428, 120 370, 70 410 Z"
                    fill="url(#mintFlowGrad3)"
                  />
                </svg>

                {/* LỚP C – GROUND SHADOW: Bóng đổ xanh xám nhẹ tiếp xúc bề mặt chân thiết bị */}
                <div className="hero-ground-shadow" aria-hidden="true" />

                {/* Laptop, Mobile, Robot & Lá trang trí giữ nguyên vị trí và kích thước */}
                <img
                  src={heroMockupBannerImg}
                  alt="Finora Multi-Platform Showcase (Laptop, Mobile & FinAI Robot)"
                  className="hero-mockup-featured-img"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FEATURE PILLS STRIP (10 CORE MODULES)
           ========================================================================= */}
        <section className="quick-features-bar">
          <div className="quick-features-scroll">
            {quickFeatures.map((item, idx) => {
              const IconComp = item.LucideIcon;
              return (
                <a href="#solutions" key={idx} className="quick-feature-pill">
                  <span className="pill-icon">
                    <IconComp size={16} strokeWidth={2.2} />
                  </span>
                  <span className="pill-text">{item.label}</span>
                </a>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            SOLUTIONS GRID: 6 FEATURE CARDS WITH CLEAN WHITE CARDS & 3D ICONS
           ========================================================================= */}
        <section className="solutions-section" id="solutions">
          <div className="section-head text-center">
            <h2 className="section-title">Khám phá toàn bộ giải pháp của Finora</h2>
            <p className="section-desc">
              Không chỉ là ghi chép thu chi, Finora mang đến hệ sinh thái quản lý tài chính thông minh, phù hợp cho cá nhân, gia đình và nhóm.
            </p>
          </div>

          <div className="solutions-grid">
            {mainSolutions.map((item, idx) => {
              const HeaderIcon = item.LucideIcon;
              return (
                <div key={idx} className="solution-card">
                  <div className="solution-card-top">
                    <div className="solution-card-header">
                      <span className="sol-icon-box">
                        <HeaderIcon size={20} strokeWidth={2.2} />
                      </span>
                      <h3 className="sol-title">{item.title}</h3>
                    </div>
                    <p className="sol-desc">{item.desc}</p>
                  </div>

                  <div className="solution-card-bottom">
                    <img src={item.img} alt={item.title} className="sol-3d-img" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            FINAI BANNER & INTERACTIVE CHAT SHOWCASE (SPEC COMPLIANT 3-ZONE LAYOUT)
           ========================================================================= */}
        <section className="finai-banner-section" id="finai">
          <div className="finai-banner-card">
            {/* Lớp 1: Gradient nền tự nhiên (#F3FCF7 -> #E4F9ED) */}
            {/* Lớp 2: Radial gradient nhẹ phía sau robot và khung chat (#C8F5DF) */}
            <div className="finai-ambient-radial-glow" aria-hidden="true" />

            {/* Lớp 3: 2-3 dải sóng xanh organic bằng SVG Bézier uốn lượn sau robot & khung chat */}
            <svg
              className="finai-organic-waves-svg"
              viewBox="0 0 1200 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                {/* Gradient dải sóng chính dưới robot */}
                <linearGradient id="finaiWaveGrad1" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#DDF9EA" stopOpacity="0.4" />
                  <stop offset="35%" stopColor="#BDF3D8" stopOpacity="0.85" />
                  <stop offset="65%" stopColor="#91E8BE" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#BDF3D8" stopOpacity="0.5" />
                </linearGradient>

                {/* Gradient dải sóng nền sau lưng robot uốn sang khung chat */}
                <linearGradient id="finaiWaveGrad2" x1="20%" y1="0%" x2="90%" y2="100%">
                  <stop offset="0%" stopColor="#E6FAF0" stopOpacity="0.3" />
                  <stop offset="40%" stopColor="#BDF3D8" stopOpacity="0.6" />
                  <stop offset="85%" stopColor="#91E8BE" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#DDF9EA" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Dải sóng 1 (Sóng nền uốn rộng phía sau robot và chat card) */}
              <path
                d="M 380 360 
                   C 440 260, 520 210, 620 220 
                   C 730 230, 810 280, 930 260 
                   C 1040 240, 1140 180, 1200 190 
                   L 1200 360 Z"
                fill="url(#finaiWaveGrad2)"
              />

              {/* Dải sóng 2 (Sóng chính uốn lượn dưới chân robot và mép dưới chat) */}
              <path
                d="M 420 360 
                   C 480 300, 540 270, 620 280 
                   C 720 292, 800 340, 900 330 
                   C 1010 320, 1110 270, 1200 285 
                   L 1200 360 Z"
                fill="url(#finaiWaveGrad1)"
              />
            </svg>

            {/* KHU VỰC 1: BÊN TRÁI (~42%) */}
            <div className="finai-left-zone">
              <h2 className="finai-banner-title">
                FinAI – Trợ lý tài chính AI<br className="desktop-break" /> luôn bên bạn
              </h2>
              <p className="finai-banner-desc">
                Phân tích thói quen chi tiêu, đưa ra gợi ý, dự báo và hỗ trợ thao tác nhanh ngay trong cuộc trò chuyện.
              </p>

              <div className="finai-pills-row">
                <span className="finai-action-pill">
                  <FinanceIcon name="comments" size={14} />
                  <span>Chat tư vấn tài chính</span>
                </span>
                <span className="finai-action-pill">
                  <FinanceIcon name="spark" size={14} />
                  <span>Đề xuất hành động</span>
                </span>
                <span className="finai-action-pill">
                  <FinanceIcon name="chart" size={14} />
                  <span>Phân tích chi tiêu</span>
                </span>
                <span className="finai-action-pill">
                  <FinanceIcon name="trend-up" size={14} />
                  <span>Dự báo số dư</span>
                </span>
              </div>
            </div>

            {/* KHU VỰC 2: CHÍNH GIỮA (~23%) - ROBOT FINAI 3D NỔI BẬT */}
            <div className="finai-center-mascot-zone">
              <div className="robot-ground-shadow" aria-hidden="true" />
              <img
                src={finaiRobotTransparentImg}
                alt="FinAI 3D Assistant Robot"
                className="finai-hero-mascot-img"
              />
            </div>

            {/* KHU VỰC 3: BÊN PHẢI (~35%) - 2 THẺ CHAT TRẮNG NỔI */}
            <div className="finai-right-chat-zone">
              {/* Thẻ 1: User prompt gọn gàng */}
              <div className="finai-chat-card user-chat-card">
                <div className="chat-avatar-user" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="user-chat-text">
                  Hãy tạo giao dịch ăn uống 250.000đ hôm nay
                </div>
              </div>

              {/* Thẻ 2: AI Action confirmation card */}
              <div className="finai-chat-card ai-chat-card">
                <div className="chat-avatar-ai" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="ai-chat-content">
                  <div className="ai-chat-lead">Mình đã chuẩn bị giao dịch cho bạn:</div>
                  <ul className="ai-chat-list">
                    <li>• Loại: <strong>Chi tiêu</strong></li>
                    <li>• Danh mục: <strong>Ăn uống</strong></li>
                    <li>• Số tiền: <strong className="tx-amount">250.000đ</strong></li>
                    <li>• Bạn có muốn lưu giao dịch này không?</li>
                  </ul>
                  <div className="ai-chat-btn-group">
                    <button type="button" className="btn-save-tx">
                      <span className="btn-icon-check">✓</span> Lưu giao dịch
                    </button>
                    <button type="button" className="btn-cancel-tx">
                      ✕ Hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            DUAL SECTIONS: TÀI CHÍNH NHÓM & VÍ TRẺ EM (ORGANIC ILLUSTRATION CARDS)
           ========================================================================= */}
        <section className="dual-highlight-section">
          <div className="dual-highlight-grid">
            {/* Card 1: Tài chính nhóm */}
            <div className="highlight-feature-card group-feature-card">
              <div className="highlight-card-head">
                <div className="highlight-illus-box group-illus-box">
                  <div className="illus-mint-aura" aria-hidden="true" />
                  <img src={groupFamilyImg} alt="Tài chính nhóm" className="highlight-illus-img group-family-img" />
                </div>
                <div className="highlight-card-content">
                  <h3 className="highlight-card-title">Tài chính nhóm</h3>
                  <p className="highlight-card-sub">
                    Quản lý quỹ chung, thu chi minh bạch, chat nhóm, cấn đối nợ và chia sẻ chi phí dễ dàng.
                  </p>
                  <div className="highlight-category-tags">
                    <span className="hl-tag">Phòng trọ</span>
                    <span className="hl-tag">Gia đình</span>
                    <span className="hl-tag">Du lịch</span>
                    <span className="hl-tag">Dự án quỹ</span>
                    <span className="hl-tag">Cặp đôi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Ví trẻ em */}
            <div className="highlight-feature-card kid-feature-card">
              <div className="highlight-card-head">
                <div className="highlight-illus-box kid-illus-box">
                  <div className="illus-mint-aura" aria-hidden="true" />
                  <img src={kidMascot3dImg} alt="Ví trẻ em" className="highlight-illus-img kid-mascot-img" />
                </div>
                <div className="highlight-card-content">
                  <h3 className="highlight-card-title">Ví trẻ em</h3>
                  <p className="highlight-card-sub">
                    Giúp trẻ hình thành thói quen quản lý tiền thông minh, an toàn cùng bố mẹ.
                  </p>
                  <div className="kid-bullet-list">
                    <div className="kid-bullet-item">
                      <span className="check-dot">✓</span>
                      <span>Nhiệm vụ nhận thưởng</span>
                    </div>
                    <div className="kid-bullet-item">
                      <span className="check-dot">✓</span>
                      <span>Xin tiền bố mẹ</span>
                    </div>
                    <div className="kid-bullet-item">
                      <span className="check-dot">✓</span>
                      <span>Mục tiêu &amp; tiết kiệm</span>
                    </div>
                    <div className="kid-bullet-item">
                      <span className="check-dot">✓</span>
                      <span>Báo cáo chi tiêu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            WHY FINORA: 4 PILLARS
           ========================================================================= */}
        <section className="why-finora-section" id="why-finora">
          <div className="why-finora-layout">
            <div className="why-finora-left">
              <h2 className="why-finora-heading">
                Vì sao nên chọn Finora?
              </h2>
            </div>

            <div className="why-finora-grid">
              <div className="why-finora-item">
                <div className="why-icon-box">
                  <FinanceIcon name="spark" size={20} />
                </div>
                <div>
                  <h4 className="why-title">Toàn diện</h4>
                  <p className="why-desc">
                    Đáp ứng đầy đủ nhu cầu quản lý tài chính cá nhân và gia đình.
                  </p>
                </div>
              </div>

              <div className="why-finora-item">
                <div className="why-icon-box">
                  <FinanceIcon name="chart" size={20} />
                </div>
                <div>
                  <h4 className="why-title">Thông minh</h4>
                  <p className="why-desc">
                    Tích hợp AI hỗ trợ phân tích, dự báo và gợi ý tối ưu.
                  </p>
                </div>
              </div>

              <div className="why-finora-item">
                <div className="why-icon-box">
                  <FinanceIcon name="shield" size={20} />
                </div>
                <div>
                  <h4 className="why-title">An toàn</h4>
                  <p className="why-desc">
                    Bảo mật dữ liệu, kiểm soát quyền truy cập chặt chẽ.
                  </p>
                </div>
              </div>

              <div className="why-finora-item">
                <div className="why-icon-box">
                  <FinanceIcon name="smartphone" size={20} />
                </div>
                <div>
                  <h4 className="why-title">Đa nền tảng</h4>
                  <p className="why-desc">
                    Sử dụng linh hoạt trên Web và Mobile, đồng bộ dữ liệu thời gian thực.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            GET STARTED IN 3 STEPS + CTA BANNER
           ========================================================================= */}
        <section className="get-started-section">
          <h2 className="section-title text-center mb-8">
            Bắt đầu với Finora chỉ trong 3 bước
          </h2>

          <div className="steps-container-grid">
            <div className="step-card">
              <div className="step-number-icon">
                <FinanceIcon name="user-plus" size={22} />
              </div>
              <div className="step-content">
                <strong className="step-name">Đăng ký tài khoản</strong>
                <p className="step-sub">Tạo tài khoản nhanh với Email hoặc Google.</p>
              </div>
            </div>

            <span className="step-arrow-divider">→</span>

            <div className="step-card">
              <div className="step-number-icon">
                <FinanceIcon name="wallet" size={22} />
              </div>
              <div className="step-content">
                <strong className="step-name">Thiết lập tài chính</strong>
                <p className="step-sub">Tạo ví, danh mục, ngân sách và mục tiêu.</p>
              </div>
            </div>

            <span className="step-arrow-divider">→</span>

            <div className="step-card">
              <div className="step-number-icon">
                <FinanceIcon name="spark" size={22} />
              </div>
              <div className="step-content">
                <strong className="step-name">Trải nghiệm FinAI</strong>
                <p className="step-sub">Nhận phân tích, gợi ý và quản lý tài chính thông minh.</p>
              </div>
            </div>

            {/* Green CTA Box on the right */}
            <div className="step-cta-card">
              <div className="step-cta-icon">
                <Smartphone size={24} strokeWidth={2.2} />
              </div>
              <strong className="step-cta-title">Trải nghiệm ngay Finora</strong>
              <p className="step-cta-desc">Quản lý tài chính hiệu quả, đơn giản hơn cùng AI.</p>
              <button
                type="button"
                className="btn-step-cta"
                onClick={() => setShowRegister(true)}
              >
                Đăng ký miễn phí →
              </button>
            </div>
          </div>

          {/* Mobile App Expo Go Banner */}
          <div id="mobile-app-expo" className="expo-go-banner-card">
            <div className="expo-go-intro">
              <img
                src={expoGoPhoneImg}
                alt="Ứng dụng Expo Go"
                className="expo-go-phone-img"
              />
              <div className="expo-go-intro-text">
                <h3 className="expo-go-title">Dùng Finora trên ứng dụng (Expo Go)</h3>
                <p className="expo-go-desc">
                  Trải nghiệm nhanh phiên bản ứng dụng di động của Finora chỉ với 2 bước đơn giản.
                </p>
              </div>
            </div>

            <div className="expo-go-steps-row">
              {/* Bước 1: Tải Expo Go */}
              <div className="expo-go-step-card">
                <div className="expo-go-step-main">
                  <span className="expo-step-num">1</span>
                  <p className="expo-step-text">
                    <strong>Tải ứng dụng Expo Go</strong> trên CH Play hoặc App Store.
                  </p>
                </div>
                <div className="expo-store-buttons">
                  <a
                    href="https://play.google.com/store/apps/details?id=host.exp.exponent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="expo-store-btn"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path fill="#34A853" d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" />
                      <path fill="#FBBC05" d="M16.1 15.6l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2.1-.1-.1z" />
                      <path fill="#EA4335" d="M16.2 15.5L13 12.3 3.6 21.7c.3.4.9.4 1.6 0l11-6.2z" />
                      <path fill="#4285F4" d="M16.2 8.5l-11-6.2c-.7-.4-1.3-.4-1.6 0L13 11.7l3.2-3.2z" />
                    </svg>
                    <span>Google Play</span>
                  </a>
                  <a
                    href="https://apps.apple.com/app/expo-go/id982107779"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="expo-store-btn"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.32c.67-.81 1.12-1.94 1-3.07-.96.04-2.12.64-2.81 1.45-.62.71-1.16 1.86-1.01 2.96 1.07.08 2.15-.54 2.82-1.34z" />
                    </svg>
                    <span>App Store</span>
                  </a>
                </div>
              </div>

              {/* Bước 2: Quét mã QR */}
              <div className="expo-go-step-card expo-go-step-scan">
                <div className="expo-go-step-main">
                  <span className="expo-step-num">2</span>
                  <div>
                    <p className="expo-step-text">
                      <strong>Mở Expo Go</strong> và quét mã QR để trải nghiệm Finora ngay.
                    </p>
                    <p className="expo-step-note">iPhone: quét bằng Camera mặc định.</p>
                  </div>
                </div>
              </div>

              <span className="expo-qr-arrow" aria-hidden="true">→</span>

              {/* Khung QR cố định - nhấn để phóng to */}
              <button
                type="button"
                className="expo-qr-box"
                onClick={() => setShowQrModal(true)}
                title="Nhấn để phóng to mã QR"
                aria-label="Phóng to mã QR tải ứng dụng Finora trên Expo Go"
              >
                <img
                  src={expoGoQrImg}
                  alt="Mã QR tải ứng dụng Finora trên Expo Go"
                  className="expo-qr-img"
                />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FAQ ACCORDION SECTION
           ========================================================================= */}
        <section className="faq-modern-section" id="faq">
          <div className="faq-modern-layout">
            <div className="faq-left-title">
              <div className="faq-title-row">
                <div className="faq-icon-3d-box">
                  <div className="faq-mint-aura" aria-hidden="true" />
                  <img src={faqBook3dImg} alt="FAQ Book Icon" className="faq-book-3d-img" />
                </div>
                <h2 className="faq-heading">
                  Câu hỏi<br />thường gặp
                </h2>
              </div>
            </div>

            <div className="faq-accordion-list">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedFaq === idx}
                  className={`faq-modern-item ${expandedFaq === idx ? 'expanded' : ''}`}
                  onClick={() => toggleFaq(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleFaq(idx)
                    }
                  }}
                >
                  <div className="faq-item-question">
                    <span>{faq.q}</span>
                    <span className="faq-arrow">
                      <ChevronRight
                        size={18}
                        className={`faq-chevron-icon ${expandedFaq === idx ? 'rotated' : ''}`}
                      />
                    </span>
                  </div>
                  {expandedFaq === idx && (
                    <div className="faq-item-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          FULL-WIDTH FOOTER (DEEP GREEN WITH MULTI-LAYER ORGANIC WAVE TRANSITION)
         ========================================================================= */}
      <footer className="footer-fullwidth-wrapper">
        {/* Organic Wave Transition Divider */}
        <div className="footer-wave-divider" aria-hidden="true">
          <svg viewBox="0 0 1440 90" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            {/* Lớp sóng mờ phía sau */}
            <path
              d="M0 45C220 15 440 65 720 35C1000 5 1240 55 1440 25V90H0V45Z"
              fill="#008F63"
              fillOpacity="0.35"
            />
            {/* Lớp sóng ngọc chính chuyển tiếp */}
            <path
              d="M0 32C180 62 380 72 620 48C860 24 1100 -8 1280 18C1360 30 1410 42 1440 46V90H0V32Z"
              fill="#006B4D"
            />
          </svg>
        </div>

        <div className="footer-inner-container">
          <div className="footer-modern-top">
            {/* Brand column */}
            <div className="footer-col-brand">
              <div className="footer-brand-title">
                <img src={logoImg} alt="Finora Logo" className="footer-logo" />
                <div className="footer-brand-text-wrap">
                  <strong>Finora</strong>
                  <span className="footer-brand-subtext">INTELLIGENCE</span>
                </div>
              </div>
              <p className="footer-brand-desc">
                Nền tảng quản lý tài chính cá nhân &amp; gia đình ứng dụng AI, giúp bạn kiểm soát chi tiêu, đạt mục tiêu và xây dựng thói quen tài chính bền vững.
              </p>
            </div>

            {/* Links Columns */}
            <div className="footer-col-links">
              <h4>Sản phẩm</h4>
              <ul>
                <li><a href="#solutions">Tính năng</a></li>
                <li><a href="#finai">FinAI Agent</a></li>
                <li><a href="#mobile-app-expo">Ứng dụng Mobile</a></li>
                <li><a href="/pricing">Bảng giá</a></li>
              </ul>
            </div>

            <div className="footer-col-links">
              <h4>Hỗ trợ</h4>
              <ul>
                <li><button type="button" className="footer-link-btn" onClick={() => openLegalModal('guide')}>Hướng dẫn sử dụng</button></li>
                <li><a href="#faq">Câu hỏi thường gặp</a></li>
                <li><a href="mailto:finora.3congian@gmail.com">Liên hệ hỗ trợ</a></li>
              </ul>
            </div>

            <div className="footer-col-links">
              <h4>Pháp lý</h4>
              <ul>
                <li><button type="button" className="footer-link-btn" onClick={() => openLegalModal('terms')}>Điều khoản sử dụng</button></li>
                <li><button type="button" className="footer-link-btn" onClick={() => openLegalModal('privacy')}>Chính sách bảo mật</button></li>
                <li><button type="button" className="footer-link-btn" onClick={() => openLegalModal('cookies')}>Chính sách cookie</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-col-contact">
              <h4>Liên hệ</h4>
              <p className="contact-item">
                <Mail size={16} className="contact-lucide-icon" />
                <a href="mailto:finora.3congian@gmail.com" className="footer-contact-link">finora.3congian@gmail.com</a>
              </p>
              <p className="contact-item">
                <Globe size={16} className="contact-lucide-icon" />
                <a href="https://dev.3congian.top" target="_blank" rel="noopener noreferrer" className="footer-contact-link">dev.3congian.top</a>
              </p>
            </div>
          </div>

          <div className="footer-modern-bottom">
            <span>© {new Date().getFullYear()} Finora. All rights reserved.</span>
            <span>Đồ án tốt nghiệp – Hệ thống quản lý tài chính cá nhân tích hợp trợ lý AI</span>
          </div>
        </div>
      </footer>
    </OrganicMintBackground>

      {/* Legal & Terms & Guide Modal */}
      <LegalTermsModal
        isOpen={!!legalModalTab}
        initialTab={legalModalTab || 'terms'}
        onClose={() => setLegalModalTab(null)}
      />

      {/* Modals */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={switchToRegister}
          onForgotPassword={openForgotPassword}
        />
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleRegisterSuccess}
          onSwitchToLogin={switchToLogin}
        />
      )}

      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onSwitchToLogin={switchToLogin}
        />
      )}

      {showQrModal && (
        <div
          className="expo-qr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Mã QR Finora Expo Go"
          onClick={() => setShowQrModal(false)}
        >
          <div className="expo-qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="expo-qr-modal-close"
              onClick={() => setShowQrModal(false)}
              aria-label="Đóng"
            >
              ✕
            </button>
            <h3 className="expo-qr-modal-title">Quét mã QR để mở Finora</h3>
            <p className="expo-qr-modal-sub">
              Mở ứng dụng <strong>Expo Go</strong> (Android) hoặc <strong>Camera mặc định</strong> (iPhone)
            </p>
            <div className="expo-qr-modal-img-wrap">
              <img
                src={expoGoQrImg}
                alt="Mã QR phóng to tải ứng dụng Finora trên Expo Go"
                className="expo-qr-modal-img"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
