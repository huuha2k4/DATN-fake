# Đặc Tả Hệ Thống - Quản Lý Tài Chính Cá Nhân

**Phiên bản:** 1.0  
**Cập nhật:** 11/10/2026  
**Dự án:** Nền Tảng Quản Lý Tài Chính Cá Nhân Tích Hợp AI

---

## 📋 Mục Lục

1. [Tóm Tắt Tổng Quan](#tóm-tắt-tổng-quan)
2. [Bài Toán Thực Tế](#bài-toán-thực-tế)
3. [Mục Tiêu Hệ Thống](#mục-tiêu-hệ-thống)
4. [Kiến Trúc Giải Pháp](#kiến-trúc-giải-pháp)
5. [Các Module Lõi](#các-module-lõi)
6. [Khả Năng AI/ML](#khả-năng-aiml)
7. [Tính Năng Nâng Cao](#tính-năng-nâng-cao)
8. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)

---

## Tóm Tắt Tổng Quan

Hệ thống quản lý tài chính cá nhân tích hợp AI là một nền tảng đa thiết bị (web và mobile) giúp người dùng quản lý tài chính một cách khoa học thông qua việc tự động hóa các quy trình ghi chép, phân tích và đưa ra khuyến nghị tài chính thông minh dựa trên dữ liệu lịch sử và hành vi chi tiêu.

**Điểm Nổi Bật:**
- ✅ Hỗ trợ đa nền tảng (Web + Mobile)
- 🤖 Phân tích và dự báo bằng AI
- 📊 Báo cáo và phân tích thời gian thực
- 🎯 Theo dõi mục tiêu và quản lý ngân sách
- 🔒 Bảo mật cấp doanh nghiệp

---

## Bài Toán Thực Tế

### Thách Thức Hiện Tại

**Vấn Đề Hành Vi Người Dùng:**
- Thiếu thói quen ghi chép tài chính định kỳ
- Khó duy trì việc quản lý thu chi thủ công
- Không có công cụ phân tích hành vi chi tiêu cá nhân hóa

**Khoảng Trống Công Nghệ:**
- Ứng dụng hiện tại chủ yếu tập trung vào ghi chép thủ công
- Thiếu khả năng dự báo và phân tích thông minh
- Không có trợ lý AI hỗ trợ ra quyết định tài chính

### Đối Tượng Mục Tiêu

- Sinh viên và người trẻ cần quản lý chi tiêu
- Người lao động muốn tối ưu hóa ngân sách
- Cá nhân có mục tiêu tiết kiệm và đầu tư

---

## Mục Tiêu Hệ Thống

Xây dựng một hệ thống toàn diện với các khả năng sau:

### Mục Tiêu Chính
1. **Quản Lý Giao Dịch** - Quản lý thu chi tự động và thủ công
2. **Theo Dõi Ngân Sách** - Theo dõi và cảnh báo ngân sách
3. **Mục Tiêu Tài Chính** - Quản lý và dự báo mục tiêu tài chính
4. **Phân Tích** - Phân tích hành vi chi tiêu đa chiều
5. **Trợ Lý AI** - Trợ lý AI hỗ trợ tư vấn tài chính

### Mục Tiêu Phụ
- Đồng bộ dữ liệu đa nền tảng
- Bảo mật và mã hóa dữ liệu người dùng
- Tích hợp OCR cho hóa đơn
- Hệ thống nhắc nhở thông minh

---

## Kiến Trúc Giải Pháp

### Tầng Thu Thập Dữ Liệu

```
┌─────────────────────────────────────────────────┐
│          Nguồn Nhập Dữ Liệu                     │
├─────────────────────────────────────────────────┤
│ • Nhập Thủ Công      • Quét Hóa Đơn OCR        │
│ • Đồng Bộ Ngân Hàng  • Import CSV/Excel        │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          Tầng Xử Lý & Lưu Trữ                   │
├─────────────────────────────────────────────────┤
│ • Phân Loại Giao Dịch                           │
│ • Gán Danh Mục                                  │
│ • Quản Lý Tài Khoản                             │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│           Tầng Phân Tích AI                     │
├─────────────────────────────────────────────────┤
│ • Phân Tích Mẫu Chi Tiêu                        │
│ • Phát Hiện Bất Thường                          │
│ • Dự Báo Tài Chính                              │
│ • Khuyến Nghị Cá Nhân Hóa                       │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          Tầng Trình Bày                         │
├─────────────────────────────────────────────────┤
│ • Dashboard Web      • Ứng Dụng Mobile          │
│ • Báo Cáo & Biểu Đồ  • Chatbot AI              │
└─────────────────────────────────────────────────┘
```

---

## Các Module Lõi

### 1. Module Quản Lý Giao Dịch

**Trách nhiệm:**
- CRUD giao dịch thu/chi
- Quản lý đa tài khoản (tiền mặt, ngân hàng, ví điện tử)
- Phân loại giao dịch theo category
- Gắn nhãn (tags) và tìm kiếm nâng cao

**Tính Năng Chính:**
- Quét hóa đơn OCR với PaddleOCR
- Tự động trích xuất: tên cửa hàng, số tiền, thời gian, sản phẩm
- Import/export hàng loạt
- Template giao dịch định kỳ

### 2. Module Quản Lý Ngân Sách

**Trách nhiệm:**
- Thiết lập ngân sách theo kỳ (tháng/quý/năm)
- Phân bổ ngân sách theo danh mục
- Theo dõi tiến độ thời gian thực
- Cảnh báo khi vượt ngưỡng

**Loại Ngân Sách:**
- Ngân sách theo danh mục (Ăn uống, Di chuyển, Giải trí...)
- Ngân sách tổng theo tháng
- Ngân sách theo dự án

**Quy Tắc Cảnh Báo:**
- Cảnh báo ở 80% chi tiêu
- Nghiêm trọng ở 100% chi tiêu
- Thông báo chi tiêu vượt mức

### 3. Module Phân Tích & Báo Cáo

**Loại Báo Cáo:**

**Báo Cáo Theo Thời Gian:**
- Xu hướng chi tiêu theo ngày/tuần/tháng/năm
- So sánh thu nhập vs chi tiêu
- Phân tích theo từng kỳ

**Báo Cáo Theo Danh Mục:**
- Phân tích chi tiêu theo danh mục
- Xu hướng danh mục theo thời gian
- Top cửa hàng chi tiêu nhiều nhất

**Thành Phần Trực Quan:**
- Biểu đồ cột, biểu đồ tròn, đồ thị đường
- Heatmap cho mẫu chi tiêu
- Chỉ số xu hướng

### 4. Module Mục Tiêu Tài Chính

**Quản Lý Mục Tiêu:**
- Tạo mục tiêu với số tiền đích và thời hạn
- Theo dõi đóng góp và tiến độ
- Ước tính ngày hoàn thành dựa trên tỷ lệ tiết kiệm hiện tại

**Ví Dụ Mục Tiêu:**
- Ngắn hạn: Mua laptop, đi du lịch
- Dài hạn: Mua xe, mua nhà, quỹ hưu trí

**Theo Dõi Tiến Độ:**
- Thanh tiến độ trực quan
- Thông báo cột mốc
- Khuyến nghị điều chỉnh

### 5. Module Nhắc Nhở & Thông Báo

**Loại Nhắc Nhở:**

**Hóa Đơn Định Kỳ:**
- Điện, nước, internet, điện thoại
- Học phí, bảo hiểm
- Dịch vụ đăng ký

**Thanh Toán Nợ:**
- Thanh toán thẻ tín dụng
- Trả góp khoản vay
- Vay cá nhân

**Tiết Kiệm:**
- Mục tiêu tiết kiệm hàng tháng
- Gia hạn tiền gửi

**Nhắc Nhở Tùy Chỉnh:**
- Tác vụ định kỳ do người dùng định nghĩa
- Nhắc nhở thanh toán một lần

### 6. Module Quản Lý Tài Khoản

**Hồ Sơ Người Dùng:**
- Thông tin cá nhân
- Tùy chọn và cài đặt
- Cài đặt bảo mật (2FA)

**Hỗ Trợ Đa Ví:**
- Tài khoản tiền mặt
- Tài khoản ngân hàng
- Ví điện tử (Momo, ZaloPay, v.v.)
- Tài khoản đầu tư

**Quản Lý Tài Sản:**
- Bất động sản
- Phương tiện
- Đồ quý giá và đầu tư

---

## Khả Năng AI/ML

### 1. Tự Động Phân Loại Giao Dịch

**Công Nghệ:** XGBoost / LightGBM  
**Dữ Liệu Huấn Luyện:** Mô tả giao dịch + tên cửa hàng + dữ liệu lịch sử người dùng

**Quy Trình:**
```
Đầu vào: "Highlands Coffee - 45.000đ"
  ↓
Trích Xuất Đặc Trưng: ["highlands", "coffee", "đồ uống"]
  ↓
Dự Đoán Mô Hình: Danh mục = "Ăn Uống"
  ↓
Điểm Tin Cậy: 95%
```

**Danh Mục Hỗ Trợ:** Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Giáo dục, Y tế, v.v.

### 2. Phân Tích Hành Vi Chi Tiêu

**Chiều Phân Tích:**
- **Mẫu Thời Gian:** Ngày/giờ chi tiêu cao điểm
- **Phân Bố Danh Mục:** Danh mục chi tiêu hàng đầu
- **Phân Tích Tần Suất:** Mẫu giao dịch
- **Tỷ Lệ Tiết Kiệm:** Phần trăm tiết kiệm hàng tháng

**Nhận Xét Được Tạo:**
- "Bạn chi tiêu cho ăn uống nhiều hơn 40% so với trung bình"
- "Mức tiết kiệm của bạn đang ở mức thấp (5%/tháng)"
- "Chi tiêu tăng đột biến vào cuối tháng"

### 3. Dự Báo Tài Chính

**Công Nghệ:** Prophet (Facebook) / Mạng LSTM

**Các Dự Báo:**
- Dự đoán số dư cuối tháng
- Dự báo chi tiêu theo danh mục
- Xác suất đạt mục tiêu
- Quỹ đạo tiết kiệm

**Khung Thời Gian Dự Báo:** 1-3 tháng tới

**Ví Dụ Đầu Ra:**
```json
{
  "predicted_balance": 8500000,
  "confidence_interval": [7800000, 9200000],
  "factors": [
    "Dựa trên xu hướng chi tiêu hiện tại",
    "Tính đến các hóa đơn định kỳ",
    "Điều chỉnh theo mùa"
  ]
}
```

### 4. Phát Hiện Bất Thường

**Công Nghệ:** Isolation Forest

**Bất Thường Được Phát Hiện:**
- Số tiền giao dịch bất thường cao
- Thời gian giao dịch khả nghi (đêm khuya)
- Giao dịch trùng lặp
- Địa điểm cửa hàng bất thường

**Cơ Chế Cảnh Báo:**
- Thông báo trong ứng dụng
- Cảnh báo email
- Thông báo đẩy (mobile)

### 5. Khuyến Nghị Cá Nhân Hóa

**Công Cụ Khuyến Nghị:**
- Hệ thống dựa trên quy tắc + xếp hạng dựa trên ML
- Cá nhân hóa dựa trên hồ sơ và lịch sử người dùng

**Loại Khuyến Nghị:**

**Tối Ưu Hóa Ngân Sách:**
- "Giảm chi tiêu ăn uống 15% để đạt mục tiêu tiết kiệm"
- "Tăng budget giải trí lên 10% vì bạn đang dưới mức trung bình"

**Chiến Lược Tiết Kiệm:**
- "Đề xuất chuyển 500k vào quỹ dự phòng mỗi tháng"
- "Với thu nhập hiện tại, bạn nên tiết kiệm 20-30%"

**Điều Chỉnh Mục Tiêu:**
- "Mục tiêu mua laptop khó đạt với mức tiết kiệm hiện tại, điều chỉnh deadline hoặc tăng đóng góp"

### 6. Trợ Lý Tài Chính AI (Chatbot)

**Công Nghệ:** LLM (GPT/Claude) + RAG (Retrieval-Augmented Generation)

**Khả Năng:**
- Xử lý truy vấn ngôn ngữ tự nhiên
- Phản hồi nhận thức ngữ cảnh
- Tạo trực quan hóa dữ liệu
- Thông tin chi tiết có thể thực hiện

**Ví Dụ Tương Tác:**

```
Người dùng: "Tháng trước tôi chi nhiều nhất vào đâu?"
Bot: "Tháng 9, bạn chi tiêu nhiều nhất cho danh mục Ăn uống 
     với tổng 4,2 triệu đồng (38% tổng chi tiêu). Top cửa hàng 
     là Highlands Coffee (850k)."

Người dùng: "Tôi còn bao nhiêu tiền chi được trong tháng này?"
Bot: "Dựa trên ngân sách 10 triệu và đã chi 6,5 triệu, bạn còn 
     3,5 triệu. Với 12 ngày còn lại, khuyến nghị chi không quá 
     290k/ngày để đảm bảo ngân sách."

Người dùng: "Tôi nên cắt giảm chi phí nào?"
Bot: "Phân tích cho thấy chi phí Ăn uống (4,2tr) và Giải trí (2,1tr) 
     cao hơn trung bình. Đề xuất giảm 20% ăn uống và 30% giải trí 
     để tiết kiệm thêm 1,5tr/tháng."
```

---

## Tính Năng Nâng Cao

### Bảo Mật & Quyền Riêng Tư
- **Xác Thực:** JWT + OAuth2 (Đăng nhập Google)
- **2FA:** Xác thực hai yếu tố dựa trên TOTP
- **Mã Hóa:** AES-256 cho dữ liệu nhạy cảm
- **Sao Lưu Dữ Liệu:** Sao lưu tự động hàng ngày
- **Tuân Thủ GDPR:** Xuất/xóa dữ liệu người dùng

### Cộng Tác
- **Ví Chia Sẻ:** Gia đình hoặc nhóm bạn chia sẻ ví chung
- **Chia Sẻ Ngân Sách:** Cùng theo dõi ngân sách của nhóm
- **Cấp Quyền:** Owner, Editor, Viewer

### Xuất & Tích Hợp
- **Xuất Báo Cáo:** Định dạng PDF, Excel, CSV
- **Báo Cáo Email:** Báo cáo hàng tháng được lên lịch
- **Truy Cập API:** RESTful API cho tích hợp bên thứ ba
- **Webhooks:** Thông báo sự kiện thời gian thực

### Thông Báo
- **Đa Kênh:** Trong ứng dụng, Email, Push (mobile), SMS
- **Lên Lịch Thông Minh:** Tùy chọn thông báo mỗi kênh
- **Chế Độ Tóm Tắt:** Email tóm tắt hàng ngày/tuần

---

## Công Nghệ Sử Dụng

### Kiến Trúc Frontend

**Ứng Dụng Web:**
- **Framework:** ReactJS 18+
- **Quản Lý State:** Redux Toolkit / Zustand
- **Thư Viện UI:** Material-UI / Ant Design
- **Biểu Đồ:** Recharts / Chart.js
- **HTTP Client:** Axios

**Ứng Dụng Mobile:**
- **Framework:** React Native / Flutter
- **State:** Context API + Hooks
- **Điều Hướng:** React Navigation
- **Lưu Trữ Local:** AsyncStorage / SQLite

### Kiến Trúc Backend

**API Server:**
- **Framework:** Spring Boot 3.x
- **Ngôn Ngữ:** Java 17+
- **Kiến Trúc:** Phân tầng (Controller → Service → Repository)
- **Phong Cách API:** RESTful
- **Tài Liệu:** Swagger/OpenAPI 3.0

**Xác Thực:**
- **JWT:** Access token + Refresh token
- **OAuth2:** Tích hợp đăng nhập Google
- **Bảo Mật:** Spring Security

### Tầng Cơ Sở Dữ Liệu

**Cơ Sở Dữ Liệu Chính:**
- **RDBMS:** PostgreSQL 15+
- **ORM:** Spring Data JPA / Hibernate
- **Migration:** Flyway / Liquibase
- **Connection Pool:** HikariCP

**Tầng Cache:**
- **Redis:** Lưu trữ session, dữ liệu truy cập thường xuyên
- **Chiến Lược:** Cache-aside pattern

### Dịch Vụ AI/ML

**Kiến Trúc Dịch Vụ AI:**
- **Framework:** FastAPI (Python 3.10+)
- **Giao Tiếp:** REST API / gRPC
- **Xử Lý Async:** Celery + RabbitMQ

**Stack ML:**
- **OCR:** PaddleOCR
- **Phân Loại:** XGBoost / LightGBM / scikit-learn
- **Dự Báo:** Prophet (Meta) / TensorFlow (LSTM)
- **Phát Hiện Bất Thường:** Isolation Forest / Autoencoders
- **Tích Hợp LLM:** OpenAI API / Anthropic Claude
- **Vector DB:** Pinecone / Weaviate (cho RAG)
- **ML Ops:** MLflow cho theo dõi thí nghiệm

### DevOps & Hạ Tầng

**Container hóa:**
- **Docker:** Multi-stage builds
- **Docker Compose:** Môi trường phát triển local

**CI/CD:**
- **GitHub Actions:** Kiểm thử và triển khai tự động
- **Giai Đoạn:** Build → Test → Security Scan → Deploy

**Web Server:**
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt
- **Load Balancing:** Nginx upstream

**Giám Sát:**
- **APM:** Spring Boot Actuator
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics:** Prometheus + Grafana

---

## Kiến Trúc Triển Khai

```
┌─────────────────────────────────────────────────┐
│              Tầng Client                        │
│  [Trình Duyệt Web]    [Ứng Dụng Mobile]        │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│          Nginx (Reverse Proxy)                  │
│  • Kết Thúc SSL  • Cân Bằng Tải                │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────┐
│         Tầng Ứng Dụng                          │
│  ┌──────────────┐    ┌──────────────┐         │
│  │ Spring Boot  │    │  FastAPI     │         │
│  │  (Backend)   │◄──►│ (Dịch Vụ AI) │         │
│  └──────┬───────┘    └──────────────┘         │
└─────────┼──────────────────────────────────────┘
          │
          ↓
┌────────────────────────────────────────────────┐
│         Tầng Dữ Liệu                           │
│  ┌──────────────┐    ┌──────────────┐         │
│  │ PostgreSQL   │    │    Redis     │         │
│  │  (Chính)     │    │   (Cache)    │         │
│  └──────────────┘    └──────────────┘         │
└────────────────────────────────────────────────┘
```

---

## Nhật Ký Thay Đổi Tài Liệu

| Phiên bản | Ngày | Tác giả | Thay đổi |
|-----------|------|---------|----------|
| 1.0 | 11/10/2026 | Kiến trúc sư hệ thống | Tài liệu đặc tả ban đầu |

---

**Bước Tiếp Theo:**
- [ ] Đặc Tả API (02-api-specification.md)
- [ ] Schema Cơ Sở Dữ Liệu (03-database-schema.md)
- [ ] Hướng Dẫn Bảo Mật (04-security-guidelines.md)
- [ ] Hướng Dẫn Triển Khai (05-deployment-guide.md)
