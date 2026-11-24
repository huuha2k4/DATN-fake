# 01 — Kiến trúc thực tế của Finora

Ngày audit: 21/11/2026 (Asia/Bangkok). Phạm vi: trạng thái working tree hiện tại. Đây là báo cáo pha AUDIT; không có business code, schema hay FinAI Agent nào được sửa.

## Sơ đồ thực tế

```text
Web React/Vite ─┐
                ├─> Nginx :1116 ─>/api, /uploads─> Spring Boot :8080 ─> PostgreSQL 15
Expo/RN ────────┘                    │                    ├────> Redis 7 (idempotency/runtime)
                                    │                    ├────> OCR FastAPI :8000
                                    │                    └────> PFM/FinAI FastAPI :8000
                                    └─>/ (SPA)─> Vite dev server :5173
```

Khác thiết kế dự kiến:

- Không có MinIO. File được ghi vào volume local `upload_data` và phục vụ qua `/uploads/**` ([docker-compose.yml](../../docker-compose.yml), [WebConfig.java](../../backend/src/main/java/com/finance/finance/common/config/WebConfig.java)).
- AI 2–5 đi đúng luồng Web/Mobile → Nginx → Spring → FastAPI. FinAI Agent có thêm context token và internal tool callback Spring.
- Cache AI 2–5 là process-local; Redis thật đang chạy nhưng không chứa cache AI 2–5. Vì vậy cache không chia sẻ giữa nhiều Uvicorn worker.
- Mobile dùng navigation tự quản lý trong `App.tsx`, không có Expo Router dependency.

## Inventory

| Thành phần | Số lượng/hiện trạng | Bằng chứng |
|---|---:|---|
| Java source | 428 file | scan `backend/src/main/java` |
| Controller / Service / Repository | 24 / 38 / 50 | scan theo hậu tố lớp |
| Flyway migration | 61 | `backend/src/main/resources/db/migration` |
| Web TS/TSX | 87 file, 43.564 dòng | scan source |
| Mobile TS/TSX | 134 file, 84.254 dòng | scan source |
| Python AI | 26 file, 7.584 dòng | scan loại trừ venv |
| Docker runtime | 7 service đều chạy | `docker compose ps`, 21/11/2026 |

## Module nghiệp vụ

| Module | BE | Web | Mobile | Trạng thái audit |
|---|---|---|---|---|
| Auth/User/Profile | Có | Có | Có | PARTIAL — chưa E2E OTP/OAuth/device trên staging |
| Account/Wallet | Có | Có | Có | PARTIAL — link bank/sync trả 501 có chủ đích |
| Transaction/Category/Merchant/Tag | Có | Có | Có | BROKEN risk — lỗi update ownership, xem BUS-001 |
| Budget | Có | Có | Có | PARTIAL — compile FE lỗi, chưa E2E invariant |
| Goal | Có | Có | Có | PARTIAL — chưa E2E góp/rút/xóa |
| Savings | Không có module BE riêng | UI dùng Goal | UI dùng Goal | PARTIAL — semantic UI, không phải ledger tiết kiệm riêng |
| Debt | Có | Có | Có | PARTIAL/MOCK — Mobile còn fallback demo |
| Schedule/Reminder | Có | Có | Có | PARTIAL — Web type/status không khớp |
| Group/Fund/Expense/Settlement/Chat | Có | Có | Có | BROKEN risk — cross-group và file access |
| Child wallet/chores/requests/sharing | Có | Có | Có | BROKEN risk — BUS-002; FE types lỗi |
| OCR/Receipt | Có + OCR service | Có | Có | PARTIAL — upload validation yếu |
| Notification | Có | Có | Có | BROKEN trên Mobile settings URL |
| Reports/PDF | Có | Có | Có | PARTIAL — chưa đối soát full ledger |
| AI 2–5 | Có proxy + FastAPI | Có | Có | PASS trong E2E cô lập riêng; xem báo cáo AI 2–5 |
| FinAI Agent | Có | Có | Có | Unit PASS; full proposal→confirm E2E BLOCKED |
| Admin | Có | Có | Không bắt buộc | PARTIAL — trang AI admin gọi route không được proxy |

## Data và dependency

- PostgreSQL schema `core`, money domain `NUMERIC(19,4)`; JPA dùng `BigDecimal` ở core ledger.
- Python ORM lại map nhiều money column sang `Float` ([database.py:83](../../pfm-ai-service/database.py)), tạo rủi ro precision ở biên AI.
- Redis dùng cho runtime/idempotency nhưng AI cache không dùng Redis.
- Docker chỉ expose Nginx ra host; PostgreSQL, Redis, Spring và hai service Python chỉ ở network nội bộ.
- `.env` không được Git track; `.env.example` chỉ chứa placeholder. Không đưa giá trị secret runtime vào báo cáo.

## Finding ARCH-001 — Health endpoint bên ngoài không đáng tin

- **Severity:** HIGH
- **Module:** Infrastructure / observability
- **File và line:** [SecurityConfig.java:56](../../backend/src/main/java/com/finance/finance/common/config/SecurityConfig.java), [nginx.conf](../../nginx/nginx.conf)
- **Bằng chứng:** `GET /api/v1/health` thực tế trả 500 vì không có controller; `GET /actuator/health` qua Nginx trả 200 `text/html` của SPA.
- **Tái hiện:** `curl -i http://localhost:1116/api/v1/health`; `curl -i http://localhost:1116/actuator/health`.
- **Expected:** health route trả JSON phản ánh Spring/PostgreSQL/Redis.
- **Actual:** một route 500, route còn lại là false-positive SPA 200.
- **Root cause:** security whitelist route không tồn tại và Nginx không proxy `/actuator`.
- **Recommended fix:** chọn một health route chính thức, proxy có giới hạn hoặc tạo controller tổng hợp; không expose chi tiết nhạy cảm.
- **Regression test:** HTTP integration kiểm `status`, `Content-Type`, DB/Redis down và Nginx routing.

## Finding ARCH-002 — Thiếu MinIO, file local không phù hợp scale-out

- **Severity:** MEDIUM
- **Module:** Storage
- **File và line:** [docker-compose.yml](../../docker-compose.yml), [WebConfig.java](../../backend/src/main/java/com/finance/finance/common/config/WebConfig.java)
- **Bằng chứng:** không có service/client MinIO; file nằm trong volume local của một backend.
- **Tái hiện:** `docker compose config` và tìm `minio` không có kết quả.
- **Expected:** nếu yêu cầu triển khai là MinIO thì object storage có policy/ownership rõ ràng.
- **Actual:** local filesystem, public URL và một replica backend.
- **Root cause:** kiến trúc thực tế khác tech stack dự kiến.
- **Recommended fix:** xác nhận yêu cầu trước; nếu cần multi-replica mới lập kế hoạch migrate, không tự thêm feature trong đợt fix lỗi.
- **Regression test:** upload/download/restart/multi-replica và authorization object.
