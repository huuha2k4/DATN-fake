# API Budgets

**Module:** Budgets & Budget Management  
**Base Path:** `/api/v1/budgets`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/budgets` | Tạo ngân sách mới | ✅ |
| GET | `/budgets` | Danh sách ngân sách | ✅ |
| GET | `/budgets/{id}` | Chi tiết ngân sách | ✅ |
| PUT | `/budgets/{id}` | Cập nhật ngân sách | ✅ |
| DELETE | `/budgets/{id}` | Xóa ngân sách | ✅ |
| GET | `/budgets/{id}/status` | Trạng thái chi tiêu hiện tại | ✅ |
| POST | `/budgets/{id}/items` | Thêm budget item (category) | ✅ |
| PUT | `/budgets/{id}/items/{item_id}` | Cập nhật budget item | ✅ |
| DELETE | `/budgets/{id}/items/{item_id}` | Xóa budget item | ✅ |
| GET | `/budgets/summary` | Tổng quan tất cả ngân sách | ✅ |
| POST | `/budgets/{id}/duplicate` | Copy ngân sách sang kỳ khác | ✅ |

---

## ➕ Create Budget

Tạo ngân sách cho một kỳ.

### Request - Monthly Budget

```http
POST /api/v1/budgets
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Ngân sách tháng 11/2026",
  "period_type": "MONTHLY",
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "total_amount": 15000000,
  "currency_code": "VND",
  "rollover_enabled": false,
  "alert_threshold_percentage": 80,
  "items": [
    {
      "category_id": "cat-food-drinks",
      "amount": 5000000,
      "alert_threshold_percentage": 80
    },
    {
      "category_id": "cat-transport",
      "amount": 3000000,
      "alert_threshold_percentage": 85
    },
    {
      "category_id": "cat-shopping",
      "amount": 4000000,
      "alert_threshold_percentage": 75
    },
    {
      "category_id": "cat-entertainment",
      "amount": 3000000,
      "alert_threshold_percentage": 80
    }
  ]
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "budget-uuid",
    "name": "Ngân sách tháng 11/2026",
    "period_type": "MONTHLY",
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "total_amount": 15000000,
    "spent_amount": 0,
    "remaining_amount": 15000000,
    "percentage_used": 0,
    "currency_code": "VND",
    "status": "ON_TRACK",
    "items": [
      {
        "id": "item-1",
        "category": {
          "id": "cat-food-drinks",
          "name": "Ăn uống",
          "icon": "🍔"
        },
        "amount": 5000000,
        "spent_amount": 0,
        "remaining": 5000000,
        "percentage_used": 0,
        "alert_level": "OK"
      }
    ],
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Ngân sách đã được tạo thành công"
}
```

### Validation Rules

- `period_type`: Enum [DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
- `start_date`, `end_date`: Required
- `total_amount`: > 0, sum of items.amount (nếu có items)
- `items.category_id`: Unique per budget
- `alert_threshold_percentage`: 0-100

---

## 📋 List Budgets

Danh sách ngân sách.

### Request

```http
GET /api/v1/budgets?status=ACTIVE&period_type=MONTHLY&year=2026
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `status` | enum | ACTIVE, COMPLETED, EXCEEDED, CANCELLED |
| `period_type` | enum | MONTHLY, QUARTERLY, YEARLY |
| `year` | int | Năm |
| `month` | int | Tháng (1-12) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "budget-1",
        "name": "Ngân sách tháng 11/2026",
        "period_type": "MONTHLY",
        "start_date": "2026-11-01",
        "end_date": "2026-11-30",
        "total_amount": 15000000,
        "spent_amount": 8500000,
        "remaining": 6500000,
        "percentage_used": 56.7,
        "status": "ON_TRACK",
        "alert_level": "OK",
        "days_remaining": 20,
        "items_count": 4,
        "categories_exceeded": 0
      },
      {
        "id": "budget-2",
        "name": "Ngân sách tháng 10/2026",
        "period_type": "MONTHLY",
        "start_date": "2026-10-01",
        "end_date": "2026-10-31",
        "total_amount": 15000000,
        "spent_amount": 16200000,
        "remaining": -1200000,
        "percentage_used": 108,
        "status": "EXCEEDED",
        "alert_level": "CRITICAL",
        "items_count": 4,
        "categories_exceeded": 2
      }
    ],
    "summary": {
      "total_budgets": 12,
      "active_budgets": 1,
      "on_track": 1,
      "warning": 0,
      "exceeded": 0
    }
  }
}
```

---

## 🔍 Get Budget Detail

Chi tiết ngân sách với breakdown theo category.

### Request

```http
GET /api/v1/budgets/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "budget-uuid",
    "name": "Ngân sách tháng 11/2026",
    "period_type": "MONTHLY",
    "start_date": "2026-11-01",
    "end_date": "2026-11-30",
    "total_amount": 15000000,
    "spent_amount": 8500000,
    "remaining": 6500000,
    "percentage_used": 56.7,
    "currency_code": "VND",
    "status": "ON_TRACK",
    "alert_level": "OK",
    "rollover_enabled": false,
    "alert_threshold_percentage": 80,
    "days_total": 30,
    "days_elapsed": 10,
    "days_remaining": 20,
    "daily_budget_remaining": 325000,
    "projected_spending": 13500000,
    "items": [
      {
        "id": "item-1",
        "category": {
          "id": "cat-food-drinks",
          "name": "Ăn uống",
          "icon": "🍔",
          "color": "#FF6B6B"
        },
        "amount": 5000000,
        "spent_amount": 3200000,
        "remaining": 1800000,
        "percentage_used": 64,
        "alert_level": "OK",
        "alert_threshold_percentage": 80,
        "daily_average": 320000,
        "projected_total": 4800000,
        "on_track": true,
        "transaction_count": 45
      },
      {
        "id": "item-2",
        "category": {
          "id": "cat-transport",
          "name": "Di chuyển",
          "icon": "🚗",
          "color": "#4D96FF"
        },
        "amount": 3000000,
        "spent_amount": 2800000,
        "remaining": 200000,
        "percentage_used": 93.3,
        "alert_level": "CRITICAL",
        "alert_threshold_percentage": 85,
        "daily_average": 280000,
        "projected_total": 3200000,
        "on_track": false,
        "transaction_count": 28
      }
    ],
    "top_expenses": [
      {
        "transaction_id": "tx-1",
        "amount": 500000,
        "description": "Xăng xe",
        "category": "Di chuyển",
        "date": "2026-11-05"
      }
    ],
    "created_at": "2026-10-25T10:00:00Z",
    "updated_at": "2026-11-10T15:30:00Z"
  }
}
```

**Alert Levels:**
- `OK`: < 80% (hoặc threshold)
- `WARNING`: 80-100%
- `CRITICAL`: > 100%

**Status:**
- `ON_TRACK`: Đang đi đúng hướng
- `WARNING`: Sắp vượt ngân sách
- `EXCEEDED`: Đã vượt ngân sách
- `COMPLETED`: Kỳ đã kết thúc

---

## ✏️ Update Budget

Cập nhật ngân sách.

### Request

```http
PUT /api/v1/budgets/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Ngân sách tháng 11 (Điều chỉnh)",
  "total_amount": 16000000,
  "alert_threshold_percentage": 85
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "budget-uuid",
    "name": "Ngân sách tháng 11 (Điều chỉnh)",
    "total_amount": 16000000,
    "percentage_used": 53.1,
    "updated_at": "2026-11-10T16:00:00Z"
  },
  "message": "Ngân sách đã được cập nhật"
}
```

---

## 🗑️ Delete Budget

Xóa ngân sách.

### Request

```http
DELETE /api/v1/budgets/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Ngân sách đã được xóa"
}
```

---

## 📊 Budget Status

Trạng thái chi tiêu real-time.

### Request

```http
GET /api/v1/budgets/{id}/status
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "budget_id": "budget-uuid",
    "status": "WARNING",
    "alert_level": "WARNING",
    "total_amount": 15000000,
    "spent_amount": 12500000,
    "remaining": 2500000,
    "percentage_used": 83.3,
    "days_remaining": 20,
    "daily_budget_remaining": 125000,
    "projected_spending": 16000000,
    "projected_overspend": 1000000,
    "categories_at_risk": [
      {
        "category_id": "cat-transport",
        "category_name": "Di chuyển",
        "percentage_used": 93.3,
        "alert_level": "CRITICAL"
      }
    ],
    "recommendations": [
      "Giảm chi tiêu di chuyển 200K để không vượt ngân sách",
      "Còn 20 ngày, nên chi tối đa 125K/ngày"
    ]
  }
}
```

---

## ➕ Add Budget Item

Thêm category vào ngân sách.

### Request

```http
POST /api/v1/budgets/{id}/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "category_id": "cat-health",
  "amount": 2000000,
  "alert_threshold_percentage": 80
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "item-uuid",
    "category": {
      "id": "cat-health",
      "name": "Sức khỏe",
      "icon": "💊"
    },
    "amount": 2000000,
    "spent_amount": 0,
    "percentage_used": 0,
    "alert_level": "OK"
  },
  "message": "Đã thêm danh mục vào ngân sách"
}
```

---

## ✏️ Update Budget Item

Cập nhật hạn mức category.

### Request

```http
PUT /api/v1/budgets/{id}/items/{item_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 6000000,
  "alert_threshold_percentage": 75
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "item-uuid",
    "amount": 6000000,
    "spent_amount": 3200000,
    "percentage_used": 53.3,
    "alert_level": "OK"
  }
}
```

---

## 🗑️ Delete Budget Item

Xóa category khỏi ngân sách.

### Request

```http
DELETE /api/v1/budgets/{id}/items/{item_id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Đã xóa danh mục khỏi ngân sách"
}
```

---

## 📊 Budgets Summary

Tổng quan tất cả ngân sách.

### Request

```http
GET /api/v1/budgets/summary?period=current_month
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "current_period": {
      "name": "Tháng 11/2026",
      "start_date": "2026-11-01",
      "end_date": "2026-11-30",
      "total_budgeted": 15000000,
      "total_spent": 8500000,
      "total_remaining": 6500000,
      "percentage_used": 56.7,
      "status": "ON_TRACK",
      "days_remaining": 20
    },
    "by_category": [
      {
        "category": "Ăn uống",
        "budgeted": 5000000,
        "spent": 3200000,
        "percentage": 64,
        "status": "ON_TRACK"
      },
      {
        "category": "Di chuyển",
        "budgeted": 3000000,
        "spent": 2800000,
        "percentage": 93.3,
        "status": "WARNING"
      }
    ],
    "performance": {
      "months_on_track": 8,
      "months_exceeded": 2,
      "success_rate": 80,
      "average_utilization": 87.5
    },
    "trends": {
      "vs_last_month": {
        "spending_change": -5.2,
        "direction": "DOWN"
      },
      "vs_avg_3_months": {
        "spending_change": 2.1,
        "direction": "UP"
      }
    }
  }
}
```

---

## 📋 Duplicate Budget

Copy ngân sách sang kỳ khác.

### Request

```http
POST /api/v1/budgets/{id}/duplicate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Ngân sách tháng 12/2026",
  "start_date": "2026-12-01",
  "end_date": "2026-12-31",
  "adjust_amounts": {
    "percentage": 5,
    "reason": "Inflation adjustment"
  }
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "new-budget-uuid",
    "name": "Ngân sách tháng 12/2026",
    "total_amount": 15750000,
    "items_count": 4,
    "duplicated_from": "budget-uuid"
  },
  "message": "Đã tạo ngân sách mới từ template"
}
```

---

## 🔗 Related APIs

- [Transactions API](04-transactions-api.md)
- [Categories API](05-categories-api.md)
- [Insights API](13-insights-api.md)
- [Notifications API](17-notifications-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
