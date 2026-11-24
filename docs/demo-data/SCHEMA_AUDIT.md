# AUDIT SCHEMA DATABASE & NGHIỆP VỤ FINORA (PHASE 1)

**Ngày lập**: 23/11/2026  
**Dự án**: Finora Personal Finance Ecosystem  
**Mục tiêu**: Chuẩn bị nền tảng kiến trúc và đặc tả chi tiết toàn bộ cơ sở dữ liệu để phục vụ xây dựng bộ sinh dữ liệu demo (Demo Data Seeder) chính xác 100%, bảo đảm tính toàn vẹn và độc lập.

---

## 1. TỔNG QUAN HỆ THỐNG VÀ CÔNG NGHỆ
- **Database Engine**: PostgreSQL 16 (Schema chính: `core`, Schema vận hành: `ops`).
- **Backend Framework**: Spring Boot 3.x, Spring Data JPA, Hibernate, Spring Security (JWT / BCrypt).
- **AI Service**: Python FastAPI (`pfm-ai-service`).
- **Frontend Clients**: Web (React + Vite) & App (React Native + Expo).
- **Múi giờ chuẩn hệ thống**: `Asia/Ho_Chi_Minh` (GMT+7).
- **Tiền tệ chuẩn**: `VND` (Toàn bộ trường monetary dùng `numeric(19,4)` hoặc `numeric(15,2)`).

---

## 2. BẢNG MỤC TIÊU NGHIỆP VỤ & PHẠM VI SEED

### A. Nhóm Quản lý Người dùng & Xác thực (`Auth & Users`)
1. `core.users`:
   - **Mục đích**: Lưu trữ thông tin tài khoản người dùng và vai trò hệ thống.
   - **Các trường chính**: `id (UUID)`, `email (varchar)`, `username (varchar)`, `full_name (varchar)`, `password_hash (varchar, BCrypt $2a$12$)`, `user_status ('ACTIVE', 'LOCKED', 'DELETED')`, `system_role ('USER', 'ADMIN', 'SUPER_ADMIN')`, `subscription_tier ('FREE', 'PREMIUM')`, `preferred_currency ('VND')`, `timezone ('Asia/Ho_Chi_Minh')`.
   - **Quy tắc**: `email` và `username` là unique trong phạm vi các tài khoản active (`deleted_at IS NULL`). Mật khẩu demo chuẩn hóa mã hóa bằng BCrypt hash (`DemoPass@123`).
2. `core.user_profiles`:
   - **Mục đích**: Thông tin bổ sung (nghề nghiệp, thu nhập ước tính, mục tiêu tài chính ban đầu).

### B. Nhóm Quản lý Tài khoản & Ví tiền (`Accounts & Assets`)
1. `core.accounts`:
   - **Mục đích**: Ví tiền mặt, tài khoản ngân hàng, ví điện tử của từng người dùng.
   - **Các trường chính**: `id (UUID)`, `user_id (UUID)`, `name (varchar)`, `account_type ('CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'SAVINGS')`, `balance (numeric 15,2)`, `current_balance (money)`, `initial_balance (money)`, `is_active (boolean)`, `is_included_in_total (boolean)`.
   - **Quy tắc tính số dư**:
     $$\text{Số dư hiện tại} = \text{Số dư ban đầu} + \sum \text{Thu} - \sum \text{Chi} \pm \sum \text{Chuyển tiền}$$
     Trong DB Finora, `balance` lưu số dư dạng số thập phân chuẩn. Seeder phải tính toán chính xác để `balance` khớp 100% với tổng giao dịch.

### C. Nhóm Danh mục & Giao dịch (`Categories & Transactions`)
1. `core.categories`:
   - **Mục đích**: Phân loại thu chi.
   - **Phân loại**: `kind ('INCOME', 'EXPENSE')`. Danh mục hệ thống có sẵn gồm 32 danh mục (`user_id IS NULL`, `is_system = true`).
   - **Danh mục phổ biến**:
     - Chi tiêu (`EXPENSE`): `FOOD_DRINK` / `FOOD_DRINKS` (Ăn uống), `TRANSPORTATION` (Đi lại), `SHOPPING` (Mua sắm), `HOUSING` (Nhà ở), `UTILITIES` (Điện nước/Hóa đơn), `EDUCATION` (Giáo dục), `ENTERTAINMENT` (Giải trí), `TRAVEL` (Du lịch), `FAMILY` (Gia đình & Con cái), `HEALTHCARE` (Sức khỏe), `DEBT_PAYMENT` (Trả nợ).
     - Thu nhập (`INCOME`): `SALARY` (Lương), `BONUS` (Thưởng), `BUSINESS_INCOME` (Kinh doanh), `INVESTMENT_INCOME` (Đầu tư), `GIFT_SYS` (Quà tặng), `DEBT_COLLECTION` (Thu nợ).
2. `core.transactions`:
   - **Mục đích**: Bản ghi thu/chi/chuyển khoản cá nhân.
   - **Các trường chính**: `id`, `user_id`, `account_id`, `to_account_id` (nếu là TRANSFER), `category_id` (bắt buộc với INCOME/EXPENSE), `type ('INCOME', 'EXPENSE', 'TRANSFER')`, `amount`, `occurred_at`, `occurred_date`, `description`, `source ('MANUAL', 'OCR', 'IMPORT')`.
   - **Constraints**:
     - Nếu `type = 'TRANSFER'`: `to_account_id` bắt buộc khác null và khác `account_id`, `category_id` là null.
     - Nếu `type != 'TRANSFER'`: `category_id` bắt buộc có giá trị, `to_account_id` là null.

### D. Nhóm Quản lý Nhóm tài chính (`Groups, Funds & Split`)
1. `core.groups`:
   - **Mục đích**: Không gian tài chính chung (Gia đình, Cặp đôi, Phòng trọ, Du lịch, Bạn bè).
   - **Các trường chính**: `id`, `name`, `group_type ('FAMILY', 'COUPLE', 'ROOMMATE', 'TRAVEL', 'PROJECT', 'OTHER')`, `owner_id`, `status ('ACTIVE', 'ARCHIVED')`.
2. `core.group_members`:
   - **Mục đích**: Thành viên tham gia nhóm.
   - **Các trường chính**: `group_id`, `user_id`, `role ('OWNER', 'ADMIN', 'MEMBER')`, `joined_at`, `is_child_profile (boolean)`, `linked_child_wallet_id (UUID)`.
3. `core.group_funds` & `core.group_fund_contributions`:
   - **Mục đích**: Quỹ chung của nhóm (Quỹ sinh hoạt gia đình, Quỹ hẹn hò, Quỹ du lịch).
   - **Trường chính**: `fund_id`, `contributor_user_id`, `source_account_id`, `amount`, `contributed_at`, `note`, `personal_transaction_id`.
   - **Quy tắc nghiệp vụ**: Khi nộp quỹ, hệ thống sinh một personal transaction chi tiêu để trừ tiền ví cá nhân của người nộp và cộng vào quỹ nhóm.
4. `core.group_expenses` & `core.group_expense_splits`:
   - **Mục đích**: Khoản chi tiêu chung trong nhóm (ai trả, trả từ ví nào/quỹ nào, ai phải chia phần).
   - **Trường chính**: `paid_by_user_id`, `payment_source ('PERSONAL_ACCOUNT', 'GROUP_FUND')`, `split_method ('EQUAL', 'PERCENTAGE', 'EXACT', 'SHARES')`.
   - **Bảng splits**: `expense_id`, `user_id`, `amount` (Số tiền mỗi người phải chịu).
5. `core.group_settlements`:
   - **Mục đích**: Giao dịch hoàn trả, thanh toán nợ giữa 2 thành viên trong nhóm.
   - **Trường chính**: `from_user_id`, `to_user_id`, `amount`, `status ('PENDING', 'CONFIRMED', 'REJECTED')`, `settlement_date`.

### E. Nhóm Ví Trẻ Em & Quản lý Chi tiêu Con cái (`Kids Wallet`)
1. `core.child_wallets`:
   - **Mục đích**: Ví tiền dành cho trẻ em dưới sự bảo trợ của nhóm gia đình.
   - **Trường chính**: `id`, `group_id`, `user_id` (tài khoản đăng nhập của bé), `child_name`, `date_of_birth`, `balance`, `weekly_allowance`, `privacy_level ('FULL_ACCESS', 'PARENT_SUPERVISED', 'VIEW_ONLY')`, `allowance_source ('PERSONAL_ACCOUNT', 'GROUP_FUND')`.
2. `core.child_chores`:
   - **Mục đích**: Nhiệm vụ việc nhà bố mẹ giao cho con để nhận thưởng.
   - **Trường chính**: `wallet_id`, `title`, `reward_amount`, `status ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')`, `approved_by_user_id`, `due_date`.
   - **Quy tắc**: Khi bố mẹ duyệt (`APPROVED`), số tiền thưởng được cộng vào số dư ví của bé (`child_wallets.balance`).
3. `core.child_spend_requests`:
   - **Mục đích**: Yêu cầu xin tiền / xin chi tiêu của bé gửi lên bố mẹ.
   - **Trường chính**: `wallet_id`, `amount`, `category_id`, `description`, `status ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`, `responded_by_user_id`.

### F. Nhóm Ngân sách & Mục tiêu tiết kiệm (`Budgets & Goals`)
1. `core.budgets` & `core.budget_items`:
   - **Mục đích**: Hạn mức chi tiêu theo tháng hoặc theo danh mục.
   - **Trường chính**: `user_id`, `period_type ('MONTHLY')`, `start_date`, `end_date`, `total_amount`, `spent_amount`, `status ('ON_TRACK', 'WARNING', 'EXCEEDED')`.
2. `core.goals` & `core.goal_contributions`:
   - **Mục đích**: Mục tiêu mua sắm tài sản hoặc tích lũy (Mua ô tô, mua xe đạp, mua laptop).
   - **Trường chính**: `user_id`, `name`, `target_amount`, `current_amount`, `target_date`, `status ('IN_PROGRESS', 'COMPLETED')`.

### G. Nhóm Sổ nợ & Vay mượn (`Debts & Debt Payments`)
1. `core.debts`:
   - **Mục đích**: Ghi chép cho vay (`LEND`) hoặc đi vay (`BORROW`).
   - **Trường chính**: `user_id`, `type ('BORROW', 'LEND')`, `counterparty_name`, `principal_amount`, `remaining_amount`, `status ('ACTIVE', 'PARTIALLY_PAID', 'SETTLED', 'OVERDUE')`.
2. `core.debt_payments`:
   - **Mục đích**: Các lần trả nợ hoặc thu nợ từng phần / tất toán.

### H. Nhóm Tương tác & Thông báo (`Chat, Activities, Notifications`)
1. `core.group_messages`, `core.group_message_reads`, `core.group_message_reactions`:
   - **Mục đích**: Tin nhắn trao đổi trong nhóm tài chính kèm biểu cảm reaction và trạng thái đã đọc.
2. `core.transaction_comments`:
   - **Mục đích**: Bình luận trực tiếp vào một khoản chi tiêu chung.
3. `core.notifications`:
   - **Mục đích**: Thông báo hệ thống, nhắc nhở vượt ngân sách, phê duyệt xin tiền, nhận thưởng nhiệm vụ.

---

## 3. CƠ CHẾ BẢO ĐẢM TOÀN VẸN (BUSINESS RULES & FORMULAS)
1. **Ví tiền cá nhân**:
   - Mỗi người dùng khi khởi tạo được cấp 2-3 ví chính: `Ví tiền mặt`, `Tài khoản Techcombank/Vietcombank`, `Ví MoMo`.
   - Toàn bộ giao dịch thu, chi, chuyển tiền trong 3 tháng phải đối soát chuẩn xác:
     $$\text{Balance} = \text{Initial Balance} + \sum \text{Income} - \sum \text{Expense} - \sum \text{Transfer Out} + \sum \text{Transfer In} - \sum \text{Fund Contributions}$$
2. **Quỹ nhóm**:
   - Tổng tiền quỹ nhóm (`group_funds.current_balance`) phải bằng:
     $$\sum \text{Fund Contributions} - \sum \text{Fund Expenses} + \sum \text{Fund Adjustments}$$
3. **Ví trẻ em**:
   - `child_wallets.balance` phải bằng:
     $$\text{Initial Balance} + \sum \text{Chore Rewards (APPROVED)} + \sum \text{Money Requests Approved} - \sum \text{Child Expenses}$$
4. **Cân đối công nợ nhóm**:
   - Khi một thành viên trả tiền cho nhóm bằng tiền cá nhân (`payment_source = 'PERSONAL_ACCOUNT'`), các thành viên còn lại nợ người đó theo tỉ lệ chia (`splits`).
   - Khoản trả nợ `group_settlements` khi `CONFIRMED` sẽ trừ nợ giữa 2 bên.

---

## 4. KẾT LUẬN AUDIT
- Mọi bảng, enum, cột và trigger trong database `finance_db` đều sẵn sàng cho quá trình seed.
- Không có xung đột schema nào ngăn cản việc seed.
- Seeder sẽ được viết bằng script Node.js / SQL Runner hoặc Java command để thực thi trực tiếp trên database một cách tối ưu, độc lập và bảo đảm idempotency.
