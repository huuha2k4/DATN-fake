# Đặc Tả API - PFM-AI

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản API:** v1  
**Base URL:** `https://api.finance-app.com/api/v1`  
**Cập nhật:** 11/10/2026

---

## 📋 Tổng Quan

API RESTful cho hệ thống quản lý tài chính cá nhân với các tính năng:
- **Authentication:** JWT-based với refresh token
- **Authorization:** RBAC với RLS
- **Format:** JSON
- **Encoding:** UTF-8
- **Rate Limiting:** 100 req/min (Free), 500 req/min (Premium)

---

## 📚 Danh Mục API

### 1. Core APIs - Business Logic Chính

| # | Module | File | Mô tả |
|---|--------|------|-------|
| 1.1 | **Authentication** | [01-auth-api.md](01-auth-api.md) | Đăng ký, đăng nhập, OAuth, MFA |
| 1.2 | **User Management** | [02-user-api.md](02-user-api.md) | Profile, settings, preferences |
| 1.3 | **Accounts** | [03-accounts-api.md](03-accounts-api.md) | Quản lý tài khoản/ví |
| 1.4 | **Transactions** | [04-transactions-api.md](04-transactions-api.md) | Giao dịch thu/chi/chuyển khoản |
| 1.5 | **Categories** | [05-categories-api.md](05-categories-api.md) | Danh mục, merchants, tags |
| 1.6 | **Budgets** | [06-budgets-api.md](06-budgets-api.md) | Ngân sách & theo dõi |
| 1.7 | **Goals** | [07-goals-api.md](07-goals-api.md) | Mục tiêu tài chính |
| 1.8 | **Recurring** | [08-recurring-api.md](08-recurring-api.md) | Giao dịch định kỳ |
| 1.9 | **Debts** | [09-debts-api.md](09-debts-api.md) | Quản lý nợ |
| 1.10 | **Groups** | [10-groups-api.md](10-groups-api.md) | Chia sẻ nhóm |

### 2. AI APIs - Tính Năng AI/ML

| # | Module | File | Mô tả |
|---|--------|------|-------|
| 2.1 | **OCR** | [11-ocr-api.md](11-ocr-api.md) | Quét hóa đơn |
| 2.2 | **Chat Assistant** | [12-chat-api.md](12-chat-api.md) | Trợ lý AI chat |
| 2.3 | **Insights** | [13-insights-api.md](13-insights-api.md) | Phân tích & gợi ý |
| 2.4 | **Forecasting** | [14-forecast-api.md](14-forecast-api.md) | Dự báo chi tiêu |
| 2.5 | **Anomaly Detection** | [15-anomaly-api.md](15-anomaly-api.md) | Phát hiện bất thường |

### 3. Operations APIs

| # | Module | File | Mô tả |
|---|--------|------|-------|
| 3.1 | **Sync** | [16-sync-api.md](16-sync-api.md) | Đồng bộ offline-first |
| 3.2 | **Notifications** | [17-notifications-api.md](17-notifications-api.md) | Thông báo push/email |
| 3.3 | **Reports** | [18-reports-api.md](18-reports-api.md) | Báo cáo & export |
| 3.4 | **Admin** | [19-admin-api.md](19-admin-api.md) | Quản trị hệ thống |

---

## 🔐 Authentication

### JWT Token Flow

```
1. Login → Access Token (15 min) + Refresh Token (30 days)
2. API Request → Authorization: Bearer <access_token>
3. Token expired → Refresh → New tokens
4. Logout → Revoke refresh token
```

### Headers

```http
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
Content-Type: application/json
Accept: application/json
X-Device-ID: uuid-device
X-App-Version: 1.2.0
X-Platform: android|ios|web
```

---

## 📝 Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 100000,
    "description": "Cafe"
  },
  "metadata": {
    "timestamp": "2026-10-11T10:00:00Z",
    "request_id": "req-uuid"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Số dư không đủ",
    "details": {
      "current_balance": 50000,
      "required_amount": 100000
    }
  },
  "metadata": {
    "timestamp": "2026-10-11T10:00:00Z",
    "request_id": "req-uuid"
  }
}
```

### Pagination

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## 🔢 Error Codes

### Authentication (1xxx)

| Code | Message | HTTP Status |
|------|---------|-------------|
| 1001 | `INVALID_CREDENTIALS` | 401 |
| 1002 | `TOKEN_EXPIRED` | 401 |
| 1003 | `TOKEN_INVALID` | 401 |
| 1004 | `MFA_REQUIRED` | 403 |
| 1005 | `ACCOUNT_LOCKED` | 403 |

### Validation (2xxx)

| Code | Message | HTTP Status |
|------|---------|-------------|
| 2001 | `VALIDATION_ERROR` | 400 |
| 2002 | `MISSING_REQUIRED_FIELD` | 400 |
| 2003 | `INVALID_FORMAT` | 400 |
| 2004 | `VALUE_OUT_OF_RANGE` | 400 |

### Business Logic (3xxx)

| Code | Message | HTTP Status |
|------|---------|-------------|
| 3001 | `INSUFFICIENT_BALANCE` | 400 |
| 3002 | `DUPLICATE_TRANSACTION` | 409 |
| 3003 | `BUDGET_EXCEEDED` | 400 |
| 3004 | `ACCOUNT_NOT_FOUND` | 404 |
| 3005 | `PERMISSION_DENIED` | 403 |

### System (5xxx)

| Code | Message | HTTP Status |
|------|---------|-------------|
| 5001 | `INTERNAL_SERVER_ERROR` | 500 |
| 5002 | `SERVICE_UNAVAILABLE` | 503 |
| 5003 | `DATABASE_ERROR` | 500 |
| 5004 | `EXTERNAL_SERVICE_ERROR` | 502 |

---

## 🎯 Rate Limiting

### Limits by Plan

| Plan | Rate Limit | Burst |
|------|------------|-------|
| Free | 100 req/min | 120 |
| Premium | 500 req/min | 600 |
| Enterprise | Custom | Custom |

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1697000060
```

### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Vượt quá giới hạn request",
    "retry_after": 60
  }
}
```

---

## 🔄 Versioning

### URL Versioning (Current)

```
https://api.finance-app.com/api/v1/transactions
https://api.finance-app.com/api/v2/transactions (future)
```

### Deprecation Policy

- **Notice:** 3 tháng trước khi deprecate
- **Support:** Old version support 6 tháng
- **Header:** `Sunset: Sat, 01 Apr 2027 00:00:00 GMT`

---

## 🌍 Internationalization

### Language

```http
Accept-Language: vi-VN
Accept-Language: en-US
```

### Currency

- Mặc định theo user settings
- Override bằng query param: `?currency=VND`

### Timezone

- Mặc định: User timezone (trong settings)
- Override: `X-Timezone: Asia/Ho_Chi_Minh`

---

## 📊 Monitoring & Observability

### Request ID

Mọi request có unique ID:
```http
X-Request-ID: req-550e8400-e29b-41d4-a716-446655440000
```

### Performance Headers

```http
X-Response-Time: 145ms
X-DB-Query-Time: 23ms
X-Cache-Status: HIT
```

---

## 🧪 Testing

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | `http://localhost:8080/api/v1` | Local dev |
| Staging | `https://staging-api.finance-app.com/api/v1` | Pre-production |
| Production | `https://api.finance-app.com/api/v1` | Live |

### Test Credentials

```json
{
  "email": "test@example.com",
  "password": "Test@123456",
  "mfa_code": "123456"
}
```

### Postman Collection

Download: [PFM-AI.postman_collection.json](./postman/PFM-AI.postman_collection.json)

---

## 📖 Quick Start

### 1. Register

```bash
curl -X POST https://api.finance-app.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "Nguyen Van A"
  }'
```

### 2. Login

```bash
curl -X POST https://api.finance-app.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Create Transaction

```bash
curl -X POST https://api.finance-app.com/api/v1/transactions \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "uuid-account",
    "transaction_type": "EXPENSE",
    "amount": 50000,
    "currency_code": "VND",
    "description": "Cafe",
    "transaction_date": "2026-10-11",
    "category_id": "uuid-category"
  }'
```

### 4. Get Transactions

```bash
curl -X GET "https://api.finance-app.com/api/v1/transactions?page=1&page_size=20" \
  -H "Authorization: Bearer <access_token>"
```

---

## 🔗 Resources

- **API Documentation:** [Swagger UI](https://api.finance-app.com/swagger-ui)
- **OpenAPI Spec:** [openapi.yaml](./openapi.yaml)
- **SDK - Android:** [GitHub](https://github.com/pfm-ai/android-sdk)
- **SDK - iOS:** [GitHub](https://github.com/pfm-ai/ios-sdk)
- **SDK - JavaScript:** [NPM](https://www.npmjs.com/package/@pfm-ai/js-sdk)

---

## 🤝 Support

- **Email:** api-support@finance-app.com
- **Discord:** [Join Server](https://discord.gg/pfm-ai)
- **Status Page:** [status.finance-app.com](https://status.finance-app.com)

---

**Phiên bản:** v1.0.0  
**Cập nhật:** 11/10/2026  
**Team:** PFM-AI Backend Team
