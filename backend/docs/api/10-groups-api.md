# Groups API

API cho quản lý nhóm chi tiêu chia sẻ (shared expense groups).

## Base URL
```
/api/v1/groups
```

## Endpoints

### 1. Tạo nhóm mới

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
  "name": "Chuyến du lịch Đà Lạt",
  "description": "Chi phí chuyến du lịch cuối tuần",
  "currency": "VND",
  "avatar_url": "https://example.com/avatar.jpg",
  "settings": {
    "split_method": "equal",
    "auto_settle": false,
    "require_receipt": true
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Chuyến du lịch Đà Lạt",
    "description": "Chi phí chuyến du lịch cuối tuần",
    "currency": "VND",
    "avatar_url": "https://example.com/avatar.jpg",
    "owner_id": "123e4567-e89b-12d3-a456-426614174000",
    "member_count": 1,
    "total_expenses": 0,
    "settings": {
      "split_method": "equal",
      "auto_settle": false,
      "require_receipt": true
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### 2. Lấy danh sách nhóm

**GET** `/api/v1/groups`

Lấy danh sách các nhóm mà user tham gia.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): Trạng thái nhóm (`active`, `archived`)
- `role` (string, optional): Vai trò (`owner`, `admin`, `member`)
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
        "name": "Chuyến du lịch Đà Lạt",
        "description": "Chi phí chuyến du lịch cuối tuần",
        "currency": "VND",
        "avatar_url": "https://example.com/avatar.jpg",
        "owner_id": "123e4567-e89b-12d3-a456-426614174000",
        "member_count": 5,
        "total_expenses": 15000000,
        "my_balance": -500000,
        "my_role": "owner",
        "status": "active",
        "last_activity_at": "2024-01-20T15:30:00Z",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1,
      "items_per_page": 20
    }
  }
}
```

---

### 3. Lấy chi tiết nhóm

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
    "name": "Chuyến du lịch Đà Lạt",
    "description": "Chi phí chuyến du lịch cuối tuần",
    "currency": "VND",
    "avatar_url": "https://example.com/avatar.jpg",
    "owner_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "member_count": 5,
    "total_expenses": 15000000,
    "total_payments": 10000000,
    "settings": {
      "split_method": "equal",
      "auto_settle": false,
      "require_receipt": true
    },
    "my_role": "owner",
    "my_balance": -500000,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z",
    "archived_at": null
  }
}
```

---

### 4. Cập nhật nhóm

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
  "name": "Chuyến du lịch Đà Lạt 2024",
  "description": "Chi phí chuyến du lịch cuối tuần updated",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "settings": {
    "split_method": "percentage",
    "auto_settle": true,
    "require_receipt": false
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Chuyến du lịch Đà Lạt 2024",
    "description": "Chi phí chuyến du lịch cuối tuần updated",
    "currency": "VND",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "settings": {
      "split_method": "percentage",
      "auto_settle": true,
      "require_receipt": false
    },
    "updated_at": "2024-01-21T10:00:00Z"
  }
}
```

---

### 5. Xóa nhóm

**DELETE** `/api/v1/groups/{groupId}`

Xóa nhóm (chỉ owner, phải settle hết debts trước).

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
      "unsettled_members": 3,
      "total_debt": 2500000
    }
  }
}
```

---

### 6. Thêm thành viên

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
  "role": "member"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "role": "member",
    "balance": 0,
    "joined_at": "2024-01-21T11:00:00Z",
    "user": {
      "id": "789e4567-e89b-12d3-a456-426614174000",
      "full_name": "Nguyen Van B",
      "email": "nguyenvanb@example.com",
      "avatar_url": "https://example.com/avatar-b.jpg"
    }
  }
}
```

---

### 7. Lấy danh sách thành viên

**GET** `/api/v1/groups/{groupId}/members`

Lấy danh sách thành viên trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `role` (string, optional): Lọc theo vai trò
- `status` (string, optional): Lọc theo trạng thái (`active`, `left`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "role": "owner",
        "balance": -500000,
        "total_paid": 8000000,
        "total_owed": 7500000,
        "joined_at": "2024-01-15T10:00:00Z",
        "user": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyen Van A",
          "email": "nguyenvana@example.com",
          "avatar_url": "https://example.com/avatar-a.jpg"
        }
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "role": "member",
        "balance": 200000,
        "total_paid": 5000000,
        "total_owed": 5200000,
        "joined_at": "2024-01-16T14:00:00Z",
        "user": {
          "id": "789e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyen Van B",
          "email": "nguyenvanb@example.com",
          "avatar_url": "https://example.com/avatar-b.jpg"
        }
      }
    ]
  }
}
```

---

### 8. Cập nhật vai trò thành viên

**PATCH** `/api/v1/groups/{groupId}/members/{memberId}`

Cập nhật vai trò thành viên (chỉ owner).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "789e4567-e89b-12d3-a456-426614174000",
    "role": "admin",
    "updated_at": "2024-01-21T12:00:00Z"
  }
}
```

---

### 9. Xóa thành viên

**DELETE** `/api/v1/groups/{groupId}/members/{memberId}`

Xóa thành viên khỏi nhóm hoặc rời nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Thành viên đã được xóa khỏi nhóm"
}
```

---

### 10. Tạo chi phí nhóm

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
  "description": "Tiền khách sạn",
  "amount": 6000000,
  "paid_by": "123e4567-e89b-12d3-a456-426614174000",
  "split_method": "equal",
  "category_id": "cat-accommodation",
  "transaction_date": "2024-01-20",
  "receipt_url": "https://example.com/receipt.jpg",
  "notes": "Khách sạn Đà Lạt Palace 3 đêm",
  "splits": [
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 1200000,
      "percentage": 20
    },
    {
      "user_id": "789e4567-e89b-12d3-a456-426614174000",
      "amount": 1200000,
      "percentage": 20
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Tiền khách sạn",
    "amount": 6000000,
    "currency": "VND",
    "paid_by": "123e4567-e89b-12d3-a456-426614174000",
    "split_method": "equal",
    "category_id": "cat-accommodation",
    "transaction_date": "2024-01-20",
    "receipt_url": "https://example.com/receipt.jpg",
    "notes": "Khách sạn Đà Lạt Palace 3 đêm",
    "created_by": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-20T18:00:00Z",
    "splits": [
      {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 1200000,
        "percentage": 20,
        "user": {
          "full_name": "Nguyen Van A",
          "avatar_url": "https://example.com/avatar-a.jpg"
        }
      },
      {
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "amount": 1200000,
        "percentage": 20,
        "user": {
          "full_name": "Nguyen Van B",
          "avatar_url": "https://example.com/avatar-b.jpg"
        }
      }
    ]
  }
}
```

---

### 11. Lấy danh sách chi phí nhóm

**GET** `/api/v1/groups/{groupId}/expenses`

Lấy danh sách chi phí trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `start_date` (string, optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (string, optional): Ngày kết thúc (YYYY-MM-DD)
- `category_id` (string, optional): Lọc theo category
- `paid_by` (string, optional): Lọc theo người trả
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "description": "Tiền khách sạn",
        "amount": 6000000,
        "currency": "VND",
        "paid_by": "123e4567-e89b-12d3-a456-426614174000",
        "split_method": "equal",
        "category_id": "cat-accommodation",
        "transaction_date": "2024-01-20",
        "receipt_url": "https://example.com/receipt.jpg",
        "created_at": "2024-01-20T18:00:00Z",
        "payer": {
          "full_name": "Nguyen Van A",
          "avatar_url": "https://example.com/avatar-a.jpg"
        },
        "split_count": 5,
        "my_share": 1200000
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    },
    "summary": {
      "total_expenses": 15000000,
      "my_total_paid": 8000000,
      "my_total_share": 7500000,
      "my_balance": -500000
    }
  }
}
```

---

### 12. Cập nhật chi phí nhóm

**PUT** `/api/v1/groups/{groupId}/expenses/{expenseId}`

Cập nhật chi phí trong nhóm (chỉ người tạo hoặc admin).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Tiền khách sạn (đã cập nhật)",
  "amount": 6500000,
  "transaction_date": "2024-01-20",
  "notes": "Đã thêm phí dịch vụ",
  "splits": [
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 1300000
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
    "description": "Tiền khách sạn (đã cập nhật)",
    "amount": 6500000,
    "updated_at": "2024-01-21T09:00:00Z"
  }
}
```

---

### 13. Xóa chi phí nhóm

**DELETE** `/api/v1/groups/{groupId}/expenses/{expenseId}`

Xóa chi phí khỏi nhóm.

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

### 14. Tạo thanh toán

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
  "amount": 1000000,
  "payment_method": "bank_transfer",
  "transaction_date": "2024-01-21",
  "notes": "Thanh toán nợ tiền khách sạn",
  "proof_url": "https://example.com/payment-proof.jpg"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
    "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 1000000,
    "currency": "VND",
    "payment_method": "bank_transfer",
    "transaction_date": "2024-01-21",
    "notes": "Thanh toán nợ tiền khách sạn",
    "proof_url": "https://example.com/payment-proof.jpg",
    "status": "pending",
    "created_at": "2024-01-21T10:00:00Z",
    "from_user": {
      "full_name": "Nguyen Van B",
      "avatar_url": "https://example.com/avatar-b.jpg"
    },
    "to_user": {
      "full_name": "Nguyen Van A",
      "avatar_url": "https://example.com/avatar-a.jpg"
    }
  }
}
```

---

### 15. Xác nhận thanh toán

**PATCH** `/api/v1/groups/{groupId}/settlements/{settlementId}/confirm`

Xác nhận đã nhận thanh toán (người nhận).

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

### 16. Lấy bảng cân đối

**GET** `/api/v1/groups/{groupId}/balances`

Lấy bảng cân đối công nợ của nhóm.

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
        "total_paid": 8000000,
        "total_owed": 7500000,
        "user": {
          "full_name": "Nguyen Van A",
          "avatar_url": "https://example.com/avatar-a.jpg"
        }
      },
      {
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "balance": 200000,
        "total_paid": 5000000,
        "total_owed": 5200000,
        "user": {
          "full_name": "Nguyen Van B",
          "avatar_url": "https://example.com/avatar-b.jpg"
        }
      }
    ],
    "simplified_debts": [
      {
        "from_user_id": "789e4567-e89b-12d3-a456-426614174000",
        "to_user_id": "123e4567-e89b-12d3-a456-426614174000",
        "amount": 500000,
        "from_user": {
          "full_name": "Nguyen Van B"
        },
        "to_user": {
          "full_name": "Nguyen Van A"
        }
      }
    ],
    "total_group_expenses": 15000000,
    "is_settled": false
  }
}
```

---

### 17. Lấy lịch sử hoạt động

**GET** `/api/v1/groups/{groupId}/activities`

Lấy lịch sử hoạt động trong nhóm.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type` (string, optional): Loại hoạt động (`expense_added`, `payment_made`, `member_joined`, `member_left`)
- `page` (integer, optional): Số trang
- `limit` (integer, optional): Số lượng/trang

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "act-001",
        "type": "expense_added",
        "description": "Nguyen Van A đã thêm chi phí 'Tiền khách sạn'",
        "amount": 6000000,
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "reference_id": "880e8400-e29b-41d4-a716-446655440000",
        "created_at": "2024-01-20T18:00:00Z",
        "user": {
          "full_name": "Nguyen Van A",
          "avatar_url": "https://example.com/avatar-a.jpg"
        }
      },
      {
        "id": "act-002",
        "type": "payment_made",
        "description": "Nguyen Van B đã thanh toán 1,000,000₫ cho Nguyen Van A",
        "amount": 1000000,
        "user_id": "789e4567-e89b-12d3-a456-426614174000",
        "reference_id": "990e8400-e29b-41d4-a716-446655440000",
        "created_at": "2024-01-21T10:00:00Z",
        "user": {
          "full_name": "Nguyen Van B",
          "avatar_url": "https://example.com/avatar-b.jpg"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 25,
      "items_per_page": 20
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `GROUP_NOT_FOUND` | 404 | Nhóm không tồn tại |
| `INSUFFICIENT_PERMISSION` | 403 | Không có quyền thực hiện hành động |
| `MEMBER_ALREADY_EXISTS` | 400 | Thành viên đã tồn tại trong nhóm |
| `MEMBER_NOT_FOUND` | 404 | Thành viên không tồn tại |
| `EXPENSE_NOT_FOUND` | 404 | Chi phí không tồn tại |
| `INVALID_SPLIT` | 400 | Phân chia không hợp lệ |
| `UNSETTLED_BALANCES` | 400 | Còn công nợ chưa thanh toán |
| `SETTLEMENT_NOT_FOUND` | 404 | Giao dịch thanh toán không tồn tại |
| `CANNOT_LEAVE_GROUP` | 400 | Không thể rời nhóm (còn nợ hoặc là owner) |

---

## Business Rules

1. **Quyền hạn:**
   - Owner: Toàn quyền
   - Admin: Thêm/xóa member, tạo/sửa/xóa expenses
   - Member: Tạo expense, thanh toán, xem thông tin

2. **Split methods:**
   - `equal`: Chia đều
   - `percentage`: Chia theo %
   - `exact`: Chia theo số tiền cụ thể
   - `shares`: Chia theo shares

3. **Xóa nhóm:**
   - Chỉ owner mới xóa được
   - Phải settle hết công nợ trước
   - Soft delete (lưu lại lịch sử)

4. **Balance calculation:**
   - Balance = Total Paid - Total Owed
   - Balance âm: Đang nợ nhóm
   - Balance dương: Nhóm đang nợ

5. **Settlement:**
   - Cần xác nhận từ người nhận
   - Có thể đính kèm proof (screenshot chuyển khoản)
   - Cập nhật balance sau khi confirm
