# BÁO CÁO 14 — MỨC ĐỘ SẴN SÀNG CHO CÁC TÍNH NĂNG AI (AI READINESS)

Dữ liệu nạp vào cung cấp nguồn tri thức đầu vào phong phú và hoàn hảo cho dịch vụ AI (`pfm-ai-service`):

## 1. Trợ Lý Tư Vấn Tài Chính (Financial Advisor Agent)
- Dữ liệu lịch sử xuyên suốt 84 ngày (gần 3 tháng) với 1.923 giao dịch giúp mô hình LLM:
  - Phân tích chính xác thói quen chi tiêu của từng người dùng.
  - Phát hiện các khoản chi vượt ngân sách (ví dụ: Bảo chi tiêu nhiều cho đồ công nghệ và hẹn hò).
  - Đưa ra lời khuyên cắt giảm chi phí và nâng tỷ lệ tiết kiệm lên 25%.

## 2. Tự Động Phân Loại Giao Dịch (Auto-Categorization)
- Mỗi giao dịch đều có `note`, `description_raw` mang tính ngữ cảnh cao cùng `category_id` chuẩn mực, tạo điều kiện thuận lợi cho việc fine-tuning hoặc prompt testing đối với các model phân loại văn bản.

## 3. Dự Báo Dòng Tiền & Cảnh Báo Sớm
- Các lịch tài chính định kỳ (`schedules`) như ngày nhận lương (mùng 5 hàng tháng), ngày đóng tiền nhà (mùng 1), hóa đơn internet (ngày 15) giúp AI dự báo dòng tiền chính xác cho các tuần tiếp theo.
