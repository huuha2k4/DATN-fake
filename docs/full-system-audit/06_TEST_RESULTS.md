# 06 — Kết quả test thực tế

Chỉ đánh PASS cho lệnh đã chạy. Test ghi dữ liệu dùng PostgreSQL/Redis tmpfs cô lập; không dùng DB đang chạy và tài nguyên audit đã được xác nhận xóa.

## Lệnh và kết quả

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Spring unit | `docker exec backend mvn "-Dtest=!FinanceApplicationTests" test` | PASS 31/31 |
| Spring context + Flyway | container backend + PostgreSQL 15/Redis 7 tmpfs riêng, `mvn -Dtest=FinanceApplicationTests test` | PASS 1/1; 61 migration |
| Python analytics/guard | ephemeral container, `pytest test_ai_analytics.py test_chat_guard.py -q` | PASS 13/13 |
| Web production build | `npm run build` | FAIL, 50 TS errors |
| Web ESLint | `npm run lint` | FAIL, 270 errors/38 warnings |
| Mobile typecheck | `npx tsc --noEmit` | FAIL, 195 TS errors |
| Expo Doctor | `npx --yes expo-doctor` | FAIL 1/21; Expo patch mismatch |
| Docker Compose | `docker compose config`, `docker compose ps` | PASS render/runtime; 7 service running |
| Negative auth | GET account/AI endpoints không JWT | PASS: 403 |
| Internal edge block | GET `/api/internal/v1/finai/...` từ Nginx | PASS: 404 |
| Public health | `/api/v1/health`, `/actuator/health` qua edge | FAIL: 500 / SPA HTML 200 |
| AI 2–5 E2E | suite cô lập trước audit: 37 calls, datasets 8/240/5.000 | PASS 37/37; chi tiết ở `docs/AI_2_5_AUDIT_REPORT.md` |

Host Python pytest ban đầu BLOCKED bởi Windows Application Control chặn `_pydantic_core`; rerun Linux container PASS. Không sửa dependency/lockfile.

## E2E journey matrix

| # | Journey | Preconditions/Test data | Expected | Actual | Status/Evidence |
|---:|---|---|---|---|---|
| 1 | Register→login→wallet→transaction | staging mail/test user | balance đúng | chưa có staging credential/mail sink | BLOCKED |
| 2 | Wallet A/B transfer | isolated user | bảo toàn tổng trừ fee | chưa có core E2E harness | BLOCKED |
| 3 | Budget→expense | isolated user | spent tăng đúng một lần | static review only | BLOCKED |
| 4 | Goal→contribute | isolated user | wallet giảm, goal tăng | static review only | BLOCKED |
| 5 | Savings deposit/withdraw | contract riêng | ledger nhất quán | không có BE savings module riêng | BLOCKED/PARTIAL |
| 6 | Debt partial/full pay | isolated user | debt+wallet+report khớp | static review only | BLOCKED |
| 7 | Group→member→fund→expense | ≥2 test users | atomic balances | auth bug phát hiện tĩnh | BLOCKED/FAIL risk |
| 8 | Child chore→approve→reward | parent+child | đúng role/balance | auth bug phát hiện tĩnh | BLOCKED/FAIL risk |
| 9 | Schedule due→notification | clock controllable | một occurrence | chưa có clock integration test | BLOCKED |
| 10 | Transaction→report→AI | isolated AI datasets | totals/forecast khớp | balance forecast khớp 3/3 datasets | PASS phạm vi AI 2–5 |
| 11 | FinAI proposal→confirm | isolated Agent | idempotent write | unit action service pass, chưa HTTP E2E | BLOCKED |
| 12 | Web/Mobile sync | device/emulator+test account | same data | không có Android SDK/ADB/staging user | BLOCKED |

## Finding TEST-001 — Coverage lệch khỏi core tài chính

- **Severity:** HIGH
- **Module:** QA
- **File và line:** [backend/src/test](../../backend/src/test), [test_ai_analytics.py](../../pfm-ai-service/test_ai_analytics.py)
- **Bằng chứng:** 6 Spring test class; 30/31 unit assertions tập trung FinAI Agent, không có transaction/account/budget/debt/group security integration suite.
- **Tái hiện:** list `backend/src/test`.
- **Expected:** financial invariant, ownership, rollback và concurrency tests.
- **Actual:** context starts nhưng core business regression không được kiểm.
- **Root cause:** test investment tập trung feature mới.
- **Recommended fix:** ưu tiên regression tests cho BUS-001/BUS-002 trước sửa code; sau đó money flows.
- **Regression test:** chính matrix ở action plan.

## Quy trình chạy lại trên VPS/staging an toàn

```bash
# Dùng project/volume riêng; tuyệt đối không trỏ DB production.
docker compose -p finora-audit --env-file .env.audit up -d postgres redis pfm-ai-service backend nginx
docker compose -p finora-audit exec backend mvn test
docker compose -p finora-audit run --rm pfm-ai-service python -m pytest -q
npm --prefix frontend-web ci
npm --prefix frontend-web run build
npm --prefix frontend-web run lint
npm --prefix frontend-app ci
npx --prefix frontend-app tsc --noEmit
npx --prefix frontend-app expo-doctor
docker compose -p finora-audit down -v
```

Compose hiện hardcode `container_name`, nên trước khi dùng project song song cần override bỏ tên container/publish port riêng; không chạy `down -v` trên project production.
