# THIẾT KẾ HỆ SINH THÁI DEMO FINORA (PHASE 2 - 4)

**Bộ dữ liệu**: Finora 14-User Ecosystem  
**Thời gian phát sinh**: Từ 01/09/2026 00:00:00 đến 23/11/2026 23:59:59 (Asia/Ho_Chi_Minh)  
**Mục tiêu**: Tái hiện toàn bộ nghiệp vụ tài chính người dùng thật, phục vụ quay video, test AI, đối soát số dư.

---

## 1. DANH SÁCH 14 NHÂN VẬT & TÀI KHOẢN ĐĂNG NHẬP

Tất cả tài khoản người lớn và trẻ em đều có thể đăng nhập trực tiếp trên Web và Mobile với mật khẩu chung môi trường Demo: **`DemoPass@123`**

| ID | Mã User | Họ và tên | Tên đăng nhập | Email | Vai trò & Nghề nghiệp | Thu nhập/tháng |
|---|---|---|---|---|---|---|
| U01 | `user-01-minh` | Nguyễn Văn Minh | `minh_father` | `minh.father@finora.demo` | Bố, Kỹ sư phần mềm cao cấp | 28.000.000 đ |
| U02 | `user-02-mai` | Trần Ngọc Mai | `mai_mother` | `mai.mother@finora.demo` | Mẹ, Kế toán trưởng | 19.000.000 đ |
| U03 | `user-03-bin` | Nguyễn Gia Bảo (Bin) | `bin_kid` | `bin.kid@finora.kids` | Con trai (12 tuổi, HS lớp 6) | Tiền thưởng làm việc nhà |
| U04 | `user-04-bong` | Nguyễn Hà My (Bông) | `bong_kid` | `bong.kid@finora.kids` | Con gái (9 tuổi, HS lớp 3) | Tiền thưởng + Tiền tiêu vặt |
| U05 | `user-05-bao` | Phạm Quốc Bảo | `bao_dev` | `bao.dev@finora.demo` | Lập trình viên (User Demo Chính) | 22.000.000 đ |
| U06 | `user-06-linh` | Lê Khánh Linh | `linh_mkt` | `linh.mkt@finora.demo` | Chuyên viên Marketing | 16.000.000 đ |
| U07 | `user-07-huy` | Trần Đức Huy | `huy_student` | `huy.student@finora.demo` | Sinh viên năm 4 & Thực tập sinh | 7.000.000 đ |
| U08 | `user-08-tuan` | Hoàng Anh Tuấn | `tuan_office` | `tuan.office@finora.demo` | Chuyên viên văn phòng | 14.000.000 đ |
| U09 | `user-09-trang` | Đỗ Thu Trang | `trang_freelance` | `trang.freelance@finora.demo` | Thiết kế đồ họa tự do (Freelancer) | 12.000.000 – 18.000.000 đ |
| U10 | `user-10-khang` | Nguyễn Minh Khang | `khang_sales` | `khang.sales@finora.demo` | Nhân viên kinh doanh BĐS | 18.000.000 đ |
| U11 | `user-11-vy` | Vũ Thảo Vy | `vy_student` | `vy.student@finora.demo` | Sinh viên đại học | 5.000.000 đ |
| U12 | `user-12-nam` | Phan Hoàng Nam | `nam_merchant` | `nam.merchant@finora.demo` | Chủ chuỗi cửa hàng phụ kiện | 30.000.000 đ |
| U13 | `user-13-ha` | Bùi Thanh Hà | `ha_teacher` | `ha.teacher@finora.demo` | Giáo viên trung học | 13.000.000 đ |
| U14 | `user-14-phuc` | Đặng Đức Phúc | `phuc_shipper` | `phuc.shipper@finora.demo` | Nhân viên giao hàng công nghệ | 11.000.000 đ |

---

## 2. 5 NHÓM TÀI CHÍNH LIÊN KẾT

### G01 — GIA ĐÌNH MINH MAI (Family Hub)
- **Loại**: `FAMILY`
- **Chủ nhóm**: U01 (Bố Minh)
- **Thành viên**: U01, U02 (Mẹ Mai), U03 (Bin - linked kid wallet), U04 (Bông - linked kid wallet).
- **Quỹ chung**: `Quỹ sinh hoạt gia đình Minh Mai`
- **Diễn biến**:
  - Tháng 9: Bố mẹ góp quỹ mỗi người 5.000.000 đ/tháng. Chi tiền điện nước 1.850.000 đ, internet 350.000 đ, học phí 2 con 4.500.000 đ, đi chợ cuối tuần. Bố mẹ giao việc nhà cho Bin (rửa bát, lau nhà) và Bông (gấp quần áo).
  - Tháng 10: Tăng chi tiền sách vở đầu năm học. Bin xin 120.000 đ mua sách lịch sử (được duyệt). Bông xin 200.000 đ mua gấu bông (bị từ chối, sau đó xin 85.000 đ mua màu vẽ được duyệt). Bin gửi tiết kiệm 300.000 đ vào mục tiêu mua xe đạp.
  - Tháng 11: Tổng kết tài chính gia đình, bố mẹ tiếp tục giao nhiệm vụ và nạp ví cho hai con.

### G02 — CẶP ĐÔI BẢO LINH (Couple Finance)
- **Loại**: `COUPLE`
- **Chủ nhóm**: U05 (Bảo - Lập trình viên)
- **Thành viên**: U05, U06 (Linh - Người yêu)
- **Quỹ chung**: `Quỹ hẹn hò Bảo & Linh`
- **Diễn biến**:
  - Hai người định kỳ mỗi tháng góp quỹ 2.000.000 đ/người.
  - Chi tiêu xem phim CGV, ăn tối lãng mạn, cà phê Starbucks/Phúc Long.
  - Mua quà sinh nhật Linh vào tháng 10.
  - Bảo ứng tiền mua vé concert, sau đó Linh chuyển tiền cân đối nợ tất toán qua nhóm.

### G03 — PHÒNG TRỌ 302 (Roommates Splitting)
- **Loại**: `ROOMMATE`
- **Chủ nhóm**: U05 (Bảo)
- **Thành viên**: U05, U07 (Huy), U08 (Tuấn)
- **Diễn biến chi phí hàng tháng**:
  - Tiền phòng: 6.000.000 đ (mỗi người 2.000.000 đ).
  - Tiền điện, nước, wifi, vệ sinh: dao động 1.200.000 – 1.600.000 đ chia đều 3 người.
  - Tháng 9: Huy và Tuấn chuyển tiền đúng hẹn cho Bảo.
  - Tháng 10: Huy kẹt tiền làm thêm nộp muộn, Bảo đứng ra ứng trước toàn bộ tiền phòng.
  - Tháng 11: Huy nhận lương part-time trả trước 1.500.000 đ, sau đó thanh toán hết nợ còn lại (tất toán 0 đ).

### G04 — HỘI BẠN THÂN ĐẠI HỌC (Friendship Group)
- **Loại**: `PROJECT` / `OTHER`
- **Chủ nhóm**: U05 (Bảo)
- **Thành viên**: U05, U06, U07, U09 (Trang)
- **Diễn biến**:
  - Giao lưu lẩu nướng Haidilao, cà phê Highland cuối tuần.
  - Chia hóa đơn chính xác theo đầu người.
  - Có các đoạn chat vui nhộn, thả tim và bình luận trực tiếp trong giao dịch.

### G05 — QUỸ DU LỊCH ĐÀ LẠT THÁNG 11 (Travel Squad)
- **Loại**: `TRAVEL`
- **Chủ nhóm**: U05 (Bảo)
- **Thành viên**: U05, U06, U08, U09
- **Quỹ chung**: `Quỹ Đà Lạt Mộng Mơ`
- **Diễn biến**:
  - Tháng 9: Lập nhóm, mỗi người đóng góp 1.500.000 đ vào quỹ.
  - Tháng 10: Đóng thêm đợt 2 (1.000.000 đ/người). Đặt phòng Homestay, vé xe limousine.
  - Tháng 11: Khởi hành đi Đà Lạt từ 06/11 đến 09/11/2026. Ăn uống, vé tham quan đồi chè, lẩu gà lá é, cà phê mây. Quyết toán quỹ và hoàn tiền thừa về ví cá nhân.

---

## 3. THIẾT KẾ DỮ LIỆU ĐẶC THÙ CHO CÁC MODULE AI FINORA

1. **AI Phân tích chi tiêu (Spending Analysis)**:
   - U05 có tỷ lệ chi tiêu ăn uống chiếm 38%, công nghệ 22%, hẹn hò 18%.
   - U07 có tháng 10 chi tiêu vượt 125% thu nhập do mua phụ tùng xe máy.
2. **AI Dự báo số dư (Balance Forecasting)**:
   - U01 và U05 có dòng tiền thu nhập rất đều đặn vào ngày 5 hàng tháng (ngày trả lương).
   - Chi phí cố định ngày 10 (tiền phòng / tiền điện nước) lặp lại chính xác giúp AI học chu kỳ mượt mà.
3. **AI Phát hiện bất thường (Anomaly Engine)**:
   - Ngày 18/10/2026: U05 có giao dịch mua đồ công nghệ đột biến (bàn phím cơ & màn hình 27 inch trị giá 6.800.000 đ, cao gấp 4 lần mức chi tiêu trung bình).
4. **FinAI Action Agent**:
   - Dữ liệu lịch sử 3 tháng đa dạng giúp người dùng dễ dàng chat: *"Tháng trước tôi đã chi bao nhiêu tiền cho ăn uống?"*, *"Tạo giao dịch ăn sáng 45k"*, *"Tạo ngân sách đi chợ 3 triệu cho tháng này"*.
