# API Recurring Transactions & Schedules

**Module:** Recurring & Reminders  
**Base Path:** `/api/v1/schedules`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/schedules` | Tạo lịch định kỳ mới | ✅ |
| GET | `/schedules` | Danh sách lịch định kỳ | ✅ |
| GET | `/schedules/{id}` | Chi tiết lịch | ✅ |
| PUT | `/schedules/{id}` | Cập nhật lịch | ✅ |
| DELETE | `/schedules/{id}` | Xóa lịch | ✅ |
| POST | `/schedules/{id}/pause` | Tạm dừng lịch | ✅ |
| POST | `/schedules/{id}/resume` | Tiếp tục lịch | ✅ |
| GET | `/schedules/{id}/occurrences` | Các lần sắp tới | ✅ |
| POST | `/schedules/{id}/occurrences/{occ_id}/skip` | Bỏ qua lần này | ✅ |
| POST | `/schedules/{id}/occurrences/{occ_id}/execute` | Thực hiện ngay | ✅ |

---

## ➕ Create Schedule

Tạo lịch định kỳ hoặc nhắc nhở.

### Request - Recurring Transaction

```http
POST /api/v1/schedules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "schedule_type": "TRANSACTION",
  "name": "Lương hàng tháng",
  "recurrence_rule": "FREQ=MONTHLY;BYMONTHDAY=1",
  "start_date": "2026-11-01",
  "end_date": null,
  "transaction_template": {
    "transaction_type": "INCOME",
    "account_id": "account-bank",
    "amount": 15000000,
    "currency_code": "VND",
    "description": "Lương tháng",
    "category_id": "cat-salary"
  },
  "auto_execute": true,
  "notification_enabled": true,
  "notification_time_before_minutes": 60
}
```

### Request - Reminder

```http
POST /api/v1/schedules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "schedule_type": "REMINDER",
  "name": "Nhắc trả tiền điện",
  "recurrence_rule": "FREQ=MONTHLY;BYMONTHDAY=5",
  "start_date": "2026-11-05",
  "reminder_message": "Nhớ trả tiền điện trước ngày 10",
  "notification_enabled": true,
  "notification_channels": ["PUSH", "EMAIL"]
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "schedule_type": "TRANSACTION",
    "name": "Lương hàng tháng",
    "recurrence_rule": "FREQ=MONTHLY;BYMONTHDAY=1",
    "recurrence_text": "Hàng tháng vào ngày 1",
    "start_date": "2026-11-01",
    "next_occurrence": "2026-11-01",
    "status": "ACTIVE",
    "auto_execute": true,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Lịch định kỳ đã được tạo thành công"
}
```

### Recurrence Rules (iCalendar format)

**Daily:**
- `FREQ=DAILY` - Hàng ngày
- `FREQ=DAILY;INTERVAL=2` - 2 ngày 1 lần

**Weekly:**
- `FREQ=WEEKLY;BYDAY=MO,WE,FR` - Thứ 2, 4, 6 hàng tuần

**Monthly:**
- `FREQ=MONTHLY;BYMONTHDAY=1` - Ngày 1 hàng tháng
- `FREQ=MONTHLY;BYDAY=-1FR` - Thứ 6 cuối cùng của tháng

**Yearly:**
- `FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1` - Ngày 1/1 hàng năm

---

## 📋 List Schedules

Danh sách lịch định kỳ.

### Request

```http
GET /api/v1/schedules?schedule_type=TRANSACTION&status=ACTIVE
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "schedule-1",
        "schedule_type": "TRANSACTION",
        "name": "Lương hàng tháng",
        "recurrence_text": "Hàng tháng vào ngày 1",
        "next_occurrence": "2026-11-01",
        "status": "ACTIVE",
        "transaction_template": {
          "type": "INCOME",
          "amount": 15000000,
          "category": "Lương"
        },
        "total_executed": 10,
        "last_executed": "2026-10-01"
      },
      {
        "id": "schedule-2",
        "schedule_type": "REMINDER",
        "name": "Nhắc trả tiền điện",
        "recurrence_text": "Hàng tháng vào ngày 5",
        "next_occurrence": "2026-11-05",
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

## 🔍 Get Schedule Detail

Chi tiết lịch với lịch sử.

### Request

```http
GET /api/v1/schedules/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "schedule_type": "TRANSACTION",
    "name": "Lương hàng tháng",
    "recurrence_rule": "FREQ=MONTHLY;BYMONTHDAY=1",
    "recurrence_text": "Hàng tháng vào ngày 1",
    "start_date": "2026-01-01",
    "end_date": null,
    "next_occurrence": "2026-11-01",
    "status": "ACTIVE",
    "transaction_template": {
      "transaction_type": "INCOME",
      "account_id": "account-bank",
      "account_name": "Techcombank",
      "amount": 15000000,
      "currency_code": "VND",
      "description": "Lương tháng",
      "category_id": "cat-salary",
      "category_name": "Lương"
    },
    "auto_execute": true,
    "notification_enabled": true,
    "notification_time_before_minutes": 60,
    "statistics": {
      "total_occurrences": 10,
      "executed": 9,
      "skipped": 1,
      "pending": 0,
      "total_amount": 135000000
    },
    "recent_occurrences": [
      {
        "id": "occ-1",
        "scheduled_date": "2026-10-01",
        "status": "EXECUTED",
        "transaction_id": "tx-uuid",
        "executed_at": "2026-10-01T08:00:00Z"
      },
      {
        "id": "occ-2",
        "scheduled_date": "2026-09-01",
        "status": "SKIPPED",
        "skip_reason": "Nhận lương sớm",
        "skipped_at": "2026-08-30T10:00:00Z"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## ⏸️ Pause Schedule

Tạm dừng lịch.

### Request

```http
POST /api/v1/schedules/{id}/pause
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Nghỉ việc tạm thời"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "status": "PAUSED",
    "paused_at": "2026-10-11T10:00:00Z"
  },
  "message": "Lịch đã được tạm dừng"
}
```

---

## ▶️ Resume Schedule

Tiếp tục lịch đã tạm dừng.

### Request

```http
POST /api/v1/schedules/{id}/resume
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "status": "ACTIVE",
    "next_occurrence": "2026-11-01"
  },
  "message": "Lịch đã được kích hoạt lại"
}
```

---

## 📅 Get Upcoming Occurrences

Các lần sắp tới trong 3 tháng.

### Request

```http
GET /api/v1/schedules/{id}/occurrences?months_ahead=3
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "schedule-uuid",
      "name": "Lương hàng tháng"
    },
    "occurrences": [
      {
        "id": "occ-future-1",
        "scheduled_date": "2026-11-01",
        "status": "PENDING",
        "days_until": 21
      },
      {
        "id": "occ-future-2",
        "scheduled_date": "2026-12-01",
        "status": "PENDING",
        "days_until": 52
      },
      {
        "id": "occ-future-3",
        "scheduled_date": "2027-01-01",
        "status": "PENDING",
        "days_until": 83
      }
    ]
  }
}
```

---

## ⏭️ Skip Occurrence

Bỏ qua 1 lần trong lịch.

### Request

```http
POST /api/v1/schedules/{id}/occurrences/{occ_id}/skip
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "skip_reason": "Đã nhận lương sớm"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "occurrence_id": "occ-uuid",
    "status": "SKIPPED",
    "next_occurrence": "2026-12-01"
  },
  "message": "Đã bỏ qua lần này"
}
```

---

## ▶️ Execute Now

Thực hiện ngay (trước hạn).

### Request

```http
POST /api/v1/schedules/{id}/occurrences/{occ_id}/execute
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "execute_date": "2026-10-11"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "occurrence_id": "occ-uuid",
    "status": "EXECUTED",
    "transaction_id": "tx-created-uuid",
    "executed_at": "2026-10-11T10:30:00Z"
  },
  "message": "Giao dịch đã được tạo thành công"
}
```

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
