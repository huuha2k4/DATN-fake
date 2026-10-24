# Đặc Tả Chi Tiết Schema Core

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026

---

## 📋 Mục Lục

1. [Nhóm Tham Chiếu](#nhóm-tham-chiếu)
2. [Nhóm Định Danh & Bảo Mật](#nhóm-định-danh--bảo-mật)
3. [Nhóm Chia Sẻ Nhóm](#nhóm-chia-sẻ-nhóm)
4. [Nhóm Tài Khoản & Tài Sản](#nhóm-tài-khoản--tài-sản)
5. [Nhóm Danh Mục](#nhóm-danh-mục)
6. [Nhóm Giao Dịch](#nhóm-giao-dịch)
7. [Nhóm Ngân Sách](#nhóm-ngân-sách)
8. [Nhóm Mục Tiêu](#nhóm-mục-tiêu)
9. [Nhóm Lịch & Nhắc Nhở](#nhóm-lịch--nhắc-nhở)
10. [Nhóm Khoản Nợ](#nhóm-khoản-nợ)
11. [Bảng Tổng Hợp](#bảng-tổng-hợp)

---

## Nhóm Tham Chiếu

### core.currencies (Tiền Tệ)

**Mô tả:** Danh sách tiền tệ ISO 4217

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| code | CHAR(3) | PK | Mã tiền tệ (VND, USD, EUR...) |
| name | VARCHAR(100) | NOT NULL | Tên tiền tệ |
| symbol | VARCHAR(10) | NOT NULL | Ký hiệu (₫, $, €...) |
| decimal_digits | SMALLINT | NOT NULL, CHECK 0-4 | Số chữ số thập phân |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Đang hoạt động |

**Dữ liệu seed:** ~180 tiền tệ toàn hệ thống

---

### core.exchange_rates (Tỷ Giá)

**Mô tả:** Tỷ giá hối đoái theo ngày

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | BIGSERIAL | PK | ID tự tăng |
| base_code | CHAR(3) | NOT NULL, FK → currencies | Tiền tệ gốc |
| quote_code | CHAR(3) | NOT NULL, FK → currencies | Tiền tệ đích |
| rate | NUMERIC(18,8) | NOT NULL, CHECK > 0 | Tỷ giá: 1 base = rate quote |
| rate_date | DATE | NOT NULL | Ngày áp dụng |
| source | VARCHAR(50) | NULL | Nguồn dữ liệu |

**Ràng buộc:**
- UNIQUE (base_code, quote_code, rate_date)

**Cập nhật:** Job đồng bộ 00:30 hàng ngày

---

### core.banks (Ngân Hàng / Ví Điện Tử)

**Mô tả:** Danh sách ngân hàng và ví điện tử

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | ID ngân hàng |
| code | VARCHAR(20) | NOT NULL, UNIQUE | Mã (VCB, MOMO...) |
| name | VARCHAR(150) | NOT NULL | Tên đầy đủ |
| short_name | VARCHAR(50) | NULL | Tên ngắn |
| bin | VARCHAR(10) | NULL | Mã BIN NAPAS |
| logo_url | TEXT | NULL | URL logo |
| kind | VARCHAR(20) | NOT NULL, CHECK | BANK hoặc E_WALLET |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Đang hoạt động |

**Dữ liệu seed:** ~40 ngân hàng + 5 ví điện tử

---

## Nhóm Định Danh & Bảo Mật

### core.users (Người Dùng)

**Mô tả:** Tài khoản đăng nhập chính

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | ID người dùng |
| email | email_addr | NOT NULL, UNIQUE partial | Email đăng nhập (unique khi chưa xóa) |
| email_verified_at | TIMESTAMPTZ | NULL | Thời điểm xác thực email |
| password_hash | VARCHAR(255) | NULL | BCrypt cost 12; NULL nếu chỉ OAuth |
| phone | VARCHAR(20) | NULL, UNIQUE partial | Số điện thoại E.164 |
| status | user_status_enum | NOT NULL, DEFAULT 'PENDING' | PENDING/ACTIVE/LOCKED/DISABLED/DELETED |
| base_currency | currency_code | NOT NULL, DEFAULT 'VND', FK | Tiền tệ báo cáo |
| timezone | VARCHAR(64) | NOT NULL, DEFAULT 'Asia/Ho_Chi_Minh' | Múi giờ IANA |
| locale | VARCHAR(10) | NOT NULL, DEFAULT 'vi-VN' | Ngôn ngữ |
| failed_login_count | SMALLINT | NOT NULL, DEFAULT 0 | Số lần đăng nhập sai |
| locked_until | TIMESTAMPTZ | NULL | Khóa tạm thời đến |
| last_login_at | TIMESTAMPTZ | NULL | Đăng nhập lần cuối |
| **created_at** | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn (soft delete) |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn (optimistic lock) |

**Xóa tài khoản:** 
- status='DELETED', deleted_at=now()
- Ẩn danh email: 'deleted+<id>@deleted.invalid'
- Xóa password_hash, phone
- Sau 30 ngày: job xóa cứng (cascade) + xóa file S3

**Truy cập không đăng nhập:**
- RLS chặn tra theo email
- Dùng `fn_find_user_by_email()` (SECURITY DEFINER)
- Trả: id, password_hash, status, failed_login_count, locked_until, email_verified_at

---

### core.user_profiles (Hồ Sơ Mở Rộng)

**Mô tả:** Thông tin cá nhân chi tiết

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| user_id | UUID | PK, FK CASCADE → users | |
| full_name | VARCHAR(150) | NULL | Họ tên đầy đủ |
| display_name | VARCHAR(80) | NULL | Tên hiển thị |
| avatar_key | TEXT | NULL | Key ảnh trên S3 |
| date_of_birth | DATE | NULL | Ngày sinh |
| gender | VARCHAR(20) | NULL | Giới tính |
| occupation | VARCHAR(100) | NULL | Nghề nghiệp (đặc trưng AI) |
| monthly_income_estimate | money_nonneg | NULL | Thu nhập ước tính |
| financial_literacy_level | SMALLINT | NULL, CHECK 1-5 | Mức hiểu biết tài chính |

---

### core.user_settings (Cài Đặt)

**Mô tả:** Tùy chọn cấu hình cá nhân

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| user_id | UUID | PK, FK CASCADE → users | |
| month_start_day | SMALLINT | NOT NULL, DEFAULT 1, CHECK 1-28 | Ngày bắt đầu "tháng tài chính" |
| week_start_day | SMALLINT | NOT NULL, DEFAULT 1, CHECK 1-7 | Ngày bắt đầu tuần |
| budget_alert_threshold | percentage | NOT NULL, DEFAULT 80 | Ngưỡng cảnh báo ngân sách |
| is_ai_enabled | BOOLEAN | NOT NULL, DEFAULT true | Bật tính năng AI |
| is_ai_training_consent | BOOLEAN | NOT NULL, DEFAULT false | Đồng ý huấn luyện AI |
| is_auto_categorize | BOOLEAN | NOT NULL, DEFAULT true | Tự phân loại |
| auto_categorize_min_confidence | confidence | NOT NULL, DEFAULT 0.85 | Ngưỡng tin cậy tối thiểu |
| notification_prefs | JSONB | NOT NULL, DEFAULT '{}' | Tùy chọn thông báo |
| quiet_hours_start | TIME | NULL | Giờ bắt đầu chế độ im lặng |
| quiet_hours_end | TIME | NULL | Giờ kết thúc chế độ im lặng |

**Cấu trúc notification_prefs:**
```json
{
  "BUDGET_ALERT": { "IN_APP": true, "PUSH": true, "EMAIL": false },
  "ANOMALY_ALERT": { "IN_APP": true, "PUSH": true, "EMAIL": true },
  "REMINDER_DUE": { "IN_APP": true, "PUSH": true, "EMAIL": false },
  "WEEKLY_REPORT": { "IN_APP": false, "PUSH": false, "EMAIL": true },
  "AI_INSIGHT": { "IN_APP": true, "PUSH": false, "EMAIL": false }
}
```

---

### core.user_sync_state (Trạng Thái Đồng Bộ)

**Mô tả:** Bộ đếm cấp sync_seq theo từng user

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| user_id | UUID | PK, FK CASCADE → users | |
| seq | BIGINT | NOT NULL, DEFAULT 0 | Số thứ tự đồng bộ |

**Cách hoạt động:** Xem chi tiết tại `09-chien-luoc-dong-bo.md`

---

### core.auth_tokens (Token Xác Thực)

**Mô tả:** Token xác thực email / đặt lại mật khẩu

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| kind | VARCHAR(20) | NOT NULL, CHECK | VERIFY_EMAIL / RESET_PASSWORD |
| token_hash | CHAR(64) | NOT NULL, UNIQUE | SHA-256, không lưu token thô |
| expires_at | TIMESTAMPTZ | NOT NULL | Hết hạn |
| used_at | TIMESTAMPTZ | NULL | Thời điểm sử dụng |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### core.oauth_accounts (Liên Kết OAuth)

**Mô tả:** Đăng nhập bằng Google, Apple, Facebook

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| provider | VARCHAR(30) | NOT NULL, CHECK | GOOGLE/APPLE/FACEBOOK |
| provider_user_id | VARCHAR(191) | NOT NULL | ID tại nhà cung cấp |
| email_at_provider | VARCHAR(255) | NULL | Email tại nhà cung cấp |
| linked_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Thời điểm liên kết |

**Ràng buộc:**
- UNIQUE (provider, provider_user_id)

---

### core.refresh_tokens (Refresh Token)

**Mô tả:** JWT refresh token với phát hiện trộm token

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| token_hash | CHAR(64) | NOT NULL, UNIQUE | SHA-256 |
| device_id | VARCHAR(128) | NULL | ID thiết bị |
| device_name | VARCHAR(100) | NULL | Tên thiết bị |
| ip_address | INET | NULL | Địa chỉ IP |
| user_agent | TEXT | NULL | User agent |
| expires_at | TIMESTAMPTZ | NOT NULL | Hết hạn (30 ngày) |
| revoked_at | TIMESTAMPTZ | NULL | Thời điểm thu hồi |
| replaced_by_id | UUID | NULL, FK SET NULL self | Token thay thế |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Phát hiện trộm token:**
- Token đã có replaced_by_id bị dùng lại
- → Thu hồi cả chuỗi của thiết bị
- → Ghi audit_logs

---

### core.mfa_credentials (Xác Thực Hai Yếu Tố)

**Mô tả:** TOTP secret và mã dự phòng

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| user_id | UUID | PK, FK CASCADE → users | |
| totp_secret_enc | BYTEA | NOT NULL | AES-256-GCM, khóa ở Vault/ENV |
| backup_codes_hash | TEXT[] | NOT NULL | BCrypt, 10 mã |
| confirmed_at | TIMESTAMPTZ | NULL | 2FA chỉ bật khi đã xác nhận |
| last_used_at | TIMESTAMPTZ | NULL | Dùng lần cuối |

---

## Nhóm Chia Sẻ Nhóm

### core.groups (Nhóm)

**Mô tả:** Nhóm/gia đình để chia sẻ tài nguyên

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| name | VARCHAR(120) | NOT NULL | Tên nhóm |
| owner_id | UUID | NOT NULL, FK → users | Chủ nhóm |
| base_currency | currency_code | NOT NULL, FK → currencies | Tiền tệ chung |
| avatar_key | TEXT | NULL | Ảnh đại diện nhóm |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

---

### core.group_members (Thành Viên Nhóm)

**Mô tả:** Thành viên trong nhóm với vai trò

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| group_id | UUID | PK, FK CASCADE → groups | |
| user_id | UUID | PK, FK CASCADE → users | |
| role | share_role_enum | NOT NULL, DEFAULT 'VIEWER' | VIEWER/EDITOR/OWNER |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Thời điểm tham gia |
| contribution_ratio | percentage | NULL | Tỷ lệ đóng góp |

---

### core.group_invitations (Lời Mời Nhóm)

**Mô tả:** Lời mời tham gia nhóm

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| group_id | UUID | NOT NULL, FK CASCADE → groups | |
| invited_email | VARCHAR(255) | NOT NULL | Email người được mời |
| invited_by | UUID | NOT NULL, FK → users | Người mời |
| role | share_role_enum | NOT NULL, DEFAULT 'VIEWER' | Vai trò dự kiến |
| token_hash | CHAR(64) | NOT NULL, UNIQUE | Token mời |
| expires_at | TIMESTAMPTZ | NOT NULL | Hết hạn (7 ngày) |
| accepted_at | TIMESTAMPTZ | NULL | Thời điểm chấp nhận |

---

### core.shared_resources (Tài Nguyên Được Chia Sẻ)

**Mô tả:** Cơ chế chia sẻ duy nhất - khóa đa hình

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| group_id | UUID | NOT NULL, FK CASCADE → groups | Nhóm nhận chia sẻ |
| resource_type | VARCHAR(20) | NOT NULL, CHECK | ACCOUNT/BUDGET/GOAL |
| resource_id | UUID | NOT NULL | Khóa đa hình (không FK) |
| shared_by | UUID | NOT NULL, FK → users | Người chia sẻ |
| permission | share_role_enum | NOT NULL, DEFAULT 'VIEWER' | Quyền trên tài nguyên |
| shared_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Ràng buộc:**
- UNIQUE (group_id, resource_type, resource_id)
- INDEX (resource_type, resource_id)

**Toàn vẹn khóa đa hình:**
- Trigger `trg_shared_resource_exists` kiểm tra tài nguyên tồn tại
- Job dọn bản ghi mồ côi hàng tuần

**Quyền thực tế:** `LEAST(permission, group_members.role)`

---

## Nhóm Tài Khoản & Tài Sản

### core.accounts (Ví / Tài Khoản)

**Mô tả:** Ví tiền mặt, tài khoản ngân hàng, ví điện tử, thẻ tín dụng

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | Chủ ví |
| name | VARCHAR(100) | NOT NULL | Tên ví |
| type | account_type_enum | NOT NULL | CASH/BANK/E_WALLET/CREDIT_CARD/SAVINGS/INVESTMENT/OTHER |
| bank_id | UUID | NULL, FK → banks | Bắt buộc khi BANK/E_WALLET/CREDIT_CARD |
| account_number_masked | VARCHAR(30) | NULL | Chỉ 4 số cuối |
| currency_code | currency_code | NOT NULL, FK → currencies | **Một ví một tiền tệ** |
| initial_balance | money | NOT NULL, DEFAULT 0 | Số dư ban đầu |
| **current_balance** | money | NOT NULL, DEFAULT 0 | **Cột dẫn xuất** - không đồng bộ |
| credit_limit | money_nonneg | NULL | Hạn mức (chỉ CREDIT_CARD) |
| statement_day | SMALLINT | NULL, CHECK 1-28 | Ngày chốt sao kê |
| due_day | SMALLINT | NULL, CHECK 1-28 | Ngày đến hạn thanh toán |
| icon | VARCHAR(50) | NULL | Icon hiển thị |
| color | CHAR(7) | NULL, CHECK ^#[0-9A-Fa-f]{6}$ | Màu sắc |
| is_included_in_total | BOOLEAN | NOT NULL, DEFAULT true | Tính vào tổng tài sản |
| is_archived | BOOLEAN | NOT NULL, DEFAULT false | Lưu trữ (không ghi giao dịch mới) |
| display_order | SMALLINT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị |
| sync_seq | BIGINT | NULL | Số thứ tự đồng bộ |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Ràng buộc:**
- UNIQUE partial (user_id, lower(name)) khi chưa xóa

**Quy tắc số dư (BR-06, BR-32):**
- INSERT: current_balance := initial_balance
- Đổi initial_balance: số dư dịch đúng chênh lệch
- Client không ghi đè được current_balance (trg_a_protect_derived)
- Số dư chỉ thay đổi qua trg_tx_balance_*

**Triggers:**
- `trg_a_protect_derived`: Bảo vệ current_balance
- `trg_account_init`: Khởi tạo và dịch số dư
- `trg_sync_seq`: Gán sync_seq
- `trg_tombstone`: Ghi tombstone khi xóa
- `trg_touch`: Cập nhật updated_at/version

---

### core.account_balance_snapshots (Chốt Số Dư)

**Mô tả:** Chốt số dư cuối ngày

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | BIGSERIAL | PK | |
| account_id | UUID | NOT NULL, FK CASCADE → accounts | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| snapshot_date | DATE | NOT NULL | Ngày chốt |
| closing_balance | money | NOT NULL | Số dư cuối ngày |
| total_inflow | money_nonneg | NOT NULL, DEFAULT 0 | Tổng tiền vào |
| total_outflow | money_nonneg | NOT NULL, DEFAULT 0 | Tổng tiền ra |
| transaction_count | INTEGER | NOT NULL, DEFAULT 0 | Số giao dịch |

**Ràng buộc:**
- UNIQUE (account_id, snapshot_date)

**Cập nhật:** Job 00:15 theo múi giờ người dùng

---

### core.assets (Tài Sản)

**Mô tả:** Tài sản ngoài tiền mặt (vàng, bất động sản, xe...)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| name | VARCHAR(150) | NOT NULL | Tên tài sản |
| asset_type | VARCHAR(30) | NOT NULL, CHECK | GOLD/REAL_ESTATE/VEHICLE/STOCK/CRYPTO/OTHER |
| quantity | NUMERIC(18,6) | NULL | Số lượng |
| unit | VARCHAR(20) | NULL | Đơn vị |
| purchase_price | money_nonneg | NULL | Giá mua |
| purchase_date | DATE | NULL | Ngày mua |
| **current_value** | money_nonneg | NOT NULL, DEFAULT 0 | **Cột dẫn xuất** từ định giá mới nhất |
| currency_code | currency_code | NOT NULL, FK → currencies | |
| is_liquid | BOOLEAN | NOT NULL, DEFAULT false | Tài sản thanh khoản |
| linked_account_id | UUID | NULL, FK SET NULL → accounts | Tài khoản liên kết |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Triggers:**
- `trg_a_protect_derived`: Bảo vệ current_value
- `trg_touch`: Cập nhật updated_at/version

---

### core.asset_valuations (Định Giá Tài Sản)

**Mô tả:** Lịch sử định giá tài sản

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | BIGSERIAL | PK | |
| asset_id | UUID | NOT NULL, FK CASCADE → assets | |
| valued_at | DATE | NOT NULL | Ngày định giá |
| value | money_nonneg | NOT NULL | Giá trị |
| source | VARCHAR(30) | NOT NULL, DEFAULT 'MANUAL', CHECK | MANUAL/MARKET_API |

**Ràng buộc:**
- UNIQUE (asset_id, valued_at)

**Trigger:**
- `trg_asset_current_value`: Cập nhật assets.current_value

---

## Nhóm Danh Mục

### core.categories (Danh Mục Thu Chi)

**Mô tả:** Cây danh mục 2 cấp (hệ thống + người dùng tùy biến)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NULL, FK CASCADE → users | NULL = danh mục hệ thống |
| parent_id | UUID | NULL, FK self | NULL = cấp 1 |
| code | VARCHAR(50) | NULL, UNIQUE partial | Mã bất biến hệ thống (UNCATEGORIZED, FOOD_DRINK...) |
| name | VARCHAR(100) | NOT NULL | Tên danh mục |
| kind | category_kind_enum | NOT NULL | INCOME/EXPENSE/BOTH |
| icon | VARCHAR(50) | NULL | Icon hiển thị |
| color | CHAR(7) | NULL | Màu sắc |
| is_system | BOOLEAN | NOT NULL, DEFAULT false | Không sửa/xóa |
| is_essential | BOOLEAN | NOT NULL, DEFAULT false | Chi thiết yếu (AI 5) |
| default_budget_ratio | percentage | NULL | Tỷ lệ ngân sách mặc định |
| display_order | SMALLINT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị |
| sync_seq | BIGINT | NULL | Số thứ tự đồng bộ (chỉ user) |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Ràng buộc:**
- UNIQUE (user_id, parent_id, lower(name)) NULLS NOT DISTINCT khi chưa xóa
- CHECK: không tự tham chiếu (id <> parent_id)

**Trigger:**
- `trg_category_depth`: Chặn quá 2 cấp
- `trg_sync_seq`: Gán sync_seq (chỉ danh mục user)
- `trg_tombstone`: Ghi tombstone
- `trg_touch`: Cập nhật updated_at/version

**Xóa danh mục có giao dịch:** Bắt buộc `sp_merge_category(src, dest)`

---

### core.merchants (Cửa Hàng)

**Mô tả:** Cửa hàng / đơn vị bán hàng

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NULL, FK CASCADE → users | NULL = toàn cục |
| name | VARCHAR(150) | NOT NULL | Tên cửa hàng |
| normalized_name | VARCHAR(150) | NOT NULL | Tên chuẩn hóa (bỏ dấu, chữ thường) |
| aliases | TEXT[] | NOT NULL, DEFAULT '{}' | Các tên gọi khác |
| default_category_id | UUID | NULL, FK SET NULL → categories | Danh mục mặc định |
| mcc | CHAR(4) | NULL | Mã loại hình (MCC) |
| logo_url | TEXT | NULL | Logo |
| usage_count | INTEGER | NOT NULL, DEFAULT 0 | Số lần sử dụng |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- GIN trigram(normalized_name): Tìm kiếm mờ
- GIN(aliases): Tìm theo alias

---

### core.tags (Nhãn)

**Mô tả:** Nhãn tùy chỉnh gắn vào giao dịch

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| name | VARCHAR(50) | NOT NULL | Tên nhãn |
| color | CHAR(7) | NULL | Màu sắc |
| sync_seq | BIGINT | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Ràng buộc:**
- UNIQUE partial (user_id, lower(name)) khi chưa xóa

---

**Tiếp tục phần 2...**

## Nhóm Giao Dịch

### core.receipts (Hóa Đơn OCR)

**Mô tả:** Hóa đơn OCR - đồng thời là nơi giữ trạng thái OCR (thay ai_ocr_jobs)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | |
| storage_key | TEXT | NOT NULL | Khóa ảnh S3 |
| file_size_bytes | INTEGER | NULL | Kích thước file |
| mime_type | VARCHAR(50) | NULL | Loại file |
| image_hash | CHAR(64) | NOT NULL | SHA-256, UNIQUE với user_id |
| ocr_status | ocr_status_enum | NOT NULL, DEFAULT 'PENDING' | PENDING/PROCESSING/SUCCEEDED/FAILED/MANUAL_REVIEW |
| ocr_attempt_count | SMALLINT | NOT NULL, DEFAULT 0 | Tối đa 3 lần |
| ocr_queued_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| ocr_started_at | TIMESTAMPTZ | NULL | |
| ocr_finished_at | TIMESTAMPTZ | NULL | |
| ocr_engine | VARCHAR(50) | NULL | Công cụ OCR |
| ocr_model_id | UUID | NULL, FK SET NULL → model_registry | |
| ocr_raw | JSONB | NULL | Kết quả thô |
| ocr_confidence | confidence | NULL | Độ tin cậy trung bình |
| ocr_field_confidences | JSONB | NULL | Độ tin cậy từng trường |
| ocr_error | TEXT | NULL | Lỗi khi FAILED |
| merchant_name_raw | VARCHAR(200) | NULL | Tên cửa hàng trích xuất |
| merchant_id | UUID | NULL, FK SET NULL → merchants | |
| total_amount | money_nonneg | NULL | Tổng tiền |
| tax_amount | money_nonneg | NULL | Thuế |
| purchased_at | TIMESTAMPTZ | NULL | Thời gian mua |
| currency_code | currency_code | NULL, FK → currencies | |
| is_confirmed | BOOLEAN | NOT NULL, DEFAULT false | Người dùng đã xác nhận |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Ràng buộc:**
- UNIQUE (user_id, image_hash) - chống quét trùng

**Index:**
- Partial (ocr_queued_at) WHERE ocr_status IN ('PENDING','PROCESSING')

**Cấu trúc ocr_raw:**
```json
{
  "engine": "paddleocr",
  "processing_ms": 1234,
  "blocks": [
    {"text": "Highlands Coffee", "bbox": [10, 20, 100, 40], "score": 0.95}
  ],
  "extracted": {
    "merchant": {"value": "Highlands Coffee", "score": 0.95},
    "total": {"value": 45000, "score": 0.92, "pattern": "matched"},
    "datetime": {"value": "2026-10-11T10:30:00", "score": 0.88}
  }
}
```

---

### core.receipt_items (Dòng Hàng Hóa Đơn)

**Mô tả:** Chi tiết sản phẩm trong hóa đơn

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | BIGSERIAL | PK | |
| receipt_id | UUID | NOT NULL, FK CASCADE → receipts | |
| line_no | SMALLINT | NOT NULL | Số dòng |
| item_name | VARCHAR(200) | NOT NULL | Tên sản phẩm |
| quantity | NUMERIC(12,3) | NULL, DEFAULT 1 | Số lượng |
| unit_price | money_nonneg | NULL | Đơn giá |
| line_total | money_nonneg | NULL | Thành tiền |
| suggested_category_id | UUID | NULL, FK SET NULL → categories | Danh mục gợi ý AI |
| confidence | confidence | NULL | Độ tin cậy |

**Ràng buộc:**
- UNIQUE (receipt_id, line_no)

---

### core.transactions (Giao Dịch - Bảng Trung Tâm) ⭐

**Mô tả:** Giao dịch thu/chi/chuyển khoản (~80% lưu lượng)

**Quyết định thiết kế:** Chuyển khoản là một dòng hai đầu (account_id → to_account_id), phí và tiền nhận riêng (fee_amount, to_amount).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK CASCADE → users | Người tạo (có thể khác chủ ví nếu EDITOR) |
| account_id | UUID | NOT NULL, FK RESTRICT → accounts | Ví nguồn (chi/chuyển) hoặc ví nhận (thu) |
| to_account_id | UUID | NULL, FK RESTRICT → accounts | Chỉ TRANSFER |
| category_id | UUID | NULL, FK RESTRICT → categories | NULL khi TRANSFER |
| merchant_id | UUID | NULL, FK SET NULL → merchants | |
| receipt_id | UUID | NULL, FK SET NULL → receipts, UNIQUE partial | Một hóa đơn ↔ tối đa một giao dịch |
| type | transaction_type_enum | NOT NULL | INCOME/EXPENSE/TRANSFER |
| **amount** | money_pos | NOT NULL | Theo tiền tệ ví nguồn |
| **currency_code** | currency_code | NOT NULL, FK → currencies | Phải = accounts.currency_code |
| **exchange_rate** | NUMERIC(18,8) | NOT NULL, CHECK > 0 | Trigger điền nếu bỏ trống |
| **is_rate_estimated** | BOOLEAN | NOT NULL, DEFAULT false | Dùng tỷ giá gần nhất |
| **base_amount** | money_pos | NOT NULL | Quy đổi tiền tệ gốc; trigger điền |
| **fee_amount** | money_nonneg | NOT NULL, DEFAULT 0 | Phí theo tiền tệ ví nguồn |
| **base_fee** | money_nonneg | NOT NULL | Phí đã quy đổi (trigger tính) |
| **to_amount** | money_pos | NULL | Theo tiền tệ ví đích |
| **occurred_at** | TIMESTAMPTZ | NOT NULL | Thời điểm thực tế |
| **occurred_date** | DATE | NOT NULL | **Ngày local, trigger luôn tính lại** |
| note | TEXT | NULL | Ghi chú người dùng |
| description_raw | TEXT | NULL | Nguồn chính của AI 1 |
| source | transaction_source_enum | NOT NULL, DEFAULT 'MANUAL' | MANUAL/OCR/RECURRING/IMPORT/BANK_SYNC/AI_SUGGESTED |
| is_excluded_from_report | BOOLEAN | NOT NULL, DEFAULT false | Loại khỏi báo cáo |
| location | JSONB | NULL | {lat, lng, place} |
| category_source | VARCHAR(20) | NULL, CHECK | USER/AI/RULE/MERCHANT_DEFAULT - Ai gán nhãn |
| category_status | category_status_enum | NOT NULL, DEFAULT 'CONFIRMED' | CONFIRMED/AI_APPLIED/NEEDS_REVIEW/UNCATEGORIZED |
| ai_confidence | confidence | NULL | Độ tin cậy AI |
| external_id | VARCHAR(191) | NULL, UNIQUE partial | Chống trùng đồng bộ ngân hàng |
| client_uuid | UUID | NULL, UNIQUE partial | Mobile sinh khi offline |
| sync_seq | BIGINT | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Ràng buộc CHECK:**
- `ck_tx_transfer_shape`: TRANSFER ⇒ có to_account_id khác account_id, không category_id; không TRANSFER ⇒ không to_account_id/to_amount
- `ck_tx_category_required`: Thu/chi phải có category_id

**Luồng gán nhãn AI 1 (v2):**
- Chưa phân loại → UNCATEGORIZED với category_status='UNCATEGORIZED'
- AI đề xuất < ngưỡng → NEEDS_REVIEW
- AI tự áp → AI_APPLIED
- Người dùng xác nhận/sửa → CONFIRMED

**Triggers:** Xem chi tiết tại `03-quy-tac-nghiep-vu.md` - Quy Tắc Giao Dịch

---

### core.transaction_tags (Nối Giao Dịch ↔ Nhãn)

**Mô tả:** Bảng nhiều-nhiều

| Cột | Kiểu | Ràng buộc |
|-----|------|-----------|
| transaction_id | UUID | PK, FK CASCADE → transactions |
| tag_id | UUID | PK, FK CASCADE → tags |

**Index:** (tag_id) để tra ngược

---

### core.attachments (File Đính Kèm)

**Mô tả:** Ảnh/file đính kèm giao dịch

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| transaction_id | UUID | NOT NULL, FK CASCADE → transactions | |
| storage_key | TEXT | NOT NULL | Khóa S3 |
| file_name | VARCHAR(255) | NULL | Tên file gốc |
| mime_type | VARCHAR(100) | NULL | Loại file |
| file_size_bytes | INTEGER | NULL, CHECK ≤ 10485760 | Tối đa 10MB |
| uploaded_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

**Còn tiếp...**


## Nhóm Ngân Sách

### core.budgets (Ngân Sách)

**Mô tả:** Ngân sách theo danh mục/nhóm danh mục

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK → users | Chủ sở hữu |
| group_id | UUID | NULL, FK → groups | Ngân sách nhóm |
| category_id | UUID | NULL, FK → categories | Danh mục cụ thể |
| amount | DECIMAL(15,2) | NOT NULL, CHECK > 0 | Số tiền ngân sách |
| currency_code | CHAR(3) | NOT NULL, FK → currencies | Tiền tệ |
| period_type | period_type | NOT NULL | MONTHLY, QUARTERLY, YEARLY, CUSTOM |
| start_date | DATE | NOT NULL | Ngày bắt đầu chu kỳ |
| end_date | DATE | NOT NULL, CHECK ≥ start_date | Ngày kết thúc |
| rollover_enabled | BOOLEAN | NOT NULL, DEFAULT false | Chuyển tiền dư sang kỳ sau |
| alert_threshold_pct | DECIMAL(5,2) | NULL, CHECK 0-100 | % cảnh báo |
| **sync_seq** | BIGINT | NULL | Phiên đồng bộ |
| **created_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **updated_at** | TIMESTAMPTZ | NOT NULL | Cột chuẩn |
| **deleted_at** | TIMESTAMPTZ | NULL | Cột chuẩn |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Cột chuẩn |

**Index:**
- `idx_budgets_user_period` (user_id, start_date, end_date)
- `idx_budgets_category` (category_id)

**Ràng buộc:**
- CHECK: category_id NULL → ngân sách tổng
- Trigger tính chi tiêu thực tế: xem `03-quy-tac-nghiep-vu.md`

---

### core.budget_period_stats (Thống Kê Ngân Sách)

**Mô tả:** Snapshot chi tiêu theo chu kỳ

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| budget_id | UUID | NOT NULL, FK CASCADE → budgets | |
| period_start | DATE | NOT NULL | |
| period_end | DATE | NOT NULL | |
| spent_amount | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Đã chi |
| projected_amount | DECIMAL(15,2) | NULL | AI dự báo |
| last_calculated_at | TIMESTAMPTZ | NOT NULL | |

**Index:** (budget_id, period_start)

---

## Nhóm Mục Tiêu

### core.goals (Mục Tiêu Tài Chính)

**Mô tả:** Mục tiêu tiết kiệm/mua sắm

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK → users | |
| group_id | UUID | NULL, FK → groups | |
| name | VARCHAR(255) | NOT NULL | Tên mục tiêu |
| goal_type | goal_type | NOT NULL | SAVINGS, DEBT_PAYOFF, PURCHASE, INVESTMENT, CUSTOM |
| target_amount | DECIMAL(15,2) | NOT NULL, CHECK > 0 | Số tiền mục tiêu |
| current_amount | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Đã đạt |
| currency_code | CHAR(3) | NOT NULL, FK → currencies | |
| target_date | DATE | NULL | Ngày hoàn thành dự kiến |
| status | goal_status | NOT NULL, DEFAULT 'IN_PROGRESS' | IN_PROGRESS, COMPLETED, PAUSED, CANCELLED |
| priority | goal_priority | NOT NULL, DEFAULT 'MEDIUM' | LOW, MEDIUM, HIGH |
| auto_save_enabled | BOOLEAN | NOT NULL, DEFAULT false | Tự động tiết kiệm |
| auto_save_amount | DECIMAL(15,2) | NULL | Số tiền tự động |
| auto_save_frequency | frequency_type | NULL | DAILY, WEEKLY, MONTHLY |
| linked_account_id | UUID | NULL, FK → accounts | Tài khoản gắn liền |
| description | TEXT | NULL | |
| **sync_seq** | BIGINT | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | |
| **updated_at** | TIMESTAMPTZ | NOT NULL | |
| **deleted_at** | TIMESTAMPTZ | NULL | |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | |

**Index:**
- `idx_goals_user_status` (user_id, status)
- `idx_goals_target_date` (target_date) WHERE status = 'IN_PROGRESS'

---

### core.goal_milestones (Mốc Mục Tiêu)

**Mô tả:** Các mốc con trong mục tiêu

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| goal_id | UUID | NOT NULL, FK CASCADE → goals | |
| name | VARCHAR(255) | NOT NULL | |
| target_amount | DECIMAL(15,2) | NOT NULL | |
| target_date | DATE | NULL | |
| is_achieved | BOOLEAN | NOT NULL, DEFAULT false | |
| achieved_at | TIMESTAMPTZ | NULL | |

**Index:** (goal_id, target_date)

---

### core.goal_contributions (Đóng Góp Mục Tiêu)

**Mô tả:** Lịch sử đóng góp vào mục tiêu

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| goal_id | UUID | NOT NULL, FK CASCADE → goals | |
| transaction_id | UUID | NULL, FK → transactions | Giao dịch nguồn |
| amount | DECIMAL(15,2) | NOT NULL | Số tiền đóng góp |
| contribution_date | DATE | NOT NULL | |
| note | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Index:** (goal_id, contribution_date)

---

## Nhóm Lịch & Nhắc Nhở

### core.recurring_transactions (Giao Dịch Định Kỳ)

**Mô tả:** Template cho giao dịch lặp lại

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK → users | |
| template_name | VARCHAR(255) | NOT NULL | |
| transaction_type | transaction_type | NOT NULL | |
| account_id | UUID | NOT NULL, FK → accounts | |
| to_account_id | UUID | NULL, FK → accounts | Cho TRANSFER |
| category_id | UUID | NULL, FK → categories | |
| merchant_id | UUID | NULL, FK → merchants | |
| amount | DECIMAL(15,2) | NOT NULL | |
| currency_code | CHAR(3) | NOT NULL, FK → currencies | |
| description | TEXT | NULL | |
| frequency | frequency_type | NOT NULL | DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY |
| frequency_interval | SMALLINT | NOT NULL, DEFAULT 1, CHECK > 0 | Mỗi X đơn vị |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NULL | NULL = vô thời hạn |
| next_occurrence | DATE | NOT NULL | Lần tiếp theo |
| auto_create | BOOLEAN | NOT NULL, DEFAULT false | Tự động tạo giao dịch |
| status | recur_status | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, PAUSED, COMPLETED, CANCELLED |
| **sync_seq** | BIGINT | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | |
| **updated_at** | TIMESTAMPTZ | NOT NULL | |
| **deleted_at** | TIMESTAMPTZ | NULL | |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | |

**Index:**
- `idx_recurring_next_occurrence` (next_occurrence) WHERE status = 'ACTIVE'
- `idx_recurring_user` (user_id, status)

---

### core.reminders (Nhắc Nhở)

**Mô tả:** Nhắc nhở thanh toán, mục tiêu, ngân sách

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK → users | |
| reminder_type | reminder_type | NOT NULL | BILL_DUE, GOAL_DEADLINE, BUDGET_ALERT, DEBT_PAYMENT, CUSTOM |
| related_entity_type | VARCHAR(50) | NULL | goals, debts, recurring_transactions |
| related_entity_id | UUID | NULL | ID của entity liên quan |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NULL | |
| remind_at | TIMESTAMPTZ | NOT NULL | Thời điểm nhắc |
| is_sent | BOOLEAN | NOT NULL, DEFAULT false | |
| sent_at | TIMESTAMPTZ | NULL | |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | |
| read_at | TIMESTAMPTZ | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | |
| **updated_at** | TIMESTAMPTZ | NOT NULL | |

**Index:**
- `idx_reminders_user_remind_at` (user_id, remind_at) WHERE NOT is_sent
- `idx_reminders_entity` (related_entity_type, related_entity_id)

---

## Nhóm Khoản Nợ

### core.debts (Khoản Nợ / Cho Vay)

**Mô tả:** Quản lý nợ phải trả hoặc cho vay

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK → users | |
| debt_type | debt_type | NOT NULL | OWED_BY_ME (nợ phải trả), OWED_TO_ME (cho vay) |
| counterparty_name | VARCHAR(255) | NOT NULL | Tên người/tổ chức |
| principal_amount | DECIMAL(15,2) | NOT NULL, CHECK > 0 | Số tiền gốc |
| remaining_amount | DECIMAL(15,2) | NOT NULL | Còn lại |
| currency_code | CHAR(3) | NOT NULL, FK → currencies | |
| interest_rate | DECIMAL(5,2) | NULL, CHECK ≥ 0 | % lãi suất/năm |
| start_date | DATE | NOT NULL | Ngày vay/cho vay |
| due_date | DATE | NULL | Ngày đến hạn |
| status | debt_status | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, PAID_OFF, OVERDUE, SETTLED |
| linked_account_id | UUID | NULL, FK → accounts | Tài khoản thanh toán |
| description | TEXT | NULL | |
| **sync_seq** | BIGINT | NULL | |
| **created_at** | TIMESTAMPTZ | NOT NULL | |
| **updated_at** | TIMESTAMPTZ | NOT NULL | |
| **deleted_at** | TIMESTAMPTZ | NULL | |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | |

**Index:**
- `idx_debts_user_status` (user_id, status)
- `idx_debts_due_date` (due_date) WHERE status IN ('ACTIVE', 'OVERDUE')

---

### core.debt_payments (Thanh Toán Nợ)

**Mô tả:** Lịch sử thanh toán nợ

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| debt_id | UUID | NOT NULL, FK CASCADE → debts | |
| transaction_id | UUID | NULL, FK → transactions | Giao dịch thanh toán |
| payment_amount | DECIMAL(15,2) | NOT NULL, CHECK > 0 | Số tiền thanh toán |
| principal_amount | DECIMAL(15,2) | NOT NULL | Phần gốc |
| interest_amount | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Phần lãi |
| payment_date | DATE | NOT NULL | |
| note | TEXT | NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Index:** (debt_id, payment_date)

**Trigger:** Cập nhật remaining_amount trong debts

---

## Bảng Tổng Hợp

### Thống Kê Core Schema

| Nhóm | Số bảng | Mô tả |
|------|---------|-------|
| Tham chiếu | 3 | currencies, exchange_rates, banks |
| Định danh & Bảo mật | 7 | users, profiles, settings, tokens, oauth, refresh, mfa |
| Chia sẻ nhóm | 4 | groups, members, invitations, shared_resources |
| Tài khoản & Tài sản | 4 | accounts, balance_snapshots, assets, valuations |
| Danh mục | 3 | categories, merchants, tags |
| Giao dịch | 4 | receipts, receipt_items, transactions ⭐, transaction_tags, attachments |
| Ngân sách | 2 | budgets, budget_period_stats |
| Mục tiêu | 3 | goals, goal_milestones, goal_contributions |
| Lịch & Nhắc nhở | 2 | recurring_transactions, reminders |
| Khoản nợ | 2 | debts, debt_payments |
| **Tổng cộng** | **36** | |

---

## Liên Kết

- ← [03. Quy Tắc Nghiệp Vụ](03-quy-tac-nghiep-vu.md)
- → [06. Schema AI Chi Tiết](06-schema-ai-chi-tiet.md)
- → [07. Schema OPS Chi Tiết](07-schema-ops-chi-tiet.md)
- → [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md)
