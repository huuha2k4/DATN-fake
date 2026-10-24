# API Debt Management

**Module:** Debts & Loans  
**Base Path:** `/api/v1/debts`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/debts` | Tạo khoản nợ mới | ✅ |
| GET | `/debts` | Danh sách khoản nợ | ✅ |
| GET | `/debts/{id}` | Chi tiết khoản nợ | ✅ |
| PUT | `/debts/{id}` | Cập nhật khoản nợ | ✅ |
| DELETE | `/debts/{id}` | Xóa khoản nợ | ✅ |
| POST | `/debts/{id}/payments` | Ghi nhận trả nợ | ✅ |
| GET | `/debts/{id}/schedule` | Lịch trả nợ | ✅ |
| GET | `/debts/summary` | Tổng quan nợ | ✅ |

---

## ➕ Create Debt

Tạo khoản nợ mới (vay/cho vay).

### Request - Borrowing (Đi vay)

```http
POST /api/v1/debts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "debt_type": "BORROWING",
  "creditor_name": "Ngân hàng Techcombank",
  "principal_amount": 500000000,
  "currency_code": "VND",
  "interest_rate": 12.5,
  "interest_type": "FIXED",
  "start_date": "2026-01-01",
  "due_date": "2031-01-01",
  "payment_frequency": "MONTHLY",
  "monthly_payment": 11000000,
  "description": "Vay mua nhà",
  "account_id": "account-bank",
  "category_id": "cat-debt-payment",
  "reminder_enabled": true,
  "reminder_days_before": 3
}
```

### Request - Lending (Cho vay)

```http
POST /api/v1/debts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "debt_type": "LENDING",
  "debtor_name": "Nguyễn Văn A",
  "debtor_phone": "+84901234567",
  "principal_amount": 50000000,
  "currency_code": "VND",
  "interest_rate": 0,
  "start_date": "2026-10-01",
  "due_date": "2027-10-01",
  "description": "Cho bạn vay",
  "reminder_enabled": true
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "debt-uuid",
    "debt_type": "BORROWING",
    "creditor_name": "Ngân hàng Techcombank",
    "principal_amount": 500000000,
    "paid_amount": 0,
    "remaining_amount": 500000000,
    "percentage_paid": 0,
    "interest_rate": 12.5,
    "status": "ACTIVE",
    "start_date": "2026-01-01",
    "due_date": "2031-01-01",
    "months_remaining": 60,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Khoản nợ đã được tạo thành công"
}
```

---

## 📋 List Debts

Danh sách khoản nợ.

### Request

```http
GET /api/v1/debts?debt_type=BORROWING&status=ACTIVE
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "debts": [
      {
        "id": "debt-1",
        "debt_type": "BORROWING",
        "creditor_name": "Ngân hàng Techcombank",
        "principal_amount": 500000000,
        "paid_amount": 55000000,
        "remaining": 445000000,
        "percentage_paid": 11,
        "status": "ACTIVE",
        "due_date": "2031-01-01",
        "next_payment_date": "2026-11-01",
        "next_payment_amount": 11000000
      },
      {
        "id": "debt-2",
        "debt_type": "LENDING",
        "debtor_name": "Nguyễn Văn A",
        "principal_amount": 50000000,
        "paid_amount": 0,
        "remaining": 50000000,
        "percentage_paid": 0,
        "status": "ACTIVE",
        "due_date": "2027-10-01"
      }
    ],
    "summary": {
      "total_borrowing": 445000000,
      "total_lending": 50000000,
      "net_debt": 395000000
    }
  }
}
```

---

## 🔍 Get Debt Detail

Chi tiết khoản nợ với lịch sử trả.

### Request

```http
GET /api/v1/debts/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "debt-uuid",
    "debt_type": "BORROWING",
    "creditor_name": "Ngân hàng Techcombank",
    "creditor_phone": "+84241234567",
    "principal_amount": 500000000,
    "paid_amount": 55000000,
    "remaining_amount": 445000000,
    "percentage_paid": 11,
    "interest_rate": 12.5,
    "interest_type": "FIXED",
    "total_interest_paid": 5500000,
    "currency_code": "VND",
    "status": "ACTIVE",
    "start_date": "2026-01-01",
    "due_date": "2031-01-01",
    "payment_frequency": "MONTHLY",
    "monthly_payment": 11000000,
    "months_total": 60,
    "months_paid": 5,
    "months_remaining": 55,
    "next_payment_date": "2026-11-01",
    "description": "Vay mua nhà",
    "account": {
      "id": "account-bank",
      "name": "Techcombank"
    },
    "reminder_enabled": true,
    "reminder_days_before": 3,
    "payments": [
      {
        "id": "payment-1",
        "amount": 11000000,
        "principal_paid": 9900000,
        "interest_paid": 1100000,
        "payment_date": "2026-10-01",
        "note": "Trả nợ tháng 10"
      },
      {
        "id": "payment-2",
        "amount": 11000000,
        "principal_paid": 10000000,
        "interest_paid": 1000000,
        "payment_date": "2026-09-01"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## 💰 Record Payment

Ghi nhận trả nợ.

### Request

```http
POST /api/v1/debts/{id}/payments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 11000000,
  "principal_paid": 9900000,
  "interest_paid": 1100000,
  "payment_date": "2026-11-01",
  "payment_method": "BANK_TRANSFER",
  "account_id": "account-bank",
  "note": "Trả nợ tháng 11",
  "create_transaction": true
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "payment_id": "payment-uuid",
    "debt_id": "debt-uuid",
    "amount": 11000000,
    "principal_paid": 9900000,
    "interest_paid": 1100000,
    "new_remaining": 435100000,
    "new_percentage_paid": 13,
    "transaction_id": "tx-uuid",
    "payment_date": "2026-11-01"
  },
  "message": "Đã ghi nhận trả nợ thành công"
}
```

---

## 📅 Payment Schedule

Lịch trả nợ dự kiến.

### Request

```http
GET /api/v1/debts/{id}/schedule
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "debt": {
      "id": "debt-uuid",
      "creditor_name": "Ngân hàng Techcombank",
      "principal_amount": 500000000
    },
    "schedule": [
      {
        "payment_number": 6,
        "due_date": "2026-11-01",
        "amount": 11000000,
        "principal": 9950000,
        "interest": 1050000,
        "remaining_after": 435050000,
        "status": "PENDING"
      },
      {
        "payment_number": 7,
        "due_date": "2026-12-01",
        "amount": 11000000,
        "principal": 10000000,
        "interest": 1000000,
        "remaining_after": 425050000,
        "status": "PENDING"
      }
    ],
    "summary": {
      "total_payments": 60,
      "completed_payments": 5,
      "total_to_pay": 660000000,
      "total_principal": 500000000,
      "total_interest": 160000000
    }
  }
}
```

---

## 📊 Debts Summary

Tổng quan tất cả khoản nợ.

### Request

```http
GET /api/v1/debts/summary
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "borrowing": {
      "total_count": 2,
      "active_count": 2,
      "total_principal": 550000000,
      "total_paid": 60000000,
      "total_remaining": 490000000,
      "monthly_payment": 12000000,
      "total_interest_paid": 6000000
    },
    "lending": {
      "total_count": 3,
      "active_count": 2,
      "total_principal": 100000000,
      "total_paid": 20000000,
      "total_remaining": 80000000
    },
    "net_position": {
      "net_debt": 410000000,
      "debt_to_asset_ratio": 15.2
    },
    "upcoming_payments": [
      {
        "debt_id": "debt-1",
        "creditor_name": "Ngân hàng Techcombank",
        "amount": 11000000,
        "due_date": "2026-11-01",
        "days_until": 21
      }
    ]
  }
}
```

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
