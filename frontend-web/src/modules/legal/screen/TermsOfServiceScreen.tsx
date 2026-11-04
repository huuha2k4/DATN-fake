import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import './PrivacyPolicyScreen.css'

export function TermsOfServiceScreen() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('acceptance')

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="privacy-page-container">
      {/* Nút quay lại trang chủ / bảng điều khiển */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s'
          }}
        >
          <span>← Quay lại</span>
        </button>
      </div>

      {/* Top Banner */}
      <section className="privacy-hero-banner">
        <div className="privacy-hero-badge">
          <FinanceIcon name="shield" size={16} />
          <span>ĐIỀU KHOẢN DỊCH VỤ & SỬ DỤNG HỆ THỐNG</span>
        </div>
        <h1 className="privacy-hero-title">Điều Khoản Dịch Vụ (Terms of Service)</h1>
        <p className="privacy-hero-desc">
          Quy định về quyền, nghĩa vụ và trách nhiệm pháp lý giữa người dùng và nền tảng quản lý tài chính thông minh Finora Intelligence.
        </p>
        <div className="privacy-hero-meta">
          <span>📅 Phiên bản hiệu lực: <strong>01/11/2026</strong></span>
          <span className="dot-divider">•</span>
          <span>⚖️ Áp dụng cho mọi tài khoản & dịch vụ Finora</span>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="privacy-layout-grid">
        {/* Sticky Table of Contents (Sidebar) */}
        <aside className="privacy-toc-sidebar">
          <div className="toc-card">
            <h3 className="toc-title">Mục lục điều khoản</h3>
            <nav className="toc-nav">
              <button
                type="button"
                className={`toc-link ${activeSection === 'acceptance' ? 'active' : ''}`}
                onClick={() => scrollToSection('acceptance')}
              >
                1. Chấp thuận điều khoản
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'account' ? 'active' : ''}`}
                onClick={() => scrollToSection('account')}
              >
                2. Đăng ký & Bảo mật tài khoản
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'services' ? 'active' : ''}`}
                onClick={() => scrollToSection('services')}
              >
                3. Phạm vi dịch vụ & AI
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'user-obligations' ? 'active' : ''}`}
                onClick={() => scrollToSection('user-obligations')}
              >
                4. Trách nhiệm người dùng
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'intellectual' ? 'active' : ''}`}
                onClick={() => scrollToSection('intellectual')}
              >
                5. Sở hữu trí tuệ
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'disclaimer' ? 'active' : ''}`}
                onClick={() => scrollToSection('disclaimer')}
              >
                6. Giới hạn trách nhiệm
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'termination' ? 'active' : ''}`}
                onClick={() => scrollToSection('termination')}
              >
                7. Chấm dứt dịch vụ & Liên hệ
              </button>
            </nav>
          </div>
        </aside>

        {/* Content Body */}
        <main className="privacy-content-body">
          {/* Section 1 */}
          <section id="acceptance" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">01</div>
              <h2>Chấp thuận điều khoản sử dụng</h2>
            </div>
            <p>
              Khi đăng ký tài khoản, đăng nhập hoặc sử dụng bất kỳ tính năng nào của hệ thống <strong>Finora Intelligence</strong>, bạn xác nhận rằng bạn đã đọc, hiểu rõ và đồng ý bị ràng buộc bởi toàn bộ các điều khoản được quy định tại văn bản này cùng với <strong>Chính sách bảo mật</strong> của chúng tôi.
            </p>
            <p>
              Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng dịch vụ và hủy bỏ tài khoản của bạn.
            </p>
          </section>

          {/* Section 2 */}
          <section id="account" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">02</div>
              <h2>Đăng ký & Trách nhiệm bảo mật tài khoản</h2>
            </div>
            <ul>
              <li><strong>Tính chính xác:</strong> Bạn cam kết cung cấp thông tin email và thông tin cá nhân chính xác, đầy đủ và duy trì cập nhật thông tin này trong suốt quá trình sử dụng.</li>
              <li><strong>Bảo mật mật khẩu:</strong> Bạn có trách nhiệm tự bảo mật mật khẩu tài khoản và mã xác thực OTP của mình. Mọi thao tác thực hiện từ tài khoản của bạn được mặc định xem là do chính bạn thực hiện.</li>
              <li><strong>Thông báo vi phạm:</strong> Nếu phát hiện bất kỳ dấu hiệu truy cập trái phép hoặc mất an toàn thông tin nào, bạn cần lập tức đổi mật khẩu và thông báo ngay cho đội ngũ hỗ trợ qua email <strong>finora.3congian@gmail.com</strong>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="services" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">03</div>
              <h2>Phạm vi dịch vụ & Trợ lý tài chính AI (FinAI)</h2>
            </div>
            <p>
              Finora cung cấp các công cụ ghi chép chi tiêu, thiết lập ngân sách, nhận diện hóa đơn OCR, dự báo dòng tiền và phân tích thông minh qua trí tuệ nhân tạo (FinAI).
            </p>
            <div className="rule-alert-box" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#92400e', padding: '14px 18px', borderRadius: '12px', marginTop: '12px' }}>
              <strong>⚠️ Tuyên bố miễn trừ về tư vấn đầu tư:</strong> Các phân tích, dự báo và gợi ý từ trợ lý ảo FinAI mang tính chất tham khảo dựa trên thuật toán thống kê dữ liệu quá khứ. FinAI <strong>không phải là một đơn vị tư vấn tài chính, chứng khoán hoặc pháp lý được cấp phép</strong>. Bạn hoàn toàn tự chịu trách nhiệm đối với các quyết định chi tiêu và đầu tư thực tế của mình.
            </div>
          </section>

          {/* Section 4 */}
          <section id="user-obligations" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">04</div>
              <h2>Trách nhiệm và hành vi bị cấm</h2>
            </div>
            <p>Khi sử dụng nền tảng Finora, bạn cam kết <strong>KHÔNG</strong> thực hiện các hành vi sau:</p>
            <ul>
              <li>Sử dụng dịch vụ vào các mục đích rửa tiền, gian lận tài chính, giao dịch phi pháp hoặc vi phạm pháp luật hiện hành của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</li>
              <li>Thực hiện các hành vi tấn công mạng, quét lỗ hổng, phát tán mã độc (virus, malware), làm quá tải hạ tầng máy chủ của hệ thống.</li>
              <li>Cố tình can thiệp ngược (reverse engineer), sao chép mã nguồn, thuật toán hoặc bẻ khóa các tính năng trả phí của Finora.</li>
              <li>Tải lên hóa đơn giả mạo, nội dung đồi trụy, thù địch hoặc thông tin vi phạm bản quyền.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="intellectual" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">05</div>
              <h2>Quyền sở hữu trí tuệ</h2>
            </div>
            <p>
              Toàn bộ logo thương hiệu <strong>Finora</strong>, giao diện người dùng, mã nguồn, thuật toán AI, tài liệu hướng dẫn và nội dung hiển thị thuộc quyền sở hữu trí tuệ của <strong>Đội ngũ Finora Intelligence (Nhóm 3 con gián)</strong>.
            </p>
            <p>
              Dữ liệu thu chi, giao dịch và chứng từ do bạn nhập vào hoặc tải lên thuộc quyền sở hữu riêng của bạn. Bạn cấp quyền cho Finora xử lý và lưu trữ dữ liệu này chỉ nhằm mục đích cung cấp và tối ưu dịch vụ cho chính bạn.
            </p>
          </section>

          {/* Section 6 */}
          <section id="disclaimer" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">06</div>
              <h2>Giới hạn trách nhiệm pháp lý</h2>
            </div>
            <p>
              Dịch vụ được cung cấp theo nguyên tắc "nguyên trạng" (as-is). Chúng tôi không chịu trách nhiệm đối với:
            </p>
            <ul>
              <li>Sự gián đoạn kết nối do sự cố mạng viễn thông, đứt cáp quang biển hoặc trường hợp bất khả kháng (thiên tai, dịch bệnh).</li>
              <li>Tổn thất tài chính phát sinh do người dùng làm lộ mật khẩu, mất thiết bị hoặc do thiết bị của người dùng nhiễm mã độc gián điệp.</li>
              <li>Tính chính xác tuyệt đối của mô hình OCR khi chất lượng ảnh chụp hóa đơn bị mờ, rách hoặc nhàu nát (người dùng luôn có quyền chỉnh sửa lại số liệu trước khi lưu).</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="termination" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">07</div>
              <h2>Chấm dứt dịch vụ & Thông tin liên hệ</h2>
            </div>
            <p>
              Bạn có quyền chấm dứt sử dụng dịch vụ và yêu cầu xóa vĩnh viễn tài khoản bất kỳ lúc nào. Chúng tôi cũng có quyền tạm khóa hoặc chấm dứt vĩnh viễn tài khoản của người dùng nếu vi phạm nghiêm trọng các điều khoản sử dụng nêu trên.
            </p>
            <div className="contact-info-panel" style={{ marginTop: '16px' }}>
              <div className="contact-row">
                <span className="contact-label">Đơn vị chủ quản:</span>
                <span className="contact-val">Đội ngũ Finora Intelligence Platform (Nhóm 3 con gián)</span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Email hỗ trợ & xử lý điều khoản:</span>
                <span className="contact-val highlight">finora.3congian@gmail.com</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

