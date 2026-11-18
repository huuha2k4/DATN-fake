import React from 'react'
import './PrivacyPolicyModal.css'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="privacy-modal-title-wrap">
            <span className="privacy-modal-icon">🛡️</span>
            <div>
              <h2 className="privacy-modal-title">Chính sách bảo mật & Quyền riêng tư</h2>
              <p className="privacy-modal-subtitle">Finora Intelligence • Tiêu chuẩn an ninh ngân hàng</p>
            </div>
          </div>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="privacy-modal-body">
          <div className="privacy-modal-intro">
            <p>
              Chào mừng bạn đến với <strong>Finora Intelligence</strong>. Chúng tôi cam kết bảo vệ dữ liệu tài chính
              và quyền riêng tư cá nhân của bạn theo Luật An toàn thông tin mạng và quy chuẩn quốc tế (GDPR).
            </p>
          </div>

          <div className="privacy-sec-card">
            <h4>1. Dữ liệu chúng tôi thu thập</h4>
            <ul>
              <li><strong>Thông tin tài khoản:</strong> Họ tên, email, ảnh đại diện, múi giờ.</li>
              <li><strong>Dữ liệu tài chính:</strong> Giao dịch thu/chi, ví tiền, hạn mức ngân sách, mục tiêu tích lũy.</li>
              <li><strong>Hình ảnh chứng từ:</strong> Ảnh hóa đơn tải lên phục vụ bóc tách OCR thông minh.</li>
            </ul>
          </div>

          <div className="privacy-sec-card">
            <h4>2. Mục đích sử dụng dữ liệu</h4>
            <ul>
              <li>Tổng hợp số liệu báo cáo, dòng tiền thu chi trực quan.</li>
              <li>Trợ lý trí tuệ nhân tạo (FinAI) phân tích và đưa ra cảnh báo thâm hụt, gợi ý tiết kiệm.</li>
              <li>Nhận diện số tiền và danh mục chi tiêu tự động qua hóa đơn (OCR).</li>
              <li><strong>Tuyệt đối không:</strong> Bán, trao đổi hoặc thương mại hóa thông tin tài chính cá nhân cho bên thứ ba.</li>
            </ul>
          </div>

          <div className="privacy-sec-card">
            <h4>3. An ninh & Mã hóa dữ liệu</h4>
            <ul>
              <li><strong>Mã hóa đầu cuối:</strong> Dữ liệu truyền tải qua mạng mã hóa giao thức TLS 1.3 / SSL 256-bit.</li>
              <li><strong>Bảo mật mật khẩu:</strong> Mật khẩu người dùng được băm chuẩn bcrypt kèm Salt ngẫu nhiên.</li>
              <li><strong>Bảo vệ cơ sở dữ liệu:</strong> Tường lửa nhiều lớp, sao lưu tự động định kỳ, phân quyền chặt chẽ.</li>
            </ul>
          </div>

          <div className="privacy-sec-card">
            <h4>4. Quyền của người dùng với dữ liệu</h4>
            <ul>
              <li>Quyền xem, trích xuất và chỉnh sửa toàn bộ dữ liệu tài chính của mình bất kỳ lúc nào.</li>
              <li>Quyền xóa toàn bộ tài khoản và vĩnh viễn xóa sạch dữ liệu liên quan khỏi hệ thống khi không còn nhu cầu.</li>
            </ul>
          </div>

          <div className="privacy-sec-card">
            <h4>5. Liên hệ & Giải quyết vấn đề</h4>
            <p>
              Nếu có bất kỳ thắc mắc hoặc yêu cầu hỗ trợ, bảo mật dữ liệu, bạn có thể liên hệ trực tiếp với chúng tôi qua email: <strong>finora.3congian@gmail.com</strong>.
            </p>
          </div>
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

