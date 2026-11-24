# FINORA DEMO DATA SEEDER — BUSINESS REALISM & CROSS-MODULE REPORT (PHASE 3)

## 1. MỐI QUAN HỆ VÀ LIÊN KẾT NGHIỆP VỤ XUYÊN SUỐT

### 1.1. Luồng Lương → Phân bổ Ngân sách → Chi tiêu → Cảnh báo
- Người dùng nhận lương vào ngày 5 hàng tháng qua tài khoản ngân hàng.
- Ngân sách tháng 09, 10, 11/2026 được thiết lập ở mức 70% lương.
- Trong tháng 10/2026:
  - `bao_dev` phát sinh khoản chi tiêu đột biến **7.500.000 đ** ngày 18/10 để mua màn hình đồ họa Dell UltraSharp.
  - Ngân sách tháng 10 của Bảo nhảy sang trạng thái `EXCEEDED` (118%).
  - Hệ thống tự động sinh thông báo cảnh báo `BUDGET_EXCEEDED` và `ANOMALY_DETECTED` cho Bảo.
  - `huy_student` do phát sinh chi phí giáo trình và học tập nên ngân sách chạm 92%, hiển thị trạng thái `WARNING`.

### 1.2. Luồng Chi tiêu nhóm → Chia tiền → Quyết toán nợ nhóm
- 5 nhóm hoạt động năng động với 150 giao dịch chi tiêu:
  - **Gia đình:** Nộp quỹ 5 triệu/tháng, chi trả học phí, khám răng, điện nước từ quỹ nhóm.
  - **Cặp đôi Bảo - Linh:** Nộp quỹ 2 triệu/tháng, chi trả ăn uống Haidilao, xem phim CGV, dã ngoại.
  - **Phòng trọ 302:** Tiền phòng 6 triệu, điện nước 1.480.000 đ chia đều 3 người.
  - **Hội bạn thân & Du lịch Đà Lạt:** Đặt homestay, thuê xe máy, ăn uống lẩu gà lá é.
- Phát sinh 440 bản ghi chia tiền (`group_expense_splits`) và 36 đợt quyết toán nợ nhóm (`group_settlements`). Các khoản nợ phòng trọ được chuyển khoản và xác nhận `CONFIRMED`.

### 1.3. Luồng Ví trẻ em → Việc nhà → Duyệt thưởng → Xin tiền
- Hai bé Bin & Bông có 44 nhiệm vụ việc nhà (`child_chores`) phân bổ đều đặn.
- 36 nhiệm vụ đã được bố Minh hoặc mẹ Mai duyệt (`APPROVED`), có lời khen động viên cụ thể ("Con làm rất sạch sẽ!", "Bé gấp đồ rất khéo léo!").
- 18 yêu cầu xin tiền (`child_spend_requests`) phản ánh đúng tâm lý trẻ nhỏ: xin mua sách khoa học, vở vẽ, màu vẽ, hoa tươi tặng cô 20/11 được phụ huynh duyệt; xin mua thú bông đắt tiền bị từ chối kèm lời giải thích nhẹ nhàng.

### 1.4. Luồng Mục tiêu tài chính & Sổ nợ
- 14 mục tiêu tài chính với 42 lượt đóng góp tích lũy (`goal_contributions`).
- 14 khoản nợ thực tế: Vay mua nhà Vietcombank của bố Minh, vay vốn kinh doanh của anh Nam, nợ ứng tiền phòng trọ bạn bè của Huy, nợ trả góp 0% điện thoại của Linh. Có 13 đợt thanh toán nợ (`debt_payments`) ghi nhận lịch sử rõ ràng.
