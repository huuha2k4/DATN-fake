import { useState } from 'react';
import './OnboardingWizardModal.css';
import { accountApi, type AccountTypeCode } from '../../account-management/api/accountApi';
import { POPULAR_BANKS_AND_WALLETS, type BankOrWalletPreset } from '../../account-management/constants/banksData';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

interface FinancialGoal {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

const FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: 'expense_tracking',
    title: 'Kiểm soát chi tiêu hàng ngày',
    desc: 'Biết rõ tiền đi đâu mỗi ngày, không lo thâm hụt ví',
    icon: '📊',
  },
  {
    id: 'savings',
    title: 'Tích lũy & Tiết kiệm',
    desc: 'Đạt các mục tiêu tài chính ngắn và dài hạn nhanh hơn',
    icon: '🎯',
  },
  {
    id: 'group_family',
    title: 'Quản lý quỹ nhóm & Gia đình',
    desc: 'Chia tiền sòng phẳng, quản lý ví trẻ em và gia đình',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'debt_management',
    title: 'Theo dõi vay nợ & Dòng tiền',
    desc: 'Ghi nhớ các khoản vay, cho mượn và nhắc nợ tự động',
    icon: '🤝',
  },
];

const ACCOUNT_TYPES: { type: AccountTypeCode; label: string; icon: string; defaultName: string }[] = [
  { type: 'CASH', label: 'Tiền mặt', icon: '💵', defaultName: 'Tiền mặt ví' },
  { type: 'BANK_ACCOUNT', label: 'Ngân hàng', icon: '🏦', defaultName: 'Tài khoản ngân hàng' },
  { type: 'E_WALLET', label: 'Ví điện tử', icon: '📱', defaultName: 'Ví điện tử' },
];

export function OnboardingWizardModal({ isOpen, onClose, userName }: OnboardingWizardModalProps) {
  const [step, setStep] = useState<number>(1);

  // Step 1: Goal
  const [selectedGoal, setSelectedGoal] = useState<string>('expense_tracking');

  // Step 2: First Wallet
  const [walletType, setWalletType] = useState<AccountTypeCode>('CASH');
  const [walletName, setWalletName] = useState<string>('Tiền mặt ví');
  const [initialBalance, setInitialBalance] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [searchPreset, setSearchPreset] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Step 3: Spending estimate
  const [spendingLimit, setSpendingLimit] = useState<string>('5000000');

  const formatWithDots = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('vi-VN');
  };

  const formatCurrency = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  // Lọc danh sách ngân hàng / ví điện tử theo loại đã chọn
  const filteredPresets = POPULAR_BANKS_AND_WALLETS.filter((item) => {
    if (walletType === 'BANK_ACCOUNT' && item.kind !== 'BANK') return false;
    if (walletType === 'E_WALLET' && item.kind !== 'E_WALLET') return false;
    if (!searchPreset.trim()) return true;
    const q = searchPreset.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.shortName.toLowerCase().includes(q);
  });

  const handleSelectPreset = (preset: BankOrWalletPreset) => {
    setSelectedPreset(preset);
    if (walletType === 'BANK_ACCOUNT') {
      setWalletName(`Ngân hàng ${preset.shortName}`);
    } else {
      setWalletName(`Ví ${preset.shortName}`);
    }
  };

  const handleNextStep = async () => {
    setErrorMsg('');
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!walletName.trim()) {
        setErrorMsg('Vui lòng nhập tên ví của bạn');
        return;
      }
      setIsSubmitting(true);
      const balanceNum = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
      try {
        const res = await accountApi.createAccount({
          name: walletName.trim(),
          accountType: walletType,
          initialBalance: balanceNum,
          currencyCode: 'VND',
          description: selectedPreset ? `${selectedPreset.name} khởi tạo qua Onboarding` : 'Ví ban đầu được tạo qua Onboarding Wizard Finora Web',
          color: /^#[0-9A-Fa-f]{6}$/.test(selectedPreset?.brandColor || '') ? selectedPreset?.brandColor : undefined,
          isIncludedInTotal: true,
        });
        if (res && res.id) {
          setStep(3);
        } else {
          setErrorMsg('Không thể tạo ví, vui lòng thử lại');
        }
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || 'Lỗi kết nối khi tạo ví. Bạn có thể nhấn Bỏ qua.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="finora-onboarding-overlay">
      <div className="finora-onboarding-card">
        {/* Header Progress */}
        <div className="onboarding-header">
          <div className="onboarding-progress-track">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`onboarding-progress-bar ${s <= step ? 'active' : ''}`}
              />
            ))}
          </div>
          <button type="button" className="onboarding-skip-btn" onClick={onClose}>
            Bỏ qua
          </button>
        </div>

        {/* Content Body */}
        <div className="onboarding-body">
          {/* STEP 1: CHỌN MỤC TIÊU */}
          {step === 1 && (
            <div>
              <div className="onboarding-badge">✨ Chào mừng đến với Finora</div>
              <h2 className="onboarding-title">
                {userName ? `Xin chào ${userName}!` : 'Chào mừng bạn đến với Finora!'}
              </h2>
              <p className="onboarding-subtitle">
                Mục tiêu tài chính ưu tiên nhất của bạn trong giai đoạn này là gì? Finora sẽ tối ưu các đề xuất phù hợp cho bạn.
              </p>

              <div className="goals-grid">
                {FINANCIAL_GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <div
                      key={goal.id}
                      className={`goal-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedGoal(goal.id)}
                    >
                      <span className="goal-option-icon">{goal.icon}</span>
                      <div className="goal-option-info">
                        <div className="goal-option-name">{goal.title}</div>
                        <div className="goal-option-desc">{goal.desc}</div>
                      </div>
                      {isSelected && <div className="goal-check-circle">✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: THIẾT LẬP VÍ ĐẦU TIÊN */}
          {step === 2 && (
            <div>
              <div className="onboarding-badge">💳 Bước 2/4 · Nguồn tiền ban đầu</div>
              <h2 className="onboarding-title">Tạo ví tiền đầu tiên</h2>
              <p className="onboarding-subtitle">
                Để bắt đầu quản lý thu chi, bạn cần ít nhất một tài khoản hoặc ví tiền. Bạn luôn có thể thêm bao nhiêu ví tùy ý sau này.
              </p>

              {/* Loại ví */}
              <div className="form-group">
                <label>Loại tài khoản / ví</label>
                <div className="wallet-type-grid">
                  {ACCOUNT_TYPES.map((t) => {
                    const isSelected = walletType === t.type;
                    return (
                      <div
                        key={t.type}
                        className={`wallet-type-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setWalletType(t.type);
                          setSelectedPreset(null);
                          setSearchPreset('');
                          if (t.type === 'CASH') {
                            setWalletName('Tiền mặt ví');
                          } else if (t.type === 'BANK_ACCOUNT') {
                            setWalletName('Tài khoản ngân hàng');
                          } else {
                            setWalletName('Ví điện tử');
                          }
                        }}
                      >
                        <span className="type-icon">{t.icon}</span>
                        <span className="type-label">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BỘ CHỌN NGÂN HÀNG HOẶC VÍ ĐIỆN TỬ */}
              {(walletType === 'BANK_ACCOUNT' || walletType === 'E_WALLET') && (
                <div className="form-group">
                  <label>
                    {walletType === 'BANK_ACCOUNT' ? 'Chọn ngân hàng của bạn' : 'Chọn ví điện tử'}
                  </label>
                  <div className="preset-picker-box">
                    <input
                      type="text"
                      className="preset-search-input"
                      placeholder={walletType === 'BANK_ACCOUNT' ? 'Tìm ngân hàng (MB, VCB, ACB, Techcombank...)' : 'Tìm ví (MoMo, ZaloPay, ShopeePay...)'}
                      value={searchPreset}
                      onChange={(e) => setSearchPreset(e.target.value)}
                    />
                    <div className="preset-list-scroll">
                      {filteredPresets.map((p) => {
                        const isPresetActive = selectedPreset?.code === p.code;
                        return (
                          <div
                            key={p.code}
                            className={`preset-item-chip ${isPresetActive ? 'selected' : ''}`}
                            onClick={() => handleSelectPreset(p)}
                          >
                            {p.logoUrl ? (
                              <img src={p.logoUrl} alt={p.shortName} className="preset-logo" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                            ) : (
                              <div className="preset-logo-fallback">{p.shortName.slice(0, 2)}</div>
                            )}
                            <span className="preset-name">{p.shortName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tên ví */}
              <div className="form-group">
                <label>Tên ví</label>
                <input
                  type="text"
                  className="form-input"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="Ví dụ: Tiền mặt, MB Bank, Momo..."
                />
              </div>

              {/* Số dư hiện có */}
              <div className="form-group">
                <label>Số dư hiện có</label>
                <input
                  type="text"
                  className="form-input"
                  value={initialBalance ? formatWithDots(initialBalance) : ''}
                  onChange={(e) => setInitialBalance(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                />
              </div>

              {errorMsg && <div className="error-banner">{errorMsg}</div>}
            </div>
          )}

          {/* STEP 3: KẾ HOẠCH HẠN MỨC THÁNG */}
          {step === 3 && (
            <div>
              <div className="onboarding-badge">🎯 Bước 3/4 · Kỷ luật tài chính</div>
              <h2 className="onboarding-title">Dự kiến chi tiêu tháng này</h2>
              <p className="onboarding-subtitle">
                Thiết lập hạn mức chi tiêu dự kiến để FinAI tự động cảnh báo khi bạn sắp chạm ngưỡng bội chi.
              </p>

              <div className="budget-box">
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#047857', marginBottom: '8px' }}>
                  Hạn mức chi tiêu mong muốn
                </div>
                <input
                  type="text"
                  className="budget-amount-input"
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(e.target.value.replace(/\D/g, ''))}
                />
                <div className="budget-display-formatted">{formatCurrency(spendingLimit)}</div>
              </div>

              <div className="quick-chips-row">
                {['3000000', '5000000', '10000000', '15000000'].map((chipVal) => (
                  <button
                    key={chipVal}
                    type="button"
                    className={`quick-chip ${spendingLimit === chipVal ? 'selected' : ''}`}
                    onClick={() => setSpendingLimit(chipVal)}
                  >
                    {(parseInt(chipVal, 10) / 1000000).toFixed(0)} triệu
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Bạn có thể tạo ngân sách chi tiết cho từng hạng mục (Ăn uống, Tiền nhà, Mua sắm...) ở menu <strong>Ngân sách</strong> bất cứ lúc nào.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: TÍNH NĂNG VƯỢT TRỘI */}
          {step === 4 && (
            <div>
              <div className="onboarding-badge">🚀 Sẵn sàng trải nghiệm</div>
              <h2 className="onboarding-title">Thiết lập hoàn tất!</h2>
              <p className="onboarding-subtitle">
                Chào mừng bạn bước vào trải nghiệm quản lý tài chính hiện đại cùng 3 tính năng đột phá:
              </p>

              <div className="feature-cards-grid">
                <div className="feature-item-card">
                  <span className="feature-item-icon">🤖</span>
                  <div>
                    <div className="feature-item-title">FinAI Agent thông minh</div>
                    <p className="feature-item-desc">
                      Trò chuyện trực tiếp để tra cứu phân tích dòng tiền, thói quen tiêu dùng và dự phóng số dư 30 ngày tới.
                    </p>
                  </div>
                </div>

                <div className="feature-item-card">
                  <span className="feature-item-icon">🧾</span>
                  <div>
                    <div className="feature-item-title">Quét hóa đơn AI (OCR)</div>
                    <p className="feature-item-desc">
                      Tải lên hóa đơn ăn uống, siêu thị — AI tự động nhận diện giá trị, danh mục và nhập sổ trong tích tắc.
                    </p>
                  </div>
                </div>

                <div className="feature-item-card">
                  <span className="feature-item-icon">👥</span>
                  <div>
                    <div className="feature-item-title">Quỹ nhóm & Gia đình</div>
                    <p className="feature-item-desc">
                      Minh bạch hóa các khoản chi chung trong gia đình, bạn bè và lập ví chi tiêu cho con nhỏ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="onboarding-footer">
          {step > 1 && (
            <button
              type="button"
              className="btn-prev"
              onClick={() => setStep((s) => s - 1)}
            >
              Quay lại
            </button>
          )}

          <button
            type="button"
            className="btn-next"
            disabled={isSubmitting}
            onClick={handleNextStep}
          >
            {isSubmitting ? (
              'Đang tạo ví...'
            ) : step === 4 ? (
              'Khám phá Finora ngay 🚀'
            ) : step === 2 ? (
              'Tạo ví & Tiếp tục'
            ) : (
              'Tiếp tục'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
