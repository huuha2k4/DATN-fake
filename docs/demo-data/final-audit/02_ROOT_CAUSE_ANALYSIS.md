# BÁO CÁO 02 — PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

Dựa trên quá trình kiểm tra thực tế trên ứng dụng Mobile và Database, các lỗi nghiêm trọng ở các giai đoạn trước đã được truy tìm nguyên nhân gốc rễ và xử lý triệt để:

## 1. Lỗi Hiển thị Logo MB Bank cho Tài khoản Techcombank
- **Hiện tượng**: Tài khoản Techcombank của Bảo hiển thị Logo Ngân hàng Quân đội (MB Bank).
- **Nguyên nhân gốc rễ**: 
  - Trong frontend (`frontend-app/src/modules/accounts/constants/banksData.ts` và `frontend-web`), hàm `findBankOrWalletPreset` tìm kiếm bằng `q.includes(item.code)`.
  - Mã của MB Bank là `"MB"`. Chuỗi `"TECHCOMBANK"` chứa cụm `"MB"` (`techcoMBank`).
  - Do đó hàm so khớp nhầm Techcombank với MB Bank.
  - Đồng thời, trước đây cột `bank_id` trong `core.accounts` bị để `NULL`, backend không thể nạp logo chính thức từ `core.banks`.
- **Giải pháp triệt để**:
  - Viết lại hàm `findBankOrWalletPreset` bằng Regex Token / Word Boundary: `(?:\b|_|^)MB(?:\b|_|$)`, loại bỏ hoàn toàn việc match chuỗi con ngẫu nhiên.
  - Cập nhật URL logo VietQR chính xác cho 24 ngân hàng trong `core.banks`.
  - Seeder tự động tra cứu UUID của ngân hàng trong `core.banks` và gán chính xác `bank_id` vào tài khoản ngân hàng.

## 2. Chi tiêu của Bảo quá thấp và lệch hoàn cảnh sống (3,88 triệu / tháng)
- **Hiện tượng**: Lương 22 triệu nhưng tháng 11 chỉ tiêu 3,88 triệu, chỉ gồm 3 danh mục.
- **Nguyên nhân gốc rễ**: 
  - Seeder cũ chỉ tạo vài giao dịch ngẫu nhiên nhỏ lẻ để đủ số lượng `COUNT(*)`, bỏ quên chi phí thiết yếu của lập trình viên sống tại Hà Nội/TP.HCM: Tiền thuê căn hộ studio (6,5 triệu), ăn ngoài với đồng nghiệp, cà phê công nghệ, mua sắm linh kiện/khoá học Udemy, chi phí hẹn hò với Linh.
- **Giải pháp triệt để**:
  - Tái cấu trúc bộ sinh giao dịch với định mức thực tế: Tháng 9 tiêu 26.69M, Tháng 10 tiêu 26.80M, Tháng 11 (đến 23/11) tiêu 22.78M.
  - Bổ sung 9-10 nhóm danh mục đa dạng (Nhà ở, Ăn uống, Đi lại, Giáo dục, Mua sắm, Y tế, Gia đình, Giải trí, Tiện ích).

## 3. Mã kỹ thuật hiển thị trên giao diện người dùng
- **Hiện tượng**: Tiêu đề và ghi chú chứa `#01`, `#27`, `(bao_dev)`.
- **Nguyên nhân gốc rễ**: 
  - Tác giả seeder trước sử dụng các chuỗi template đánh số debug để đếm bản ghi và phân biệt user trong script.
- **Giải pháp triệt để**:
  - Xóa bỏ 100% các ký tự debug. Toàn bộ tên giao dịch, mô tả hóa đơn, tin nhắn nhóm và bình luận đều sử dụng ngôn ngữ đời sống tự nhiên của người Việt (VD: "Đổ xăng xe máy", "Cơm trưa văn phòng cùng team", "Uống Gong Cha với Linh").
