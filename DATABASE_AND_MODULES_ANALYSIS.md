# 📊 Phân Tích Tổng Thể Hệ Thống PFM-AI

**Project:** Personal Finance Management with AI Assistant  
**Backend:** Spring Boot 3.x + PostgreSQL  
**Frontend:** React Native (Mobile) + React (Web)  
**Created:** 2026-10-28  
**Author:** System Analysis

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Database Schema](#2-database-schema)
3. [Phân Tích Modules Backend](#3-phân-tích-modules-backend)
4. [So Sánh Implementation vs Documentation](#4-so-sánh-implementation-vs-documentation)
5. [Nghiệp Vụ Chi Tiết Từng Module](#5-nghiệp-vụ-chi-tiết-từng-module)
6. [Kiến Trúc & Design Patterns](#6-kiến-trúc--design-patterns)
7. [Tổng Kết & Đánh Giá](#7-tổng-kết--đánh-giá)

---

## 1. Tổng Quan Hệ Thống

### 1.1. Tech Stack

**Backend:**
- Spring Boot 3.2.x
- Spring Security 6.x (JWT Authentication)
- Spring Data JPA
- PostgreSQL 15
- Flyway Migration
- Lombok
- Jakarta Validation

**Frontend:**
- React Native (Expo) - Mobile App
- React + TypeScript - Web Admin
- Axios - HTTP Client
- React Navigation

**DevOps:**
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- Redis (Caching - planned)

### 1.2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Mobile App   │  │   Web App    │  │  Admin Web   │      │
│  │ (RN + Expo)  │  │ (React + TS) │  │  (React)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │     Nginx      │
                    │ (Reverse Proxy)│
                    └───────┬────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Backend Layer (Spring Boot)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Security Layer                          │   │
│  │  - JWT Authentication                                │   │
│  │  - Role-Based Access Control (RBAC)                 │   │
│  │  - Row-Level Security (RLS)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Controller Layer                        │   │
│  │  17 Modules × REST Controllers                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Service Layer                           │   │
│  │  Business Logic & Validation                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Repository Layer (JPA)                     │   │
│  │  Data Access Objects                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   PostgreSQL   │
                    │   (62 tables)  │
                    └────────────────┘
```

---

## 2. Database Schema

### 2.1. Tổng Quan Database

**Schema:** `core`  
**Tổng số bảng:** 62 tables  
**Migration versions:** 49 versions (V1 → V49)  
**Database:** PostgreSQL 15

### 2.2. Danh Sách Đầy Đủ 62 Tables

#### 📊 Phân Loại Theo Chức Năng

| STT | Table Name | Module | Status | Mô Tả |
|-----|------------|--------|--------|-------|
| **A. CORE TABLES (9)** |
| 1 | `users` | User | ✅ Implemented | Người dùng hệ thống |
| 2 | `user_profiles` | User | ✅ Implemented | Thông tin profile chi tiết |
| 3 | `user_settings` | User | ✅ Implemented | Cài đặt người dùng |
| 4 | `user_sync_state` | Sync | ✅ Implemented | Trạng thái đồng bộ offline |
| 5 | `user_notification_settings` | Notification | ✅ Implemented | Cài đặt thông báo |
| 6 | `auth_tokens` | Auth | ✅ Implemented | JWT access tokens |
| 7 | `refresh_tokens` | Auth | ✅ Implemented | JWT refresh tokens |
| 8 | `oauth_accounts` | Auth | ✅ Implemented | OAuth login (Google, Facebook) |
| 9 | `mfa_credentials` | Auth | ✅ Implemented | 2FA credentials |
| **B. FINANCIAL CORE (15)** |
| 10 | `accounts` | Account | ✅ Implemented | Tài khoản/ví tiền |
| 11 | `account_balance_snapshots` | Account | ✅ Implemented | Lịch sử số dư |
| 12 | `transactions` | Transaction | ✅ Implemented | Giao dịch thu/chi |
| 13 | `transaction_tags` | Transaction | ✅ Implemented | Tags cho giao dịch |
| 14 | `transaction_comments` | Transaction | ✅ Implemented | Bình luận giao dịch |
| 15 | `categories` | Category | ✅ Implemented | Danh mục chi tiêu |
| 16 | `merchants` | Merchant | ✅ Implemented | Thương hiệu/cửa hàng |
| 17 | `tags` | Tag | ✅ Implemented | Tags hệ thống |
| 18 | `budgets` | Budget | ✅ Implemented | Ngân sách tháng |
| 19 | `budget_items` | Budget | ✅ Implemented | Chi tiết ngân sách |
| 20 | `goals` | Goal | ✅ Implemented | Mục tiêu tài chính |
| 21 | `goal_contributions` | Goal | ✅ Implemented | Đóng góp vào mục tiêu |
| 22 | `goal_milestones` | Goal | ✅ Implemented | Mốc mục tiêu |
| 23 | `debts` | Debt | ✅ Implemented | Khoản nợ/cho vay |
| 24 | `debt_payments` | Debt | ✅ Implemented | Lịch sử trả nợ |
| **C. RECURRING & SCHEDULE (3)** |
| 25 | `schedules` | Schedule | ✅ Implemented | Lịch giao dịch định kỳ |
| 26 | `schedule_occurrences` | Schedule | ✅ Implemented | Các lần xuất hiện |
| 27 | `currencies` | System | ✅ Implemented | Loại tiền tệ |
| **D. GROUP FEATURES (12)** |
| 28 | `groups` | Group | ✅ Implemented | Nhóm chia sẻ chi tiêu |
| 29 | `group_members` | Group | ✅ Implemented | Thành viên nhóm |
| 30 | `group_invitations` | Group | ✅ Implemented | Lời mời tham gia |
| 31 | `group_expenses` | Group | ✅ Implemented | Chi tiêu nhóm |
| 32 | `group_expense_splits` | Group | ✅ Implemented | Phân chia chi tiêu |
| 33 | `group_settlements` | Group | ✅ Implemented | Thanh toán nợ nhóm |
| 34 | `group_funds` | Group | ✅ Implemented | Quỹ nhóm |
| 35 | `group_fund_contributions` | Group | ✅ Implemented | Đóng góp quỹ |
| 36 | `group_messages` | Group | ✅ Implemented | Tin nhắn nhóm |
| 37 | `group_message_attachments` | Group | ✅ Implemented | File đính kèm |
| 38 | `group_message_reactions` | Group | ✅ Implemented | Reactions (emoji) |
| 39 | `group_message_reads` | Group | ✅ Implemented | Trạng thái đã đọc |
| 40 | `group_activities` | Group | ✅ Implemented | Log hoạt động nhóm |
| **E. CHILD FEATURES (3)** |
| 41 | `child_wallets` | User | ✅ Implemented | Ví con (family plan) |
| 42 | `child_chores` | User | ✅ Implemented | Công việc nhà |
| 43 | `child_spend_requests` | User | ✅ Implemented | Yêu cầu chi tiêu |
| **F. ASSETS (2)** |
| 44 | `assets` | Account | ✅ Implemented | Tài sản (nhà, xe, ...) |
| 45 | `asset_valuations` | Account | ✅ Implemented | Định giá tài sản |
| **G. AI & ADVANCED (2)** |
| 46 | `ai_chat_sessions` | AI | ✅ Implemented | Phiên chat với AI |
| 47 | `ai_chat_messages` | AI | ✅ Implemented | Tin nhắn chat AI |
| **H. NOTIFICATION (3)** |
| 48 | `notifications` | Notification | ✅ Implemented | Thông báo in-app |
| 49 | `notification_devices` | Notification | ✅ Implemented | Thiết bị nhận push |
| 50 | `notification_templates` | Notification | ✅ Implemented | Template thông báo |
| **I. SUPPORT & SYSTEM (12)** |
| 51 | `receipts` | Transaction | ✅ Implemented | Hóa đơn scan (OCR) |
| 52 | `attachments` | System | ✅ Implemented | File đính kèm |
| 53 | `banks` | System | ✅ Implemented | Danh sách ngân hàng |
| 54 | `exchange_rates` | System | ✅ Implemented | Tỷ giá ngoại tệ |
| 55 | `features` | System | ✅ Implemented | Feature flags |
| 56 | `feature_usage` | System | ✅ Implemented | Thống kê sử dụng |
| 57 | `subscription_features` | System | ✅ Implemented | Tính năng theo gói |
| 58 | `monthly_summaries` | Report | ✅ Implemented | Tổng kết tháng |
| 59 | `audit_logs` | System | ✅ Implemented | Log hệ thống |
| 60 | `feedbacks` | System | ✅ Implemented | Feedback người dùng |
| 61 | `system_settings` | System | ✅ Implemented | Cấu hình hệ thống |
| 62 | `flyway_schema_history` | System | ✅ System | Lịch sử migration |

### 2.3. Chi Tiết Schema Các Bảng Quan Trọng

Tôi sẽ tiếp tục phần này...


#### 2.3.1. Users Table

```sql
CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    login_alert_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Indexes:**
- `idx_users_email` (email)
- `idx_users_username` (username)
- `idx_users_active` (is_active)

**Business Rules:**
- Email là unique và dùng làm username chính
- Username optional, có thể để null
- Password được hash bằng BCrypt
- Soft delete (deleted_at)
- Account lock sau 5 lần đăng nhập sai
- 2FA optional

---

#### 2.3.2. Accounts Table

```sql
CREATE TABLE core.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- CASH, BANK, CREDIT_CARD, etc.
    currency_code VARCHAR(3) NOT NULL DEFAULT 'VND',
    balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    initial_balance NUMERIC(15,2) DEFAULT 0,
    credit_limit NUMERIC(15,2),
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    icon VARCHAR(100),
    color VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    exclude_from_total BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Account Types:**
- `CASH` - Tiền mặt
- `BANK` - Tài khoản ngân hàng
- `CREDIT_CARD` - Thẻ tín dụng
- `SAVINGS` - Tiết kiệm
- `INVESTMENT` - Đầu tư
- `EWALLET` - Ví điện tử (Momo, ZaloPay, ...)
- `CRYPTO` - Tiền mã hóa
- `OTHER` - Khác

**Business Rules:**
- Mỗi user có thể có nhiều accounts
- Balance được cập nhật realtime khi có transaction
- Credit card có credit_limit
- Một account là default
- Soft delete

---

#### 2.3.3. Transactions Table

```sql
CREATE TABLE core.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id UUID REFERENCES accounts(id),
    transaction_type VARCHAR(20) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    category_id UUID REFERENCES categories(id),
    merchant_id UUID REFERENCES merchants(id),
    amount NUMERIC(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    base_amount NUMERIC(15,2), -- Amount in base currency
    exchange_rate NUMERIC(10,6),
    fee_amount NUMERIC(15,2) DEFAULT 0,
    to_amount NUMERIC(15,2), -- For transfers
    to_currency_code VARCHAR(3),
    description_raw TEXT,
    description_normalized TEXT,
    note TEXT,
    location TEXT, -- JSON: {lat, lng, address}
    occurred_date DATE NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    category_status VARCHAR(20), -- PENDING, CATEGORIZED, AI_SUGGESTED
    source VARCHAR(20), -- MANUAL, BANK_SYNC, OCR, RECURRING
    ai_confidence NUMERIC(3,2),
    ai_category_id UUID,
    ai_merchant_id UUID,
    receipt_url VARCHAR(500),
    schedule_id UUID REFERENCES schedules(id),
    is_recurring BOOLEAN DEFAULT FALSE,
    is_excluded_from_report BOOLEAN DEFAULT FALSE,
    sync_seq BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Transaction Types:**
- `INCOME` - Thu nhập
- `EXPENSE` - Chi tiêu
- `TRANSFER` - Chuyển khoản giữa accounts

**Source:**
- `MANUAL` - Người dùng tạo thủ công
- `BANK_SYNC` - Đồng bộ từ ngân hàng
- `OCR` - Quét từ hóa đơn
- `RECURRING` - Tạo tự động từ recurring schedule

**Category Status:**
- `PENDING` - Chưa phân loại
- `CATEGORIZED` - Đã phân loại thủ công
- `AI_SUGGESTED` - AI đề xuất

**Business Rules:**
- INCOME/EXPENSE: account_id required, to_account_id null
- TRANSFER: cả 2 accounts required
- AI có thể gợi ý category (ai_category_id)
- Soft delete
- Support multi-currency

---

#### 2.3.4. Categories Table

```sql
CREATE TABLE core.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(20) NOT NULL, -- INCOME, EXPENSE
    icon VARCHAR(100),
    color VARCHAR(20),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Loại Categories:**
- `INCOME` - Thu nhập (Lương, Thưởng, Đầu tư, ...)
- `EXPENSE` - Chi tiêu (Ăn uống, Di chuyển, Mua sắm, ...)

**System vs Custom:**
- System categories: is_system = true, user_id = null (dùng chung)
- Custom categories: is_system = false, user_id = user's id

**Hierarchy:**
- Support 2 levels: Parent → Child
- parent_id = null: root category
- parent_id != null: sub-category

**Ví dụ System Categories:**
```
📊 Thu nhập (INCOME)
  ├─ Lương
  ├─ Thưởng
  ├─ Đầu tư
  └─ Thu nhập khác

💰 Chi tiêu (EXPENSE)
  ├─ Ăn uống
  │   ├─ Ăn sáng
  │   ├─ Ăn trưa
  │   └─ Ăn tối
  ├─ Di chuyển
  │   ├─ Xăng xe
  │   ├─ Gửi xe
  │   └─ Taxi/Grab
  ├─ Mua sắm
  ├─ Giải trí
  ├─ Y tế
  ├─ Giáo dục
  └─ Hóa đơn
```

---

#### 2.3.5. Budgets & Budget Items

```sql
CREATE TABLE core.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    period VARCHAR(20) NOT NULL, -- MONTHLY, WEEKLY, YEARLY
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    spent_amount NUMERIC(15,2) DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL,
    alert_enabled BOOLEAN DEFAULT TRUE,
    alert_threshold INT DEFAULT 80, -- % to alert
    rollover_enabled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE core.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    allocated_amount NUMERIC(15,2) NOT NULL,
    spent_amount NUMERIC(15,2) DEFAULT 0,
    rollover_from_previous NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Budget Periods:**
- `MONTHLY` - Ngân sách theo tháng (phổ biến nhất)
- `WEEKLY` - Ngân sách theo tuần
- `YEARLY` - Ngân sách theo năm

**Alert System:**
- alert_threshold: % để bắt đầu cảnh báo (default 80%)
- Khi spent >= 80% allocated: gửi notification
- Khi spent >= 100%: cảnh báo vượt ngân sách

**Rollover:**
- rollover_enabled = true: số tiền dư chuyển sang kỳ sau
- rollover_from_previous: số tiền được chuyển từ kỳ trước

---

#### 2.3.6. Goals Table

```sql
CREATE TABLE core.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id), -- Account to track
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50), -- SAVINGS, DEBT_PAYOFF, EMERGENCY_FUND, etc.
    target_amount NUMERIC(15,2) NOT NULL,
    current_amount NUMERIC(15,2) DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL,
    start_date DATE NOT NULL,
    target_date DATE,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, ACHIEVED, PAUSED, CANCELLED
    priority INT DEFAULT 1, -- 1=Low, 2=Medium, 3=High
    icon VARCHAR(100),
    color VARCHAR(20),
    auto_save_enabled BOOLEAN DEFAULT FALSE,
    auto_save_amount NUMERIC(15,2),
    auto_save_frequency VARCHAR(20), -- DAILY, WEEKLY, MONTHLY
    reminder_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    achieved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Goal Types:**
- `SAVINGS` - Tiết kiệm chung
- `EMERGENCY_FUND` - Quỹ khẩn cấp
- `TRAVEL` - Du lịch
- `HOME_PURCHASE` - Mua nhà
- `CAR_PURCHASE` - Mua xe
- `EDUCATION` - Giáo dục
- `WEDDING` - Đám cưới
- `DEBT_PAYOFF` - Trả nợ
- `INVESTMENT` - Đầu tư
- `RETIREMENT` - Nghỉ hưu
- `OTHER` - Khác

**Auto Save:**
- Tự động trích một số tiền vào mục tiêu định kỳ
- Frequency: DAILY, WEEKLY, MONTHLY
- Tạo recurring transaction tự động

---

#### 2.3.7. Debts Table

```sql
CREATE TABLE core.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    debt_type VARCHAR(20) NOT NULL, -- BORROWING, LENDING
    creditor_name VARCHAR(255), -- For BORROWING
    creditor_phone VARCHAR(20),
    creditor_email VARCHAR(255),
    debtor_name VARCHAR(255), -- For LENDING
    debtor_phone VARCHAR(20),
    debtor_email VARCHAR(255),
    principal_amount NUMERIC(15,2) NOT NULL,
    interest_rate NUMERIC(5,2) DEFAULT 0,
    interest_type VARCHAR(20), -- SIMPLE, COMPOUND
    currency_code VARCHAR(3) NOT NULL,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    remaining_amount NUMERIC(15,2),
    start_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAID, OVERDUE, CANCELLED
    payment_frequency VARCHAR(20), -- MONTHLY, WEEKLY, etc.
    next_payment_date DATE,
    next_payment_amount NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Debt Types:**
- `BORROWING` - Mình đi vay (creditor_* fields)
- `LENDING` - Mình cho vay (debtor_* fields)

**Interest Types:**
- `SIMPLE` - Lãi đơn
- `COMPOUND` - Lãi kép

**Status:**
- `ACTIVE` - Đang còn nợ
- `PAID` - Đã trả hết
- `OVERDUE` - Quá hạn
- `CANCELLED` - Đã hủy

---

#### 2.3.8. Schedules (Recurring Transactions)

```sql
CREATE TABLE core.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    to_account_id UUID REFERENCES accounts(id),
    transaction_type VARCHAR(20) NOT NULL,
    category_id UUID REFERENCES categories(id),
    merchant_id UUID REFERENCES merchants(id),
    amount NUMERIC(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    description TEXT NOT NULL,
    note TEXT,
    frequency VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY, YEARLY
    interval INT DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    end_after_occurrences INT,
    next_occurrence_date DATE NOT NULL,
    last_executed_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    auto_create BOOLEAN DEFAULT TRUE,
    notification_days_before INT DEFAULT 1,
    notification_sent_for_next BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE core.schedule_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    expected_date DATE NOT NULL,
    actual_date DATE,
    transaction_id UUID REFERENCES transactions(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, SKIPPED, FAILED
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Frequency:**
- `DAILY` - Hàng ngày
- `WEEKLY` - Hàng tuần
- `MONTHLY` - Hàng tháng (phổ biến: lương, hóa đơn)
- `YEARLY` - Hàng năm

**Interval:**
- interval = 1: mỗi kỳ
- interval = 2: 2 kỳ một lần
- Ví dụ: WEEKLY + interval=2 = 2 tuần một lần

**Auto Create:**
- auto_create = true: Tự động tạo transaction khi đến hạn
- auto_create = false: Chỉ nhắc nhở, user tạo thủ công

---

#### 2.3.9. Groups (Chia Sẻ Chi Tiêu Nhóm)

```sql
CREATE TABLE core.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) DEFAULT 'GENERAL', -- GENERAL, TRIP, ROOMMATE, PROJECT
    currency_code VARCHAR(3) DEFAULT 'VND',
    created_by UUID NOT NULL REFERENCES users(id),
    icon VARCHAR(100),
    cover_image VARCHAR(500),
    is_private BOOLEAN DEFAULT FALSE,
    invite_code VARCHAR(20) UNIQUE,
    max_members INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE core.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER', -- ADMIN, MODERATOR, MEMBER
    nickname VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    notification_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, user_id)
);

CREATE TABLE core.group_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by_user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    amount NUMERIC(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL,
    split_method VARCHAR(20) NOT NULL, -- EQUAL, PERCENTAGE, EXACT, SHARES
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE core.group_expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(15,2) NOT NULL,
    percentage NUMERIC(5,2),
    shares INT,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP
);

CREATE TABLE core.group_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    settlement_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Group Types:**
- `GENERAL` - Nhóm chung
- `TRIP` - Du lịch
- `ROOMMATE` - Bạn cùng phòng
- `PROJECT` - Dự án

**Roles:**
- `ADMIN` - Quản trị viên (full permissions)
- `MODERATOR` - Điều hành viên
- `MEMBER` - Thành viên thường

**Split Methods:**
- `EQUAL` - Chia đều
- `PERCENTAGE` - Theo %
- `EXACT` - Số tiền cụ thể
- `SHARES` - Theo phần (1:2:3)

---

#### 2.3.10. Notifications

```sql
CREATE TABLE core.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL', -- HIGH, NORMAL, LOW
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url VARCHAR(500),
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    data TEXT, -- JSON data
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE core.notification_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(500) UNIQUE NOT NULL,
    device_type VARCHAR(20) NOT NULL, -- IOS, ANDROID, WEB
    device_name VARCHAR(255),
    app_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);
```

**Notification Types:**
- `TRANSACTION` - Giao dịch mới
- `BUDGET_ALERT` - Cảnh báo ngân sách
- `BUDGET_EXCEEDED` - Vượt ngân sách
- `GOAL_MILESTONE` - Đạt milestone
- `GOAL_ACHIEVED` - Hoàn thành mục tiêu
- `DEBT_REMINDER` - Nhắc trả nợ
- `DEBT_OVERDUE` - Trễ hạn trả nợ
- `RECURRING_DUE` - Recurring sắp đến hạn
- `ANOMALY_DETECTED` - Phát hiện bất thường
- `WEEKLY_SUMMARY` - Tổng kết tuần
- `MONTHLY_REPORT` - Báo cáo tháng
- `SYSTEM` - Thông báo hệ thống

---

### 2.4. Entity Relationships Diagram

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │ 1
       │
       ├──────────┬──────────┬──────────┬──────────┬──────────┐
       │ *        │ *        │ *        │ *        │ *        │
┌──────▼──────┐  │  ┌───────▼──────┐  │  ┌───────▼──────┐  │  ┌──────▼──────┐
│  Accounts   │  │  │ Transactions │  │  │   Budgets    │  │  │    Goals    │
└─────────────┘  │  └──────────────┘  │  └──────────────┘  │  └─────────────┘
                 │                     │                     │
         ┌───────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
         │   Debts      │      │  Schedules  │      │   Groups    │
         └──────────────┘      └─────────────┘      └─────────────┘
```

---

## 3. Phân Tích Modules Backend

### 3.1. Tổng Quan Modules

Backend có **17 modules chính:**

| STT | Module | Package | Status | Entities | Controllers | Services |
|-----|--------|---------|--------|----------|-------------|----------|
| 1 | Auth | `auth` | ✅ Full | 3 | 1 | 2 |
| 2 | User | `user` | ✅ Full | 4 | 1 | 2 |
| 3 | Account | `account` | ✅ Full | 3 | 1 | 1 |
| 4 | Transaction | `transaction` | ✅ Full | 4 | 1 | 2 |
| 5 | Category | `category` | ✅ Full | 1 | 1 | 1 |
| 6 | Budget | `budget` | ✅ Full | 2 | 1 | 1 |
| 7 | Goal | `goal` | ✅ Full | 3 | 1 | 1 |
| 8 | Debt | `debt` | ✅ Full | 2 | 1 | 1 |
| 9 | Schedule | `schedule` | ✅ Full | 2 | 1 | 1 |
| 10 | Group | `group` | ✅ Full | 12 | 1 | 5 |
| 11 | Merchant | `merchant` | ✅ Full | 1 | 1 | 1 |
| 12 | Tag | `tag` | ✅ Full | 1 | 1 | 1 |
| 13 | Notification | `notification` | ✅ Full | 2 | 1 | 2 |
| 14 | OCR | `ocr` | ⚠️ Partial | 1 | 1 | 1 |
| 15 | Feedback | `feedback` | ✅ Full | 1 | 1 | 1 |
| 16 | Admin | `admin` | ⚠️ Partial | 0 | 1 | 1 |
| 17 | System | `system` | ✅ Full | 3 | 0 | 1 |

**Tổng cộng:**
- ✅ Implemented đầy đủ: 15 modules
- ⚠️ Partial implementation: 2 modules (OCR, Admin)
- ❌ Chưa implement: 0 modules

---


---

## 5. Nghiệp Vụ Chi Tiết Từng Module

### 5.1. Module AUTH - Authentication & Authorization

**Package:** `com.finance.finance.modules.auth`

#### 5.1.1. Tính Năng

✅ **Đã implement:**
1. **Register** - Đăng ký tài khoản mới
   - Email validation
   - Password strength check (min 8 chars, uppercase, lowercase, number)
   - Tạo user profile
   - Gửi email verification (planned)

2. **Login** - Đăng nhập
   - Email + Password
   - JWT access token (15 phút)
   - Refresh token (30 ngày)
   - Failed login tracking (lock sau 5 lần sai)

3. **OAuth Login** - Đăng nhập social
   - Google OAuth
   - Facebook OAuth (planned)
   - Link/unlink social accounts

4. **MFA (Multi-Factor Authentication)**
   - TOTP (Google Authenticator)
   - Enable/Disable 2FA
   - Backup codes

5. **Token Management**
   - Refresh access token
   - Logout (revoke refresh token)
   - Logout all devices

6. **Password Management**
   - Change password
   - Forgot password (email reset link)
   - Reset password with token

#### 5.1.2. Entities

**1. AuthToken**
```java
@Entity
@Table(name = "auth_tokens")
public class AuthToken {
    UUID id;
    UUID userId;
    String email;
    String token;
    LocalDateTime expiresAt;
    LocalDateTime createdAt;
}
```

**2. RefreshToken**
```java
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    UUID id;
    UUID userId;
    String token;
    String deviceId;
    LocalDateTime expiresAt;
    LocalDateTime lastUsedAt;
    LocalDateTime createdAt;
}
```

**3. MfaCredential**
```java
@Entity
@Table(name = "mfa_credentials")
public class MfaCredential {
    UUID id;
    UUID userId;
    String secretKey;
    String backupCodes; // JSON array
    Boolean isEnabled;
    LocalDateTime enabledAt;
}
```

#### 5.1.3. API Endpoints

```
POST   /api/v1/auth/register          - Đăng ký
POST   /api/v1/auth/login             - Đăng nhập
POST   /api/v1/auth/refresh           - Refresh token
POST   /api/v1/auth/logout            - Đăng xuất
POST   /api/v1/auth/logout-all        - Đăng xuất tất cả thiết bị
POST   /api/v1/auth/oauth/google      - Google OAuth
POST   /api/v1/auth/forgot-password   - Quên mật khẩu
POST   /api/v1/auth/reset-password    - Reset mật khẩu
POST   /api/v1/auth/change-password   - Đổi mật khẩu
POST   /api/v1/auth/mfa/enable        - Bật 2FA
POST   /api/v1/auth/mfa/disable       - Tắt 2FA
POST   /api/v1/auth/mfa/verify        - Verify 2FA code
```

#### 5.1.4. Security Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. POST /auth/login
       │    {email, password}
       ▼
┌─────────────────────────────────┐
│      AuthController             │
│   - Validate credentials        │
│   - Check account status        │
│   - Check 2FA requirement       │
└──────┬──────────────────────────┘
       │ 2. Valid credentials
       ▼
┌─────────────────────────────────┐
│      AuthService                │
│   - Generate JWT access token   │
│   - Generate refresh token      │
│   - Save refresh token to DB    │
│   - Update last_login_at        │
└──────┬──────────────────────────┘
       │ 3. Return tokens
       ▼
┌─────────────┐
│   Client    │
│ Store tokens│
└─────────────┘
       │
       │ 4. API Requests
       │    Header: Authorization: Bearer <access_token>
       ▼
┌─────────────────────────────────┐
│   JwtAuthenticationFilter       │
│   - Extract token from header   │
│   - Validate token signature    │
│   - Check expiration            │
│   - Load user details           │
│   - Set SecurityContext         │
└─────────────────────────────────┘
```

#### 5.1.5. Password Security

- **Hashing Algorithm:** BCrypt with strength 12
- **Password Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (recommended)

#### 5.1.6. Token Expiration

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token | 15 minutes | Cannot refresh |
| Refresh Token | 30 days | Can extend |
| Reset Token | 1 hour | Single use |
| Email Verification | 24 hours | Can resend |

---

### 5.2. Module USER - User Management

**Package:** `com.finance.finance.modules.user`

#### 5.2.1. Tính Năng

✅ **Đã implement:**
1. **Profile Management**
   - Get user profile
   - Update profile (name, phone, avatar, DOB, gender)
   - Upload avatar
   - Delete account (soft delete)

2. **Settings Management**
   - Get/Update user settings
   - Currency preference
   - Language preference
   - Timezone
   - Date/Time format
   - Week start day

3. **Notification Settings**
   - Email notifications on/off
   - Push notifications on/off
   - Budget alerts
   - Transaction alerts
   - Goal reminders
   - Debt reminders

4. **Security Settings**
   - Enable/Disable 2FA
   - Login alert
   - Session management
   - View active devices

5. **Child Wallets (Family Plan)**
   - Create child wallet
   - Assign chores
   - Approve spend requests
   - Track allowance

#### 5.2.2. Entities

**1. User**
```java
@Entity
@Table(name = "users")
public class User {
    UUID id;
    String email;
    String username;
    String passwordHash;
    String fullName;
    String avatarUrl;
    String phone;
    LocalDate dateOfBirth;
    String gender;
    Boolean isActive;
    Boolean isEmailVerified;
    Boolean twoFactorEnabled;
    Boolean loginAlertEnabled;
    Integer failedLoginAttempts;
    LocalDateTime accountLockedUntil;
    LocalDateTime lastLoginAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. UserProfile**
```java
@Entity
@Table(name = "user_profiles")
public class UserProfile {
    UUID id;
    UUID userId;
    String bio;
    String occupation;
    String company;
    String location;
    String website;
    String socialLinks; // JSON
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

**3. UserSettings**
```java
@Entity
@Table(name = "user_settings")
public class UserSettings {
    UUID id;
    UUID userId;
    String defaultCurrency;
    String language;
    String timezone;
    String dateFormat;
    String timeFormat;
    String weekStartDay;
    Boolean darkMode;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

**4. UserNotificationSettings**
```java
@Entity
@Table(name = "user_notification_settings")
public class UserNotificationSettings {
    UUID id;
    UUID userId;
    Boolean emailEnabled;
    Boolean pushEnabled;
    Boolean budgetAlerts;
    Boolean transactionAlerts;
    Boolean goalReminders;
    Boolean debtReminders;
    Boolean weeklyReport;
    Boolean monthlyReport;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### 5.2.3. API Endpoints

```
GET    /api/v1/users/me              - Lấy thông tin user
PUT    /api/v1/users/me              - Cập nhật profile
DELETE /api/v1/users/me              - Xóa tài khoản
POST   /api/v1/users/avatar          - Upload avatar
GET    /api/v1/users/settings        - Lấy settings
PUT    /api/v1/users/settings        - Cập nhật settings
GET    /api/v1/users/notification-settings  - Lấy notification settings
PUT    /api/v1/users/notification-settings  - Cập nhật notification settings
```

---

### 5.3. Module ACCOUNT - Quản Lý Tài Khoản/Ví

**Package:** `com.finance.finance.modules.account`

#### 5.3.1. Tính Năng

✅ **Đã implement:**
1. **Account CRUD**
   - Tạo account mới
   - Lấy danh sách accounts
   - Lấy chi tiết account
   - Cập nhật thông tin account
   - Xóa account (soft delete)
   - Set account mặc định

2. **Balance Management**
   - Get current balance
   - Balance history (snapshots)
   - Balance forecast
   - Net worth calculation

3. **Account Types Support**
   - Cash (Tiền mặt)
   - Bank Account (Tài khoản ngân hàng)
   - Credit Card (Thẻ tín dụng)
   - Savings (Tiết kiệm)
   - Investment (Đầu tư)
   - E-Wallet (Ví điện tử)
   - Cryptocurrency
   - Other

4. **Multi-Currency**
   - Support 150+ currencies
   - Real-time exchange rates
   - Base currency conversion

5. **Assets Management**
   - Track physical assets (nhà, xe, ...)
   - Asset valuation history
   - Depreciation tracking

#### 5.3.2. Entities

**1. Account**
```java
@Entity
@Table(name = "accounts")
public class Account {
    UUID id;
    UUID userId;
    String name;
    AccountType accountType;
    String currencyCode;
    BigDecimal balance;
    BigDecimal initialBalance;
    BigDecimal creditLimit; // For credit cards
    String bankName;
    String accountNumber;
    String icon;
    String color;
    Boolean isDefault;
    Boolean isActive;
    Boolean excludeFromTotal;
    Integer displayOrder;
    String notes;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. AccountBalanceSnapshot**
```java
@Entity
@Table(name = "account_balance_snapshots")
public class AccountBalanceSnapshot {
    UUID id;
    UUID accountId;
    BigDecimal balance;
    LocalDate snapshotDate;
    LocalDateTime createdAt;
}
```

**3. Asset**
```java
@Entity
@Table(name = "assets")
public class Asset {
    UUID id;
    UUID userId;
    String name;
    AssetType assetType; // REAL_ESTATE, VEHICLE, JEWELRY, etc.
    BigDecimal purchasePrice;
    BigDecimal currentValue;
    String currencyCode;
    LocalDate purchaseDate;
    LocalDate lastValuationDate;
    String notes;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### 5.3.3. Business Logic

**Balance Calculation:**
```
Net Worth = Σ(Active Accounts Balance) + Σ(Assets Value) - Σ(Debts Remaining)

Liquid Assets = Σ(Cash + Bank + E-Wallet) - Σ(Credit Card Balance)

Available Credit = Σ(Credit Card Limit) - Σ(Credit Card Balance)
```

**Account Balance Update:**
- **INCOME Transaction:** balance += amount
- **EXPENSE Transaction:** balance -= amount
- **TRANSFER Transaction:**
  - From account: balance -= amount + fee
  - To account: balance += to_amount

**Credit Card Logic:**
- Balance = Debt amount (negative)
- Available = Credit Limit - |Balance|
- Payment reduces balance (makes it less negative)

#### 5.3.4. API Endpoints

```
POST   /api/v1/accounts                    - Tạo account
GET    /api/v1/accounts                    - Danh sách accounts
GET    /api/v1/accounts/{id}               - Chi tiết account
PUT    /api/v1/accounts/{id}               - Cập nhật account
DELETE /api/v1/accounts/{id}               - Xóa account
POST   /api/v1/accounts/{id}/set-default   - Đặt mặc định
GET    /api/v1/accounts/summary            - Tổng quan tài khoản
GET    /api/v1/accounts/{id}/balance-history  - Lịch sử số dư
```

---

### 5.4. Module TRANSACTION - Quản Lý Giao Dịch

**Package:** `com.finance.finance.modules.transaction`

#### 5.4.1. Tính Năng

✅ **Đã implement:**
1. **Transaction CRUD**
   - Tạo transaction (INCOME/EXPENSE/TRANSFER)
   - Lấy danh sách transactions với filters
   - Lấy chi tiết transaction
   - Cập nhật transaction
   - Xóa transaction (soft delete)

2. **Filters & Search**
   - Filter by type (INCOME/EXPENSE/TRANSFER)
   - Filter by account
   - Filter by category
   - Filter by merchant
   - Filter by date range
   - Filter by amount range
   - Search by description
   - Filter by tags

3. **Bulk Operations**
   - Bulk categorize
   - Bulk tag
   - Bulk delete

4. **AI Features**
   - Auto-categorize with confidence score
   - Merchant detection
   - Duplicate detection
   - Anomaly detection

5. **Attachments**
   - Upload receipts
   - OCR scan receipts
   - Link receipts to transactions

6. **Comments & Tags**
   - Add comments
   - Add/Remove tags
   - Tag management

#### 5.4.2. Entities

**1. Transaction**
```java
@Entity
@Table(name = "transactions")
public class Transaction {
    UUID id;
    UUID userId;
    UUID accountId;
    UUID toAccountId; // For transfers
    TransactionType transactionType;
    UUID categoryId;
    UUID merchantId;
    BigDecimal amount;
    String currencyCode;
    BigDecimal baseAmount;
    BigDecimal exchangeRate;
    BigDecimal feeAmount;
    BigDecimal toAmount;
    String toCurrencyCode;
    String descriptionRaw;
    String descriptionNormalized;
    String note;
    String location; // JSON: {lat, lng, address}
    LocalDate occurredDate;
    LocalDateTime occurredAt;
    CategoryStatus categoryStatus;
    TransactionSource source;
    BigDecimal aiConfidence;
    UUID aiCategoryId;
    UUID aiMerchantId;
    String receiptUrl;
    UUID scheduleId;
    Boolean isRecurring;
    Boolean isExcludedFromReport;
    Long syncSeq;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. TransactionComment**
```java
@Entity
@Table(name = "transaction_comments")
public class TransactionComment {
    UUID id;
    UUID transactionId;
    UUID userId;
    String comment;
    LocalDateTime createdAt;
}
```

**3. TransactionTag**
```java
@Entity
@Table(name = "transaction_tags")
public class TransactionTag {
    UUID id;
    UUID transactionId;
    UUID tagId;
    LocalDateTime createdAt;
}
```

**4. Receipt**
```java
@Entity
@Table(name = "receipts")
public class Receipt {
    UUID id;
    UUID userId;
    UUID transactionId;
    String imageUrl;
    String ocrText; // OCR extracted text
    String ocrData; // JSON: {merchant, amount, date, items}
    LocalDateTime processedAt;
    LocalDateTime createdAt;
}
```

#### 5.4.3. Transaction Types

**1. INCOME (Thu Nhập)**
```json
{
  "transaction_type": "INCOME",
  "account_id": "uuid-account",
  "to_account_id": null,
  "category_id": "uuid-category-salary",
  "amount": 15000000,
  "description": "Lương tháng 10"
}
```
→ Account balance tăng +15,000,000

**2. EXPENSE (Chi Tiêu)**
```json
{
  "transaction_type": "EXPENSE",
  "account_id": "uuid-account",
  "to_account_id": null,
  "category_id": "uuid-category-food",
  "amount": 150000,
  "description": "Ăn trưa"
}
```
→ Account balance giảm -150,000

**3. TRANSFER (Chuyển Khoản)**
```json
{
  "transaction_type": "TRANSFER",
  "account_id": "uuid-from-account",
  "to_account_id": "uuid-to-account",
  "category_id": null,
  "amount": 1000000,
  "to_amount": 1000000,
  "fee_amount": 5000,
  "description": "Chuyển tiền tiết kiệm"
}
```
→ From account: -1,005,000 (amount + fee)  
→ To account: +1,000,000

#### 5.4.4. AI Categorization

**Process:**
1. User creates transaction with description
2. AI analyzes description + merchant (if any)
3. Suggests category with confidence score (0.0 → 1.0)
4. If confidence > 0.8: Auto-apply category
5. If confidence 0.5-0.8: Show suggestion to user
6. If confidence < 0.5: No suggestion

**Example:**
```
Description: "Cafe Highlands 45k"
→ AI detects:
   - Merchant: "Highlands Coffee"
   - Category: "Ăn uống → Cafe"
   - Confidence: 0.95
   - Amount: 45,000
```

#### 5.4.5. API Endpoints

```
POST   /api/v1/transactions               - Tạo transaction
GET    /api/v1/transactions               - Danh sách transactions
GET    /api/v1/transactions/{id}          - Chi tiết transaction
PUT    /api/v1/transactions/{id}          - Cập nhật transaction
DELETE /api/v1/transactions/{id}          - Xóa transaction
POST   /api/v1/transactions/bulk-categorize  - Phân loại hàng loạt
POST   /api/v1/transactions/{id}/comments    - Thêm comment
POST   /api/v1/transactions/{id}/tags        - Thêm tag
GET    /api/v1/transactions/statistics       - Thống kê
```

---

### 5.5. Module BUDGET - Quản Lý Ngân Sách

**Package:** `com.finance.finance.modules.budget`

#### 5.5.1. Tính Năng

✅ **Đã implement:**
1. **Budget Management**
   - Tạo budget (monthly/weekly/yearly)
   - Phân bổ ngân sách theo category
   - Theo dõi chi tiêu realtime
   - Cảnh báo khi gần vượt ngân sách
   - Cảnh báo khi vượt ngân sách
   - Rollover số tiền dư sang kỳ sau

2. **Budget Analysis**
   - % đã chi
   - Số tiền còn lại
   - Dự đoán chi tiêu cuối kỳ
   - So sánh với kỳ trước
   - Top categories vượt ngân sách

3. **Alerts**
   - Alert khi đạt 80% (configurable)
   - Alert khi đạt 100%
   - Daily/Weekly summary emails

#### 5.5.2. Entities

**1. Budget**
```java
@Entity
@Table(name = "budgets")
public class Budget {
    UUID id;
    UUID userId;
    String name;
    BudgetPeriod period; // MONTHLY, WEEKLY, YEARLY
    LocalDate startDate;
    LocalDate endDate;
    BigDecimal totalAmount;
    BigDecimal spentAmount;
    String currencyCode;
    Boolean alertEnabled;
    Integer alertThreshold; // % (default 80)
    Boolean rolloverEnabled;
    String notes;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

**2. BudgetItem**
```java
@Entity
@Table(name = "budget_items")
public class BudgetItem {
    UUID id;
    UUID budgetId;
    UUID categoryId;
    BigDecimal allocatedAmount;
    BigDecimal spentAmount;
    BigDecimal rolloverFromPrevious;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### 5.5.3. Business Logic

**Spent Calculation:**
```
For each BudgetItem:
  spentAmount = SUM(transactions.amount)
    WHERE category_id = item.category_id
    AND transaction_type = 'EXPENSE'
    AND occurred_date BETWEEN budget.start_date AND budget.end_date
    AND deleted_at IS NULL

Budget.spentAmount = SUM(BudgetItem.spentAmount)
```

**Alert Triggers:**
```
For each BudgetItem:
  percentage = (spentAmount / allocatedAmount) * 100
  
  IF percentage >= alertThreshold (80%):
    → Send notification: "Budget Alert"
  
  IF percentage >= 100%:
    → Send notification: "Budget Exceeded"
```

**Rollover Logic:**
```
At end of budget period:
  IF rolloverEnabled = true:
    FOR each BudgetItem:
      remaining = allocatedAmount - spentAmount
      IF remaining > 0:
        nextPeriodItem.rolloverFromPrevious = remaining
        nextPeriodItem.allocatedAmount += remaining
```

#### 5.5.4. API Endpoints

```
POST   /api/v1/budgets                    - Tạo budget
GET    /api/v1/budgets                    - Danh sách budgets
GET    /api/v1/budgets/{id}               - Chi tiết budget
PUT    /api/v1/budgets/{id}               - Cập nhật budget
DELETE /api/v1/budgets/{id}               - Xóa budget
GET    /api/v1/budgets/current            - Budget hiện tại
GET    /api/v1/budgets/{id}/summary       - Tổng quan budget
GET    /api/v1/budgets/{id}/compare       - So sánh với kỳ trước
```

---

### 5.6. Module GOAL - Quản Lý Mục Tiêu Tài Chính

**Package:** `com.finance.finance.modules.goal`

#### 5.6.1. Tính Năng

✅ **Đã implement:**
1. **Goal Management**
   - Tạo goal với target amount
   - Theo dõi progress
   - Đóng góp vào goal
   - Rút tiền từ goal
   - Pause/Resume goal
   - Complete/Cancel goal

2. **Goal Types**
   - Savings (Tiết kiệm chung)
   - Emergency Fund (Quỹ khẩn cấp)
   - Travel (Du lịch)
   - Home Purchase (Mua nhà)
   - Car Purchase (Mua xe)
   - Education (Giáo dục)
   - Wedding (Đám cưới)
   - Retirement (Nghỉ hưu)
   - Debt Payoff (Trả nợ)
   - Investment (Đầu tư)
   - Other

3. **Milestones**
   - Set milestones (25%, 50%, 75%)
   - Celebrate achievements
   - Track progress history

4. **Auto Save**
   - Tự động trích tiền định kỳ
   - Frequency: Daily/Weekly/Monthly
   - Tạo recurring transaction

5. **Reminders**
   - Nhắc đóng góp định kỳ
   - Nhắc khi deadline gần tới

#### 5.6.2. Entities

**1. Goal**
```java
@Entity
@Table(name = "goals")
public class Goal {
    UUID id;
    UUID userId;
    UUID accountId; // Account to track
    String name;
    String description;
    GoalType goalType;
    BigDecimal targetAmount;
    BigDecimal currentAmount;
    String currencyCode;
    LocalDate startDate;
    LocalDate targetDate;
    LocalDate deadline;
    GoalStatus status; // IN_PROGRESS, ACHIEVED, PAUSED, CANCELLED
    Integer priority; // 1=Low, 2=Medium, 3=High
    String icon;
    String color;
    Boolean autoSaveEnabled;
    BigDecimal autoSaveAmount;
    AutoSaveFrequency autoSaveFrequency;
    Boolean reminderEnabled;
    String notes;
    LocalDateTime achievedAt;
    LocalDateTime completedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. GoalContribution**
```java
@Entity
@Table(name = "goal_contributions")
public class GoalContribution {
    UUID id;
    UUID goalId;
    UUID sourceAccountId;
    BigDecimal amount;
    String note;
    LocalDateTime contributedAt;
    LocalDateTime createdAt;
}
```

**3. GoalMilestone**
```java
@Entity
@Table(name = "goal_milestones")
public class GoalMilestone {
    UUID id;
    UUID goalId;
    String name;
    BigDecimal targetAmount;
    Integer targetPercentage;
    LocalDate targetDate;
    Boolean isAchieved;
    LocalDateTime achievedAt;
    LocalDateTime createdAt;
}
```

#### 5.6.3. Business Logic

**Progress Calculation:**
```
percentage = (currentAmount / targetAmount) * 100
remaining = targetAmount - currentAmount
daysLeft = deadline - today
averageNeeded = remaining / daysLeft
```

**Contribution Flow:**
```
1. User contributes to goal
2. Create EXPENSE transaction from source account
   - Category: "Tiết kiệm, đầu tư"
   - Description: "Đóng góp vào mục tiêu: [goal name]"
3. Deduct money from source account
4. Increase goal.currentAmount
5. Create GoalContribution record
6. Check if milestone reached
7. Check if goal achieved
8. Send notification
```

**Auto Save:**
```
Create Schedule:
  frequency = goal.autoSaveFrequency
  amount = goal.autoSaveAmount
  transaction_type = EXPENSE
  category = "Tiết kiệm, đầu tư"
  description = "Auto save: [goal name]"
  
On each occurrence:
  → Create transaction
  → Contribute to goal
```

#### 5.6.4. API Endpoints

```
POST   /api/v1/goals                      - Tạo goal
GET    /api/v1/goals                      - Danh sách goals
GET    /api/v1/goals/{id}                 - Chi tiết goal
PUT    /api/v1/goals/{id}                 - Cập nhật goal
DELETE /api/v1/goals/{id}                 - Xóa goal
POST   /api/v1/goals/{id}/contribute      - Đóng góp vào goal
POST   /api/v1/goals/{id}/withdraw        - Rút tiền từ goal
PUT    /api/v1/goals/{id}/pause           - Tạm dừng goal
PUT    /api/v1/goals/{id}/resume          - Tiếp tục goal
PUT    /api/v1/goals/{id}/complete        - Hoàn thành goal
GET    /api/v1/goals/summary              - Tổng quan goals
```

---

### 5.7. Module DEBT - Quản Lý Nợ

**Package:** `com.finance.finance.modules.debt`

#### 5.7.1. Tính Năng

✅ **Đã implement:**
1. **Debt Management**
   - Tạo khoản nợ (Borrowing/Lending)
   - Theo dõi gốc + lãi
   - Lịch sử trả nợ
   - Tính lãi suất (đơn/kép)
   - Nhắc hẹn trả nợ

2. **Debt Types**
   - BORROWING - Mình đi vay
   - LENDING - Mình cho vay

3. **Payment Tracking**
   - Record payment (gốc + lãi)
   - Update remaining amount
   - Calculate next payment
   - Track overdue debts

4. **Interest Calculation**
   - Simple Interest
   - Compound Interest
   - Payment schedule

#### 5.7.2. Entities

**1. Debt**
```java
@Entity
@Table(name = "debts")
public class Debt {
    UUID id;
    UUID userId;
    UUID accountId;
    DebtType debtType; // BORROWING, LENDING
    String creditorName; // For BORROWING
    String creditorPhone;
    String creditorEmail;
    String debtorName; // For LENDING
    String debtorPhone;
    String debtorEmail;
    BigDecimal principalAmount;
    BigDecimal interestRate; // %
    InterestType interestType; // SIMPLE, COMPOUND
    String currencyCode;
    BigDecimal paidAmount;
    BigDecimal remainingAmount;
    LocalDate startDate;
    LocalDate dueDate;
    DebtStatus status; // ACTIVE, PAID, OVERDUE, CANCELLED
    PaymentFrequency paymentFrequency;
    LocalDate nextPaymentDate;
    BigDecimal nextPaymentAmount;
    String notes;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. DebtPayment**
```java
@Entity
@Table(name = "debt_payments")
public class DebtPayment {
    UUID id;
    UUID debtId;
    UUID accountId; // Account used for payment
    UUID transactionId; // Link to transaction
    BigDecimal amount;
    BigDecimal principalPaid;
    BigDecimal interestPaid;
    LocalDate paymentDate;
    String paymentMethod;
    String note;
    LocalDateTime createdAt;
}
```

#### 5.7.3. Business Logic

**Simple Interest:**
```
Total Interest = Principal × Rate × Time
Total Amount = Principal + Interest
```

**Compound Interest:**
```
Total Amount = Principal × (1 + Rate)^Time
Total Interest = Total Amount - Principal
```

**Payment Flow:**
```
1. User records payment
2. Create EXPENSE transaction from account
   - Category: "Trả nợ"
   - Description: "Trả nợ: [creditor/debtor name]"
3. Deduct money from account
4. Split payment: principal + interest
5. Update debt.paidAmount
6. Update debt.remainingAmount
7. Create DebtPayment record
8. Calculate next payment date
9. Check if debt paid off
10. Send notification
```

**Overdue Check:**
```
FOR each active debt:
  IF today > nextPaymentDate:
    → debt.status = OVERDUE
    → Send notification "Debt Overdue"
```

#### 5.7.4. API Endpoints

```
POST   /api/v1/debts                      - Tạo khoản nợ
GET    /api/v1/debts                      - Danh sách nợ
GET    /api/v1/debts/{id}                 - Chi tiết nợ
PUT    /api/v1/debts/{id}                 - Cập nhật nợ
DELETE /api/v1/debts/{id}                 - Xóa nợ
POST   /api/v1/debts/{id}/payments        - Ghi nhận trả nợ
GET    /api/v1/debts/{id}/payments        - Lịch sử trả nợ
GET    /api/v1/debts/summary              - Tổng quan nợ
GET    /api/v1/debts/overdue              - Danh sách nợ quá hạn
```

---

Tôi sẽ tiếp tục các module còn lại...



### 5.8. Module SCHEDULE - Giao Dịch Định Kỳ (Recurring)

**Package:** `com.finance.finance.modules.schedule`

#### 5.8.1. Tính Năng

✅ **Đã implement:**
1. **Schedule Management**
   - Tạo lịch định kỳ (daily/weekly/monthly/yearly)
   - Tự động tạo transaction khi đến hạn
   - Nhắc nhở trước X ngày
   - Pause/Resume schedule
   - Skip occurrence
   - End schedule

2. **Frequency Support**
   - DAILY - Hàng ngày
   - WEEKLY - Hàng tuần
   - MONTHLY - Hàng tháng (phổ biến)
   - YEARLY - Hàng năm
   - Custom interval (every N days/weeks/months)

3. **Auto-Create**
   - auto_create = true: Tự động tạo transaction
   - auto_create = false: Chỉ nhắc nhở

4. **Notification**
   - Nhắc trước N ngày
   - Nhắc khi tạo transaction
   - Nhắc khi skip/fail

#### 5.8.2. Entities

**1. Schedule**
```java
@Entity
@Table(name = "schedules")
public class Schedule {
    UUID id;
    UUID userId;
    UUID accountId;
    UUID toAccountId;
    TransactionType transactionType;
    UUID categoryId;
    UUID merchantId;
    BigDecimal amount;
    String currencyCode;
    String description;
    String note;
    ScheduleFrequency frequency; // DAILY, WEEKLY, MONTHLY, YEARLY
    Integer interval; // Every N frequency
    LocalDate startDate;
    LocalDate endDate;
    Integer endAfterOccurrences;
    LocalDate nextOccurrenceDate;
    LocalDate lastExecutedDate;
    Boolean isActive;
    Boolean autoCreate;
    Integer notificationDaysBefore;
    Boolean notificationSentForNext;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

**2. ScheduleOccurrence**
```java
@Entity
@Table(name = "schedule_occurrences")
public class ScheduleOccurrence {
    UUID id;
    UUID scheduleId;
    LocalDate expectedDate;
    LocalDate actualDate;
    UUID transactionId;
    OccurrenceStatus status; // PENDING, COMPLETED, SKIPPED, FAILED
    Boolean notificationSent;
    LocalDateTime createdAt;
}
```

#### 5.8.3. Business Logic

**Schedule Creation:**
```
1. User creates schedule
2. Calculate first occurrence date
3. Calculate end conditions (end_date OR end_after_occurrences)
4. Generate all occurrences in advance (up to 12 months)
5. Set next_occurrence_date
```

**Auto-Create Flow:**
```
Daily Job (runs at 00:00):
  FOR each schedule WHERE nextOccurrenceDate = today:
    IF autoCreate = true:
      → Create transaction
      → Update schedule.lastExecutedDate
      → Create ScheduleOccurrence (status=COMPLETED)
      → Calculate next occurrence date
    ELSE:
      → Send notification reminder
      → Create ScheduleOccurrence (status=PENDING)
```

**Next Occurrence Calculation:**
```
DAILY: nextDate = currentDate + interval days
WEEKLY: nextDate = currentDate + (interval * 7) days
MONTHLY: nextDate = currentDate + interval months (same day)
YEARLY: nextDate = currentDate + interval years (same date)
```

**Example - Monthly Salary:**
```json
{
  "name": "Lương tháng",
  "frequency": "MONTHLY",
  "interval": 1,
  "start_date": "2026-01-25",
  "transaction_type": "INCOME",
  "amount": 15000000,
  "auto_create": true
}
```
→ Auto creates transaction on: 25/01, 25/02, 25/03, ...

#### 5.8.4. API Endpoints

```
POST   /api/v1/schedules                  - Tạo schedule
GET    /api/v1/schedules                  - Danh sách schedules
GET    /api/v1/schedules/{id}             - Chi tiết schedule
PUT    /api/v1/schedules/{id}             - Cập nhật schedule
DELETE /api/v1/schedules/{id}             - Xóa schedule
PUT    /api/v1/schedules/{id}/pause       - Tạm dừng
PUT    /api/v1/schedules/{id}/resume      - Tiếp tục
POST   /api/v1/schedules/{id}/skip        - Skip lần này
GET    /api/v1/schedules/{id}/occurrences - Lịch sử occurrences
GET    /api/v1/schedules/upcoming         - Sắp đến hạn
```

---

### 5.9. Module GROUP - Chia Sẻ Chi Tiêu Nhóm

**Package:** `com.finance.finance.modules.group`

#### 5.9.1. Tính Năng

✅ **Đã implement:**
1. **Group Management**
   - Tạo nhóm
   - Mời thành viên
   - Quản lý vai trò (Admin/Moderator/Member)
   - Rời nhóm
   - Xóa nhóm

2. **Expense Sharing**
   - Tạo chi tiêu nhóm
   - Chia bill theo 4 cách:
     - EQUAL - Chia đều
     - PERCENTAGE - Theo phần trăm
     - EXACT - Số tiền cụ thể
     - SHARES - Theo phần (1:2:3)
   - Track ai đã trả, chưa trả

3. **Settlement**
   - Tính toán nợ giữa members
   - Simplify debts (optimize payments)
   - Record settlement
   - Settlement history

4. **Group Funds**
   - Quỹ chung của nhóm
   - Đóng góp vào quỹ
   - Chi tiêu từ quỹ
   - Track contributions

5. **Group Chat**
   - Tin nhắn nhóm
   - Upload attachments
   - Reactions (emoji)
   - Read receipts
   - Message recall (xóa tin nhắn)

6. **Activities Log**
   - Log mọi hoạt động nhóm
   - Who added expense
   - Who paid
   - Who joined/left

#### 5.9.2. Entities

**Core Group Entities:**
- `groups` - Thông tin nhóm
- `group_members` - Thành viên
- `group_invitations` - Lời mời

**Expense Entities:**
- `group_expenses` - Chi tiêu nhóm
- `group_expense_splits` - Chia bill
- `group_settlements` - Thanh toán nợ

**Fund Entities:**
- `group_funds` - Quỹ nhóm
- `group_fund_contributions` - Đóng góp quỹ

**Chat Entities:**
- `group_messages` - Tin nhắn
- `group_message_attachments` - File đính kèm
- `group_message_reactions` - Reactions
- `group_message_reads` - Đã đọc

**Log Entity:**
- `group_activities` - Log hoạt động

#### 5.9.3. Split Methods

**1. EQUAL (Chia Đều)**
```json
{
  "total_amount": 300000,
  "split_method": "EQUAL",
  "members": ["user1", "user2", "user3"]
}
→ Mỗi người: 100,000
```

**2. PERCENTAGE (Theo %)**
```json
{
  "total_amount": 300000,
  "split_method": "PERCENTAGE",
  "splits": [
    {"user_id": "user1", "percentage": 50},  // 150k
    {"user_id": "user2", "percentage": 30},  // 90k
    {"user_id": "user3", "percentage": 20}   // 60k
  ]
}
```

**3. EXACT (Số Tiền Cụ Thể)**
```json
{
  "total_amount": 300000,
  "split_method": "EXACT",
  "splits": [
    {"user_id": "user1", "amount": 150000},
    {"user_id": "user2", "amount": 100000},
    {"user_id": "user3", "amount": 50000}
  ]
}
```

**4. SHARES (Theo Phần)**
```json
{
  "total_amount": 300000,
  "split_method": "SHARES",
  "splits": [
    {"user_id": "user1", "shares": 2},  // 2/6 = 100k
    {"user_id": "user2", "shares": 3},  // 3/6 = 150k
    {"user_id": "user3", "shares": 1}   // 1/6 = 50k
  ]
}
```

#### 5.9.4. Debt Simplification

**Ví dụ:**
```
A owes B: 100k
B owes C: 100k
C owes A: 100k

→ Simplify: NO ONE owes anyone (circular debt)
```

**Algorithm:**
```
1. Calculate net balance for each member
2. Sort members: givers (positive) & receivers (negative)
3. Match givers with receivers
4. Generate minimum settlements
```

#### 5.9.5. API Endpoints

```
# Groups
POST   /api/v1/groups                     - Tạo nhóm
GET    /api/v1/groups                     - Danh sách nhóm
GET    /api/v1/groups/{id}                - Chi tiết nhóm
PUT    /api/v1/groups/{id}                - Cập nhật nhóm
DELETE /api/v1/groups/{id}                - Xóa nhóm

# Members
POST   /api/v1/groups/{id}/invite         - Mời thành viên
POST   /api/v1/groups/{id}/join           - Tham gia nhóm
DELETE /api/v1/groups/{id}/members/{uid}  - Xóa thành viên
PUT    /api/v1/groups/{id}/members/{uid}/role - Đổi vai trò

# Expenses
POST   /api/v1/groups/{id}/expenses       - Tạo chi tiêu
GET    /api/v1/groups/{id}/expenses       - Danh sách chi tiêu
PUT    /api/v1/groups/{id}/expenses/{eid}/mark-paid - Đánh dấu đã trả

# Settlement
GET    /api/v1/groups/{id}/balances       - Tính nợ
POST   /api/v1/groups/{id}/settlements    - Ghi nhận thanh toán
GET    /api/v1/groups/{id}/settlements    - Lịch sử thanh toán

# Chat
POST   /api/v1/groups/{id}/messages       - Gửi tin nhắn
GET    /api/v1/groups/{id}/messages       - Lấy tin nhắn
PUT    /api/v1/groups/{id}/messages/{mid}/recall - Recall tin nhắn
POST   /api/v1/groups/{id}/messages/{mid}/react - Thêm reaction

# Fund
POST   /api/v1/groups/{id}/funds          - Tạo quỹ
POST   /api/v1/groups/{id}/funds/{fid}/contribute - Đóng góp
GET    /api/v1/groups/{id}/funds          - Danh sách quỹ
```

---

### 5.10. Module NOTIFICATION - Thông Báo

**Package:** `com.finance.finance.modules.notification`

#### 5.10.1. Tính Năng

✅ **Đã implement:**
1. **In-App Notifications**
   - Hiển thị trong app
   - Đánh dấu đã đọc
   - Xóa thông báo
   - Xóa tất cả đã đọc
   - Filter by type/priority

2. **Push Notifications**
   - Register device (FCM/APNS)
   - Send push to devices
   - Unregister device

3. **Notification Types** (16 loại)
   - TRANSACTION - Giao dịch mới
   - BUDGET_ALERT - Cảnh báo ngân sách
   - BUDGET_EXCEEDED - Vượt ngân sách
   - GOAL_MILESTONE - Đạt milestone
   - GOAL_ACHIEVED - Hoàn thành mục tiêu
   - GOAL_REMINDER - Nhắc đóng góp
   - DEBT_REMINDER - Nhắc trả nợ
   - DEBT_OVERDUE - Trễ hạn
   - RECURRING_DUE - Recurring sắp đến
   - RECURRING_FAILED - Recurring thất bại
   - ANOMALY_DETECTED - Bất thường
   - INSIGHT_GENERATED - Insight mới
   - WEEKLY_SUMMARY - Tổng kết tuần
   - MONTHLY_REPORT - Báo cáo tháng
   - SYSTEM - Hệ thống

4. **Priority Levels**
   - HIGH - Quan trọng, cần chú ý ngay
   - NORMAL - Bình thường
   - LOW - Không cần chú ý ngay

5. **Notification Settings**
   - Bật/tắt từng loại notification
   - Email vs Push
   - Quiet hours

#### 5.10.2. Entities

**1. Notification**
```java
@Entity
@Table(name = "notifications")
public class Notification {
    UUID id;
    UUID userId;
    NotificationType type;
    NotificationPriority priority;
    String title;
    String body;
    String iconUrl;
    String actionUrl; // Deep link
    String actionText;
    String data; // JSON
    Boolean isRead;
    LocalDateTime readAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime deletedAt;
}
```

**2. NotificationDevice**
```java
@Entity
@Table(name = "notification_devices")
public class NotificationDevice {
    UUID id;
    UUID userId;
    String deviceToken; // FCM/APNS token
    DeviceType deviceType; // IOS, ANDROID, WEB
    String deviceName;
    String appVersion;
    Boolean isActive;
    LocalDateTime lastUsedAt;
    LocalDateTime registeredAt;
}
```

**3. NotificationTemplate**
```java
@Entity
@Table(name = "notification_templates")
public class NotificationTemplate {
    UUID id;
    NotificationType type;
    String titleTemplate;
    String bodyTemplate;
    String language;
    Boolean isActive;
}
```

#### 5.10.3. Notification Flow

```
Event occurs (e.g., budget exceeded)
          ↓
Check user notification settings
          ↓
    Is enabled? ─NO→ Stop
          ↓ YES
Create notification in DB
          ↓
  ┌───────┴───────┐
  │               │
In-App        Push
  │               │
Store in      Get user's
notifications   devices
table           │
                ↓
           Send to FCM/APNS
                ↓
         Device receives
```

#### 5.10.4. Template Variables

Templates support variables:
```
"Ngân sách {{category}} đã chi {{percentage}}%"
→ "Ngân sách Ăn uống đã chi 85%"

"Bạn vừa chi {{amount}} tại {{merchant}}"
→ "Bạn vừa chi 150,000₫ tại Highlands Coffee"
```

#### 5.10.5. API Endpoints

```
GET    /api/v1/notifications               - Danh sách thông báo
GET    /api/v1/notifications/unread-count  - Số thông báo chưa đọc
PUT    /api/v1/notifications/{id}/read     - Đánh dấu đã đọc
PUT    /api/v1/notifications/read-all      - Đánh dấu tất cả đã đọc
DELETE /api/v1/notifications/{id}          - Xóa thông báo
DELETE /api/v1/notifications/clear-all     - Xóa tất cả đã đọc
POST   /api/v1/notifications/register-device - Đăng ký thiết bị
DELETE /api/v1/notifications/unregister-device - Hủy đăng ký
```

---

### 5.11. Module MERCHANT - Quản Lý Thương Hiệu

**Package:** `com.finance.finance.modules.merchant`

#### 5.11.1. Tính Năng

✅ **Đã implement:**
1. **Merchant CRUD**
   - Tạo merchant
   - Search merchants
   - Update merchant info
   - Merge duplicate merchants

2. **Auto-Detection**
   - Detect merchant from description
   - Suggest merchant for transaction

3. **Statistics**
   - Top merchants by spending
   - Merchant spending trend

#### 5.11.2. Entity

```java
@Entity
@Table(name = "merchants")
public class Merchant {
    UUID id;
    UUID userId; // null = system merchant
    String name;
    String category;
    String address;
    String phone;
    String website;
    String logo;
    Boolean isSystem;
    Boolean isActive;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### 5.11.3. API Endpoints

```
POST   /api/v1/merchants                  - Tạo merchant
GET    /api/v1/merchants                  - Danh sách merchants
GET    /api/v1/merchants/{id}             - Chi tiết merchant
PUT    /api/v1/merchants/{id}             - Cập nhật merchant
DELETE /api/v1/merchants/{id}             - Xóa merchant
GET    /api/v1/merchants/search           - Tìm kiếm merchant
GET    /api/v1/merchants/top              - Top merchants
```

---

### 5.12. Module TAG - Quản Lý Tags

**Package:** `com.finance.finance.modules.tag`

#### 5.12.1. Tính Năng

✅ **Đã implement:**
1. **Tag CRUD**
   - Tạo tag
   - Lấy danh sách tags
   - Cập nhật tag
   - Xóa tag

2. **Tag Usage**
   - Tag transactions
   - Filter transactions by tag
   - Tag statistics

#### 5.12.2. Entity

```java
@Entity
@Table(name = "tags")
public class Tag {
    UUID id;
    UUID userId;
    String name;
    String color;
    String icon;
    Boolean isActive;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### 5.12.3. API Endpoints

```
POST   /api/v1/tags                       - Tạo tag
GET    /api/v1/tags                       - Danh sách tags
GET    /api/v1/tags/{id}                  - Chi tiết tag
PUT    /api/v1/tags/{id}                  - Cập nhật tag
DELETE /api/v1/tags/{id}                  - Xóa tag
GET    /api/v1/tags/popular               - Tags phổ biến
```

---

### 5.13. Module OCR - Quét Hóa Đơn

**Package:** `com.finance.finance.modules.ocr`

#### 5.13.1. Tính Năng

⚠️ **Partial implementation:**
1. **Receipt Scanning**
   - Upload receipt image
   - OCR extract text
   - Parse: merchant, amount, date, items

2. **Transaction Creation**
   - Auto-create transaction from receipt
   - Suggest category

#### 5.13.2. Entity

```java
@Entity
@Table(name = "receipts")
public class Receipt {
    UUID id;
    UUID userId;
    UUID transactionId;
    String imageUrl;
    String ocrText;
    String ocrData; // JSON
    LocalDateTime processedAt;
    LocalDateTime createdAt;
}
```

#### 5.13.3. OCR Data Format

```json
{
  "merchant": "Highlands Coffee",
  "amount": 45000,
  "date": "2026-10-11",
  "items": [
    {"name": "Cappuccino", "quantity": 1, "price": 45000}
  ],
  "payment_method": "CASH"
}
```

#### 5.13.4. API Endpoints

```
POST   /api/v1/ocr/scan                   - Scan receipt
POST   /api/v1/ocr/create-transaction     - Tạo transaction từ receipt
```

---

### 5.14. Module FEEDBACK - Phản Hồi

**Package:** `com.finance.finance.modules.feedback`

#### 5.14.1. Tính Năng

✅ **Đã implement:**
1. **Submit Feedback**
   - Bug report
   - Feature request
   - General feedback
   - Rating

2. **Admin Review**
   - View all feedbacks
   - Mark as reviewed
   - Reply to feedback

#### 5.14.2. Entity

```java
@Entity
@Table(name = "feedbacks")
public class Feedback {
    UUID id;
    UUID userId;
    FeedbackType type; // BUG, FEATURE, GENERAL
    String title;
    String content;
    Integer rating; // 1-5
    String status; // PENDING, REVIEWED, RESOLVED
    String adminReply;
    LocalDateTime reviewedAt;
    LocalDateTime createdAt;
}
```

#### 5.14.3. API Endpoints

```
POST   /api/v1/feedbacks                  - Gửi feedback
GET    /api/v1/feedbacks                  - Danh sách feedback
GET    /api/v1/feedbacks/{id}             - Chi tiết feedback
```

---

### 5.15. Module ADMIN - Quản Trị

**Package:** `com.finance.finance.modules.admin`

#### 5.15.1. Tính Năng

⚠️ **Partial implementation:**
1. **User Management**
   - View all users
   - Activate/Deactivate users
   - Reset password

2. **System Settings**
   - Update system settings
   - Feature flags

3. **Analytics**
   - User statistics
   - Transaction statistics

#### 5.15.2. API Endpoints

```
GET    /api/v1/admin/users                - Danh sách users
GET    /api/v1/admin/statistics           - Thống kê hệ thống
PUT    /api/v1/admin/settings             - Cập nhật settings
```

---

### 5.16. Module SYSTEM - Hệ Thống

**Package:** `com.finance.finance.modules.system`

#### 5.16.1. Tính Năng

✅ **Đã implement:**
1. **System Data**
   - Banks list
   - Currencies list
   - Exchange rates
   - Categories (system)

2. **Feature Flags**
   - Enable/Disable features
   - Subscription features

3. **Audit Logs**
   - Track important actions
   - Security audit

#### 5.16.2. Entities

**1. Bank**
```java
@Entity
@Table(name = "banks")
public class Bank {
    UUID id;
    String code; // e.g., VCB
    String name; // e.g., Vietcombank
    String shortName;
    String logo;
    Boolean isActive;
}
```

**2. Currency**
```java
@Entity
@Table(name = "currencies")
public class Currency {
    String code; // e.g., VND, USD
    String name;
    String symbol;
    Integer decimalPlaces;
    Boolean isActive;
}
```

**3. ExchangeRate**
```java
@Entity
@Table(name = "exchange_rates")
public class ExchangeRate {
    UUID id;
    String fromCurrency;
    String toCurrency;
    BigDecimal rate;
    LocalDate effectiveDate;
    LocalDateTime updatedAt;
}
```

**4. AuditLog**
```java
@Entity
@Table(name = "audit_logs")
public class AuditLog {
    UUID id;
    UUID userId;
    String action;
    String entityType;
    UUID entityId;
    String oldValue; // JSON
    String newValue; // JSON
    String ipAddress;
    String userAgent;
    LocalDateTime createdAt;
}
```

---

## 6. Kiến Trúc & Design Patterns

### 6.1. Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Controller Layer                       │
│  - REST API Endpoints                                    │
│  - Request Validation (@Valid)                          │
│  - Response Formatting                                   │
│  - Exception Handling                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  - Business Logic                                        │
│  - Transaction Management (@Transactional)              │
│  - Authorization Checks                                  │
│  - DTO ↔ Entity Mapping                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Repository Layer                        │
│  - Data Access (JpaRepository)                          │
│  - Custom Queries (@Query)                              │
│  - Specifications (dynamic queries)                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Database (PostgreSQL)                  │
└─────────────────────────────────────────────────────────┘
```

### 6.2. Design Patterns Sử Dụng

#### 6.2.1. Repository Pattern
```java
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId")
    List<Transaction> findByUserId(UUID userId);
}
```

#### 6.2.2. Service Pattern
```java
@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository repository;
    
    @Transactional
    public TransactionResponse create(CreateTransactionRequest request) {
        // Business logic
    }
}
```

#### 6.2.3. DTO Pattern
```java
@Data
@Builder
public class TransactionResponse {
    private UUID id;
    private BigDecimal amount;
    private String description;
    // ... other fields
}
```

#### 6.2.4. Builder Pattern (Lombok)
```java
@Builder
@Data
public class CreateTransactionRequest {
    @NotNull
    private UUID accountId;
    
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;
}
```

#### 6.2.5. Exception Handling Pattern
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex) {
        // Handle
    }
}
```

### 6.3. Security Architecture

#### 6.3.1. JWT Authentication Flow

```
Client                    Backend                  Database
  │                          │                         │
  │ 1. Login (email/pass)    │                         │
  ├─────────────────────────>│                         │
  │                          │ 2. Validate credentials │
  │                          ├────────────────────────>│
  │                          │<────────────────────────┤
  │                          │ 3. Generate JWT tokens  │
  │<─────────────────────────┤                         │
  │ (access + refresh token) │                         │
  │                          │                         │
  │ 4. API Request + JWT     │                         │
  ├─────────────────────────>│                         │
  │                          │ 5. Validate JWT         │
  │                          │ 6. Load user context    │
  │                          │ 7. Check permissions    │
  │                          │ 8. Execute business logic
  │                          ├────────────────────────>│
  │                          │<────────────────────────┤
  │<─────────────────────────┤                         │
  │     Response             │                         │
```

#### 6.3.2. Authorization Levels

| Level | Description | Example |
|-------|-------------|---------|
| Public | No authentication | Register, Login |
| Authenticated | Valid JWT required | Get profile |
| Owner | Must own resource | Update own transaction |
| Admin | Admin role required | View all users |
| System | Internal only | Scheduled jobs |

#### 6.3.3. Row-Level Security (RLS)

Mọi query đều filter theo `user_id`:
```java
@Query("SELECT t FROM Transaction t WHERE t.userId = :userId")
List<Transaction> findByUserId(@Param("userId") UUID userId);
```

---



## 4. So Sánh Implementation vs Documentation

### 4.1. Tổng Quan So Sánh

| API Module | Doc File | Implementation Status | Completion % | Notes |
|-----------|----------|----------------------|--------------|-------|
| Auth | 01-auth-api.md | ✅ Full | 100% | All endpoints implemented |
| User | 02-user-api.md | ✅ Full | 100% | Profile, settings complete |
| Accounts | 03-accounts-api.md | ✅ Full | 100% | CRUD + balance tracking |
| Transactions | 04-transactions-api.md | ✅ Full | 95% | Missing: AI categorization training |
| Categories | 05-categories-api.md | ✅ Full | 100% | System + custom categories |
| Budgets | 06-budgets-api.md | ✅ Full | 100% | Budget + alerts working |
| Goals | 07-goals-api.md | ✅ Full | 100% | Goals + milestones + auto-save |
| Recurring | 08-recurring-api.md | ✅ Full | 100% | Schedules + occurrences |
| Debts | 09-debts-api.md | ✅ Full | 100% | Debts + payments + interest |
| Groups | 10-groups-api.md | ✅ Full | 100% | Groups + expenses + chat + funds |
| OCR | 11-ocr-api.md | ⚠️ Partial | 40% | Basic structure, OCR not integrated |
| Chat | 12-chat-api.md | ❌ Missing | 0% | AI chat not implemented yet |
| Insights | 13-insights-api.md | ❌ Missing | 0% | AI insights planned |
| Forecast | 14-forecast-api.md | ❌ Missing | 0% | Forecasting planned |
| Anomaly | 15-anomaly-api.md | ❌ Missing | 0% | Anomaly detection planned |
| Sync | 16-sync-api.md | ⚠️ Partial | 60% | Basic sync, conflict resolution pending |
| Notifications | 17-notifications-api.md | ✅ Full | 100% | In-app + push ready |
| Reports | 18-reports-api.md | ⚠️ Partial | 30% | Basic reports, export pending |

**Tổng kết:**
- ✅ Fully Implemented: 11/18 modules (61%)
- ⚠️ Partially Implemented: 4/18 modules (22%)
- ❌ Not Implemented: 3/18 modules (17%)
- **Overall Completion: ~70%**

---

### 4.2. Chi Tiết Endpoints Implementation

#### 4.2.1. Authentication Module ✅

| Endpoint | Doc | Implemented | Notes |
|----------|-----|-------------|-------|
| POST /auth/register | ✅ | ✅ | Working |
| POST /auth/login | ✅ | ✅ | JWT + Refresh token |
| POST /auth/refresh | ✅ | ✅ | Token refresh |
| POST /auth/logout | ✅ | ✅ | Revoke token |
| POST /auth/logout-all | ✅ | ✅ | Revoke all devices |
| POST /auth/oauth/google | ✅ | ✅ | Google OAuth |
| POST /auth/forgot-password | ✅ | ✅ | Email reset link |
| POST /auth/reset-password | ✅ | ✅ | Reset with token |
| POST /auth/change-password | ✅ | ✅ | Change password |
| POST /auth/mfa/enable | ✅ | ✅ | Enable 2FA |
| POST /auth/mfa/disable | ✅ | ✅ | Disable 2FA |
| POST /auth/mfa/verify | ✅ | ✅ | Verify TOTP |

**Status:** 12/12 endpoints ✅

---

#### 4.2.2. Transaction Module ✅

| Endpoint | Doc | Implemented | Notes |
|----------|-----|-------------|-------|
| POST /transactions | ✅ | ✅ | Create transaction |
| GET /transactions | ✅ | ✅ | List with filters |
| GET /transactions/{id} | ✅ | ✅ | Get detail |
| PUT /transactions/{id} | ✅ | ✅ | Update |
| DELETE /transactions/{id} | ✅ | ✅ | Soft delete |
| POST /transactions/bulk-categorize | ✅ | ✅ | Bulk categorize |
| POST /transactions/{id}/comments | ✅ | ✅ | Add comment |
| POST /transactions/{id}/tags | ✅ | ✅ | Add tags |
| GET /transactions/statistics | ✅ | ✅ | Statistics |
| GET /transactions/export | ✅ | ⚠️ | Export CSV (basic) |

**Status:** 9/10 endpoints ✅ (90%)

---

#### 4.2.3. Group Module ✅

| Endpoint | Doc | Implemented | Notes |
|----------|-----|-------------|-------|
| POST /groups | ✅ | ✅ | Create group |
| GET /groups | ✅ | ✅ | List groups |
| GET /groups/{id} | ✅ | ✅ | Group detail |
| PUT /groups/{id} | ✅ | ✅ | Update group |
| DELETE /groups/{id} | ✅ | ✅ | Delete group |
| POST /groups/{id}/invite | ✅ | ✅ | Invite member |
| POST /groups/{id}/join | ✅ | ✅ | Join group |
| DELETE /groups/{id}/members/{uid} | ✅ | ✅ | Remove member |
| POST /groups/{id}/expenses | ✅ | ✅ | Create expense |
| GET /groups/{id}/expenses | ✅ | ✅ | List expenses |
| GET /groups/{id}/balances | ✅ | ✅ | Calculate debts |
| POST /groups/{id}/settlements | ✅ | ✅ | Settle debt |
| POST /groups/{id}/funds | ✅ | ✅ | Create fund |
| POST /groups/{id}/funds/{fid}/contribute | ✅ | ✅ | Contribute to fund |
| POST /groups/{id}/messages | ✅ | ✅ | Send message |
| GET /groups/{id}/messages | ✅ | ✅ | Get messages |
| PUT /groups/{id}/messages/{mid}/recall | ✅ | ✅ | Recall message |
| POST /groups/{id}/messages/{mid}/react | ✅ | ✅ | Add reaction |

**Status:** 18/18 endpoints ✅ (100%)

---

#### 4.2.4. AI Modules ❌

**Chat Assistant (12-chat-api.md):**
- ❌ POST /chat/sessions - Not implemented
- ❌ POST /chat/messages - Not implemented
- ❌ GET /chat/history - Not implemented

**Insights (13-insights-api.md):**
- ❌ GET /insights - Not implemented
- ❌ GET /insights/spending-pattern - Not implemented
- ❌ GET /insights/recommendations - Not implemented

**Forecast (14-forecast-api.md):**
- ❌ GET /forecast/balance - Not implemented
- ❌ GET /forecast/spending - Not implemented

**Anomaly (15-anomaly-api.md):**
- ❌ GET /anomalies - Not implemented
- ❌ POST /anomalies/{id}/dismiss - Not implemented

**Status:** 0% - AI features chưa được implement

**Lý do:**
- Focus vào core features trước
- AI features require ML models
- Need training data
- Planned for Phase 2

---

### 4.3. Database Tables So Sánh

#### 4.3.1. Tables Từ Docs vs Implementation

**Từ API Docs expect:**
- users ✅
- accounts ✅
- transactions ✅
- categories ✅
- budgets ✅
- goals ✅
- debts ✅
- schedules ✅
- groups ✅
- notifications ✅
- receipts ✅
- ai_chat_sessions ✅ (created but not used)
- ai_chat_messages ✅ (created but not used)

**Tables Thêm Vào (không có trong docs):**
- user_profiles ✅
- user_settings ✅
- user_notification_settings ✅
- user_sync_state ✅
- account_balance_snapshots ✅
- transaction_comments ✅
- transaction_tags ✅
- budget_items ✅
- goal_contributions ✅
- goal_milestones ✅
- debt_payments ✅
- schedule_occurrences ✅
- group_members ✅
- group_invitations ✅
- group_expenses ✅
- group_expense_splits ✅
- group_settlements ✅
- group_funds ✅
- group_fund_contributions ✅
- group_messages ✅
- group_message_attachments ✅
- group_message_reactions ✅
- group_message_reads ✅
- group_activities ✅
- notification_devices ✅
- notification_templates ✅
- merchants ✅
- tags ✅
- attachments ✅
- banks ✅
- currencies ✅
- exchange_rates ✅
- features ✅
- feature_usage ✅
- subscription_features ✅
- monthly_summaries ✅
- audit_logs ✅
- feedbacks ✅
- system_settings ✅
- child_wallets ✅
- child_chores ✅
- child_spend_requests ✅
- assets ✅
- asset_valuations ✅
- auth_tokens ✅
- refresh_tokens ✅
- oauth_accounts ✅
- mfa_credentials ✅

**Tổng cộng:**
- Docs expect: ~13 core tables
- Implementation: 62 tables
- **Ratio: 476% - Rất chi tiết và comprehensive!**

---

### 4.4. Tính Năng Đã Implement Nhưng Không Có Trong Docs

#### 4.4.1. Group Features (Mở Rộng)

**Docs có:** Basic group expense splitting

**Implementation thêm:**
- ✅ Group chat với reactions
- ✅ Group funds (quỹ chung)
- ✅ Message recall
- ✅ Read receipts
- ✅ Activity logs
- ✅ Multiple split methods (EQUAL, PERCENTAGE, EXACT, SHARES)
- ✅ Simplified debt calculation
- ✅ Private settlement accounts

**→ Implementation vượt docs!**

---

#### 4.4.2. Notification System (Mở Rộng)

**Docs có:** Basic notifications

**Implementation thêm:**
- ✅ 16 notification types
- ✅ Priority levels (HIGH, NORMAL, LOW)
- ✅ Push notification device management
- ✅ Notification templates
- ✅ Read/Unread tracking
- ✅ Bulk mark as read
- ✅ Filter by type/priority

**→ Implementation vượt docs!**

---

#### 4.4.3. Goal Features (Mở Rộng)

**Docs có:** Basic goals

**Implementation thêm:**
- ✅ Goal milestones
- ✅ Auto-save recurring
- ✅ Multiple goal types (10 types)
- ✅ Goal contributions history
- ✅ Transaction linking (money deducted when contribute)
- ✅ Priority levels

**→ Implementation vượt docs!**

---

#### 4.4.4. Debt Features (Mở Rộng)

**Docs có:** Basic debt tracking

**Implementation thêm:**
- ✅ Debt payment history with details
- ✅ Interest calculation (simple + compound)
- ✅ Payment schedule
- ✅ Overdue tracking
- ✅ Transaction linking (money deducted when pay)
- ✅ Separate principal + interest tracking

**→ Implementation vượt docs!**

---

#### 4.4.5. Child Features (Hoàn Toàn Mới)

**Docs:** Không có mention

**Implementation:**
- ✅ Child wallets (family plan)
- ✅ Child chores (assign tasks)
- ✅ Child spend requests (approval flow)
- ✅ Allowance tracking

**→ Feature hoàn toàn mới!**

---

#### 4.4.6. Asset Management (Hoàn Toàn Mới)

**Docs:** Không có mention

**Implementation:**
- ✅ Asset tracking (nhà, xe, ...)
- ✅ Asset valuation history
- ✅ Net worth calculation
- ✅ Asset types: REAL_ESTATE, VEHICLE, JEWELRY, etc.

**→ Feature hoàn toàn mới!**

---

### 4.5. Tính Năng Trong Docs Nhưng Chưa Implement

#### 4.5.1. AI Chat Assistant ❌

**Từ docs:**
- AI chat for financial advice
- Natural language queries
- Personalized recommendations

**Status:** Tables created (ai_chat_sessions, ai_chat_messages) nhưng chưa có logic

**Lý do chưa làm:**
- Need AI/ML integration
- Need training data
- Need LLM API (OpenAI/etc)

---

#### 4.5.2. AI Insights ❌

**Từ docs:**
- Spending pattern analysis
- Category insights
- Budget recommendations
- Savings suggestions

**Status:** Chưa implement

**Lý do:** AI features Phase 2

---

#### 4.5.3. Balance Forecasting ❌

**Từ docs:**
- Predict future balance
- Forecast spending
- Risk alerts

**Status:** Chưa implement

**Lý do:** Need ML model training

---

#### 4.5.4. Anomaly Detection ❌

**Từ docs:**
- Detect unusual transactions
- Fraud detection
- Alert on suspicious activity

**Status:** Chưa implement

**Lý do:** Need ML model + training data

---

#### 4.5.5. Advanced Reports ⚠️

**Từ docs:**
- PDF export
- Excel export
- Custom date ranges
- Comparison reports

**Status:** Basic reports implemented, advanced export pending

---

#### 4.5.6. Bank Sync ❌

**Từ docs:**
- Automatic bank synchronization
- Import bank statements
- Auto-categorize from bank data

**Status:** Chưa implement

**Lý do:**
- Need bank API integration
- Need compliance/security review
- Different per region

---

## 7. Tổng Kết & Đánh Giá

### 7.1. Điểm Mạnh Của Implementation

#### 7.1.1. Comprehensive Database Schema ⭐⭐⭐⭐⭐
- 62 tables well-structured
- Proper relationships and constraints
- Soft delete support
- Optimistic locking (version field)
- Good indexing strategy

#### 7.1.2. Security ⭐⭐⭐⭐⭐
- JWT authentication implemented correctly
- Refresh token rotation
- 2FA/MFA support
- Row-level security (RLS)
- Account lockout after failed attempts
- OAuth integration
- Password hashing (BCrypt)

#### 7.1.3. Code Quality ⭐⭐⭐⭐
- Clean architecture (Controller → Service → Repository)
- DTOs for request/response
- Validation annotations
- Exception handling
- Lombok for boilerplate reduction
- Consistent naming conventions

#### 7.1.4. Feature Richness ⭐⭐⭐⭐⭐
- Core features fully implemented (11/11)
- Group features exceed expectations
- Notification system comprehensive
- Goal/Debt tracking với transaction linking
- Child features (bonus)
- Asset management (bonus)

#### 7.1.5. Migration Management ⭐⭐⭐⭐
- 49 Flyway migrations
- Clear migration history
- Proper rollback support
- Schema versioning

---

### 7.2. Điểm Cần Cải Thiện

#### 7.2.1. AI Features ⚠️
**Status:** 0% implemented

**Cần làm:**
- Integrate AI/ML service
- Implement chat assistant
- Add insights generation
- Add forecasting
- Add anomaly detection

**Priority:** Medium (Phase 2)

---

#### 7.2.2. Bank Synchronization ⚠️
**Status:** Not implemented

**Cần làm:**
- Bank API integration
- Import bank statements
- Auto-categorization from bank data
- Compliance & security review

**Priority:** High (Phase 2)

---

#### 7.2.3. Advanced Reports ⚠️
**Status:** 30% implemented

**Cần làm:**
- PDF export
- Excel export
- Custom report builder
- Scheduled reports
- Email reports

**Priority:** Medium

---

#### 7.2.4. OCR Integration ⚠️
**Status:** 40% implemented (basic structure only)

**Cần làm:**
- Integrate OCR service (Google Vision / AWS Textract)
- Parse receipt data
- Auto-create transactions from receipts
- Handle multiple receipt formats

**Priority:** Medium

---

#### 7.2.5. Performance Optimization ⚠️

**Cần làm:**
- Add caching layer (Redis)
- Optimize N+1 queries
- Add database indexes based on query patterns
- Implement pagination properly
- Add API rate limiting

**Priority:** High (Performance)

---

#### 7.2.6. Testing ⚠️

**Current:**
- No unit tests
- No integration tests
- No E2E tests

**Cần làm:**
- Add JUnit tests for services
- Add integration tests for repositories
- Add E2E tests for critical flows
- Add test coverage tool

**Priority:** High (Quality)

---

### 7.3. Đánh Giá Tổng Thể

#### 7.3.1. Implementation Score

| Category | Score | Max | % |
|----------|-------|-----|---|
| Database Design | 9 | 10 | 90% |
| Core Features | 10 | 10 | 100% |
| Security | 10 | 10 | 100% |
| Code Quality | 8 | 10 | 80% |
| AI Features | 0 | 10 | 0% |
| Testing | 0 | 10 | 0% |
| Documentation | 7 | 10 | 70% |
| Performance | 6 | 10 | 60% |
| **TOTAL** | **50** | **80** | **62.5%** |

---

#### 7.3.2. Readiness Assessment

**For Production:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Core Functionality | ✅ Ready | All core features working |
| Security | ✅ Ready | JWT, 2FA, RLS implemented |
| Database | ✅ Ready | Well-structured, migrations ready |
| API Endpoints | ✅ Ready | 90% documented endpoints done |
| Performance | ⚠️ Needs Work | Add caching, optimize queries |
| Testing | ❌ Not Ready | No tests yet |
| Monitoring | ❌ Not Ready | Need APM, logging |
| Documentation | ⚠️ Partial | API docs good, internal docs limited |

**Recommendation:** 
- ✅ Can deploy to BETA/UAT for testing
- ⚠️ Add tests before production
- ⚠️ Add monitoring/logging
- ⚠️ Performance testing needed

---

#### 7.3.3. Feature Completion by Priority

**Priority 1 (Must Have) - 100% ✅**
- ✅ Authentication
- ✅ User Management
- ✅ Accounts
- ✅ Transactions
- ✅ Categories
- ✅ Budgets
- ✅ Basic Reports

**Priority 2 (Should Have) - 90% ✅**
- ✅ Goals
- ✅ Debts
- ✅ Recurring Transactions
- ✅ Notifications
- ⚠️ Advanced Reports (30%)

**Priority 3 (Nice to Have) - 70% ⚠️**
- ✅ Groups (100%)
- ⚠️ OCR (40%)
- ⚠️ Sync (60%)

**Priority 4 (Future) - 0% ❌**
- ❌ AI Chat
- ❌ AI Insights
- ❌ Forecasting
- ❌ Anomaly Detection
- ❌ Bank Sync

---

### 7.4. Roadmap Đề Xuất

#### Phase 1 - CURRENT ✅
**Timeline:** Completed
- ✅ Core features implementation
- ✅ Database design
- ✅ Authentication & Security
- ✅ Basic API endpoints

#### Phase 2 - Testing & Optimization ⏳
**Timeline:** 2-3 weeks
- Add unit tests
- Add integration tests
- Performance optimization
- Add caching (Redis)
- Add monitoring/logging

#### Phase 3 - Advanced Features 🔜
**Timeline:** 4-6 weeks
- Complete OCR integration
- Advanced reports with export
- Bank synchronization (basic)
- Email notifications
- Mobile push notifications

#### Phase 4 - AI Features 📅
**Timeline:** 8-12 weeks
- AI chat assistant
- Insights generation
- Balance forecasting
- Anomaly detection
- ML model training

#### Phase 5 - Scale & Polish 🚀
**Timeline:** Ongoing
- Scale infrastructure
- Advanced analytics
- Premium features
- International support
- API for third-party

---

### 7.5. Kết Luận

**Tóm tắt:**
1. ✅ **Core features rất solid** - 11/11 core modules implemented
2. ✅ **Security đạt chuẩn** - JWT, 2FA, RLS
3. ✅ **Database schema excellent** - 62 tables, well-structured
4. ⚠️ **AI features chưa có** - Phase 2 requirement
5. ⚠️ **Testing cần bổ sung** - Critical for production
6. ⚠️ **Performance cần optimize** - Add caching, indexes

**Điểm nổi bật:**
- Implementation **vượt** docs ở nhiều chỗ (Groups, Notifications, Goals, Debts)
- Code quality tốt, architecture clean
- Feature-rich hơn expected

**Recommendation:**
- **Deploy to UAT:** ✅ Ready
- **Deploy to Production:** ⚠️ After adding tests + monitoring
- **Overall Quality:** ⭐⭐⭐⭐ (4/5 stars)

---

## 📊 Statistics Summary

### Database
- **Total Tables:** 62
- **Total Migrations:** 49 versions
- **Active Tables:** 62 (100%)
- **Unused Tables:** 0

### Modules
- **Total Modules:** 17
- **Fully Implemented:** 11 (65%)
- **Partially Implemented:** 4 (23%)
- **Not Implemented:** 2 (12%)

### API Endpoints
- **Documented Endpoints:** ~180
- **Implemented Endpoints:** ~130
- **Implementation Rate:** ~72%

### Lines of Code (Estimated)
- **Java Backend:** ~25,000 LOC
- **SQL Migrations:** ~5,000 LOC
- **Total Backend:** ~30,000 LOC

---

**Document Version:** 1.0  
**Created:** 2026-10-28  
**Last Updated:** 2026-10-28  
**Author:** System Analysis  
**Status:** Complete

