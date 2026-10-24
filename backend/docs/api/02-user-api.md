# API User Management

**Module:** User Management  
**Base Path:** `/api/v1/users`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/users/me` | Lấy thông tin user hiện tại | ✅ |
| PUT | `/users/me` | Cập nhật profile | ✅ |
| DELETE | `/users/me` | Xóa tài khoản | ✅ |
| POST | `/users/me/avatar` | Upload avatar | ✅ |
| DELETE | `/users/me/avatar` | Xóa avatar | ✅ |
| GET | `/users/me/settings` | Lấy settings | ✅ |
| PUT | `/users/me/settings` | Cập nhật settings | ✅ |
| PUT | `/users/me/password` | Đổi mật khẩu | ✅ |
| POST | `/users/me/export` | Export dữ liệu cá nhân | ✅ |
| GET | `/users/me/statistics` | Thống kê sử dụng | ✅ |
| GET | `/users/me/activity` | Lịch sử hoạt động | ✅ |

---

## 👤 Get Current User

Lấy thông tin user đang đăng nhập.

### Request

```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "Nguyễn Văn A",
    "phone": "+84901234567",
    "avatar_url": "https://cdn.finance-app.com/avatars/user-uuid.jpg",
    "date_of_birth": "1990-05-15",
    "gender": "MALE",
    "role": "USER",
    "plan": "FREE",
    "email_verified": true,
    "phone_verified": false,
    "mfa_enabled": false,
    "oauth_providers": ["GOOGLE"],
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2026-10-11T10:00:00Z",
    "preferences": {
      "base_currency": "VND",
      "timezone": "Asia/Ho_Chi_Minh",
      "language": "vi-VN",
      "first_day_of_week": "MONDAY",
      "date_format": "DD/MM/YYYY",
      "time_format": "24H",
      "theme": "LIGHT"
    },
    "statistics": {
      "total_accounts": 5,
      "total_transactions": 1234,
      "total_budgets": 12,
      "total_goals": 3,
      "days_since_registration": 284
    }
  }
}
```

---

## ✏️ Update Profile

Cập nhật thông tin cá nhân.

### Request

```http
PUT /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "Nguyễn Văn B",
  "phone": "+84912345678",
  "date_of_birth": "1990-05-15",
  "gender": "MALE"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Nguyễn Văn B",
    "phone": "+84912345678",
    "date_of_birth": "1990-05-15",
    "gender": "MALE",
    "updated_at": "2026-10-11T10:30:00Z"
  },
  "message": "Cập nhật thông tin thành công"
}
```

### Validation Rules

- `full_name`: Min 2, max 100 ký tự
- `phone`: Format E.164, unique
- `date_of_birth`: Không được là tương lai, tuổi >= 13
- `gender`: Enum [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]

---

## 🗑️ Delete Account

Xóa tài khoản vĩnh viễn (không thể khôi phục).

### Request

```http
DELETE /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "password": "CurrentPassword123!",
  "reason": "Không sử dụng nữa",
  "confirmation": "DELETE MY ACCOUNT"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Tài khoản đã được xóa vĩnh viễn. Dữ liệu sẽ được xóa hoàn toàn trong 30 ngày."
}
```

### Response Error (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONFIRMATION",
    "message": "Xác nhận không đúng. Vui lòng nhập chính xác 'DELETE MY ACCOUNT'"
  }
}
```

**Note:** 
- Dữ liệu sẽ được đánh dấu xóa ngay lập tức
- Hard delete sau 30 ngày bởi background job
- Gửi email xác nhận cuối cùng với link khôi phục (valid 7 ngày)

---

## 📸 Upload Avatar

Upload ảnh đại diện.

### Request

```http
POST /api/v1/users/me/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: (binary image)
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "avatar_url": "https://cdn.finance-app.com/avatars/user-uuid-v2.jpg",
    "thumbnail_url": "https://cdn.finance-app.com/avatars/user-uuid-v2-thumb.jpg"
  },
  "message": "Avatar đã được cập nhật"
}
```

**Limits:**
- Max size: 5MB
- Allowed types: image/jpeg, image/png, image/webp
- Auto resize: 512x512 (avatar), 128x128 (thumbnail)
- Auto compress: quality 85%

---

## 🚫 Delete Avatar

Xóa ảnh đại diện (về avatar mặc định).

### Request

```http
DELETE /api/v1/users/me/avatar
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Đã xóa avatar"
}
```

---

## ⚙️ Get Settings

Lấy toàn bộ settings.

### Request

```http
GET /api/v1/users/me/settings
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "general": {
      "base_currency": "VND",
      "timezone": "Asia/Ho_Chi_Minh",
      "language": "vi-VN",
      "first_day_of_week": "MONDAY",
      "date_format": "DD/MM/YYYY",
      "time_format": "24H"
    },
    "appearance": {
      "theme": "LIGHT",
      "accent_color": "#4CAF50",
      "font_size": "MEDIUM"
    },
    "notifications": {
      "email_enabled": true,
      "push_enabled": true,
      "sms_enabled": false,
      "budget_alerts": true,
      "goal_reminders": true,
      "transaction_notifications": false,
      "weekly_summary": true,
      "monthly_report": true,
      "anomaly_alerts": true
    },
    "privacy": {
      "profile_visibility": "PRIVATE",
      "show_in_leaderboard": false,
      "allow_peer_comparison": true,
      "data_sharing_for_research": false
    },
    "security": {
      "mfa_enabled": false,
      "biometric_enabled": true,
      "session_timeout_minutes": 30,
      "require_password_for_export": true
    },
    "automation": {
      "auto_categorize": true,
      "auto_merchant_detection": true,
      "recurring_detection": true,
      "split_bill_suggestions": true
    },
    "backup": {
      "auto_backup_enabled": true,
      "backup_frequency": "DAILY",
      "include_attachments": true,
      "backup_encryption": true
    }
  }
}
```

---

## 🔧 Update Settings

Cập nhật settings (partial update).

### Request

```http
PUT /api/v1/users/me/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "general": {
    "language": "en-US",
    "base_currency": "USD"
  },
  "notifications": {
    "budget_alerts": false,
    "weekly_summary": true
  },
  "appearance": {
    "theme": "DARK"
  }
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "general": {
      "language": "en-US",
      "base_currency": "USD",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "notifications": {
      "budget_alerts": false,
      "weekly_summary": true
    },
    "appearance": {
      "theme": "DARK"
    }
  },
  "message": "Cài đặt đã được cập nhật"
}
```

**Note:** 
- Chỉ cập nhật các field được gửi (partial update)
- Đổi `base_currency` sẽ trigger job chuyển đổi reports/budgets
- Đổi `timezone` không ảnh hưởng `occurred_date` của giao dịch cũ

---

## 🔐 Change Password

Đổi mật khẩu.

### Request

```http
PUT /api/v1/users/me/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass456!",
  "logout_other_devices": true
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Mật khẩu đã được thay đổi thành công"
}
```

### Response Error (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENT_PASSWORD",
    "message": "Mật khẩu hiện tại không đúng"
  }
}
```

**Validation:**
- `new_password`: Min 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt
- Không được trùng 3 password gần nhất
- Không được chứa email, tên, số điện thoại

**Side Effects:**
- Revoke tất cả refresh tokens (nếu `logout_other_devices = true`)
- Gửi email thông báo đổi password
- Log security event

---

## 📦 Export Personal Data

Xuất toàn bộ dữ liệu cá nhân (GDPR compliance).

### Request

```http
POST /api/v1/users/me/export
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "format": "JSON",
  "include_attachments": true,
  "date_range": {
    "from": "2024-01-01",
    "to": "2026-10-11"
  }
}
```

### Response Success (202 Accepted)

```json
{
  "success": true,
  "data": {
    "export_id": "export-uuid",
    "status": "PROCESSING",
    "estimated_time_seconds": 120,
    "poll_url": "/api/v1/users/me/exports/export-uuid"
  },
  "message": "Đang xử lý. Bạn sẽ nhận email khi hoàn tất."
}
```

### Check Export Status

```http
GET /api/v1/users/me/exports/{export_id}
Authorization: Bearer <access_token>
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "export_id": "export-uuid",
    "status": "COMPLETED",
    "format": "JSON",
    "file_size": 12567890,
    "download_url": "https://cdn.finance-app.com/exports/user-uuid-export.zip",
    "expires_at": "2026-10-18T10:00:00Z",
    "created_at": "2026-10-11T10:00:00Z"
  }
}
```

**Export Contents:**
- Profile & settings
- All transactions with categories, merchants, tags
- Accounts, budgets, goals, debts
- Receipts, attachments (if `include_attachments = true`)
- Insights, forecasts, chat history
- Audit logs

**Formats:**
- JSON (structured)
- CSV (tables)
- PDF (reports)

---

## 📊 Get Statistics

Thống kê sử dụng hệ thống.

### Request

```http
GET /api/v1/users/me/statistics
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "registration": {
      "date": "2024-01-01T00:00:00Z",
      "days_active": 284,
      "current_streak": 7,
      "longest_streak": 45
    },
    "transactions": {
      "total": 1234,
      "this_month": 89,
      "average_per_day": 4.3,
      "largest": {
        "amount": 50000000,
        "description": "Mua xe",
        "date": "2026-06-15"
      }
    },
    "financial": {
      "total_income": 450000000,
      "total_expense": 380000000,
      "net_worth": 70000000,
      "savings_rate": 15.6,
      "categories_used": 28,
      "merchants_used": 156
    },
    "budgets": {
      "total": 12,
      "active": 8,
      "on_track": 5,
      "warning": 2,
      "exceeded": 1,
      "success_rate": 62.5
    },
    "goals": {
      "total": 5,
      "completed": 2,
      "in_progress": 3,
      "total_saved": 25000000,
      "completion_rate": 40
    },
    "ai_usage": {
      "chat_messages": 234,
      "receipts_scanned": 156,
      "auto_categorized": 987,
      "insights_generated": 45,
      "anomalies_detected": 12
    },
    "engagement": {
      "login_count": 284,
      "average_session_minutes": 8.5,
      "features_used": 15,
      "last_login": "2026-10-11T10:00:00Z"
    }
  }
}
```

---

## 📜 Activity History

Lịch sử hoạt động gần đây.

### Request

```http
GET /api/v1/users/me/activity?page=1&page_size=20&action_type=LOGIN
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `page` | int | Trang (default: 1) |
| `page_size` | int | Số item/trang (default: 20, max: 100) |
| `action_type` | enum | LOGIN, LOGOUT, PASSWORD_CHANGE, SETTINGS_UPDATE, etc. |
| `from_date` | date | Từ ngày |
| `to_date` | date | Đến ngày |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity-1",
        "action_type": "LOGIN",
        "description": "Đăng nhập thành công",
        "ip_address": "123.45.67.89",
        "device": "iPhone 13",
        "platform": "iOS",
        "location": "Hanoi, Vietnam",
        "user_agent": "Mozilla/5.0...",
        "timestamp": "2026-10-11T10:00:00Z"
      },
      {
        "id": "activity-2",
        "action_type": "PASSWORD_CHANGE",
        "description": "Đã đổi mật khẩu",
        "ip_address": "123.45.67.89",
        "device": "Chrome - Windows",
        "timestamp": "2026-10-10T15:30:00Z"
      },
      {
        "id": "activity-3",
        "action_type": "EXPORT_DATA",
        "description": "Xuất dữ liệu cá nhân (JSON format)",
        "timestamp": "2026-10-09T09:00:00Z"
      },
      {
        "id": "activity-4",
        "action_type": "SETTINGS_UPDATE",
        "description": "Cập nhật cài đặt thông báo",
        "changes": {
          "notifications.budget_alerts": {
            "old": true,
            "new": false
          }
        },
        "timestamp": "2026-10-08T14:20:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 284,
    "total_pages": 15,
    "has_next": true,
    "has_previous": false
  }
}
```

**Activity Types:**
- `LOGIN`, `LOGOUT`, `LOGIN_FAILED`
- `PASSWORD_CHANGE`, `PASSWORD_RESET`
- `EMAIL_CHANGE`, `EMAIL_VERIFIED`
- `PHONE_CHANGE`, `PHONE_VERIFIED`
- `MFA_ENABLED`, `MFA_DISABLED`
- `OAUTH_LINKED`, `OAUTH_UNLINKED`
- `SETTINGS_UPDATE`, `PROFILE_UPDATE`
- `AVATAR_UPDATE`, `AVATAR_DELETE`
- `ACCOUNT_DELETE_REQUEST`, `ACCOUNT_DELETED`
- `EXPORT_DATA`, `IMPORT_DATA`
- `DEVICE_ADDED`, `DEVICE_REMOVED`

---

## 🔗 Related APIs

- [Authentication API](01-auth-api.md)
- [Sync API](16-sync-api.md)
- [Reports API](18-reports-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
