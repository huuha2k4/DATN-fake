# API Financial Goals

**Module:** Goals & Savings  
**Base Path:** `/api/v1/goals`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/goals` | Tạo mục tiêu mới | ✅ |
| GET | `/goals` | Danh sách mục tiêu | ✅ |
| GET | `/goals/{id}` | Chi tiết mục tiêu | ✅ |
| PUT | `/goals/{id}` | Cập nhật mục tiêu | ✅ |
| DELETE | `/goals/{id}` | Xóa mục tiêu | ✅ |
| POST | `/goals/{id}/contribute` | Đóng góp vào mục tiêu | ✅ |
| GET | `/goals/{id}/progress` | Tiến độ chi tiết | ✅ |
| POST | `/goals/{id}/milestones` | Tạo milestone | ✅ |
| PUT | `/goals/{id}/complete` | Đánh dấu hoàn thành | ✅ |
| GET | `/goals/summary` | Tổng quan mục tiêu | ✅ |

---

## ➕ Create Goal

Tạo mục tiêu tài chính mới.

### Request

```http
POST /api/v1/goals
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Mua iPhone 16 Pro",
  "goal_type": "PURCHASE",
  "target_amount": 30000000,
  "current_amount": 5000000,
  "currency_code": "VND",
  "target_date": "2027-06-01",
  "priority": "HIGH",
  "icon": "📱",
  "color": "#9C27B0",
  "description": "Tiết kiệm để mua iPhone mới nhất",
  "auto_save_enabled": true,
  "auto_save_amount": 1000000,
  "auto_save_frequency": "MONTHLY",
  "account_id": "account-savings"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "goal-uuid",
    "name": "Mua iPhone 16 Pro",
    "goal_type": "PURCHASE",
    "target_amount": 30000000,
    "current_amount": 5000000,
    "remaining": 25000000,
    "percentage_complete": 16.7,
    "status": "IN_PROGRESS",
    "target_date": "2027-06-01",
    "days_remaining": 234,
    "suggested_monthly_saving": 3571429,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Mục tiêu đã được tạo thành công"
}
```

### Goal Types

- `EMERGENCY_FUND`: Quỹ khẩn cấp
- `PURCHASE`: Mua sắm (xe, nhà, điện thoại...)
- `VACATION`: Du lịch
- `EDUCATION`: Học tập
- `RETIREMENT`: Hưu trí
- `DEBT_PAYOFF`: Trả nợ
- `INVESTMENT`: Đầu tư
- `OTHER`: Khác

---

## 📋 List Goals

Danh sách mục tiêu.

### Request

```http
GET /api/v1/goals?status=IN_PROGRESS&sort_by=progress
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "id": "goal-1",
        "name": "Mua iPhone 16 Pro",
        "goal_type": "PURCHASE",
        "target_amount": 30000000,
        "current_amount": 5000000,
        "percentage_complete": 16.7,
        "status": "IN_PROGRESS",
        "target_date": "2027-06-01",
        "days_remaining": 234,
        "icon": "📱",
        "color": "#9C27B0"
      },
      {
        "id": "goal-2",
        "name": "Du lịch Nhật Bản",
        "goal_type": "VACATION",
        "target_amount": 50000000,
        "current_amount": 35000000,
        "percentage_complete": 70,
        "status": "IN_PROGRESS",
        "target_date": "2027-03-01",
        "days_remaining": 142,
        "icon": "🗾"
      }
    ],
    "summary": {
      "total_goals": 5,
      "in_progress": 3,
      "completed": 2,
      "total_target": 150000000,
      "total_saved": 85000000
    }
  }
}
```

---

## 🔍 Get Goal Detail

Chi tiết mục tiêu với lịch sử đóng góp.

### Request

```http
GET /api/v1/goals/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "goal-uuid",
    "name": "Mua iPhone 16 Pro",
    "goal_type": "PURCHASE",
    "target_amount": 30000000,
    "current_amount": 5000000,
    "remaining": 25000000,
    "percentage_complete": 16.7,
    "currency_code": "VND",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "icon": "📱",
    "color": "#9C27B0",
    "description": "Tiết kiệm để mua iPhone mới nhất",
    "target_date": "2027-06-01",
    "days_total": 600,
    "days_elapsed": 366,
    "days_remaining": 234,
    "suggested_monthly_saving": 3571429,
    "auto_save": {
      "enabled": true,
      "amount": 1000000,
      "frequency": "MONTHLY",
      "next_contribution_date": "2026-11-01"
    },
    "progress": {
      "on_track": false,
      "expected_amount_by_now": 18000000,
      "ahead_behind": -13000000,
      "completion_forecast_date": "2027-12-15"
    },
    "contributions": [
      {
        "id": "contrib-1",
        "amount": 5000000,
        "note": "Khởi đầu",
        "contributed_at": "2024-08-01T00:00:00Z"
      }
    ],
    "milestones": [
      {
        "id": "milestone-1",
        "percentage": 25,
        "target_amount": 7500000,
        "achieved": false
      },
      {
        "id": "milestone-2",
        "percentage": 50,
        "target_amount": 15000000,
        "achieved": false
      }
    ],
    "created_at": "2024-08-01T00:00:00Z"
  }
}
```

---

## 💰 Contribute to Goal

Đóng góp tiền vào mục tiêu.

### Request

```http
POST /api/v1/goals/{id}/contribute
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 2000000,
  "note": "Tiết kiệm tháng 11",
  "source_account_id": "account-bank"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "contribution_id": "contrib-uuid",
    "goal_id": "goal-uuid",
    "amount": 2000000,
    "new_current_amount": 7000000,
    "new_percentage": 23.3,
    "remaining": 23000000,
    "contributed_at": "2026-10-11T10:00:00Z"
  },
  "message": "Đã đóng góp 2.000.000₫ vào mục tiêu"
}
```

---

## 📊 Goal Progress

Tiến độ chi tiết theo thời gian.

### Request

```http
GET /api/v1/goals/{id}/progress
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "goal": {
      "id": "goal-uuid",
      "name": "Mua iPhone 16 Pro"
    },
    "current_status": {
      "percentage_complete": 23.3,
      "on_track": false,
      "expected_percentage_by_now": 61,
      "behind_by_percentage": 37.7
    },
    "forecast": {
      "expected_completion_date": "2027-12-15",
      "behind_schedule_days": 197,
      "need_to_save_monthly": 3285714
    },
    "history": [
      {
        "date": "2024-08-01",
        "amount": 5000000,
        "percentage": 16.7
      },
      {
        "date": "2026-10-11",
        "amount": 7000000,
        "percentage": 23.3
      }
    ],
    "chart_data": [
      {"month": "2024-08", "actual": 5000000, "target": 1500000},
      {"month": "2024-09", "actual": 5000000, "target": 3000000}
    ]
  }
}
```

---

## 🎯 Create Milestone

Tạo milestone cho mục tiêu.

### Request

```http
POST /api/v1/goals/{id}/milestones
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Đạt 50%",
  "percentage": 50,
  "target_amount": 15000000,
  "reward": "Tự thưởng ăn buffet"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "milestone-uuid",
    "name": "Đạt 50%",
    "percentage": 50,
    "target_amount": 15000000,
    "achieved": false,
    "reward": "Tự thưởng ăn buffet"
  }
}
```

---

## ✅ Complete Goal

Đánh dấu hoàn thành (manual).

### Request

```http
PUT /api/v1/goals/{id}/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "completed_note": "Đã mua iPhone 16 Pro Max 256GB",
  "actual_amount_used": 29500000
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "goal-uuid",
    "status": "ACHIEVED",
    "completed_at": "2026-10-11T10:00:00Z",
    "days_to_complete": 434,
    "saved_amount": 30000000,
    "actual_used": 29500000,
    "leftover": 500000
  },
  "message": "🎉 Chúc mừng! Bạn đã hoàn thành mục tiêu"
}
```

---

## 📊 Goals Summary

Tổng quan tất cả mục tiêu.

### Request

```http
GET /api/v1/goals/summary
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_goals": 5,
      "in_progress": 3,
      "completed": 2,
      "on_track": 1,
      "behind_schedule": 2,
      "total_target_amount": 150000000,
      "total_saved": 85000000,
      "overall_progress": 56.7
    },
    "by_type": [
      {
        "type": "PURCHASE",
        "count": 2,
        "total_target": 80000000,
        "total_saved": 40000000
      }
    ],
    "upcoming_milestones": [
      {
        "goal_name": "Du lịch Nhật Bản",
        "milestone": "80%",
        "amount_needed": 5000000,
        "estimated_date": "2026-12-01"
      }
    ]
  }
}
```

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
