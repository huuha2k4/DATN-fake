# FINORA — FULL ADMIN SYSTEM AUDIT REPORT

> Ngày audit: 27/11/2026 (Asia/Bangkok)  
> Baseline: branch `main`, commit `edb74f0` (`update`)  
> Phạm vi: Frontend Web Admin, Spring Boot Backend, PostgreSQL migrations, FinAI/Python service, OCR service, Docker/Nginx và các cơ chế authentication/audit liên quan.  
> Chế độ: **AUDIT ONLY** — không sửa source, schema, dependency, cấu hình, dữ liệu hay FinAI Agent.

## 1. Executive Summary

Admin Finora đã có một khung quản trị tương đối rộng: 12 trang được route, 26 API Admin, guard ở Frontend và authorization `ROLE_ADMIN` ở Backend, light/dark mode, lazy-loaded routes, các trạng thái loading/error cơ bản, hệ thống audit cấp enterprise và một số nghiệp vụ thật như quản lý người dùng, danh mục, feedback, broadcast, cấu hình và health check.

Tuy nhiên hệ thống **chưa sẵn sàng để coi là Admin production-grade**. Lỗi nghiêm trọng nhất là thao tác khóa tài khoản không khóa được truy cập thực tế: password login, Google login, refresh token và access token hiện hữu đều có đường đi bỏ qua trạng thái `LOCKED`. Ngoài ra, nhiều chỉ số mang nhãn “thật” nhưng là hardcode/fallback hoặc diễn giải sai; phần lớn truy vấn Admin dùng `findAll()` rồi lọc/đếm trong JVM; legacy audit log ghi actor/IP giả; API danh mục không kiểm tra bản ghi thực sự là danh mục hệ thống; monitoring chỉ phản ánh JVM Backend và PostgreSQL nhưng UI diễn giải thành toàn hệ thống.

### 1.1 Tổng hợp định lượng

| Hạng mục | Số lượng | Ghi chú |
|---|---:|---|
| Tổng phân hệ Admin | 12 | Theo 12 route/page nghiệp vụ |
| Tổng trang Admin | 12 | Không có route detail riêng; detail dùng modal/panel |
| Tổng chức năng đã kiểm kê | 35 | Chức năng nguyên tử trong ma trận mục 4 |
| Tổng API Admin | 26 | 24 trong `AdminController` + 2 system-audit |
| Bảng DB liên quan trực tiếp/gián tiếp | 21 | Liệt kê tại mục 3.4 |
| Role hệ thống | 2 | `ADMIN`, `USER`; chưa có permission granularity |
| WORKING có bằng chứng test | 1 | Enterprise System Audit viewer |
| PARTIAL | 19 | Có FE/BE/DB nhưng thiếu tính đúng đắn, scale hoặc workflow |
| BUG | 5 | Có lỗi nghiệp vụ/dữ liệu cụ thể |
| MOCK | 4 | Hardcode/fallback tạo số liệu hoặc danh tính giả |
| FE_ONLY | 1 | OCR search/filter/page chỉ xử lý trên tối đa 50 bản ghi |
| BE_ONLY | 1 | Dữ liệu FinAI vận hành tồn tại nhưng Admin chưa tổng hợp |
| MISSING | 4 | Chức năng được UI/menu ngụ ý nhưng chưa tồn tại đầy đủ |
| NOT_VERIFIED (primary status) | 0 | Không dùng làm primary status; runtime limitation ghi riêng |
| UI KEEP | 0 | Không có trang nào được xác nhận rendered đủ để đánh dấu KEEP |
| UI POLISH | 4 | Phân loại tạm từ source, chưa phải nghiệm thu trực quan |
| UI RESTRUCTURE | 7 | Chủ yếu do hierarchy/workflow và tính đúng đắn dữ liệu |
| UI REDESIGN | 0 | Không có bằng chứng cần redesign toàn bộ |
| UI REMOVE/MERGE | 1 | Roles nên gộp khi hệ thống chỉ có 2 role cố định |
| Chức năng đề xuất bổ sung/hardening | 7 | 5 MUST HAVE, 2 SHOULD HAVE |
| Lỗi P0 / P1 / P2 / P3 | 1 / 6 / 10 / 3 | 20 finding trong mục 10 |

### 1.2 Kết luận phát hành

**NO-GO cho Admin production** cho đến khi hoàn thành tối thiểu:

1. Chặn đầy đủ tài khoản `LOCKED/DISABLED/INACTIVE/DELETED` ở password, Google, refresh và mọi request dùng JWT; revoke session khi khóa.
2. Bỏ credential Admin mặc định và fail-fast nếu production thiếu secret bắt buộc.
3. Khóa phạm vi mutation danh mục vào `is_system=true AND user_id IS NULL`.
4. Loại bỏ hoặc gắn nhãn chính xác mọi KPI hardcode/fallback.
5. Sửa audit actor/IP và thêm test integration cho các mutation nhạy cảm.

## 2. Phương pháp, mức độ bằng chứng và giới hạn

### 2.1 Cách đánh giá

- Truy vết route → screen → `adminApi` → controller → service → repository/entity/migration.
- Chỉ đánh dấu `WORKING` khi có test đã chạy hoặc runtime evidence trực tiếp.
- `PARTIAL` có nghĩa là luồng tồn tại xuyên FE/BE/DB nhưng chưa đủ tính đúng đắn, scale, workflow hoặc test.
- Static code evidence không được diễn giải thành E2E pass.
- Không đọc `.env`, không hiển thị secret, không truy cập nội dung tài chính/chat riêng tư và không thao tác dữ liệu thật.

### 2.2 Bằng chứng đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | PASS |
| `npm run lint` toàn Frontend Web | FAIL: 322 errors, 41 warnings |
| `npx eslint src/modules/admin` | FAIL: 68 errors, 4 warnings |
| Backend targeted tests | PASS: 20 tests, 0 failure/error |
| Test classes | `JwtTokenProviderTest`, `AdminServiceSingleAdminTest`, `AuditDataSanitizerTest`, `SystemAuditServiceTest`, `SystemAuditViewerServiceTest` |
| Docker runtime | PostgreSQL/Redis healthy; backend, OCR, FinAI và Nginx running; `frontend-web` unhealthy |
| `GET http://127.0.0.1:1116/api/v1/health` | HTTP 200, `status=UP` |
| `GET http://127.0.0.1:1116/` | HTTP 200 |
| Impeccable source detector | 2 advisory `ai-color-palette` tại `AdminAnalyticsScreen.tsx:154`; không có rendered DOM scan |

### 2.3 Giới hạn bắt buộc khi đọc báo cáo

- Không có credential Admin được cung cấp; không dùng/đọc secret trong `.env`. Vì vậy 12 trang authenticated **chưa được render và thao tác bằng browser**.
- Không có screenshot, pixel contrast, keyboard-only flow, screen reader, touch gesture, viewport/zoom hay network waterfall trên trang Admin authenticated.
- Hai assessment UI độc lập trong sub-agent không khởi tạo được tiến trình/permission; phần UI dưới đây là **degraded static assessment**, không phải visual acceptance.
- Không chạy benchmark 100/1.000/10.000 user vì không tạo dữ liệu tổng hợp vào DB đang chạy.
- Không chạy destructive security test, không thử IDOR trên dữ liệu thật, không đo latency production.
- Worktree có thay đổi FinAI do người dùng sở hữu; audit giữ nguyên và không kết luận lại chất lượng FinAI Agent vừa nghiệm thu ngoài phạm vi dữ liệu Admin có thể khai thác.
- `frontend-web/dist` và `backend/target` đã tồn tại trước audit; không xem artifact là bằng chứng source sạch.

## 3. Kiến trúc Admin hiện tại

### 3.1 Luồng tổng quát

```text
React Router (/admin/*)
  └─ AdminGuard + AdminLayout
      └─ 12 lazy-loaded screens
          └─ adminApi (Axios, /api/v1/admin/*)
              └─ Spring Security ROLE_ADMIN
                  ├─ AdminController → AdminService → JPA repositories
                  ├─ SystemAuditAdminController → SystemAuditViewerService
                  └─ AiAnalyticsClient → pfm-ai-service /api/ai/admin/stats
                      └─ PostgreSQL core.* / ops.*
```

### 3.2 Route và page

| # | Route | Page | API chính |
|---:|---|---|---|
| 1 | `/admin` | Dashboard | `/admin/dashboard/overview` |
| 2 | `/admin/analytics` | Usage Analytics | `/admin/analytics` |
| 3 | `/admin/system-health` | System Health | `/admin/system-health` |
| 4 | `/admin/audit-logs` | Audit Logs | `/admin/audit-logs`, `/admin/system-audit/*` |
| 5 | `/admin/users` | User Management | `/admin/users*` |
| 6 | `/admin/roles` | Roles | `/admin/roles` |
| 7 | `/admin/ai-management` | AI Management | `/admin/ai/stats` |
| 8 | `/admin/ocr-management` | OCR Management | `/admin/ocr/overview` |
| 9 | `/admin/categories` | System Categories | `/admin/categories*` |
| 10 | `/admin/broadcast` | Broadcast & Templates | `/admin/broadcast*`, `/admin/notification-templates*` |
| 11 | `/admin/feedbacks` | Feedback & Support | `/admin/feedbacks*` |
| 12 | `/admin/settings` | System Settings | `/admin/settings*` |

Evidence: `frontend-web/src/modules/app/screen/AppScreen.tsx:212-224`, `frontend-web/src/modules/admin/components/AdminLayout.tsx:23-36`.

`AdminPlaceholderScreen.tsx` tồn tại nhưng không được route; `/admin/profile` có title trong layout nhưng không có route tương ứng.

### 3.3 API inventory

| Nhóm | GET | POST | PUT | DELETE | Tổng |
|---|---:|---:|---:|---:|---:|
| Dashboard | 1 | 0 | 0 | 0 | 1 |
| Users | 1 | 1 | 1 | 1 | 4 |
| Roles | 1 | 0 | 0 | 0 | 1 |
| Categories | 1 | 1 | 1 | 1 | 4 |
| OCR | 1 | 0 | 0 | 0 | 1 |
| Analytics | 1 | 0 | 0 | 0 | 1 |
| Feedback | 1 | 1 | 0 | 0 | 2 |
| Broadcast + templates | 2 | 2 | 1 | 0 | 5 |
| Core audit | 1 | 0 | 0 | 0 | 1 |
| Enterprise system audit | 1 | 1 | 0 | 0 | 2 |
| System health | 1 | 0 | 0 | 0 | 1 |
| Settings | 1 | 0 | 1 | 0 | 2 |
| AI stats | 1 | 0 | 0 | 0 | 1 |
| **Tổng** | **14** | **6** | **4** | **2** | **26** |

Evidence: `backend/src/main/java/com/finance/finance/modules/admin/controller/AdminController.java:28-198`, `SystemAuditAdminController.java:29-49`.

### 3.4 Database tables liên quan (21)

| Nhóm | Bảng |
|---|---|
| User/auth | `core.users`, `core.auth_tokens`, `core.refresh_tokens`, `core.oauth_accounts` |
| Usage/business aggregation | `core.transactions`, `core.groups`, `core.budgets`, `core.goals`, `core.debts`, `core.categories`, `core.receipts` |
| Notification/support | `core.notifications`, `core.notification_templates`, `core.feedbacks`, `core.system_settings` |
| Audit | `core.audit_logs`, `ops.audit_logs` |
| FinAI | `core.ai_chat_sessions`, `core.ai_chat_messages`, `core.finai_pending_actions`, `core.finai_action_audit_logs` |

Không đề xuất tạo thêm bảng audit log. `ops.audit_logs` đã có append-only trigger, index điều tra và retention job; `core.audit_logs` là legacy Admin log và nên được hợp nhất về luồng enterprise thay vì mở rộng song song.

### 3.5 Authentication và RBAC

- FE guard: kiểm tra `user.systemRole === 'ADMIN'` tại `AdminGuard.tsx:9-27`.
- Router tách Admin khỏi không gian user tại `AppScreen.tsx:204-231`.
- Backend route rule: `/api/v1/admin/**.hasRole("ADMIN")` tại `SecurityConfig.java:89-93`.
- Controller có lớp bảo vệ thứ hai `@PreAuthorize("hasRole('ADMIN')")`.
- Role thực tế chỉ có `ADMIN` và `USER` (`SystemRole.java`). Không có permission theo nghiệp vụ; trang “Vai trò & Phân quyền” chỉ hiển thị hai mô tả/permission hardcode từ `AdminService.java:328-367`.

## 4. Ma trận trạng thái FE/BE/Database

| # | Phân hệ | Chức năng | FE | BE | DB | Kết quả | Vấn đề chính | Đề xuất |
|---:|---|---|---|---|---|---|---|---|
| 1 | Dashboard | KPI tài khoản | Có | Có | `users` | BUG | `activeUsers` là status ACTIVE nhưng UI ghi “tài khoản tương tác” | Đổi tên hoặc tính theo activity event |
| 2 | Dashboard | User growth 7 ngày | Có | Có | `users.created_at` | PARTIAL | `findAll()` rồi đếm trong JVM | Aggregate SQL theo timezone |
| 3 | Dashboard | Transaction activity/today | Có type | Có field | `transactions` | MOCK | `transactionsToday=0`, `transactionActivity=[]` | Tính thật hoặc bỏ khỏi contract |
| 4 | Users | List/search/filter/page | Có | Có | `users` | PARTIAL | Pagination giả sau `findAll()` | Repository query + `Pageable` |
| 5 | Users | Edit name/status/tier/email/subscription | Có | Có | `users` | PARTIAL | DTO thiếu validation/range/note không dùng | Allowlist field, validate, audit reason |
| 6 | Users | Lock/unlock | Có | Có | `users`, token tables | BUG | Khóa không chặn password/Google/JWT/refresh | Fix toàn bộ auth paths + revoke session |
| 7 | Users | Soft delete | Có | Có | `users`, OAuth/token | PARTIAL | Token/OAuth cleanup catch-and-continue; chưa có integration test | Atomic policy hoặc fail-closed rõ ràng |
| 8 | Roles | Xem role/statistics | Có | Có | `users.system_role` | PARTIAL | Permission list hardcode | Đổi thành “Chính sách truy cập” read-only |
| 9 | Roles | Cấu hình RBAC | UI ngụ ý | Không | Không | MISSING | Tên trang gây hiểu lầm; hệ thống không hỗ trợ permission | Remove/merge; chỉ xây RBAC khi có nhiều Admin role |
| 10 | Categories | Danh sách system category | Có | Có | `categories` | PARTIAL | Chưa có pagination/search BE | Giữ với dataset nhỏ, thêm count usage |
| 11 | Categories | Tạo system category | Có | Có | `categories` | PARTIAL | Code/color/icon/order thiếu validation chặt | Unique/format/parent validation |
| 12 | Categories | Sửa/xóa category | Có | Có | `categories` | BUG | Lookup theo ID không kiểm tra system-owned | Query scope `isSystem/userId` bắt buộc |
| 13 | AI | Provider/model/session totals | Có | Proxy có | AI chat tables | PARTIAL | Tổng session/message thật; model/provider một phần hardcode | Lấy runtime config và telemetry thật |
| 14 | AI | Health 4 engine | Có | Có | Không | MOCK | Cả 4 engine luôn `ONLINE`; temperature `0.2` hardcode | Health probe thật hoặc “Configured/Not checked” |
| 15 | AI | Request/tool/token/latency/error/Pending metrics | Không | Dữ liệu rời rạc | FinAI action/audit + traces | BE_ONLY | Chưa có aggregation Admin | Tận dụng bảng/traces hiện có, không lưu chat content |
| 16 | AI | Recent sessions | Có | Có | AI chat tables | PARTIAL | N+1 query; lộ title/name/email không cần thiết | Aggregate ẩn danh; bỏ title/email mặc định |
| 17 | OCR | KPI và recent scans | Có | Có | `receipts` | PARTIAL | Chỉ lưu scan thành công; không có error/duration/status | Thêm operational outcome tối thiểu |
| 18 | OCR | Search/filter/page | Có | Không | Không | FE_ONLY | Chỉ lọc tối đa 50 item đã tải | Server-side query/pagination |
| 19 | OCR | Success/failure/error/latency/service health | Không | Không đủ | Không đủ | MISSING | Schema không lưu outcome/duration/error | Bổ sung telemetry tối thiểu, không lộ ảnh |
| 20 | Analytics | DAU/WAU/MAU | Có | Có | `users.last_login_at` | PARTIAL | “Active” chỉ là login/registration, không phải sử dụng feature | Ghi rõ định nghĩa hoặc dùng event thật |
| 21 | Analytics | Retention rate | Có | Có | `users.status` | BUG | ACTIVE/total không phải retention | Bỏ hoặc thay cohort retention thật |
| 22 | Analytics | Feature usage | Có | Có | entity tables | PARTIAL | Đếm số entity, không phải lượt sử dụng | Đổi nhãn “Dữ liệu được tạo” hoặc dùng event |
| 23 | Feedback | List/search/filter | Có | Có | `feedbacks` | PARTIAL | BE không pagination/search text; load toàn bộ | Page query + search |
| 24 | Feedback | Reply/status | Có | Có | `feedbacks` | PARTIAL | User thấy khi reload nhưng không có notification/history | Notify user và audit transition |
| 25 | Feedback | Attachment/internal note/history | Không | Không | Không | MISSING | Workflow hỗ trợ chưa hoàn chỉnh | Chỉ bổ sung history/notify cần thiết; attachment nếu có nhu cầu |
| 26 | Broadcast | Gửi theo audience | Có | Có | `notifications` | PARTIAL | Fan-out đồng bộ toàn bộ user, không job/batch/idempotency | Batch/outbox cho quy mô lớn |
| 27 | Broadcast | Lịch sử chiến dịch | Có | Có | `notifications` | BUG | Group theo title; merge chiến dịch trùng tên, audience luôn ALL | Campaign identity ổn định |
| 28 | Broadcast | Template list/update/toggle | Có | Có | `notification_templates` | PARTIAL | GET có side effect tự sửa cron/title; dispatched count heuristic | GET read-only, scheduler cập nhật metric thật |
| 29 | Audit | Legacy Admin audit | Có | Có | `core.audit_logs` | MOCK | actor=`admin`, IP=`127.0.0.1`, status=SUCCESS; lỗi ghi bị nuốt | Ngừng ghi mới; chuyển sang enterprise audit |
| 30 | Audit | Enterprise audit unlock/filter/page | Có | Có | `ops.audit_logs` | WORKING | 20 targeted tests pass; chưa E2E browser | Giữ, thêm integration auth/pagination |
| 31 | Health | JVM/DB/disk/uptime | Có | Có | JDBC/runtime | PARTIAL | Dữ liệu backend thật nhưng UI gọi là toàn hệ thống | Đổi phạm vi “Backend instance” |
| 32 | Health | DB pool | Có | Có | Không | MOCK | `activeConnections=1`, `maxPoolSize=10` hardcode | Lấy DataSource metrics hoặc bỏ |
| 33 | Health | Redis/MinIO/AI/OCR/Nginx/VPS | Không | Không | Không | MISSING | Không có nguồn trong API Admin | Health aggregation có timeout, least privilege |
| 34 | Settings | List/filter/update/toggle | Có | Có | `system_settings` | PARTIAL | Value string tự do, không schema/type/range | Registry allowlist + validation + redaction |
| 35 | Settings | Maintenance mode | Có | Có | `system_settings` | PARTIAL | Password login đọc setting; chưa xác minh Google/đang đăng nhập | Chính sách thống nhất mọi auth/request |

## 5. Dashboard và Analytics

### 5.1 Nguồn và công thức hiện tại

| Chỉ số | Nguồn/công thức | Đánh giá |
|---|---|---|
| Tổng user | `users` chưa soft-delete | Hợp lý nhưng full-table in-memory |
| “Số hoạt động” | `userStatus == ACTIVE` | Sai nhãn; đây là trạng thái tài khoản, không phải activity |
| Locked | `LOCKED OR DISABLED` | Không gồm `INACTIVE`; semantics chưa nhất quán |
| New today/month | `createdAt` theo `Asia/Ho_Chi_Minh` | Hợp lý; dùng `isAfter` bỏ đúng timestamp biên |
| Paid users | PREMIUM + ENTERPRISE | Hợp lý nếu tier là nguồn chuẩn |
| Total groups/transactions/receipts | Repository `count()` | Dữ liệu thật |
| Transactions today | Hằng `0` | MOCK |
| Transaction activity | Mảng rỗng | MOCK |
| User growth | 7 vòng lặp trên list toàn user | Đúng trên dữ liệu nhỏ, scale kém |
| DAU/WAU/MAU | last login hoặc ngày tạo | Chỉ là login activity, không phải app activity |
| Retention | ACTIVE users / total users | Sai khái niệm retention |
| Feature usage | Số row transaction/receipt/group/budget/goal/debt | Là data volume, không phải event usage |

Evidence: `AdminService.java:65-135`, `552-657`; label sai tại `AdminDashboardScreen.tsx:84-105`.

### 5.2 Nên giữ/bỏ/thay

- Giữ: total user, new user, locked/disabled (sau khi chuẩn hóa enum), subscription mix, total transaction/receipt/group, registration trend.
- Đổi tên: “Số hoạt động” → “Tài khoản trạng thái ACTIVE” nếu chưa có event; “Feature usage” → “Khối lượng dữ liệu theo tính năng”.
- Bỏ ngay: retention hiện tại; transaction today/activity nếu vẫn là zero/empty.
- Bổ sung khi có nguồn: auth success/failure, AI/OCR success/error, unresolved feedback, backend/DB health.
- Không bổ sung P50/P95/P99, token cost hay quota cho đến khi telemetry được lưu/aggregate ổn định.

## 6. Quản lý người dùng

### 6.1 Luồng hiện có

- List, search email/name/username/phone, filter status/tier, sort created date và pagination.
- Edit full name, status, subscription tier, expiry extension, email verified.
- Lock/unlock, soft delete, revoke refresh/auth token và xóa OAuth mapping khi delete.
- Xác nhận modal trước lock/delete có ở FE.
- Role change bị cấm theo chính sách một Admin duy nhất; 2 test bảo vệ invariant này pass.

### 6.2 Lỗi khóa tài khoản — P0

1. Admin chỉ set `userStatus=LOCKED`, không set `lockedUntil`: `AdminService.java:253-263`.
2. Password login chỉ chặn `lockedUntil` và `INACTIVE`, không chặn `LOCKED/DISABLED`: `AuthService.java:278-323`.
3. Google login không kiểm tra maintenance/status trước khi phát token: `AuthService.java:880-959`.
4. Refresh rotation không kiểm tra user status: `TokenService.java:63-107`, `AuthService.java:461-479`.
5. JWT filter load user rồi luôn tạo `UsernamePasswordAuthenticationToken`, không kiểm tra `isEnabled/isAccountNonLocked`: `JwtAuthenticationFilter.java:35-44`.
6. Access token sống 24 giờ: `application.yml:130`.

Kết quả: user bị Admin khóa vẫn có thể login và tiếp tục truy cập; refresh token có thể phát access token mới. Đây là failure của security control, không phải lỗi UI.

### 6.3 Quyền và data minimization

Admin user API trả thông tin profile/account nhưng không có endpoint xem số dư, toàn bộ transaction, chat content, group message hay child-wallet content. Đây là điểm tốt cần giữ. OCR Admin trả `totalAmount=null` và không trả ảnh, đúng nguyên tắc giảm thiểu dữ liệu (`AdminService.java:522-535`).

Không nên thêm “xem toàn bộ tài chính user”. Khi điều tra sự cố chỉ dùng ID, timestamp, outcome, error code và aggregate; access break-glass nếu sau này cần phải có reason, second factor và enterprise audit.

## 7. AI/FinAI Administration

### 7.1 Dữ liệu đang có

- Python endpoint đếm thật `AIChatSession` và `AIChatMessage`.
- `core.finai_pending_actions` lưu status, created/expires/confirmed/executed, tool, error/result.
- `core.finai_action_audit_logs` lưu action event/status/tool/time.
- Agent trace có request ID, model rounds, Gemini latency và input/output token trong runtime trace (`action_agent.py:2140-2144`).

### 7.2 Khoảng trống

- Admin endpoint chỉ trả total sessions/messages, recent session và bốn algorithm card.
- Provider/model/temperature và toàn bộ engine `ONLINE` có hardcode: `pfm-ai-service/main.py:1127-1179`.
- Không có request/day/week/month, unique AI users, success/error taxonomy, latency percentile, token, quota, timeout, READ/WRITE tool usage, pending/confirm/cancel/expired hay request-ID search.
- Recent session query có N+1 (count message + fetch user cho mỗi session) và trả title/name/email; không cần thiết cho dashboard vận hành.
- Không có API key/system prompt được trả ra — điểm tốt cần giữ.

Đề xuất: aggregate từ action/audit/session hiện có, thêm telemetry tối thiểu theo request nhưng **không lưu nội dung chat/prompt**. Recent session UI nên mặc định ẩn danh và chỉ drill-down metadata khi có lý do hợp lệ.

## 8. OCR Administration

`core.receipts` lưu receipt thành công với confidence, needs-review và metadata kết quả. Nó không lưu request thất bại, error code, processing duration hoặc service health. Do đó Admin hiện không thể tính tỷ lệ success/failure hay latency một cách trung thực.

Hai fallback làm sai số liệu:

- BE average confidence mặc định `0.85` khi không có confidence: `AdminService.java:504-508`.
- FE từng receipt dùng `(confidence || 0.8)`: `AdminOcrManagementScreen.tsx:248`.

Fallback phải là `null/N/A`, không phải một confidence giả. Search/filter/pagination hiện chỉ chạy client-side trên 50 receipt gần nhất (`AdminService.java:514-519`). Receipt image đã được bảo vệ bằng ownership/HMAC signed URL tại `ReceiptMediaController.java:42-88`; Admin OCR response không chứa image URL — nên giữ nguyên.

## 9. Feedback, Broadcast, Audit và System Health

### 9.1 Feedback

- Luồng user submit → Admin list/filter → reply/status → user reload thấy reply tồn tại.
- Thiếu pagination/search backend, attachment, internal note, status history, actor reply và notification kết quả.
- Không cần xây ticket enterprise. Tối thiểu: `PENDING → IN_PROGRESS → RESOLVED/REJECTED`, lịch sử transition ngắn, notification cho user và audit actor.

### 9.2 Broadcast

- Gửi notification thật đến ACTIVE user và filter Free/Premium.
- Fan-out đồng bộ qua toàn bộ user; chưa có batch/job/idempotency.
- Lịch sử được dựng lại bằng cách group notification theo `title`; hai lần gửi cùng title bị gộp, recipient count và audience sai. Response còn tạo random ID không được persist (`AdminService.java:742-818`).
- Template GET tự sửa weekly cron/title và save DB (`AdminService.java:827-835`), vi phạm nguyên tắc GET read-only.

### 9.3 Audit log

| Bảng | Mục đích | Trạng thái |
|---|---|---|
| `core.audit_logs` | Legacy Admin action list | Có UI/API nhưng actor/IP/status hardcode; không đáng tin làm forensic |
| `ops.audit_logs` | Enterprise system/security audit | Append-only, rich context, index, sanitizer, retention, viewer password/token |
| `core.finai_action_audit_logs` | FinAI pending action lifecycle | Có dữ liệu, chưa được Admin aggregate |

`ops.audit_logs` có trigger chặn UPDATE/DELETE, index theo occurred/actor/event/resource/request/correlation/severity và retention mode trong `V68__extend_ops_audit_logs.sql`. Viewer có password thứ hai, constant-time compare, rate limit 5 lần/15 phút, token HMAC bound admin/TTL, max page size 50 và self-audit; targeted tests pass.

Legacy logger phải ngừng ghi mới vì hardcode `admin`, “Hệ Thống Admin”, `127.0.0.1`, `SUCCESS` và swallow exception: `AdminService.java:934-950`.

### 9.4 System health

Metric thật: JVM heap/non-heap, threads/classes, OS load average, DB `SELECT 1` latency/product/version, process uptime và filesystem của Backend container.

Metric giả/không đúng phạm vi:

- `activeConnections=1`, `maxPoolSize=10` hardcode (`AdminService.java:1049-1056`).
- Status toàn trang chỉ dựa DB connected; không đại diện Redis, MinIO, AI, OCR, Nginx hay VPS.
- `systemLoadAverage` không phải CPU utilization percentage.
- Disk `new File(".")` là filesystem container Backend, không chắc là VPS disk.

Runtime audit còn phát hiện `frontend-web` container `unhealthy` với `FailingStreak=231`: healthcheck gọi `http://localhost:80/`, BusyBox resolve `::1` nhưng Nginx chỉ listen IPv4. Evidence: `frontend-web/Dockerfile.prod:46-47`, `frontend-web/nginx.conf:1-3`, `docker inspect frontend-web`.

## 10. Security, data integrity và vận hành — Finding Register

### P0 — Critical

| ID | Finding | Ảnh hưởng | Evidence | Khuyến nghị |
|---|---|---|---|---|
| P0-01 | Account suspension bypass | User bị khóa vẫn login Google/password, dùng JWT/refresh; mất hiệu lực control Admin | `AdminService.java:253-263`; `AuthService.java:278-323,880-959`; `TokenService.java:63-107`; `JwtAuthenticationFilter.java:35-44` | Central account-state policy, revoke sessions atomically, test 4 auth path |

### P1 — High

| ID | Finding | Ảnh hưởng | Evidence | Khuyến nghị |
|---|---|---|---|---|
| P1-01 | Super Admin có default `admin/admin123` khi thiếu env | Deployment sai cấu hình có credential dự đoán được | `application.yml:139-142`; `SuperAdminInitializer.java:28-51` | Production fail-fast; không có default password |
| P1-02 | Category mutation không scope system-owned | Admin API trực tiếp có thể sửa/xóa custom category của user nếu biết ID | `AdminService.java:431-478` | Repository query bắt buộc `isSystem=true`, `userId=null`, not deleted |
| P1-03 | Không chặn tự khóa và single-admin recovery mâu thuẫn | Nếu sửa P0, sole Admin có thể tự làm mất quyền; restart lại tự bật ACTIVE không có audit | `AdminUserManagementScreen.tsx:341-372`; `SuperAdminInitializer.java:64-84` | Chặn self-action, break-glass recovery riêng, audit bắt buộc |
| P1-04 | KPI/health/AI hiển thị dữ liệu giả hoặc sai nghĩa | Admin đưa quyết định sai, che lỗi hệ thống | `AdminService.java:130-134,1049-1056`; `main.py:1145-1179` | Null/N/A, source labels, remove fake values |
| P1-05 | Legacy audit ghi actor/IP/status giả và fail-open | Không truy trách nhiệm, forensic sai | `AdminService.java:934-950` | Dừng legacy writes, dùng `ops.audit_logs` |
| P1-06 | A11y: nhiều control thiếu accessible name/focus rõ, target 28px | Keyboard/screen-reader/low-motor user khó thao tác; nguy cơ WCAG AA | `AdminUserManagementScreen.tsx:344-372`; input chỉ placeholder tại `AdminAuditLogsScreen.tsx:364-393`; nhiều `focus:outline-none` | Label/aria, focus ring, target ≥44px (hoặc tối thiểu WCAG 24px + spacing) |

### P2 — Medium

| ID | Finding | Evidence / ảnh hưởng | Khuyến nghị |
|---|---|---|---|
| P2-01 | Full-table processing ở nhiều Admin API | `findAll()` tại users/dashboard/OCR/analytics/feedback/broadcast; RAM/latency tăng mạnh | SQL aggregate, Page query, index |
| P2-02 | Settings string tự do, không type/range/schema | `AdminController.java:186-192`, `AdminService.java:1094-1108` | Allowlisted setting registry, typed validation, redact audit value |
| P2-03 | Broadcast history không có campaign identity | `AdminService.java:742-760` | Persist campaign/outbox identity; GET read-only |
| P2-04 | Analytics semantics sai | Retention = ACTIVE/total, feature usage = row count | Rename hoặc thu event/cohort đúng |
| P2-05 | OCR observability thiếu và confidence fallback giả | `Receipt.java` không có outcome/duration/error; fallback 0.85/0.8 | Operational event/status tối thiểu; null khi thiếu |
| P2-06 | FinAI observability thiếu; recent session vượt data minimization | `main.py:1123-1143`; FinAI action tables chưa aggregate | Anonymous aggregate, request/tool/outcome metrics |
| P2-07 | Feedback workflow thiếu history/notify/page | `AdminService.java:662-720` | Workflow nhỏ gọn, notification + audit |
| P2-08 | System health coverage thiếu/fake pool | `AdminService.java:976-1069` | Aggregate existing health endpoints; không cấp Docker socket/root |
| P2-09 | Frontend Docker healthcheck sai | Container unhealthy dù proxy 200 | Dùng `127.0.0.1/health` và test image health |
| P2-10 | QA debt Admin | 68 lint errors/4 warnings; không có FE/E2E Admin test | Fix lint, controller/service integration, Playwright smoke bằng synthetic DB |

### P3 — Low/Polish

| ID | Finding | Evidence | Khuyến nghị |
|---|---|---|---|
| P3-01 | Roles page/menu hứa “phân quyền” nhưng chỉ read-only hardcode | `AdminRolesScreen.tsx`; `AdminService.java:337-367` | Merge với Users/Access Policy |
| P3-02 | Một số page quá lớn và dày | Audit 1.025 LOC, Broadcast 772 LOC, Users 588 LOC | Tách view/component theo workflow, không đổi visual identity |
| P3-03 | Detector cảnh báo palette AI-purple trên Analytics | `AdminAnalyticsScreen.tsx:154` (2 advisory) | Dùng token Finora green/semantic color có chủ đích |

### 10.1 Positive security findings

- Admin API có route rule + method security; không chỉ ẩn menu FE.
- JPA/PreparedStatement được dùng, không thấy SQL concatenation từ Admin input.
- React render text mặc định giảm rủi ro XSS; chưa thấy raw HTML trong Admin.
- Receipt/group attachment dùng ownership hoặc signed URL; Admin OCR không xem ảnh.
- Enterprise audit sanitizer loại password/token/OTP/secret/prompt/chat/receipt URL và giới hạn JSON size/depth.
- `ops.audit_logs` append-only và không có API edit/delete.
- System-audit unlock có rate limit, short-lived token và self-audit.

## 11. Performance và code quality

### 11.1 Frontend

- 12 route Admin được lazy-load tại `AppScreen.tsx:39-50` — điểm tốt.
- Artifact hiện có cho thấy Admin chunk riêng khoảng 6,7–32,9 KiB/chunk; lớn nhất là Audit Logs 32,9 KiB và Broadcast 26,4 KiB. Đây là uncompressed artifact, không phải network transfer measurement.
- Main CSS artifact 327,6 KiB; main JS 246,1 KiB; ExcelJS 907,8 KiB và jsPDF 390,4 KiB được tách chunk. Chưa đo gzip/brotli và route waterfall.
- `AdminSystemHealthScreen` polling 15 giây; cần pause khi tab hidden và deduplicate request.
- Admin module có 68 lint errors/4 warnings: `any`, unused variables, missing hook dependencies và `set-state-in-effect`. Type-check vẫn pass nên đây là quality/performance debt, không phải compile failure.

### 11.2 Backend

- Dashboard/users/OCR/analytics/feedback/broadcast nhiều lần load toàn bảng và join bằng map trong memory.
- User pagination là `subList` sau filter/sort toàn bộ.
- OCR load toàn receipts + toàn users, sort rồi limit.
- AI recent sessions thực hiện count messages và user lookup theo từng session (N+1).
- Broadcast tạo một Notification/user trong request đồng bộ; có rủi ro timeout và payload lớn.
- `core.audit_logs` và feedback list không pagination.

### 11.3 Scale assessment

| Quy mô | Nhận định static |
|---:|---|
| 100 users | Có thể chấp nhận, nhưng KPI semantics/security vẫn sai |
| 1.000 users | Full-table aggregation bắt đầu tạo latency/GC; broadcast đồng bộ đáng lo |
| 10.000 users | Không chấp nhận nếu giữ `findAll()`/in-memory page/fan-out synchronous |

Đây không phải benchmark. Không có số latency thực tế nên không kết luận “performance tốt”.

## 12. UI/UX Admin — degraded static assessment

### 12.1 Technical UI health score

| Dimension | Điểm /4 | Bằng chứng static | Giới hạn |
|---|---:|---|---|
| Accessibility | 1.5 | Có một số `aria-label` trong layout và semantic button; nhiều input không gắn label, focus chỉ đổi border, target 28px | Chưa keyboard/screen-reader/contrast test |
| Performance | 2.5 | Lazy route/chunk tốt; polling và page lớn, lint hook issues | Chưa runtime profiling |
| Theming | 3.0 | Dark classes và green identity phủ rộng | Chưa pixel contrast/theme-switch test |
| Responsive | 2.5 | Grid breakpoint, mobile sidebar, table overflow có trong source | Chưa test 390–1920px/zoom |
| Implementation integrity | 2.0 | Component language khá nhất quán; dữ liệu giả/mislabel làm giảm integrity | Detector source chỉ có 2 advisory, không có DOM scan |
| **Tổng** | **11.5/20** | **Acceptable — significant work needed** | **Provisional, không phải visual acceptance** |

Implementation integrity verdict: **FAIL cho production**, không phải vì visual style mà vì một UI quản trị không thể trình bày status/KPI giả như dữ liệu vận hành thật.

### 12.2 Đánh giá từng trang

| Trang | Điểm tạm /10 | Vấn đề cụ thể | Ảnh hưởng | Phân loại | Đề xuất |
|---|---:|---|---|---|---|
| Dashboard | 7.2 | Hierarchy/card/grid tốt; “active” sai nghĩa, transaction metric giả | Quyết định sai | POLISH | Giữ layout, sửa source labels/data |
| Analytics | 7.0 | Chart rõ nhưng retention/feature usage sai semantics; advisory purple palette | Tin cậy dữ liệu | POLISH | Giữ cấu trúc, sửa metric/token color |
| Users | 6.5 | Table responsive có overflow; 3 action nhỏ 28px, self-action, modal dày | A11y/rủi ro thao tác | RESTRUCTURE | Row action menu + detail drawer + self guard |
| Roles | 6.0 | UI sạch nhưng capability không tồn tại | IA gây hiểu lầm | REMOVE/MERGE | Gộp “Access Policy” vào Users/Security |
| Categories | 7.0 | CRUD tương đối rõ; control icon/color thiếu accessible label/validation | Sai dữ liệu | POLISH | Giữ layout, harden form/action |
| AI Management | 5.8 | Engine cards đẹp nhưng status giả; recent user identity không cần thiết | Vận hành/privacy | RESTRUCTURE | Operational dashboard ẩn danh, source/status rõ |
| OCR Management | 6.0 | Search/filter trực quan nhưng chỉ trên top 50; confidence giả | Sai kết luận | RESTRUCTURE | Server-side list, N/A/error taxonomy |
| Feedback | 6.2 | List/filter/reply có; thiếu timeline/notify và detail workflow | Admin khó theo dõi | RESTRUCTURE | Split queue/detail, status history tối giản |
| Broadcast | 6.0 | Compose/template/history dồn trong 772 LOC; campaign history sai | Cognitive load/data integrity | RESTRUCTURE | 3 tab/workflow rõ, campaign ID |
| Audit Logs | 6.2 | Hai nguồn log + unlock/filter rất dày trong 1.025 LOC | Cognitive load | RESTRUCTURE | Tab rõ, filter bar sticky, detail drawer |
| System Health | 6.3 | Card scan tốt; “toàn hệ thống” thực chất Backend+DB | Sai phạm vi | RESTRUCTURE | Service matrix + backend instance detail |
| Settings | 7.0 | Grouping/toggle rõ; input tự do nguy hiểm | Misconfiguration | POLISH | Typed control, constraints, reason/confirm |

Không trang nào được gán `KEEP` vì chưa quan sát rendered result. Không có bằng chứng cần `REDESIGN` toàn bộ; nên giữ visual identity xanh lá, light/dark và card/table language hiện có.

### 12.3 Responsive/accessibility cần nghiệm thu sau fix

- Viewport: 1920×1080, 1440×900, 1366×768, 1280×720, 1024, 768, 390.
- Zoom: 80/100/125/150%; thêm 200% cho WCAG reflow.
- Keyboard: sidebar, filters, tables, modal focus trap/return, Escape, confirmation.
- Screen reader: page heading, labels, status/live region, toggle state, table header.
- Contrast: light/dark, badge/status, placeholder, focus indicator.
- Long email/title/content, empty/error/loading, 1.000 rows server-side, slow network.

## 13. Cấu trúc sidebar hiện tại và đề xuất

### 13.1 Hiện tại

```text
Hệ thống
├─ Tổng quan
├─ Thống kê sử dụng
├─ Giám sát hệ thống
└─ Nhật ký hoạt động

Quản trị tài khoản
├─ Người dùng
└─ Vai trò & Phân quyền

Nghiệp vụ & AI
├─ Quản lý AI
├─ Quản lý OCR
└─ Danh mục hệ thống

Vận hành
├─ Thông báo tổng
├─ Phản hồi & Hỗ trợ
└─ Cấu hình hệ thống
```

### 13.2 Đề xuất sau nâng cấp

```text
Tổng quan
├─ Dashboard
└─ Phân tích sử dụng

Người dùng & Hỗ trợ
├─ Người dùng
└─ Phản hồi

Vận hành dịch vụ
├─ FinAI
├─ OCR
├─ Thông báo
└─ Sức khỏe hệ thống

Quản trị hệ thống
├─ Nhật ký kiểm toán      [second factor]
├─ Danh mục mặc định
└─ Cấu hình an toàn       [allowlist]
```

Thay đổi:

- Bỏ menu Roles riêng; hiển thị policy cố định trong Users hoặc Security. Chưa cần hệ thống RBAC enterprise khi chỉ có một Admin role.
- Đổi “Thông báo tổng” → “Thông báo”; “Danh mục hệ thống” → “Danh mục mặc định”; “Nhật ký hoạt động” → “Nhật ký kiểm toán”.
- Không thêm menu riêng cho session, metric, campaign hay retention; đặt trong detail/tab của module liên quan.
- Chỉ hiển thị Audit/Settings cho Admin có permission tương ứng nếu sau này có nhiều Admin role.

## 14. Chức năng nên bổ sung/hardening

| Chức năng | Mức | Vấn đề giải quyết | Nguồn/tận dụng | FE/BE/DB | Bảo mật | Độ phức tạp | Phù hợp đồ án |
|---|---|---|---|---|---|---|---|
| Effective account suspension & session revocation | MUST | P0 lock bypass | User/token/auth hiện có | FE confirm/reason; BE central policy; DB không đổi | Fail-closed, self guard, audit | M | Có |
| Safe configuration registry | MUST | Setting string tự do | `system_settings`, SystemConfigService | Typed FE/BE; DB có thể không đổi | Allowlist, redact, confirm | M | Có |
| FinAI operational aggregate | MUST | Không giám sát request/tool/action | action/audit/session/trace hiện có | New read API + charts; DB chỉ thêm telemetry nếu thiếu | Không prompt/chat/secret | M-L | Có nếu giới hạn KPI thiết yếu |
| OCR operational outcome | MUST | Không biết failure/latency/error | OCR pipeline + receipts | API/page; DB cần outcome/error/duration hoặc event | Không ảnh/raw text | M | Có |
| Feedback transition + notify | MUST | Reply chưa thành workflow | feedback/notification/audit hiện có | FE timeline; BE transition; DB có thể thêm history nhỏ | Actor/reason | M | Có |
| Broadcast campaign identity/batch | SHOULD | History sai, fan-out sync | notifications/outbox hiện có | FE tab; BE batch; DB có thể thêm campaign_id/table nhỏ | Idempotency/audit | M | Có |
| Service health aggregation | SHOULD | Chỉ thấy Backend+DB | Actuator, Redis ping, AI/OCR health, Nginx | Read-only health API/UI; DB không đổi | Timeout, no Docker socket/root | M | Có |

`NOT NEEDED`: xem/chỉnh sửa toàn bộ tài chính user, xem chat/message nhóm, Kubernetes dashboard, Docker socket trong Admin, Elasticsearch stack, Prometheus/Grafana bắt buộc, permission builder phức tạp khi chỉ có một Admin role.

## 15. Kế hoạch nâng cấp

### Phase 1 — Critical Fixes

**Phạm vi**

- Fix P0 account suspension ở password/Google/refresh/JWT.
- Revoke access/session strategy, chặn self-lock/delete/role edge cases.
- Fail-fast secret/credential production.
- Scope category mutation.
- Xóa/fix KPI hardcode và legacy audit identity.

**Module dự kiến**

- `modules/auth/service/AuthService`, `TokenService`, `CustomUserDetailsService`
- `common/security/JwtAuthenticationFilter`, `SecurityConfig`
- `modules/admin/service/AdminService`, DTO/controller
- `modules/admin/config/SuperAdminInitializer`
- Admin Users/Categories/Dashboard/AI/Health screens

**Dependency**: central account-state policy trước UI/session tests.  
**Độ phức tạp**: L.  
**Rủi ro**: khóa nhầm user, mất Admin access, token compatibility.  
**Nghiệm thu**: test password/Google/refresh/JWT đều 401/403 sau lock; self-action bị cấm; không default secret; không KPI giả.

### Phase 2 — Business Completeness

- Server-side user/OCR/feedback/audit pagination/filter/sort.
- Typed settings validation.
- Feedback transition/notification/history tối thiểu.
- Broadcast campaign identity + read-only template GET.
- Chuẩn hóa Analytics semantics.

**Module**: admin repositories/services/DTO, notification/feedback, migrations nếu thật sự cần.  
**Độ phức tạp**: M-L.  
**Rủi ro**: contract FE/BE, migration/backfill campaign/history.  
**Nghiệm thu**: 10.000 synthetic rows vẫn page tại DB; filter/sort ổn định; history không merge; invalid setting 400.

### Phase 3 — UI/UX Improvement

- Giữ visual identity, dark/light, lazy routes và responsive grid.
- Restructure Users, AI, OCR, Feedback, Broadcast, Audit, Health.
- Merge Roles; chuẩn hóa focus/label/touch target/modal.
- Chỉ polish Dashboard/Analytics/Categories/Settings.

**Module**: `frontend-web/src/modules/admin/**`, shared FinanceIcon/table/form primitives.  
**Độ phức tạp**: M.  
**Rủi ro**: regression workflow, dense desktop tables.  
**Nghiệm thu**: browser matrix/zoom/keyboard/screen-reader; không mất chức năng; WCAG AA cho control chính.

### Phase 4 — Monitoring & Administration

- FinAI request/tool/action telemetry từ dữ liệu khả thi.
- OCR outcome/error/duration.
- Service health aggregation với timeout.
- Audit retention policy được phê duyệt; giữ default disabled/dry-run đến khi duyệt.

**Module**: FinAI action/audit, OCR service/backend, Actuator/health clients, Admin AI/OCR/Health.  
**Độ phức tạp**: M-L.  
**Rủi ro**: metric cardinality, PII leakage, health cascade.  
**Nghiệm thu**: nguồn dữ liệu ghi rõ; không prompt/chat/image/secret; unavailable service không làm sập dashboard.

### Phase 5 — Final Acceptance

- Regression FE/BE, security authorization/IDOR/mass assignment.
- Synthetic scale 100/1.000/10.000.
- Browser visual/a11y matrix.
- Docker health, backup/restore và audit retention dry-run.
- Review data minimization và production configuration checklist.

**Nghiệm thu cuối**: không P0/P1 mở; Admin lint/typecheck/test pass; E2E 12 route; KPI có data source/công thức; không secret/PII dư thừa; rollback plan được ghi rõ.

## 16. Bằng chứng file quan trọng

| Kết luận | Evidence |
|---|---|
| 12 route Admin | `frontend-web/src/modules/app/screen/AppScreen.tsx:212-224` |
| Sidebar hiện tại | `frontend-web/src/modules/admin/components/AdminLayout.tsx:82-108` |
| 26 Admin API | `AdminController.java:28-198`; `SystemAuditAdminController.java:29-49` |
| Dashboard mock | `AdminService.java:130-134` |
| User pagination in-memory | `AdminService.java:141-172` |
| Lock bypass | `AdminService.java:253-263`; auth/security files nêu tại P0-01 |
| Category boundary thiếu | `AdminService.java:431-478` |
| OCR confidence fallback | `AdminService.java:504-508`; `AdminOcrManagementScreen.tsx:248` |
| Retention sai | `AdminService.java:570-572` |
| Broadcast history heuristic | `AdminService.java:725-760` |
| Legacy audit mock | `AdminService.java:934-950` |
| DB pool mock | `AdminService.java:1049-1056` |
| AI engine hardcode | `pfm-ai-service/main.py:1127-1179` |
| Enterprise audit append-only | `V68__extend_ops_audit_logs.sql:55-113` |
| Receipt privacy | `ReceiptMediaController.java:42-88`; `AttachmentUrlSigner.java:49-79` |
| Default Admin credential | `application.yml:139-142`; `SuperAdminInitializer.java:28-51` |
| Frontend unhealthy | `frontend-web/Dockerfile.prod:46-47`; Docker runtime health log |

## 17. Acceptance test backlog

| Test | Hiện tại | Cần có |
|---|---|---|
| Admin guard unauthenticated/non-admin | Chưa chạy | FE redirect + BE 403 direct API |
| Lock account | FAIL theo code path | Password/Google/refresh/existing JWT đều bị chặn |
| Self-lock/delete | Chưa có | 409/403 + audit |
| User/category/settings mutation validation | Chưa có | Integration tests 400/403/404 đúng contract |
| Enterprise audit unlock/rate limit/token | Unit tests pass | Thêm controller integration + DB pagination |
| KPI accuracy | Chưa có | Seed deterministic + expected formula/timezone |
| OCR/AI error metrics | Chưa có data | Synthetic success/error/timeout/quota |
| Broadcast duplicate title | Chưa có | Hai campaign không bị merge |
| 10.000-row performance | Chưa chạy | DB page/query plan/latency budget |
| Browser/a11y | Chưa chạy | 12 routes × viewport/zoom/theme + keyboard |
| Docker health | FAIL frontend | Tất cả required service healthy |

## 18. Kết luận

Admin Finora không cần redesign toàn bộ và cũng không cần mở rộng thành một enterprise console phức tạp. Nền tảng hiện có nên được giữ: route lazy-loading, green identity, dark mode, module separation, server-side role gate, private receipt access và Enterprise Audit Log.

Ưu tiên đúng là **sửa control bảo mật và tính trung thực dữ liệu trước**, sau đó hoàn thiện workflow/pagination, rồi mới polish UI và bổ sung monitoring khả thi. Không nên thêm menu hay biểu đồ nếu chưa có nguồn dữ liệu đáng tin. Sau báo cáo này cần dừng và chờ phê duyệt phạm vi nâng cấp.

## 19. Kết quả triển khai Phase 1 — 27/11/2026

Các mục 1–18 phản ánh baseline của audit. Bảng dưới đây ghi nhận thay đổi Phase 1.

| Finding | Nguyên nhân trước sửa | Hành vi sau sửa |
|---|---|---|
| P0-01 | Admin chỉ cập nhật trạng thái, mỗi đường xác thực áp dụng kiểm tra khác nhau | Password, Google, refresh và JWT dùng trạng thái tài khoản hiện tại. V69 thêm `session_version`. Mỗi lần chuyển trạng thái hoặc xóa tài khoản tăng phiên bản và thu hồi refresh token trong cùng transaction. Mở khóa yêu cầu xác thực mới. |
| P1-01 | Bootstrap dùng credential mặc định và tự đồng bộ bản ghi mỗi lần khởi động | Bootstrap kiểm tra Admin hiện hữu trước. Cài đặt mới fail-fast khi thiếu danh tính hoặc mật khẩu hợp lệ. PostgreSQL khóa transaction bootstrap để các instance cùng chạy chỉ tạo một tài khoản. |
| P1-03 | Endpoint khóa và chỉnh sửa trạng thái có thể tác động Admin duy nhất | Backend chặn tự khóa, tự xóa, vô hiệu hóa và đổi vai trò. Các nút khóa, xóa và trường trạng thái Admin được vô hiệu hóa trên Web. |
| P1-02 | Mutation tìm danh mục theo ID, thiếu kiểm tra quyền sở hữu và quan hệ | Giới hạn vào bản ghi hệ thống chưa xóa, không có chủ sở hữu. Validate tên, mã, màu, icon, loại, thứ tự, duplicate, parent và chu trình. Soft-delete bảo toàn tham chiếu giao dịch. Danh mục còn con hoạt động bị chặn xóa. |
| P1-04 | KPI, trạng thái dịch vụ và fallback được trình bày như dữ liệu thật | Bỏ transaction KPI placeholder, retention giả, trạng thái Dashboard hardcode và model/temperature/ONLINE giả. Phân biệt ACTIVE với đăng nhập, số bản ghi với lượt sử dụng, confidence với độ chính xác. OCR hiển thị N/A khi thiếu và giữ 0 hợp lệ. Health dùng Hikari nếu có, scope Backend/PostgreSQL và filesystem Backend, ghi rõ OS load average. Lịch sử broadcast ghi nguồn là nhóm bản ghi theo tiêu đề và hiển thị N/A khi thiếu audience. |
| P1-05 | Legacy writer ghi actor, địa chỉ và kết quả mặc định | Mutation thành công đi qua Enterprise Audit trong cùng transaction, fail-closed nếu audit không ghi được. Mutation Admin thất bại được ghi theo kết quả HTTP sau khi transaction kết thúc, dùng transaction audit riêng với cơ chế log/metric hiện có nếu audit lỗi. Actor từ principal, đích từ đối tượng thực, IP từ TCP peer và request ID từ request context. |
| P2-09 | Healthcheck dùng `localhost` và wget chọn IPv6, Nginx frontend phục vụ IPv4 | Healthcheck dùng `127.0.0.1:80/health`. Image tạm báo healthy khi Nginx chạy và probe không kết nối được khi Nginx tắt. |

### 19.1 Xác thực, audit và toàn vẹn dữ liệu

- Password, Google, refresh và Admin status mutation khóa cùng hàng `core.users` trong transaction. Khi refresh chạy trước, thao tác khóa thu hồi cả refresh token vừa cấp. Khi khóa chạy trước, refresh chờ transaction rồi kiểm tra lại trạng thái. JWT sử dụng User đã được load, giữ một truy vấn người dùng trên request và xác minh chữ ký một lần. Các request đã xác thực trước thời điểm khóa commit vẫn có thể hoàn thành.
- Khóa do nhập sai chỉ dùng `lockedUntil`. Admin lock dùng trạng thái `LOCKED`. Toggle chỉ chấp nhận `ACTIVE ↔ LOCKED`. Endpoint devices/logout yêu cầu xác thực. Request thiếu JWT hợp lệ nhận 401 và người dùng đã xác thực nhưng thiếu quyền Admin nhận 403.
- `ops.audit_logs` ghi Admin user update/status/delete, category mutation, settings, feedback reply, broadcast và notification template mutation. API GET template đọc cấu hình và bộ đếm đã lưu. `core.audit_logs` vẫn đọc được dưới nhãn “Lịch sử cũ”, với cảnh báo về giá trị tham khảo. `core.finai_action_audit_logs` ghi vòng đời action FinAI và giữ vai trò hiện tại. Append-only, sanitizer, quyền và bước mở khóa Enterprise Audit Viewer tiếp tục áp dụng.
- Địa chỉ IP phía backend có thể là IP reverse proxy. Phase 1 dùng địa chỉ peer mà server quan sát ở tầng kết nối và bỏ suy đoán IP gốc từ header người gửi. Log dùng reason code của thao tác hoặc kết quả HTTP. Nội dung nhập tự do, giá trị cấu hình, mật khẩu và token không được đưa vào event Admin mới.
- Việc Admin thay đổi loại danh mục đang có giao dịch hoặc danh mục con hoạt động bị chặn. Soft-delete giữ bản ghi đích của FK và dữ liệu giao dịch lịch sử.

### 19.2 File thay đổi theo phạm vi

| Khu vực | File |
|---|---|
| Backend Auth | `SecurityConfig.java`, `JwtAuthenticationFilter.java`, `JwtTokenProvider.java`, `User.java`, `UserRepository.java`, `AuthService.java`, `TokenService.java`, `RefreshTokenRepository.java`, `OAuthAccountRepository.java`, `V69__add_user_session_version.sql` |
| Backend Admin, Category, Audit | `SuperAdminInitializer.java`, `AdminMutationAuditConfig.java`, `AdminService.java`, `CategoryRepository.java`, `RequestContextFilter.java`, `AuditEventType.java`, `AdminDashboardOverviewResponse.java`, `AdminAnalyticsResponse.java`, `AdminOcrOverviewResponse.java`, `AdminSystemHealthResponse.java` |
| Admin Web | `adminApi.ts`, `AdminLayout.tsx`, `AdminUserManagementScreen.tsx`, `AdminDashboardScreen.tsx`, `AdminAnalyticsScreen.tsx`, `AdminAIManagementScreen.tsx`, `AdminOcrManagementScreen.tsx`, `AdminSystemHealthScreen.tsx`, `AdminAuditLogsScreen.tsx`, `AdminBroadcastScreen.tsx` |
| AI service | `pfm-ai-service/main.py`, giới hạn ở endpoint thống kê Admin |
| Cấu hình và image | `.env.example`, `application.yml`, `docker-compose.yml`, `docker-compose.prod.yml`, `frontend-web/Dockerfile.prod` |
| Regression test | `AdminPhaseOneIntegrationTest.java`, `SuperAdminInitializerTest.java`, `AdminServiceSingleAdminTest.java`, `RequestContextFilterTest.java` |

### 19.3 Rủi ro tương thích và điều kiện triển khai

- Áp dụng Flyway V69 cùng bản backend mới. Các instance backend phục vụ traffic phải cùng thực thi chính sách mới trước khi Admin dùng kiểm soát phiên. JWT cũ thiếu claim được hiểu là phiên bản 0 và giữ tương thích cho tài khoản ACTIVE chưa chuyển trạng thái. Sau khi chuyển trạng thái, access token và refresh token cũ mất hiệu lực.
- Nếu database chưa có Admin, cấu hình `SUPER_ADMIN_USER`, `SUPER_ADMIN_EMAIL` và `SUPER_ADMIN_PASSWORD` từ secret manager, mật khẩu tối thiểu 12 ký tự. Khi đã có Admin, bootstrap để nguyên danh tính, mật khẩu và trạng thái. Điều này có nghĩa là mật khẩu yếu được tạo từ bản cũ phải được xoay vòng qua quy trình đổi mật khẩu hiện có, có xác minh chủ tài khoản.
- Nếu sole Admin bị khóa trước triển khai, recovery cần quy trình vận hành riêng: xác minh chủ tài khoản, phê duyệt thao tác có kiểm soát, sao lưu, khôi phục đúng danh tính trong cửa sổ bảo trì và ghi lại thay đổi trong hồ sơ vận hành. Bootstrap giữ trạng thái hiện tại.
- Triển khai frontend cùng backend/Python để đồng bộ contract Admin. Dashboard loại các field giao dịch placeholder và trạng thái hạ tầng giả. Analytics bỏ retention. OCR và health có field nullable. Mã dùng để cập nhật danh mục đã bị xóa vẫn được giữ để bảo toàn tính duy nhất trong CSDL.

### 19.4 Chuyển sang phase sau

Pagination và hiệu năng truy vấn, typed settings, campaign ID/outbox, telemetry FinAI/OCR, kiểm tra dịch vụ ngoài Backend/DB, quy trình feedback và audit accessibility toàn bộ Admin vẫn nằm trong backlog. Các thay đổi Phase 1 tập trung vào hiệu lực kiểm soát, tính đúng của dữ liệu hiện có và kiểm chứng hồi quy.

### 19.5 Kết quả kiểm thử

| Bộ kiểm thử | Kết quả | Mức kiểm chứng |
|---|---|---|
| Maven toàn backend trên PostgreSQL 15.19 cô lập, Flyway V69 | **111 pass, 0 fail, 0 skip** | Gồm 6 integration test Phase 1 và 2 test bootstrap mới, 24 ca `FinanceApplicationTests`, cùng JWT, audit sanitizer và Enterprise Audit Viewer. |
| FinAI Python `test_action_agent` và `test_chat_guard` | **65 pass, 0 fail** | Kiểm tra tool/schema/router và guard với mocks. Parser Python kiểm tra cú pháp của `main.py`. |
| Chromium Admin Web với dữ liệu tổng hợp | **2 viewport** | 1360×800 và 390×844. Kiểm tra nút khóa/xóa, trường trạng thái của Admin và OCR khi có điểm 0 hoặc thiếu điểm. |
| Build/typecheck | **PASS** | Docker build production của frontend, TypeScript Web và Mobile. `docker compose config --quiet` pass cho cả hai Compose. |
| Probe image frontend | **PASS** | `/health` trả `healthy`, container vào trạng thái `healthy`. Probe tới loopback thất bại khi chạy cùng image với Nginx tắt. |

Integration test PostgreSQL xác nhận đăng nhập và refresh thành công trước khóa, chặn password và Google sau khóa, chặn JWT đã cấp, refresh chờ khóa hàng, mở khóa cần đăng nhập lại, trạng thái INACTIVE/DISABLED/DELETED bị chặn, sole Admin được bảo vệ, tài khoản thường nhận 403 trên Admin API, danh mục cá nhân bị từ chối, audit đúng actor/target/outcome/request ID, IP giả từ header bị bỏ qua và audit SUCCESS rollback cùng mutation.

Lần thử đầu trên database mới gặp 3 lỗi fixture FinAI. Fixture chọn hai danh mục bằng thứ tự UUID mà chưa loại bản ghi soft-delete. Bổ sung hai danh mục hợp lệ chỉ trong database thử nghiệm giúp 24 ca FinAI/Spring liên quan pass. Mã và test có sẵn của FinAI được giữ nguyên. Kiểm chứng Google dùng payload tổng hợp sau bước verifier. Chưa chạy Google OAuth thật, E2E FinAI live cũ, hoặc luồng trên thiết bị Mobile. Rà soát mã nguồn không tìm thấy WebSocket/STOMP trong luồng ứng dụng. Expo Mobile lint dừng ở bước tự cài ESLint vì dự án chưa có cấu hình. Đã hoàn nguyên mục dependency mà CLI tự ghi vào manifest.

Cơ sở kiểm thử chỉ gồm database, container và image tạm cục bộ. Kết quả nghiệm thu giới hạn ở Phase 1.

## 20. Kết quả triển khai Phase 2 — 27/11/2026

### Phạm vi và hành vi trước/sau

| Finding | Trước | Sau |
|---|---|---|
| P2-01 | Admin đọc entity hàng loạt, lọc và phân trang trong JVM. Recent AI sessions chạy thêm truy vấn theo từng phiên. | PostgreSQL trả projection, `COUNT` và trang dữ liệu cho người dùng, OCR, feedback, legacy audit, AI sessions và broadcast. Admin Web dùng debounce tìm kiếm, reset trang, hủy request cũ và giữ dữ liệu hiện tại trong lúc làm mới. |
| P2-02 | Mọi key trong DB có thể xuất hiện như cấu hình có tác dụng. Bảo trì chỉ áp dụng một phần tại login password. | Allowlist tám key đã kiểm kê. Refresh, Google, password và request dùng JWT tuân cùng chính sách. Admin luôn vào được để tắt chế độ bảo trì. |
| P2-03 | Lịch sử broadcast suy đoán chiến dịch từ tiêu đề, HTTP tạo toàn bộ notification. | Chiến dịch có UUID bền vững và idempotency key. Worker xử lý tối đa 500 người mỗi transaction, lưu tiến độ cùng insert. Lịch sử phân trang và hiển thị riêng dự kiến, đã tạo và đã đọc. Bản ghi hệ thống trước migration xem trong chế độ Legacy, thiếu audience và số đếm chiến dịch thì hiện N/A. |
| P2-04, phần chỉ số hiện có | Dashboard/Analytics đếm qua dữ liệu đã tải vào JVM và có thể bỏ sót timestamp ở biên. | PostgreSQL tổng hợp tài khoản, đăng nhập và số bản ghi. Báo cáo dùng ngày Việt Nam và khoảng `[đầu ngày, đầu ngày kế tiếp)`. Trend giao dịch dùng `occurred_date` và loại soft-delete. Retention tiếp tục vắng khỏi contract. |
| P2-07 | Feedback có thể gán trạng thái tùy ý. Thiếu lịch sử thực và thông báo. | Khóa hàng khi cập nhật, kiểm tra trạng thái và `updatedAt`, lưu người xử lý/thời điểm, ghi chuyển trạng thái và audit trong transaction. Phản hồi mới hoặc kết quả đóng tạo một thông báo in-app. Retry cùng khóa trả kết quả hiện tại. Nội dung phản hồi xuất hiện qua API người dùng. |

Quản lý người dùng giữ cơ chế bảo vệ sole Admin và thu hồi phiên Phase 1. API từ chối trường lạ, tên quá dài hoặc ký tự điều khiển, trạng thái không hợp lệ và gia hạn ngoài 1–365 ngày. Đổi sang gói trả phí cần thời hạn hợp lệ. Chuyển về FREE xóa expiry. Projection danh sách chỉ trả thông tin cần cho bảng quản trị. Báo cáo theo số bản ghi không đại diện lượt dùng tính năng.

### Hợp đồng API và vận hành

- `GET /api/v1/admin/{users,ocr/receipts,feedbacks,audit-logs,ai/sessions,broadcast}` trả `content`, `number`, `size`, `totalElements`, `totalPages`. `page` bắt đầu từ 0, `size` từ 1–100. Allowlist sort `newest|oldest` có UUID làm khóa phụ. `search` là chuỗi con, tối đa 200 ký tự. Filter riêng gồm status/tier, OCR review, feedback status/category, audit action/targetEntity. AI tìm theo mã phiên và trả timestamp/số tin nhắn, không trả tên, email hay tiêu đề hội thoại.
- `GET /admin/ocr/overview` trả aggregate, danh sách tách sang `/admin/ocr/receipts`. Tính nhóm ngày theo Asia/Ho_Chi_Minh. Confidence `0` giữ nguyên và `null` hiển thị N/A.
- `POST /admin/feedbacks/{id}/reply` yêu cầu `Idempotency-Key` UUID và `expectedUpdatedAt`. Payload hỗ trợ đổi trạng thái với reply rỗng. PENDING có thể sang IN_PROGRESS, RESOLVED hoặc REJECTED. IN_PROGRESS có thể sang trạng thái kết thúc. Trạng thái kết thúc giữ nguyên khi thêm reply. Xung đột phiên bản trả 409. Web đi tới `/feedback`, Mobile mở Hồ sơ → Trung tâm trợ giúp → yêu cầu hỗ trợ từ thông báo.
- `POST /admin/broadcast` yêu cầu `Idempotency-Key` UUID và trả 202. Các trạng thái là QUEUED, PROCESSING và COMPLETED. Một UUID xác định một nội dung. Retry dùng UUID cũ trở về cùng chiến dịch. Campaign mới cùng tiêu đề dùng UUID mới. `expectedCount` là số đủ điều kiện lúc xếp hàng, `recipientCount` là số bản ghi notification đã tạo và `readCount` là số có cờ đã đọc. Worker dùng khóa `FOR UPDATE SKIP LOCKED`, cursor UUID, giới hạn thời gian tạo tài khoản tại lúc xếp hàng và kiểm tra trạng thái/gói lúc xử lý. Do thay đổi gói hoặc khóa tài khoản, số thực tế có thể khác dự kiến. Các con số là kết quả in-app. `?legacy=true` trả bản ghi cũ tách riêng và không trả body cá nhân hóa.
- `GET /admin/notification-templates` chỉ đọc. Chỉ mẫu nhắc chi tiêu hằng ngày được scheduler hiện tại dùng để điều khiển bật/tắt, tiêu đề và nội dung. Lịch 20:00 cố định, NORMAL và đối tượng ALL trong nhóm đủ điều kiện. API xác thực cron nếu được gửi và từ chối ghi lịch sai hoặc vô hiệu. Mẫu khác hiển thị chỉ đọc và số dispatch N/A. Cập nhật mẫu không gọi worker.
- `GET /admin/settings` thêm `type/min/max/editable/applies/effect`. Boolean gồm `MAINTENANCE_MODE`, `ALLOW_REGISTRATION`. Integer sửa được gồm `FREE_TIER_MAX_WALLETS` (0–1.000) và hai giá tháng hiển thị (0–100.000.000 VND). `FREE_TIER_OCR_LIMIT` chỉ có consumer hiển thị bảng giá. `AI_RESPONSE_TEMPERATURE` là decimal cũ, `SESSION_TIMEOUT_HOURS` là duration cũ. Cả ba chỉ đọc. JWT/FinAI dùng cấu hình triển khai tương ứng. Registry hiện không có setting enum, string hoặc cron có thể sửa. Setting ngoài allowlist, secret và giá trị sai trả 400.
- Chính sách bảo trì trả 503 cho cấp phiên và request đã xác thực của tài khoản thường. Logout tiếp tục hoạt động. Người dùng đã khóa vẫn tuân cơ chế thu hồi của Phase 1. Phiên hợp lệ chỉ bị tạm chặn trong chế độ bảo trì. Kiểm tra dùng DB hiện tại để đồng nhất giữa instance và thêm một query khóa chính cho request tài khoản thường.

### File và migration

- Backend đọc và contract: `AdminController.java`, `AdminService.java`, `AdminReadQueries.java`, `AdminPaging.java`, `AdminPage.java`, `AdminUserListItem.java`, `AdminAiSessionItem.java`, `UserRepository.java` và DTO Admin liên quan. `pfm-ai-service/main.py` chỉ đổi endpoint thống kê Admin, giữ logic Agent.
- Mutation và bảo trì: `AdminBroadcastService.java`, `AdminSettingDefinition.java`, `SystemConfigService.java`, `AdminUpdateUserRequest.java`, `AdminReplyFeedbackRequest.java`, `AdminBroadcastNotificationRequest.java`, `UpdateNotificationTemplateRequest.java`, `Feedback.java`, `FeedbackRepository.java`, `NotificationTemplateRepository.java`, `DailyNotificationScheduler.java`, `JwtAuthenticationFilter.java`, `AuthService.java`, `TokenService.java`, `GlobalExceptionHandler.java`.
- Web: `adminApi.ts`, `useAdminPage.ts`, `AdminPageFooter.tsx` và các màn hình Users, OCR, Feedback, Broadcast, Audit Logs, AI, Settings, Analytics, Health. Impeccable được dùng cho trạng thái tải, thao tác phân trang và control có kiểu trong bố cục hiện hữu. Health tạm ngừng request polling khi tab ẩn.
- Mobile: `App.tsx`, `NotificationsScreen.tsx`, `ProfileScreen.tsx`, `HelpCenterScreen.tsx`. Luồng thông báo hỗ trợ mở hội thoại hỗ trợ hiện có.
- `V70__admin_feedback_and_broadcast_workflows.sql` thêm metadata xử lý feedback, bảng lịch sử feedback, bảng campaign và FK/unique theo (campaign, người dùng) trên notifications. Các hàng cũ giữ nguyên giá trị, trường mới nullable khi phù hợp. V69 giữ nguyên. Không tạo index hiệu năng riêng trong Phase 2. Unique là ràng buộc chống trùng.
- Regression test chính thức: `AdminPhaseTwoIntegrationTest.java`.

### Benchmark trên PostgreSQL 15.19 cô lập

Mỗi mẫu là một request MockMvc có xác thực, page size 10, sắp xếp cũ nhất. Mỗi API dùng tập synthetic riêng 100, 1.000 và 10.000 hàng. Thời gian bao gồm DB, filter, MVC và serialization. Đây là các mẫu cục bộ, không phải p95 production.

| API | 100 (ms) | 1.000 (ms) | 10.000 (ms) | JSON tại 10.000 (byte) |
|---|---:|---:|---:|---:|
| Users | 25,55 | 18,11 | 47,67 | 3.664 |
| OCR receipts | 17,60 | 17,62 | 49,09 | 3.932 |
| Feedback | 15,43 | 15,58 | 33,34 | 3.914 |
| Legacy audit | 14,56 | 14,22 | 34,15 | 2.684 |
| AI sessions | 14,57 | 15,37 | 24,40 | 1.544 |
| Broadcast | 11,73 | 15,85 | 26,63 | 3.224 |

Trace PostgreSQL cho thấy **3 câu SQL/request** ở cả 18 mẫu. Chúng gồm truy vấn người dùng xác thực, COUNT và truy vấn projection của trang. Baseline `UserRepository.findAll()` riêng, chưa gồm lọc/serializing HTTP, đo 12/33/234 ms và hydrate 135/1.035/10.035 entity. API Users mới chỉ hydrate principal Admin. Bản thử đầu dùng lại mapper cũ phát sinh 13 truy vấn ORM với 10 dòng do tra ví trẻ em, đã được thay bằng projection. Benchmark so sánh lượng tải và số query, không suy ra tỷ lệ tăng tốc endpoint cũ từ hai đường đo khác nhau.

`EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn OCR với dữ liệu trùng timestamp tại 10.000 hàng dùng `idx_receipts_created_at`, `users_pkey` và incremental sort. Mẫu chạy 17,70 ms, 30.210 shared-buffer hits, trả 10 hàng. Database vẫn có thể quét nhiều hàng cho substring search và COUNT chính xác. JVM chỉ nhận trang. Sẽ cân nhắc index bổ sung khi có truy vấn và phân bố dữ liệu vận hành đại diện hơn.

### Điều kiện triển khai và backlog

Áp dụng V70 rồi triển khai đồng bộ Web/Backend và endpoint thống kê Admin của Python. Các client Admin cũ cần cập nhật do contract page và idempotency thay đổi. Worker chạy trong backend với nhịp mặc định 1.000 ms, có thể tắt tại môi trường kiểm thử qua `app.admin.broadcast-worker-enabled`. Phiên bản backend cũ chưa hiểu chiến dịch đang chờ, vì vậy khi rollback cần kiểm soát việc nhận yêu cầu mới và các hàng đang xử lý.

Backlog Phase 3 gồm telemetry FinAI/OCR, khả năng quan sát và bao phủ health ngoài Backend/DB, accessibility toàn bộ Admin, kiểm thử tải đồng thời đại diện production và quyết định về trang Roles. Phần kế hoạch đó nằm ngoài thay đổi Phase 2.

### Kết quả nghiệm thu và xác nhận Phase 1

| Kiểm thử | Kết quả |
|---|---|
| Maven targeted clean trên PostgreSQL đã có Phase 1 | **23 pass, 0 fail, 0 skip**. Gồm Phase 1 Auth/sole Admin, JWT, Enterprise Audit Viewer và 6 integration test Phase 2. |
| Worker broadcast với trên 500 người đủ điều kiện | **1 pass, 0 fail** khi chạy lại ca broadcast với dữ liệu mở rộng. POST chưa tạo notification. Batch đầu tạo đúng 500 hàng. Hai chiến dịch trùng tiêu đề giữ ID độc lập, retry dùng cùng ID và mỗi người có tối đa một notification mỗi chiến dịch. |
| Flyway và bootstrap trên database mới | **1 pass, 0 fail**. Khởi động Spring áp dụng V69 và V70. SQL xác nhận đúng một Admin. Trên database đã có Admin, bộ targeted chạy với Admin hiện hữu. |
| FinAI Python `test_action_agent`, `test_chat_guard` | **65 pass, 0 fail**, cộng kiểm tra cú pháp endpoint thống kê Admin. |
| Web | Docker production build pass, container test healthy, ESLint các file Admin sửa đổi pass. Chromium pass ở 1.360×800 và 390×844 cho phân trang, debounce, response trễ, typed settings, OCR 0/N/A và lịch sử broadcast. Chromium UI người dùng hiển thị phản hồi Admin với fixture API. |
| Mobile | TypeScript pass sau khi nối action `/feedback` vào màn hình trợ giúp hiện có. PostgreSQL integration xác nhận API feedback và API notification dùng chung trả phản hồi và một thông báo cho người nhận. |

Xác nhận Phase 1 dùng lại bằng chứng 111 backend/65 Python tại mục 19 và chạy lại các ca liên quan. Password, Google dùng payload sau verifier, refresh và JWT đều đã kiểm tra theo trạng thái khóa/mở khóa. Refresh cạnh tranh chờ khóa hàng. JWT ký theo contract trước V69 dùng được khi session version còn 0 và bị từ chối sau khóa lẫn sau mở khóa. Ca rollback kiểm tra audit SUCCESS và cập nhật trạng thái cùng bị rollback. Ca sole Admin xác nhận audit DENIED vẫn ghi đúng actor và target. WebSocket/STOMP không xuất hiện trong luồng ứng dụng đã rà soát. 

Các phần còn cần kiểm chứng ngoài môi trường này gồm OAuth với Google thật, mở thông báo trên thiết bị iOS/Android, push delivery, FinAI live E2E, profile heap và benchmark tải đồng thời trên dữ liệu production đại diện. Native lint chưa có cấu hình sẵn. Hồi quy đã dùng database và image tạm cục bộ với dữ liệu tổng hợp.

## 21. Phase 3 — Giám sát vận hành FinAI, OCR và hạ tầng

> Ngày nghiệm thu cục bộ 27/11/2026 (Asia/Bangkok). **PARTIALLY READY** cho Phase 3. Môi trường kiểm thử dùng PostgreSQL 15 trong Docker, dữ liệu tổng hợp và fixture có kiểm soát.

### A. Findings, nguồn dữ liệu và công thức

| Finding và nguyên nhân gốc | Nguồn trước Phase 3 | Nguồn và định nghĩa Phase 3 |
|---|---|---|
| P2-06 — Thiếu số liệu request FinAI. Tin nhắn và phiên được dùng để diễn giải hoạt động | `core.ai_chat_sessions`, `core.ai_chat_messages` chỉ đủ đếm phiên và tin nhắn đã lưu | Giữ tổng phiên và tin nhắn toàn thời gian. Đếm request trong kỳ từ `ops.service_request_metrics`, đếm hôm nay theo ngày Việt Nam và đếm người dùng theo HMAC phân biệt trong kỳ. Có breakdown theo trợ lý, dự báo số dư, dự báo tài chính, bất thường, hành vi và gợi ý. Từng nhóm có kết quả, độ trễ và dấu thời gian gần nhất. |
| P2-06 — Thiếu mức quan sát model và tool | Runtime trace đã biết lượt gọi, vòng, retry và lỗi. Kết quả model có usage metadata khi provider cấp | Gemini/model lấy từ instance đang chạy và metadata phản hồi khi có. Lượt gọi tính từng lần invoke quan sát được. Vòng lấy số vòng model lớn nhất trong một lần xử lý, cộng qua các lần xử lý cùng khóa. Retry provider là attempt sau lần đầu của vòng. Latency provider bằng tổng ms chia số lượt gọi. Nhóm lỗi theo quota, rate limit, timeout, unavailable, network, invalid request và other. Input/output cộng từng trường có số liệu, tổng token dùng các bản ghi có đủ cặp. |
| P2-06 — Vòng đời Action Agent thiếu aggregate | `core.finai_pending_actions`, `core.finai_action_audit_logs` đủ cho trạng thái và các mốc đã lưu | Registry đang dùng gồm 11 READ và 14 WRITE. READ đếm thực thi thành công/lỗi và tổng thời gian theo tool. WRITE đếm lượt tool được model chọn. Proposal dùng `created_at`, xác nhận dùng `confirmed_at`, thực thi đã commit dùng `COMPLETED` và `executed_at`. Hủy, hết hạn và thất bại dùng sự kiện audit đã lưu, đếm `DISTINCT action_id`. Pending hiện tại là `PENDING` chưa quá hạn. Có số phản hồi MESSAGE, CLARIFICATION, ACTION_REQUIRED, MULTI_ACTION_REQUIRED và mốc xác nhận đến thực thi theo tool. |
| P2-05 — Bảng receipt thiếu lượt quét thất bại, thời gian xử lý và nguyên nhân | `core.receipts` đủ đếm hóa đơn đã lưu, cần kiểm tra, confidence và liên kết giao dịch | Đếm riêng `OCR_SCAN`, số lần gọi upstream OCR, số receipt đã lưu từ các lượt quét thành công và lượt `OCR_TRANSACTION` thành công. Latency engine chia tổng thời gian gọi cho số lượt gọi upstream. Confidence trung bình lấy từ receipt lưu thành công có điểm. 0 được giữ nguyên, null hiển thị N/A. Hóa đơn cũ chỉ góp vào thống kê receipt và liên kết giao dịch lịch sử. |
| P2-08 — Phạm vi health cũ chỉ bao phủ Backend và DB | JVM, pool Hikari, PostgreSQL và endpoint health rời rạc | Ma trận Spring Boot, PostgreSQL, Redis, MinIO, FinAI Python, OCR Python, Nginx và Frontend Web. Có trạng thái, độ trễ probe, thời điểm kiểm tra, lần thành công gần nhất, mã lỗi an toàn và phạm vi. Dashboard dùng snapshot và đọc số lượt FinAI/OCR hôm nay, tỷ lệ lỗi cùng số feedback đang chờ hoặc xử lý. |

Khoảng ngày từ 1 đến 90 ngày, tính theo `Asia/Ho_Chi_Minh`, bắt đầu tại 00:00 ngày đầu và kết thúc trước 00:00 ngày kế tiếp sau ngày cuối. Yêu cầu hợp lệ được phân loại `SUCCESS`, `FAILED` hoặc `REJECTED`. 401/403 được loại khỏi thống kê. Tỷ lệ thành công là `SUCCESS / (SUCCESS + FAILED)`, tỷ lệ lỗi là `FAILED / (SUCCESS + FAILED)`. Mẫu số 0 hiển thị N/A. Độ trễ end-to-end dùng thời gian xử lý ở Spring cho lần xử lý cuối được ghi, bao gồm các lần gọi dịch vụ nằm trong request đó. Trung bình và percentile loại yêu cầu đầu vào bị từ chối. P50/P95 dùng `percentile_cont` khi có ít nhất 20 mẫu. Clarification, câu trả lời hợp lệ ngoài phạm vi, dữ liệu tài chính trống và hủy đề xuất không thuộc nhóm lỗi vận hành.

`firstObservedAt` trả mốc bản ghi vận hành đầu tiên hiện có của dịch vụ. Sau khi áp dụng V71, Spring bắt đầu ghi nhận từ yêu cầu đầu tiên đi qua adapter đã instrument và được ghi thành công. Dữ liệu trước mốc này không có backfill. Việc thiếu metadata provider hay confidence được thể hiện qua null hoặc N/A. Mã lỗi OCR phân biệt ảnh bị từ chối, ảnh không hợp lệ, quá cỡ được Backend nhận, timeout, dịch vụ không khả dụng và lỗi xử lý. Metrics OCR chỉ đếm cuộc gọi HTTP sang dịch vụ. Lượt Paddle nội bộ và lượt fallback vision trong cùng cuộc gọi chưa có counter độc lập. Số lỗi multipart bị chặn trước controller hoặc tại proxy chưa được ghi đủ.

Kết quả FinAI lịch sử phản ánh trạng thái và sự kiện đã commit. Lỗi thực thi rollback cả bản ghi trạng thái và audit không thể suy ra từ các bảng đó. Tỷ lệ thành công READ lấy theo kết quả dispatch thực tế. WRITE vẫn cần người dùng xác nhận và thực thi qua luồng hiện có. Phase 3 không đo quota còn lại, giá token, accuracy OCR, toàn bộ CPU/RAM VPS hoặc khả dụng riêng từng thuật toán bằng probe chủ động. Lần xử lý thành công gần nhất theo chức năng là bằng chứng từ traffic đã quan sát. Health FinAI chỉ cho biết khả năng phản hồi của tiến trình Python.

### B. Kiến trúc, API và dữ liệu

- Backend gồm `modules/admin/monitoring`, các DTO/query Admin liên quan, một interceptor MVC và adapter FinAI/OCR. Python chuyển các counter nhỏ của FinAI qua header nội bộ đã xác thực. OCR thêm endpoint readiness nội bộ kiểm tra trạng thái khởi tạo pipeline. Web bổ sung các panel vốn dùng bố cục Admin hiện có và giữ phân trang phiên FinAI/receipt. Các thay đổi cấu hình nằm ở Compose dev/prod, `.env.example`, `application.yml` và `nginx/nginx.conf`.
- `GET /api/v1/admin/monitoring/{ai|ocr}/summary`, `GET /api/v1/admin/monitoring/{ai|ocr}/requests` và `GET /api/v1/admin/monitoring/dashboard` yêu cầu `ROLE_ADMIN` và trả `Cache-Control: no-store`. Hai endpoint theo dịch vụ validate ngày. Danh sách hỗ trợ tiền tố Request ID, outcome, chức năng, model, mã lỗi, tối đa 100 hàng, mới/cũ theo thời điểm và ID. Các giá trị filter được kiểm tra và bind parameter. `/admin/system-health` có `serviceHealth`, GC, CPU tiến trình, Hikari active/idle/pending/max và no-store. `/admin/ocr/receipts` chỉ chiếu ID, thời điểm lưu, confidence và review, lọc theo tiền tố ID. `/admin/ocr/overview` bổ sung số receipt có liên kết giao dịch.
- V71 chỉ thêm `ops.service_request_metrics`. Cột gồm khóa chính, Request ID, định danh HMAC, chức năng, thời điểm bắt đầu, ms, outcome, mã lỗi, kiểu phản hồi, số liệu model/tool đã allowlist và metadata engine OCR. Không trả HMAC, khóa chống trùng, prompt, chat, tên/email, tool payload, ảnh, merchant, tổng tiền hay URL ảnh. Health trả mã và phạm vi probe đã định nghĩa, không trả cấu hình tham chiếu, địa chỉ nội bộ hoặc credential. Nginx trả 404 cho đường nội bộ đã kiểm tra. Compose chỉ expose cổng Python trong mạng Docker.
- FinAI replay từ cache và xung đột cùng khóa được loại khỏi bộ đếm request nghiệp vụ. Request chạy lại sau lỗi có cùng HMAC khóa cập nhật một hàng, cộng provider calls, rounds, token, lỗi, số lượt engine và attempts. HMAC gồm chức năng, người dùng và khóa đã validate. Outcome, latency và Request ID ở hàng biểu diễn lượt xử lý cuối đã ghi. Nếu model đổi giữa các lần có cùng khóa, các counter vận hành được cộng vào hàng mang model được ghi nhận sau cùng. Request OCR có khóa hợp lệ được gộp ở telemetry. Các client OCR hiện hành chưa gửi khóa nên mỗi lời gọi độc lập được tính riêng.
- Ghi telemetry sau MVC, tách khỏi transaction nghiệp vụ bằng worker một luồng và hàng đợi 256 mục. Mỗi lượt có tối đa một UPSERT. Khi đầy hoặc lỗi ghi, worker phát cảnh báo đã giới hạn tần suất và dữ liệu vận hành có thể thiếu. Luồng OCR chỉ mở transaction khi lưu và chuyển receipt sang DTO. Enterprise Audit giữ chính sách riêng cho thao tác nhạy cảm. Hàng đợi trong RAM có thể mất mẫu chưa ghi khi dừng tiến trình.
- Health snapshot dùng cache 20 giây, tối đa 6 probe song song, mỗi probe HTTP giới hạn 2 giây và giới hạn tổng cho future 2,3 giây. Các request đồng thời dùng chung đợt refresh. Sau TTL trả snapshot được đánh dấu cũ trong khi refresh. PostgreSQL dùng kết nối riêng và SELECT 1 để tránh xếp hàng Hikari. Redis dùng RESP PING và AUTH khi có cấu hình. MinIO, Nginx, Frontend và hai service Python dùng origin cấu hình triển khai với path cố định, không theo redirect. Dịch vụ tùy chọn phân biệt DISABLED và NOT_CONFIGURED. PostgreSQL hoặc Backend hỏng hoàn toàn có thể khiến JWT/API Admin không truy cập được để đọc snapshot.

### C. Benchmark cục bộ và lưu trữ

PostgreSQL 15.19 Docker, Spring MockMvc xác thực JWT, fixture trộn FinAI/OCR, phạm vi một ngày, trang 15 mục. Một lần warm-up rồi đo một lần cho mỗi endpoint. Cột SQL tính cả truy vấn user xác thực JWT, xác nhận từ PostgreSQL statement trace. Health trong benchmark là cache hit.

| Endpoint | SQL SELECT | 100 bản ghi · ms / byte | 1.000 bản ghi · ms / byte | 10.000 bản ghi · ms / byte |
|---|---:|---:|---:|---:|
| FinAI summary | 13 | 18,46 / 2.874 | 20,53 / 2.906 | 53,41 / 2.911 |
| FinAI requests | 3 | 7,98 / 7.532 | 8,35 / 7.553 | 12,76 / 7.570 |
| OCR summary | 7 | 12,96 / 2.487 | 11,48 / 2.511 | 23,59 / 2.507 |
| OCR requests | 3 | 12,96 / 7.443 | 10,26 / 7.480 | 13,65 / 7.497 |

- 100 lượt ghi đơn có trung bình **1,279 ms/lượt** gồm chuẩn hóa/HMAC và SQL trên cùng kết nối test transaction. Thời gian phát commit độc lập và độ trễ chờ queue chưa được profile. Vòng đời HTTP sản phẩm giao bản ghi vào queue sau khi xử lý.
- Test health với hai lần đọc đồng thời, một HTTP timeout và Redis/MinIO không phản hồi bình thường. Cache miss mất **2.019,22 ms**, cache hit **0,028 ms**. Chỉ một probe FinAI chạy mỗi đợt. Test tạo snapshot quá TTL để xác nhận phục vụ bản cũ và refresh chung.
- Mẫu `EXPLAIN (ANALYZE, BUFFERS)` cho trang FinAI với khoảng ngày hẹp, 10.000 hàng tổng hợp và 126 hàng test ngoài trang dùng sequential scan và top-N sort 26 kB, **3,612 ms**, 374 buffer hits. V71 chỉ có index của khóa chính và UNIQUE chống trùng. Chưa có đủ bằng chứng từ fixture để thêm index phục vụ lọc. Cần đo lại khi khối lượng ổn định và phân bố theo thời gian giống staging.
- Đo `pg_column_size` trung bình **294 B/hàng**. Với 100, 1.000 và 10.000 yêu cầu/ngày, 30 ngày ước tính **0,88 / 8,82 / 88,2 MB** dữ liệu hàng, 90 ngày **2,65 / 26,46 / 264,6 MB**. Chưa gồm page overhead, index, bloat, WAL hoặc backup. Đề xuất bắt đầu theo dõi dung lượng với 30 ngày, cân nhắc 90 ngày theo tải thực và nhu cầu tra cứu. Chưa có cleanup job, giữ nguyên retention Enterprise Audit.
- Chưa có đo heap/JFR, benchmark tải nhiều Admin và phần trăm CPU trên VPS. Giới hạn vận hành hiện có là một worker ghi với queue hữu hạn, sáu probe song song và phân trang ở DB.

### D. Kiểm thử và hồi quy

| Nhóm | Kết quả |
|---|---|
| Java Spring/PostgreSQL | **76 pass, 0 fail, 0 skip** qua các lượt targeted. Gồm monitoring, auth/session version, sole Admin, pagination, feedback, broadcast, maintenance, settings, Enterprise Audit, FinAI client/tool và acceptance backend. Ca FinAI dùng mock provider, gồm replay, Clarification nhiều lượt, Confirm/Cancel và Confirm lặp. Ca rollup kiểm tra audit lặp chỉ được đếm một lần. |
| Migration | PostgreSQL mới bootstrap tới V71 qua ứng dụng. Ca Flyway riêng áp dụng tới V70, thêm receipt cũ confidence 0, áp dụng V71 và xác nhận receipt còn nguyên, bảng telemetry mới rỗng. |
| Python | **66 pass, 0 fail, 0 skip**. Có quota, rate limit, timeout, provider unavailable, retry, lượt READ/WRITE, nhiều vòng, token 0/thiếu và kiểm tra loại payload khỏi header. |
| OCR và data minimization | PostgreSQL fixture cho thành công, lỗi upstream, retry, confidence 0/null, needs review và receipt lịch sử. Request multipart ảnh không hợp lệ đi qua JWT, controller, validator và worker ghi telemetry. Kiểm tra bảng Admin không trả merchant, tên/email, ảnh, signed URL, raw text, ID người dùng hay khóa telemetry. |
| Health và phân quyền | PostgreSQL và HTTP loopback; fixture HTTP MinIO lỗi, TCP Redis không dùng được, FinAI health phản hồi, Nginx timeout, OCR disabled, Frontend chưa cấu hình, cache hit/miss, stale và hai lần đọc đồng thời. JWT thường bị 403 và JWT đã thu hồi bị 401. Nginx trong container trả 200 tại `/health`, 404 tại `/ai/internal-health`, `/internal-health`, `/api/internal/health`, `/ai/docs`. |
| Web và Mobile | Web production build, ESLint trên các file Admin sửa đổi, Mobile TypeScript, Compose dev/prod config, Nginx config và git diff whitespace check đều pass. Chromium với API fixture ở 1.360×800 và 390×844 kiểm tra phân trang, thay khoảng ngày, tìm request ID, mã lỗi, health cũ và service disabled. |

Các ca chưa kiểm chứng gồm gọi Gemini thật, OCR Paddle/vision thật với ảnh đã ẩn dữ liệu, OCR timeout/unavailable qua engine thật, toàn bộ hạ tầng đồng thời UP hoặc chuyển trạng thái qua Redis/MinIO/PostgreSQL thật, heap và tải đồng thời đại diện VPS. Fixture kiểm tra logic phân loại và giữ được từng kết quả khi một probe lỗi. Mục 19 và 20 giữ bằng chứng hồi quy đã nghiệm thu ở các phase trước.

### E. Điều kiện triển khai thử

- Áp dụng V71 với Backend phiên bản mới và PostgreSQL đã có V69/V70. Rebuild Web, Backend và FinAI Python để có dữ liệu model/usage. Rebuild OCR Python nơi triển khai OCR và nạp Nginx config mới. Backend/Web mới nên được kiểm tra cùng nhau vì danh sách receipt Admin đã thu hẹp payload.
- Compose mặc định probe OCR ở dev và để OCR DISABLED ở prod. Chỉ bật probe OCR prod khi có origin nội bộ. MinIO cần `MONITOR_MINIO_URL` khi được triển khai. Dùng `MONITOR_TELEMETRY_ENABLED=false` nếu cần tạm dừng ghi. `MONITOR_FINAI_URL`, `MONITOR_NGINX_URL`, `MONITOR_FRONTEND_URL` lấy mặc định từ Compose, Redis và PostgreSQL dùng cấu hình kết nối hiện có.
- Rollback ứng dụng có thể để bảng V71 nguyên tại chỗ. Giữ bản ghi và checksum migration khi chuyển phiên bản. Nếu quay lại Backend cũ, giới hạn dữ liệu của endpoint receipt Admin trở về contract cũ. Theo dõi warning queue/ghi metrics, kết quả probe và kích thước thực tế của bảng trước khi quyết định retention trên staging.

**Kết luận Phase 3: PARTIALLY READY.** Phạm vi triển khai và kiểm thử cô lập đã hoàn tất. Các ca dùng dịch vụ thật và đo tài nguyên/tải đại diện VPS còn cần cho nghiệm thu triển khai thử. Không có thay đổi ở production.
