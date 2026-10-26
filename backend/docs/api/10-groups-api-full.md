# Groups API - Đặc Tả Đầy Đủ

API cho quản lý nhóm chi tiêu chia sẻ, chat nhóm, và quản lý ví con (family mode).

**Phiên bản:** 2.0  
**Cập nhật:** 11/10/2026

---

## 📋 Mục Lục

1. [Groups Management](#1-groups-management) - Quản lý nhóm (7 endpoints)
2. [Members Management](#2-members-management) - Quản lý thành viên (5 endpoints)
3. [Group Expenses](#3-group-expenses) - Chi phí nhóm (6 endpoints)
4. [Settlements](#4-settlements) - Thanh toán công nợ (4 endpoints)
5. [Comments](#5-comments) - Comment trên giao dịch (4 endpoints)
6. [Group Messages](#6-group-messages) - Chat nhóm (7 endpoints)
7. [Child Wallets](#7-child-wallets) - Ví con cho trẻ (8 endpoints)
8. [Child Management](#8-child-management) - Quản lý con (10 endpoints)
9. [Activities](#9-activities) - Lịch sử hoạt động (2 endpoints)

**Tổng:** 53 endpoints

---

## Base URL
```
/api/v1/groups
```

---

## 1. Groups Management

### 1.1. Tạo nhóm mới

**POST** `/api/v1/groups`

Tạo một nhóm chi tiêu chia sẻ mới.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Gia đình Nguyễn",
  "description": "Quản lý chi tiêu gia đình",
  "group_type": "family",
  "base_currency": "VND",
  "avatar_key": "groups/avatars/family-avatar.jpg",
  "settings": {
    "split_method": "equal",
    "auto_settle": false,
    "require_receipt": true,
    "enable_chat": true,
    "enable_child_wallets": true
  }
}
```

**Fields:**
- `name` (string, required, max 120): Tên nhóm
- `description` (string, optional, max 500): Mô tả
- `group_type` (string, required): `family`, `travel`, `roommate`, `couple`, `project`, `other`
- `base_currency` (string, required): Mã tiền tệ (VND, USD...)
- `avatar_key` (string, optional): Key ảnh trên S3
- `settings` (object, optional): Cài đặt nhóm

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Gia đình Nguyễn",
    "description": "Quản lý chi tiêu gia đình",
    "group_type": "family",
    "base_currency": "VND",
    "avatar_key": "groups/avatars/family-avatar.jpg",
    "owner_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "member_count": 1,
    "total_expenses": 0,
    "settings": {
      "split_method": "equal",
      "auto_settle": false,
      "require_receipt": true,
      "enable_chat": true,
      "enable_child_wallets": true
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "version": 0
  }
}
```

---

### 1.2. Lấy danh sách nhóm

**GET** `/api/v1/groups`

Lấy danh sách các nhóm mà user tham gia.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): `active`, `archived` (default: `active`)
- `group_type` (string, optional): Lọc theo loại nhóm
- `role` (string, optional): Lọc theo vai trò (`owner`, `admin`, `member`)
- `search` (string, optional): Tìm kiếm theo tên
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Gia đình Nguyễn",
        "description": "Quản lý chi tiêu gia đình",
        "group_type": "family",
        "base_currency": "VND",
        "avatar_key": "groups/avatars/family-avatar.jpg",
        "owner_id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "active",
        "member_count": 4,
        "child_wallet_count": 2,
        "total_expenses": 45000000,
        "unread_message_count": 5,
        "my_role": "owner",
        "my_balance": -500000,
        "last_activity_at": "2024-01-20T15:30:00Z",
        "created_at": "2024-01-15T10:00:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Chuyến du lịch Đà Lạt",
        "group_type": "travel",
        "base_currency": "VND",
        "status": "active",
        "member_count": 5,
        "total_expenses": 15000000,
        "my_role": "member",
        "my_balance": 200000,
        "last_activity_at": "2024-01-19T10:00:00Z",
        "created_at": "2024-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 2,
      "items_per_page": 20
    }
  }
}
```

---

### 1.3. Lấy chi tiết nhóm

**GET** `/api/v1/groups/{groupId}`

Lấy thông tin chi tiết một nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Gia đình Nguyễn",
    "description": "Quản lý chi tiêu gia đình",
    "group_type": "family",
    "base_currency": "VND",
    "avatar_key": "groups/avatars/family-avatar.jpg",
    "owner_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "member_count": 4,
    "child_wallet_count": 2,
    "total_expenses": 45000000,
    "total_settlements": 20000000,
    "settings": {
      "split_method": "equal",
      "auto_settle": false,
      "require_receipt": true,
      "enable_chat": true,
      "enable_child_wallets": true
    },
    "my_role": "owner",
    "my_balance": -500000,
    "my_permissions": [
      "manage_members",
      "create_expenses",
      "manage_expenses",
      "create_settlements",
      "manage_child_wallets",
      "send_messages"
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z",
    "version": 5
  }
}
```

---

### 1.4. Cập nhật nhóm

**PUT** `/api/v1/groups/{groupId}`

Cập nhật thông tin nhóm (chỉ owner/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Gia đình Nguyễn (Updated)",
  "description": "Quản lý chi tiêu gia đình hàng tháng",
  "avatar_key": "groups/avatars/new-avatar.jpg",
  "settings": {
    "split_method": "percentage",
    "auto_settle": true,
    "require_receipt": false,
    "enable_chat": true,
    "enable_child_wallets": true
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Gia đình Nguyễn (Updated)",
    "description": "Quản lý chi tiêu gia đình hàng tháng",
    "avatar_key": "groups/avatars/new-avatar.jpg",
    "settings": {
      "split_method": "percentage",
      "auto_settle": true,
      "require_receipt": false,
      "enable_chat": true,
      "enable_child_wallets": true
    },
    "updated_at": "2024-01-21T10:00:00Z",
    "version": 6
  }
}
```

---

### 1.5. Lưu trữ nhóm

**PATCH** `/api/v1/groups/{groupId}/archive`

Lưu trữ nhóm (chỉ owner).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "archived",
    "updated_at": "2024-01-21T10:00:00Z"
  }
}
```

---

### 1.6. Kích hoạt lại nhóm

**PATCH** `/api/v1/groups/{groupId}/unarchive`

Kích hoạt lại nhóm đã lưu trữ (chỉ owner).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "updated_at": "2024-01-21T10:30:00Z"
  }
}
```

---

### 1.7. Xóa nhóm

**DELETE** `/api/v1/groups/{groupId}`

Xóa nhóm vĩnh viễn (chỉ owner, phải settle hết debts trước).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Nhóm đã được xóa thành công"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "UNSETTLED_BALANCES",
    "message": "Không thể xóa nhóm khi còn công nợ chưa thanh toán",
    "details": {
      "unsettled_member_count": 3,
      "total_unsettled_amount": 2500000
    }
  }
}
```

---

## 2. Members Management

### 2.1. Thêm thành viên

**POST** `/api/v1/groups/{groupId}/members`

Thêm thành viên vào nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "789e4567-e89b-12d3-a456-426614174000",
  "role": "member",
  "contribution_ratio": 25.0
}
```

**Fields:**
- `user_id` (UUID, required): ID người dùng
- `role` (string, required): `owner`, `admin`, `member`
- `contribution_ratio` (decimal, optional, 0-100): Tỷ lệ đóng góp %

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "role": "member",
    "contribution_ratio": 25.0,
    "balance": 0,
    "joined_at": "2024-01-21T11:00:00Z",
    "user": {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn B",
      "display_name": "Van B",
      "email": "nguyenvanb@example.com",
      "avatar_key": "users/avatars/user-b.jpg"
    }
  }
}
```

---

### 2.2. Lấy danh sách thành viên

**GET** `/api/v1/groups/{groupId}/members`

Lấy danh sách thành viên trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `role` (string, optional): Lọc theo vai trò
- `include_balance` (boolean, optional): Bao gồm số dư (default: true)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "group_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "role": "owner",
        "contribution_ratio": 50.0,
        "balance": -500000,
        "total_paid": 25000000,
        "total_owed": 24500000,
        "joined_at": "2024-01-15T10:00:00Z",
        "user": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyễn Văn A",
          "display_name": "Van A",
          "email": "nguyenvana@example.com",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "group_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "role": "member",
        "contribution_ratio": 25.0,
        "balance": 200000,
        "total_paid": 10000000,
        "total_owed": 10200000,
        "joined_at": "2024-01-16T14:00:00Z",
        "user": {
          "id": "789e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyễn Văn B",
          "display_name": "Van B",
          "email": "nguyenvanb@example.com",
          "avatar_key": "users/avatars/user-b.jpg"
        }
      }
    ],
    "summary": {
      "total_members": 4,
      "owner_count": 1,
      "admin_count": 1,
      "member_count": 2
    }
  }
}
```

---

### 2.3. Lấy thông tin thành viên

**GET** `/api/v1/groups/{groupId}/members/{userId}`

Lấy thông tin chi tiết một thành viên.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "role": "member",
    "contribution_ratio": 25.0,
    "balance": 200000,
    "total_paid": 10000000,
    "total_owed": 10200000,
    "expense_count": 25,
    "settlement_count": 8,
    "joined_at": "2024-01-16T14:00:00Z",
    "user": {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn B",
      "display_name": "Van B",
      "email": "nguyenvanb@example.com",
      "avatar_key": "users/avatars/user-b.jpg"
    }
  }
}
```

---

### 2.4. Cập nhật vai trò thành viên

**PATCH** `/api/v1/groups/{groupId}/members/{userId}`

Cập nhật vai trò và tỷ lệ đóng góp thành viên (chỉ owner).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "admin",
  "contribution_ratio": 30.0
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "role": "admin",
    "contribution_ratio": 30.0,
    "updated_at": "2024-01-21T12:00:00Z"
  }
}
```

---

### 2.5. Xóa thành viên / Rời nhóm

**DELETE** `/api/v1/groups/{groupId}/members/{userId}`

Xóa thành viên khỏi nhóm hoặc tự rời nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `force` (boolean, optional): Bỏ qua kiểm tra số dư (chỉ owner, default: false)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Thành viên đã được xóa khỏi nhóm"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "UNSETTLED_BALANCE",
    "message": "Không thể rời nhóm khi còn công nợ chưa thanh toán",
    "details": {
      "balance": -500000,
      "must_settle": true
    }
  }
}
```

---

## 3. Group Expenses

### 3.1. Tạo chi phí nhóm

**POST** `/api/v1/groups/{groupId}/expenses`

Tạo chi phí mới trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Tiền điện tháng 1",
  "amount": 1500000,
  "paid_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
  "category_id": "cat-utilities",
  "split_method": "percentage",
  "expense_date": "2024-01-20",
  "notes": "Hóa đơn điện EVN",
  "receipt_key": "receipts/group-550/receipt-001.jpg",
  "location": {
    "lat": 10.762622,
    "lng": 106.660172,
    "address": "123 Nguyen Hue, Q1, HCM"
  },
  "splits": [
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 750000,
      "percentage": 50.0,
      "shares": null
    },
    {
      "user_id": "789e4567-e89b-12d3-a456-426614174000",
      "amount": 375000,
      "percentage": 25.0,
      "shares": null
    },
    {
      "user_id": "abc e4567-e89b-12d3-a456-426614174000",
      "amount": 375000,
      "percentage": 25.0,
      "shares": null
    }
  ]
}
```

**Fields:**
- `description` (string, required, max 300): Mô tả chi phí
- `amount` (decimal, required, > 0): Số tiền
- `paid_by_user_id` (UUID, required): Người trả tiền
- `category_id` (UUID, optional): Danh mục
- `split_method` (enum, required): `EQUAL`, `PERCENTAGE`, `EXACT`, `SHARES`
- `expense_date` (date, required): Ngày chi phí
- `notes` (text, optional): Ghi chú
- `receipt_key` (string, optional): Key hóa đơn trên S3
- `location` (object, optional): Vị trí
- `splits` (array, required): Danh sách phân chia

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Tiền điện tháng 1",
    "amount": 1500000,
    "currency": "VND",
    "paid_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "category_id": "cat-utilities",
    "split_method": "percentage",
    "expense_date": "2024-01-20",
    "notes": "Hóa đơn điện EVN",
    "receipt_key": "receipts/group-550/receipt-001.jpg",
    "location": {
      "lat": 10.762622,
      "lng": 106.660172,
      "address": "123 Nguyen Hue, Q1, HCM"
    },
    "created_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-20T18:00:00Z",
    "updated_at": "2024-01-20T18:00:00Z",
    "version": 0,
    "payer": {
      "full_name": "Nguyễn Văn A",
      "avatar_key": "users/avatars/user-a.jpg"
    },
    "splits": [
      {
        "id": "split-001",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 750000,
        "percentage": 50.0,
        "shares": null,
        "user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "id": "split-002",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "amount": 375000,
        "percentage": 25.0,
        "shares": null,
        "user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        }
      }
    ]
  }
}
```

---

### 3.2. Lấy danh sách chi phí nhóm

**GET** `/api/v1/groups/{groupId}/expenses`

Lấy danh sách chi phí trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `start_date` (date, optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (date, optional): Ngày kết thúc (YYYY-MM-DD)
- `category_id` (UUID, optional): Lọc theo danh mục
- `paid_by_user_id` (UUID, optional): Lọc theo người trả
- `search` (string, optional): Tìm kiếm theo mô tả
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20, max: 100)
- `sort` (string, optional): Sắp xếp (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "description": "Tiền điện tháng 1",
        "amount": 1500000,
        "currency": "VND",
        "paid_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
        "category_id": "cat-utilities",
        "split_method": "percentage",
        "expense_date": "2024-01-20",
        "receipt_key": "receipts/group-550/receipt-001.jpg",
        "created_at": "2024-01-20T18:00:00Z",
        "payer": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        },
        "category": {
          "name": "Điện nước",
          "icon": "⚡",
          "color": "#FFA500"
        },
        "split_count": 3,
        "my_share": 375000,
        "comment_count": 2
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    },
    "summary": {
      "total_expenses": 45000000,
      "my_total_paid": 25000000,
      "my_total_share": 24500000,
      "my_balance": -500000
    }
  }
}
```

---

### 3.3. Lấy chi tiết chi phí

**GET** `/api/v1/groups/{groupId}/expenses/{expenseId}`

Lấy thông tin chi tiết một chi phí.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Tiền điện tháng 1",
    "amount": 1500000,
    "currency": "VND",
    "paid_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "category_id": "cat-utilities",
    "split_method": "percentage",
    "expense_date": "2024-01-20",
    "notes": "Hóa đơn điện EVN",
    "receipt_key": "receipts/group-550/receipt-001.jpg",
    "location": {
      "lat": 10.762622,
      "lng": 106.660172,
      "address": "123 Nguyen Hue, Q1, HCM"
    },
    "created_by_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-20T18:00:00Z",
    "updated_at": "2024-01-20T18:00:00Z",
    "version": 0,
    "payer": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn A",
      "display_name": "Van A",
      "avatar_key": "users/avatars/user-a.jpg"
    },
    "category": {
      "id": "cat-utilities",
      "name": "Điện nước",
      "icon": "⚡",
      "color": "#FFA500"
    },
    "splits": [
      {
        "id": "split-001",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 750000,
        "percentage": 50.0,
        "shares": null,
        "user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "id": "split-002",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "amount": 375000,
        "percentage": 25.0,
        "shares": null,
        "user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        }
      },
      {
        "id": "split-003",
        "user_id": "abce4567-e89b-12d3-a456-426614174000",
        "amount": 375000,
        "percentage": 25.0,
        "shares": null,
        "user": {
          "full_name": "Nguyễn Văn C",
          "avatar_key": "users/avatars/user-c.jpg"
        }
      }
    ],
    "comment_count": 2
  }
}
```

---

### 3.4. Cập nhật chi phí

**PUT** `/api/v1/groups/{groupId}/expenses/{expenseId}`

Cập nhật chi phí (chỉ người tạo hoặc admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Tiền điện + nước tháng 1",
  "amount": 1800000,
  "expense_date": "2024-01-20",
  "notes": "Đã bao gồm cả nước",
  "splits": [
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 900000,
      "percentage": 50.0
    },
    {
      "user_id": "789e4567-e89b-12d3-a456-426614174000",
      "amount": 450000,
      "percentage": 25.0
    },
    {
      "user_id": "abce4567-e89b-12d3-a456-426614174000",
      "amount": 450000,
      "percentage": 25.0
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "description": "Tiền điện + nước tháng 1",
    "amount": 1800000,
    "expense_date": "2024-01-20",
    "notes": "Đã bao gồm cả nước",
    "updated_at": "2024-01-21T09:00:00Z",
    "version": 1
  }
}
```

---

### 3.5. Xóa chi phí

**DELETE** `/api/v1/groups/{groupId}/expenses/{expenseId}`

Xóa chi phí khỏi nhóm (chỉ người tạo hoặc admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Chi phí đã được xóa"
}
```

---

### 3.6. Lấy bảng cân đối

**GET** `/api/v1/groups/{groupId}/balances`

Lấy bảng cân đối công nợ của nhóm với các khoản thanh toán được tối ưu hóa.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "balance": -500000,
        "total_paid": 25000000,
        "total_owed": 24500000,
        "user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "balance": 200000,
        "total_paid": 10000000,
        "total_owed": 10200000,
        "user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        }
      },
      {
        "user_id": "abce4567-e89b-12d3-a456-426614174000",
        "balance": 300000,
        "total_paid": 10000000,
        "total_owed": 10300000,
        "user": {
          "full_name": "Nguyễn Văn C",
          "avatar_key": "users/avatars/user-c.jpg"
        }
      }
    ],
    "simplified_debts": [
      {
        "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
        "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 200000,
        "from_user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        },
        "to_user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "from_user_id": "abce4567-e89b-12d3-a456-426614174000",
        "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 300000,
        "from_user": {
          "full_name": "Nguyễn Văn C",
          "avatar_key": "users/avatars/user-c.jpg"
        },
        "to_user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      }
    ],
    "total_group_expenses": 45000000,
    "is_fully_settled": false
  }
}
```

---

## 4. Settlements

### 4.1. Tạo thanh toán

**POST** `/api/v1/groups/{groupId}/settlements`

Tạo giao dịch thanh toán công nợ giữa các thành viên.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
  "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 200000,
  "payment_method": "bank_transfer",
  "settlement_date": "2024-01-21",
  "notes": "Chuyển khoản qua VCB",
  "proof_key": "settlements/group-550/proof-001.jpg"
}
```

**Fields:**
- `from_user_id` (UUID, required): Người trả
- `to_user_id` (UUID, required): Người nhận
- `amount` (decimal, required, > 0): Số tiền
- `payment_method` (string, optional): `cash`, `bank_transfer`, `e_wallet`, `other`
- `settlement_date` (date, required): Ngày thanh toán
- `notes` (text, optional): Ghi chú
- `proof_key` (string, optional): Key ảnh chứng từ

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
    "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 200000,
    "currency": "VND",
    "payment_method": "bank_transfer",
    "settlement_date": "2024-01-21",
    "notes": "Chuyển khoản qua VCB",
    "proof_key": "settlements/group-550/proof-001.jpg",
    "status": "pending",
    "created_at": "2024-01-21T10:00:00Z",
    "confirmed_at": null,
    "rejected_at": null,
    "from_user": {
      "full_name": "Nguyễn Văn B",
      "avatar_key": "users/avatars/user-b.jpg"
    },
    "to_user": {
      "full_name": "Nguyễn Văn A",
      "avatar_key": "users/avatars/user-a.jpg"
    }
  }
}
```

---

### 4.2. Lấy danh sách thanh toán

**GET** `/api/v1/groups/{groupId}/settlements`

Lấy danh sách các giao dịch thanh toán.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): `pending`, `confirmed`, `rejected`
- `from_user_id` (UUID, optional): Lọc theo người trả
- `to_user_id` (UUID, optional): Lọc theo người nhận
- `start_date` (date, optional): Ngày bắt đầu
- `end_date` (date, optional): Ngày kết thúc
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
        "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 200000,
        "currency": "VND",
        "payment_method": "bank_transfer",
        "settlement_date": "2024-01-21",
        "status": "confirmed",
        "created_at": "2024-01-21T10:00:00Z",
        "confirmed_at": "2024-01-21T11:00:00Z",
        "from_user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        },
        "to_user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 8,
      "items_per_page": 20
    },
    "summary": {
      "total_settlements": 8,
      "total_amount": 5000000,
      "pending_count": 1,
      "confirmed_count": 7
    }
  }
}
```

---

### 4.3. Xác nhận thanh toán

**PATCH** `/api/v1/groups/{groupId}/settlements/{settlementId}/confirm`

Xác nhận đã nhận thanh toán (chỉ người nhận).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "status": "confirmed",
    "confirmed_at": "2024-01-21T11:00:00Z"
  }
}
```

---

### 4.4. Từ chối thanh toán

**PATCH** `/api/v1/groups/{groupId}/settlements/{settlementId}/reject`

Từ chối thanh toán (chỉ người nhận).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Chưa nhận được tiền"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "status": "rejected",
    "rejected_at": "2024-01-21T11:30:00Z",
    "rejection_reason": "Chưa nhận được tiền"
  }
}
```

---

## 5. Comments

### 5.1. Tạo comment

**POST** `/api/v1/groups/{groupId}/comments`

Tạo comment trên giao dịch hoặc chi phí nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "commentable_type": "group_expense",
  "commentable_id": "880e8400-e29b-41d4-a716-446655440000",
  "content": "Hóa đơn này có vẻ hơi cao, có thể kiểm tra lại không?",
  "parent_comment_id": null
}
```

**Fields:**
- `commentable_type` (string, required): `transaction`, `group_expense`
- `commentable_id` (UUID, required): ID giao dịch hoặc chi phí
- `content` (text, required, max 1000): Nội dung comment
- `parent_comment_id` (UUID, optional): ID comment cha (để reply)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "comment-001",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "commentable_type": "group_expense",
    "commentable_id": "880e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "content": "Hóa đơn này có vẻ hơi cao, có thể kiểm tra lại không?",
    "parent_comment_id": null,
    "created_at": "2024-01-21T14:00:00Z",
    "updated_at": "2024-01-21T14:00:00Z",
    "user": {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn B",
      "display_name": "Van B",
      "avatar_key": "users/avatars/user-b.jpg"
    },
    "reply_count": 0
  }
}
```

---

### 5.2. Lấy danh sách comments

**GET** `/api/v1/groups/{groupId}/comments`

Lấy danh sách comments trên giao dịch hoặc chi phí.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `commentable_type` (string, required): `transaction`, `group_expense`
- `commentable_id` (UUID, required): ID giao dịch hoặc chi phí
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-001",
        "commentable_type": "group_expense",
        "commentable_id": "880e8400-e29b-41d4-a716-446655440000",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "content": "Hóa đơn này có vẻ hơi cao, có thể kiểm tra lại không?",
        "parent_comment_id": null,
        "created_at": "2024-01-21T14:00:00Z",
        "user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        },
        "reply_count": 1,
        "replies": [
          {
            "id": "comment-002",
            "content": "Mình đã kiểm tra, giá đúng rồi bạn nhé!",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "created_at": "2024-01-21T14:30:00Z",
            "user": {
              "full_name": "Nguyễn Văn A",
              "avatar_key": "users/avatars/user-a.jpg"
            }
          }
        ]
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 2,
      "items_per_page": 50
    }
  }
}
```

---

### 5.3. Cập nhật comment

**PUT** `/api/v1/groups/{groupId}/comments/{commentId}`

Cập nhật nội dung comment (chỉ người tạo).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Hóa đơn này có vẻ hơi cao, mình kiểm tra lại nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "comment-001",
    "content": "Hóa đơn này có vẻ hơi cao, mình kiểm tra lại nhé!",
    "updated_at": "2024-01-21T15:00:00Z"
  }
}
```

---

### 5.4. Xóa comment

**DELETE** `/api/v1/groups/{groupId}/comments/{commentId}`

Xóa comment (chỉ người tạo hoặc admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comment đã được xóa"
}
```

---

## 6. Group Messages

### 6.1. Gửi tin nhắn

**POST** `/api/v1/groups/{groupId}/messages`

Gửi tin nhắn trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message_type": "text",
  "content": "Mọi người nhớ đóng tiền điện tháng này nhé!",
  "reply_to_message_id": null,
  "mentioned_user_ids": ["789e4567-e89b-12d3-a456-426614174000"],
  "attachments": []
}
```

**Message Types:**
- `text`: Tin nhắn văn bản
- `image`: Hình ảnh
- `expense_card`: Card chi phí (tự động tạo khi thêm expense)
- `system`: Tin nhắn hệ thống (tự động)

**Request Body (với attachments):**
```json
{
  "message_type": "image",
  "content": "Ảnh hóa đơn điện",
  "reply_to_message_id": null,
  "mentioned_user_ids": [],
  "attachments": [
    {
      "file_key": "messages/group-550/image-001.jpg",
      "file_name": "hoa-don-dien.jpg",
      "mime_type": "image/jpeg",
      "file_size": 245678
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "msg-001",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_type": "text",
    "content": "Mọi người nhớ đóng tiền điện tháng này nhé!",
    "reply_to_message_id": null,
    "mentioned_user_ids": ["789e4567-e89b-12d3-a456-426614174000"],
    "created_at": "2024-01-21T16:00:00Z",
    "updated_at": "2024-01-21T16:00:00Z",
    "sender": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn A",
      "display_name": "Van A",
      "avatar_key": "users/avatars/user-a.jpg"
    },
    "attachments": [],
    "read_by_count": 1,
    "is_read_by_me": true
  }
}
```

---

### 6.2. Lấy danh sách tin nhắn

**GET** `/api/v1/groups/{groupId}/messages`

Lấy danh sách tin nhắn trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `before_message_id` (UUID, optional): Lấy tin nhắn trước message này
- `after_message_id` (UUID, optional): Lấy tin nhắn sau message này
- `limit` (integer, optional): Số lượng (default: 50, max: 100)
- `message_type` (string, optional): Lọc theo loại tin nhắn

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-001",
        "group_id": "550e8400-e29b-41d4-a716-446655440000",
        "sender_id": "123e4567-e89b-12d3-a456-426614174000",
        "message_type": "text",
        "content": "Mọi người nhớ đóng tiền điện tháng này nhé!",
        "reply_to_message_id": null,
        "mentioned_user_ids": ["789e4567-e89b-12d3-a456-426614174000"],
        "created_at": "2024-01-21T16:00:00Z",
        "sender": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        },
        "attachments": [],
        "read_by_count": 3,
        "is_read_by_me": true
      },
      {
        "id": "msg-002",
        "message_type": "expense_card",
        "content": null,
        "expense_id": "880e8400-e29b-41d4-a716-446655440000",
        "expense_preview": {
          "description": "Tiền điện tháng 1",
          "amount": 1500000,
          "payer": "Nguyễn Văn A"
        },
        "created_at": "2024-01-21T16:05:00Z",
        "sender": {
          "full_name": "System",
          "avatar_key": null
        },
        "read_by_count": 2,
        "is_read_by_me": true
      },
      {
        "id": "msg-003",
        "message_type": "image",
        "content": "Ảnh hóa đơn điện",
        "created_at": "2024-01-21T16:10:00Z",
        "sender": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        },
        "attachments": [
          {
            "id": "att-001",
            "file_key": "messages/group-550/image-001.jpg",
            "file_name": "hoa-don-dien.jpg",
            "mime_type": "image/jpeg",
            "file_size": 245678,
            "thumbnail_key": "messages/group-550/thumb-001.jpg"
          }
        ],
        "read_by_count": 1,
        "is_read_by_me": false
      }
    ],
    "has_more": true,
    "oldest_message_id": "msg-001",
    "newest_message_id": "msg-003"
  }
}
```

---

### 6.3. Lấy chi tiết tin nhắn

**GET** `/api/v1/groups/{groupId}/messages/{messageId}`

Lấy thông tin chi tiết một tin nhắn.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "msg-001",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": "123e4567-e89b-12d3-a456-426614174000",
    "message_type": "text",
    "content": "Mọi người nhớ đóng tiền điện tháng này nhé!",
    "reply_to_message_id": null,
    "mentioned_user_ids": ["789e4567-e89b-12d3-a456-426614174000"],
    "created_at": "2024-01-21T16:00:00Z",
    "updated_at": "2024-01-21T16:00:00Z",
    "sender": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyễn Văn A",
      "display_name": "Van A",
      "avatar_key": "users/avatars/user-a.jpg"
    },
    "attachments": [],
    "read_by": [
      {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "read_at": "2024-01-21T16:00:00Z"
      },
      {
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "read_at": "2024-01-21T16:05:00Z"
      },
      {
        "user_id": "abce4567-e89b-12d3-a456-426614174000",
        "read_at": "2024-01-21T16:10:00Z"
      }
    ],
    "read_by_count": 3
  }
}
```

---

### 6.4. Cập nhật tin nhắn

**PUT** `/api/v1/groups/{groupId}/messages/{messageId}`

Cập nhật nội dung tin nhắn (chỉ người gửi, trong 15 phút).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Mọi người nhớ đóng tiền điện + nước tháng này nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "msg-001",
    "content": "Mọi người nhớ đóng tiền điện + nước tháng này nhé!",
    "updated_at": "2024-01-21T16:10:00Z",
    "is_edited": true
  }
}
```

---

### 6.5. Xóa tin nhắn

**DELETE** `/api/v1/groups/{groupId}/messages/{messageId}`

Xóa tin nhắn (chỉ người gửi hoặc admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Tin nhắn đã được xóa"
}
```

---

### 6.6. Đánh dấu đã đọc

**POST** `/api/v1/groups/{groupId}/messages/mark-read`

Đánh dấu các tin nhắn đã đọc.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message_ids": [
    "msg-001",
    "msg-002",
    "msg-003"
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "marked_count": 3,
    "read_at": "2024-01-21T17:00:00Z"
  }
}
```

---

### 6.7. Đếm tin nhắn chưa đọc

**GET** `/api/v1/groups/{groupId}/messages/unread-count`

Lấy số lượng tin nhắn chưa đọc.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "unread_count": 5,
    "last_read_message_id": "msg-003",
    "latest_message_id": "msg-008"
  }
}
```

---

## 7. Child Wallets

### 7.1. Tạo ví con

**POST** `/api/v1/groups/{groupId}/child-wallets`

Tạo ví con cho trẻ em trong gia đình.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "child_name": "Nguyễn Minh An",
  "date_of_birth": "2015-05-15",
  "avatar_key": "child-wallets/avatar-an.jpg",
  "balance": 500000,
  "weekly_allowance": 100000,
  "privacy_level": "parent_supervised",
  "spend_limit_daily": 50000,
  "spend_limit_weekly": 200000,
  "allowed_categories": ["cat-food", "cat-education", "cat-entertainment"],
  "require_approval_above": 100000,
  "settings": {
    "enable_chores": true,
    "enable_savings_goal": true,
    "notification_to_parents": true
  }
}
```

**Fields:**
- `child_name` (string, required, max 150): Tên con
- `date_of_birth` (date, required): Ngày sinh
- `avatar_key` (string, optional): Ảnh đại diện
- `balance` (decimal, required, ≥ 0): Số dư ban đầu
- `weekly_allowance` (decimal, optional, ≥ 0): Tiền tiêu vặt hàng tuần
- `privacy_level` (enum, required): `full_access`, `parent_supervised`, `view_only`
- `spend_limit_daily` (decimal, optional): Hạn mức chi tiêu/ngày
- `spend_limit_weekly` (decimal, optional): Hạn mức chi tiêu/tuần
- `allowed_categories` (array, optional): Danh sách category được phép
- `require_approval_above` (decimal, optional): Yêu cầu phê duyệt nếu > số tiền này
- `settings` (object, optional): Các cài đặt

**Privacy Levels:**
- `full_access`: Con có thể chi tiêu tự do trong hạn mức
- `parent_supervised`: Mọi giao dịch cần phê duyệt
- `view_only`: Chỉ xem, không chi tiêu

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "child-wallet-001",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "child_name": "Nguyễn Minh An",
    "date_of_birth": "2015-05-15",
    "age": 8,
    "avatar_key": "child-wallets/avatar-an.jpg",
    "balance": 500000,
    "currency": "VND",
    "weekly_allowance": 100000,
    "privacy_level": "parent_supervised",
    "spend_limit_daily": 50000,
    "spend_limit_weekly": 200000,
    "allowed_categories": ["cat-food", "cat-education", "cat-entertainment"],
    "require_approval_above": 100000,
    "settings": {
      "enable_chores": true,
      "enable_savings_goal": true,
      "notification_to_parents": true
    },
    "created_at": "2024-01-21T18:00:00Z",
    "updated_at": "2024-01-21T18:00:00Z",
    "version": 0
  }
}
```

---

### 7.2. Lấy danh sách ví con

**GET** `/api/v1/groups/{groupId}/child-wallets`

Lấy danh sách ví con trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `include_stats` (boolean, optional): Bao gồm thống kê (default: false)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "child_wallets": [
      {
        "id": "child-wallet-001",
        "child_name": "Nguyễn Minh An",
        "date_of_birth": "2015-05-15",
        "age": 8,
        "avatar_key": "child-wallets/avatar-an.jpg",
        "balance": 500000,
        "currency": "VND",
        "weekly_allowance": 100000,
        "privacy_level": "parent_supervised",
        "pending_request_count": 2,
        "completed_chore_count": 5,
        "created_at": "2024-01-21T18:00:00Z"
      },
      {
        "id": "child-wallet-002",
        "child_name": "Nguyễn Minh Anh",
        "date_of_birth": "2017-08-20",
        "age": 6,
        "avatar_key": "child-wallets/avatar-anh.jpg",
        "balance": 300000,
        "currency": "VND",
        "weekly_allowance": 50000,
        "privacy_level": "full_access",
        "pending_request_count": 0,
        "completed_chore_count": 3,
        "created_at": "2024-01-21T18:05:00Z"
      }
    ],
    "total_count": 2
  }
}
```

---

### 7.3. Lấy chi tiết ví con

**GET** `/api/v1/groups/{groupId}/child-wallets/{walletId}`

Lấy thông tin chi tiết ví con.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "child-wallet-001",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "child_name": "Nguyễn Minh An",
    "date_of_birth": "2015-05-15",
    "age": 8,
    "avatar_key": "child-wallets/avatar-an.jpg",
    "balance": 500000,
    "currency": "VND",
    "weekly_allowance": 100000,
    "next_allowance_date": "2024-01-28",
    "privacy_level": "parent_supervised",
    "spend_limit_daily": 50000,
    "spend_limit_weekly": 200000,
    "spent_today": 15000,
    "spent_this_week": 85000,
    "allowed_categories": ["cat-food", "cat-education", "cat-entertainment"],
    "require_approval_above": 100000,
    "settings": {
      "enable_chores": true,
      "enable_savings_goal": true,
      "notification_to_parents": true
    },
    "stats": {
      "total_spent_this_month": 350000,
      "pending_request_count": 2,
      "approved_request_count": 15,
      "rejected_request_count": 1,
      "completed_chore_count": 5,
      "total_chore_earnings": 150000
    },
    "created_at": "2024-01-21T18:00:00Z",
    "updated_at": "2024-01-22T10:00:00Z",
    "version": 3
  }
}
```

---

### 7.4. Cập nhật ví con

**PUT** `/api/v1/groups/{groupId}/child-wallets/{walletId}`

Cập nhật thông tin ví con (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "child_name": "Nguyễn Minh An (Updated)",
  "avatar_key": "child-wallets/avatar-an-new.jpg",
  "weekly_allowance": 120000,
  "privacy_level": "full_access",
  "spend_limit_daily": 60000,
  "spend_limit_weekly": 250000,
  "allowed_categories": ["cat-food", "cat-education", "cat-entertainment", "cat-toys"],
  "require_approval_above": 150000
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "child-wallet-001",
    "child_name": "Nguyễn Minh An (Updated)",
    "weekly_allowance": 120000,
    "privacy_level": "full_access",
    "updated_at": "2024-01-22T11:00:00Z",
    "version": 4
  }
}
```

---

### 7.5. Nạp tiền vào ví con

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/deposit`

Nạp tiền vào ví con.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 200000,
  "description": "Tiền thưởng học giỏi",
  "source": "parent"
}
```

**Fields:**
- `amount` (decimal, required, > 0): Số tiền nạp
- `description` (string, optional, max 300): Mô tả
- `source` (string, required): `parent`, `chore`, `allowance`, `gift`, `other`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "wallet_id": "child-wallet-001",
    "previous_balance": 500000,
    "amount": 200000,
    "new_balance": 700000,
    "description": "Tiền thưởng học giỏi",
    "source": "parent",
    "transaction_id": "txn-deposit-001",
    "created_at": "2024-01-22T12:00:00Z"
  }
}
```

---

### 7.6. Rút tiền từ ví con

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/withdraw`

Rút tiền từ ví con (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 100000,
  "description": "Điều chỉnh số dư",
  "reason": "overpayment"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "wallet_id": "child-wallet-001",
    "previous_balance": 700000,
    "amount": 100000,
    "new_balance": 600000,
    "description": "Điều chỉnh số dư",
    "transaction_id": "txn-withdraw-001",
    "created_at": "2024-01-22T13:00:00Z"
  }
}
```

---

### 7.7. Lấy lịch sử giao dịch ví con

**GET** `/api/v1/groups/{groupId}/child-wallets/{walletId}/transactions`

Lấy lịch sử giao dịch của ví con.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `start_date` (date, optional): Ngày bắt đầu
- `end_date` (date, optional): Ngày kết thúc
- `transaction_type` (string, optional): `deposit`, `withdraw`, `spend`
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn-001",
        "wallet_id": "child-wallet-001",
        "type": "deposit",
        "amount": 200000,
        "balance_after": 700000,
        "description": "Tiền thưởng học giỏi",
        "source": "parent",
        "created_at": "2024-01-22T12:00:00Z"
      },
      {
        "id": "txn-002",
        "type": "spend",
        "amount": -50000,
        "balance_after": 650000,
        "description": "Mua sách",
        "category_id": "cat-education",
        "approved_by": "parent",
        "created_at": "2024-01-22T14:00:00Z"
      },
      {
        "id": "txn-003",
        "type": "deposit",
        "amount": 30000,
        "balance_after": 680000,
        "description": "Hoàn thành việc nhà: Rửa bát",
        "source": "chore",
        "chore_id": "chore-001",
        "created_at": "2024-01-22T15:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 25,
      "items_per_page": 20
    },
    "summary": {
      "total_deposits": 1500000,
      "total_withdraws": 300000,
      "total_spends": 600000,
      "current_balance": 600000
    }
  }
}
```

---

### 7.8. Xóa ví con

**DELETE** `/api/v1/groups/{groupId}/child-wallets/{walletId}`

Xóa ví con (chỉ owner, phải rút hết số dư trước).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Ví con đã được xóa"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "WALLET_NOT_EMPTY",
    "message": "Không thể xóa ví con khi còn số dư",
    "details": {
      "current_balance": 600000
    }
  }
}
```

---

## 8. Child Management

### 8.1. Tạo yêu cầu chi tiêu

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/spend-requests`

Tạo yêu cầu chi tiêu từ ví con (cần phê duyệt parent).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 150000,
  "category_id": "cat-toys",
  "description": "Mua đồ chơi Lego",
  "notes": "Em muốn mua bộ Lego City ạ!",
  "image_key": "spend-requests/lego-city.jpg"
}
```

**Fields:**
- `amount` (decimal, required, > 0): Số tiền yêu cầu
- `category_id` (UUID, required): Danh mục
- `description` (string, required, max 300): Mô tả
- `notes` (text, optional): Ghi chú
- `image_key` (string, optional): Ảnh sản phẩm

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "spend-req-001",
    "wallet_id": "child-wallet-001",
    "amount": 150000,
    "currency": "VND",
    "category_id": "cat-toys",
    "description": "Mua đồ chơi Lego",
    "notes": "Em muốn mua bộ Lego City ạ!",
    "image_key": "spend-requests/lego-city.jpg",
    "status": "pending",
    "created_at": "2024-01-22T16:00:00Z",
    "updated_at": "2024-01-22T16:00:00Z",
    "child": {
      "name": "Nguyễn Minh An",
      "age": 8,
      "avatar_key": "child-wallets/avatar-an.jpg"
    },
    "category": {
      "name": "Đồ chơi",
      "icon": "🎮",
      "color": "#FF6B6B"
    }
  }
}
```

---

### 8.2. Lấy danh sách yêu cầu chi tiêu

**GET** `/api/v1/groups/{groupId}/child-wallets/{walletId}/spend-requests`

Lấy danh sách yêu cầu chi tiêu.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): `pending`, `approved`, `rejected`, `cancelled`
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "spend_requests": [
      {
        "id": "spend-req-001",
        "wallet_id": "child-wallet-001",
        "amount": 150000,
        "currency": "VND",
        "category_id": "cat-toys",
        "description": "Mua đồ chơi Lego",
        "status": "approved",
        "created_at": "2024-01-22T16:00:00Z",
        "responded_at": "2024-01-22T17:00:00Z",
        "responded_by": "parent-001",
        "child": {
          "name": "Nguyễn Minh An",
          "avatar_key": "child-wallets/avatar-an.jpg"
        },
        "category": {
          "name": "Đồ chơi",
          "icon": "🎮"
        }
      },
      {
        "id": "spend-req-002",
        "amount": 80000,
        "category_id": "cat-food",
        "description": "Ăn vặt với bạn",
        "status": "pending",
        "created_at": "2024-01-22T18:00:00Z",
        "child": {
          "name": "Nguyễn Minh An",
          "avatar_key": "child-wallets/avatar-an.jpg"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 8,
      "items_per_page": 20
    },
    "summary": {
      "pending_count": 2,
      "approved_count": 5,
      "rejected_count": 1,
      "total_requested_amount": 1200000,
      "total_approved_amount": 750000
    }
  }
}
```

---

### 8.3. Phê duyệt yêu cầu chi tiêu

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}/approve`

Phê duyệt yêu cầu chi tiêu (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Được rồi con, nhưng nhớ học bài trước nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "spend-req-001",
    "status": "approved",
    "responded_by_user_id": "parent-001",
    "responded_at": "2024-01-22T17:00:00Z",
    "response_notes": "Được rồi con, nhưng nhớ học bài trước nhé!",
    "transaction_id": "txn-spend-001",
    "new_balance": 450000
  }
}
```

---

### 8.4. Từ chối yêu cầu chi tiêu

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}/reject`

Từ chối yêu cầu chi tiêu (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Con mới mua đồ chơi tuần trước rồi, tháng sau mới mua tiếp nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "spend-req-002",
    "status": "rejected",
    "responded_by_user_id": "parent-001",
    "responded_at": "2024-01-22T18:30:00Z",
    "rejection_reason": "Con mới mua đồ chơi tuần trước rồi, tháng sau mới mua tiếp nhé!"
  }
}
```

---

### 8.5. Hủy yêu cầu chi tiêu

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}/cancel`

Hủy yêu cầu chi tiêu (chỉ người tạo).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "spend-req-003",
    "status": "cancelled",
    "cancelled_at": "2024-01-22T19:00:00Z"
  }
}
```

---

### 8.6. Tạo việc nhà

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/chores`

Tạo việc nhà cho con (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Rửa bát sau bữa tối",
  "description": "Rửa sạch bát đĩa và sắp xếp vào tủ",
  "reward_amount": 30000,
  "frequency": "daily",
  "due_date": "2024-01-23",
  "difficulty": "easy",
  "estimated_minutes": 15,
  "icon": "🍽️"
}
```

**Fields:**
- `title` (string, required, max 200): Tiêu đề việc nhà
- `description` (text, optional): Mô tả chi tiết
- `reward_amount` (decimal, required, ≥ 0): Số tiền thưởng
- `frequency` (string, required): `once`, `daily`, `weekly`, `monthly`
- `due_date` (date, optional): Hạn hoàn thành
- `difficulty` (string, optional): `easy`, `medium`, `hard`
- `estimated_minutes` (integer, optional): Thời gian ước tính (phút)
- `icon` (string, optional): Icon hiển thị

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "chore-001",
    "wallet_id": "child-wallet-001",
    "title": "Rửa bát sau bữa tối",
    "description": "Rửa sạch bát đĩa và sắp xếp vào tủ",
    "reward_amount": 30000,
    "currency": "VND",
    "frequency": "daily",
    "due_date": "2024-01-23",
    "difficulty": "easy",
    "estimated_minutes": 15,
    "icon": "🍽️",
    "status": "assigned",
    "created_at": "2024-01-22T20:00:00Z",
    "child": {
      "name": "Nguyễn Minh An",
      "age": 8,
      "avatar_key": "child-wallets/avatar-an.jpg"
    }
  }
}
```

---

### 8.7. Lấy danh sách việc nhà

**GET** `/api/v1/groups/{groupId}/child-wallets/{walletId}/chores`

Lấy danh sách việc nhà của con.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): `assigned`, `in_progress`, `submitted`, `approved`, `rejected`
- `frequency` (string, optional): `once`, `daily`, `weekly`, `monthly`
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "chores": [
      {
        "id": "chore-001",
        "title": "Rửa bát sau bữa tối",
        "description": "Rửa sạch bát đĩa và sắp xếp vào tủ",
        "reward_amount": 30000,
        "currency": "VND",
        "frequency": "daily",
        "due_date": "2024-01-23",
        "difficulty": "easy",
        "estimated_minutes": 15,
        "icon": "🍽️",
        "status": "approved",
        "completed_at": "2024-01-22T19:00:00Z",
        "approved_at": "2024-01-22T20:00:00Z",
        "created_at": "2024-01-22T20:00:00Z"
      },
      {
        "id": "chore-002",
        "title": "Dọn phòng",
        "reward_amount": 50000,
        "frequency": "weekly",
        "due_date": "2024-01-28",
        "difficulty": "medium",
        "icon": "🧹",
        "status": "assigned",
        "created_at": "2024-01-22T20:05:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 10,
      "items_per_page": 20
    },
    "summary": {
      "assigned_count": 3,
      "in_progress_count": 1,
      "submitted_count": 2,
      "approved_count": 4,
      "total_earnings_this_month": 150000
    }
  }
}
```

---

### 8.8. Hoàn thành việc nhà

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/chores/{choreId}/complete`

Đánh dấu việc nhà đã hoàn thành (child hoặc parent).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "proof_image_key": "chores/proof-rua-bat-001.jpg",
  "notes": "Con đã rửa hết và sắp xếp gọn gàng rồi ạ!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "chore-001",
    "status": "submitted",
    "completed_at": "2024-01-22T19:00:00Z",
    "proof_image_key": "chores/proof-rua-bat-001.jpg",
    "completion_notes": "Con đã rửa hết và sắp xếp gọn gàng rồi ạ!"
  }
}
```

---

### 8.9. Phê duyệt việc nhà

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/chores/{choreId}/approve`

Phê duyệt việc nhà và chuyển tiền thưởng (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "feedback": "Con làm rất tốt! Tiếp tục phát huy nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "chore-001",
    "status": "approved",
    "approved_by_user_id": "parent-001",
    "approved_at": "2024-01-22T20:00:00Z",
    "feedback": "Con làm rất tốt! Tiếp tục phát huy nhé!",
    "reward_paid": 30000,
    "new_wallet_balance": 530000,
    "transaction_id": "txn-chore-reward-001"
  }
}
```

---

### 8.10. Từ chối việc nhà

**POST** `/api/v1/groups/{groupId}/child-wallets/{walletId}/chores/{choreId}/reject`

Từ chối việc nhà (chỉ parent/admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Con chưa lau sạch bếp, làm lại nhé!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "chore-003",
    "status": "rejected",
    "rejected_by_user_id": "parent-001",
    "rejected_at": "2024-01-22T21:00:00Z",
    "rejection_reason": "Con chưa lau sạch bếp, làm lại nhé!",
    "can_retry": true
  }
}
```

---

## 9. Activities

### 9.1. Lấy lịch sử hoạt động nhóm

**GET** `/api/v1/groups/{groupId}/activities`

Lấy lịch sử hoạt động trong nhóm (audit trail).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `activity_type` (string, optional): Lọc theo loại hoạt động
- `user_id` (UUID, optional): Lọc theo người thực hiện
- `start_date` (date, optional): Ngày bắt đầu
- `end_date` (date, optional): Ngày kết thúc
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 50)

**Activity Types:**
- `expense_added`, `expense_updated`, `expense_deleted`
- `settlement_created`, `settlement_confirmed`, `settlement_rejected`
- `member_joined`, `member_left`, `member_role_changed`
- `message_sent`, `message_deleted`
- `child_wallet_created`, `child_wallet_updated`
- `spend_request_created`, `spend_request_approved`, `spend_request_rejected`
- `chore_created`, `chore_completed`, `chore_approved`
- `group_updated`, `group_archived`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "act-001",
        "group_id": "550e8400-e29b-41d4-a716-446655440000",
        "activity_type": "expense_added",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "description": "Nguyễn Văn A đã thêm chi phí 'Tiền điện tháng 1'",
        "metadata": {
          "expense_id": "880e8400-e29b-41d4-a716-446655440000",
          "amount": 1500000,
          "description": "Tiền điện tháng 1"
        },
        "created_at": "2024-01-20T18:00:00Z",
        "user": {
          "full_name": "Nguyễn Văn A",
          "avatar_key": "users/avatars/user-a.jpg"
        }
      },
      {
        "id": "act-002",
        "activity_type": "settlement_created",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "description": "Nguyễn Văn B đã thanh toán 200,000₫ cho Nguyễn Văn A",
        "metadata": {
          "settlement_id": "990e8400-e29b-41d4-a716-446655440000",
          "from_user": "Nguyễn Văn B",
          "to_user": "Nguyễn Văn A",
          "amount": 200000
        },
        "created_at": "2024-01-21T10:00:00Z",
        "user": {
          "full_name": "Nguyễn Văn B",
          "avatar_key": "users/avatars/user-b.jpg"
        }
      },
      {
        "id": "act-003",
        "activity_type": "spend_request_approved",
        "user_id": "parent-001",
        "description": "Parent đã phê duyệt yêu cầu chi tiêu 150,000₫ của Nguyễn Minh An",
        "metadata": {
          "request_id": "spend-req-001",
          "child_name": "Nguyễn Minh An",
          "amount": 150000,
          "description": "Mua đồ chơi Lego"
        },
        "created_at": "2024-01-22T17:00:00Z"
      },
      {
        "id": "act-004",
        "activity_type": "chore_approved",
        "user_id": "parent-001",
        "description": "Parent đã phê duyệt việc nhà 'Rửa bát sau bữa tối' - Thưởng 30,000₫",
        "metadata": {
          "chore_id": "chore-001",
          "child_name": "Nguyễn Minh An",
          "reward_amount": 30000,
          "title": "Rửa bát sau bữa tối"
        },
        "created_at": "2024-01-22T20:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 95,
      "items_per_page": 50
    }
  }
}
```

---

### 9.2. Lấy thống kê hoạt động

**GET** `/api/v1/groups/{groupId}/activities/statistics`

Lấy thống kê hoạt động nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): `week`, `month`, `quarter`, `year` (default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "statistics": {
      "total_activities": 95,
      "expenses": {
        "added": 25,
        "updated": 8,
        "deleted": 2,
        "total_amount": 45000000
      },
      "settlements": {
        "created": 10,
        "confirmed": 8,
        "rejected": 1,
        "total_amount": 5000000
      },
      "members": {
        "joined": 2,
        "left": 0,
        "role_changed": 1
      },
      "messages": {
        "sent": 35,
        "deleted": 1
      },
      "child_activities": {
        "wallet_created": 2,
        "spend_requests": 8,
        "approved_requests": 5,
        "rejected_requests": 1,
        "chores_completed": 12,
        "total_rewards": 360000
      },
      "most_active_users": [
        {
          "user_id": "123e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyễn Văn A",
          "activity_count": 45
        },
        {
          "user_id": "789e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyễn Văn B",
          "activity_count": 28
        }
      ]
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| **Groups** |||
| `GROUP_NOT_FOUND` | 404 | Nhóm không tồn tại |
| `GROUP_ARCHIVED` | 400 | Nhóm đã bị lưu trữ |
| `INSUFFICIENT_PERMISSION` | 403 | Không có quyền thực hiện |
| `UNSETTLED_BALANCES` | 400 | Còn công nợ chưa thanh toán |
| **Members** |||
| `MEMBER_ALREADY_EXISTS` | 400 | Thành viên đã tồn tại |
| `MEMBER_NOT_FOUND` | 404 | Thành viên không tồn tại |
| `CANNOT_REMOVE_OWNER` | 400 | Không thể xóa owner |
| `CANNOT_LEAVE_WITH_DEBT` | 400 | Không thể rời khi còn nợ |
| **Expenses** |||
| `EXPENSE_NOT_FOUND` | 404 | Chi phí không tồn tại |
| `INVALID_SPLIT` | 400 | Phân chia không hợp lệ |
| `SPLIT_SUM_MISMATCH` | 400 | Tổng split ≠ amount |
| `PAYER_NOT_MEMBER` | 400 | Người trả không phải thành viên |
| **Settlements** |||
| `SETTLEMENT_NOT_FOUND` | 404 | Thanh toán không tồn tại |
| `INVALID_SETTLEMENT_AMOUNT` | 400 | Số tiền thanh toán không hợp lệ |
| `ALREADY_CONFIRMED` | 400 | Đã xác nhận rồi |
| `NOT_RECEIVER` | 403 | Không phải người nhận |
| **Comments** |||
| `COMMENT_NOT_FOUND` | 404 | Comment không tồn tại |
| `CANNOT_EDIT_COMMENT` | 403 | Không thể sửa comment |
| **Messages** |||
| `MESSAGE_NOT_FOUND` | 404 | Tin nhắn không tồn tại |
| `CHAT_DISABLED` | 400 | Chat bị tắt trong nhóm |
| `EDIT_TIME_EXPIRED` | 400 | Hết thời gian sửa (15 phút) |
| **Child Wallets** |||
| `CHILD_WALLET_NOT_FOUND` | 404 | Ví con không tồn tại |
| `WALLET_NOT_EMPTY` | 400 | Ví còn số dư |
| `INSUFFICIENT_BALANCE` | 400 | Số dư không đủ |
| `SPEND_LIMIT_EXCEEDED` | 400 | Vượt hạn mức chi tiêu |
| `CATEGORY_NOT_ALLOWED` | 400 | Danh mục không được phép |
| `APPROVAL_REQUIRED` | 400 | Cần phê duyệt parent |
| **Spend Requests** |||
| `SPEND_REQUEST_NOT_FOUND` | 404 | Yêu cầu không tồn tại |
| `REQUEST_ALREADY_RESPONDED` | 400 | Đã phản hồi rồi |
| **Chores** |||
| `CHORE_NOT_FOUND` | 404 | Việc nhà không tồn tại |
| `CHORE_NOT_COMPLETED` | 400 | Chưa hoàn thành |
| `CHORE_ALREADY_APPROVED` | 400 | Đã phê duyệt rồi |

---

## Business Rules

### Groups

1. **Quyền hạn:**
   - **Owner:** Toàn quyền (quản lý members, settings, xóa nhóm)
   - **Admin:** Quản lý expenses, settlements, child wallets
   - **Member:** Tạo expenses, settlements, gửi messages

2. **Xóa nhóm:**
   - Chỉ owner
   - Phải settle hết công nợ
   - Soft delete (giữ lại lịch sử)

3. **Group types:**
   - `family`: Gia đình (enable child wallets)
   - `travel`: Du lịch (focus vào expenses)
   - `roommate`: Bạn cùng phòng
   - `couple`: Cặp đôi
   - `project`: Dự án
   - `other`: Khác

### Expenses & Splits

4. **Split methods:**
   - `EQUAL`: Chia đều cho tất cả
   - `PERCENTAGE`: Theo % (tổng phải = 100%)
   - `EXACT`: Số tiền cụ thể (tổng phải = amount)
   - `SHARES`: Theo shares (ví dụ: 2:1:1)

5. **Balance calculation:**
   - Balance = Total Paid - Total Owed
   - Balance âm: Đang nợ nhóm
   - Balance dương: Nhóm đang nợ mình

6. **Simplified debts:**
   - Thuật toán tối ưu số lượng giao dịch thanh toán
   - Dùng graph algorithm (min transactions)

### Settlements

7. **Settlement flow:**
   - Tạo → Pending
   - Người nhận xác nhận → Confirmed
   - Cập nhật balances
   - Có thể đính kèm proof (ảnh chuyển khoản)

### Child Wallets

8. **Privacy levels:**
   - `full_access`: Con chi tiêu tự do trong hạn mức
   - `parent_supervised`: Mọi giao dịch cần phê duyệt
   - `view_only`: Chỉ xem, không chi tiêu

9. **Spend limits:**
   - Daily limit: Hạn mức/ngày
   - Weekly limit: Hạn mức/tuần
   - Require approval above: Giao dịch > X cần phê duyệt

10. **Allowance:**
    - Weekly allowance: Tự động nạp hàng tuần
    - Job chạy vào Chủ nhật 00:00

11. **Categories:**
    - Giới hạn categories được phép
    - Ví dụ: chỉ cho phép food, education, không cho phép games

### Chores (Gamification)

12. **Chore workflow:**
    - Assigned → In Progress → Submitted → Approved/Rejected
    - Nếu rejected, có thể làm lại (can_retry)

13. **Rewards:**
    - Tự động chuyển vào ví con khi approved
    - Tạo transaction loại `chore_reward`

14. **Frequency:**
    - `once`: Một lần
    - `daily`: Hàng ngày
    - `weekly`: Hàng tuần
    - `monthly`: Hàng tháng

### Messages

15. **Message types:**
    - `text`: Tin nhắn thường
    - `image`: Hình ảnh
    - `expense_card`: Card chi phí (auto-generated)
    - `system`: Hệ thống (thành viên join, expense added...)

16. **Read receipts:**
    - Track read status per user
    - Show "read by N members"

17. **Edit/Delete:**
    - Edit: Trong 15 phút sau khi gửi
    - Delete: Người gửi hoặc admin
    - Hiện "[Đã xóa]" thay vì xóa hẳn

### Comments

18. **Polymorphic comments:**
    - Comment trên transaction (cá nhân)
    - Comment trên group_expense (nhóm)
    - Support nested replies (1 level)

### Activities

19. **Audit trail:**
    - Ghi lại tất cả hoạt động
    - Không cho phép xóa
    - Giữ metadata đầy đủ

20. **Retention:**
    - Giữ 12 tháng
    - Sau đó archive hoặc xóa

---

## Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| Groups CRUD | 100 requests/hour |
| Expenses | 200 requests/hour |
| Messages | 1000 requests/hour |
| Activities | 500 requests/hour |
| Child wallets | 200 requests/hour |

---

## Webhooks (Future)

Các events có thể gửi webhook:

- `group.expense.added`
- `group.settlement.confirmed`
- `group.message.sent`
- `group.child_wallet.spend_request.created`
- `group.child_wallet.chore.completed`

---

## Notes

1. **Performance:**
   - Balance calculations cached
   - Simplified debts recalculated on-demand
   - Message pagination dùng cursor (before/after message_id)

2. **Security:**
   - RLS policies trên tất cả bảng
   - User chỉ thấy groups mình tham gia
   - Parent chỉ thấy child wallets trong group mình là owner/admin

3. **Notifications:**
   - Push notification khi:
     - Có expense mới
     - Có spend request từ con
     - Chore được approved
     - Có tin nhắn mới
     - Có người mention (@user)

4. **Offline support:**
   - Expenses, settlements, messages hỗ trợ offline
   - Child wallet operations cần online (real-time balance)

5. **File storage:**
   - Avatars, receipts, proofs: S3
   - Thumbnails: Auto-generated
   - Max file size: 10MB

---

**Cập nhật:** 11/10/2026  
**Tổng số endpoints:** 53  
**Phiên bản:** 2.0 - Full Groups Module với Family Mode
