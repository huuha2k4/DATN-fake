# 08 — Action plan đề xuất

Người dùng đã phê duyệt triển khai batch ưu tiên 0 ngày 21/11/2026. Các mục còn lại vẫn cần phê duyệt riêng.

## Trạng thái triển khai

| Finding | Trạng thái | Kiểm chứng thực tế |
|---|---|---|
| BUS-001 | FIXED trong working tree | 4 regression tests ownership/balance pass; full backend unit suite pass |
| BUS-002 | FIXED trong working tree | 2 regression tests cross-group approve/reject pass; full backend unit suite pass |
| SEC-001 | FIXED trong working tree | Signed URL HMAC 5 phút, binding group→message→attachment, private group-message storage; 4 access/signature tests pass |
| SEC-002 | FIXED trong working tree | Validator magic bytes/MIME/size dùng chung cho avatar, OCR, transaction receipt và group image; 4 upload tests pass |
| Các finding còn lại | NOT STARTED | Ngoài phạm vi batch đã phê duyệt |

Kết quả gần nhất ngày 22/11/2026: SEC targeted 8/8 pass, backend unit regression 45/45 pass, Spring context 1/1 pass trên PostgreSQL 15 và Redis 7 cô lập bằng Docker. Web build và Mobile `tsc` vẫn đỏ bởi các lỗi baseline đã ghi ở CODE-001; thay đổi SEC không tạo lỗi type mới được quan sát. Không deploy production, không dùng dữ liệu người dùng; container/network tạm đã được xóa sau test.

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
