# Đặc Tả Cơ Sở Dữ Liệu - Tổng Quan

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI (PFM-AI)  
**Phiên bản:** 2.1  
**DBMS:** PostgreSQL 16+  
**Trạng thái:** ✅ Đã kiểm chứng (109/109 ca kiểm thử đạt)

---

## 📋 Mục Lục

1. [Phạm Vi và Mục Tiêu](#phạm-vi-và-mục-tiêu)
2. [Nguyên Tắc Thiết Kế](#nguyên-tắc-thiết-kế)
3. [Kiến Trúc Tổng Thể](#kiến-trúc-tổng-thể)
4. [Tổ Chức Schema](#tổ-chức-schema)
5. [Thống Kê Chính](#thống-kê-chính)
6. [Tài Liệu Liên Quan](#tài-liệu-liên-quan)

---

## Phạm Vi và Mục Tiêu

### Phạm Vi Bao Phủ

Tài liệu này mô tả toàn bộ mô hình dữ liệu vật lý của hệ thống PFM-AI:

**Dữ liệu nghiệp vụ lõi:**
- Người dùng, ví/tài khoản, giao dịch, ngân sách, mục tiêu
- Lịch định kỳ, nhắc nhở, khoản nợ, tài sản
- Chia sẻ và cộng tác nhóm

**Dữ liệu AI/ML:**
- Kết quả OCR, phân loại giao dịch tự động
- Hồ sơ hành vi, phân tích chi tiêu
- Dự báo, phát hiện bất thường
- Hội thoại chatbot, cơ sở tri thức RAG

**Dữ liệu vận hành:**
- Thông báo, nhật ký kiểm toán, sự kiện outbox
- Job xuất báo cáo, sao lưu, tombstone đồng bộ

**Ngoài phạm vi:**
- File nhị phân (ảnh, PDF) → lưu trên S3/MinIO
- Cache Redis
- Chỉ mục tìm kiếm bên ngoài

### Mục Tiêu Chất Lượng

| Mục tiêu | Giải pháp |
|----------|-----------|
| **Chính xác tuyệt đối về tiền** | NUMERIC(19,4), không dùng FLOAT; tổng hợp tại tầng CSDL |
| **Cách ly dữ liệu giữa người dùng** | Cột user_id + Row Level Security (RLS) trên 46/61 bảng |
| **Báo cáo nhanh** | Chỉ mục phức hợp partial, bảng monthly_summaries, cột denormalize có đối chiếu |
| **Ngày đúng theo múi giờ** | transactions.occurred_date (ngày local) - nguồn duy nhất cho báo cáo/ngân sách |
| **Đồng bộ hai chiều web/mobile** | sync_seq theo user, version, soft delete, sync_tombstones |
| **AI không phá dữ liệu gốc** | Tách schema ai; AI chỉ ghi hẹp theo cột vào core |
| **Truy vết, hoàn tác** | audit_logs (append-only), soft delete |
| **Đa tiền tệ nhất quán** | Một ví một tiền tệ; giao dịch cùng tiền tệ ví; quy đổi về base_currency |

---

## Nguyên Tắc Thiết Kế

### 2.1 Quy Ước Đặt Tên

| Đối tượng | Quy ước | Ví dụ |
|-----------|---------|-------|
| Schema | snake_case, số ít | core, ai, ops |
| Bảng | snake_case, số nhiều, không tiền tố schema | transactions, forecasts |
| Cột | snake_case, số ít | occurred_at, category_id |
| Khóa chính | id | id UUID |
| Khóa ngoại | <bảng_số_ít>_id | account_id |
| Boolean | tiền tố is_/has_ | is_active |
| Thời điểm | hậu tố _at, TIMESTAMPTZ | created_at |
| Ngày không giờ | hậu tố _date, DATE | occurred_date |
| Ràng buộc | pk_/fk_/uq_/ck_/ix_ + <bảng>_<cột> | uq_users_email |
| Kiểu ENUM | <ý_nghĩa>_enum | transaction_type_enum |
| View | tiền tố v_ | v_account_balances |
| Hàm/Trigger | fn_<mục_đích> / trg_<mục_đích> | fn_touch |

### 2.2 Tiêu Chuẩn Kiểu Dữ Liệu

| Loại | Kiểu CSDL | Ghi chú |
|------|-----------|---------|
| Khóa chính | UUID (UUIDv7 từ app; fallback gen_random_uuid()) | Tăng theo thời gian → giảm phân mảnh B-tree |
| Số tiền | NUMERIC(19,4) (domain core.money*) | Không bao giờ dùng FLOAT |
| Phần trăm | NUMERIC(5,2) (domain core.percentage) | 0–100 |
| Độ tin cậy | NUMERIC(5,4) (domain core.confidence) | 0–1 |
| Thời điểm | TIMESTAMPTZ | Lưu UTC; hiển thị theo users.timezone |
| Ngày nghiệp vụ | DATE | Ngày local của người dùng |
| Mã tiền tệ | CHAR(3) (domain core.currency_code) | ISO 4217 |
| Bán cấu trúc | JSONB | Luôn có mô tả cấu trúc trong tài liệu |
| Vector nhúng | vector(768) | Đổi chiều phải migrate lại |

### 2.3 Cột Chuẩn Kiểm Toán

14 bảng nghiệp vụ trong core có các cột sau:

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|-----|------|-----------|---------|
| created_at | TIMESTAMPTZ | NOT NULL, mặc định now() | Thời điểm tạo |
| updated_at | TIMESTAMPTZ | NOT NULL, mặc định now() | Thời điểm sửa gần nhất (trigger tự đặt) |
| deleted_at | TIMESTAMPTZ | NULL | Xóa mềm: có giá trị = đã xóa |
| version | BIGINT | NOT NULL, mặc định 0 | Khóa lạc quan: +1 sau mỗi lần sửa |

**Hành vi chính:**

- `updated_at` và `version` tự động cập nhật bởi trigger `trg_touch` (hàm fn_touch)
- Cột dẫn xuất không làm tăng version (được bảo vệ bởi cờ skip_touch)
- Cột dẫn xuất không bị client ghi đè (trg_a_protect_derived)
- `deleted_at IS NULL` là điều kiện mặc định của truy vấn nghiệp vụ (dùng partial index)

### 2.4 Mức Chuẩn Hóa và Cột Dẫn Xuất

Mô hình đạt 3NF. Các cột dẫn xuất có chủ đích (đều do trigger duy trì, được bảo vệ khỏi ghi đè, và được ops.fn_reconcile() đối chiếu):

| Cột | Nguồn Sự Thật | Duy Trì Bởi | Đối Chiếu |
|-----|---------------|-------------|-----------|
| accounts.current_balance | initial_balance + giao dịch | trg_account_init, trg_tx_balance_* qua fn_apply_balance | ACCOUNT_BALANCE |
| budgets.spent_amount | Tổng chi của kỳ (mọi danh mục) | trg_tx_after_*, trg_budget_refresh | BUDGET_SPENT |
| budget_items.spent_amount | Chi theo danh mục (cha gồm cả con) | trg_tx_after_*, trg_budget_item_init, trg_budget_refresh | BUDGET_ITEM_SPENT |
| budget_items.alert_level | Suy từ spent/limit/ngưỡng | trg_budget_item_level | không cần (suy ra) |
| goals.current_amount | goal_contributions | trg_goal_progress | GOAL_PROGRESS |
| goals.status (ACHIEVED) | current so với target | trg_goal_status | không cần (suy ra) |
| debts.paid_amount | debt_payments | trg_debt_progress | DEBT_PAID |
| assets.current_value | Định giá mới nhất | trg_asset_current_value | ASSET_VALUE |

### 2.5 Quy Ước Tiền Tệ

1. **Một ví – một tiền tệ** (accounts.currency_code)
2. **transactions.currency_code phải bằng tiền tệ ví nguồn** (trigger kiểm)
   - `amount` và `fee_amount` tính theo tiền tệ này
   - `to_amount` (chỉ chuyển khoản) tính theo tiền tệ ví đích
   - Bắt buộc khi hai ví khác tiền tệ
3. **base_amount, base_fee**: quy đổi sang users.base_currency theo tỷ giá ngày giao dịch (occurred_date)
   - Thiếu tỷ giá đúng ngày → dùng gần nhất trước đó (chấp nhận nghịch đảo: có VND→EUR thì dùng được EUR→VND)
   - Đặt `is_rate_estimated = true`
   - Không có tỷ giá nào → **từ chối ghi**
4. **Ngân sách và báo cáo luôn tính bằng tiền tệ gốc** (base_amount + base_fee)

### 2.6 Quy Ước Ngày/Múi Giờ

- Trigger `fn_tx_prepare` gán `occurred_date := (occurred_at AT TIME ZONE users.timezone)::date`
- Mọi view, index, ngân sách, tổng hợp dùng `occurred_date`, không cast `occurred_at::date` (phụ thuộc múi giờ phiên)
- Khi người dùng đổi timezone, ngày của giao dịch cũ không tự đổi (giữ tính bất biến báo cáo đã xem)

---

## Kiến Trúc Tổng Thể

### 3.1 Phân Chia Schema

Một database `pfm_db`, ba schema:

```
pfm_db
├── core   -- dữ liệu nghiệp vụ (Spring Boot sở hữu)
├── ai     -- dữ liệu AI (FastAPI sở hữu)
└── ops    -- vận hành: thông báo, audit, outbox, export, backup, sync
```

**Tại sao không tách hai database?** AI cần JOIN trực tiếp lịch sử giao dịch để sinh đặc trưng.

### 3.2 Vai Trò CSDL và Quyền Hạn

| Vai trò | Dùng cho | Thuộc tính | Quyền chính |
|---------|----------|------------|-------------|
| **pfm_owner** | Chủ mọi đối tượng, chạy migration | LOGIN, BYPASSRLS | Toàn quyền trên đối tượng của mình. Không dùng cho ứng dụng |
| **svc_backend** | Spring Boot (request người dùng) | LOGIN, chịu RLS | DML trên core, ops; SELECT ai; ghi hẹp ai.user_rules, classification_feedback, chat_sessions/messages; INSERT chat_tool_calls, inference_requests; UPDATE một số cột anomalies, recommendations, spending_insights |
| **svc_ai** | FastAPI (theo lô, nhiều người dùng) | LOGIN, BYPASSRLS | Toàn quyền ai; SELECT hẹp trên core (không có password/token); UPDATE theo cột transactions(category_id, category_source, category_status, ai_confidence, merchant_id) và receipts(ocr_*, merchant_*, total_amount...); DML receipt_items; INSERT ops.notifications |
| **svc_job** | Job nền (đối chiếu, tổng hợp, dọn dẹp) | LOGIN, BYPASSRLS | Như svc_backend + DML toàn ai; EXECUTE ops.fn_reconcile |
| **svc_report** | Công cụ BI chỉ đọc | LOGIN, BYPASSRLS | SELECT transactions, monthly_summaries, categories, v_daily_cashflow |

**Tại sao svc_ai, svc_job, svc_report có BYPASSRLS:**  
Chúng xử lý hàng loạt nhiều người dùng, không có app.current_user_id; nếu chịu RLS sẽ đọc được 0 dòng. Đổi lại, quyền của chúng được giới hạn bằng GRANT theo bảng/cột. Nếu bị chiếm quyền thì lộ dữ liệu mọi người dùng (xem rủi ro R6).

**Hàm SECURITY DEFINER (21/35 hàm):**  
Các hàm bảo trì dữ liệu dẫn xuất chạy trong trigger và tra cứu. Chúng thuộc pfm_owner (BYPASSRLS) nên kết quả không phụ thuộc quyền người gọi. Điều kiện bắt buộc: khi người dùng B (EDITOR) ghi vào ví của A, câu UPDATE accounts trong trigger bị RLS lọc im lặng (0 dòng) nên số dư ví A không đổi nếu không dùng DEFINER. Mọi hàm DEFINER đặt search_path cố định chống chiếm quyền.

### 3.3 Sơ Đồ Khối Module

```
core
 ├─ Định danh & bảo mật: users, user_profiles, user_settings, user_sync_state,
 │                       auth_tokens, oauth_accounts, refresh_tokens, mfa_credentials
 ├─ Tham chiếu: currencies, exchange_rates, banks
 ├─ Tài khoản & tài sản: accounts, account_balance_snapshots, assets, asset_valuations
 ├─ Danh mục: categories, merchants, tags
 ├─ Giao dịch: transactions, transaction_tags, attachments, receipts, receipt_items
 ├─ Ngân sách: budgets, budget_items
 ├─ Mục tiêu: goals, goal_contributions
 ├─ Lịch & nhắc nhở: schedules, schedule_occurrences
 ├─ Nợ: debts, debt_payments
 ├─ Chia sẻ: groups, group_members, group_invitations, shared_resources
 └─ Tổng hợp: monthly_summaries

ai
 ├─ Chung: model_registry, inference_requests
 ├─ AI1: category_predictions, classification_feedback, user_rules
 ├─ AI2/5: behavior_profiles, spending_insights, peer_benchmarks, recommendations
 ├─ AI3: forecasts, forecast_points
 ├─ AI4: anomalies
 └─ AI6: chat_sessions, chat_messages, chat_tool_calls, knowledge_documents, knowledge_chunks

ops
 └─ notifications, device_tokens, audit_logs, outbox_events, export_jobs,
    backup_jobs, sync_tombstones, reconciliation_logs
```

---

## Tổ Chức Schema

### 4.1 Schema Core (36 bảng)

| STT | Bảng | Mô tả | Dòng/người dùng/năm |
|-----|------|-------|---------------------|
| 1-3 | currencies, exchange_rates, banks | Dữ liệu tham chiếu | Toàn hệ thống |
| 4-12 | users, profiles, settings, sync_state, auth_tokens, oauth_accounts, refresh_tokens, mfa_credentials, groups | Định danh & nhóm | 1 + vài |
| 13-16 | group_members, group_invitations, shared_resources | Cộng tác | ~10 |
| 17-19 | accounts, account_balance_snapshots, assets, asset_valuations | Tài khoản tài chính | 3-10 ví |
| 20-22 | categories, merchants, tags | Phân loại | ~60 + tùy biến |
| 23-27 | receipts, receipt_items, transactions, transaction_tags, attachments | **Lõi: Giao dịch** | 1.000-3.000 |
| 28-29 | budgets, budget_items | Quản lý ngân sách | 12-48 |
| 30-31 | goals, goal_contributions | Mục tiêu tài chính | 1-10 |
| 32-33 | schedules, schedule_occurrences | Định kỳ & nhắc nhở | ~25 |
| 34-35 | debts, debt_payments | Theo dõi nợ | 0-10 |
| 36 | monthly_summaries | Tổng hợp tiền tính | 12 × danh mục |

### 4.2 Schema AI (17 bảng)

| STT | Bảng | Chức năng AI |
|-----|------|--------------|
| 1-2 | model_registry, inference_requests | Registry và log chung |
| 3-5 | category_predictions, classification_feedback, user_rules | AI1 - Tự phân loại |
| 6-8 | behavior_profiles, spending_insights, peer_benchmarks | AI2/5 - Phân tích hành vi & khuyến nghị |
| 9-10 | forecasts, forecast_points | AI3 - Dự báo tài chính |
| 11 | anomalies | AI4 - Phát hiện bất thường |
| 12-15 | chat_sessions, chat_messages, chat_tool_calls | AI6 - Chatbot |
| 16-17 | knowledge_documents, knowledge_chunks | AI6 - Cơ sở tri thức RAG |

**Lưu ý:** OCR không còn bảng riêng; trạng thái OCR giờ nằm trên `core.receipts` (một nguồn sự thật).

### 4.3 Schema Ops (8 bảng)

- `notifications`, `device_tokens`
- `audit_logs` (phân vùng tháng; bao gồm nhật ký đăng nhập)
- `outbox_events`, `export_jobs`, `backup_jobs`
- `sync_tombstones`, `reconciliation_logs`

---

## Thống Kê Chính

| Chỉ số | Giá trị |
|--------|---------|
| **Bảng** | 61 (36 core, 17 ai, 8 ops) |
| **Cột** | 711 tổng |
| **ENUM / DOMAIN** | 21 / 7 |
| **View / Materialized View** | 5 / 0 |
| **Hàm** | 35 (21 SECURITY DEFINER; 18 hàm trigger) |
| **Trigger** | 57 trigger gắn (21 tên trigger riêng biệt) |
| **Khóa ngoại** | 114 |
| **Ràng buộc CHECK / EXCLUDE** | 59 / 1 |
| **Chỉ mục** | 133 (gồm PK và UNIQUE) |
| **Bảng bật RLS** | 46 / 61 |
| **Bảng không RLS** | 15 (có lý do được ghi chép) |
| **Bảng có version** | 14 |
| **Bảng có sync_seq** | 10 |
| **Ca kiểm thử tự động** | 109 PASS / 109 tổng ✅ |
| **Dung lượng ước tính** | ~1,2 GB cho 1.000 người dùng/năm |

---

## Tài Liệu Liên Quan

```
backend/docs/
├── 01-system-overview.md           ← Kiến trúc hệ thống & tính năng
├── 02-tong-quan-co-so-du-lieu.md   ← File này
├── 03-quy-tac-nghiep-vu.md         ← Quy tắc và ràng buộc nghiệp vụ
├── 04-schema-core.md               ← Chi tiết schema core
├── 05-schema-ai.md                 ← Chi tiết schema AI
├── 06-schema-ops.md                ← Chi tiết schema ops
├── 07-quan-he-du-lieu.md           ← ERD & tham chiếu khóa ngoại
├── 08-bao-mat-du-lieu.md           ← RLS policies & mô hình bảo mật
└── 09-chien-luoc-dong-bo.md        ← Cơ chế đồng bộ offline-first
```

---

## Trạng Thái Kiểm Chứng

✅ **Đặc tả này mô tả chính xác những gì đã được kiểm thử:**

- Thiết kế được xây dựng trên PostgreSQL 16.15
- Schema thuộc role không phải superuser
- **109/109 ca kiểm thử tự động đạt**
- Mục 4 (quan hệ), Phụ lục A (thống kê), Phụ lục F (từ điển dữ liệu), Phụ lục G (danh mục hàm) được trích trực tiếp từ CSDL đang chạy
- Quá trình đã phát hiện và sửa 17 lỗi của bản 2.0

**Chưa kiểm chứng:** Hiệu năng trên dữ liệu lớn, tích hợp JPA/ORM thực tế, vận hành phân vùng tự động.

---

**Tiếp theo:** Xem `03-quy-tac-nghiep-vu.md` để hiểu chi tiết các quy tắc nghiệp vụ và ràng buộc.
