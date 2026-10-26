# Setup Database từ đầu

## Yêu cầu
- PostgreSQL 13+
- Database tên: `finance_db`
- User: `postgres` (hoặc user khác có quyền CREATE SCHEMA)

## Bước 1: Tạo database

```sql
CREATE DATABASE finance_db
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;
```

Hoặc dùng psql:
```bash
createdb -U postgres finance_db
```

## Bước 2: Kết nối và tạo schema

```sql
\c finance_db

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS public;
```

## Bước 3: Cấu hình application.yml

File: `src/main/resources/application.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/finance_db
    username: postgres
    password: your_password  # Đổi password của bạn
    
  jpa:
    hibernate:
      ddl-auto: none  # QUAN TRỌNG: để none, Flyway sẽ quản lý schema
      
  flyway:
    enabled: true
    baseline-on-migrate: true
```

## Bước 4: Build và Run

```bash
# Build
./mvnw clean compile -DskipTests

# Run
./mvnw spring-boot:run
```

Flyway sẽ tự động chạy tất cả migrations từ V1 đến V10.

## Kiểm tra

```sql
-- Xem migrations đã chạy
SELECT * FROM public.flyway_schema_history ORDER BY installed_rank;

-- Kiểm tra bảng schedule_occurrences.transaction_id  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'core' 
    AND table_name = 'schedule_occurrences' 
    AND column_name = 'transaction_id';
-- Kết quả phải là: uuid

-- Đếm số bảng đã tạo
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'core';
-- Phải có ít nhất 30+ bảng
```

## Troubleshooting

### Lỗi: relation "flyway_schema_history" already exists
```sql
-- Xóa và tạo lại
DROP TABLE IF EXISTS public.flyway_schema_history CASCADE;
```

### Lỗi: Hibernate validation failed on schedule_occurrences.transaction_id
Xem file `URGENT-FIX-DATABASE.md` để fix

### Reset toàn bộ (XÓA HẾT DATA)
```sql
DROP SCHEMA IF EXISTS core CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA core;
CREATE SCHEMA public;
DELETE FROM public.flyway_schema_history;
```

Sau đó restart backend.
