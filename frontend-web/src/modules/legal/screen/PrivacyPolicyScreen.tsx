import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import './PrivacyPolicyScreen.css'

export function PrivacyPolicyScreen() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

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
          <span>CHÍNH SÁCH BẢO MẬT & QUYỀN RIÊNG TƯ</span>
        </div>
        <h1 className="privacy-hero-title">Bảo Vệ Dữ Liệu & Quyền Riêng Tư Của Bạn</h1>
        <p className="privacy-hero-desc">
          Finora Intelligence cam kết bảo vệ tuyệt đối thông tin tài chính và dữ liệu cá nhân của người dùng 
          theo các tiêu chuẩn an ninh thông tin quốc tế khắt khe nhất.
        </p>
        <div className="privacy-hero-meta">
          <span>📅 Phiên bản hiệu lực: <strong>01/11/2026</strong></span>
          <span className="dot-divider">•</span>
          <span>🛡️ Tuân thủ Luật An toàn thông tin mạng & GDPR</span>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="privacy-layout-grid">
        {/* Sticky Table of Contents (Sidebar) */}
        <aside className="privacy-toc-sidebar">
          <div className="toc-card">
            <h3 className="toc-title">Mục lục chính sách</h3>
            <nav className="toc-nav">
              <button
                type="button"
                className={`toc-link ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => scrollToSection('overview')}
              >
                1. Tổng quan cam kết
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'collection' ? 'active' : ''}`}
                onClick={() => scrollToSection('collection')}
              >
                2. Dữ liệu chúng tôi thu thập
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'purpose' ? 'active' : ''}`}
                onClick={() => scrollToSection('purpose')}
              >
                3. Mục đích sử dụng dữ liệu
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'security' ? 'active' : ''}`}
                onClick={() => scrollToSection('security')}
              >
                4. Cơ chế bảo mật & Mã hóa
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'sharing' ? 'active' : ''}`}
                onClick={() => scrollToSection('sharing')}
              >
                5. Cam kết không chia sẻ dữ liệu
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'rights' ? 'active' : ''}`}
                onClick={() => scrollToSection('rights')}
              >
                6. Quyền của người dùng
              </button>
              <button
                type="button"
                className={`toc-link ${activeSection === 'contact' ? 'active' : ''}`}
                onClick={() => scrollToSection('contact')}
              >
                7. Thông tin liên hệ hỗ trợ
              </button>
            </nav>

            <div className="toc-footer-action">
              <button
                type="button"
                className="btn-toc-feedback"
                onClick={() => navigate('/feedback')}
              >
                <FinanceIcon name="message-square" size={16} />
                <span>Gửi góp ý về bảo mật</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Detailed Sections */}
        <main className="privacy-content-article">
          {/* Section 1 */}
          <section id="overview" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">01</div>
              <h2>Tổng quan cam kết</h2>
            </div>
            <p>
              Chào mừng bạn đến với <strong>Finora Intelligence</strong> (“Finora”, “chúng tôi”). Chúng tôi hiểu rằng thông tin tài chính 
              cá nhân và gia đình là dữ liệu vô cùng nhạy cảm. Chính sách Bảo mật này mô tả cách thức chúng tôi thu thập, lưu trữ, xử lý 
              và bảo vệ thông tin khi bạn sử dụng nền tảng web và ứng dụng của Finora.
            </p>
            <div className="callout-box info">
              <FinanceIcon name="shield" size={18} />
              <div>
                <strong>Nguyên tắc cốt lõi:</strong> Bạn sở hữu toàn bộ dữ liệu tài chính của mình. Finora không bao giờ bán, 
                cho thuê hay thương mại hóa dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào nhằm mục đích quảng cáo.
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="collection" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">02</div>
              <h2>Dữ liệu chúng tôi thu thập</h2>
            </div>
            <p>Để cung cấp dịch vụ quản lý tài chính thông minh, Finora chỉ thu thập các thông tin thực sự cần thiết bao gồm:</p>
            <ul className="styled-list">
              <li>
                <strong>Thông tin định danh tài khoản:</strong> Họ và tên, địa chỉ email, tên đăng nhập (username), số điện thoại và ảnh đại diện (nếu bạn cung cấp).
              </li>
              <li>
                <strong>Dữ liệu giao dịch tài chính:</strong> Số tiền, ngày thực hiện, hạng mục thu/chi (ăn uống, mua sắm...), ghi chú giao dịch và ví tài khoản nguồn liên kết.
              </li>
              <li>
                <strong>Dữ liệu hóa đơn quét thông minh (OCR):</strong> Hình ảnh hóa đơn chứng từ bạn tải lên để bóc tách thông tin tự động. <em>Lưu ý: Finora tuyệt đối không lưu trữ số thẻ ngân hàng đầy đủ hay mã bảo mật CVV/CVC.</em>
              </li>
              <li>
                <strong>Dữ liệu nhóm & ví trẻ em:</strong> Danh sách thành viên trong nhóm chi tiêu, quỹ chung và các nhiệm vụ tích điểm thưởng của ví trẻ em được phụ huynh phê duyệt.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="purpose" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">03</div>
              <h2>Mục đích sử dụng dữ liệu</h2>
            </div>
            <p>Dữ liệu của bạn được sử dụng độc quyền cho các mục đích vận hành và mang lại trải nghiệm tối ưu:</p>
            <div className="purpose-grid">
              <div className="purpose-item">
                <div className="purpose-icon"><FinanceIcon name="chart" size={20} /></div>
                <h4>Thống kê & Báo cáo</h4>
                <p>Tự động tổng hợp báo cáo thu chi, dòng tiền, hạn mức ngân sách và tiến độ tiết kiệm theo tuần/tháng/năm.</p>
              </div>
              <div className="purpose-item">
                <div className="purpose-icon"><FinanceIcon name="spark" size={20} /></div>
                <h4>FinAI Phân tích thông minh</h4>
                <p>Trợ lý AI đưa ra lời khuyên tối ưu chi tiêu và cảnh báo vượt ngân sách dựa trên chính thói quen tài chính của bạn.</p>
              </div>
              <div className="purpose-item">
                <div className="purpose-icon"><FinanceIcon name="bell" size={20} /></div>
                <h4>Nhắc nhở & Thông báo</h4>
                <p>Gửi thông báo nhắc ghi chép giao dịch hàng ngày (20:00), hóa đơn định kỳ sắp đến hạn hoặc cảnh báo bảo mật.</p>
              </div>
              <div className="purpose-item">
                <div className="purpose-icon"><FinanceIcon name="shield" size={20} /></div>
                <h4>An toàn & Phòng chống gian lận</h4>
                <p>Xác thực đăng nhập, phát hiện phiên truy cập bất thường và bảo vệ tài khoản khỏi các hành vi xâm phạm trái phép.</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="security" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">04</div>
              <h2>Cơ chế bảo mật & Mã hóa</h2>
            </div>
            <p>Finora xây dựng hệ thống phòng thủ đa tầng áp dụng các tiêu chuẩn an ninh thông tin hiện đại nhất:</p>
            <div className="security-badges-row">
              <div className="sec-badge-card">
                <strong>AES-256 & TLS 1.3</strong>
                <span>Toàn bộ dữ liệu được mã hóa khi lưu trữ trong cơ sở dữ liệu và khi truyền tải qua đường truyền Internet.</span>
              </div>
              <div className="sec-badge-card">
                <strong>Bảo mật Mật khẩu BCrypt</strong>
                <span>Mật khẩu của bạn được băm (hash) 1 chiều với muối (salt). Ngay cả Quản trị viên hệ thống cũng không thể đọc được mật khẩu gốc.</span>
              </div>
              <div className="sec-badge-card">
                <strong>Phiên đăng nhập JWT & Audit Logs</strong>
                <span>Phiên đăng nhập kiểm soát an toàn có hạn mức thời gian và nhật ký hành động (Audit Logs) để truy vết mọi thay đổi nhạy cảm.</span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sharing" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">05</div>
              <h2>Cam kết không chia sẻ dữ liệu</h2>
            </div>
            <p>
              Chúng tôi <strong>KHÔNG</strong> bán, chia sẻ hoặc tiết lộ thông tin tài chính của bạn cho bất kỳ đối tác thương mại, 
              mạng quảng cáo hay tổ chức tiếp thị nào.
            </p>
            <p>
              Dữ liệu của bạn chỉ được chia sẻ trong các trường hợp ngoại lệ duy nhất sau:
            </p>
            <ul className="styled-list">
              <li><strong>Do bạn chủ động yêu cầu:</strong> Khi bạn mời thành viên vào nhóm chi tiêu gia đình hoặc chia sẻ hóa đơn chung.</li>
              <li><strong>Đối tác hạ tầng kỹ thuật:</strong> Các dịch vụ đám mây và cơ sở dữ liệu đạt chứng chỉ ISO/IEC 27001 phục vụ lưu trữ hệ thống.</li>
              <li><strong>Yêu cầu pháp lý:</strong> Khi có văn bản yêu cầu chính thức từ cơ quan nhà nước có thẩm quyền theo quy định của pháp luật Việt Nam.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="rights" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">06</div>
              <h2>Quyền của người dùng đối với dữ liệu</h2>
            </div>
            <p>Bạn luôn nắm toàn quyền kiểm soát dữ liệu tài chính của mình tại Finora:</p>
            <div className="rights-cards-grid">
              <div className="right-box">
                <h4>Quyền Truy cập & Chỉnh sửa</h4>
                <p>Xem, cập nhật thông tin cá nhân, sửa đổi giao dịch hoặc đổi mật khẩu bất kỳ lúc nào tại mục Cài đặt.</p>
              </div>
              <div className="right-box">
                <h4>Quyền Xuất dữ liệu (Export)</h4>
                <p>Xuất toàn bộ báo cáo thu chi ra định dạng Excel hoặc PDF để lưu trữ ngoại tuyến độc lập.</p>
              </div>
              <div className="right-box">
                <h4>Quyền Được lãng quên (Xóa tài khoản)</h4>
                <p>Yêu cầu xóa toàn bộ lịch sử chi tiêu và dữ liệu cá nhân vĩnh viễn khỏi máy chủ Finora.</p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="contact" className="privacy-section-card">
            <div className="section-header-row">
              <div className="section-num-bubble">07</div>
              <h2>Thông tin liên hệ & Giải quyết khiếu nại</h2>
            </div>
            <p>Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu nào liên quan đến Chính sách Bảo mật này, xin vui lòng liên hệ:</p>
            <div className="contact-info-panel">
              <div className="contact-row">
                <span className="contact-label">Đơn vị phát triển:</span>
                <span className="contact-val">Đội ngũ Finora Intelligence Platform (Nhóm 3 con gián)</span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Email hỗ trợ & giải quyết vấn đề:</span>
                <span className="contact-val highlight">finora.3congian@gmail.com</span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Kênh phản hồi trực tuyến:</span>
                <span className="contact-val">
                  <button type="button" className="link-button" onClick={() => navigate('/feedback')}>
                    Trang Hỗ trợ & Góp ý người dùng
                  </button>
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

