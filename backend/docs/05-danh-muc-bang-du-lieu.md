# Danh Mục Bảng Dữ Liệu Đầy Đủ

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026

---

## 📋 Tổng Quan

Tài liệu này liệt kê **tất cả 72 bảng** trong hệ thống với mô tả ngắn gọn và ước lượng dữ liệu.

**Cập nhật mới:** Thêm 11 bảng Groups Module mở rộng (family mode, travel mode, child wallets)

---

## Schema CORE (47 bảng)

### Nhóm Tham Chiếu (3 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 1 | **currencies** | Tiền tệ ISO 4217 | ~180 toàn hệ thống |
| 2 | **exchange_rates** | Tỷ giá theo ngày | ~365 × số cặp tiền tệ |
| 3 | **banks** | Ngân hàng / ví điện tử | ~100 toàn hệ thống |

### Nhóm Định Danh & Bảo Mật (9 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 4 | **users** | Tài khoản đăng nhập | 1 người dùng |
| 5 | **user_profiles** | Hồ sơ mở rộng | 1 |
| 6 | **user_settings** | Cấu hình cá nhân | 1 |
| 7 | **user_sync_state** | Bộ đếm đồng bộ | 1 |
| 8 | **auth_tokens** | Token xác thực email/reset password | ~5 |
| 9 | **oauth_accounts** | Liên kết Google/Apple/Facebook | 0-2 |
| 10 | **refresh_tokens** | JWT refresh token | 5-30 |
| 11 | **mfa_credentials** | TOTP + mã dự phòng 2FA | 0-1 |
| 12 | **groups** | Nhóm/gia đình | 0-3 |

### Nhóm Chia Sẻ (3 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 13 | **group_members** | Thành viên nhóm | ~10 |
| 14 | **group_invitations** | Lời mời tham gia | ~10 |
| 15 | **shared_resources** | Ví/ngân sách/mục tiêu được chia sẻ | ~10 |

### Nhóm Groups Module Mở Rộng (11 bảng) ⭐ MỚI

| STT | Bảng | Mô Tả | Dữ Liệu/năm |
|-----|------|-------|-------------|
| 16 | **group_expenses** | Chi phí nhóm (family/travel mode) | ~200 |
| 17 | **group_expense_splits** | Phân chia chi phí (EQUAL/PERCENTAGE/EXACT/SHARES) | ~600 |
| 18 | **group_settlements** | Thanh toán công nợ trong nhóm | ~50 |
| 19 | **transaction_comments** | Comment trên giao dịch/chi phí (polymorphic) | ~300 |
| 20 | **group_activities** | Lịch sử hoạt động nhóm (audit trail) | ~500 |
| 21 | **group_messages** | Chat nhóm (TEXT/IMAGE/EXPENSE_CARD/SYSTEM) | ~1.000 |
| 22 | **group_message_attachments** | File đính kèm tin nhắn | ~200 |
| 23 | **group_message_reads** | Trạng thái đã đọc tin nhắn | ~3.000 |
| 24 | **child_wallets** | Ví con cho trẻ em (3 privacy levels) | ~2/nhóm |
| 25 | **child_spend_requests** | Yêu cầu chi tiêu của trẻ | ~50 |
| 26 | **child_chores** | Việc nhà gamification | ~100 |

### Nhóm Tài Khoản & Tài Sản (4 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu/năm |
|-----|------|-------|-------------|
| 27 | **accounts** | Ví/tài khoản/thẻ | 3-10 |
| 28 | **account_balance_snapshots** | Chốt số dư cuối ngày | ~365 × số ví |
| 29 | **assets** | Tài sản (vàng, BĐS, xe...) | 0-20 |
| 30 | **asset_valuations** | Lịch sử định giá tài sản | ~50 |

### Nhóm Danh Mục (3 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 31 | **categories** | Danh mục thu/chi 2 cấp | ~45 hệ thống + ~15 tùy biến |
| 32 | **merchants** | Cửa hàng/đơn vị bán hàng | ~200 dùng chung |
| 33 | **tags** | Nhãn tùy chỉnh | ~20 |

### Nhóm Giao Dịch (5 bảng) ⭐

| STT | Bảng | Mô Tả | Dữ Liệu/năm |
|-----|------|-------|-------------|
| 34 | **receipts** | Hóa đơn OCR + trạng thái OCR | ~200 |
| 35 | **receipt_items** | Dòng hàng hóa đơn | ~1.000 |
| 36 | **transactions** | **BẢNG TRUNG TÂM** - Thu/chi/chuyển khoản | **1.000-3.000** |
| 37 | **transaction_tags** | Nối giao dịch ↔ nhãn | ~500 |
| 38 | **attachments** | File đính kèm giao dịch | ~200 |

### Nhóm Ngân Sách (2 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu/năm |
|-----|------|-------|-------------|
| 39 | **budgets** | Kỳ ngân sách (tháng/quý/năm) | 12-48 |
| 40 | **budget_items** | Hạn mức theo danh mục | ~120 |

### Nhóm Mục Tiêu (2 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 41 | **goals** | Mục tiêu tài chính | 1-10 |
| 42 | **goal_contributions** | Lần nạp tiền vào mục tiêu | ~100/năm |

### Nhóm Lịch & Nhắc Nhở (2 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 43 | **schedules** | Lịch định kỳ + nhắc nhở (gộp reminders) | ~25 |
| 44 | **schedule_occurrences** | Từng lần đến hạn | ~250/năm |

### Nhóm Khoản Nợ (2 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 45 | **debts** | Khoản nợ vay/cho vay | 0-10 |
| 46 | **debt_payments** | Kỳ trả nợ | ~60/năm |

### Tổng Hợp (1 bảng)

| STT | Bảng | Mô Tả | Dữ Liệu |
|-----|------|-------|---------|
| 47 | **monthly_summaries** | Tổng hợp theo "tháng tài chính" | 12 × (1 + số danh mục)/năm |

---

## Schema AI (17 bảng)

### Chung (2 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 1 | **model_registry** | Đăng ký phiên bản mô hình AI |
| 2 | **inference_requests** | Nhật ký suy luận (phân vùng tháng, giữ 6 tháng) |

### AI 1: Tự Động Phân Loại (3 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 3 | **category_predictions** | Dự đoán danh mục cho giao dịch |
| 4 | **classification_feedback** | Phản hồi người dùng để huấn luyện lại |
| 5 | **user_rules** | Quy tắc phân loại cá nhân |

### AI 2/5: Phân Tích Hành Vi & Khuyến Nghị (4 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 6 | **behavior_profiles** | Hồ sơ hành vi chi tiêu |
| 7 | **spending_insights** | Nhận xét về chi tiêu |
| 8 | **peer_benchmarks** | So sánh với nhóm (k-anonymity ≥ 20) |
| 9 | **recommendations** | Khuyến nghị tài chính cá nhân |

### AI 3: Dự Báo (2 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 10 | **forecasts** | Phiên dự báo (số dư, chi tiêu, mục tiêu) |
| 11 | **forecast_points** | Chuỗi điểm dự báo |

### AI 4: Phát Hiện Bất Thường (1 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 12 | **anomalies** | Giao dịch bất thường |

### AI 6: Trợ Lý Chatbot (4 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 13 | **chat_sessions** | Phiên hội thoại |
| 14 | **chat_messages** | Tin nhắn trong phiên |
| 15 | **chat_tool_calls** | Lời gọi công cụ của chatbot |
| 16 | **knowledge_documents** | Tài liệu RAG |
| 17 | **knowledge_chunks** | Đoạn văn + vector nhúng (768 chiều) |

---

## Schema OPS (8 bảng)

### Thông Báo (2 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 1 | **notifications** | Thông báo đa kênh (in-app, push, email, SMS) |
| 2 | **device_tokens** | Token thiết bị cho push notification |

### Vận Hành (6 bảng)

| STT | Bảng | Mô Tả |
|-----|------|-------|
| 3 | **audit_logs** | Nhật ký kiểm toán (phân vùng tháng, giữ 24 tháng, append-only) |
| 4 | **outbox_events** | Transactional outbox pattern |
| 5 | **export_jobs** | Job xuất báo cáo PDF/Excel/CSV |
| 6 | **backup_jobs** | Job sao lưu/khôi phục dữ liệu người dùng |
| 7 | **sync_tombstones** | Đánh dấu bản ghi đã xóa cứng (giữ 90 ngày) |
| 8 | **reconciliation_logs** | Nhật ký đối chiếu cột dẫn xuất |

---

## Thống Kê Tổng Hợp

### Phân Bố Theo Loại

| Loại | Schema | Số Bảng |
|------|--------|---------|
| **Nghiệp vụ lõi** | core | 47 *(+11 Groups mở rộng)* |
| **AI/ML** | ai | 17 |
| **Vận hành** | ops | 8 |
| **TỔNG** | | **72** |

**Chi tiết Groups Module mở rộng (11 bảng mới):**
- group_expenses, group_expense_splits, group_settlements
- transaction_comments, group_activities
- group_messages, group_message_attachments, group_message_reads
- child_wallets, child_spend_requests, child_chores

### Bảng Có Cột Chuẩn (Audit Columns)

**14 bảng nghiệp vụ có đầy đủ:** created_at, updated_at, deleted_at, version

1. users
2. groups
3. accounts
4. assets
5. categories
6. tags
7. receipts
8. transactions
9. budgets
10. budget_items
11. goals
12. goal_contributions
13. schedules
14. debts

### Bảng Có sync_seq (Đồng Bộ Offline)

**10 bảng** hỗ trợ đồng bộ offline-first:

1. accounts
2. categories (chỉ người dùng)
3. tags
4. transactions
5. budgets
6. budget_items
7. goals
8. goal_contributions
9. schedules
10. debts

### Bảng Có Cột Dẫn Xuất (Denormalized)

**6 cột** được bảo vệ bởi `trg_a_protect_derived`:

1. accounts.**current_balance**
2. budgets.**spent_amount**
3. budget_items.**spent_amount**
4. goals.**current_amount**
5. debts.**paid_amount**
6. assets.**current_value**

### Bảng Có RLS (Row Level Security)

- **46 bảng** bật RLS
- **15 bảng** không bật RLS (có lý do - xem `08-bao-mat-du-lieu.md`)

### Bảng Phân Vùng (Partitioned)

**2 bảng** phân vùng theo tháng:

1. ai.**inference_requests** (giữ 6 tháng)
2. ops.**audit_logs** (giữ 24 tháng)

---

## Mối Quan Hệ Chính

### Khóa Ngoại

- **Tổng:** 114 khóa ngoại
- **Cascade xóa:** 71 khóa (chủ yếu users → con)
- **Restrict:** 11 khóa (bảo vệ dữ liệu lịch sử)
- **Set null:** 32 khóa (dữ liệu làm giàu)

### Bảng Trung Tâm (Hub Tables)

| Bảng | Vai Trò | FK Vào | FK Ra |
|------|---------|--------|-------|
| **transactions** | Lõi giao dịch | 10 | 7 |
| **users** | Chủ sở hữu | 0 | 30+ |
| **categories** | Phân loại | 2 (parent, user) | 15+ |
| **accounts** | Ví tài khoản | 3 | 10+ |

---

## Dung Lượng Ước Tính

### Theo Người Dùng (1 năm hoạt động)

| Nhóm | Dung Lượng |
|------|------------|
| Giao dịch + liên quan | ~800 MB |
| AI/ML | ~200 MB |
| Nhật ký & vận hành | ~150 MB |
| Khác | ~50 MB |
| **Tổng/user/năm** | **~1,2 GB** |

### Hệ Thống (1.000 người dùng)

| Thành Phần | Dung Lượng |
|------------|------------|
| Dữ liệu người dùng | ~1,2 TB |
| Indexes | ~400 GB |
| Dữ liệu tham chiếu | ~50 MB |
| **Tổng ước tính** | **~1,6 TB** |

---

## Chỉ Mục Quan Trọng

### Theo Hiệu Năng

**Top 10 chỉ mục quan trọng nhất:**

1. transactions **(user_id, occurred_date DESC, id DESC)** - Danh sách chính
2. transactions **(user_id, category_id, occurred_date DESC)** - Báo cáo danh mục
3. transactions **(user_id, sync_seq)** - Đồng bộ PULL
4. transactions **GIN trigram(note)** - Tìm kiếm toàn văn
5. accounts **(user_id)** - Danh sách ví
6. budgets **(user_id, start_date, end_date)** - Tra kỳ hiện hành
7. monthly_summaries **UK(user_id, period_start, category_id)** - Biểu đồ xu hướng
8. merchants **GIN trigram(normalized_name)** - Khớp OCR
9. knowledge_chunks **HNSW(embedding)** - RAG vector search
10. notifications **(user_id, created_at DESC) WHERE read_at IS NULL** - Badge chưa đọc

---

## Enum Types (21 loại)

| Schema | ENUMs |
|--------|-------|
| **core** | 11 enums |
| **ai** | 5 enums |
| **ops** | 3 enums |

### Core ENUMs

1. user_status_enum
2. account_type_enum
3. transaction_type_enum
4. transaction_source_enum
5. category_kind_enum
6. category_status_enum
7. period_type_enum
8. goal_status_enum
9. debt_direction_enum
10. recurrence_unit_enum
11. share_role_enum
12. ocr_status_enum

### AI ENUMs

1. forecast_target_enum
2. anomaly_type_enum
3. severity_enum
4. recommendation_type_enum
5. message_role_enum
6. feedback_enum

### Ops ENUMs

1. notification_channel_enum
2. notification_status_enum
3. job_status_enum

---

## Domain Types (7 loại)

| Domain | Định Nghĩa | Mục Đích |
|--------|------------|----------|
| money | NUMERIC(19,4) | Số tiền chung |
| money_pos | NUMERIC(19,4), > 0 | Số tiền dương |
| money_nonneg | NUMERIC(19,4), ≥ 0 | Số tiền không âm |
| percentage | NUMERIC(5,2), 0-100 | Phần trăm |
| currency_code | CHAR(3), ^[A-Z]{3}$ | Mã tiền tệ ISO |
| confidence | NUMERIC(5,4), 0-1 | Độ tin cậy AI |
| email_addr | VARCHAR(255), regex | Email hợp lệ |

---

## Triggers & Functions

### Trigger Phổ Biến

| Trigger | Số Bảng | Mục Đích |
|---------|---------|----------|
| trg_touch | 14 | Cập nhật updated_at/version |
| trg_sync_seq | 10 | Gán số thứ tự đồng bộ |
| trg_tombstone | 10 | Ghi tombstone khi xóa |
| trg_a_protect_derived | 6 | Bảo vệ cột dẫn xuất |

### Functions Quan Trọng

**35 hàm tổng,** trong đó:

- **21 hàm** SECURITY DEFINER
- **18 hàm** là trigger functions
- **6 hàm** nguồn sự thật (reconcile sources)
- **5 hàm** bảo trì dữ liệu dẫn xuất

Chi tiết: Xem Phụ lục G của đặc tả đầy đủ

---

## Tài Liệu Liên Quan

- `02-tong-quan-co-so-du-lieu.md` - Tổng quan kiến trúc
- `03-quy-tac-nghiep-vu.md` - Quy tắc và ràng buộc
- `04-schema-core-chi-tiet.md` - Chi tiết schema core
- `06-quan-he-du-lieu.md` - ERD và khóa ngoại
- `07-bao-mat-du-lieu.md` - RLS và phân quyền
- `08-chien-luoc-dong-bo.md` - Đồng bộ offline-first

---

**Cập nhật:** 11/10/2026  
**Trạng thái:** ✅ Đã kiểm chứng với 109/109 ca kiểm thử
