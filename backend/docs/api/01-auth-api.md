# API Authentication & Authorization

**Module:** Authentication  
**Base Path:** `/api/v1/auth`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/register` | Đăng ký tài khoản mới | ❌ |
| POST | `/login` | Đăng nhập | ❌ |
| POST | `/logout` | Đăng xuất | ✅ |
| POST | `/refresh` | Làm mới access token | ❌ |
| POST | `/forgot-password` | Quên mật khẩu | ❌ |
| POST | `/reset-password` | Đặt lại mật khẩu | ❌ |
| POST | `/verify-email` | Xác thực email | ❌ |
| POST | `/resend-verification` | Gửi lại email xác thực | ❌ |
| POST | `/oauth/google` | Đăng nhập Google | ❌ |
| POST | `/oauth/apple` | Đăng nhập Apple | ❌ |
| POST | `/mfa/setup` | Thiết lập MFA | ✅ |
| POST | `/mfa/verify` | Xác thực MFA | ✅ |
| POST | `/mfa/disable` | Tắt MFA | ✅ |
| GET | `/mfa/backup-codes` | Lấy backup codes | ✅ |

---

## 🔐 Register

Tạo tài khoản người dùng mới.

### Request

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Nguyễn Văn A",
  "phone": "+84901234567",
  "preferred_currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh",
  "language": "vi-VN"
}
```

**Validation:**
- `email`: Valid email, unique
- `password`: Min 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt
- `full_name`: Min 2 ký tự, max 100 ký tự
- `phone`: Optional, format E.164
- `preferred_currency`: ISO 4217 code
- `timezone`: IANA timezone

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "phone": "+84901234567",
      "email_verified": false,
      "created_at": "2026-10-11T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzUxMiJ9...",
      "refresh_token": "eyJhbGciOiJIUzUxMiJ9...",
      "token_type": "Bearer",
      "expires_in": 900
    }
  },
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực."
}
```

### Response Error (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": {
      "email": ["Email đã được sử dụng"],
      "password": ["Mật khẩu phải có ít nhất 8 ký tự"]
    }
  }
}
```

---

## 🔓 Login

Đăng nhập với email/password.

### Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "device_id": "device-uuid",
  "device_name": "iPhone 13",
  "remember_me": true
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "email_verified": true,
      "mfa_enabled": false,
      "role": "USER",
      "plan": "FREE"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzUxMiJ9...",
      "refresh_token": "eyJhbGciOiJIUzUxMiJ9...",
      "token_type": "Bearer",
      "expires_in": 900
    }
  }
}
```

### Response MFA Required (200 OK)

```json
{
  "success": true,
  "data": {
    "mfa_required": true,
    "mfa_token": "temp-mfa-token-uuid",
    "mfa_methods": ["TOTP", "SMS"]
  },
  "message": "Vui lòng nhập mã xác thực"
}
```

### Response Error (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không đúng"
  }
}
```

### Response Account Locked (403 Forbidden)

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Tài khoản đã bị khóa do đăng nhập sai nhiều lần",
    "details": {
      "locked_until": "2026-10-11T11:00:00Z",
      "reason": "Too many failed login attempts"
    }
  }
}
```

---

## 🚪 Logout

Đăng xuất và revoke refresh token.

### Request

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "all_devices": false
}
```

**Parameters:**
- `all_devices`: `true` để đăng xuất tất cả thiết bị

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

---

## 🔄 Refresh Token

Làm mới access token khi hết hạn.

### Request

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzUxMiJ9..."
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzUxMiJ9...",
    "refresh_token": "eyJhbGciOiJIUzUxMiJ9...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

### Response Error - Token Reuse Detected (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_REUSE_DETECTED",
    "message": "Phát hiện token bị sử dụng lại. Tất cả phiên đăng nhập đã bị hủy.",
    "details": {
      "action_required": "Vui lòng đăng nhập lại"
    }
  }
}
```

---

## 🔑 Forgot Password

Yêu cầu đặt lại mật khẩu.

### Request

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.",
  "data": {
    "email_sent_to": "u***@example.com",
    "expires_in": 3600
  }
}
```

**Note:** Luôn trả về success để tránh email enumeration attack.

---

## 🔐 Reset Password

Đặt lại mật khẩu với token từ email.

### Request

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePass123!"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

### Response Error (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

---

## ✉️ Verify Email

Xác thực email với token.

### Request

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Email đã được xác thực thành công"
}
```

---

## 📧 Resend Verification Email

Gửi lại email xác thực.

### Request

```http
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Email xác thực đã được gửi lại"
}
```

---

## 🔗 OAuth - Google Login

Đăng nhập bằng Google.

### Request

```http
POST /api/v1/auth/oauth/google
Content-Type: application/json

{
  "id_token": "google-id-token",
  "device_id": "device-uuid",
  "device_name": "iPhone 13"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@gmail.com",
      "full_name": "Nguyễn Văn A",
      "avatar_url": "https://lh3.googleusercontent.com/...",
      "email_verified": true,
      "oauth_provider": "GOOGLE"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzUxMiJ9...",
      "refresh_token": "eyJhbGciOiJIUzUxMiJ9...",
      "token_type": "Bearer",
      "expires_in": 900
    },
    "is_new_user": false
  }
}
```

**Note:** `is_new_user = true` nếu là lần đầu đăng nhập OAuth.

---

## 🍎 OAuth - Apple Login

Đăng nhập bằng Apple.

### Request

```http
POST /api/v1/auth/oauth/apple
Content-Type: application/json

{
  "authorization_code": "apple-auth-code",
  "identity_token": "apple-identity-token",
  "user": {
    "email": "user@privaterelay.appleid.com",
    "name": {
      "firstName": "Văn A",
      "lastName": "Nguyễn"
    }
  },
  "device_id": "device-uuid",
  "device_name": "iPhone 13"
}
```

### Response Success (200 OK)

Tương tự Google OAuth.

---

## 🔒 MFA - Setup

Thiết lập xác thực hai yếu tố (TOTP).

### Request

```http
POST /api/v1/auth/mfa/setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "method": "TOTP"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code_url": "otpauth://totp/PFM-AI:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PFM-AI",
    "backup_codes": [
      "12345678",
      "23456789",
      "34567890",
      "45678901",
      "56789012"
    ]
  },
  "message": "Vui lòng quét QR code bằng Google Authenticator và nhập mã để xác thực"
}
```

---

## ✅ MFA - Verify

Xác thực mã MFA sau khi setup hoặc khi login.

### Request (Setup Verification)

```http
POST /api/v1/auth/mfa/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456",
  "setup": true
}
```

### Request (Login Verification)

```http
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{
  "mfa_token": "temp-mfa-token-from-login",
  "code": "123456",
  "method": "TOTP"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "tokens": {
      "access_token": "eyJhbGciOiJIUzUxMiJ9...",
      "refresh_token": "eyJhbGciOiJIUzUxMiJ9...",
      "token_type": "Bearer",
      "expires_in": 900
    }
  },
  "message": "Xác thực thành công"
}
```

### Response Error (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_MFA_CODE",
    "message": "Mã xác thực không đúng"
  }
}
```

---

## 🚫 MFA - Disable

Tắt xác thực hai yếu tố.

### Request

```http
POST /api/v1/auth/mfa/disable
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "password": "CurrentPassword123!",
  "code": "123456"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Đã tắt xác thực hai yếu tố"
}
```

---

## 🔑 MFA - Backup Codes

Lấy danh sách backup codes.

### Request

```http
GET /api/v1/auth/mfa/backup-codes
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "backup_codes": [
      {
        "code": "12345678",
        "used": false,
        "used_at": null
      },
      {
        "code": "23456789",
        "used": true,
        "used_at": "2026-10-10T15:30:00Z"
      }
    ],
    "remaining": 4
  }
}
```

---

## 📊 Security Events

### Login Attempt Tracking

Hệ thống theo dõi:
- Failed login attempts (max 5 lần/15 phút)
- Lockout duration: 15 phút
- Notification email sau 3 lần fail

### Device Management

```http
GET /api/v1/auth/devices
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "device-uuid-1",
        "name": "iPhone 13",
        "platform": "iOS",
        "last_used_at": "2026-10-11T10:00:00Z",
        "ip_address": "123.45.67.89",
        "location": "Hanoi, Vietnam",
        "is_current": true
      },
      {
        "id": "device-uuid-2",
        "name": "Chrome - Windows",
        "platform": "Web",
        "last_used_at": "2026-10-10T18:00:00Z",
        "ip_address": "123.45.67.90",
        "location": "Ho Chi Minh, Vietnam",
        "is_current": false
      }
    ]
  }
}
```

### Revoke Device

```http
DELETE /api/v1/auth/devices/{device_id}
Authorization: Bearer <access_token>
```

---

## 🧪 Testing

### Test Users

```json
{
  "regular_user": {
    "email": "test@example.com",
    "password": "Test@123456"
  },
  "premium_user": {
    "email": "premium@example.com",
    "password": "Premium@123456"
  },
  "mfa_enabled_user": {
    "email": "mfa@example.com",
    "password": "MFA@123456",
    "totp_secret": "JBSWY3DPEHPK3PXP"
  }
}
```

---

## 📝 Notes

### Password Policy

- **Minimum length:** 8 ký tự
- **Required:** Chữ hoa, chữ thường, số, ký tự đặc biệt
- **Không được:** Chứa email, tên, số điện thoại
- **History:** Không được trùng 3 password gần nhất

### Token Expiration

- **Access Token:** 15 phút
- **Refresh Token:** 30 ngày
- **Email Verification Token:** 24 giờ
- **Password Reset Token:** 1 giờ
- **MFA Temp Token:** 5 phút

### Rate Limiting

- **Login:** 5 attempts/15 min per IP
- **Register:** 3 attempts/1 hour per IP
- **Forgot Password:** 3 attempts/1 hour per email
- **MFA Verify:** 5 attempts/5 min

---

## 🔗 Related APIs

- [User Management API](02-user-api.md)
- [Sync API](16-sync-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
