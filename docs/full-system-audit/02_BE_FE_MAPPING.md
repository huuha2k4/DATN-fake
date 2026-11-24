# 02 — Mapping Backend ↔ Web ↔ Mobile

Phân loại dựa trên controller, API client, consumer màn hình, scheduled/internal call và kết quả build/runtime. Không coi “không tìm thấy tên hàm” là unused.

| Module | BE API chính | Web | Mobile | DB | Trạng thái | Bằng chứng / hành động |
|---|---|---|---|---|---|---|
| Auth | `/api/v1/auth/**` | authApi | authApi | users/auth_tokens/oauth | FULLY_CONNECTED tĩnh | E2E OTP/OAuth BLOCKED |
| User | `/api/v1/users/**` | userApi | userProfileApi | users | FULLY_CONNECTED tĩnh | upload cần harden |
| Account | `/api/v1/accounts/**` | accountApi | accountApi | accounts | PARTIAL | link/sync BE trả 501 tại `AccountController:229–269` |
| Transaction | `/api/v1/transactions/**` | transactionApi/report | transactionApi/screens | transactions | PARTIAL | update payload có thể đổi account nhưng BE thiếu ownership |
| Category/Tag/Merchant | `/api/v1/categories`, tags, merchants | Có | Có một phần | tương ứng | PARTIAL/BE_ONLY | Merchant/tag chưa enrich response transaction |
| Budget | `/api/v1/budgets/**` | Có | Có | budgets/items | PARTIAL | Web/Mobile compile fail |
| Goal | `/api/v1/goals/**` | Có | Có | goals/contributions | PARTIAL | savings chỉ là presentation của goal |
| Debt | `/api/v1/debts/**` | Có | Có | debts/payments | PARTIAL/MOCK_ONLY nhánh lỗi | Mobile giữ demo history khi API lỗi |
| Schedule | `/api/v1/schedules/**` | Có | Có | schedules/occurrences | PARTIAL | Web so status `PAID/PAID_OFF` không có trong type |
| Group | `/api/v1/groups/**` | groupApi | groupApi | 15+ bảng group | PARTIAL/BROKEN | compile fail, authorization issue |
| OCR | `/api/v1/ocr/**` | Có | Có | receipts | FULLY_CONNECTED tĩnh | chưa test image matrix |
| Notification | `/api/v1/notifications/**` | Có | Có | notifications/settings | BROKEN Mobile settings | URL lặp `/api/v1` |
| Report | `/api/v1/reports/export-pdf`, transaction summary | Có | Có | aggregate transaction | PARTIAL | chưa đối soát mọi screen |
| AI 2–5 | `/api/{behavior,forecast,anomalies,recommendations}` | aiApi | 3 client | PostgreSQL qua Python | FULLY_CONNECTED | E2E 37/37 trước audit này, xem `AI_2_5_AUDIT_REPORT.md` |
| FinAI Agent | `/api/v1/finai/**` | finAiAgentApi | finAiAgentApi | finai_* | FULLY_CONNECTED tĩnh | 30 unit Agent PASS; E2E action BLOCKED |
| AI admin | FastAPI `/api/ai/admin/stats` | raw axios | N/A | chat | BROKEN | Spring/Nginx route yêu cầu JWT nhưng không proxy endpoint |
| Internal FinAI tools | `/api/internal/v1/finai/tools/**` | Không | Không | nhiều module | INTERNAL | Nginx chặn 404; context token verify trong controller |

## BE_ONLY / INTERNAL / UNUSED_CANDIDATE

- Bank link/sync: BE_ONLY placeholder, trả `501 NOT_IMPLEMENTED`; không xóa.
- Account types public, health/actuator, admin, internal FinAI callback: INTERNAL/public operational theo mục đích.
- Legacy chat controller `/api/chat`: UNUSED_CANDIDATE vì UI hiện dùng `finAiAgentApi`; vẫn có legacy clients nên chưa đủ căn cứ xóa.
- Test route `/api/v1/test/**` được whitelist nhưng không tìm thấy controller tương ứng: UNUSED_CANDIDATE và security surface cần xác minh trước deploy.

## Finding MAP-001 — Mobile notification settings ghép URL sai

- **Severity:** HIGH
- **Module:** Mobile notifications
- **File và line:** [notificationSettingsApi.ts:65](../../frontend-app/src/modules/profile/api/notificationSettingsApi.ts), [notificationSettingsApi.ts:140](../../frontend-app/src/modules/profile/api/notificationSettingsApi.ts), [authApi.ts:29](../../frontend-app/src/modules/auth/api/authApi.ts)
- **Bằng chứng:** `API_BASE_URL` đã kết thúc bằng `/api/v1`, client nối thêm `/api/v1/notifications/settings`.
- **Tái hiện:** với base mặc định, URL thành `.../api/v1/api/v1/notifications/settings`.
- **Expected:** GET/PUT `/api/v1/notifications/settings`.
- **Actual:** 404/500 tùy proxy; sau đó app dùng local cache và che lỗi sync.
- **Root cause:** trộn convention root base với versioned base.
- **Recommended fix:** dùng `${API_BASE_URL}/notifications/settings`; gom URL builder.
- **Regression test:** mock fetch khẳng định exact URL, GET và PUT; E2E restart app kiểm persistence server.

## Finding MAP-002 — Trang AI Admin không thể lấy dữ liệu

- **Severity:** HIGH
- **Module:** Web Admin / AI
- **File và line:** [AdminAIManagementScreen.tsx:45](../../frontend-web/src/modules/admin/screen/AdminAIManagementScreen.tsx), [main.py:1043](../../pfm-ai-service/main.py)
- **Bằng chứng:** Web dùng raw `axios.get('/api/ai/admin/stats')`, không interceptor JWT. Nginx gửi `/api` vào Spring; Spring không có controller route này. Runtime trả 403.
- **Tái hiện:** mở trang admin AI hoặc `curl http://localhost:1116/api/ai/admin/stats`.
- **Expected:** route Spring admin được role-protect và proxy nội bộ.
- **Actual:** request dừng ở Spring; endpoint FastAPI không đạt tới.
- **Root cause:** FE trỏ contract Python qua namespace Spring nhưng thiếu adapter và auth client.
- **Recommended fix:** sau phê duyệt, thêm Spring admin proxy hoặc bỏ trang nếu ngoài scope; dùng shared API client.
- **Regression test:** ADMIN 200, USER 403, no-token 403, Python direct 401.

## Finding MAP-003 — Mock account/category có thể biến lỗi đọc thành payload ghi sai

- **Severity:** HIGH
- **Module:** Mobile Group
- **File và line:** [GroupScreen.tsx:697](../../frontend-app/src/modules/group/screen/GroupScreen.tsx), [GroupScreen.tsx:712](../../frontend-app/src/modules/group/screen/GroupScreen.tsx), [GroupScreen.tsx:721](../../frontend-app/src/modules/group/screen/GroupScreen.tsx)
- **Bằng chứng:** khi API lỗi/rỗng, UI tạo IDs `wallet_cash`, `cat_food`… và chọn làm ID mặc định.
- **Tái hiện:** ngắt endpoint account/category, mở modal giao dịch nhóm rồi submit.
- **Expected:** empty/error state và chặn submit.
- **Actual:** UI hiển thị số dư giả và có thể gửi ID không phải UUID.
- **Root cause:** demo fallback nằm trong production flow.
- **Recommended fix:** bỏ dữ liệu giả khỏi path ghi; hiển thị retry/empty state.
- **Regression test:** API 500/empty phải disable submit và không gọi POST.

## Finding MAP-004 — Legacy Mobile client có đường gọi trực tiếp AI

- **Severity:** MEDIUM
- **Module:** Mobile AI legacy
- **File và line:** [aiChatApi.ts:17](../../frontend-app/src/modules/ai-assistant/api/aiChatApi.ts), [aiChatApi.ts:74](../../frontend-app/src/modules/ai-assistant/api/aiChatApi.ts)
- **Bằng chứng:** ưu tiên `EXPO_PUBLIC_AI_URL`, gửi `user_id` và không gắn JWT; consumer hiện dùng FinAI Agent mới nên đây là dead/legacy candidate.
- **Tái hiện:** import client và đặt `EXPO_PUBLIC_AI_URL` về Python.
- **Expected:** mọi UI đi Spring proxy, identity từ JWT.
- **Actual:** client cho phép direct Python; middleware hiện từ chối nên flow hỏng.
- **Root cause:** code legacy còn lại sau migration.
- **Recommended fix:** xác nhận không còn dynamic consumer rồi deprecate/remove trong pha FIX riêng; không sửa FinAI Agent.
- **Regression test:** static rule cấm URL Python trong client bundle; integration route qua Spring.
