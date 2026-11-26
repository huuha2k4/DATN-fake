# FULL PROJECT ANALYSIS – FINORA
**Đề tài:** Xây dựng hệ thống quản lý tài chính cá nhân tích hợp trợ lý AI trên nền tảng Web và Mobile.
**Mục đích tài liệu:** Kiểm kê toàn diện chức năng, nghiệp vụ, kiến trúc kỹ thuật và khối lượng công việc thực tế từ source code để phục vụ phân chia đồ án tốt nghiệp cho 3 thành viên (chưa phân công cụ thể cho từng thành viên).

---

## PHẦN A – TỔNG QUAN DỰ ÁN & PHƯƠNG PHÁP ĐẾM

### A.1. Số liệu kiểm kê tổng hợp (trực tiếp từ source code)

| Chỉ số kiểm kê | Số lượng thực tế | Ghi chú & Phương pháp đếm |
|---|---:|---|
| **Module nghiệp vụ Backend** (`backend/.../modules/*`) | **18** | `account`, `admin`, `analytics`, `audit`, `auth`, `budget`, `category`, `debt`, `feedback`, `finai`, `goal`, `group`, `notification`, `ocr`, `schedule`, `system`, `transaction`, `user` |
| **Chức năng nghiệp vụ chính** | **34** | Đếm theo nghiệp vụ đầu-cuối (không tách Web và Mobile thành 2 chức năng riêng) |
| **Chức năng nghiệp vụ con** | **87** | Bao gồm các luồng tạo/sửa/xóa/tổng hợp/xuất báo cáo/duyệt/tất toán trong 18 module |
| **Chức năng kỹ thuật (không có UI)** | **21** | Flyway migrations, Hibernate validation, JWT/OAuth/Security filters, Idempotency, Rate limit, Audit logging, 8 Scheduled jobs, Image compression, Signed URLs, Docker/Nginx/VPS |
| **Backend Controllers** | **24** | Bao gồm `HealthController`, `SystemAuditAdminController`, `FinAiInternalToolController`, `FinAiLegacyController` |
| **REST API Endpoints** | **241** | Đếm tổng số `@GetMapping/@PostMapping/@PutMapping/@PatchMapping/@DeleteMapping` trong 24 Controller |
| **JPA Entities** | **48** | Đếm tổng số class `@Entity` trong `backend/src/main/java` |
| **Bảng Database mục tiêu (PostgreSQL)** | **61** | **54 bảng `core`** + **7 bảng `ops`** (sau V64–V68, gồm `ops.audit_logs` mở rộng tại V68) |
| **Flyway Migrations** | **68** | `V1__init_schema.sql` → `V68__extend_ops_audit_logs.sql` |
| **Scheduled Jobs (`@Scheduled`)** | **8** | Chạy nền định kỳ (Idempotency cleanup, Financial schedules, Weekly allowance, Daily/Weekly notifications, Audit retention) |
| **Màn hình Web (`*Screen*.tsx`)** | **41** | 26 màn hình User/Landing/Legal + 15 màn hình Admin Portal (`AdminPlaceholderScreen.tsx` là placeholder) |
| **Màn hình Mobile (`*Screen*.tsx`)** | **30** | React Native + Expo (`SavingDetailScreen.tsx` ánh xạ vào `goalsApi`) |
| **Chức năng AI & OCR** | **8** | FinAI Chat (LangGraph/Gemini), FinAI Action Agent (23 tools: 9 READ + 14 WRITE), Balance/Spending/Category/Goal Forecasting (Prophet), Anomaly Detection (IsolationForest), Behavior Profiling, Recommendations, OCR Receipt Extraction (PaddleOCR + ML Line Classifier), Category Classification |
| **Test Files Backend** | **19** | 18 unit/security/service test suites (77 test cases PASS) + `FinanceApplicationTests` (integration context, cần PostgreSQL live) |

### A.2. Phương pháp đếm & quy tắc chống trùng lặp
1. **Không đếm trùng Web và Mobile thành 2 nghiệp vụ**: Ví dụ "Quản lý giao dịch thu/chi/chuyển tiền" được tính là **1 chức năng nghiệp vụ chính**, nhưng khối lượng giao diện Web (`CashFlowManagementScreen.tsx`, `AddTransactionScreen.tsx`) và Mobile (`TransactionsScreen.tsx`, `AddTransactionScreen.tsx`) được chấm điểm riêng ở cột **Web** và **Mobile**.
2. **Tách riêng chức năng chưa triển khai / tương lai**: Các bảng giữ lại cho tương lai (16 bảng trong DB) hoặc màn hình chưa có backend riêng (ví dụ `Savings` dùng chung `Goal` + `Account`) được ghi rõ trạng thái thực tế thay vì đếm ngang hàng với chức năng hoàn chỉnh.
3. **Tính cả khối lượng kỹ thuật chạy ngầm**: Security, Transaction consistency, Idempotency, Scheduled jobs, Audit log, Docker/Nginx đều được thống kê thành một nhóm khối lượng độc lập ở Phần E.

---

## PHẦN B – BẢNG KIỂM KÊ TOÀN BỘ CHỨC NĂNG

| STT | Module | Chức năng | Nghiệp vụ chính | Backend | Web | Mobile | AI | Trạng thái | Độ khó (1–5) |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | `auth` | Đăng ký, đăng nhập, OTP, 2FA, Refresh Token | Xác thực JWT, khóa brute-force, 2FA email OTP, quản lý thiết bị | `AuthController`, `AuthService`, `TokenService` | `LandingScreen` (modal auth) | `LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 2 | `auth` | Đăng nhập Google OAuth2 | Verify `GoogleIdToken`, tự tạo/liên kết `oauth_accounts` | `AuthService.authenticateWithGoogle` | Có | Có | N/A | Hoàn thiện đầy đủ | 4 |
| 3 | `user` | Hồ sơ cá nhân & cài đặt bảo mật | Sửa hồ sơ, đổi MK, bật/tắt 2FA, cảnh báo đăng nhập, upload avatar nén | `UserController`, `UserService` | `ProfileScreen` | `ProfileScreen`, `SecurityScreen`, `NotificationSettingsScreen` | N/A | Hoàn thiện đầy đủ | 3 |
| 4 | `dashboard` | Tổng quan tài chính cá nhân | Tổng hợp số dư, thu/chi, ngân sách, mục tiêu, giao dịch gần đây | Kết hợp `Account`, `Transaction`, `Budget`, `Goal` | `DashboardScreen` | `HomeScreen` | N/A | Hoàn thiện đầy đủ | 3 |
| 5 | `account` | Quản lý ví / tài khoản & điều chỉnh số dư | CRUD ví (Tiền mặt, Ngân hàng, Ví điện tử, Thẻ...), lịch sử số dư, điều chỉnh số dư | `AccountController`, `AccountService` | `AccountManagementScreen` | `AccountsScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 6 | `transaction` | Quản lý giao dịch Thu / Chi / Chuyển ví | Tạo/sửa/xóa/tách giao dịch, hoàn tác số dư cũ, `balance_before`/`balance_after`, đính kèm hóa đơn | `TransactionController`, `TransactionService` | `AddTransactionScreen`, `CashFlowManagementScreen` | `AddTransactionScreen`, `TransactionsScreen` | N/A | Hoàn thiện đầy đủ | 5 |
| 7 | `transaction` | Xuất báo cáo tài chính PDF/Excel | Tổng hợp thu chi theo kỳ và xuất PDF / Excel | `ReportExportController`, `FinancialReportPdfService` | `FinancialReportScreen`, `FinancialReportsDashboardScreen` | `PeriodicReportsScreen` | N/A | Hoàn thiện đầy đủ | 3 |
| 8 | `category` | Quản lý danh mục thu chi | Danh mục hệ thống + danh mục tùy chỉnh tối đa 2 cấp | `CategoryController`, `CategoryService` | Tích hợp trong màn hình GD/Ngân sách | Tích hợp trong màn hình GD/Ngân sách | N/A | Hoàn thiện đầy đủ | 2 |
| 9 | `budget` | Quản lý ngân sách & cảnh báo vượt mức | Tạo/sửa/xóa/nhân bản ngân sách theo kỳ & danh mục, tính % tiêu dùng, cảnh báo | `BudgetController`, `BudgetService` | `BudgetManagementScreen` | `BudgetScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 10 | `goal` | Quản lý mục tiêu tài chính (và Tiết kiệm) | Tạo mục tiêu, nạp/rút tiền (tạo giao dịch thật), tiến độ, hoàn thành | `GoalController`, `GoalService` | `GoalsManagementScreen`, `BudgetAndGoalsScreen` | `GoalsScreen`, `GoalDetailScreen`, `SavingDetailScreen` | N/A | Hoàn thiện đầy đủ (`Savings` dùng chung `Goal`) | 4 |
| 11 | `debt` | Quản lý khoản vay và cho vay | Theo dõi Đi vay/Cho vay, trả nợ gốc+lãi, tất toán, nhắc hạn | `DebtController`, `DebtService` | `DebtManagementScreen` | `DebtScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 12 | `schedule` | Lịch tài chính & giao dịch định kỳ | Tạo lịch thu/chi định kỳ (RRULE), skip/execute thủ công & tự động chạy ngầm | `ScheduleController`, `ScheduleService`, `RecurrenceService` | `FinancialRemindersScreen` | `RemindersScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 13 | `ocr` | Quét hóa đơn OCR & tạo giao dịch | Upload hóa đơn → PaddleOCR + ML Line Classifier → `DRAFT` (Chưa tạo) → Tạo GD (`PAID`, chỉ xem) | `OcrController`, `OcrService` | `InvoiceOcrScreen` | `ScanInvoiceScreen` | `ai/ocr-service` | Hoàn thiện đầy đủ | 5 |
| 14 | `group` | Quản lý nhóm tài chính & thành viên | Tạo/lưu trữ/xóa nhóm, mời/duyệt/xóa thành viên, phân quyền `OWNER/ADMIN/MEMBER` | `GroupController`, `GroupService` | `GroupManagementScreen` | `GroupScreen` | N/A | Hoàn thiện đầy đủ | 4 |
| 15 | `group` | Quỹ nhóm & Chi tiêu nhóm (chia tiền) | Đóng quỹ nhóm, chi tiêu nhóm chia đều/tỷ lệ/phần, đồng bộ GD cá nhân | `GroupController`, `GroupFundService`, `GroupExpenseService` | `GroupManagementScreen` | `GroupScreen` | N/A | Hoàn thiện đầy đủ | 5 |
| 16 | `group` | Cân đối & thanh toán công nợ nhóm | Tính công nợ ròng giữa thành viên, tạo/xác nhận/từ chối bù trừ công nợ | `GroupController`, `GroupSettlementService` | `GroupManagementScreen` | `GroupScreen` | N/A | Hoàn thiện đầy đủ | 5 |
| 17 | `group` | Trò chuyện nhóm & Bình luận giao dịch | Nhắn tin nhóm, đính kèm ảnh có signed URL kiểm tra quyền thành viên, bình luận chi tiêu | `GroupMessageService`, `CommentService` | `GroupManagementScreen` | `GroupScreen` | N/A | Hoàn thiện đầy đủ (polling/refresh, chưa WebSocket) | 3 |
| 18 | `group` (Kids) | Ví của bé, Xin tiền & Nhiệm vụ nhận thưởng | Tạo ví trẻ em, phụ cấp tuần tự động, bé xin tiền/chi tiêu, nhiệm vụ nhận thưởng | `ChildController`, `ChildWalletService`, `ChildManagementService` | `ChildWalletScreen`, `ChildCashFlowScreen`, `ChildChoresScreen`, `ChildMoneyRequestsScreen` | `ChildWalletScreen`, `ChildChoresScreen`, `ChildMoneyRequestsScreen` | N/A | Hoàn thiện đầy đủ | 5 |
| 19 | `group` (Kids) | Kiểm soát quyền riêng tư & chia sẻ dữ liệu của trẻ | Phụ huynh gửi yêu cầu xem chi tiêu của bé, bé chấp thuận/từ chối/thu hồi quyền | `ChildDataSharingService` | Tích hợp trong `GroupManagementScreen` / `ChildWalletScreen` | Có | N/A | Hoàn thiện đầy đủ | 4 |
| 20 | `finai` | FinAI Assistant (Chat & Tool Calling) | Trợ lý tài chính tiếng Việt (Gemini + LangGraph), 9 READ tools truy vấn dữ liệu thật | `FinAiController`, `FinAiInternalToolController` | `AIAssistantScreen` | `AiAssistantScreen` | `pfm-ai-service` (`/api/v1/agent/chat`, `/api/chat`) | Hoàn thiện đầy đủ | 5 |
| 21 | `finai` | FinAI Action Agent (Pending Action & Confirm) | 14 WRITE tools đề xuất hành động có TTL, user bấm Xác nhận mới thực thi DB transaction + Audit | `FinAiActionService`, `FinAiActionExecutionService` | `AIAssistantScreen` | `AiAssistantScreen` | `action_agent.py` | Hoàn thiện đầy đủ | 5 |
| 22 | `analytics` | Dự báo số dư, chi tiêu & mục tiêu | Dự báo chuỗi thời gian bằng Prophet + fallback thống kê | `AiAnalyticsController`, `AiAnalyticsClient` | `FinancialForecastScreen` | `BalanceForecastScreen` | `forecaster.py`, `forecast_engine.py` | Hoàn thiện đầy đủ | 4 |
| 23 | `analytics` | Phân tích hành vi, bất thường & gợi ý | Phát hiện chi tiêu bất thường (`IsolationForest`), phân nhóm hành vi, khuyến nghị | `AiAnalyticsController` | `SpendingAnalysisScreen` | `SpendingAnalysisScreen` | `anomaly_engine.py`, `behavior_engine.py`, `recommender.py` | Hoàn thiện đầy đủ | 4 |
| 24 | `notification` | Thông báo người dùng & nhắc nhở tự động | Quản lý thông báo, đánh dấu đã đọc, job nhắc nợ/ngân sách/lịch định kỳ | `NotificationController`, `NotificationService`, `DailyNotificationScheduler` | `NotificationScreen` | `NotificationsScreen` | N/A | Hoàn thiện (In-app + Email; Push FCM/APNs chưa hoàn thiện) | 3 |
| 25 | `feedback` | Gửi phản hồi & Admin trả lời | Người dùng gửi feedback, Admin lọc & phản hồi | `UserFeedbackController`, `UserFeedbackService` | `UserFeedbackScreen`, `AdminFeedbacksScreen` | `HelpCenterScreen` (một phần) | N/A | Hoàn thiện Web/BE | 2 |
| 26 | `admin` | Quản trị hệ thống & Giám sát (Admin Portal) | Dashboard, User management (khóa 1 Admin duy nhất), Role stats, System Categories, OCR/AI stats, Broadcast, Settings, Health | `AdminController`, `AdminService`, `SystemConfigService` | 14 màn hình Admin (`Admin*Screen`) | N/A (Web-only) | `/api/ai/admin/stats` | Hoàn thiện Web/BE (`AdminPlaceholderScreen` là stub) | 4 |
| 27 | `admin` | Nhật ký Quản trị (`core.audit_logs`) | Ghi nhận và tra cứu thao tác quản trị viên | `AdminController`, `AdminService` | `AdminAuditLogsScreen` (tab Quản trị) | N/A | N/A | Hoàn thiện đầy đủ | 2 |
| 28 | `audit` | Enterprise System Audit Log (`ops.audit_logs`) | Truy vết bảo mật & nghiệp vụ toàn hệ thống, append-only, sanitize, xem trên Admin qua mật khẩu `.env` | `SystemAuditService`, `RequestContextFilter`, `AuditDataSanitizer`, `SystemAuditAdminController` | `AdminAuditLogsScreen` (tab Hệ thống khóa MK) | N/A | Liên kết `FINAI`/`OCR` | Hoàn thiện (chờ chạy V68 + test trên PG live) | 5 |
| 29 | `system` | Ngân hàng, Gói dịch vụ, Pháp lý, Onboarding | Danh sách ngân hàng, bảng giá Public/Premium, Điều khoản, Chính sách bảo mật | `BankController`, `PublicPricingController` | `LandingScreen`, `PricingScreen`, `PrivacyPolicyScreen`, `TermsOfServiceScreen` | `SplashScreen`, `AboutFinoraScreen`, `SystemSettingsScreen` | N/A | Hoàn thiện đầy đủ | 2 |

---

## PHẦN C – PHÂN TÍCH CHI TIẾT TỪNG MODULE

### C.1. Module `auth` & `user` (Xác thực, Phân quyền & Hồ sơ)
1. **Tổng quan**: Quản lý vòng đời định danh người dùng trên Web và Mobile: đăng ký OTP email, đăng nhập mật khẩu, khóa brute-force, 2FA qua OTP email, Google OAuth2, refresh token theo thiết bị, đổi/đặt lại mật khẩu, hồ sơ và cài đặt bảo mật.
2. **Chức năng chính**: Đăng ký có OTP (`ALLOW_REGISTRATION` configurable), Đăng nhập + 2FA, Google Sign-In, Quên/Đặt lại mật khẩu, Đăng xuất (1 hoặc tất cả thiết bị), Quản lý thiết bị đang hoạt động, Đổi mật khẩu, Cập nhật hồ sơ & Avatar, Bật/tắt 2FA & Login Alert.
3. **Luồng nghiệp vụ & Business Rules**:
   - Đăng nhập kiểm tra `MAINTENANCE_MODE` (chỉ `ADMIN` vào được khi bảo trì), kiểm tra `lockedUntil`, kiểm tra BCrypt (`BCryptPasswordEncoder(12)`). Sai mật khẩu tăng `failedLoginAttempts`; đạt `maxLoginAttempts` (mặc định 5) thì khóa `lockoutDurationMinutes` (15 phút) và gửi email cảnh báo.
   - Nếu `mfaEnabled = true` và request chưa có `otp`, server sinh OTP 6 số (`SecureRandom`), lưu vào `core.auth_tokens` (TTL 10 phút), gửi email và trả `requires2fa = true`.
   - Google OAuth2: verify `idToken` bằng `GoogleIdTokenVerifier` với danh sách `googleClientId`, `googleIosClientId`, `googleAndroidClientId`; nếu chưa có user thì tự tạo user + bản ghi `core.oauth_accounts`.
4. **Backend**: `AuthController`, `AuthService`, `TokenService`, `JwtAuthenticationFilter`, `JwtTokenProvider`, `CustomUserDetailsService`, `UserController`, `UserService`.
5. **Web & Mobile**: Web dùng modal auth trong `LandingScreen.tsx` + `ProfileScreen.tsx`; Mobile tách riêng `LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`, `ProfileScreen`, `SecurityScreen`, `NotificationSettingsScreen`.
6. **Database**: `core.users`, `core.auth_tokens`, `core.refresh_tokens`, `core.oauth_accounts`.
7. **Bảo mật**: BCrypt cost 12, JWT HMAC-SHA256 (`iss = finance-app`), `AuthService` + `UserService` ghi `ops.audit_logs` (dùng HMAC-SHA256 che email khi login sai).
8. **Độ phức tạp & Khối lượng**: Nghiệp vụ **4/5**, Backend **4/5**, Bảo mật **5/5**, Web **3/5**, Mobile **4/5**.

### C.2. Module `account` & `transaction` & `category` (Ví, Giao dịch & Danh mục)
1. **Tổng quan**: Lõi sổ cái tài chính cá nhân, quản lý nhiều loại ví và mọi biến động tiền (`INCOME`, `EXPENSE`, `TRANSFER`), đồng bộ với Ngân sách, Mục tiêu, Nợ, OCR, Nhóm và Báo cáo.
2. **Luồng nghiệp vụ quan trọng (Chuyển tiền / Sửa / Xóa giao dịch)**:
   - Tài khoản trẻ em bị chặn tạo giao dịch cá nhân trực tiếp (phải đi qua `ChildManagementService`).
   - **Tạo giao dịch (`createTransaction`)**: Khóa/kiểm tra quyền sở hữu `accountId` (và `toAccountId` nếu `TRANSFER`), tính `balanceBefore`, `balanceAfter` (trừ cả `transferFee` nếu là `TRANSFER`), lưu `balance_before` và `balance_after` vào `core.transactions` (V67), cập nhật số dư ví, kiểm tra cảnh báo ngân sách, ghi `ops.audit_logs` (`MANDATORY_FAIL_CLOSED`).
   - **Sửa giao dịch (`updateTransaction`)**: Kiểm tra `@Version` (optimistic locking), validate toàn bộ tham chiếu mới *trước* khi sửa, hoàn tác ảnh hưởng số dư cũ (`revertAccountBalancesForTransaction`), cập nhật field, áp dụng ảnh hưởng số dư mới (`applyAccountBalancesForTransaction`), đồng bộ ngược sang OCR receipt / Goal / Debt / Group / Schedule liên kết.
   - **Xóa giao dịch (`deleteTransaction`)**: Soft delete (`deleted_at`), hoàn tác số dư ví, gỡ liên kết `receipt.transactionId` (để hóa đơn quay về trạng thái "Chưa tạo" trong OCR), đồng bộ hoàn tác sang Goal / Debt / Group / Schedule.
3. **Web & Mobile**: Web (`AccountManagementScreen`, `AddTransactionScreen`, `CashFlowManagementScreen`, `FinancialReportsDashboardScreen`), Mobile (`AccountsScreen`, `AddTransactionScreen`, `TransactionsScreen`, `PeriodicReportsScreen`). Cả 2 đều hỗ trợ tách giao dịch, lọc đa điều kiện, xem số dư trước/sau GD, xuất Excel/PDF.
4. **Database**: `core.accounts`, `core.transactions` (có check constraint ràng buộc `TRANSFER` vs `INCOME/EXPENSE` và `balance_before`/`balance_after`), `core.categories`, `core.banks`.
5. **Độ phức tạp & Khối lượng**: Nghiệp vụ **5/5**, Backend **5/5**, Database **5/5**, Web **4/5**, Mobile **4/5**.

### C.3. Module `budget`, `goal`, `debt`, `schedule` (Kế hoạch & Nghĩa vụ tài chính)
1. **Ngân sách (`budget`)**: Hỗ trợ `Budget` tổng và `BudgetItem` theo danh mục, kiểm tra chồng lấn kỳ (`OverlappingBudgetException`), tính toán lại `spentAmount` và `AlertLevel` (`OK`, `WARNING`, `EXCEEDED`), nhân bản ngân sách giữa các tháng.
2. **Mục tiêu (`goal`)**: Khởi tạo mục tiêu (mặc định `currentAmount = BigDecimal.ZERO` nếu null/thiếu, validate biên và giới hạn), nạp tiền (`contribute`) và rút tiền (`withdraw`) có tạo giao dịch thật trên ví nguồn, tự động chuyển `ACHIEVED` khi đạt target. Lưu ý: màn hình `SavingDetailScreen.tsx` trên Mobile dùng chung API của `Goal` (không có module `Savings` riêng ở Backend).
3. **Công nợ (`debt`)**: Phân biệt `BORROWING` (đi vay) và `LENDING` (cho vay), ghi nhận thanh toán (`recordPayment`) tách gốc/lãi, cập nhật `remainingAmount`, tự động chuyển `PAID_OFF`, liên kết giao dịch ví và thông báo nhắc hạn.
4. **Lịch định kỳ (`schedule`)**: `RecurrenceService` parse quy tắc lặp (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), sinh `ScheduleOccurrence` trước khi thực thi để tránh chạy trùng khi restart. `FinancialScheduleScheduler` quét mỗi 5 phút (`processDueSchedules`) và mỗi giờ (`sendUpcomingScheduleNotifications`), sử dụng `eventId` deterministic khi ghi `ops.audit_logs`.
5. **Độ phức tạp**: Nghiệp vụ **4/5**, Backend **4/5**, Database **4/5**.

### C.4. Module `group` (Chi tiêu nhóm, Quỹ nhóm, Công nợ nhóm & Ví của bé)
1. **Nhóm, Thành viên & Quỹ nhóm**: Tạo nhóm tự động tạo `GroupFund` rỗng tách biệt hoàn toàn khỏi ví cá nhân; mời thành viên qua invitation, phân quyền `OWNER`, `ADMIN`, `MEMBER`.
2. **Chi tiêu nhóm & Bù trừ (`GroupExpenseService`, `GroupSettlementService`)**:
   - Hỗ trợ chia tiền (`EQUAL`, `PERCENTAGE`, `EXACT`, `SHARES`), lưu `core.group_expenses` + `core.expense_splits`.
   - Hỗ trợ thanh toán từ ví cá nhân (đồng bộ tạo `Transaction` cá nhân) hoặc từ `GROUP_FUND`.
   - Tính số dư ròng giữa các thành viên; tạo `GroupSettlement` (`PENDING`) → người nhận xác nhận (`CONFIRMED`) tự động cộng tiền vào ví nhận.
3. **Trò chuyện & Bình luận (`GroupMessageService`, `CommentService`)**: Tin nhắn nhóm, đánh dấu đã đọc, upload ảnh đính kèm nén và cấp phát **signed download URL** (`AttachmentUrlSigner`) kiểm tra tư cách thành viên nhóm trước khi trả file.
4. **Ví của bé & Quyền riêng tư (`ChildWalletService`, `ChildManagementService`, `ChildDataSharingService`)**:
   - Phụ huynh tạo ví cho bé, cấu hình hạn mức/phụ cấp tự động hằng tuần (`WeeklyAllowanceScheduler` chạy 06:00 sáng mỗi ngày).
   - Bé tạo yêu cầu xin tiền hoặc chi tiêu (`ChildSpendRequest`); phụ huynh duyệt/từ chối; phụ huynh giao việc (`ChildChore`) → bé hoàn thành → phụ huynh duyệt trả thưởng vào ví bé.
   - Cơ chế đồng thuận dữ liệu: phụ huynh gửi `ChildDataSharingRequest`, chính tài khoản bé quyết định `APPROVE`/`REJECT`/`REVOKED`.
5. **Độ phức tạp**: Đây là một trong các cụm nghiệp vụ phức tạp nhất hệ thống: Nghiệp vụ **5/5**, Backend **5/5** (`GroupController` có tới **78 endpoints**), Database **5/5**, Web **5/5**, Mobile **5/5**.

### C.5. Module `finai`, `ocr` & `analytics` (Trợ lý AI, Action Agent, OCR & Dự báo)
1. **FinAI Action Agent (`backend/.../finai` + `pfm-ai-service/action_agent.py`)**:
   - **Kiến trúc Trust Boundary**: Python AI Service (`FastAPI`) gọi Gemini (`ChatGoogleGenerativeAI`) thực hiện bounded function-calling (giới hạn `FINAI_MAX_MODEL_ROUNDS=6`, `FINAI_MAX_TOOL_CALLS=8`, `FINAI_TOOL_TIMEOUT_SECONDS=8`).
   - **23 Tools (`FinAiToolRegistry`)**: 9 **READ tools** thực thi trực tiếp qua `POST /api/internal/v1/finai/tools/execute` (xác thực bằng `X-Finai-Internal-Secret` + HMAC-signed `X-Finai-Context` chống giả mạo `userId`); 14 **WRITE tools** KHÔNG ghi DB ngay mà tạo `FinAiPendingAction` (`PENDING`, TTL 15 phút) lưu vào `core.finai_pending_actions`.
   - **Xác nhận & Chống trùng lặp**: User bấm Xác nhận → `FinAiActionExecutionService.execute` khóa dòng (`findOwnedForUpdate`), kiểm tra trạng thái/TTL, thực thi service nghiệp vụ và ghi `COMPLETED` trong **cùng 1 DB transaction**; nếu lỗi thì `markFailed` chạy trong `REQUIRES_NEW`. Mọi bước đều ghi `core.finai_action_audit_logs` và liên kết sang `ops.audit_logs`.
2. **OCR Hóa đơn (`backend/.../ocr` + `ai/ocr-service`)**:
   - `ai/ocr-service` (FastAPI): tiền xử lý ảnh OpenCV (xoay góc, resize), nhận diện chữ bằng **PaddleOCR**, trích xuất trường (`merchant`, `date`, `time`, `totalAmount`) kết hợp **ML Line Classifier** (`ml/predictor.py`) và phân loại danh mục chi tiêu (`classify/predictor.py`), từ chối ảnh mờ/viết tay/phiếu tạm tính.
   - Backend lưu `core.receipts` (`transactionId = null` → mục "Chưa tạo"). Khi user xác nhận tạo giao dịch (`createTransactionFromOcr`), kiểm tra chống tạo lặp (`transactionId != null` → `409 Conflict`), trừ tiền ví và gắn `transactionId` (chuyển sang "Đã tạo", Web & Mobile khóa chế độ chỉ xem).
3. **AI Analytics (`backend/.../analytics` + `pfm-ai-service`)**:
   - Dự báo số dư/chi tiêu/danh mục/mục tiêu (`forecaster.py`, `forecast_engine.py` dùng **Prophet**).
   - Phát hiện chi tiêu bất thường (`anomaly_detector.py`, `anomaly_engine.py` dùng **IsolationForest** `scikit-learn`).
   - Hồ sơ hành vi & gợi ý tiết kiệm (`behavior_profiler.py`, `behavior_engine.py`, `recommender.py`).
4. **Độ phức tạp**: AI **5/5**, Backend **5/5**, Tích hợp **5/5**, Bảo mật **5/5**.

### C.6. Module `admin`, `audit`, `notification`, `feedback`, `system`
1. **Admin Portal (`AdminController`: 24 endpoints, `SystemAuditAdminController`: 2 endpoints)**: Quản lý tổng quan, user (khóa/mở khóa, gia hạn Premium, **đã khóa cứng chỉ 1 Admin duy nhất**), danh mục hệ thống, thống kê OCR/AI, gửi thông báo broadcast, chỉnh sửa template thông báo, cấu hình `SystemSetting` (`MAINTENANCE_MODE`, `ALLOW_REGISTRATION`...), System Health (RAM/CPU/DB), Nhật ký Quản trị (`core.audit_logs`) và Nhật ký Hệ thống bảo mật (`ops.audit_logs` mở khóa qua mật khẩu `.env` + HMAC token 10 phút + rate limit).
2. **Notification**: Thông báo in-app (`core.notifications`), cài đặt kênh, `DailyNotificationScheduler` (nhắc nợ/chi tiêu 20:00 mỗi ngày, tổng kết tuần 08:00 thứ Hai). Push notification FCM/APNs mới dừng ở mức cấu trúc device/preference, chưa gửi push thật.
3. **Feedback & System**: Gửi/trả lời phản hồi (`core.feedbacks`), danh mục ngân hàng (`core.banks`), bảng giá (`PublicPricingController`).

---

## PHẦN D – BẢNG ĐÁNH GIÁ KHỐI LƯỢNG CÔNG VIỆC THEO MODULE

> **Cách xác định khối lượng tương đối (Relative Effort)**: Không tính theo số dòng code hay số file thuần túy, mà tổng hợp từ 4 yếu tố: (1) Độ phức tạp quy tắc nghiệp vụ & công thức tài chính, (2) Độ khó xử lý transaction/concurrency/bảo mật, (3) Độ phủ đa nền tảng (BE + DB + Web + Mobile + AI/OCR), và (4) Khối lượng kiểm thử & đồng bộ dữ liệu liên module. Thang điểm từng cột: **1** (Rất đơn giản) → **5** (Rất phức tạp), **N/A** nếu không áp dụng.

| Module | Số chức năng chính | Nghiệp vụ | Backend | Database | Web | Mobile | AI | Bảo mật | Tích hợp | Khối lượng tương đối |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `transaction` + `account` + `category` | 4 | 5 | 5 | 5 | 4 | 4 | N/A | 5 | 5 | **Rất lớn (Core Ledger)** |
| `group` (Nhóm, Quỹ, Công nợ, Chat) | 4 | 5 | 5 | 5 | 5 | 5 | N/A | 4 | 4 | **Rất lớn** |
| `group` (Kids Wallet & Privacy) | 2 | 5 | 4 | 4 | 4 | 4 | N/A | 5 | 4 | **Lớn** |
| `finai` (Chat + Action Agent 23 tools) | 2 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 5 | **Rất lớn (AI + Trust Boundary)** |
| `ocr` (PaddleOCR + ML + Receipt Flow) | 1 | 4 | 4 | 3 | 4 | 4 | 5 | 4 | 5 | **Lớn** |
| `analytics` (Forecast, Anomaly, Behavior) | 2 | 4 | 3 | 3 | 4 | 4 | 5 | 3 | 4 | **Lớn** |
| `auth` + `user` (JWT, OAuth, 2FA, Profile) | 3 | 4 | 4 | 3 | 3 | 4 | N/A | 5 | 4 | **Lớn** |
| `budget` + `goal` + `debt` + `schedule` | 4 | 4 | 4 | 4 | 4 | 4 | N/A | 3 | 4 | **Lớn** |
| `audit` (Enterprise System Audit `ops.audit_logs`) | 1 | 4 | 5 | 5 | 2 | N/A | N/A | 5 | 5 | **Lớn (Nền tảng bảo mật)** |
| `admin` (14 màn hình Admin + `core.audit_logs`) | 2 | 3 | 4 | 3 | 4 | N/A | 1 | 4 | 3 | **Trung bình – Lớn** |
| `notification` + `feedback` + `system` | 3 | 2 | 3 | 3 | 3 | 3 | N/A | 3 | 3 | **Trung bình** |

---

## PHẦN E – KIẾN TRÚC & CÔNG VIỆC KỸ THUẬT TOÀN HỆ THỐNG (KHÔNG CÓ GIAO DIỆN)

### E.1. Kiến trúc tổng thể thực tế
- **Mô hình**: Modular Monolith (Spring Boot 4.1.1 / Java 21) kết hợp 2 AI Microservices (Python FastAPI: `pfm-ai-service` và `ai/ocr-service`), đứng sau **Nginx** reverse proxy (`nginx/nginx.conf`), lưu trữ dữ liệu trên **PostgreSQL 15**, triển khai bằng **Docker Compose** (`docker-compose.yml`, `docker-compose.prod.yml`).
- **Thực trạng Redis & MinIO (xác minh từ source code)**:
  - **Redis (`redis:7-alpine`)**: Đã khai báo trong `docker-compose.yml` và `application.yml`, nhưng `IdempotencyRateLimitFilter` hiện đang dùng `ConcurrentHashMap` in-memory (có chú thích có thể thay bằng Redis ở production), còn idempotency key lưu trong PostgreSQL (`IdempotencyService`).
  - **MinIO**: **Không tồn tại** trong `docker-compose.yml` hay code Java hiện tại; ảnh avatar, hóa đơn OCR và file đính kèm chat nhóm được lưu trực tiếp trên volume filesystem (`uploads/avatars`, `uploads/receipts`, `uploads/group-messages`) kết hợp nén ảnh (`ImageCompressionHelper`), cache đĩa ở Nginx (`proxy_cache_path`), và signed download URL (`AttachmentUrlSigner`).
  - **Realtime**: Chưa sử dụng WebSocket/STOMP; Web và Mobile đồng bộ qua **event emitter cục bộ** (`finaiSyncEvents.ts`, `finAiSyncEmitter.ts`) sau khi thực thi FinAI Action và **polling / focus-refresh** cho giao dịch, thông báo, chat nhóm.

### E.2. Danh sách 21 thành phần kỹ thuật nền tảng (Backend & Infra)
1. **Flyway Database Migration (`V1` → `V68`)** + **Hibernate `ddl-auto=validate`** (đã cleanup 12 bảng chết ở V64, dọn 24 enum ở V65, chuẩn hóa kiểu cột ở V66, thêm `balance_before`/`balance_after` ở V67, mở rộng `ops.audit_logs` ở V68).
2. **Spring Security Filter Chain**: `JwtAuthenticationFilter` (stateless JWT), `IdempotencyRateLimitFilter`, `auditRequestContextFilter` (Request ID / Correlation ID / MDC).
3. **Internal Service-to-Service Auth & Trust Boundary**: `FinAiContextTokenService` (HMAC-SHA256 ký context user giữa Backend ↔ Python AI) + `X-Finai-Internal-Secret`.
4. **Global Exception Handling (`GlobalExceptionHandler`)**: Chuẩn hóa `ErrorResponse`, chặn lộ stack trace/thông điệp nội bộ khi `AccessDeniedException` / `SecurityException`.
5. **Transaction Management & Optimistic Locking**: `@Transactional` fail-closed cho sổ cái tài chính, `@Version` chống ghi đè đồng thời trên `Transaction`, `Budget`, `Goal`, `Account`.
6. **Idempotency Framework**: `IdempotencyAspect` + `IdempotencyService` + `IdempotencyKey` + `FinAiActionExecutionService` (`findOwnedForUpdate` + `REQUIRES_NEW` khi fail).
7. **Enterprise System Audit Log (`ops.audit_logs`)**: Append-only trigger + Java Repository chỉ-ghi, `AuditDataSanitizer` (allowlist, chặn CRLF, che HMAC login failure), `SystemAuditViewerService` khóa bằng mật khẩu `.env` + token ngắn hạn + rate-limit.
8. **8 Scheduled Jobs (`@Scheduled`)**: `IdempotencyService` (2 jobs dọn key), `FinancialScheduleScheduler` (2 jobs lịch định kỳ), `WeeklyAllowanceScheduler` (phụ cấp tuần ví bé), `DailyNotificationScheduler` (2 jobs nhắc nhở), `AuditRetentionJob` (mặc định tắt).
9. **File Upload Security & Image Compression**: `FileUploadValidator` (kiểm tra magic bytes/MIME/kích thước), `ImageCompressionHelper` (resize & nén JPEG/PNG), `AttachmentUrlSigner` (HMAC signed URL cho chat nhóm).
10. **PDF Export Engine**: `FinancialReportPdfService` xuất báo cáo tài chính PDF.
11. **Demo Data Seeder & Test Suites**: `demo-seeder` trong Docker Compose; 19 file test Backend (77 unit/security tests PASS) + bộ test Python (`pfm-ai-service/test_*.py`, `ai/ocr-service/tests/test_extractor.py`).
12. **Docker, Nginx & Production Compose**: Multi-container orchestration (`postgres`, `redis`, `backend`, `pfm-ai-service`, `ocr-service`, `frontend-web`, `nginx`, `demo-seeder`), Nginx gzip + disk cache + security headers.

---

## PHẦN F – CÁC NGHIỆP VỤ & KỸ THUẬT CÓ CHIỀU SÂU CAO (TRỌNG TÂM BẢO VỆ ĐỒ ÁN)

1. **Sổ cái Giao dịch nguyên tử & Hoàn tác số dư (`TransactionService`)**:
   - *Vấn đề giải quyết*: Đảm bảo khi tạo/sửa/xóa giao dịch (đặc biệt `TRANSFER` có phí và đồng bộ sang Goal/Debt/Group/OCR), số dư các ví luôn chính xác tuyệt đối, lưu vết `balance_before`/`balance_after`, không bị race condition nhờ `@Version` và fail-fast validation.
2. **FinAI Action Agent với Trust Boundary & Human-in-the-loop (`FinAiActionExecutionService` + `action_agent.py`)**:
   - *Vấn đề giải quyết*: Ngăn LLM tự ý sửa DB hay bị prompt injection giả mạo `userId`. Python AI chỉ chạy trong khung giới hạn round/tool, WRITE tool chỉ sinh `PendingAction` có TTL; Spring Boot giữ toàn quyền verify HMAC context, kiểm tra ownership, khóa dòng (`PESSIMISTIC_WRITE`), thực thi và ghi `COMPLETED` trong cùng 1 transaction (hoặc `FAILED` qua `REQUIRES_NEW`).
3. **Pipeline OCR Hóa đơn Đa tầng (`ai/ocr-service` + `OcrService`)**:
   - *Vấn đề giải quyết*: Kết hợp OpenCV tiền xử lý xoay/nét → PaddleOCR nhận diện tiếng Việt → ML Line Classifier + Regex/Rule trích xuất trường tiền Việt Nam → phân loại danh mục → phân tách trạng thái `DRAFT` (Chưa tạo) và `PAID` (Đã tạo, chỉ xem, chặn tạo giao dịch 2 lần).
4. **Tài chính Nhóm, Chia tiền & Bù trừ công nợ + Ví trẻ em (`GroupExpenseService`, `GroupSettlementService`, `ChildWalletService`, `ChildDataSharingService`)**:
   - *Vấn đề giải quyết*: Tách biệt quỹ nhóm với ví cá nhân, chia tiền đa phương thức, bù trừ công nợ ròng, đồng thuận quyền riêng tư dữ liệu trẻ em (chính bé duyệt/thu hồi quyền xem của phụ huynh).
5. **Enterprise System Audit Log (`ops.audit_logs`) & Bảo mật đa lớp**:
   - *Vấn đề giải quyết*: Tách bạch Admin Audit (`core.audit_logs`), FinAI Audit (`core.finai_action_audit_logs`) và System Audit (`ops.audit_logs`); xử lý `MANDATORY_FAIL_CLOSED` vs `MANDATORY_REQUIRES_NEW`, `AuditDataSanitizer` chống lộ secret/CRLF injection, trigger append-only và cổng xem có mật khẩu `.env` + khóa brute-force + khóa 1 Admin duy nhất.
6. **Chẩn đoán & Dự báo AI (`Prophet` + `IsolationForest`)**:
   - *Vấn đề giải quyết*: Phân biệt rõ phần dùng model ML/thống kê (`Prophet`, `IsolationForest`) và phần dùng LLM API (`Gemini`) kết hợp logic xử lý chuỗi thời gian & fallback khi thiếu dữ liệu lịch sử.

---

## PHẦN G – ĐỐI CHIẾU MỨC ĐỘ HOÀN THIỆN & TỔNG HỢP PHỤC VỤ PHÂN CHIA

### G.1. Các hạng mục chưa hoàn thiện / lưu ý thực tế (tránh đánh đồng khi phân chia)
- **Push Notification (FCM/APNs)**: Mới có quản lý device token & preferences, chưa có worker đẩy push notification thật ra FCM/APNs.
- **Realtime WebSocket**: Chưa triển khai STOMP/WebSocket; đang dùng polling/refresh + event emitter cục bộ.
- **MinIO & Redis Rate-limit**: MinIO chưa tích hợp vào Backend (đang lưu disk local + Nginx cache); Redis đã chạy container nhưng rate-limit filter đang dùng `ConcurrentHashMap`.
- **Module `Savings` độc lập**: Không có bảng/service riêng ở Backend; màn hình `SavingDetailScreen.tsx` trên Mobile dùng chung `Goal` + `Account`.
- **Placeholder / Legacy**: `AdminPlaceholderScreen.tsx` trên Web; `FinAiLegacyController.java` song song với `FinAiController.java`.
- **Giới hạn kiểm thử môi trường hiện tại**: Trong sandbox chưa chạy được PostgreSQL live nên `FinanceApplicationTests` (Hibernate `ddl-auto=validate` với V67–V68) và benchmark hiệu năng PostgreSQL cần chạy xác nhận trên Docker/PostgreSQL thật.

### G.2. Bảng tổng hợp các cụm công việc (Chưa gán cho thành viên cụ thể)

| STT | Nhóm công việc (Work Package) | Phạm vi chức năng | Nghiệp vụ | Thành phần kỹ thuật | Độ khó | Khối lượng tương đối | Module phụ thuộc |
|---:|---|---|---|---|---:|---|---|
| 1 | **WP1 – Kiến trúc Lõi, Bảo mật, Database & Audit** | `auth`, `user`, `audit`, `system`, `admin` (bảo mật/health) | Đăng ký OTP, Login/2FA, Google OAuth, JWT, Phân quyền, Khóa 1 Admin, System Audit Log (`ops.audit_logs`) | Flyway V1–V68, `SecurityConfig`, `JwtAuthenticationFilter`, `RequestContextFilter`, `SystemAuditService`, `AuditDataSanitizer`, `GlobalExceptionHandler`, `IdempotencyService`, Docker/Nginx | 5 | **Rất lớn** | Nền tảng cho toàn bộ 18 module |
| 2 | **WP2 – Lõi Sổ cái Tài chính Cá nhân** | `account`, `transaction`, `category`, `dashboard`, Báo cáo PDF/Excel | Quản lý ví, Thu/Chi/Chuyển tiền, `balance_before`/`after`, Hoàn tác số dư, Tách GD, Báo cáo PDF/Excel | `TransactionService`, `AccountService`, `FinancialReportPdfService`, Optimistic locking (`@Version`), Web (`CashFlowManagement`, `AccountManagement`, `Dashboard`, `Reports`), Mobile (`Transactions`, `Accounts`, `Home`, `PeriodicReports`) | 5 | **Rất lớn** | Phụ thuộc `WP1`; bị `WP3`, `WP4`, `WP5` gọi lại |
| 3 | **WP3 – Kế hoạch, Nghĩa vụ Tài chính & Lập lịch** | `budget`, `goal` (gồm tiết kiệm), `debt`, `schedule`, `notification`, `feedback` | Ngân sách & cảnh báo, Mục tiêu nạp/rút, Vay/Cho vay & trả nợ, Lịch định kỳ RRULE, Nhắc nhở tự động, Phản hồi | `BudgetService`, `GoalService`, `DebtService`, `ScheduleService`, `RecurrenceService`, 4 Scheduled Jobs (`FinancialScheduleScheduler`, `DailyNotificationScheduler`), Web & Mobile screens | 4 | **Lớn** | Phụ thuộc `WP1`, `WP2` (`TransactionService`, `AccountService`) |
| 4 | **WP4 – Tài chính Nhóm & Ví của bé** | `group` (Nhóm, Quỹ, Chia tiền, Công nợ, Chat/Comment, Ví bé, Nhiệm vụ, Quyền riêng tư) | Quản lý nhóm/quyền, Quỹ nhóm, Chia tiền đa phương thức, Bù trừ công nợ, Chat + Signed Attachment, Ví bé, Xin tiền, Nhiệm vụ thưởng, Đồng thuận dữ liệu trẻ | `GroupController` (78 endpoints), `GroupService`, `GroupExpenseService`, `GroupSettlementService`, `GroupFundService`, `GroupMessageService`, `ChildWalletService`, `ChildManagementService`, `ChildDataSharingService`, `WeeklyAllowanceScheduler`, `AttachmentUrlSigner`, Web & Mobile screens | 5 | **Rất lớn** | Phụ thuộc `WP1`, `WP2` |
| 5 | **WP5 – Hệ sinh thái AI, Action Agent, OCR & Analytics** | `finai`, `ocr`, `analytics` | FinAI Chat (9 READ tools), Action Agent (14 WRITE tools + Pending/Confirm), OCR Hóa đơn (PaddleOCR + ML + DRAFT/PAID), Dự báo Prophet, Bất thường IsolationForest, Hành vi & Gợi ý | `pfm-ai-service` (FastAPI, Gemini, LangGraph, Prophet, IsolationForest), `ai/ocr-service` (FastAPI, OpenCV, PaddleOCR, ML), `FinAiContextTokenService` (HMAC), `FinAiActionExecutionService`, `OcrService`, Web & Mobile AI/OCR/Forecast/Analysis screens | 5 | **Rất lớn** | Phụ thuộc `WP1`, `WP2`, `WP3`, `WP4` (đọc/ghi qua internal/service layer) |
| 6 | **WP6 – Cổng Quản trị Hệ thống (Admin Portal)** | `admin` (14 màn hình quản trị Web) | Tổng quan hệ thống, Quản lý User, Danh mục hệ thống, Thống kê AI/OCR, Broadcast & Templates, Cấu hình hệ thống, Nhật ký Admin (`core.audit_logs`) + Giao diện Nhật ký Hệ thống | `AdminController`, `AdminService`, `SystemConfigService`, `SystemAuditAdminController`, 14 màn hình `Admin*Screen.tsx` trên Web | 3–4 | **Trung bình – Lớn** | Phụ thuộc `WP1`, `WP5` (stats) |
