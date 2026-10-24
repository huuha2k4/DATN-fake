# Quy Tắc Nghiệp Vụ & Ràng Buộc

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026

---

## 📋 Mục Lục

1. [Quy Tắc Nghiệp Vụ Cơ Bản](#quy-tắc-nghiệp-vụ-cơ-bản)
2. [Quy Tắc Giao Dịch](#quy-tắc-giao-dịch)
3. [Quy Tắc Tiền Tệ & Tỷ Giá](#quy-tắc-tiền-tệ--tỷ-giá)
4. [Quy Tắc Ngân Sách](#quy-tắc-ngân-sách)
5. [Quy Tắc Mục Tiêu](#quy-tắc-mục-tiêu)
6. [Chia Sẻ & Phân Quyền](#chia-sẻ--phân-quyền)
7. [Bảo Vệ Cột Dẫn Xuất](#bảo-vệ-cột-dẫn-xuất)
8. [Chính Sách Khóa Ngoại](#chính-sách-khóa-ngoại)
9. [Kiểm Soát Đồng Thời](#kiểm-soát-đồng-thời)

---

## Quy Tắc Nghiệp Vụ Cơ Bản

| Mã | Quy tắc | Cách thực thi |
|----|---------|---------------|
| **BR-01** | Số tiền giao dịch luôn dương; chiều tiền suy từ type | Domain `money_pos` |
| **BR-02** | TRANSFER có ví đích khác ví nguồn, không có danh mục; thu/chi không có ví đích | CHECK `ck_tx_transfer_shape` |
| **BR-03** | Thu/chi bắt buộc có danh mục | CHECK `ck_tx_category_required` |
| **BR-04** | Người ghi giao dịch phải là chủ ví hoặc EDITOR+ | Trigger `trg_tx_prepare` |
| **BR-05** | Danh mục tương thích chiều thu/chi | Trigger `trg_tx_prepare` |
| **BR-06** | current_balance = initial_balance + tổng biến động | `trg_tx_balance` + `fn_reconcile` |
| **BR-07** | Không xóa danh mục còn giao dịch | FK RESTRICT |
| **BR-08** | Hai ngân sách cùng loại kỳ không chồng ngày | EXCLUDE GiST (có period_type) |
| **BR-09** | Mỗi danh mục một lần trong một ngân sách | UK partial (budget_id, category_id) |
| **BR-10** | Danh mục tối đa 2 cấp | `trg_category_depth` |
| **BR-11** | goals.current_amount = max(0, tổng contributions) | `trg_goal_progress` + đối chiếu |
| **BR-12** | ACHIEVED là trạng thái suy ra (đủ tiền ⟺ ACHIEVED) với mục tiêu ACTIVE/ACHIEVED; PAUSED/CANCELLED không tự đổi | `trg_goal_status` |
| **BR-13** | target_date ≥ start_date | CHECK |
| **BR-14** | Không ghi giao dịch vào ví lưu trữ | `trg_tx_prepare` |
| **BR-15** | Một ảnh hóa đơn xử lý một lần/người dùng | UK (user_id, image_hash) |
| **BR-16** | Một hóa đơn ↔ tối đa một giao dịch | UK partial transactions(receipt_id) |
| **BR-17** | Một mô hình active mỗi (model_code, user_id) | UK partial NULLS NOT DISTINCT |
| **BR-18** | Một dự báo is_current mỗi (user, target_type, target_id) | UK partial NULLS NOT DISTINCT |
| **BR-19** | Không cảnh báo trùng loại trên cùng giao dịch | UK partial (transaction_id, anomaly_type) |
| **BR-20** | OWNER nhóm không tự rời khi chưa chuyển quyền | Service layer |
| **BR-21** | VIEWER không tạo/sửa giao dịch trên ví chia sẻ | `trg_tx_prepare` + RLS |
| **BR-22** | base_amount tính theo tỷ giá ngày giao dịch; thiếu thì dùng gần nhất + is_rate_estimated | `fn_get_rate` trong `trg_tx_prepare` |
| **BR-23** | Xóa người dùng ⇒ xóa dữ liệu liên quan (và file S3) | CASCADE + job |
| **BR-24** | Nhật ký kiểm toán chỉ ghi thêm | REVOKE UPDATE/DELETE |
| **BR-25** | Tiền tệ giao dịch = tiền tệ ví nguồn; chuyển khác tiền tệ phải có to_amount | `trg_tx_prepare` |
| **BR-26** | Mọi báo cáo/ngân sách dùng occurred_date (ngày local) | Quy ước + `trg_tx_prepare` |
| **BR-27** | Một lịch chỉ sinh một lần cho mỗi due_date | UK (schedule_id, due_date) |
| **BR-28** | Lịch auto_create phải đủ thông tin tạo giao dịch | CHECK `ck_sched_auto_create` |
| **BR-29** | peer_benchmarks chỉ lưu nhóm ≥ 20 người | CHECK sample_size >= 20 |
| **BR-30** | Cột dẫn xuất không làm tăng version | Cờ `app.skip_touch` + `fn_touch` |
| **BR-31** | Client không ghi đè được cột dẫn xuất; INSERT ép về 0 | `trg_a_protect_derived` |
| **BR-32** | current_balance khởi tạo = initial_balance; đổi initial_balance dịch số dư đúng chênh lệch | `trg_account_init` |
| **BR-33** | Người tạo giao dịch bất biến | `fn_tx_prepare` |
| **BR-34** | alert_level luôn suy ra từ spent/limit/ngưỡng; phát outbox khi mức tăng | `trg_budget_item_level`, `trg_budget_item_alert_*` |
| **BR-35** | Chỉ chủ tài nguyên mới chia sẻ được nó vào nhóm | `trg_shared_resource_exists` |
| **BR-36** | Chỉ chủ nhóm thêm thành viên; ai cũng rời được nhóm của mình; không tự thêm mình vào nhóm | RLS `group_members` |

---

## Quy Tắc Giao Dịch

### Logic Cập Nhật Số Dư (Kiểm thử A1, A6, A6b, A7)

**Khi INSERT:**
- `current_balance := initial_balance` (client không cần/không được gửi)

**Khi UPDATE initial_balance:**
- Số dư dịch đúng bằng chênh lệch: `current_balance := current_balance + (NEW.initial_balance - OLD.initial_balance)`

**Bảo vệ khỏi Client:**
- Client không ghi đè được `current_balance` (`trg_a_protect_derived`)
- Số dư chỉ thay đổi qua `trg_tx_balance_*`
- `current_balance` là cột chỉ kéo về, không bao giờ đẩy lên

### Thứ Tự Thực Thi Trigger Giao Dịch

**BEFORE (thứ tự bảng chữ cái: trg_sync_seq → trg_touch → trg_tx_prepare):**

1. **trg_tx_prepare** (BEFORE INSERT/UPDATE)
   - Người tạo bất bội (BR-TX-08)
   - Quyền ghi ví nguồn/đích: chủ ví hoặc EDITOR+ qua `fn_account_role` (BR-TX-01)
   - Ví lưu trữ (BR-TX-04, chỉ khi INSERT hoặc đổi ví)
   - Tiền tệ = tiền tệ ví (BR-TX-06)
   - Chuyển khác tiền tệ phải có to_amount (BR-TX-07)
   - Danh mục hợp loại (BR-TX-02)
   - Gán `occurred_date`, `exchange_rate`, `base_amount`, `base_fee`
   - Tính lại tỷ giá/base khi UPDATE đổi amount/ngày/tiền tệ mà người gọi không tự gửi base mới (A8, C11a)

2. **trg_sync_seq** (BEFORE INSERT/UPDATE)
   - Gán `sync_seq`

3. **trg_touch** (BEFORE UPDATE)
   - Cập nhật `updated_at`, `version`

**AFTER:**

4. **trg_tx_balance_ins_del** (AFTER INSERT/DELETE)
   - Áp/hoàn tác số dư

5. **trg_tx_balance_upd** (AFTER UPDATE WHEN account_id, to_account_id, type, amount, fee_amount, to_amount hoặc deleted_at đổi)
   - Hoàn tác bản cũ, áp bản mới (cả xóa mềm/khôi phục)

6. **trg_tx_after_ins_del** (AFTER INSERT/DELETE)
   - `fn_budget_recalc`; INSERT ⇒ outbox TransactionCreated

7. **trg_tx_after_upd** (AFTER UPDATE WHEN user_id, category_id, type, base_amount, base_fee, occurred_date, is_excluded_from_report hoặc deleted_at đổi)
   - `fn_budget_recalc` cho bản cũ và bản mới

8. **trg_tombstone** (AFTER DELETE)
   - Ghi tombstone

**Bài học quan trọng:**  
Dùng `WHEN`, không dùng `UPDATE OF` cho cột do trigger BEFORE gán. `UPDATE OF col` chỉ xét cột trong câu UPDATE của người dùng, bỏ sót cột do trigger BEFORE gán (`base_amount`, `occurred_date`). v2.1 ban đầu dùng `UPDATE OF base_amount, occurred_date…` và sai: sửa riêng số tiền hoặc riêng ngày không tính lại ngân sách (kiểm thử C11b–C11d bắt được).  

**Quy ước:** Trigger phụ thuộc cột dẫn xuất phải dùng `WHEN (OLD.x IS DISTINCT FROM NEW.x …)`.

### Các Hàm Chính

Tất cả đều SECURITY DEFINER (xem mục 3.2 của file tổng quan): chúng phải sửa ví/ngân sách của người khác (ví chia sẻ) và chạy được khi svc_ai đổi nhãn mà không cần cấp thêm quyền ghi.

- `fn_tx_prepare`, `fn_tx_balance`, `fn_tx_after`, `fn_budget_recalc`, `fn_apply_balance`

---

## Quy Tắc Tiền Tệ & Tỷ Giá

### Một Ví = Một Tiền Tệ

1. Mỗi ví có duy nhất một `currency_code`
2. `transactions.currency_code` phải bằng tiền tệ ví nguồn (trigger kiểm)
3. `amount` và `fee_amount` tính theo tiền tệ này
4. `to_amount` (chỉ chuyển khoản) tính theo tiền tệ ví đích
   - Bắt buộc khi hai ví khác tiền tệ

### Quy Đổi Về Tiền Tệ Gốc

- `base_amount`, `base_fee`: quy đổi sang `users.base_currency` theo tỷ giá ngày giao dịch (`occurred_date`)
- Lưu kèm `exchange_rate`
- **Nếu thiếu tỷ giá chính xác:**
  - Dùng tỷ giá gần nhất trước đó (chấp nhận cả nghịch đảo: có VND→EUR thì dùng được EUR→VND)
  - Đặt `is_rate_estimated = true`
  - Nếu không có tỷ giá nào → **từ chối giao dịch** (kiểm thử B5–B9)
- **Ngân sách và tổng hợp luôn tính bằng tiền tệ gốc** (base_amount + base_fee)

### Chiến Lược Tra Tỷ Giá

```sql
-- Tỷ giá trực tiếp
SELECT rate FROM exchange_rates 
WHERE base_code = 'USD' AND quote_code = 'VND' AND rate_date <= '2026-10-11'
ORDER BY rate_date DESC LIMIT 1

-- Fallback: tỷ giá nghịch đảo
SELECT 1/rate FROM exchange_rates 
WHERE base_code = 'VND' AND quote_code = 'USD' AND rate_date <= '2026-10-11'
ORDER BY rate_date DESC LIMIT 1

-- Nếu cả hai đều thất bại → lỗi "Không tìm thấy tỷ giá"
```

---

## Quy Tắc Ngân Sách

### Ngăn Chồng Kỳ Ngân Sách

```sql
-- Ràng buộc EXCLUDE ngăn các kỳ cùng loại chồng lên nhau
EXCLUDE USING GIST (
  user_id =, 
  period_type =, 
  daterange(start_date, end_date, '[]') &&
) 
WHERE deleted_at IS NULL AND is_active
```

**Điểm chính:**
- Bao gồm `period_type`: cho phép ngân sách tháng và quý chạy song song (v2 thêm)
- Người dùng có thể có nhiều ngân sách loại khác nhau không chồng nhau

### Phân Cấp Hạng Mục Ngân Sách

- Hạng mục có thể nhắm đến danh mục cha hoặc con
- **Hạng mục cha bao gồm tất cả giao dịch con**
- Nếu danh mục A có con A1, A2:
  - Hạng mục cho A tính giao dịch trong A, A1, A2
  - Hạng mục cho A1 chỉ tính giao dịch A1

### Logic Tính Số Đã Chi

Tất cả đã được kiểm thử kỹ ở nhóm C:

| Trigger / Hàm | Khi nào | Việc làm |
|--------------|---------|----------|
| `trg_tx_after_*` → `fn_budget_recalc(user, category, occurred_date)` | Giao dịch thêm/sửa/xóa | Tính lại `budgets.spent_amount` và các hạng mục khớp danh mục (và danh mục cha) của kỳ chứa ngày đó |
| `trg_budget_item_level` (BEFORE) | limit_amount, alert_threshold hoặc spent_amount đổi | Luôn suy ra `alert_level` từ spent/limit/ngưỡng ⇒ sửa hạn mức cũng đổi mức mà không cần giao dịch mới (C7, C8) |
| `trg_budget_item_alert_ins/upd` (AFTER, WHEN mức tăng) | Mức cảnh báo tăng (do giao dịch hoặc sửa hạn mức) | Ghi outbox `BudgetThresholdCrossed` |
| `trg_budget_item_init` | Hạng mục mới hoặc đổi danh mục | Tính ngay từ các giao dịch đã có trong kỳ (C1); v2.0 bỏ sót nên ngân sách tạo giữa tháng bắt đầu từ 0 |
| `trg_budget_refresh` | Ngân sách mới, đổi kỳ hoặc đổi ngưỡng | Tính lại tổng và mọi hạng mục (C14) |

**Tính chi tiêu:**
- Tổng `base_amount + base_fee` của giao dịch EXPENSE
- Chưa xóa
- Không `is_excluded_from_report`
- `occurred_date` trong kỳ

**Ngân sách chia sẻ:** Chỉ cộng chi tiêu của chủ ngân sách (không phải tất cả thành viên nhóm).

### Mức Cảnh Báo

| Mức | Điều kiện | Hiển thị | Hành động |
|-----|-----------|----------|-----------|
| 0 | < ngưỡng (mặc định 80%) | 🟢 Bình thường | Không |
| 1 | ≥ ngưỡng nhưng < 100% | 🟡 Cảnh báo | Sự kiện outbox → thông báo |
| 2 | ≥ 100% hạn mức | 🔴 Vượt ngân sách | Sự kiện outbox → thông báo |

**Quan trọng:** Thay đổi hạn mức cũng kích hoạt tính lại mức cảnh báo:
- Nâng hạn mức → mức có thể giảm (C7)
- Hạ hạn mức → mức có thể tăng và phát sự kiện mới (C8)

---

## Quy Tắc Mục Tiêu

### Theo Dõi Số Tiền Mục Tiêu

**Cơ chế:**
- `trg_goal_progress` (AFTER trên `goal_contributions`): đặt `current_amount = max(0, SUM(amount))` cho mục tiêu mới và cũ (nếu goal_id đổi)
- `trg_goal_status` (BEFORE trên `goals`): suy ra trạng thái
  - Khi `status ∈ {ACTIVE, ACHIEVED}`:
    - `current_amount ≥ target_amount` ⇒ ACHIEVED (+ achieved_at)
    - Ngược lại ⇒ ACTIVE (xóa achieved_at)
  - Mục tiêu PAUSED/CANCELLED không tự đổi (D6)

**Hệ quả:**
- Nâng `target_amount` đưa mục tiêu về ACTIVE
- Hạ xuống ≤ current_amount ⇒ ACHIEVED (D4; v2.0 bỏ sót chiều này)
- ACHIEVED là giá trị suy ra: đặt tay ACHIEVED khi chưa đủ tiền sẽ bị đưa về ACTIVE

### Đóng Góp Mục Tiêu

**Quy ước:** Đóng góp vào mục tiêu nghĩa là tiền "đã dành riêng".

- **Có transaction_id:** liên kết giao dịch TRANSFER sang tài khoản tiết kiệm
- **Không có transaction_id:** chỉ ghi nhận nội bộ, không đổi số dư ví
- **Số âm:** rút tiền ra khỏi mục tiêu

---

## Chia Sẻ & Phân Quyền

### Hệ Thống Cấp Bậc Vai Trò

```
OWNER > EDITOR > VIEWER
```

Có thể dùng `LEAST(role1, role2)` để so sánh.

### Quyền Thực Tế

```
Quyền thực tế trên tài nguyên = LEAST(
  shared_resources.permission,
  group_members.role
)
```

**Ví dụ:**
- Tài nguyên được chia sẻ với quyền EDITOR
- Người dùng là VIEWER trong nhóm
- → Người dùng được VIEWER (thấp hơn trong hai)

### Ma Trận Phân Quyền

| Vai trò | Đọc | Cập nhật | Xóa | Chia sẻ |
|---------|-----|----------|-----|---------|
| **VIEWER** | ✅ | ❌ | ❌ | ❌ |
| **EDITOR** | ✅ | ✅ Giao dịch/dữ liệu | ❌ | ❌ |
| **OWNER** | ✅ | ✅ Mọi thứ | ✅ | ✅ |

### Kiểm Tra Chia Sẻ

**`trg_shared_resource_exists` (BEFORE INSERT/UPDATE trên shared_resources):**

1. Kiểm tra tài nguyên đa hình tồn tại (không có FK vật lý)
2. **Kiểm tra `shared_by` là chủ tài nguyên** (sửa H0b)
3. Chặn chia sẻ nếu không phải chủ

**Dọn dẹp mồ côi:** Job hàng tuần xóa shared_resources của tài nguyên đã xóa.

---

## Bảo Vệ Cột Dẫn Xuất

### Vấn Đề

Cột dẫn xuất không được bảo vệ bởi khóa lạc quan:
- `version` không tăng khi chúng thay đổi (BR-30)
- ORM UPDATE với giá trị cũ sẽ ghi đè thay đổi số dư mới

### Giải Pháp: Bảo Vệ Hai Lớp

**Lớp 1: Version Không Tăng**
```sql
-- Hàm bảo trì bọc UPDATE của chúng:
PERFORM core.fn_skip_touch(true);
UPDATE accounts SET current_balance = ...;
PERFORM core.fn_skip_touch(false);

-- fn_touch kiểm tra: nếu app.skip_touch = '1' thì bỏ qua tăng version
```

**Lớp 2: Ngăn Client Ghi Đè**

```sql
-- trg_a_protect_derived (6 bảng: accounts.current_balance, budgets.spent_amount,
-- budget_items.spent_amount, goals.current_amount, debts.paid_amount, assets.current_value)

CREATE TRIGGER trg_a_protect_derived BEFORE INSERT OR UPDATE
FOR EACH ROW EXECUTE FUNCTION fn_protect_derived('current_balance');
```

**Hành vi:**
- INSERT: ép cột dẫn xuất về 0
- UPDATE: giữ giá trị CŨ trừ khi `app.skip_touch = '1'` (trigger bảo trì đang ghi)

**Tên trigger quan trọng:** `trg_a_protect_derived` chạy trước `trg_account_init` (thứ tự bảng chữ cái).

**Kiểm thử:** A6, A6b (client không ghi đè được số dư), D0 (INSERT không đặt được số tiền mục tiêu).

---

## Chính Sách Khóa Ngoại

### Các Chính Sách Tiêu Chuẩn

| Quan hệ | ON DELETE | Lý do |
|---------|-----------|-------|
| **users → bảng con** | CASCADE | Xóa tài khoản xóa toàn bộ dữ liệu |
| **transactions.account_id, to_account_id** | RESTRICT | Phải lưu trữ ví trước, không xóa được |
| **transactions.category_id** | RESTRICT | Bảo vệ báo cáo lịch sử |
| **transactions.merchant_id, receipt_id** | SET NULL | Dữ liệu làm giàu, không quan trọng |
| **goal_contributions.transaction_id** | SET NULL | Xóa giao dịch không mất lịch sử |
| **debt_payments.transaction_id** | SET NULL | Tương tự |
| **schedule_occurrences.transaction_id** | SET NULL | Tương tự |
| **budget_items.budget_id** | CASCADE | Hạng mục không tồn tại độc lập |
| **ai.* → core.transactions** | CASCADE | Kết quả AI vô nghĩa khi mất giao dịch gốc |
| **ai.*.model_id** | SET NULL | Xóa mô hình cũ không xóa kết quả |

### Xóa Danh Mục

**Không thể xóa danh mục có giao dịch** (FK RESTRICT).

**Để gộp danh mục:**
```sql
-- Phải dùng stored procedure (chưa implement trong v2.1)
CALL sp_merge_category(source_id, dest_id);
-- Chuyển giao dịch sang dest, rồi xóa source
```

---

## Kiểm Soát Đồng Thời

### Các Tình Huống & Giải Pháp

| Tình huống | Giải pháp |
|------------|-----------|
| **Hai thiết bị sửa cùng giao dịch** | Khóa lạc quan qua `version`; thiết bị thứ hai nhận HTTP 409 |
| **Nhiều giao dịch đổi cùng số dư ví** | `UPDATE ... SET balance = balance + delta` (không đọc-sửa-ghi), an toàn ở READ COMMITTED |
| **Hai giao dịch của cùng user** (kể cả chuyển khoản đảo chiều ví) | Tuần tự hóa bằng khóa dòng `user_sync_state` trong trigger BEFORE, không deadlock; đo được: phiên thứ hai chờ ~2s đến khi phiên đầu commit |
| **Hai giao dịch của hai user khác nhau chạm ví chia sẻ** | Có thể deadlock hiếm (mỗi bên giữ khóa user_sync_state của mình rồi chờ của bên kia); service retry khi gặp SQLSTATE 40P01 |
| **Hai yêu cầu tạo ngân sách chồng kỳ** | Ràng buộc EXCLUDE |
| **Mobile gửi lại request** | client_uuid + unique index |
| **Cùng user ghi từ nhiều thiết bị** | `fn_assign_sync_seq` tuần tự hóa theo user (khóa user_sync_state) ⇒ thứ tự seq = thứ tự commit |
| **Job và người dùng cùng ghi budget_items** | FOR UPDATE trong `fn_budget_recalc`; job dùng SKIP LOCKED |

### Mức Cô Lập

**Mặc định: READ COMMITTED**  
**Ngoại lệ:** `sp_close_month` dùng REPEATABLE READ

### Tuần Tự Hóa Sync Sequence

**Vấn đề (v1):** Sequence toàn cục; transaction commit muộn có seq thấp hơn cursor đã kéo → client bỏ sót bản ghi.

**Giải pháp (v2):** Sequence theo từng user.

```sql
-- Trigger fn_assign_sync_seq:
INSERT INTO user_sync_state (user_id, seq) VALUES (NEW.user_id, 1)
ON CONFLICT (user_id) DO UPDATE SET seq = user_sync_state.seq + 1
RETURNING seq INTO NEW.sync_seq;
```

**Điểm chính:** Dòng bị khóa đến khi commit → các giao dịch của cùng user được tuần tự hóa → thứ tự seq = thứ tự commit.

**Đã kiểm chứng:** Hai phiên song song: phiên thứ hai bị chặn ~2 giây cho đến khi phiên đầu commit, rồi nhận seq lớn hơn.

**Đánh đổi:**
- Ghi đồng thời của cùng user xếp hàng (chấp nhận được; mỗi user ghi thưa)
- Import lớn nên chia lô

### Rủi Ro Deadlock: Ví Chia Sẻ

**Kịch bản:**
- User A chuyển A→B (giữ khóa user_sync_state của A, cần cập nhật ví của B)
- User B chuyển B→A (giữ khóa user_sync_state của B, cần cập nhật ví của A)
- → Deadlock

**Giảm thiểu:** Service layer retry khi `SQLSTATE 40P01`.

---

## Trạng Thái Kiểm Chứng

✅ **Tất cả quy tắc đã được kiểm chứng qua kiểm thử tự động:**
- 109 ca kiểm thử bao phủ tất cả quy tắc nghiệp vụ
- Kiểm thử gồm ca dương (hành vi đúng) và ca âm (từ chối lệnh sai)
- Chạy với cả superuser và các role dịch vụ (svc_backend, svc_ai) để bắt lỗi quyền
- Tuần tự hóa giao dịch được kiểm chứng với các phiên song song
- Xem Phụ lục E của đặc tả đầy đủ để biết danh sách kiểm thử hoàn chỉnh

---

**Tiếp theo:** Xem `04-schema-core.md` để biết định nghĩa chi tiết các bảng schema core.
