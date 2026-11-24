# BÁO CÁO 15 — KIỂM TRA TÍNH BẤT BIẾN / TÁI LẬP (SEEDER IDEMPOTENCY)

## 1. Cơ chế Đảm bảo Tính Tái Lập (Idempotency)
- Script `seed_ecosystem.py` sử dụng cơ chế:
  1. Xác định không gian tên UUID cố định cho toàn bộ dữ liệu demo (`c001%` cho user, `d001%` cho group).
  2. Trước khi thêm mới, thực hiện dọn dẹp có thứ tự tuân thủ toàn vẹn tham chiếu (xóa bảng con trước, bảng cha sau).
  3. Khởi tạo lại toàn bộ dữ liệu theo thuật toán xác thực (deterministic).

## 2. Kết quả Thử nghiệm Chạy Lại (Re-run Test)
- Đã chạy thử nghiệm lần thứ 2 với container `demo-seeder`:
  - **Exit Code**: 0 (SUCCESS).
  - **Thời gian thực thi**: ~12 giây.
  - **Kết quả đối soát**:
    - Không xảy ra lỗi duplicate key (`UNIQUE constraint violation`).
    - Số lượng bản ghi trước và sau khi chạy lại hoàn toàn trùng khớp (1.923 giao dịch, 38 tài khoản, 5 nhóm).
    - Số dư tài khoản không bị xáo trộn hoặc sai lệch.
