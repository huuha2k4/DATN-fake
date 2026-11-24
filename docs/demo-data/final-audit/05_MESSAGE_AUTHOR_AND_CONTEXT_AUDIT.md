# BÁO CÁO 05 — KIỂM TRA TÁC GIẢ & NGỮ CẢNH HỘI THOẠI NHÓM

Toàn bộ 320 tin nhắn nhóm được xây dựng thành các chuỗi hội thoại (threaded context) tự nhiên, gắn liền với các mốc thời gian chi tiêu:

## 1. Mẫu hội thoại Nhóm Phòng Trọ (Hóa đơn điện nước)
- **Bảo**: *"Đến hạn đóng tiền phòng tháng này rồi anh em ơi, tiền nhà 4.5M cộng điện nước 850k nhé."*
- **Huy**: *"Em vừa nhận nhuận bút đồ án, em gửi luôn phần em vào quỹ phòng nha anh Bảo."*
- **Tuấn**: *"Okie Bảo ơi, chiều nay lương về anh chuyển khoản nốt phần anh nhé."*
- **Bảo**: *"Đã nhận đủ của 2 ông, để tôi thanh toán tiền nhà cho chủ trọ luôn."*

## 2. Mẫu hội thoại Nhóm Du Lịch Đà Lạt
- **Trang**: *"Lịch trình đi Đà Lạt tuần tới chốt nhé, mình đã cọc homestay 2 triệu rồi cả nhà ơi."*
- **Bảo**: *"Bảo và Linh đã book xong vé xe limousine khứ hồi cho cả nhóm rồi nha."*
- **Linh**: *"Tuyệt vời quá, lên đó nhất định phải ghé quán lẩu bò Ba Toa ăn bữa tối đầu tiên nhé!"*
- **Khang**: *"Nhất trí luôn, để Khang lo phần thuê 2 chiếc xe máy lượn lờ đồi chè."*

## 3. Kiểm định Kỹ thuật
- **Kiểm tra tác giả**: 100% người gửi tin nhắn là thành viên hợp lệ của nhóm đó tại thời điểm gửi.
- **Trạng thái đọc**: Người gửi mặc định `is_read = true`, các thành viên còn lại có cờ `read_at` phân bổ tự nhiên trong vòng vài phút đến vài giờ.
- **Mã kỹ thuật**: Tìm kiếm Regex `#\d+` hoặc `\(.*?\)` trả về đúng **0** kết quả.
