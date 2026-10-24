# OpenAPI 3.0 Specification Summary

**Project:** PFM-AI - Personal Finance Management with AI  
**API Version:** v1  
**OpenAPI Version:** 3.0.3  
**Cập nhật:** 11/10/2026

---

## 📋 Tổng Quan

Tài liệu này mô tả cấu trúc OpenAPI Specification cho toàn bộ hệ thống API.

### Base Information

```yaml
openapi: 3.0.3
info:
  title: PFM-AI API
  version: 1.0.0
  description: |
    RESTful API cho hệ thống quản lý tài chính cá nhân với AI.
    
    Tính năng chính:
    - 🔐 Authentication với JWT + OAuth + MFA
    - 💰 Quản lý tài khoản & giao dịch
    - 📊 Ngân sách & mục tiêu tài chính
    - 🤖 AI Assistant & Chat
    - 📸 OCR quét hóa đơn
    - 📈 Insights & Analytics
    - 🔄 Offline-first sync
    
  contact:
    name: PFM-AI API Support
    email: api-support@finance-app.com
    url: https://docs.finance-app.com
  license:
    name: Proprietary
    url: https://finance-app.com/license

servers:
  - url: https://api.finance-app.com/api/v1
    description: Production
  - url: https://staging-api.finance-app.com/api/v1
    description: Staging
  - url: http://localhost:8080/api/v1
    description: Development

tags:
  - name: Authentication
    description: Đăng ký, đăng nhập, OAuth, MFA
  - name: Users
    description: Quản lý người dùng
  - name: Accounts
    description: Quản lý tài khoản/ví
  - name: Transactions
    description: Giao dịch thu/chi/chuyển khoản
  - name: Categories
    description: Danh mục thu chi
  - name: Budgets
    description: Ngân sách
  - name: Goals
    description: Mục tiêu tài chính
  - name: Recurring
    description: Giao dịch định kỳ
  - name: Debts
    description: Quản lý nợ
  - name: Groups
    description: Chia sẻ nhóm
  - name: OCR
    description: Quét hóa đơn
  - name: Chat
    description: AI Chat Assistant
  - name: Insights
    description: Phân tích & gợi ý
  - name: Forecast
    description: Dự báo
  - name: Anomalies
    description: Phát hiện bất thường
  - name: Sync
    description: Đồng bộ offline-first
  - name: Notifications
    description: Thông báo
  - name: Reports
    description: Báo cáo
```

---

## 🔐 Security Schemes

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT access token. Thêm vào header:
        `Authorization: Bearer <token>`
        
        Token expires sau 15 phút.
    
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://api.finance-app.com/oauth/authorize
          tokenUrl: https://api.finance-app.com/oauth/token
          scopes:
            read: Read access
            write: Write access
            admin: Admin access

security:
  - BearerAuth: []
```

---

## 📦 Common Schemas

### Response Wrappers

```yaml
components:
  schemas:
    SuccessResponse:
      type: object
      required:
        - success
        - data
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          description: Response data (schema varies by endpoint)
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'
    
    ErrorResponse:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          example: false
        error:
          $ref: '#/components/schemas/Error'
        metadata:
          $ref: '#/components/schemas/ResponseMetadata'
    
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: VALIDATION_ERROR
        message:
          type: string
          example: Dữ liệu không hợp lệ
        details:
          type: object
          additionalProperties: true
    
    ResponseMetadata:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        request_id:
          type: string
          format: uuid
    
    PaginatedResponse:
      type: object
      required:
        - success
        - data
        - pagination
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
        pagination:
          $ref: '#/components/schemas/Pagination'
    
    Pagination:
      type: object
      required:
        - page
        - page_size
        - total_items
        - total_pages
      properties:
        page:
          type: integer
          minimum: 1
        page_size:
          type: integer
          minimum: 1
          maximum: 100
        total_items:
          type: integer
        total_pages:
          type: integer
        has_next:
          type: boolean
        has_previous:
          type: boolean
```

### Core Domain Models

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        full_name:
          type: string
        phone:
          type: string
        email_verified:
          type: boolean
        mfa_enabled:
          type: boolean
        role:
          type: string
          enum: [USER, PREMIUM_USER, ADMIN]
        plan:
          type: string
          enum: [FREE, PREMIUM, ENTERPRISE]
        created_at:
          type: string
          format: date-time
    
    Account:
      type: object
      required:
        - id
        - name
        - account_type
        - currency_code
        - balance
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          maxLength: 100
        account_type:
          type: string
          enum: [CASH, BANK_ACCOUNT, E_WALLET, CREDIT_CARD, INVESTMENT, CRYPTO]
        currency_code:
          type: string
          pattern: '^[A-Z]{3}$'
          example: VND
        balance:
          type: number
          format: decimal
        display_balance:
          type: string
        icon:
          type: string
        color:
          type: string
          pattern: '^#[0-9A-F]{6}$'
        is_active:
          type: boolean
        created_at:
          type: string
          format: date-time
        version:
          type: integer
    
    Transaction:
      type: object
      required:
        - id
        - transaction_type
        - account_id
        - amount
        - currency_code
        - transaction_date
      properties:
        id:
          type: string
          format: uuid
        transaction_type:
          type: string
          enum: [INCOME, EXPENSE, TRANSFER]
        account_id:
          type: string
          format: uuid
        to_account_id:
          type: string
          format: uuid
          nullable: true
        amount:
          type: number
          format: decimal
          minimum: 0.01
        currency_code:
          type: string
          pattern: '^[A-Z]{3}$'
        description:
          type: string
          maxLength: 500
        transaction_date:
          type: string
          format: date
        transaction_time:
          type: string
          format: time
          nullable: true
        category_id:
          type: string
          format: uuid
          nullable: true
        merchant_id:
          type: string
          format: uuid
          nullable: true
        category_status:
          type: string
          enum: [UNCATEGORIZED, NEEDS_REVIEW, AI_APPLIED, CONFIRMED]
        created_at:
          type: string
          format: date-time
        version:
          type: integer
    
    Budget:
      type: object
      properties:
        id:
          type: string
          format: uuid
        category_id:
          type: string
          format: uuid
          nullable: true
        amount:
          type: number
          format: decimal
        currency_code:
          type: string
        period_type:
          type: string
          enum: [MONTHLY, QUARTERLY, YEARLY, CUSTOM]
        start_date:
          type: string
          format: date
        end_date:
          type: string
          format: date
        spent:
          type: number
          format: decimal
        remaining:
          type: number
          format: decimal
        percentage_used:
          type: number
          format: decimal
        status:
          type: string
          enum: [ON_TRACK, WARNING, EXCEEDED]
    
    Goal:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        goal_type:
          type: string
          enum: [SAVINGS, DEBT_PAYOFF, PURCHASE, INVESTMENT, CUSTOM]
        target_amount:
          type: number
          format: decimal
        current_amount:
          type: number
          format: decimal
        currency_code:
          type: string
        target_date:
          type: string
          format: date
          nullable: true
        status:
          type: string
          enum: [IN_PROGRESS, COMPLETED, PAUSED, CANCELLED]
        percentage_complete:
          type: number
          format: decimal
```

---

## 🛣️ API Paths Structure

### Authentication (`/auth`)

```yaml
/auth/register:
  post:
    tags: [Authentication]
    summary: Đăng ký tài khoản mới
    
/auth/login:
  post:
    tags: [Authentication]
    summary: Đăng nhập
    
/auth/logout:
  post:
    tags: [Authentication]
    summary: Đăng xuất
    security:
      - BearerAuth: []
      
/auth/refresh:
  post:
    tags: [Authentication]
    summary: Làm mới access token
    
/auth/mfa/setup:
  post:
    tags: [Authentication]
    summary: Thiết lập MFA
    security:
      - BearerAuth: []
```

### Transactions (`/transactions`)

```yaml
/transactions:
  get:
    tags: [Transactions]
    summary: Danh sách giao dịch
    parameters:
      - name: page
        in: query
        schema:
          type: integer
      - name: page_size
        in: query
        schema:
          type: integer
      - name: from_date
        in: query
        schema:
          type: string
          format: date
      - name: to_date
        in: query
        schema:
          type: string
          format: date
  
  post:
    tags: [Transactions]
    summary: Tạo giao dịch mới
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateTransactionRequest'

/transactions/{id}:
  parameters:
    - name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
  
  get:
    tags: [Transactions]
    summary: Chi tiết giao dịch
  
  put:
    tags: [Transactions]
    summary: Cập nhật giao dịch
  
  delete:
    tags: [Transactions]
    summary: Xóa giao dịch

/transactions/summary:
  get:
    tags: [Transactions]
    summary: Tổng hợp chi tiêu
```

### Sync (`/sync`)

```yaml
/sync/pull:
  get:
    tags: [Sync]
    summary: Pull thay đổi từ server
    parameters:
      - name: since_seq
        in: query
        required: true
        schema:
          type: integer
          format: int64

/sync/push:
  post:
    tags: [Sync]
    summary: Push thay đổi lên server
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/PushChangesRequest'
```

---

## 📝 Request/Response Examples

### Create Transaction

**Request:**
```http
POST /api/v1/transactions
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "transaction_type": "EXPENSE",
  "account_id": "uuid",
  "amount": 50000,
  "currency_code": "VND",
  "description": "Cafe",
  "transaction_date": "2026-10-11",
  "category_id": "uuid"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "transaction_type": "EXPENSE",
    "amount": 50000,
    "display_amount": "50.000₫",
    "description": "Cafe",
    "created_at": "2026-10-11T10:00:00Z",
    "version": 0
  },
  "metadata": {
    "timestamp": "2026-10-11T10:00:00Z",
    "request_id": "req-uuid"
  }
}
```

---

## 📊 Rate Limiting Headers

```yaml
components:
  headers:
    X-RateLimit-Limit:
      description: Số request tối đa trong window
      schema:
        type: integer
    
    X-RateLimit-Remaining:
      description: Số request còn lại
      schema:
        type: integer
    
    X-RateLimit-Reset:
      description: Timestamp khi reset
      schema:
        type: integer
        format: unix-timestamp
```

**Example:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1697000060
```

---

## 🔗 Webhook Events

```yaml
components:
  schemas:
    WebhookEvent:
      type: object
      required:
        - event
        - data
        - timestamp
      properties:
        event:
          type: string
          enum:
            - transaction.created
            - transaction.updated
            - budget.exceeded
            - goal.achieved
            - anomaly.detected
        data:
          type: object
        timestamp:
          type: string
          format: date-time
```

---

## 📚 Tài Liệu Chi Tiết

### Core APIs
- [Authentication API](01-auth-api.md) - Đăng ký, đăng nhập, OAuth, MFA
- [Accounts API](03-accounts-api.md) - Quản lý tài khoản/ví
- [Transactions API](04-transactions-api.md) - Giao dịch thu/chi/chuyển khoản
- [Sync API](16-sync-api.md) - Đồng bộ offline-first

### AI APIs
- [Chat Assistant API](12-chat-api.md) - Trợ lý AI chat
- [Quick Reference](QUICK-REFERENCE.md) - OCR, Insights, Forecast, etc.

---

## 🛠️ Tools & Resources

### Swagger UI

Access interactive API docs:
```
https://api.finance-app.com/swagger-ui
```

### Postman Collection

Download Postman collection:
```
https://docs.finance-app.com/postman/PFM-AI.postman_collection.json
```

### SDKs

- **Android:** `implementation 'com.finance:pfm-ai-sdk:1.0.0'`
- **iOS:** `pod 'PFMAIKit', '~> 1.0'`
- **JavaScript:** `npm install @pfm-ai/js-sdk`
- **Python:** `pip install pfm-ai-sdk`

---

## 🧪 Testing

### Test Credentials

```json
{
  "email": "test@example.com",
  "password": "Test@123456"
}
```

### Mock Server

```
https://mock-api.finance-app.com/api/v1
```

---

## 📞 Support

- **Documentation:** https://docs.finance-app.com
- **API Status:** https://status.finance-app.com
- **Email:** api-support@finance-app.com
- **Discord:** https://discord.gg/pfm-ai

---

## 📄 Changelog

### v1.0.0 (2026-10-11)
- ✅ Initial release
- ✅ Core APIs (Auth, Accounts, Transactions)
- ✅ AI APIs (Chat, Insights, OCR)
- ✅ Sync APIs (Offline-first)

---

**Note:** Full OpenAPI 3.0 YAML/JSON specification có thể được generate từ các file markdown này bằng tools như `swagger-markdown` hoặc viết thủ công based on this structure.

---

**Phiên bản:** 1.0.0  
**Cập nhật:** 11/10/2026  
**Team:** PFM-AI Backend Team
