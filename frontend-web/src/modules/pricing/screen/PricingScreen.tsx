import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { getStoredUser } from '../../auth/api/authApi'
import { api } from '../../core/api/api'
import './PricingScreen.css'

interface PricingScreenProps {
  onNotify?: (msg: string) => void
}

interface PlanFeature {
  text: string
  included: boolean
  highlight?: boolean
}

interface PlanCard {
  id: 'FREE' | 'PREMIUM' | 'ENTERPRISE'
  name: string
  tagline: string
  badge?: string
  price: number
  billingPeriod: string
  popular?: boolean
  features: PlanFeature[]
  ctaText: string
  buttonVariant: 'secondary' | 'primary' | 'enterprise'
}

export function PricingScreen({ onNotify }: PricingScreenProps) {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  
  // Dynamic settings fetched from Admin System Settings
  const [pricingConfig, setPricingConfig] = useState({
    freeMaxWallets: 3,
    freeOcrLimit: 10,
    premiumPriceMonthly: 49000,
    enterprisePriceMonthly: 199000,
  })

  useEffect(() => {
    api.get('/public/pricing')
      .then((res) => {
        if (res.data) {
          setPricingConfig({
            freeMaxWallets: res.data.freeTierMaxWallets || 3,
            freeOcrLimit: res.data.freeTierOcrLimit || 10,
            premiumPriceMonthly: res.data.premiumTierPriceMonthly || 49000,
            enterprisePriceMonthly: res.data.enterpriseTierPriceMonthly || 199000,
          })
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dynamic pricing config, using default:', err)
      })
  }, [])

  const user = getStoredUser()
  const currentTier = (user?.subscriptionTier || 'FREE').toUpperCase()

  const premiumMonthly = pricingConfig.premiumPriceMonthly
  const enterpriseMonthly = pricingConfig.enterprisePriceMonthly

  const plans: PlanCard[] = [
    {
      id: 'FREE',
      name: 'Khởi Đầu (Free)',
      tagline: 'Dành cho cá nhân bắt đầu ghi chép và kiểm soát chi tiêu đơn giản.',
      price: 0,
      billingPeriod: 'Vĩnh viễn',
      features: [
        { text: `Tối đa ${pricingConfig.freeMaxWallets} ví tài khoản cá nhân`, included: true },
        { text: `Quét ${pricingConfig.freeOcrLimit} hóa đơn OCR mỗi tháng`, included: true },
        { text: 'Ghi chép thu chi & phân loại tự động', included: true },
        { text: 'Báo cáo tài chính cơ bản', included: true },
        { text: 'FinAI Trợ lý tài chính nâng cao', included: false },
        { text: 'Dự báo dòng tiền tương lai', included: false },
        { text: 'Không giới hạn tạo nhóm chi tiêu', included: false },
      ],
      ctaText: currentTier === 'FREE' ? 'Gói hiện tại của bạn' : 'Gói Cơ Bản',
      buttonVariant: 'secondary'
    },
    {
      id: 'PREMIUM',
      name: 'Cá Nhân (Premium)',
      tagline: 'Lựa chọn số 1 để làm chủ tài chính thông minh cùng trí tuệ nhân tạo.',
      badge: 'Khuyên Dùng ★',
      price: Math.round(premiumMonthly * (billingCycle === 'yearly' ? 10 : 1)),
      billingPeriod: billingCycle === 'yearly' ? '/năm (Tiết kiệm 2 tháng)' : '/tháng',
      popular: true,
      features: [
        { text: 'Không giới hạn số lượng ví & tài khoản ngân hàng', included: true, highlight: true },
        { text: 'Quét 100 hóa đơn OCR thông minh mỗi tháng', included: true, highlight: true },
        { text: 'FinAI Cố vấn tài chính chuyên sâu 24/7', included: true, highlight: true },
        { text: 'Dự báo tài chính & xu hướng chi tiêu tương lai', included: true },
        { text: 'Xuất báo cáo PDF, Excel chi tiết không giới hạn', included: true },
        { text: 'Quản lý vay nợ & nhắc lịch trả nợ tự động', included: true },
        { text: 'Hỗ trợ ưu tiên từ chuyên viên Finora', included: true },
      ],
      ctaText: currentTier === 'PREMIUM' ? 'Gói hiện tại' : 'Nâng cấp Premium ngay',
      buttonVariant: 'primary'
    },
    {
      id: 'ENTERPRISE',
      name: 'Gia Đình & Nhóm (VIP)',
      tagline: 'Giải pháp trọn gói hoàn hảo cho gia đình, nhóm bạn hoặc tổ chức.',
      badge: 'Đặc Quyền VIP',
      price: Math.round(enterpriseMonthly * (billingCycle === 'yearly' ? 10 : 1)),
      billingPeriod: billingCycle === 'yearly' ? '/năm (Tiết kiệm 2 tháng)' : '/tháng',
      features: [
        { text: 'Mọi quyền lợi vượt trội của gói Premium', included: true },
        { text: 'Không giới hạn quét hóa đơn OCR', included: true, highlight: true },
        { text: 'Không giới hạn số lượng quỹ nhóm & thành viên', included: true, highlight: true },
        { text: 'Ví trẻ em & nhiệm vụ việc nhà nhận tiền tiêu vặt', included: true },
        { text: 'Phân tích tài chính liên tài khoản chuyên sâu', included: true },
        { text: 'Kênh hỗ trợ kỹ thuật VIP 1-1 riêng biệt', included: true },
      ],
      ctaText: currentTier === 'ENTERPRISE' ? 'Gói hiện tại' : 'Trải nghiệm VIP',
      buttonVariant: 'enterprise'
    }
  ]

  const handleSelectPlan = (planId: string) => {
    if (planId === currentTier) {
      if (onNotify) onNotify('Bạn hiện đang sử dụng gói dịch vụ này!')
      return
    }

    setIsProcessing(planId)
    setTimeout(() => {
      setIsProcessing(null)
      if (onNotify) {
        onNotify(`Hệ thống đã ghi nhận yêu cầu nâng cấp gói ${planId}! Cổng thanh toán trực tuyến sẽ mở trong giây lát.`)
      }
    }, 800)
  }

  return (
    <div className="pricing-page-container">
      {/* Header Banner */}
      <section className="pricing-hero-banner">
        <div className="pricing-hero-badge">
          <span className="spark-emoji">✨</span>
          <span>BẢNG GIÁ DỊCH VỤ FINORA INTELLIGENCE</span>
        </div>
        <h1 className="pricing-hero-title">Đầu Tư Xứng Đáng Cho Tương Lai Tài Chính Của Bạn</h1>
        <p className="pricing-hero-desc">
          Linh hoạt nâng cấp hoặc thay đổi gói cước bất kỳ lúc nào. Không ràng buộc, minh bạch chi phí 100%.
        </p>

        {/* Billing Switch Controls */}
        <div className="pricing-switch-box">
          <button
            type="button"
            className={`switch-tab ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Thanh toán Hàng tháng
          </button>
          <button
            type="button"
            className={`switch-tab ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Thanh toán Hàng năm
            <span className="save-badge">Tiết kiệm 15%</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <div className="pricing-grid-layout">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentTier
          return (
            <div
              key={plan.id}
              className={`plan-card-item ${plan.popular ? 'is-highlighted' : ''} ${isCurrent ? 'is-active-user-tier' : ''}`}
            >
              {plan.badge && (
                <div className={`plan-ribbon ${plan.popular ? 'ribbon-popular' : 'ribbon-vip'}`}>
                  {plan.badge}
                </div>
              )}

              <div className="plan-header">
                <h2 className="plan-title">{plan.name}</h2>
                <p className="plan-desc">{plan.tagline}</p>

                <div className="plan-price-block">
                  {plan.price === 0 ? (
                    <span className="plan-price-num">Miễn Phí</span>
                  ) : (
                    <>
                      <span className="plan-curr">₫</span>
                      <span className="plan-price-num">
                        {plan.price.toLocaleString('vi-VN')}
                      </span>
                    </>
                  )}
                  <span className="plan-period">{plan.billingPeriod}</span>
                </div>
              </div>

              <div className="plan-divider" />

              {/* Feature Checklist */}
              <ul className="plan-feature-list">
                {plan.features.map((feat, idx) => (
                  <li
                    key={idx}
                    className={`plan-feature-point ${!feat.included ? 'disabled' : ''} ${feat.highlight ? 'spotlight' : ''}`}
                  >
                    <span className="check-mark">{feat.included ? '✓' : '—'}</span>
                    <span className="feature-desc">{feat.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Action Button */}
              <button
                type="button"
                className={`plan-button btn-${plan.buttonVariant} ${isCurrent ? 'btn-active-disabled' : ''}`}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent || isProcessing === plan.id}
              >
                {isProcessing === plan.id ? 'Đang kích hoạt...' : isCurrent ? '✓ Đang kích hoạt' : plan.ctaText}
              </button>
            </div>
          )
        })}
      </div>

      {/* Feature Comparison Table / FAQ */}
      <section className="pricing-faq-section">
        <h2 className="faq-title">Câu hỏi thường gặp</h2>
        <div className="faq-grid">
          <div className="faq-card">
            <h3>Làm sao để tôi hủy hoặc đổi gói cước?</h3>
            <p>Bạn có thể nâng cấp, hạ cấp hoặc hủy bất kỳ lúc nào ngay trong cài đặt cá nhân mà không phát sinh thêm bất kỳ phụ phí nào.</p>
          </div>
          <div className="faq-card">
            <h3>FinAI có bảo mật thông tin tài chính của tôi không?</h3>
            <p>Finora áp dụng mã hóa đầu cuối và tuân thủ các tiêu chuẩn bảo mật dữ liệu nghiêm ngặt nhất. Dữ liệu tài chính của bạn hoàn toàn bảo mật và không bao giờ được chia sẻ.</p>
          </div>
          <div className="faq-card">
            <h3>Phương thức thanh toán nào được hỗ trợ?</h3>
            <p>Hệ thống hỗ trợ chuyển khoản ngân hàng qua mã VietQR, thẻ ATM nội địa Napas, thẻ thanh toán quốc tế Visa/Mastercard và ví MoMo, ZaloPay.</p>
          </div>
          <div className="faq-card">
            <h3>Gói Gia đình & Nhóm hoạt động như thế nào?</h3>
            <p>Chỉ cần 1 tài khoản chủ gia đình đăng ký gói VIP, toàn bộ các thành viên và ví trẻ em trong nhóm đều được hưởng mọi đặc quyền cao cấp.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

