# BÁO CÁO 01 — MÔI TRƯỜNG & AN TOÀN HỆ THỐNG

## 1. Môi trường thực thi
- **Hệ điều hành**: Windows 11 Enterprise
- **Database Engine**: PostgreSQL 16 (Container `postgres` trong Docker Network `finance_network`)
- **Backend Service**: Spring Boot 3.3.4 (Java 21)
- **AI Service**: Python 3.11 FastAPI (`pfm-ai-service`)
- **Frontend Clients**: React + Vite (Web), React Native Expo (Mobile)

## 2. Kiểm tra Cơ chế Bảo vệ Production
Trong `database/demo-seed/seed_ecosystem.py`, các cơ chế an toàn cấp độ Enterprise đã được kích hoạt:
1. **Kiểm tra Chuỗi Kết nối**: Chỉ cho phép kết nối tới database có tên `finance_db` hoặc host chứa `localhost` / `postgres`. Nếu phát hiện `prod`, `production`, hoặc `rds.amazonaws.com` mà không có cờ xác nhận, script lập tức `sys.exit(1)`.
2. **Deterministic UUID Namespacing**:
   - Tất cả người dùng Demo bắt đầu bằng tiền tố: `c0010000-0000-0000-0000-0000000000xx`
   - Tất cả nhóm Demo bắt đầu bằng tiền tố: `d0010000-0000-0000-0000-0000000000xx`
   - Tất cả các lệnh `DELETE` khi dọn dẹp seed chỉ nhắm chính xác vào phạm vi UUID demo này, tuyệt đối không bao giờ ảnh hưởng tới tài khoản của người dùng thật hoặc dữ liệu thử nghiệm khác.

## 3. Trạng thái Container & Di chuyển Dữ liệu
- Docker Compose Profile `demo` khởi chạy container tạm thời `demo-seeder`, thực thi `python seed_ecosystem.py` và tự động `--rm` giải phóng tài nguyên.
- Toàn bộ migrations Flyway/Liquibase đã được Spring Boot backend chạy hoàn tất, đảm bảo đầy đủ các bảng, ràng buộc khóa ngoại (foreign key) và enum types trước khi nạp dữ liệu.
