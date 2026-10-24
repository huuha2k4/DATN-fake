# API Notifications

**Module:** Notifications  
**Base Path:** `/api/v1/notifications`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/notifications` | Danh sách thông báo | ✅ |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc | ✅ |
| PUT | `/notifications/{id}/read` | Đánh dấu đã đọc | ✅ |
| PUT | `/notifications/read-all` | Đánh dấu tất cả đã đọc | ✅ |
| DELETE | `/notifications/{id}` | Xóa thông báo | ✅ |
| DELETE | `/notifications/clear-all` | Xóa tất cả đã đọc | ✅ |
| POST | `/notifications/register-device` | Đăng ký thiết bị nhận push | ✅ |
| DELETE | `/notifications/unregister-device` | Hủy đăng ký thiết bị | ✅ |

---

## 📋 List Notifications

Danh sách thông báo.

### Request

```http
GET /api/v1/notifications?is_read=false&type=BUDGET_ALERT&page=1&page_size=20
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `is_read` | boolean | Lọc đã đọc/chưa đọc |
| `type` | enum | Loại thông báo |
| `priority` | enum | HIGH, NORMAL, LOW |
| `page` | int | Trang (default: 1) |
| `page_size` | int | Số item/trang (default: 20) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-1",
        "type": "BUDGET_ALERT",
        "priority": "HIGH",
        "title": "Ngân sách ăn uống sắp vượt",
        "body": "Bạn đã chi 2.4/2.5 triệu (96%). Còn 10 ngày trong tháng.",
        "icon_url": "https://cdn.finance-app.com/icons/budget-warning.png",
        "action_url": "app://budgets/budget-uuid",
        "action_text": "Xem chi tiết",
        "data": {
          "budget_id": "budget-uuid",
          "percentage": 96,
          "spent": 2400000,
          "limit": 2500000
        },
        "is_read": false,
        "created_at": "2026-10-21T08:00:00Z"
      },
      {
        "id": "notif-2",
        "type": "GOAL_MILESTONE",
        "priority": "NORMAL",
        "title": "🎉 Đạt milestone 50%",
        "body": "Mục tiêu 'Du lịch Nhật Bản' đã đạt 50% (25/50 triệu)",
        "icon_url": "https://cdn.finance-app.com/icons/goal-milestone.png",
        "action_url": "app://goals/goal-uuid",
        "is_read": false,
        "created_at": "2026-10-20T15:30:00Z"
      },
      {
        "id": "notif-3",
        "type": "TRANSACTION",
        "priority": "LOW",
        "title": "Giao dịch mới",
        "body": "Chi 45.000₫ tại Highlands Coffee",
        "action_url": "app://transactions/tx-uuid",
        "is_read": true,
        "created_at": "2026-10-11T08:30:00Z",
        "read_at": "2026-10-11T09:00:00Z"
      },
      {
        "id": "notif-4",
        "type": "ANOMALY_DETECTED",
        "priority": "HIGH",
        "title": "⚠️ Giao dịch bất thường",
        "body": "Giao dịch 5 triệu đồng cao hơn 10x so với trung bình",
        "action_url": "app://transactions/tx-uuid",
        "is_read": false,
        "created_at": "2026-10-10T03:20:00Z"
      },
      {
        "id": "notif-5",
        "type": "DEBT_REMINDER",
        "priority": "HIGH",
        "title": "Nhắc trả nợ",
        "body": "Khoản vay Techcombank đến hạn trả trong 3 ngày nữa (11 triệu)",
        "action_url": "app://debts/debt-uuid",
        "is_read": false,
        "created_at": "2026-10-08T08:00:00Z"
      }
    ],
    "unread_count": 3
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

### Notification Types

- `TRANSACTION`: Giao dịch mới
- `BUDGET_ALERT`: Cảnh báo ngân sách
- `BUDGET_EXCEEDED`: Vượt ngân sách
- `GOAL_MILESTONE`: Đạt milestone mục tiêu
- `GOAL_ACHIEVED`: Hoàn thành mục tiêu
- `GOAL_REMINDER`: Nhắc đóng góp mục tiêu
- `DEBT_REMINDER`: Nhắc trả nợ
- `DEBT_OVERDUE`: Trễ hạn trả nợ
- `RECURRING_DUE`: Giao dịch định kỳ sắp đến hạn
- `RECURRING_FAILED`: Giao dịch định kỳ thất bại
- `ANOMALY_DETECTED`: Phát hiện bất thường
- `INSIGHT_GENERATED`: Insight mới
- `WEEKLY_SUMMARY`: Tổng kết tuần
- `MONTHLY_REPORT`: Báo cáo tháng
- `SYSTEM`: Thông báo hệ thống

---

## 🔔 Unread Count

Số thông báo chưa đọc.

### Request

```http
GET /api/v1/notifications/unread-count
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "unread_count": 5,
    "by_priority": {
      "high": 3,
      "normal": 2,
      "low": 0
    },
    "by_type": {
      "BUDGET_ALERT": 2,
      "ANOMALY_DETECTED": 1,
      "DEBT_REMINDER": 1,
      "GOAL_MILESTONE": 1
    }
  }
}
```

---

## ✅ Mark as Read

Đánh dấu 1 thông báo đã đọc.

### Request

```http
PUT /api/v1/notifications/{id}/read
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "notif-uuid",
    "is_read": true,
    "read_at": "2026-10-11T10:30:00Z"
  },
  "message": "Đã đánh dấu đã đọc"
}
```

---

## ✅ Mark All as Read

Đánh dấu tất cả đã đọc.

### Request

```http
PUT /api/v1/notifications/read-all
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "marked_count": 12
  },
  "message": "Đã đánh dấu 12 thông báo đã đọc"
}
```

---

## 🗑️ Delete Notification

Xóa 1 thông báo.

### Request

```http
DELETE /api/v1/notifications/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Thông báo đã được xóa"
}
```

---

## 🧹 Clear All Read

Xóa tất cả thông báo đã đọc.

### Request

```http
DELETE /api/v1/notifications/clear-all
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "deleted_count": 23
  },
  "message": "Đã xóa 23 thông báo đã đọc"
}
```

---

## 📱 Register Device

Đăng ký thiết bị để nhận push notification.

### Request

```http
POST /api/v1/notifications/register-device
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_token": "fcm-token-or-apns-token",
  "device_type": "IOS",
  "device_name": "iPhone 13",
  "app_version": "1.2.0"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "device_id": "device-uuid",
    "device_token": "fcm-token...",
    "registered_at": "2026-10-11T10:00:00Z"
  },
  "message": "Thiết bị đã được đăng ký nhận thông báo"
}
```

---

## 🚫 Unregister Device

Hủy đăng ký thiết bị.

### Request

```http
DELETE /api/v1/notifications/unregister-device
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_token": "fcm-token-or-apns-token"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Thiết bị đã được hủy đăng ký"
}
```

---

## 📊 Notification Channels

| Channel | Mô tả | Settings |
|---------|-------|----------|
| IN_APP | Trong app | Luôn bật |
| PUSH | Push notification | Có thể tắt |
| EMAIL | Email | Có thể tắt |
| SMS | SMS | Có thể tắt (Premium) |

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
