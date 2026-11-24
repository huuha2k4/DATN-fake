# 07 — Performance

## Số đo thực tế đã có

AI 2–5 trong Docker với Spring→FastAPI→PostgreSQL, 12 warm samples/endpoint:

| Endpoint | P50 | P95 |
|---|---:|---:|
| Behavior | 16,40 ms | 33,64 ms |
| Balance forecast | 18,45 ms | 34,93 ms |
| Anomalies | 19,18 ms | 33,29 ms |
| Recommendations | 20,34 ms | 34,88 ms |

API-to-data-ready: RN balance 24,94/40,09 ms; Web balance 23,75/36,54 ms; spending Web/RN 22,25/37,07 ms. Edge headless navigation→React render: Forecast 527,32/1.089,94 ms; Spending 468,60/600,43 ms. Cache forecast miss/hit/after invalidation: 95,80/37,45/103,06 ms.

Các số này là từ suite AI 2–5 cô lập cùng ngày, không phải latency production. Mobile navigation-to-render trên thiết bị thật **BLOCKED**.

## Bottleneck/risk

- AI cache process-local; Redis DB size 0 trong E2E AI. Multi-worker làm giảm hit ratio và invalidation không chia sẻ.
- Compose không đặt CPU/memory limits; một process chứa Prophet/Pandas/sklearn/LangChain.
- Transaction summary có N+1 category lookup.
- Web notification polling 10 giây và nhiều screen lớn; lint phát hiện effect gọi setState trực tiếp/thiếu dependency.
- Không có evidence query plan production; không đề xuất index mới khi chưa `EXPLAIN ANALYZE`.
- Image/group upload chưa size-limit đồng nhất nên có risk memory/disk/latency.

## Finding PERF-001 — Cache AI không dùng Redis đã triển khai

- **Severity:** MEDIUM
- **Module:** AI runtime
- **File và line:** [analytics_runtime.py](../../pfm-ai-service/analytics_runtime.py), [docker-compose.yml](../../docker-compose.yml)
- **Bằng chứng:** cache hit nhanh hơn nhưng Redis trả PONG và DB size vẫn 0; cache là memory của process.
- **Tái hiện:** gọi forecast miss/hit, inspect Redis `DBSIZE`, restart AI process rồi gọi lại.
- **Expected:** nếu scale nhiều worker, cache/invalidation nhất quán hoặc giới hạn rõ một worker.
- **Actual:** mỗi worker có state riêng; restart mất cache.
- **Root cause:** Redis được deploy nhưng analytics cache không tích hợp.
- **Recommended fix:** không bắt buộc đổi ngay; quyết định deployment one-worker hay shared cache sau load test.
- **Regression test:** two-worker hit/invalidation và restart test.

## Finding PERF-002 — Không có performance baseline cho core screens

- **Severity:** MEDIUM
- **Module:** Web/Mobile/API core
- **File và line:** [package.json](../../frontend-web/package.json), [package.json](../../frontend-app/package.json)
- **Bằng chứng:** không có Playwright/Detox/Maestro test config; device unavailable; frontend không compile.
- **Tái hiện:** kiểm package scripts/dependencies.
- **Expected:** navigation-to-render P50/P95 cho dashboard, transaction, group, child, chat.
- **Actual:** chỉ có số AI Web headless; core và Mobile BLOCKED.
- **Root cause:** thiếu E2E/perf harness và quality gate đỏ.
- **Recommended fix:** sửa build trước, sau đó thêm instrumentation/test staging; không đo bằng Python time đơn lẻ.
- **Regression test:** 20–30 samples cold/warm, network profile, request count assertion.
