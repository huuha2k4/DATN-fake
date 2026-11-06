import React, { useState } from 'react'
import './PrivacyPolicyModal.css'

interface LegalTermsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'privacy' | 'terms'
}

export function LegalTermsModal({ isOpen, onClose, initialTab = 'terms' }: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab)

  if (!isOpen) return null

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="privacy-modal-title-wrap">
            <span className="privacy-modal-icon">📜</span>
            <div>
              <h2 className="privacy-modal-title">
                {activeTab === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật'}
              </h2>
              <p className="privacy-modal-subtitle">Finora Intelligence • Nhóm 3 con gián</p>
            </div>
          </div>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '4px 16px 0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'terms' ? '2.5px solid #10b981' : '2.5px solid transparent',
              color: activeTab === 'terms' ? '#047857' : '#64748b',
              fontWeight: activeTab === 'terms' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            ⚖️ Điều khoản dịch vụ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'privacy' ? '2.5px solid #10b981' : '2.5px solid transparent',
              color: activeTab === 'privacy' ? '#047857' : '#64748b',
              fontWeight: activeTab === 'privacy' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            🛡️ Chính sách bảo mật
          </button>
        </div>

        <div className="privacy-modal-body">
          {activeTab === 'terms' ? (
            <>
              <div className="privacy-modal-intro">
                <p>
                  Bằng việc đăng ký tài khoản Finora, bạn cam kết tuân thủ các quy định sử dụng dịch vụ nhằm đảm bảo an toàn cho chính bạn và cộng đồng.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>1. Đăng ký & Bảo mật tài khoản</h4>
                <ul>
                  <li>Cung cấp email hợp lệ và tự chịu trách nhiệm bảo quản mật khẩu, mã xác thực OTP.</li>
                  <li>Không chia sẻ hoặc sử dụng chung tài khoản với người khác để đảm bảo tính riêng tư của dữ liệu tài chính.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>2. Trợ lý thông minh FinAI & Giới hạn trách nhiệm</h4>
                <ul>
                  <li>Các phân tích dòng tiền và gợi ý từ trợ lý ảo FinAI mang tính chất tham khảo dựa trên thống kê số liệu.</li>
                  <li>FinAI <strong>không phải là tư vấn viên chứng khoán hay đầu tư tài chính được cấp phép</strong>. Quyết định chi tiêu thực tế thuộc trách nhiệm của bạn.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>3. Các hành vi nghiêm cấm</h4>
                <ul>
                  <li>Nghiêm cấm dùng Finora cho các hành vi gian lận tài chính, rửa tiền, giao dịch phi pháp.</li>
                  <li>Nghiêm cấm cố ý tấn công hệ thống, khai thác lỗ hổng hoặc sao chép mã nguồn, thuật toán của nền tảng.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>4. Liên hệ & Giải quyết tranh chấp</h4>
                <p>
                  Mọi thắc mắc về điều khoản dịch vụ xin vui lòng gửi email về: <strong>finora.3congian@gmail.com</strong>.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="privacy-modal-intro">
                <p>
                  Finora Intelligence cam kết bảo vệ dữ liệu tài chính của bạn theo quy chuẩn an ninh thông tin quốc tế.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>1. Dữ liệu thu thập</h4>
                <ul>
                  <li>Thông tin cơ bản: Email, họ tên, ảnh đại diện.</li>
                  <li>Dữ liệu tài chính: Giao dịch thu/chi, ví tiền, hạn mức ngân sách, hình ảnh hóa đơn OCR.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>2. Cam kết bảo mật & Quyền riêng tư</h4>
                <ul>
                  <li><strong>Tuyệt đối không:</strong> Bán hoặc chia sẻ dữ liệu tài chính cá nhân cho bất kỳ bên thứ ba nào.</li>
                  <li>Mã hóa đầu cuối TLS 1.3 / SSL 256-bit và mật khẩu băm chuẩn bcrypt có Salt.</li>
                  <li>Bạn có toàn quyền trích xuất hoặc xóa sạch tài khoản và dữ liệu vĩnh viễn khỏi hệ thống bất kỳ lúc nào.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>3. Email liên hệ hỗ trợ</h4>
                <p>
                  Email chính thức: <strong>finora.3congian@gmail.com</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="privacy-modal-footer">
          <button type="button" className="privacy-modal-btn-confirm" onClick={onClose}>
            Tôi đã hiểu & đồng ý
          </button>
        </div>
      </div>
    </div>
  )
}

