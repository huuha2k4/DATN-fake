# API Transactions

**Module:** Transactions  
**Base Path:** `/api/v1/transactions`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/transactions` | Tạo giao dịch mới | ✅ |
| GET | `/transactions` | Danh sách giao dịch | ✅ |
| GET | `/transactions/{id}` | Chi tiết giao dịch | ✅ |
| PUT | `/transactions/{id}` | Cập nhật giao dịch | ✅ |
| DELETE | `/transactions/{id}` | Xóa giao dịch (soft delete) | ✅ |
| POST | `/transactions/batch` | Tạo nhiều giao dịch | ✅ |
| POST | `/transactions/{id}/split` | Tách giao dịch | ✅ |
| GET | `/transactions/summary` | Tổng hợp chi tiêu | ✅ |
| GET | `/transactions/by-category` | Nhóm theo danh mục | ✅ |
| GET | `/transactions/trends` | Xu hướng chi tiêu | ✅ |
| POST | `/transactions/{id}/attachments` | Thêm file đính kèm | ✅ |
| DELETE | `/transactions/{id}/attachments/{attachment_id}` | Xóa file đính kèm | ✅ |

---

## ➕ Create Transaction

Tạo giao dịch mới (thu/chi/chuyển khoản).

### Request - Expense (Chi tiêu)

```http
POST /api/v1/transactions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transaction_type": "EXPENSE",
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency_code": "VND",
  "description": "Cafe sáng",
  "transaction_date": "2026-10-11",
  "transaction_time": "08:30:00",
  "category_id": "cat-food-drinks",
  "merchant_id": "merchant-highlands",
  "tag_ids": ["tag-breakfast", "tag-work"],
  "location": {
    "latitude": 21.0285,
    "longitude": 105.8542,
    "address": "Highlands Coffee, Hoàn Kiếm, Hà Nội"
  },
  "note": "Meeting với client",
  "is_recurring": false
}
```

### Request - Income (Thu nhập)

```http
POST /api/v1/transactions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transaction_type": "INCOME",
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 15000000,
  "currency_code": "VND",
  "description": "Lương tháng 10",
  "transaction_date": "2026-10-01",
  "category_id": "cat-salary",
  "note": "Lương + thưởng"
}
```

### Request - Transfer (Chuyển khoản)

```http
POST /api/v1/transactions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transaction_type": "TRANSFER",
  "account_id": "account-cash-wallet",
  "to_account_id": "account-bank-techcombank",
  "amount": 5000000,
  "currency_code": "VND",
  "to_amount": 5000000,
  "to_currency_code": "VND",
  "description": "Chuyển tiền về ngân hàng",
  "transaction_date": "2026-10-11",
  "transfer_fee": 0,
  "note": "Tiết kiệm cuối tháng"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "tx-550e8400-e29b-41d4-a716-446655440000",
    "transaction_type": "EXPENSE",
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_name": "Ví tiền mặt",
    "amount": 50000,
    "currency_code": "VND",
    "display_amount": "50.000₫",
    "description": "Cafe sáng",
    "transaction_date": "2026-10-11",
    "transaction_time": "08:30:00",
    "category": {
      "id": "cat-food-drinks",
      "name": "Ăn uống",
      "icon": "🍔",
      "color": "#FF6B6B"
    },
    "merchant": {
      "id": "merchant-highlands",
      "name": "Highlands Coffee",
      "logo_url": "https://cdn.finance-app.com/merchants/highlands.png"
    },
    "tags": [
      {"id": "tag-breakfast", "name": "Bữa sáng", "color": "#FFD93D"},
      {"id": "tag-work", "name": "Công việc", "color": "#6BCB77"}
    ],
    "location": {
      "latitude": 21.0285,
      "longitude": 105.8542,
      "address": "Highlands Coffee, Hoàn Kiếm, Hà Nội"
    },
    "note": "Meeting với client",
    "category_status": "AI_APPLIED",
    "confidence_score": 0.95,
    "balance_after": 950000,
    "created_at": "2026-10-11T08:30:00Z",
    "updated_at": "2026-10-11T08:30:00Z",
    "sync_seq": 1250,
    "version": 0
  },
  "message": "Giao dịch đã được tạo thành công"
}
```

### Response Error - Insufficient Balance (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Số dư không đủ",
    "details": {
      "current_balance": 30000,
      "required_amount": 50000,
      "shortage": 20000,
      "currency_code": "VND"
    }
  }
}
```

### Validation Rules

- `transaction_type`: Required, enum [INCOME, EXPENSE, TRANSFER]
- `account_id`: Required, must exist and belong to user
- `amount`: Required, > 0, max 999999999.99
- `currency_code`: Required, valid ISO 4217
- `transaction_date`: Required, cannot be future (allow today)
- `category_id`: Required for INCOME/EXPENSE, null for TRANSFER
- `to_account_id`: Required for TRANSFER only
- `to_amount`: Required for TRANSFER when currencies differ

---

## 📋 List Transactions

Lấy danh sách giao dịch với filters và pagination.

### Request

```http
GET /api/v1/transactions?page=1&page_size=20&from_date=2026-10-01&to_date=2026-10-31&account_id=uuid&category_id=uuid&transaction_type=EXPENSE&min_amount=10000&max_amount=100000&search=cafe&sort_by=transaction_date&sort_order=desc
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `page` | int | No | Số trang (default: 1) |
| `page_size` | int | No | Số item/trang (default: 20, max: 100) |
| `from_date` | date | No | Từ ngày (YYYY-MM-DD) |
| `to_date` | date | No | Đến ngày (YYYY-MM-DD) |
| `account_id` | uuid | No | Lọc theo tài khoản |
| `category_id` | uuid | No | Lọc theo danh mục |
| `merchant_id` | uuid | No | Lọc theo merchant |
| `tag_ids` | uuid[] | No | Lọc theo tags (comma separated) |
| `transaction_type` | enum | No | INCOME, EXPENSE, TRANSFER |
| `min_amount` | decimal | No | Số tiền tối thiểu |
| `max_amount` | decimal | No | Số tiền tối đa |
| `search` | string | No | Tìm trong description, merchant |
| `category_status` | enum | No | UNCATEGORIZED, AI_APPLIED, CONFIRMED |
| `sort_by` | string | No | transaction_date, amount, created_at |
| `sort_order` | string | No | asc, desc (default: desc) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx-1",
        "transaction_type": "EXPENSE",
        "account": {
          "id": "acc-1",
          "name": "Ví tiền mặt",
          "icon": "💵"
        },
        "amount": 50000,
        "currency_code": "VND",
        "display_amount": "50.000₫",
        "description": "Cafe sáng",
        "transaction_date": "2026-10-11",
        "transaction_time": "08:30:00",
        "category": {
          "id": "cat-1",
          "name": "Ăn uống",
          "icon": "🍔",
          "color": "#FF6B6B"
        },
        "merchant": {
          "id": "merchant-1",
          "name": "Highlands Coffee",
          "logo_url": "https://..."
        },
        "tags": [
          {"id": "tag-1", "name": "Bữa sáng", "color": "#FFD93D"}
        ],
        "has_attachments": false,
        "created_at": "2026-10-11T08:30:00Z"
      },
      // ... more transactions
    ],
    "summary": {
      "total_income": 15000000,
      "total_expense": 8500000,
      "net_cash_flow": 6500000,
      "transaction_count": 45
    }
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 45,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## 🔍 Get Transaction Detail

Lấy chi tiết một giao dịch.

### Request

```http
GET /api/v1/transactions/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "tx-550e8400-e29b-41d4-a716-446655440000",
    "transaction_type": "EXPENSE",
    "account": {
      "id": "acc-1",
      "name": "Ví tiền mặt",
      "type": "CASH",
      "icon": "💵",
      "currency_code": "VND"
    },
    "amount": 50000,
    "currency_code": "VND",
    "display_amount": "50.000₫",
    "amount_in_base_currency": 50000,
    "description": "Cafe sáng",
    "transaction_date": "2026-10-11",
    "transaction_time": "08:30:00",
    "category": {
      "id": "cat-1",
      "name": "Ăn uống",
      "parent_category": "Chi tiêu thiết yếu",
      "icon": "🍔",
      "color": "#FF6B6B"
    },
    "merchant": {
      "id": "merchant-1",
      "name": "Highlands Coffee",
      "logo_url": "https://...",
      "category": "Cafe & Bakery",
      "location": "Hoàn Kiếm, Hà Nội"
    },
    "tags": [
      {"id": "tag-1", "name": "Bữa sáng", "color": "#FFD93D"},
      {"id": "tag-2", "name": "Công việc", "color": "#6BCB77"}
    ],
    "location": {
      "latitude": 21.0285,
      "longitude": 105.8542,
      "address": "Highlands Coffee, Hoàn Kiếm, Hà Nội"
    },
    "note": "Meeting với client",
    "attachments": [
      {
        "id": "att-1",
        "file_name": "receipt.jpg",
        "file_type": "image/jpeg",
        "file_size": 245678,
        "url": "https://cdn.finance-app.com/attachments/att-1.jpg",
        "thumbnail_url": "https://cdn.finance-app.com/attachments/att-1-thumb.jpg",
        "uploaded_at": "2026-10-11T08:31:00Z"
      }
    ],
    "receipt": {
      "id": "receipt-1",
      "ocr_status": "COMPLETED",
      "merchant_name": "Highlands Coffee",
      "total_amount": 50000,
      "ocr_confidence": 0.95,
      "processed_at": "2026-10-11T08:31:30Z"
    },
    "category_status": "CONFIRMED",
    "confidence_score": 0.95,
    "ai_suggestion": {
      "suggested_category": "Ăn uống",
      "suggested_merchant": "Highlands Coffee",
      "confidence": 0.95,
      "reasoning": "Pattern match với 15 giao dịch trước"
    },
    "balance_before": 1000000,
    "balance_after": 950000,
    "related_transactions": [],
    "is_recurring": false,
    "recurring_template_id": null,
    "created_at": "2026-10-11T08:30:00Z",
    "updated_at": "2026-10-11T08:30:00Z",
    "sync_seq": 1250,
    "version": 0
  }
}
```

---

## ✏️ Update Transaction

Cập nhật giao dịch.

### Request

```http
PUT /api/v1/transactions/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 55000,
  "description": "Cafe sáng + Bánh mì",
  "category_id": "cat-food-drinks",
  "merchant_id": "merchant-highlands",
  "tag_ids": ["tag-breakfast"],
  "note": "Đã cập nhật với bánh mì",
  "version": 0
}
```

**Important:** Phải gửi `version` để optimistic locking.

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "tx-550e8400-e29b-41d4-a716-446655440000",
    "amount": 55000,
    "display_amount": "55.000₫",
    "description": "Cafe sáng + Bánh mì",
    // ... full transaction object
    "updated_at": "2026-10-11T09:00:00Z",
    "sync_seq": 1251,
    "version": 1
  },
  "message": "Giao dịch đã được cập nhật"
}
```

### Response Error - Version Conflict (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Giao dịch đã được cập nhật bởi thiết bị khác",
    "details": {
      "expected_version": 0,
      "current_version": 1,
      "server_data": {
        // ... current transaction data from server
      }
    }
  }
}
```

---

## 🗑️ Delete Transaction

Xóa giao dịch (soft delete).

### Request

```http
DELETE /api/v1/transactions/{id}?version=0
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Giao dịch đã được xóa"
}
```

---

## 📦 Batch Create Transactions

Tạo nhiều giao dịch cùng lúc (import).

### Request

```http
POST /api/v1/transactions/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transactions": [
    {
      "transaction_type": "EXPENSE",
      "account_id": "acc-1",
      "amount": 50000,
      "currency_code": "VND",
      "description": "Cafe",
      "transaction_date": "2026-10-11",
      "category_id": "cat-1"
    },
    {
      "transaction_type": "EXPENSE",
      "account_id": "acc-1",
      "amount": 30000,
      "currency_code": "VND",
      "description": "Xăng xe",
      "transaction_date": "2026-10-11",
      "category_id": "cat-2"
    }
  ],
  "skip_on_error": true
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "status": "SUCCESS",
        "transaction_id": "tx-1",
        "sync_seq": 1250
      },
      {
        "index": 1,
        "status": "SUCCESS",
        "transaction_id": "tx-2",
        "sync_seq": 1251
      }
    ]
  },
  "message": "Đã tạo 2/2 giao dịch thành công"
}
```

---

## ✂️ Split Transaction

Tách một giao dịch thành nhiều phần (split bill).

### Request

```http
POST /api/v1/transactions/{id}/split
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "splits": [
    {
      "amount": 30000,
      "description": "Cafe",
      "category_id": "cat-food-drinks",
      "note": "Phần của tôi"
    },
    {
      "amount": 20000,
      "description": "Cafe - Bạn trả",
      "category_id": "cat-food-drinks",
      "note": "Bạn An trả sau"
    }
  ],
  "delete_original": true
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "original_transaction_id": "tx-1",
    "split_transactions": [
      {
        "id": "tx-split-1",
        "amount": 30000,
        "description": "Cafe",
        "parent_transaction_id": "tx-1"
      },
      {
        "id": "tx-split-2",
        "amount": 20000,
        "description": "Cafe - Bạn trả",
        "parent_transaction_id": "tx-1"
      }
    ]
  },
  "message": "Đã tách giao dịch thành 2 phần"
}
```

---

## 📊 Transaction Summary

Tổng hợp chi tiêu theo khoảng thời gian.

### Request

```http
GET /api/v1/transactions/summary?from_date=2026-10-01&to_date=2026-10-31&group_by=day&account_id=acc-1
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `from_date` | date | Từ ngày (required) |
| `to_date` | date | Đến ngày (required) |
| `group_by` | enum | day, week, month (default: day) |
| `account_id` | uuid | Filter theo tài khoản |
| `currency_code` | string | Convert về currency này |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-31",
      "group_by": "day"
    },
    "summary": {
      "total_income": 15000000,
      "total_expense": 8500000,
      "net_cash_flow": 6500000,
      "average_daily_expense": 283333,
      "transaction_count": 127,
      "largest_expense": {
        "amount": 2000000,
        "description": "Tiền nhà tháng 10",
        "date": "2026-10-05"
      },
      "most_frequent_category": {
        "id": "cat-food",
        "name": "Ăn uống",
        "count": 45,
        "total_amount": 3200000
      }
    },
    "by_period": [
      {
        "date": "2026-10-01",
        "income": 15000000,
        "expense": 0,
        "net": 15000000,
        "transaction_count": 1
      },
      {
        "date": "2026-10-02",
        "income": 0,
        "expense": 250000,
        "net": -250000,
        "transaction_count": 8
      }
      // ... more days
    ],
    "by_category": [
      {
        "category_id": "cat-food",
        "category_name": "Ăn uống",
        "total_amount": 3200000,
        "percentage": 37.6,
        "transaction_count": 45,
        "average_amount": 71111
      },
      {
        "category_id": "cat-transport",
        "category_name": "Di chuyển",
        "total_amount": 1800000,
        "percentage": 21.2,
        "transaction_count": 30,
        "average_amount": 60000
      }
      // ... more categories
    ],
    "currency_code": "VND"
  }
}
```

---

## 📈 By Category

Nhóm giao dịch theo danh mục.

### Request

```http
GET /api/v1/transactions/by-category?from_date=2026-10-01&to_date=2026-10-31&transaction_type=EXPENSE
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-31"
    },
    "total_amount": 8500000,
    "categories": [
      {
        "category": {
          "id": "cat-food",
          "name": "Ăn uống",
          "icon": "🍔",
          "color": "#FF6B6B"
        },
        "amount": 3200000,
        "percentage": 37.6,
        "transaction_count": 45,
        "average_amount": 71111,
        "trend": {
          "change_percentage": 15.5,
          "direction": "UP",
          "vs_previous_period": "Tăng 15.5% so với tháng trước"
        },
        "top_merchants": [
          {"name": "Highlands Coffee", "amount": 800000, "count": 15},
          {"name": "Lotteria", "amount": 450000, "count": 9}
        ]
      }
      // ... more categories
    ]
  }
}
```

---

## 📉 Trends

Phân tích xu hướng chi tiêu.

### Request

```http
GET /api/v1/transactions/trends?period=6months&category_id=cat-food
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "period": "6months",
    "category": {
      "id": "cat-food",
      "name": "Ăn uống"
    },
    "trends": [
      {
        "month": "2026-05",
        "amount": 2800000,
        "transaction_count": 42,
        "average_per_transaction": 66667,
        "days_with_transaction": 28
      },
      {
        "month": "2026-06",
        "amount": 3000000,
        "transaction_count": 45,
        "average_per_transaction": 66667,
        "days_with_transaction": 29
      }
      // ... more months
    ],
    "insights": [
      {
        "type": "SPENDING_INCREASE",
        "message": "Chi tiêu ăn uống tăng 14% trong 3 tháng qua",
        "severity": "WARNING"
      },
      {
        "type": "PEAK_DAY",
        "message": "Bạn thường chi nhiều nhất vào Chủ Nhật",
        "data": {
          "day_of_week": "Sunday",
          "average_amount": 150000
        }
      }
    ],
    "forecast": {
      "next_month_predicted": 3350000,
      "confidence": 0.85,
      "range": {
        "min": 3100000,
        "max": 3600000
      }
    }
  }
}
```

---

## 📎 Add Attachment

Thêm file đính kèm vào giao dịch.

### Request

```http
POST /api/v1/transactions/{id}/attachments
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: (binary)
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "att-uuid",
    "transaction_id": "tx-uuid",
    "file_name": "receipt.jpg",
    "file_type": "image/jpeg",
    "file_size": 245678,
    "url": "https://cdn.finance-app.com/attachments/att-uuid.jpg",
    "thumbnail_url": "https://cdn.finance-app.com/attachments/att-uuid-thumb.jpg",
    "uploaded_at": "2026-10-11T09:00:00Z"
  }
}
```

**Limits:**
- Max file size: 10MB
- Allowed types: image/*, application/pdf
- Max attachments per transaction: 5

---

## 🗑️ Delete Attachment

Xóa file đính kèm.

### Request

```http
DELETE /api/v1/transactions/{id}/attachments/{attachment_id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Đã xóa file đính kèm"
}
```

---

## 🔗 Related APIs

- [Accounts API](03-accounts-api.md)
- [Categories API](05-categories-api.md)
- [OCR API](11-ocr-api.md)
- [Sync API](16-sync-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
