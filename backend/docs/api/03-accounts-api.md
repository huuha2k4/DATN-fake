# API Accounts

**Module:** Accounts & Assets  
**Base Path:** `/api/v1/accounts`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/accounts` | Tạo tài khoản/ví mới | ✅ |
| GET | `/accounts` | Danh sách tài khoản | ✅ |
| GET | `/accounts/{id}` | Chi tiết tài khoản | ✅ |
| PUT | `/accounts/{id}` | Cập nhật tài khoản | ✅ |
| DELETE | `/accounts/{id}` | Xóa tài khoản | ✅ |
| GET | `/accounts/summary` | Tổng quan tài sản | ✅ |
| POST | `/accounts/{id}/adjust-balance` | Điều chỉnh số dư | ✅ |
| GET | `/accounts/{id}/balance-history` | Lịch sử số dư | ✅ |
| POST | `/accounts/{id}/link-bank` | Liên kết ngân hàng | ✅ |
| POST | `/accounts/{id}/sync-balance` | Đồng bộ số dư từ ngân hàng | ✅ |

---

## ➕ Create Account

Tạo tài khoản/ví mới.

### Request - Cash Wallet

```http
POST /api/v1/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Ví tiền mặt",
  "account_type": "CASH",
  "currency_code": "VND",
  "initial_balance": 1000000,
  "icon": "💵",
  "color": "#4CAF50",
  "description": "Ví tiền mặt hàng ngày",
  "is_included_in_total": true
}
```

### Request - Bank Account

```http
POST /api/v1/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Techcombank",
  "account_type": "BANK_ACCOUNT",
  "currency_code": "VND",
  "initial_balance": 50000000,
  "bank_id": "bank-techcombank",
  "account_number": "1234567890",
  "icon": "🏦",
  "color": "#2196F3",
  "is_included_in_total": true
}
```

### Request - E-Wallet

```http
POST /api/v1/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "MoMo",
  "account_type": "E_WALLET",
  "currency_code": "VND",
  "initial_balance": 500000,
  "bank_id": "ewallet-momo",
  "phone_number": "+84901234567",
  "icon": "💳",
  "color": "#E91E63"
}
```

### Request - Credit Card

```http
POST /api/v1/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Visa Techcombank",
  "account_type": "CREDIT_CARD",
  "currency_code": "VND",
  "initial_balance": -2000000,
  "bank_id": "bank-techcombank",
  "card_number_last4": "1234",
  "credit_limit": 50000000,
  "billing_cycle_day": 1,
  "payment_due_day": 20,
  "icon": "💳",
  "color": "#FF9800"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "acc-550e8400-e29b-41d4-a716-446655440000",
    "name": "Ví tiền mặt",
    "account_type": "CASH",
    "currency_code": "VND",
    "balance": 1000000,
    "display_balance": "1.000.000₫",
    "icon": "💵",
    "color": "#4CAF50",
    "description": "Ví tiền mặt hàng ngày",
    "is_included_in_total": true,
    "is_active": true,
    "created_at": "2026-10-11T10:00:00Z",
    "sync_seq": 1300,
    "version": 0
  },
  "message": "Tài khoản đã được tạo thành công"
}
```

### Validation Rules

- `name`: Required, min 1, max 100 ký tự
- `account_type`: Required, enum [CASH, BANK_ACCOUNT, E_WALLET, CREDIT_CARD, INVESTMENT, CRYPTO]
- `currency_code`: Required, valid ISO 4217
- `initial_balance`: Required, can be negative for credit cards
- `credit_limit`: Required for CREDIT_CARD, must be > 0

---

## 📋 List Accounts

Lấy danh sách tất cả tài khoản.

### Request

```http
GET /api/v1/accounts?include_inactive=false&account_type=BANK_ACCOUNT
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `include_inactive` | boolean | Bao gồm tài khoản đã đóng (default: false) |
| `account_type` | enum | Lọc theo loại tài khoản |
| `currency_code` | string | Lọc theo tiền tệ |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "acc-1",
        "name": "Ví tiền mặt",
        "account_type": "CASH",
        "currency_code": "VND",
        "balance": 1000000,
        "display_balance": "1.000.000₫",
        "icon": "💵",
        "color": "#4CAF50",
        "is_included_in_total": true,
        "is_active": true,
        "last_transaction_date": "2026-10-11",
        "transaction_count": 45
      },
      {
        "id": "acc-2",
        "name": "Techcombank",
        "account_type": "BANK_ACCOUNT",
        "currency_code": "VND",
        "balance": 50000000,
        "display_balance": "50.000.000₫",
        "bank": {
          "id": "bank-techcombank",
          "name": "Techcombank",
          "logo_url": "https://..."
        },
        "account_number_masked": "****7890",
        "icon": "🏦",
        "color": "#2196F3",
        "is_included_in_total": true,
        "is_active": true,
        "is_synced": true,
        "last_synced_at": "2026-10-11T09:00:00Z"
      },
      {
        "id": "acc-3",
        "name": "Visa Techcombank",
        "account_type": "CREDIT_CARD",
        "currency_code": "VND",
        "balance": -2000000,
        "display_balance": "-2.000.000₫",
        "credit_limit": 50000000,
        "credit_used": 2000000,
        "credit_available": 48000000,
        "utilization_percentage": 4.0,
        "billing_cycle_day": 1,
        "payment_due_day": 20,
        "next_payment_due": "2026-10-20",
        "icon": "💳",
        "color": "#FF9800"
      }
    ],
    "summary": {
      "total_assets": 51000000,
      "total_liabilities": 2000000,
      "net_worth": 49000000,
      "currency_code": "VND"
    }
  }
}
```

---

## 🔍 Get Account Detail

Chi tiết tài khoản với thống kê.

### Request

```http
GET /api/v1/accounts/{id}?include_stats=true
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "acc-1",
    "name": "Ví tiền mặt",
    "account_type": "CASH",
    "currency_code": "VND",
    "balance": 1000000,
    "display_balance": "1.000.000₫",
    "icon": "💵",
    "color": "#4CAF50",
    "description": "Ví tiền mặt hàng ngày",
    "is_included_in_total": true,
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "stats": {
      "total_income": 25000000,
      "total_expense": 24000000,
      "transaction_count": 150,
      "average_transaction": 160000,
      "largest_income": 5000000,
      "largest_expense": 2000000,
      "first_transaction_date": "2026-01-01",
      "last_transaction_date": "2026-10-11"
    },
    "balance_trend_7_days": [
      {"date": "2026-10-05", "balance": 1200000},
      {"date": "2026-10-06", "balance": 1150000},
      {"date": "2026-10-07", "balance": 1100000},
      {"date": "2026-10-08", "balance": 1050000},
      {"date": "2026-10-09", "balance": 1000000},
      {"date": "2026-10-10", "balance": 980000},
      {"date": "2026-10-11", "balance": 1000000}
    ],
    "recent_transactions": [
      {
        "id": "tx-1",
        "type": "EXPENSE",
        "amount": -50000,
        "description": "Cafe",
        "date": "2026-10-11"
      }
    ]
  }
}
```

---

## ✏️ Update Account

Cập nhật thông tin tài khoản.

### Request

```http
PUT /api/v1/accounts/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Ví tiền mặt chính",
  "icon": "💰",
  "color": "#4CAF50",
  "description": "Updated description",
  "is_included_in_total": true,
  "version": 0
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "acc-1",
    "name": "Ví tiền mặt chính",
    "icon": "💰",
    "color": "#4CAF50",
    "description": "Updated description",
    "updated_at": "2026-10-11T10:30:00Z",
    "version": 1
  },
  "message": "Tài khoản đã được cập nhật"
}
```

**Note:** Không được cập nhật `balance` trực tiếp. Dùng `/adjust-balance` để điều chỉnh.

---

## 🗑️ Delete Account

Xóa tài khoản (soft delete).

### Request

```http
DELETE /api/v1/accounts/{id}?version=0&move_transactions_to=acc-2
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `version` | int | Yes | Optimistic locking |
| `move_transactions_to` | uuid | No | Chuyển giao dịch sang tài khoản khác |

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Tài khoản đã được xóa. 45 giao dịch đã được chuyển sang tài khoản khác."
}
```

### Response Error - Has Transactions (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_HAS_TRANSACTIONS",
    "message": "Không thể xóa tài khoản có giao dịch",
    "details": {
      "transaction_count": 45,
      "suggestion": "Vui lòng chuyển giao dịch sang tài khoản khác trước khi xóa"
    }
  }
}
```

---

## 📊 Accounts Summary

Tổng quan tất cả tài sản.

### Request

```http
GET /api/v1/accounts/summary?base_currency=VND
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_assets": 51000000,
      "total_liabilities": 2000000,
      "net_worth": 49000000,
      "currency_code": "VND"
    },
    "by_type": [
      {
        "account_type": "CASH",
        "count": 2,
        "total_balance": 1500000,
        "percentage": 2.9
      },
      {
        "account_type": "BANK_ACCOUNT",
        "count": 3,
        "total_balance": 48000000,
        "percentage": 94.1
      },
      {
        "account_type": "E_WALLET",
        "count": 2,
        "total_balance": 1500000,
        "percentage": 2.9
      },
      {
        "account_type": "CREDIT_CARD",
        "count": 1,
        "total_balance": -2000000,
        "percentage": -4.1
      }
    ],
    "by_currency": [
      {
        "currency_code": "VND",
        "total_balance": 49000000,
        "account_count": 7
      },
      {
        "currency_code": "USD",
        "total_balance": 1000,
        "total_balance_in_base": 24000000,
        "account_count": 1
      }
    ],
    "net_worth_trend_30_days": [
      {"date": "2026-09-12", "net_worth": 45000000},
      {"date": "2026-09-19", "net_worth": 46500000},
      {"date": "2026-09-26", "net_worth": 47800000},
      {"date": "2026-10-03", "net_worth": 48200000},
      {"date": "2026-10-10", "net_worth": 49000000}
    ]
  }
}
```

---

## ⚖️ Adjust Balance

Điều chỉnh số dư (reconciliation).

### Request

```http
POST /api/v1/accounts/{id}/adjust-balance
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "new_balance": 1050000,
  "reason": "Đối soát với sổ sách",
  "adjustment_date": "2026-10-11"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "account_id": "acc-1",
    "old_balance": 1000000,
    "new_balance": 1050000,
    "adjustment_amount": 50000,
    "adjustment_transaction_id": "tx-adjustment-uuid",
    "reason": "Đối soát với sổ sách"
  },
  "message": "Số dư đã được điều chỉnh. Giao dịch điều chỉnh đã được tạo."
}
```

**Note:** Tạo một giao dịch ADJUSTMENT type để tracking.

---

## 📈 Balance History

Lịch sử số dư theo thời gian.

### Request

```http
GET /api/v1/accounts/{id}/balance-history?from_date=2026-09-01&to_date=2026-10-11&interval=day
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `from_date` | date | Từ ngày |
| `to_date` | date | Đến ngày |
| `interval` | enum | day, week, month (default: day) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc-1",
      "name": "Ví tiền mặt"
    },
    "period": {
      "from": "2026-09-01",
      "to": "2026-10-11",
      "interval": "day"
    },
    "balance_history": [
      {
        "date": "2026-09-01",
        "balance": 800000,
        "income": 0,
        "expense": 0,
        "net_change": 0
      },
      {
        "date": "2026-09-02",
        "balance": 750000,
        "income": 0,
        "expense": 50000,
        "net_change": -50000
      }
      // ... more days
    ],
    "summary": {
      "starting_balance": 800000,
      "ending_balance": 1000000,
      "total_income": 5000000,
      "total_expense": 4800000,
      "net_change": 200000,
      "highest_balance": 1200000,
      "lowest_balance": 600000
    }
  }
}
```

---

## 🔗 Link Bank Account

Liên kết với tài khoản ngân hàng thật (Open Banking).

### Request

```http
POST /api/v1/accounts/{id}/link-bank
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bank_id": "bank-techcombank",
  "account_number": "1234567890",
  "account_holder_name": "NGUYEN VAN A",
  "consent_token": "consent-token-from-bank"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "account_id": "acc-1",
    "linked": true,
    "bank": {
      "id": "bank-techcombank",
      "name": "Techcombank",
      "logo_url": "https://..."
    },
    "sync_enabled": true,
    "last_synced_at": "2026-10-11T10:00:00Z",
    "consent_expires_at": "2027-10-11T10:00:00Z"
  },
  "message": "Đã liên kết với ngân hàng thành công"
}
```

---

## 🔄 Sync Bank Balance

Đồng bộ số dư từ ngân hàng.

### Request

```http
POST /api/v1/accounts/{id}/sync-balance
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "account_id": "acc-1",
    "old_balance": 50000000,
    "new_balance": 50500000,
    "synced_at": "2026-10-11T10:30:00Z",
    "transactions_imported": 5,
    "new_transactions": [
      {
        "id": "tx-imported-1",
        "amount": 500000,
        "description": "Chuyển khoản đến",
        "date": "2026-10-10"
      }
    ]
  },
  "message": "Đã đồng bộ thành công. Tìm thấy 5 giao dịch mới."
}
```

---

## 🧪 Testing

### Test Accounts

```json
{
  "cash_wallet": {
    "name": "Test Cash Wallet",
    "type": "CASH",
    "balance": 1000000
  },
  "bank_account": {
    "name": "Test Bank Account",
    "type": "BANK_ACCOUNT",
    "bank_id": "bank-test",
    "balance": 10000000
  },
  "credit_card": {
    "name": "Test Credit Card",
    "type": "CREDIT_CARD",
    "balance": -500000,
    "credit_limit": 20000000
  }
}
```

---

## 🔗 Related APIs

- [Transactions API](04-transactions-api.md)
- [Assets API](03-assets-api.md) *(coming soon)*
- [Reports API](18-reports-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
