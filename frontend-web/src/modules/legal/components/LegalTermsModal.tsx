import { useState, useEffect } from 'react';
import './PrivacyPolicyModal.css';

export type LegalModalTab = 'terms' | 'privacy' | 'cookies' | 'guide';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalModalTab;
}

export function LegalTermsModal({ isOpen, onClose, initialTab = 'terms' }: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="privacy-modal-title-wrap">
            <span className="privacy-modal-icon">
              {activeTab === 'terms' && '📜'}
              {activeTab === 'privacy' && '🛡️'}
              {activeTab === 'cookies' && '🍪'}
              {activeTab === 'guide' && '📖'}
            </span>
            <div>
              <h2 className="privacy-modal-title">
                {activeTab === 'terms' && 'Điều khoản sử dụng'}
                {activeTab === 'privacy' && 'Chính sách bảo mật'}
                {activeTab === 'cookies' && 'Chính sách Cookie'}
                {activeTab === 'guide' && 'Hướng dẫn sử dụng Finora'}
              </h2>
              <p className="privacy-modal-subtitle">Finora Intelligence • Nhóm 3 con gián</p>
            </div>
          </div>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '4px 16px 0', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'guide' ? '2.5px solid #008F63' : '2.5px solid transparent',
              color: activeTab === 'guide' ? '#008F63' : '#64748b',
              fontWeight: activeTab === 'guide' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            📖 Hướng dẫn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'terms' ? '2.5px solid #008F63' : '2.5px solid transparent',
              color: activeTab === 'terms' ? '#008F63' : '#64748b',
              fontWeight: activeTab === 'terms' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ⚖️ Điều khoản
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'privacy' ? '2.5px solid #008F63' : '2.5px solid transparent',
              color: activeTab === 'privacy' ? '#008F63' : '#64748b',
              fontWeight: activeTab === 'privacy' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🛡️ Bảo mật
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'cookies' ? '2.5px solid #008F63' : '2.5px solid transparent',
              color: activeTab === 'cookies' ? '#008F63' : '#64748b',
              fontWeight: activeTab === 'cookies' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🍪 Cookie
          </button>
        </div>

        <div className="privacy-modal-body">
          {/* TAB: HƯỚNG DẪN SỬ DỤNG */}
          {activeTab === 'guide' && (
            <>
              <div className="privacy-modal-intro">
                <p>
                  Khám phá các bước cơ bản để làm chủ tài chính thông minh cùng hệ sinh thái Finora:
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>Bước 1: Tạo tài khoản & Thiết lập ví đầu tiên</h4>
                <p>
                  Đăng ký tài khoản nhanh bằng Email hoặc Google. Sau đó vào mục <strong>Tài khoản &amp; Ví</strong> để thêm ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>Bước 2: Ghi chép & Bóc tách hóa đơn tự động</h4>
                <p>
                  Ghi chép giao dịch nhanh qua nút <strong>Thêm giao dịch</strong> hoặc sử dụng chức năng <strong>Quét hóa đơn (OCR)</strong> để hệ thống tự động nhận diện số tiền, ngày tháng và phân loại danh mục.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>Bước 3: Tương tác với Trợ lý FinAI</h4>
                <p>
                  Bạn chỉ cần nhắn tin tự nhiên như: <em>"Hãy tạo giao dịch ăn uống 250.000đ hôm nay"</em> hoặc <em>"Phân tích chi tiêu tháng này cho tôi"</em>, FinAI sẽ tự động xử lý và đề xuất tối ưu.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>Bước 4: Quản lý nhóm &amp; Ví trẻ em</h4>
                <p>
                  Tạo nhóm chia tiền phòng trọ, gia đình, du lịch với tính năng tự động cấn đối nợ. Mở ví trẻ em để giao nhiệm vụ làm việc nhà nhận thưởng và giáo dục tài chính sớm cho con.
                </p>
              </div>
            </>
          )}

          {/* TAB 3: CHÍNH SÁCH COOKIE */}
          {activeTab === 'cookies' && (
            <>
              <div className="privacy-modal-intro">
                <p>
                  Chính sách Cookie này giải thích cách Finora sử dụng cookie và các công nghệ lưu trữ cục bộ tương đương trên trình duyệt web của bạn.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>1. Cookie là gì?</h4>
                <p>
                  Cookie là các tệp văn bản nhỏ được lưu trữ trên trình duyệt của bạn khi truy cập trang web, giúp nhận diện phiên đăng nhập và ghi nhớ tùy chọn giao diện.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>2. Các loại cookie Finora sử dụng</h4>
                <ul>
                  <li><strong>Cookie xác thực bắt buộc (Authentication):</strong> Lưu trữ JWT token an toàn để duy trì trạng thái đăng nhập của bạn.</li>
                  <li><strong>Cookie tùy chọn người dùng:</strong> Ghi nhớ giao diện Sáng / Tối (Light/Dark Mode) và ngôn ngữ hiển thị.</li>
                  <li><strong>Bảo mật &amp; Chống tấn công (CSRF):</strong> Đảm bảo các yêu cầu gửi đến máy chủ là hợp lệ từ người dùng đã xác minh.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>3. Cam kết không theo dõi quảng cáo</h4>
                <p>
                  Finora <strong>tuyệt đối không sử dụng cookie của bên thứ ba để theo dõi hành vi, thu thập dữ liệu cá nhân hoặc hiển thị quảng cáo thương mại</strong>.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>4. Quản lý cookie</h4>
                <p>
                  Bạn có thể tùy ý xóa hoặc tắt cookie trong cài đặt của trình duyệt bất kỳ lúc nào. Lưu ý rằng việc tắt cookie bắt buộc có thể khiến bạn cần đăng nhập lại mỗi khi truy cập.
                </p>
              </div>
            </>
          )}

          {/* TAB 4: ĐIỀU KHOẢN DỊCH VỤ */}
          {activeTab === 'terms' && (
            <>
              <div className="privacy-modal-intro">
                <p>
                  Bằng việc đăng ký tài khoản Finora, bạn cam kết tuân thủ các quy định sử dụng dịch vụ nhằm đảm bảo an toàn cho chính bạn và cộng đồng.
                </p>
              </div>

              <div className="privacy-sec-card">
                <h4>1. Đăng ký &amp; Bảo mật tài khoản</h4>
                <ul>
                  <li>Cung cấp email hợp lệ và tự chịu trách nhiệm bảo quản mật khẩu, mã xác thực OTP.</li>
                  <li>Không chia sẻ hoặc sử dụng chung tài khoản với người khác để đảm bảo tính riêng tư của dữ liệu tài chính.</li>
                </ul>
              </div>

              <div className="privacy-sec-card">
                <h4>2. Trợ lý thông minh FinAI &amp; Giới hạn trách nhiệm</h4>
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
                <h4>4. Liên hệ &amp; Giải quyết tranh chấp</h4>
                <p>
                  Mọi thắc mắc về điều khoản dịch vụ xin vui lòng gửi email về: <strong>finora.3congian@gmail.com</strong>.
                </p>
              </div>
            </>
          )}

          {/* TAB 5: BẢO MẬT */}
          {activeTab === 'privacy' && (
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
                <h4>2. Cam kết bảo mật &amp; Quyền riêng tư</h4>
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
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
