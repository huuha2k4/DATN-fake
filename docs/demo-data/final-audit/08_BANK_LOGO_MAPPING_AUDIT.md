# BÁO CÁO 08 — KIỂM TRA MAPPING LOGO NGÂN HÀNG (BANK LOGO MAPPING AUDIT)

## 1. Cập nhật Cơ sở Dữ liệu (`core.banks`)
Đã chuẩn hóa toàn bộ 24 ngân hàng và ví điện tử phổ biến tại Việt Nam với đường dẫn logo VietQR chính thức:
- **Techcombank**: `https://api.vietqr.io/img/TCB.png`
- **Vietcombank**: `https://api.vietqr.io/img/VCB.png`
- **MB Bank**: `https://api.vietqr.io/img/MB.png`
- **ACB**: `https://api.vietqr.io/img/ACB.png`
- **TPBank**: `https://api.vietqr.io/img/TPB.png`
- **MoMo**: `https://img.mservice.io/momo-payment/icon/images/logo512.png`

## 2. Liên kết Khóa ngoại trong `core.accounts`
- Toàn bộ các tài khoản ngân hàng của 14 user đều có `bank_id` trỏ đúng vào `core.banks.id`.
- Ví MoMo trỏ đúng vào bản ghi Ví MoMo trong `core.banks`.
- Ví Tiền mặt giữ `bank_id = NULL` (chuẩn theo thiết kế hệ thống).

## 3. Sửa lỗi Frontend Match Substring
- Đã sửa cả `frontend-app` và `frontend-web` trong `banksData.ts`.
- Sử dụng Regex biên từ (`\bMB\b`) thay vì `.includes('MB')`.
- Đảm bảo tài khoản Techcombank luôn hiển thị logo đỏ-trắng của Techcombank, tuyệt đối không bị hiển thị nhầm sang MB Bank.
