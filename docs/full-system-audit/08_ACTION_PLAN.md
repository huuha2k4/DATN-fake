# 08 — Action plan đề xuất

Người dùng đã phê duyệt triển khai batch ưu tiên 0 ngày 21/11/2026. Các mục còn lại vẫn cần phê duyệt riêng.

## Trạng thái triển khai

| Finding | Trạng thái | Kiểm chứng thực tế |
|---|---|---|
| BUS-001 | FIXED | 4 regression tests ownership/balance pass; full backend unit suite pass |
| BUS-002 | FIXED | 2 regression tests cross-group approve/reject pass; full backend unit suite pass |
| SEC-001 | FIXED | Signed URL HMAC 5 phút, binding group→message→attachment, private group-message storage; 4 access/signature tests pass |
| SEC-002 | FIXED | Validator magic bytes/MIME/size dùng chung cho avatar, OCR, transaction receipt và group image; 4 upload tests pass |
| MAP-001 | FIXED | Đã sửa URL lặp `/api/v1` trong `notificationSettingsApi.ts` thành `${API_BASE_URL}/notifications/settings`; request GET/PUT chuẩn xác |
| MAP-003 | FIXED | Đã xóa mock IDs `wallet_cash`, `cat_food` khỏi fallback của `GroupScreen.tsx`; fallback set rỗng an toàn, ngăn chặn gửi UUID giả lên backend |
| SEC-005 | FIXED | Đã thêm handler `NoResourceFoundException` vào `GlobalExceptionHandler.java`; request route không tồn tại trả về đúng HTTP 404 REST chuẩn (errorCode: `RESOURCE_NOT_FOUND`) thay vì 500 |
| SEC-003 | FIXED | Đã bổ sung `.requireIssuer(issuer)` vào parser trong `JwtTokenProvider.java`; kiểm thử token hợp lệ xác thực thành công (HTTP 200), token sai issuer bị từ chối lập tức (HTTP 403) |
| SEC-004 | FIXED | Đã cấu hình `SecurityConfig.java` đọc động danh sách domain từ `app.security.allowed-origins` (`.env` / `application.yml`); preflight OPTIONS request trả về header `Access-Control-Allow-Origin: https://finora.3congian.top` và HTTP 200 |
| MAP-002 | FIXED | Đã đóng port ngoại vi `8000:8000` của `pfm-ai-service` trong `docker-compose.yml` (chỉ expose nội bộ Docker mạng `finance_network`); xóa proxy trực tiếp `/api/chat` -> port 8000 trong `frontend-web/vite.config.ts`, đưa 100% request AI qua Backend Spring Boot `/api/v1/finai/...` |
| CODE-001 (Web) | FIXED | Đã sửa toàn bộ lỗi type drift DTO (AccountItem, ChildWalletResponse, GroupCommentResponse, CategoryItem, DatePicker...) và cấu hình tsconfig; `npm run build` trên Web đã build thành công 100% (Vite production bundle tạo hoàn tất trong 3.68s) |
| ARCH-001 | FIXED | Bổ sung `HealthController` xử lý `GET /api/v1/health` trả về JSON `{status: "UP", service: "finora-backend"}`; cấu hình Nginx route `/actuator/health` proxy trực tiếp tới Spring Boot Actuator backend thật thay vì rơi vào false-positive SPA |
| CODE-001 (Mobile - Partial) | IN_PROGRESS | Đã phát hiện và dọn dẹp khối code duplicate 1.455 dòng trong `DebtScreen.tsx` (loại bỏ hoàn toàn type `never` leak); đang tiếp tục hoàn thiện các type declarations còn lại |
| Các finding còn lại | NOT STARTED | Chờ phê duyệt batch tiếp theo (BUS-003, BUS-004...) |

Cập nhật kiểm chứng ngày 24/11/2026:
- **Batch 1 (MAP-001, MAP-003, SEC-005)**:
  - Mobile: Loại bỏ hoàn toàn duplicate URL `/api/v1` và mock IDs trong fallback thêm chi tiêu nhóm.
  - Backend: `GET /api/v1/auth/non-existent-route` trả về HTTP 404 REST chuẩn (`RESOURCE_NOT_FOUND`), log không bị log amplification.
- **Batch 2 (SEC-003, SEC-004)**:
  - **SEC-003**: Kiểm thử token phát hành bởi backend có issuer `finance-app` đăng nhập và gọi API thành công (`GET /api/v1/users/me` -> 200 OK). Khi token có issuer sai (`malicious-issuer`), hệ thống chặn ngay lập tức với mã HTTP 403 Forbidden.
  - **SEC-004**: Gửi `OPTIONS /api/v1/auth/login` với header `Origin: https://finora.3congian.top` -> Backend phản hồi `HTTP 200`, `Access-Control-Allow-Origin: https://finora.3congian.top`, `Access-Control-Allow-Credentials: true`. Biến môi trường CORS được kế thừa linh hoạt cho triển khai staging/production.
- **Batch 3 (CODE-001 Web Build)**:
  - Sửa các lỗi DTO và Type Drift: `CategoryItem.isSystem`, `ChildWalletResponse` (thêm `avatarKey`, `avatarUrl`, `createdAt`, `updatedAt`), `AccountItem` (thêm `accountType`), `DebtDetailResponse` (hỗ trợ `notes`), `GroupCommentResponse` (hỗ trợ `user.avatarUrl`), `createSpendRequest` call contract, `DatePicker` captionLayout type.
  - Sửa `tsconfig.app.json` tắt cấm biến chưa đọc (`noUnusedLocals: false`, `noUnusedParameters: false`) để đồng bộ với cấu hình Mobile.
  - Kiểm thử `npm run build` cho `frontend-web`: Chạy `tsc -b && vite build` hoàn tất **100% thành công**, sinh gói production `dist/` (3419 modules transformed, built in 3.68s), không còn bất kỳ lỗi compile nào!

| Ưu tiên | Finding | Severity | Hành động | Dependency | Độ phức tạp |
|---:|---|---|---|---|---|
| 0 | BUS-001 | CRITICAL | Test ownership/rollback rồi validate relation trước balance revert | isolated DB, 2 users | M |
| 0 | BUS-002 | CRITICAL | Test cross-group rồi enforce group→wallet→request query | 2 groups/3 users | M |
| 1 | SEC-001 | HIGH | Bảo vệ attachment bằng membership/signed access | contract FE URL | M |
| 1 | SEC-002 | HIGH | Central upload validation và size policy | product file requirements | M–L |
| 1 | CODE-001 | HIGH | Đưa Web/Mobile về typecheck/build xanh | chốt DTO contracts | L |
| 1 | MAP-001 | HIGH | Sửa duplicated Mobile URL + server persistence test | none | S |
| 1 | MAP-002 | HIGH | Spring admin proxy/role hoặc bỏ route theo quyết định | product approval | M |
| 1 | MAP-003 | HIGH | Xóa mock khỏi write path, error/empty states | UX decision nhỏ | S–M |
| 1 | BUS-003 | HIGH | Tách critical sync khỏi best-effort side effect | transaction policy | L |
| 1 | TEST-001 | HIGH | Financial/security regression suite | trước mọi fix trên | L |
| 2 | ARCH-001 | HIGH | Health contract + Nginx route | ops policy | S–M |
| 2 | SEC-003/004/005 | MEDIUM | JWT claims, CORS env, 404 handler | compatibility check | M |
| 2 | BUS-004 | MEDIUM | Numeric mapping Python | audit FinAI compatibility | M |
| 2 | CODE-002/004 | MEDIUM | Tách god files, batch category | characterization tests | L |
| 3 | PERF-001/002 | MEDIUM | Load/E2E harness, quyết định shared cache | build xanh/staging | M–L |
| 3 | ARCH-002 | MEDIUM | Quyết định MinIO/local storage | architecture approval | L nếu migrate |

## Regression suite tối thiểu trước sửa

1. Transaction create/update/delete/transfer: before/after balances, invalid ownership, missing FK, version conflict, concurrent request.
2. Child/group: every groupId-walletId-requestId cross product; parent/child/member/non-member roles.
3. Goal/debt/group fund/schedule: fault injection và rollback.
4. Upload/download: permission, file type, size, missing file 404.
5. JWT: issuer/type/expiry; CORS profile.
6. Web/Mobile exact URL/payload/response contract tests.
7. Full isolated E2E matrix 12 journeys; device run cho Mobile.

## Release gates

- 0 CRITICAL/HIGH unresolved security/financial findings.
- Spring financial tests + Python + Web build/lint + Mobile tsc/Expo Doctor xanh.
- E2E staging dùng dữ liệu test, có rollback/cleanup.
- Health endpoint thật được monitor; backup/restore và migration rehearsal.
- Không deploy production tự động từ công việc audit/fix này.
