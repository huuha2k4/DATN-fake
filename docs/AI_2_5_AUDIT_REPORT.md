# Báo cáo audit và nâng cấp AI 2–5 của Finora

Ngày thực hiện: 21/11/2026 (Asia/Bangkok).

> Cập nhật E2E lúc 14:53 ngày 21/11/2026: các nhận định cũ trong mục 4 và 6 về việc Docker/PostgreSQL chưa khả dụng đã được thay thế bởi kết quả thực tế dưới đây.

## Kết quả E2E Docker mới nhất

- Môi trường cô lập: Spring Boot, FastAPI, PostgreSQL 15 và Redis 7 trong Docker; volume và user test tách biệt, không dùng dữ liệu người dùng/production.
- Black-box Spring → FastAPI: **37/37 pass**. Tất cả endpoint AI 2–5 trả 200 trên ba bộ dữ liệu 8, 240 và 5.000 giao dịch.
- Security: thiếu JWT 403, JWT sai 403, gọi Python trực tiếp 401, service secret sai 401; query `user_id` giả bị bỏ qua và ownership lấy từ JWT.
- Số dư dự báo khớp tổng số dư ví ở cả ba bộ dữ liệu: 30.321.000; 52.815.000; 418.407.000 VND. Sau mutation E2E, cache trả số dư mới 52.802.655 VND ngay, không chờ TTL.
- Cache forecast: miss 95,80 ms; hit 37,45 ms; sau invalidation 103,06 ms. Redis thật trả `PONG`; cache AI 2–5 vẫn là process-local nên Redis DB size bằng 0.
- Warm latency qua JWT + Spring + FastAPI + PostgreSQL, 12 mẫu/endpoint:
  - Behavior: P50 16,40 ms; P95 33,64 ms.
  - Balance forecast: P50 18,45 ms; P95 34,93 ms.
  - Anomalies: P50 19,18 ms; P95 33,29 ms.
  - Recommendations: P50 20,34 ms; P95 34,88 ms.
- API-to-data-ready (request song song đúng như màn hình, 12 mẫu): RN balance P50/P95 24,94/40,09 ms; Web balance 23,75/36,54 ms; Web/RN spending 22,25/37,07 ms.
- Edge headless, tính từ navigation đến React đã cập nhật state và DOM hiển thị kết quả (5 mẫu): Forecast P50/P95 527,32/1.089,94 ms; Spending Analysis 468,60/600,43 ms.
- Trình duyệt ban đầu phát hiện 2 request/endpoint do React StrictMode. Sau chốt lần tải đầu bằng `useRef`, mỗi endpoint còn đúng 1 request/màn hình.
- Web ban đầu ghép sai `/api/v1/forecast/...` do Axios base URL. Các API AI 2–5 đã dùng đúng Spring proxy `/api/forecast`, `/api/behavior`, `/api/anomalies`, `/api/recommendations`, vẫn giữ interceptor JWT. Route chat/FinAI Agent không thay đổi.
- Regression: Python AI 2–5 **8/8 pass**; Spring **32/32 pass** với PostgreSQL thật. AI4 được sửa để giao dịch cực đoan (≥6× trung vị hoặc robust-z ≥6) không bị bỏ sót chỉ vì Isolation Forest không trả nhãn `-1`.
- Chưa có Android SDK/ADB trong máy kiểm thử, nên chưa đo được navigation-to-render trên emulator React Native. RN đã được kiểm tra tĩnh về endpoint/JWT/không direct Python, kiểm tra bundle API thật và chốt chống request trùng; cần một lượt device/emulator staging trước khi ký nghiệm thu mobile.
- Full TypeScript build của Web và RN vẫn fail bởi nhiều lỗi đã tồn tại ngoài phạm vi AI 2–5. File API Web AI 2–5 lint pass; Vite runtime và Edge E2E pass. Đây là blocker regression chung cần xử lý riêng.

## 1. Hiện trạng ban đầu

- AI 2 tải toàn bộ entity `Transaction`, tải toàn bộ `Category`, dựng list rồi DataFrame. Persona là so khớp Euclidean với centroid cố định kèm heuristic, không phải mô hình clustering đã huấn luyện. Khi dưới 5 giao dịch, API gán persona `NGUOI_CAN_BANG`, affinity 85 và radar 60 dù không có bằng chứng. Quy tắc 50/30/20 chia needs/wants cho tổng chi thay vì thu nhập. Cuối tháng chỉ đếm ngày có giao dịch.
- AI 3 tải toàn bộ lịch sử, tổng hợp từng giao dịch bằng Python, query account ở session thứ hai, rồi khởi tạo và fit Prophet ở mọi request. Nhánh thiếu dữ liệu tự gán mức chi 5.000/25.000 VND/ngày. Goal forecast ép thặng dư tối thiểu 1.000.000 VND/tháng.
- AI 4 dùng Isolation Forest 100 cây, contamination 3%, fit lại khi quét lịch sử và gọi `predict` riêng cho từng giao dịch. Dưới 10 khoản chi, model được fit bằng 10 giao dịch giả. Giờ đêm tự nâng severity và có thể tạo cảnh báo.
- AI 5 là rule engine nhưng chứa nhiều số mặc định (thu nhập, chi tiêu, ăn uống, lãi suất), lazy-load budget category và gọi Gemini/Ollama để viết lại khuyến nghị.
- Runtime dùng một Uvicorn process, không khai báo giới hạn CPU/RAM. Prophet, Pandas, NumPy, Scikit-learn và toàn bộ LangChain/Gemini cùng nằm trong một image. Không có cache AI 2–5.
- Web/Mobile gọi `/api/forecast`, `/api/behavior`, `/api/anomalies`, `/api/recommendations`; Nginx chuyển `/api/` sang Spring nhưng Spring chưa có adapter AI 2–5. Gọi Python trực tiếp lại bị middleware secret từ chối. Đây là lỗi luồng tích hợp và trust boundary.

## 2. Bottleneck và lỗi phát hiện

| Mức độ | Vị trí ban đầu | Nguyên nhân / tác động |
|---|---|---|
| Critical | `forecaster.py` balance forecast | Prophet fit mỗi request; request đồng thời gây CPU contention; không có cache/invalidation. |
| Critical | `anomaly_detector.py` scan | Inference từng dòng và fit lại; 1.000 giao dịch đo được trung bình 26,4 giây. |
| High | `forecaster.py` fallback/goal | Dự báo bằng số tiền mặc định và ép thặng dư 1 triệu, tạo kết quả không có căn cứ. |
| High | `behavior_profiler.py` cold start | Persona/radar/50-30-20 giả khi thiếu dữ liệu. |
| High | `anomaly_detector.py` cold start | Huấn luyện bằng dữ liệu giả và coi giờ đêm là tín hiệu tiêu cực độc lập. |
| High | `recommender.py` | Số mặc định, lãi suất giả định và LLM có thể thay đổi lời giải thích tài chính. |
| High | Web/Mobile → Spring → Python | Thiếu Spring adapter; client-supplied `user_id` chưa được thay bằng principal ở luồng AI 2–5. |
| Medium | SQL | Query entity thừa cột, lặp Python, query/session trùng, lazy-load quan hệ. |
| Medium | PostgreSQL index | Đã có `idx_transactions_user_date(user_id, occurred_date DESC, id DESC)` và `idx_transactions_user_category`; chưa có bằng chứng execution plan production để thêm index mới. Không thêm migration/index. |

## 3. Thay đổi đã thực hiện

### AI 3

- `forecast_engine.py`: aggregate thu/chi theo ngày trong SQL, chỉ lấy cửa sổ tối đa 730 ngày và dùng `occurred_date` để khớp index hiện có. Transfer và soft-delete bị loại.
- Cache process-local theo `(user, horizon, transaction/account data version)`, TTL 300 giây; thay đổi transaction hoặc tổng số dư làm đổi key. Cache không được dùng như dữ liệu mới nếu version đổi.
- Single-flight theo user/horizon và semaphore mặc định 1 Prophet fit/process để tránh nghẽn VPS.
- Fallback dùng mean net cashflow và độ lệch chuẩn quan sát được; không còn 5.000/25.000 VND. Không có dòng tiền thì trả `INSUFFICIENT_DATA` và baseline số dư hiện tại.
- Kết quả tiền được lượng tử hóa ở biên response. Prophet vẫn dùng float nội bộ theo yêu cầu thư viện.
- Có holdout backtest cho Naive, Moving Average 7 ngày, Seasonal Naive 7 ngày và Prophet; không tự thay model.
- Category/goal forecast loại soft-delete; bỏ ép thặng dư tối thiểu 1 triệu.

### AI 2

- `behavior_engine.py`: query projection với outer join category; không tải entity/relationship thừa và không tạo DataFrame.
- Transfer/deleted bị loại. Tổng tiền được cộng bằng `Decimal` trước khi chuyển ở biên response.
- 50/30/20 tính needs/wants/savings trên thu nhập hợp lệ; thu nhập 0 trả tỷ lệ `null` thay vì chia giả.
- Cuối tháng dùng 7 ngày lịch thực của từng tháng và toàn bộ số ngày quan sát, có chuyển UTC → Asia/Ho_Chi_Minh.
- Yêu cầu tối thiểu 10 giao dịch, 5 khoản chi, trải trên 14 ngày. Thiếu dữ liệu trả `INSUFFICIENT_DATA`; persona dùng code tương thích `INSUFFICIENT_DATA`, radar bằng 0 và không gán người dùng vào 5 persona thật.
- Vector và centroid đều chuẩn hóa; affinity suy ra từ khoảng cách Euclidean chuẩn hóa. Giữ nguyên 5 persona và heuristic override.
- Nhận xét giao dịch đêm chỉ mô tả, không đánh giá tiêu cực.

### AI 4

- `anomaly_engine.py`: model và kết quả được cache theo user + data version; fit có single-flight/semaphore.
- Không còn training data giả. Dưới 30 khoản chi trả trạng thái thiếu dữ liệu cho realtime check và danh sách rỗng cho contract lịch sử cũ.
- Feature gồm log amount, hour/day dạng cyclic và ratio-to-category-median. Inference lịch sử chạy batch.
- Isolation Forest prediction phải đi cùng bằng chứng material (`ratio >= 3` hoặc robust-z >= 3,5) mới cảnh báo. Không coi anomaly là fraud; giờ đêm không đủ để kích hoạt.
- Query category bằng join, loại transfer/deleted, không N+1.

### AI 5

- Bỏ lời gọi LLM khỏi đường chạy recommendation; rule output là deterministic.
- Bỏ thu nhập/chi tiêu/ăn uống và lãi suất mặc định. Monthly figures chuẩn hóa theo số ngày quan sát thực tế.
- Tổng account balance dùng aggregate; budget items/category eager-load; rules được sort priority và deduplicate theo type/category.
- Recommendation không còn khẳng định lãi suất/sinh lời hoặc hạn mức tiền chung cho mọi người.

### Kiến trúc và quan sát

- `analytics_runtime.py`: TTL cache giới hạn kích thước, keyed locks và timing helper.
- Log module tách `db_version`, `db_query`, `feature_engineering`, `model_init`, `model_fit`, `predict`, cache và total. HTTP middleware log tổng thời gian gồm framework/serialization; không log user ID, tiền, secret hoặc nội dung giao dịch.
- Thêm Spring `AiAnalyticsController` và `AiAnalyticsClient`. Mọi endpoint AI 2–5 yêu cầu JWT theo `SecurityConfig`; user ID lấy từ `@AuthenticationPrincipal`, query `user_id` của client bị bỏ qua; secret chỉ truyền Spring → Python. Timeout connect/read là 3/35 giây.
- Không thay schema, không thêm hạ tầng, không sửa logic FinAI Agent (AI 6), không đổi URL hoặc response key chính.

## 4. Kết quả kiểm thử

- Python unit/regression: `8 passed`. Bao phủ không có giao dịch, một/ít giao dịch, transfer, soft-delete, zero income, leap year/cuối tháng, múi giờ Việt Nam, cache invalidation theo account balance, 4 request đồng thời, anomaly thiếu dữ liệu, night transaction, large transaction và AI 5 không gọi LLM.
- Python syntax: `py_compile` thành công cho toàn bộ file thay đổi.
- Spring `mvn -DskipTests compile` thành công. Regression suite chạy 32 test: 31 pass, 1 context test lỗi vì PostgreSQL `localhost:5432` không chạy (không có assertion failure).
- HTTP integration/FastAPI chưa chạy được trên host này: Windows Application Control chặn DLL `_pydantic_core`. Docker daemon cũng không truy cập được trong sandbox.
- PostgreSQL integration, `EXPLAIN (ANALYZE, BUFFERS)`, Spring→Python network P50/P95 và CPU/RAM container production chưa đo được vì database/container production không khả dụng. Vì vậy không thêm index và không tuyên bố latency production.
- Pytest phải chạy với `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` vì plugin LangSmith tự load Pydantic DLL bị policy chặn; test AI không phụ thuộc plugin này.

## 5. Benchmark

Môi trường: Python 3.10.11, SQLite local, cùng process và dữ liệu sinh xác định; số là wall-clock thực đo. “Warm” là cache hit. Dataset 10.000 của AI 4 cũ bị dừng sau hơn 180 giây để bảo vệ máy test; không ngoại suy số hoàn thành.

| Module / dataset | Trước (avg) | Sau cold (avg) | Sau warm (avg) | Nhận xét |
|---|---:|---:|---:|---|
| AI 2 / 100 | 38,61 ms | 18,39 ms | 2,31 ms | Cold nhanh hơn 52,4%; warm nhanh hơn 94,0%. |
| AI 2 / 1.000 | 83,41 ms | 87,38 ms | 2,32 ms | Cold tương đương (-4,8%); peak memory giảm 3,11 → 0,60 MB. |
| AI 2 / 10.000 | 529,51 ms | 568,61 ms | 4,79 ms | Cold chậm hơn 7,4% nhưng peak memory giảm 29,52 → 5,96 MB; cache hit nhanh hơn 99,1%. |
| AI 3 / 100 | 473,04 ms | 449,67 ms | 5,36 ms | Cold nhanh hơn 4,9%; warm nhanh hơn 98,9%. |
| AI 3 / 1.000 | 541,14 ms | 468,96 ms | 6,04 ms | Cold nhanh hơn 13,3%; warm nhanh hơn 98,9%. |
| AI 3 / 10.000 | 1.221,04 ms | 318,18 ms | 6,40 ms | Cold nhanh hơn 73,9%; peak memory 24,03 → 1,97 MB. |
| AI 4 / 100 | 3.504,65 ms | 644,42 ms | 35,51 ms | Batch/cached; cold nhanh hơn 81,6%. |
| AI 4 / 1.000 | 26.395,36 ms | 751,68 ms | 58,26 ms | Cold nhanh hơn 97,2%. |
| AI 4 / 10.000 | >180.000 ms, dừng | 1.583,29 ms | 4,51 ms | Baseline không hoàn tất; số sau là thực đo. |
| AI 5 / 1.000 | 3,97 ms | 4,10 ms | N/A | Tốc độ tương đương; ưu tiên loại số giả/LLM và tăng tính xác định. |
| AI 5 / 10.000 | 7,23 ms | 8,44 ms | N/A | Chậm hơn nhẹ do eager-load/validation; không phải bottleneck. |

Backtest holdout 30 ngày trên fixture 1.000 giao dịch:

| Model | MAE (VND) | RMSE (VND) | WAPE | Coverage |
|---|---:|---:|---:|---:|
| Naive | 5.654.417 | 6.255.377 | 87,29% | N/A |
| Moving Average 7 | 5.263.655 | 5.794.431 | 81,25% | N/A |
| Seasonal Naive 7 | 5.499.750 | 5.959.949 | 84,90% | N/A |
| Prophet | 1.703.717 | 2.012.860 | 26,30% | 63,33% |

Prophet tốt hơn các baseline trên fixture này, nên chưa có căn cứ thay Prophet. Coverage 63,33% thấp hơn interval 80%, cần đánh giá tiếp trên dữ liệu production trước khi diễn giải khoảng dự báo như mức tin cậy đã hiệu chỉnh.

## 6. Kết luận và rủi ro còn lại

### Đã sửa và test thành công

- Core logic/performance AI 2–5, data-version cache, invalidation, concurrency guard, deterministic results và unit/regression benchmark local.
- Trust boundary Web/Mobile → Spring → Python bằng adapter authenticated mới.

### Đã sửa nhưng chưa test end-to-end thực tế

- Spring proxy, HTTP auth/error/timeout và FastAPI serialization chưa test end-to-end vì PostgreSQL không chạy và Pydantic DLL bị host policy chặn.
- PostgreSQL query plan, network latency, container CPU/RAM và cache hit giữa nhiều process.

### Chưa sửa có chủ đích

- Không thêm index vì chưa có production execution plan.
- Không thêm Redis/Celery/Kafka hoặc worker mới. Cache hiện process-local; nếu tăng nhiều Uvicorn worker, mỗi worker có cache riêng.
- Không tách dependency/image của AI 6 vì bị cấm chạm FinAI Agent.

### Rủi ro còn lại

- Cache invalidation là read-through bằng aggregate data version; thêm/sửa/xóa transaction và đổi tổng balance được bắt, nhưng thay metadata category chỉ dựa vào TTL tối đa 300 giây.
- AI 2 cold path 10.000 dòng giảm RAM mạnh nhưng latency không tốt hơn legacy; mục tiêu dưới 500 ms chưa đạt trên fixture 10.000 (568,61 ms). Có thể đẩy thêm aggregation sang PostgreSQL sau khi có `EXPLAIN ANALYZE` production.
- Prophet interval chưa calibrated trên fixture. Không nên hiển thị “80% confidence” như cam kết xác suất trước khi backtest theo nhiều user/thời kỳ.
- Python ORM cũ vẫn khai báo một số money column là `Float` dù PostgreSQL schema dùng numeric domain. Các đường AI mới cộng tiền bằng `Decimal` hoặc aggregate DB và chỉ chuyển sang float khi model/JSON cần, nhưng nên audit mapping toàn service ở một thay đổi schema-mapping riêng vì có thể ảnh hưởng AI 6.
