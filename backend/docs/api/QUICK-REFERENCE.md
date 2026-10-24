# Quick API Reference

**Tài liệu:** Tham chiếu nhanh các API chưa có spec chi tiết  
**Phiên bản:** 1.0  
**Cập nhật:** 11/10/2026

---

## 📦 Budgets API (`/api/v1/budgets`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/budgets` | Tạo ngân sách |
| GET | `/budgets` | Danh sách ngân sách |
| GET | `/budgets/{id}` | Chi tiết ngân sách |
| PUT | `/budgets/{id}` | Cập nhật ngân sách |
| DELETE | `/budgets/{id}` | Xóa ngân sách |
| GET | `/budgets/{id}/status` | Trạng thái chi tiêu hiện tại |
| GET | `/budgets/summary` | Tổng quan ngân sách |

### Create Budget

**Request:**
```json
{
  "category_id": "cat-uuid",
  "amount": 3000000,
  "currency_code": "VND",
  "period_type": "MONTHLY",
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "alert_threshold_pct": 80,
  "rollover_enabled": false
}
```

**Response:**
```json
{
  "id": "budget-uuid",
  "category_name": "Ăn uống",
  "amount": 3000000,
  "spent": 0,
  "remaining": 3000000,
  "percentage_used": 0,
  "status": "ON_TRACK"
}
```

### Budget Status

**Response:**
```json
{
  "budget_id": "budget-uuid",
  "amount": 3000000,
  "spent": 2400000,
  "remaining": 600000,
  "percentage_used": 80,
  "status": "WARNING",
  "days_remaining": 10,
  "projected_spending": 3200000,
  "daily_budget_remaining": 60000
}
```

---

## 🎯 Goals API (`/api/v1/goals`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/goals` | Tạo mục tiêu |
| GET | `/goals` | Danh sách mục tiêu |
| GET | `/goals/{id}` | Chi tiết mục tiêu |
| PUT | `/goals/{id}` | Cập nhật mục tiêu |
| DELETE | `/goals/{id}` | Xóa mục tiêu |
| POST | `/goals/{id}/contribute` | Đóng góp vào mục tiêu |
| GET | `/goals/{id}/progress` | Tiến độ mục tiêu |
| POST | `/goals/{id}/milestones` | Tạo milestone |

### Create Goal

**Request:**
```json
{
  "name": "Mua iPhone 15",
  "goal_type": "PURCHASE",
  "target_amount": 25000000,
  "current_amount": 5000000,
  "currency_code": "VND",
  "target_date": "2027-01-01",
  "priority": "HIGH",
  "auto_save_enabled": true,
  "auto_save_amount": 500000,
  "auto_save_frequency": "MONTHLY"
}
```

**Response:**
```json
{
  "id": "goal-uuid",
  "name": "Mua iPhone 15",
  "target_amount": 25000000,
  "current_amount": 5000000,
  "remaining": 20000000,
  "percentage_complete": 20,
  "status": "IN_PROGRESS",
  "target_date": "2027-01-01",
  "days_remaining": 82,
  "suggested_monthly_saving": 2500000
}
```

### Contribute to Goal

**Request:**
```json
{
  "amount": 500000,
  "note": "Tiết kiệm tháng 10"
}
```

**Response:**
```json
{
  "goal_id": "goal-uuid",
  "contribution_id": "contrib-uuid",
  "amount": 500000,
  "new_current_amount": 5500000,
  "percentage_complete": 22,
  "remaining": 19500000
}
```

---

## 📸 OCR/Receipt API (`/api/v1/ocr`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/ocr/scan` | Quét hóa đơn |
| GET | `/ocr/jobs/{id}` | Trạng thái scan |
| GET | `/ocr/receipts` | Danh sách hóa đơn |
| GET | `/ocr/receipts/{id}` | Chi tiết hóa đơn |
| PUT | `/ocr/receipts/{id}` | Chỉnh sửa kết quả OCR |

### Scan Receipt

**Request:**
```http
POST /api/v1/ocr/scan
Content-Type: multipart/form-data

image: (binary file)
language: vi
```

**Response (Async):**
```json
{
  "success": true,
  "data": {
    "job_id": "ocr-job-uuid",
    "status": "PROCESSING",
    "estimated_time": 5
  }
}
```

**Polling for Result:**
```http
GET /api/v1/ocr/jobs/{job_id}
```

**Response (Completed):**
```json
{
  "job_id": "ocr-job-uuid",
  "status": "COMPLETED",
  "receipt": {
    "id": "receipt-uuid",
    "merchant_name": "Highlands Coffee",
    "merchant_address": "123 Đường ABC, Hà Nội",
    "transaction_date": "2026-10-11",
    "transaction_time": "14:30:00",
    "total_amount": 85000,
    "currency_code": "VND",
    "items": [
      {
        "name": "Cappuccino",
        "quantity": 1,
        "unit_price": 45000,
        "amount": 45000
      },
      {
        "name": "Croissant",
        "quantity": 1,
        "unit_price": 40000,
        "amount": 40000
      }
    ],
    "tax_amount": 0,
    "confidence_score": 0.95,
    "extracted_text": "HIGHLANDS COFFEE\n...",
    "image_url": "https://cdn.finance-app.com/receipts/..."
  },
  "suggested_transaction": {
    "account_id": null,
    "amount": 85000,
    "description": "Highlands Coffee",
    "category_id": "cat-food-drinks",
    "merchant_id": "merchant-highlands",
    "transaction_date": "2026-10-11"
  }
}
```

### Create Transaction from Receipt

**Request:**
```http
POST /api/v1/ocr/receipts/{receipt_id}/create-transaction
```

**Request Body:**
```json
{
  "account_id": "acc-uuid",
  "override": {
    "amount": 85000,
    "description": "Cafe + Bánh",
    "category_id": "cat-food-drinks"
  }
}
```

---

## 📊 Insights & Analytics API (`/api/v1/insights`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/insights` | Danh sách insights |
| GET | `/insights/{id}` | Chi tiết insight |
| POST | `/insights/{id}/dismiss` | Bỏ qua insight |
| POST | `/insights/{id}/action` | Thực hiện hành động đề xuất |
| GET | `/insights/generate` | Tạo insights mới |

### Get Insights

**Request:**
```http
GET /api/v1/insights?type=SPENDING_PATTERN&severity=WARNING&is_read=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight-1",
        "type": "SPENDING_PATTERN",
        "severity": "WARNING",
        "title": "Chi tiêu ăn uống tăng 35%",
        "description": "Trong tháng này, chi tiêu ăn uống của bạn tăng 35% so với trung bình 3 tháng qua (từ 2.4 triệu lên 3.2 triệu).",
        "actionable": true,
        "action_text": "Đặt ngân sách ăn uống 2.5 triệu/tháng",
        "action_payload": {
          "type": "create_budget",
          "params": {
            "category_id": "cat-food",
            "amount": 2500000
          }
        },
        "related_data": {
          "category_id": "cat-food",
          "current_month": 3200000,
          "average_3_months": 2366667,
          "increase_percentage": 35.2
        },
        "is_read": false,
        "created_at": "2026-10-11T06:00:00Z"
      },
      {
        "id": "insight-2",
        "type": "SAVING_OPPORTUNITY",
        "severity": "INFO",
        "title": "Cơ hội tiết kiệm từ cafe",
        "description": "Bạn chi 850K/tháng cho cafe. Nếu pha cafe tại nhà, có thể tiết kiệm 600K/tháng.",
        "actionable": false,
        "related_data": {
          "current_spending": 850000,
          "potential_saving": 600000,
          "merchant_name": "Highlands Coffee"
        },
        "is_read": false,
        "created_at": "2026-10-11T06:00:00Z"
      },
      {
        "id": "insight-3",
        "type": "BUDGET_RISK",
        "severity": "CRITICAL",
        "title": "Ngân sách ăn uống sắp vượt",
        "description": "Bạn đã chi 2.4/2.5 triệu (96%) ngân sách ăn uống, còn 10 ngày trong tháng.",
        "actionable": true,
        "action_text": "Xem chi tiết chi tiêu",
        "related_data": {
          "budget_id": "budget-uuid",
          "spent": 2400000,
          "limit": 2500000,
          "days_remaining": 10
        },
        "is_read": false,
        "created_at": "2026-10-21T08:00:00Z"
      }
    ]
  }
}
```

### Execute Insight Action

**Request:**
```http
POST /api/v1/insights/{insight_id}/action
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action_type": "create_budget",
    "result": {
      "budget_id": "budget-new-uuid",
      "category_name": "Ăn uống",
      "amount": 2500000
    }
  },
  "message": "Đã tạo ngân sách ăn uống 2.5 triệu cho tháng sau"
}
```

---

## 📈 Forecasting API (`/api/v1/forecast`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/forecast/spending` | Dự báo chi tiêu |
| GET | `/forecast/balance` | Dự báo số dư |
| GET | `/forecast/goal-completion` | Dự báo hoàn thành mục tiêu |

### Spending Forecast

**Request:**
```http
GET /api/v1/forecast/spending?category_id=cat-food&months_ahead=3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-food",
      "name": "Ăn uống"
    },
    "forecasts": [
      {
        "month": "2026-11",
        "predicted_amount": 2900000,
        "confidence_interval": {
          "lower": 2600000,
          "upper": 3200000
        },
        "confidence_score": 0.85
      },
      {
        "month": "2026-12",
        "predicted_amount": 3100000,
        "confidence_interval": {
          "lower": 2800000,
          "upper": 3400000
        },
        "confidence_score": 0.80
      },
      {
        "month": "2027-01",
        "predicted_amount": 2950000,
        "confidence_interval": {
          "lower": 2700000,
          "upper": 3300000
        },
        "confidence_score": 0.78
      }
    ],
    "factors": [
      "Xu hướng tăng 15% trong 3 tháng qua",
      "Tháng 12 thường chi nhiều hơn (mùa lễ hội)",
      "Pattern: Chi nhiều vào cuối tuần"
    ]
  }
}
```

### Balance Forecast

**Request:**
```http
GET /api/v1/forecast/balance?account_id=acc-uuid&days_ahead=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc-uuid",
      "name": "Techcombank",
      "current_balance": 50000000
    },
    "forecasts": [
      {
        "date": "2026-10-12",
        "predicted_balance": 49800000,
        "expected_income": 0,
        "expected_expense": 200000
      },
      {
        "date": "2026-10-13",
        "predicted_balance": 49600000,
        "expected_income": 0,
        "expected_expense": 200000
      }
      // ... 30 days
    ],
    "summary": {
      "ending_balance": 48500000,
      "total_expected_income": 0,
      "total_expected_expense": 1500000,
      "lowest_balance": 47800000,
      "lowest_balance_date": "2026-10-25"
    },
    "warnings": [
      {
        "type": "LOW_BALANCE",
        "date": "2026-10-25",
        "balance": 47800000,
        "message": "Số dư dự kiến xuống thấp nhất trong tháng"
      }
    ]
  }
}
```

---

## 🚨 Anomaly Detection API (`/api/v1/anomalies`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/anomalies` | Danh sách bất thường |
| GET | `/anomalies/{id}` | Chi tiết bất thường |
| POST | `/anomalies/{id}/review` | Đánh dấu đã xem |
| POST | `/anomalies/{id}/mark-false-positive` | Đánh dấu nhầm |

### Get Anomalies

**Request:**
```http
GET /api/v1/anomalies?severity=HIGH&is_reviewed=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "id": "anomaly-1",
        "type": "UNUSUAL_AMOUNT",
        "severity": "HIGH",
        "description": "Giao dịch 5 triệu đồng cao hơn 10x so với trung bình chi tiêu tại merchant này",
        "anomaly_score": 0.95,
        "transaction": {
          "id": "tx-uuid",
          "amount": 5000000,
          "description": "Mua hàng",
          "merchant": "Highlands Coffee",
          "date": "2026-10-11"
        },
        "normal_range": {
          "average": 50000,
          "min": 30000,
          "max": 100000
        },
        "is_reviewed": false,
        "detected_at": "2026-10-11T09:00:00Z"
      },
      {
        "id": "anomaly-2",
        "type": "UNUSUAL_TIME",
        "severity": "MEDIUM",
        "description": "Giao dịch vào 3h sáng, khác thường so với pattern của bạn",
        "anomaly_score": 0.78,
        "transaction": {
          "id": "tx-uuid-2",
          "amount": 200000,
          "description": "Chuyển khoản",
          "date": "2026-10-11",
          "time": "03:15:00"
        },
        "is_reviewed": false,
        "detected_at": "2026-10-11T03:20:00Z"
      }
    ]
  }
}
```

---

## 📱 Notifications API (`/api/v1/notifications`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/notifications` | Danh sách thông báo |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc |
| PUT | `/notifications/{id}/read` | Đánh dấu đã đọc |
| PUT | `/notifications/read-all` | Đánh dấu tất cả đã đọc |
| DELETE | `/notifications/{id}` | Xóa thông báo |

### Get Notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-1",
        "type": "BUDGET_ALERT",
        "title": "Ngân sách ăn uống sắp vượt",
        "body": "Bạn đã chi 2.4/2.5 triệu (96%)",
        "action_url": "app://budgets/budget-uuid",
        "priority": "HIGH",
        "is_read": false,
        "created_at": "2026-10-21T08:00:00Z"
      },
      {
        "id": "notif-2",
        "type": "GOAL_ACHIEVED",
        "title": "🎉 Chúc mừng! Bạn đã đạt mục tiêu",
        "body": "Mục tiêu 'Mua iPhone 15' đã hoàn thành 100%",
        "action_url": "app://goals/goal-uuid",
        "priority": "NORMAL",
        "is_read": false,
        "created_at": "2026-10-20T15:30:00Z"
      }
    ],
    "unread_count": 2
  }
}
```

---

## 📄 Reports API (`/api/v1/reports`)

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/reports/generate` | Tạo báo cáo |
| GET | `/reports/{id}` | Tải báo cáo |
| GET | `/reports` | Danh sách báo cáo |

### Generate Report

**Request:**
```json
{
  "report_type": "MONTHLY_SUMMARY",
  "format": "PDF",
  "period": {
    "from": "2026-10-01",
    "to": "2026-10-31"
  },
  "sections": [
    "INCOME_EXPENSE",
    "BY_CATEGORY",
    "BY_MERCHANT",
    "BUDGET_PERFORMANCE",
    "INSIGHTS"
  ],
  "language": "vi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "PROCESSING",
    "estimated_time": 30
  }
}
```

**Download:**
```http
GET /api/v1/reports/{report_id}
```

Returns PDF file or JSON data.

---

## 🔗 Cross-References

Các API này liên quan chặt chẽ với nhau:

```
Transactions ←→ Categories ←→ Budgets
     ↓              ↓
   OCR          Insights
     ↓              ↓
   Chat      Anomalies
     ↓              ↓
  Sync       Notifications
```

---

**Note:** Đây là tài liệu tham chiếu nhanh. Các API này sẽ được mở rộng thành spec chi tiết trong các file riêng.

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
