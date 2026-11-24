# HƯỚNG DẪN THỰC THI DEMO DATA SEEDER — FINORA

Tài liệu hướng dẫn triển khai và tái tạo bộ dữ liệu Finora Demo trên mọi môi trường (Windows / Linux / Docker).

---

## 1. YÊU CẦU MÔI TRƯỜNG
- Docker Engine & Docker Compose (v2+).
- Hoặc Python 3.10+ kèm thư viện `psycopg2-binary` nếu muốn chạy trực tiếp không qua container.

---

## 2. CHẠY BẰNG DOCKER COMPOSE (KHUYÊN DÙNG)

Lệnh tiêu chuẩn cho cả **Windows (PowerShell/CMD)** và **Linux (Bash)**:

```bash
docker compose --profile demo run --rm demo-seeder
```

### Quá trình thực thi tự động:
1. Docker Compose nhận diện profile `demo`.
2. Kiểm tra trạng thái container `postgres` (đảm bảo đang `healthy`).
3. Dùng image Python FastAPI có sẵn kết nối trực tiếp vào mạng nội bộ `finance_network`.
4. Dọn dẹp dữ liệu demo cũ một cách an toàn (Idempotent cleanup).
5. Khởi tạo 14 Users, 38 Accounts, 5 Groups, 2 Kids Wallets, Quỹ nhóm, Giao dịch 3 tháng, Ngân sách, Mục tiêu, Sổ nợ và Thông báo.
6. Tự động đối soát số dư cuối cùng khớp 100% với giao dịch.
7. Xóa container tạm thời sau khi hoàn tất (`--rm`).

---

## 3. THÔNG TIN ĐĂNG NHẬP THỬ NGHIỆM

Mật khẩu chung cho tất cả tài khoản trong môi trường Demo: **`DemoPass@123`**

### Người dùng chính (Nhân vật đại diện để quay video / thuyết trình):
- **Phạm Quốc Bảo (Lập trình viên - Full Features)**:
  - Tên đăng nhập: `bao_dev`
  - Email: `bao.dev@finora.demo`
  - Tham gia: Trưởng nhóm Phòng Trọ 302, Trưởng nhóm Cặp đôi Bảo & Linh, Trưởng nhóm Bạn Thân, Trưởng nhóm Quỹ Đà Lạt.
  - Trạng thái: Có dữ liệu AI chi tiêu, cảnh báo vượt ngân sách T10, giao dịch mua sắm công nghệ đột biến (AI Anomaly).

### Phụ huynh & Ví trẻ em:
- **Bố Nguyễn Văn Minh**:
  - Tên đăng nhập: `minh_father`
  - Email: `minh.father@finora.demo`
  - Quyền: Chủ gia đình Minh Mai, duyệt chi tiêu và quản lý ví 2 con.
- **Mẹ Trần Ngọc Mai**:
  - Tên đăng nhập: `mai_mother`
  - Email: `mai.mother@finora.demo`
- **Bé Nguyễn Gia Bảo (Bin - 12 tuổi)**:
  - Tên đăng nhập: `bin_kid`
  - Email: `bin.kid@finora.kids`
  - Quyền: Nhận thưởng việc nhà, xem số dư ví của bé, gửi yêu cầu xin tiền bố mẹ.
- **Bé Nguyễn Hà My (Bông - 9 tuổi)**:
  - Tên đăng nhập: `bong_kid`
  - Email: `bong.kid@finora.kids`

---

## 4. AN TOÀN DỮ LIỆU & BẢO VỆ PRODUCTION
1. **Scope cô lập**:
   - Tất cả mã UUID của demo users đều sử dụng prefix cố định (`c0010000-...`).
   - Tất cả mã UUID của demo groups sử dụng prefix cố định (`d0010000-...`).
   - Tất cả mã UUID của kids wallets sử dụng prefix cố định (`e0010000-...`).
   - Tất cả mã UUID của quỹ nhóm sử dụng prefix cố định (`f0010000-...`).
2. **Không ảnh hưởng dữ liệu người dùng thật**:
   - Quá trình cleanup chỉ xóa các bản ghi thuộc phạm vi các UUID demo trên.
   - Không thực thi bất kỳ lệnh `DROP DATABASE` hay `DROP TABLE` nào.
