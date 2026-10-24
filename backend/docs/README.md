# Đặc Tả Cơ Sở Dữ Liệu - PFM-AI

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI (Personal Finance Management with AI)  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026  
**Đồ án tốt nghiệp:** Đại học Bách Khoa

---

## 📚 Tổng Quan Tài Liệu

Thư mục này chứa đặc tả đầy đủ về cơ sở dữ liệu cho hệ thống quản lý tài chính cá nhân. Tài liệu được tổ chức thành các phần độc lập, dễ tra cứu.

---

## 📋 Danh Mục Tài Liệu

### 1. Tài Liệu Tổng Quan

| # | Tài liệu | Mô tả | File |
|---|----------|-------|------|
| 01 | **Tổng Quan Hệ Thống** | Giới thiệu kiến trúc, công nghệ, tính năng chính | [01-system-overview.md](01-system-overview.md) |
| 02 | **Tổng Quan Cơ Sở Dữ Liệu** | Schema, bảng, quan hệ, enum types | [02-tong-quan-co-so-du-lieu.md](02-tong-quan-co-so-du-lieu.md) |
| 03 | **Quy Tắc Nghiệp Vụ** | Business logic, constraints, triggers | [03-quy-tac-nghiep-vu.md](03-quy-tac-nghiep-vu.md) |

### 2. Schema Chi Tiết

| # | Tài liệu | Số bảng | Mô tả | File |
|---|----------|---------|-------|------|
| 04 | **Schema Core** | 36 bảng | Users, Accounts, Transactions, Budgets, Goals | [04-schema-core-chi-tiet.md](04-schema-core-chi-tiet.md) |
| 05 | **Danh Mục Bảng** | 61 bảng | Catalog đầy đủ với thống kê | [05-danh-muc-bang-du-lieu.md](05-danh-muc-bang-du-lieu.md) |
| 06 | **Schema AI** | 17 bảng | ML models, Insights, Chat assistant, Anomaly detection | [06-schema-ai-chi-tiet.md](06-schema-ai-chi-tiet.md) |
| 07 | **Schema OPS** | 8 bảng | Audit logs, Notifications, Jobs, Feature flags | [07-schema-ops-chi-tiet.md](07-schema-ops-chi-tiet.md) |

### 3. Chiến Lược Kỹ Thuật

| # | Tài liệu | Mô tả | File |
|---|----------|-------|------|
| 08 | **Chiến Lược Đồng Bộ** | Offline-first, conflict resolution, sync protocol | [08-chien-luoc-dong-bo.md](08-chien-luoc-dong-bo.md) |
| 09 | **Chiến Lược Bảo Mật** | RLS, encryption, authentication, compliance | [09-chien-luoc-bao-mat.md](09-chien-luoc-bao-mat.md) |

---

## 🎯 Lộ Trình Đọc

### Cho Product Manager / Business Analyst

1. [01. Tổng Quan Hệ Thống](01-system-overview.md) - Hiểu tổng quan
2. [03. Quy Tắc Nghiệp Vụ](03-quy-tac-nghiep-vu.md) - Hiểu business logic
3. [05. Danh Mục Bảng](05-danh-muc-bang-du-lieu.md) - Xem tổng quan data model

### Cho Backend Developer

1. [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md) - Hiểu cấu trúc tổng thể
2. [04. Schema Core Chi Tiết](04-schema-core-chi-tiet.md) - Implement core features
3. [03. Quy Tắc Nghiệp Vụ](03-quy-tac-nghiep-vu.md) - Implement triggers & constraints
4. [08. Chiến Lược Đồng Bộ](08-chien-luoc-dong-bo.md) - Implement sync API
5. [09. Chiến Lược Bảo Mật](09-chien-luoc-bao-mat.md) - Implement security

### Cho AI/ML Engineer

1. [01. Tổng Quan Hệ Thống](01-system-overview.md) - Hiểu hệ thống
2. [06. Schema AI Chi Tiết](06-schema-ai-chi-tiet.md) - Implement AI features
3. [03. Quy Tắc Nghiệp Vụ](03-quy-tac-nghiep-vu.md) - Hiểu business rules

### Cho Mobile Developer

1. [01. Tổng Quan Hệ Thống](01-system-overview.md) - Hiểu architecture
2. [08. Chiến Lược Đồng Bộ](08-chien-luoc-dong-bo.md) - Implement offline-first
3. [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md) - Setup local SQLite schema

### Cho DevOps / DBA

1. [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md) - Setup database
2. [09. Chiến Lược Bảo Mật](09-chien-luoc-bao-mat.md) - Setup security & backups
3. [07. Schema OPS Chi Tiết](07-schema-ops-chi-tiet.md) - Setup monitoring

---

## 🗂️ Cấu Trúc Database

### Tổng Quan

- **Database:** PostgreSQL 16+
- **Schemas:** 3 (core, ai, ops)
- **Bảng:** 61 (36 core + 17 ai + 8 ops)
- **Foreign Keys:** 114
- **Triggers:** 15+
- **Indexes:** 100+

### Schema Organization

```
finance_db/
├── core/           # 36 bảng - Business logic chính
│   ├── Tham chiếu (3)
│   ├── Users & Auth (7)
│   ├── Groups (4)
│   ├── Accounts & Assets (4)
│   ├── Categories (3)
│   ├── Transactions (5) ⭐
│   ├── Budgets (2)
│   ├── Goals (3)
│   ├── Recurring (2)
│   └── Debts (2)
│
├── ai/             # 17 bảng - AI/ML features
│   ├── Classification (5)
│   ├── Chat (4)
│   ├── Insights (4)
│   ├── Anomaly (1)
│   └── Training (2)
│
└── ops/            # 8 bảng - Operations
    ├── Audit (2)
    ├── Notifications (3)
    ├── Jobs (2)
    └── Admin (2)
```

---

## 🔑 Tính Năng Chính

### Core Features
- ✅ Multi-currency support (180+ currencies)
- ✅ Multi-account management (cash, bank, e-wallet, credit card)
- ✅ Transaction tracking với OCR receipt scanning
- ✅ Budget management với alerts
- ✅ Financial goals với milestones
- ✅ Recurring transactions
- ✅ Debt tracking
- ✅ Group sharing (family/team)

### AI Features
- ✅ Auto-categorization (confidence-based)
- ✅ Smart merchant detection
- ✅ Tag suggestions
- ✅ Chat assistant với tool calling
- ✅ Spending pattern analysis
- ✅ Forecasting (spending & balance)
- ✅ Anomaly detection
- ✅ Personalized insights

### Technical Features
- ✅ Offline-first với conflict resolution
- ✅ Row-Level Security (RLS)
- ✅ Optimistic locking
- ✅ Soft delete
- ✅ Audit logging
- ✅ Multi-device sync
- ✅ Real-time notifications

---

## 📊 Thống Kê

### Database Size Estimates

| Entity | Ước tính | Ghi chú |
|--------|----------|---------|
| Users | 100,000 | Base case |
| Transactions | 50M/năm | ~500 tx/user/năm |
| Receipts (OCR) | 10M/năm | 20% có hóa đơn |
| Chat messages | 5M/năm | ~50 msg/user/năm |
| Audit logs | 100M/năm | Partitioned |
| **Total DB size** | ~500GB/năm | Với indexes |

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Transaction insert | < 50ms | Indexed, no complex triggers |
| Transaction list | < 100ms | Pagination, covering index |
| Sync pull | < 200ms | Incremental, limit 1000 |
| Chat response | < 2s | Streaming, tool caching |
| OCR processing | < 5s | Async queue |

---

## 🔐 Bảo Mật

### Layers

1. **Network:** TLS 1.3, Certificate pinning
2. **API:** JWT auth, Rate limiting, CORS
3. **Database:** RLS, Encryption at-rest
4. **Application:** Input validation, Output sanitization
5. **Audit:** Full logging, Compliance (GDPR)

### Compliance

- ✅ GDPR (Right to deletion, Data export)
- ✅ PCI DSS Level 2 (Không lưu full card number)
- ✅ SOC 2 (Audit trails, Access controls)

---

## 🚀 Getting Started

### Prerequisites

```bash
# PostgreSQL 16+
sudo apt install postgresql-16

# Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

### Initialize Database

```bash
# 1. Create database
createdb finance_db

# 2. Run schema
psql finance_db < schema/01-create-schemas.sql
psql finance_db < schema/02-create-enums.sql
psql finance_db < schema/03-create-tables-core.sql
psql finance_db < schema/04-create-tables-ai.sql
psql finance_db < schema/05-create-tables-ops.sql

# 3. Run seed data
psql finance_db < seed/01-currencies.sql
psql finance_db < seed/02-banks.sql
psql finance_db < seed/03-categories.sql

# 4. Setup RLS
psql finance_db < security/01-enable-rls.sql
psql finance_db < security/02-create-policies.sql

# 5. Create triggers
psql finance_db < triggers/01-updated-at.sql
psql finance_db < triggers/02-version-increment.sql
psql finance_db < triggers/03-business-rules.sql
```

### Verify Installation

```sql
-- Check schemas
\dn

-- Check tables
SELECT 
  schemaname,
  COUNT(*) as table_count
FROM pg_tables
WHERE schemaname IN ('core', 'ai', 'ops')
GROUP BY schemaname;

-- Check RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'core'
  AND rowsecurity = true;
```

---

## 📝 Quy Tắc Đặt Tên

### Tables
- Snake case: `user_profiles`, `transaction_tags`
- Số nhiều cho entity tables: `transactions`, `accounts`
- Số ít cho junction tables: `transaction_tag` (nếu không có logic riêng)

### Columns
- Snake case: `created_at`, `user_id`
- Suffix `_id` cho foreign keys
- Suffix `_at` cho timestamps
- Suffix `_count` cho counters

### Indexes
- Format: `idx_{table}_{columns}`
- Example: `idx_transactions_user_date`

### Constraints
- PK: `pk_{table}`
- FK: `fk_{table}_{ref_table}`
- CHECK: `ck_{table}_{description}`
- UNIQUE: `uq_{table}_{columns}`

---

## 🧪 Testing

### Test Coverage

- ✅ 109/109 schema tests passed
- ✅ All foreign keys validated
- ✅ All triggers tested
- ✅ RLS policies verified
- ✅ Sync conflict scenarios tested

### Run Tests

```bash
# Unit tests
npm run test:db

# Integration tests
npm run test:integration

# Load tests
npm run test:load
```

---

## 📖 Tài Liệu Tham Khảo

### External Documentation

- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Row-Level Security Guide](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- [Spring Boot Data JPA](https://spring.io/projects/spring-data-jpa)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

### Related Projects

- Backend API: `../src/main/java/com/finance/`
- AI Service: `../ai-service/`
- Mobile App: `../../frontend-app/`

---

## 🤝 Đóng Góp

### Workflow

1. Đọc tài liệu liên quan
2. Tạo branch: `feature/your-feature`
3. Implement changes
4. Viết/cập nhật docs
5. Run tests
6. Create PR

### Documentation Updates

Khi thay đổi database:

1. Cập nhật file `.sql` schema
2. Cập nhật markdown docs tương ứng
3. Cập nhật ERD nếu có thay đổi quan hệ
4. Update `README.md` nếu cần

---

## 📞 Liên Hệ

**Team:** PFM-AI Development Team  
**University:** Đại học Bách Khoa  
**Project:** Đồ án tốt nghiệp 2026  
**Repository:** [GitHub](https://github.com/your-repo)

---

## 📄 License

Copyright © 2026 PFM-AI Team. All rights reserved.

---

**Phiên bản tài liệu:** 2.1  
**Cập nhật lần cuối:** 11/10/2026  
**Người duy trì:** Backend Team

---

## Quick Links

- 🏠 [Trang chủ docs](#)
- 📊 [Database Schema](02-tong-quan-co-so-du-lieu.md)
- 🔧 [API Specification](api/README.md)
- 🎨 [Frontend Docs](../../frontend-app/README.md)
- 🌐 [API Documentation](api/README.md)
- 🤖 [AI Service Docs](#) *(coming next)*
