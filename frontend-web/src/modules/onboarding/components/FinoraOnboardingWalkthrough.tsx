import { useState } from 'react';
import {
  FileText,
  Camera,
  ArrowLeftRight,
  PieChart,
  Target,
  MessageSquare,
  TrendingUp,
  LineChart,
  Users,
  Wallet,
  Scale,
  Award,
  PiggyBank,
  CheckCircle2,
  Banknote,
  Landmark,
  Smartphone,
} from 'lucide-react';
import './FinoraOnboardingWalkthrough.css';
import { accountApi, type AccountTypeCode } from '../../account-management/api/accountApi';
import { POPULAR_BANKS_AND_WALLETS, type BankOrWalletPreset } from '../../account-management/constants/banksData';

const ONBOARDING_PAGES = [
  {
    step: '01 / 07',
    title: 'Chào mừng đến Finora',
    highlight: 'Tài chính thông minh, cuộc sống an tâm.',
    desc: 'Finora là người bạn đồng hành giúp bạn quản lý tiền bạc hiệu quả, khoa học và dễ dàng hơn.',
    img: '/onboarding/slide_1.png',
    chips: [],
    btnText: 'Tiếp tục →',
  },
  {
    step: '02 / 07',
    title: 'Quản lý thu chi dễ dàng',
    highlight: 'Mọi khoản tiền đều trong tầm kiểm soát.',
    desc: 'Theo dõi từng khoản thu, chi tiêu hàng ngày một cách trực quan, chính xác chỉ trong vài giây.',
    img: '/onboarding/slide_2.png',
    chips: [
      { Icon: FileText, label: 'Ghi chép giao dịch' },
      { Icon: Camera, label: 'Quét hóa đơn' },
      { Icon: ArrowLeftRight, label: 'Chuyển tiền giữa các ví' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '03 / 07',
    title: 'Ngân sách & Mục tiêu tài chính',
    highlight: 'Chi tiêu có kế hoạch, tiết kiệm có mục tiêu.',
    desc: 'Thiết lập hạn mức chi tiêu cho từng danh mục và theo dõi tiến độ tích lũy cho những ước mơ lớn.',
    img: '/onboarding/slide_3.png',
    chips: [
      { Icon: PieChart, label: 'Lập ngân sách kiểm soát' },
      { Icon: Target, label: 'Đặt mục tiêu tích lũy' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '04 / 07',
    title: 'FinAI – Trợ lý tài chính thông minh',
    highlight: 'Chỉ cần hỏi, FinAI sẽ hỗ trợ bạn.',
    desc: 'Tự động phân tích xu hướng thu chi, cảnh báo thâm hụt và dự báo số dư tương lai chính xác 30 ngày.',
    img: '/onboarding/slide_4.png',
    chips: [
      { Icon: MessageSquare, label: 'Tư vấn chi tiêu' },
      { Icon: TrendingUp, label: 'Phân tích thu chi' },
      { Icon: LineChart, label: 'Dự báo số dư' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '05 / 07',
    title: 'Quản lý tài chính cùng nhau',
    highlight: 'Chia sẻ trách nhiệm, gắn kết tài chính.',
    desc: 'Tạo nhóm gia đình, bạn bè hoặc người thân để cùng quản lý quỹ chung và chia sẻ chi tiêu công bằng.',
    img: '/onboarding/slide_5.png',
    chips: [
      { Icon: Users, label: 'Tạo nhóm linh hoạt' },
      { Icon: Wallet, label: 'Quản lý quỹ chung' },
      { Icon: Scale, label: 'Cân đối nợ' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '06 / 07',
    title: 'Ví của bé – Học cách quản lý tiền',
    highlight: 'Xây dựng thói quen tài chính từ nhỏ.',
    desc: 'Giao nhiệm vụ làm việc nhà, thưởng điểm và hướng dẫn con cái biết quý trọng giá trị đồng tiền.',
    img: '/onboarding/slide_6.png',
    chips: [
      { Icon: Award, label: 'Nhiệm vụ nhận thưởng' },
      { Icon: PiggyBank, label: 'Tiết kiệm thông minh' },
      { Icon: FileText, label: 'Báo cáo chi tiêu' },
    ],
    btnText: 'Tiếp tục →',
  },
  {
    step: '07 / 07',
    title: 'Tạo ví đầu tiên',
    highlight: 'Thiết lập chiếc ví của bạn để bắt đầu hành trình cùng Finora.',
    desc: 'Finora cần ít nhất một tài khoản để ghi chép. Bạn có thể thêm nhiều ví khác bất cứ lúc nào.',
    img: '/onboarding/slide_7.png',
    chips: [
      { Icon: CheckCircle2, label: 'Tạo ví cá nhân' },
      { Icon: CheckCircle2, label: 'Nhập số dư ban đầu' },
      { Icon: CheckCircle2, label: 'Sẵn sàng quản lý tài chính' },
    ],
    btnText: 'Tạo ví ngay →',
  },
];

const ACCOUNT_TYPES: { type: AccountTypeCode; label: string; Icon: any; defaultName: string }[] = [
  { type: 'CASH', label: 'Tiền mặt', Icon: Banknote, defaultName: 'Tiền mặt ví' },
  { type: 'BANK_ACCOUNT', label: 'Ngân hàng', Icon: Landmark, defaultName: 'Tài khoản ngân hàng' },
  { type: 'E_WALLET', label: 'Ví điện tử', Icon: Smartphone, defaultName: 'Ví điện tử' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export function FinoraOnboardingWalkthroughWeb({ isOpen, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingUpWallet, setIsSettingUpWallet] = useState(false);

  // Form state
  const [walletType, setWalletType] = useState<AccountTypeCode>('CASH');
  const [walletName, setWalletName] = useState('Tiền mặt ví');
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [searchPreset, setSearchPreset] = useState('');
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const formatWithDots = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('vi-VN');
  };

  const filteredPresets = POPULAR_BANKS_AND_WALLETS.filter((item) => {
    if (walletType === 'BANK_ACCOUNT' && item.kind !== 'BANK') return false;
    if (walletType === 'E_WALLET' && item.kind !== 'E_WALLET') return false;
    if (!searchPreset.trim()) return true;
    const q = searchPreset.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.shortName.toLowerCase().includes(q);
  });

  const handleSelectPreset = (preset: BankOrWalletPreset) => {
    setSelectedPreset(preset);
    setIsBankPickerOpen(false);
    if (walletType === 'BANK_ACCOUNT') {
      setWalletName(`Ngân hàng ${preset.shortName}`);
    } else {
      setWalletName(`Ví ${preset.shortName}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < 6) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (!isSettingUpWallet) {
        setIsSettingUpWallet(true);
      } else {
        handleCreateWallet();
      }
    }
  };

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      setErrorMsg('Vui lòng nhập tên ví của bạn');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    const balanceNum = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
    try {
      const res = await accountApi.createAccount({
        name: walletName.trim(),
        accountType: walletType,
        initialBalance: balanceNum,
        currencyCode: 'VND',
        description: selectedPreset ? `${selectedPreset.name} khởi tạo qua Onboarding` : 'Ví khởi tạo ban đầu',
        color: /^#[0-9A-Fa-f]{6}$/.test(selectedPreset?.brandColor || '') ? selectedPreset?.brandColor : undefined,
      });
      if (res && res.id) {
        onClose();
      } else {
        setErrorMsg('Không thể tạo ví, vui lòng thử lại');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Lỗi kết nối. Bạn có thể nhấn Bỏ qua.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSlide = ONBOARDING_PAGES[currentIndex];

  return (
    <div className="finora-walkthrough-overlay">
      <div className="walkthrough-modal-card">
        {/* ── CỘT TRÁI (45%): Nền Gradient + Glow + Mascot 3D + Sóng SVG Bézier ── */}
        <div className="walkthrough-col-visual">
          <div className="walkthrough-visual-glow" />

          {/* Topbar: Logo Finora & Nút bỏ qua trên Mobile */}
          <div className="walkthrough-visual-topbar">
            <div className="walkthrough-brand">
              <img src="/logo.png" alt="Finora" className="walkthrough-logo-badge" style={{ objectFit: 'contain' }} />
              <span className="walkthrough-brand-title">Finora</span>
            </div>
            <button
              type="button"
              className="walkthrough-skip-btn walkthrough-mobile-skip"
              style={{ display: 'none', color: '#ffffff' }}
              onClick={onClose}
            >
              Bỏ qua
            </button>
          </div>

          {/* Mascot 3D lớn chiếm 75–85% vùng visual */}
          <div className="walkthrough-mascot-wrapper">
            <img
              key={currentSlide.img}
              src={currentSlide.img}
              alt={currentSlide.title}
              className="walkthrough-mascot-img"
            />
          </div>

          {/* Sóng SVG uốn lượn mềm mại phía sau chân icon */}
          <div className="walkthrough-waves-container">
            <svg
              viewBox="0 0 1440 140"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="webWave1" x1="0%" y1="0%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#047857" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00B87A" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="webWave2" x1="100%" y1="0%" x2="0%" y2="80%">
                  <stop offset="0%" stopColor="#00B87A" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#34D399" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="webWave3" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34D399" stopOpacity="0.75" />
                  <stop offset="60%" stopColor="#6EE7B7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {/* Lớp sóng 1 */}
              <path
                d="M 0 35 C 240 85, 520 15, 800 60 C 1080 105, 1260 25, 1440 45 L 1440 140 L 0 140 Z"
                fill="url(#webWave1)"
              />
              {/* Lớp sóng 2 */}
              <path
                d="M 0 65 C 220 20, 540 100, 840 45 C 1120 -10, 1320 80, 1440 50 L 1440 140 L 0 140 Z"
                fill="url(#webWave2)"
              />
              {/* Lớp sóng 3 */}
              <path
                d="M 0 90 C 260 125, 580 55, 880 95 C 1160 135, 1340 60, 1440 80 L 1440 140 L 0 140 Z"
                fill="url(#webWave3)"
              />
              {/* Lớp sóng viền trắng nhẹ nhàng ở đáy */}
              <path
                d="M 0 115 C 280 80, 560 135, 880 110 C 1160 85, 1340 130, 1440 118 L 1440 140 L 0 140 Z"
                fill="#FFFFFF"
                fillOpacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* ── CỘT PHẢI (55%): Nội dung chi tiết & Form tạo ví ── */}
        <div className="walkthrough-col-content">
          {/* Header hàng trên bên nội dung (Desktop) */}
          <div className="walkthrough-content-topbar">
            <button type="button" className="walkthrough-skip-btn" onClick={onClose}>
              Bỏ qua
            </button>
          </div>

          {/* Dots tiến trình 7 bước */}
          <div className="walkthrough-dots-row">
            {ONBOARDING_PAGES.map((_, idx) => (
              <div
                key={idx}
                className={`walkthrough-dot ${currentIndex === idx ? 'active' : ''}`}
              />
            ))}
          </div>

          {!isSettingUpWallet ? (
            currentIndex === 0 ? (
              <div className="walkthrough-text-body">
                <h2 className="walkthrough-welcome-title">{currentSlide.title}</h2>
                <div className="walkthrough-welcome-highlight">{currentSlide.highlight}</div>
                <p className="walkthrough-welcome-desc">{currentSlide.desc}</p>
                <div className="walkthrough-welcome-quote-card">
                  <div className="walkthrough-quote-bar" />
                  <div className="walkthrough-quote-text-group">
                    <div className="walkthrough-quote-title">Đồng hành tin cậy cho ví tiền của bạn</div>
                    <div className="walkthrough-quote-bullet-list">
                      <div className="walkthrough-quote-bullet-item">
                        <span className="walkthrough-quote-bullet-dot" />
                        <span>Đơn giản hóa quản lý chi tiêu</span>
                      </div>
                      <div className="walkthrough-quote-bullet-item">
                        <span className="walkthrough-quote-bullet-dot" />
                        <span>Dự báo tương lai tài chính</span>
                      </div>
                      <div className="walkthrough-quote-bullet-item">
                        <span className="walkthrough-quote-bullet-dot" />
                        <span>Bảo mật và riêng tư tuyệt đối</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="walkthrough-text-body">
                <span className="walkthrough-step-badge">{currentSlide.step}</span>
                <h2 className="walkthrough-title">{currentSlide.title}</h2>
                <div className="walkthrough-highlight">{currentSlide.highlight}</div>
                <p className="walkthrough-desc">{currentSlide.desc}</p>

                {currentSlide.chips.length > 0 && (
                  <div className="walkthrough-chips-row">
                    {currentSlide.chips.map((chip, cIdx) => {
                      const IconComp = chip.Icon;
                      return (
                        <div key={cIdx} className="walkthrough-chip">
                          <div className="walkthrough-chip-icon-wrapper">
                            <IconComp size={20} color="#059669" strokeWidth={2.2} />
                          </div>
                          <span className="walkthrough-chip-label">{chip.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : (
            /* FORM THIẾT LẬP VÍ Ở BƯỚC 7 */
            <div className="walkthrough-text-body" style={{ width: '100%', maxWidth: '480px' }}>
              <span className="walkthrough-step-badge">07 / 07</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 14px', color: '#0F172A' }}>
                Chọn loại nguồn tiền của bạn
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {ACCOUNT_TYPES.map((t) => {
                  const isSelected = walletType === t.type;
                  const TypeIcon = t.Icon;
                  return (
                    <div
                      key={t.type}
                      onClick={() => {
                        setWalletType(t.type);
                        setSelectedPreset(null);
                        setSearchPreset('');
                        setIsBankPickerOpen(false);
                        if (t.type === 'CASH') setWalletName('Tiền mặt ví');
                        else if (t.type === 'BANK_ACCOUNT') setWalletName('Tài khoản ngân hàng');
                        else setWalletName('Ví điện tử');
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '12px 6px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #007B58' : '1.5px solid #E2E8F0',
                        background: isSelected ? '#ECFDF5' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <TypeIcon size={24} color={isSelected ? '#007B58' : '#64748B'} strokeWidth={2} style={{ marginBottom: '6px' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#007B58' : '#475569' }}>
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {(walletType === 'BANK_ACCOUNT' || walletType === 'E_WALLET') && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      {walletType === 'E_WALLET' ? 'Chọn ví điện tử *' : 'Chọn ngân hàng *'}
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                      {selectedPreset ? 'Nhấn đổi để chọn lại' : 'Gõ tên hoặc mã'}
                    </span>
                  </div>

                  {selectedPreset ? (
                    /* Display Selected Bank Card with Change Button - CHUẨN CARD MÀN TẠO VÍ WEB */
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        borderRadius: '16px',
                        border: '1.5px solid #A7F3D0',
                        backgroundColor: '#ECFDF5',
                        padding: '10px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: 'flex',
                            width: '38px',
                            height: '38px',
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            padding: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          {selectedPreset.logoUrl ? (
                            <img
                              src={selectedPreset.logoUrl}
                              alt={selectedPreset.shortName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.style.backgroundColor = selectedPreset.bgColor;
                                  e.currentTarget.parentElement.style.color = selectedPreset.textColor;
                                  e.currentTarget.parentElement.innerText = selectedPreset.shortName.slice(0, 3);
                                }
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                display: 'flex',
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '11px',
                                backgroundColor: selectedPreset.bgColor,
                                color: selectedPreset.textColor,
                              }}
                            >
                              {selectedPreset.shortName.slice(0, 3)}
                            </span>
                          )}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                              {selectedPreset.shortName}
                            </strong>
                            <span
                              style={{
                                borderRadius: '6px',
                                backgroundColor: '#D1FAE5',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                color: '#007B58',
                              }}
                            >
                              {selectedPreset.code}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11.5px', color: '#047857' }}>
                            {selectedPreset.name}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreset(null);
                          setSearchPreset('');
                          setIsBankPickerOpen(true);
                        }}
                        style={{
                          flexShrink: 0,
                          borderRadius: '10px',
                          border: '1.5px solid #A7F3D0',
                          backgroundColor: '#FFFFFF',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#007B58',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        Đổi
                      </button>
                    </div>
                  ) : (
                    /* Search Input & Dropdown Picker - CHUẨN 100% NHƯ MÀN THÊM VÍ WEB */
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderRadius: '12px',
                          border: '1.5px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          padding: '0 12px',
                          height: '42px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{ color: '#94A3B8', fontSize: '14px', display: 'flex' }}>🔍</span>
                        <input
                          type="text"
                          placeholder={
                            walletType === 'E_WALLET'
                              ? 'Tìm ví: MoMo, ZaloPay, ShopeePay, Viettel...'
                              : 'Tìm ngân hàng: VCB, Vietcombank, Techcombank, MB...'
                          }
                          value={searchPreset}
                          onChange={(e) => {
                            setSearchPreset(e.target.value);
                            setIsBankPickerOpen(true);
                          }}
                          onFocus={() => setIsBankPickerOpen(true)}
                          style={{
                            width: '100%',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#0F172A',
                            outline: 'none',
                            border: 'none',
                            backgroundColor: 'transparent',
                          }}
                        />
                        {searchPreset && (
                          <button
                            type="button"
                            onClick={() => setSearchPreset('')}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Dropdown danh sách ngân hàng khi ấn vào ô tìm kiếm */}
                      {isBankPickerOpen && !selectedPreset && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '100%',
                            marginTop: '6px',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            borderRadius: '14px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            padding: '6px',
                            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
                            zIndex: 40,
                          }}
                        >
                          {(() => {
                            const targetKind = walletType === 'E_WALLET' ? 'E_WALLET' : 'BANK';
                            const filtered = POPULAR_BANKS_AND_WALLETS.filter((item) => {
                              if (item.kind !== targetKind) return false;
                              if (!searchPreset.trim()) return true;
                              const q = searchPreset.toLowerCase();
                              return (
                                item.code.toLowerCase().includes(q) ||
                                item.shortName.toLowerCase().includes(q) ||
                                item.name.toLowerCase().includes(q)
                              );
                            });

                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                                  Không tìm thấy {walletType === 'E_WALLET' ? 'ví' : 'ngân hàng'} phù hợp
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'grid', gap: '4px' }}>
                                {filtered.map((item) => (
                                  <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => handleSelectPreset(item)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      borderRadius: '10px',
                                      padding: '8px 10px',
                                      textAlign: 'left',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      cursor: 'pointer',
                                      width: '100%',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <span
                                      style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '8px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        padding: '2px',
                                      }}
                                    >
                                      {item.logoUrl ? (
                                        <img
                                          src={item.logoUrl}
                                          alt={item.shortName}
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                            if (e.currentTarget.parentElement) {
                                              e.currentTarget.parentElement.style.backgroundColor = item.bgColor;
                                              e.currentTarget.parentElement.style.color = item.textColor;
                                              e.currentTarget.parentElement.innerText = item.shortName.slice(0, 3);
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            backgroundColor: item.bgColor,
                                            color: item.textColor,
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          {item.shortName.slice(0, 3)}
                                        </span>
                                      )}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                                        {item.shortName}
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#007B58', flexShrink: 0 }}>
                                      {item.code}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Tên ví</label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Số dư ban đầu</label>
                <input
                  type="text"
                  value={initialBalance ? formatWithDots(initialBalance) : ''}
                  onChange={(e) => setInitialBalance(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 đ"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '16px', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              {errorMsg && <div style={{ color: '#EF4444', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{errorMsg}</div>}
            </div>
          )}

          {/* Nút Tiếp tục / Hoàn tất */}
          <div className="walkthrough-actions">
            <button
              type="button"
              className="walkthrough-btn-primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo ví...' : isSettingUpWallet ? 'Hoàn tất & Khám phá Finora' : currentSlide.btnText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
