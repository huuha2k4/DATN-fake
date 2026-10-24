# API Categories, Merchants & Tags

**Module:** Categories Management  
**Base Path:** `/api/v1/categories`, `/api/v1/merchants`, `/api/v1/tags`  
**Version:** 1.0

---

## 📋 Endpoints

### Categories

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/categories` | Danh sách categories (system + custom) | ✅ |
| GET | `/categories/{id}` | Chi tiết category | ✅ |
| POST | `/categories` | Tạo custom category | ✅ |
| PUT | `/categories/{id}` | Cập nhật custom category | ✅ |
| DELETE | `/categories/{id}` | Xóa custom category | ✅ |
| POST | `/categories/suggest` | Gợi ý category từ description | ✅ |
| GET | `/categories/{id}/statistics` | Thống kê chi tiêu theo category | ✅ |

### Merchants

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/merchants` | Danh sách merchants | ✅ |
| GET | `/merchants/{id}` | Chi tiết merchant | ✅ |
| POST | `/merchants` | Tạo custom merchant | ✅ |
| PUT | `/merchants/{id}` | Cập nhật merchant | ✅ |
| DELETE | `/merchants/{id}` | Xóa custom merchant | ✅ |
| GET | `/merchants/search` | Tìm kiếm merchant | ✅ |
| GET | `/merchants/{id}/transactions` | Giao dịch tại merchant | ✅ |

### Tags

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/tags` | Danh sách tags | ✅ |
| POST | `/tags` | Tạo tag mới | ✅ |
| PUT | `/tags/{id}` | Cập nhật tag | ✅ |
| DELETE | `/tags/{id}` | Xóa tag | ✅ |
| GET | `/tags/{id}/transactions` | Giao dịch có tag | ✅ |

---

## 📂 CATEGORIES API

## 📋 List Categories

Lấy danh sách categories (system + custom của user).

### Request

```http
GET /api/v1/categories?type=EXPENSE&include_children=true&include_hidden=false
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `type` | enum | INCOME, EXPENSE (default: all) |
| `include_children` | boolean | Bao gồm subcategories (default: true) |
| `include_hidden` | boolean | Bao gồm categories đã ẩn (default: false) |
| `sort_by` | enum | name, usage_count, total_amount (default: name) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-food-drinks",
        "name": "Ăn uống",
        "type": "EXPENSE",
        "icon": "🍔",
        "color": "#FF6B6B",
        "is_system": true,
        "is_active": true,
        "parent_id": null,
        "display_order": 1,
        "usage_statistics": {
          "transaction_count": 156,
          "total_amount": 8500000,
          "last_used": "2026-10-11"
        },
        "children": [
          {
            "id": "cat-breakfast",
            "name": "Bữa sáng",
            "type": "EXPENSE",
            "icon": "☕",
            "color": "#FFD93D",
            "is_system": false,
            "is_custom": true,
            "parent_id": "cat-food-drinks",
            "transaction_count": 45
          },
          {
            "id": "cat-lunch",
            "name": "Bữa trưa",
            "type": "EXPENSE",
            "icon": "🍱",
            "color": "#6BCB77",
            "is_system": false,
            "is_custom": true,
            "parent_id": "cat-food-drinks",
            "transaction_count": 60
          }
        ]
      },
      {
        "id": "cat-transport",
        "name": "Di chuyển",
        "type": "EXPENSE",
        "icon": "🚗",
        "color": "#4D96FF",
        "is_system": true,
        "is_active": true,
        "parent_id": null,
        "transaction_count": 89,
        "total_amount": 4200000,
        "children": []
      },
      {
        "id": "cat-salary",
        "name": "Lương",
        "type": "INCOME",
        "icon": "💰",
        "color": "#4CAF50",
        "is_system": true,
        "is_active": true,
        "parent_id": null,
        "transaction_count": 12,
        "total_amount": 180000000,
        "children": []
      }
    ],
    "summary": {
      "total_categories": 45,
      "system_categories": 30,
      "custom_categories": 15,
      "expense_categories": 35,
      "income_categories": 10
    }
  }
}
```

---

## 🔍 Get Category Detail

Chi tiết category với thống kê.

### Request

```http
GET /api/v1/categories/{id}?period=30days
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "cat-food-drinks",
    "name": "Ăn uống",
    "type": "EXPENSE",
    "icon": "🍔",
    "color": "#FF6B6B",
    "description": "Chi tiêu cho ăn uống, cafe, nhà hàng",
    "is_system": true,
    "is_custom": false,
    "is_active": true,
    "parent_id": null,
    "display_order": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "children": [
      {"id": "cat-breakfast", "name": "Bữa sáng", "icon": "☕"},
      {"id": "cat-lunch", "name": "Bữa trưa", "icon": "🍱"},
      {"id": "cat-dinner", "name": "Bữa tối", "icon": "🍽️"}
    ],
    "statistics_30_days": {
      "transaction_count": 45,
      "total_amount": 3200000,
      "average_amount": 71111,
      "percentage_of_total_expense": 37.6,
      "trend": {
        "change_percentage": 15.5,
        "direction": "UP",
        "vs_previous_period": "Tăng 15.5% so với 30 ngày trước"
      },
      "top_merchants": [
        {
          "merchant_id": "merchant-highlands",
          "merchant_name": "Highlands Coffee",
          "amount": 800000,
          "count": 15
        },
        {
          "merchant_id": "merchant-lotteria",
          "merchant_name": "Lotteria",
          "amount": 450000,
          "count": 9
        }
      ],
      "spending_by_day": [
        {"day": "Monday", "amount": 400000, "count": 6},
        {"day": "Tuesday", "amount": 350000, "count": 5},
        {"day": "Wednesday", "amount": 500000, "count": 7}
      ]
    }
  }
}
```

---

## ➕ Create Category

Tạo custom category mới.

### Request

```http
POST /api/v1/categories
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Sách & Học tập",
  "type": "EXPENSE",
  "icon": "📚",
  "color": "#9C27B0",
  "parent_id": null,
  "description": "Chi phí mua sách, khóa học online"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "cat-custom-uuid",
    "name": "Sách & Học tập",
    "type": "EXPENSE",
    "icon": "📚",
    "color": "#9C27B0",
    "parent_id": null,
    "is_system": false,
    "is_custom": true,
    "is_active": true,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Danh mục đã được tạo thành công"
}
```

### Validation Rules

- `name`: Required, unique per user, max 50 ký tự
- `type`: Required, enum [INCOME, EXPENSE]
- `icon`: Optional, emoji or icon code
- `color`: Optional, hex color code
- `parent_id`: Optional, must be valid category ID (không được lồng quá 2 cấp)

---

## ✏️ Update Category

Cập nhật custom category (không thể sửa system category).

### Request

```http
PUT /api/v1/categories/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Sách & Khóa học",
  "icon": "📖",
  "color": "#7E57C2",
  "is_active": true
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "cat-custom-uuid",
    "name": "Sách & Khóa học",
    "icon": "📖",
    "color": "#7E57C2",
    "updated_at": "2026-10-11T10:30:00Z"
  },
  "message": "Danh mục đã được cập nhật"
}
```

### Response Error (403 Forbidden)

```json
{
  "success": false,
  "error": {
    "code": "CANNOT_MODIFY_SYSTEM_CATEGORY",
    "message": "Không thể chỉnh sửa danh mục hệ thống"
  }
}
```

---

## 🗑️ Delete Category

Xóa custom category.

### Request

```http
DELETE /api/v1/categories/{id}?move_transactions_to=cat-other
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `move_transactions_to` | uuid | Yes | Chuyển giao dịch sang category khác |

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Danh mục đã được xóa. 23 giao dịch đã được chuyển sang danh mục khác."
}
```

---

## 🤖 Suggest Category

Gợi ý category dựa trên description (AI).

### Request

```http
POST /api/v1/categories/suggest
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "description": "Cafe sáng tại Highlands",
  "amount": 45000,
  "merchant_name": "Highlands Coffee"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "category_id": "cat-food-drinks",
        "category_name": "Ăn uống",
        "confidence": 0.95,
        "reason": "Merchant 'Highlands Coffee' thường thuộc danh mục 'Ăn uống'",
        "subcategory": {
          "id": "cat-breakfast",
          "name": "Bữa sáng"
        }
      },
      {
        "category_id": "cat-entertainment",
        "category_name": "Giải trí",
        "confidence": 0.15,
        "reason": "Từ khóa 'cafe' đôi khi là giải trí"
      }
    ],
    "recommended": {
      "category_id": "cat-food-drinks",
      "category_name": "Ăn uống",
      "confidence": 0.95
    }
  }
}
```

---

## 📊 Category Statistics

Thống kê chi tiêu theo category.

### Request

```http
GET /api/v1/categories/{id}/statistics?from_date=2026-10-01&to_date=2026-10-31&group_by=day
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-food-drinks",
      "name": "Ăn uống"
    },
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-31"
    },
    "summary": {
      "total_amount": 3200000,
      "transaction_count": 45,
      "average_per_transaction": 71111,
      "average_per_day": 103226
    },
    "by_period": [
      {"date": "2026-10-01", "amount": 150000, "count": 3},
      {"date": "2026-10-02", "amount": 80000, "count": 2}
    ],
    "by_subcategory": [
      {"name": "Bữa sáng", "amount": 900000, "percentage": 28.1},
      {"name": "Bữa trưa", "amount": 1200000, "percentage": 37.5},
      {"name": "Bữa tối", "amount": 1100000, "percentage": 34.4}
    ],
    "top_transactions": [
      {
        "id": "tx-1",
        "amount": 500000,
        "description": "Buffet",
        "date": "2026-10-15"
      }
    ]
  }
}
```

---

## 🏪 MERCHANTS API

## 📋 List Merchants

Danh sách merchants (system + custom).

### Request

```http
GET /api/v1/merchants?search=coffee&category_id=cat-food-drinks&page=1&page_size=20
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "merchant-highlands",
        "name": "Highlands Coffee",
        "logo_url": "https://cdn.finance-app.com/merchants/highlands.png",
        "category": "Cafe & Bakery",
        "is_system": true,
        "transaction_count": 45,
        "total_amount": 1800000,
        "last_used": "2026-10-11",
        "locations": [
          {
            "address": "123 Hoàn Kiếm, Hà Nội",
            "latitude": 21.0285,
            "longitude": 105.8542
          }
        ]
      },
      {
        "id": "merchant-starbucks",
        "name": "Starbucks",
        "logo_url": "https://cdn.finance-app.com/merchants/starbucks.png",
        "category": "Cafe",
        "is_system": true,
        "transaction_count": 12,
        "total_amount": 600000,
        "last_used": "2026-10-09"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 156,
    "total_pages": 8
  }
}
```

---

## ➕ Create Merchant

Tạo custom merchant.

### Request

```http
POST /api/v1/merchants
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Quán Phở Gia Truyền",
  "category": "Nhà hàng",
  "phone": "+84901234567",
  "address": "456 Đường ABC, Hà Nội",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "website": "https://phogia truyen.com"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "merchant-custom-uuid",
    "name": "Quán Phở Gia Truyền",
    "category": "Nhà hàng",
    "is_system": false,
    "is_custom": true,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Merchant đã được tạo thành công"
}
```

---

## 🔍 Search Merchants

Tìm kiếm merchant theo tên, địa chỉ.

### Request

```http
GET /api/v1/merchants/search?q=coffee&location=21.0285,105.8542&radius=5000
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `q` | string | Từ khóa tìm kiếm |
| `location` | string | lat,lng |
| `radius` | int | Bán kính (meters) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "merchant-highlands",
        "name": "Highlands Coffee",
        "distance_meters": 250,
        "address": "123 Hoàn Kiếm, Hà Nội",
        "rating": 4.5,
        "transaction_count": 45
      }
    ]
  }
}
```

---

## 📊 Merchant Transactions

Giao dịch tại merchant.

### Request

```http
GET /api/v1/merchants/{id}/transactions?from_date=2026-10-01&to_date=2026-10-31
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "merchant-highlands",
      "name": "Highlands Coffee"
    },
    "summary": {
      "transaction_count": 15,
      "total_amount": 800000,
      "average_amount": 53333,
      "min_amount": 35000,
      "max_amount": 95000
    },
    "transactions": [
      {
        "id": "tx-1",
        "amount": 45000,
        "description": "Cafe sáng",
        "date": "2026-10-11",
        "category": "Ăn uống"
      }
    ]
  }
}
```

---

## 🏷️ TAGS API

## 📋 List Tags

Danh sách tags của user.

### Request

```http
GET /api/v1/tags?sort_by=usage_count
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag-work",
        "name": "Công việc",
        "color": "#2196F3",
        "icon": "💼",
        "transaction_count": 45,
        "total_amount": 2500000,
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "tag-personal",
        "name": "Cá nhân",
        "color": "#4CAF50",
        "icon": "👤",
        "transaction_count": 123,
        "total_amount": 5800000,
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "tag-urgent",
        "name": "Khẩn cấp",
        "color": "#F44336",
        "icon": "⚠️",
        "transaction_count": 8,
        "total_amount": 1200000,
        "created_at": "2024-03-15T00:00:00Z"
      }
    ],
    "summary": {
      "total_tags": 15,
      "most_used_tag": "Cá nhân",
      "least_used_tag": "Du lịch"
    }
  }
}
```

---

## ➕ Create Tag

Tạo tag mới.

### Request

```http
POST /api/v1/tags
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Gia đình",
  "color": "#FF9800",
  "icon": "👨‍👩‍👧‍👦"
}
```

### Response Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "tag-uuid",
    "name": "Gia đình",
    "color": "#FF9800",
    "icon": "👨‍👩‍👧‍👦",
    "transaction_count": 0,
    "created_at": "2026-10-11T10:00:00Z"
  },
  "message": "Tag đã được tạo thành công"
}
```

---

## ✏️ Update Tag

Cập nhật tag.

### Request

```http
PUT /api/v1/tags/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Gia đình & Bạn bè",
  "color": "#FF5722"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "tag-uuid",
    "name": "Gia đình & Bạn bè",
    "color": "#FF5722",
    "updated_at": "2026-10-11T10:30:00Z"
  }
}
```

---

## 🗑️ Delete Tag

Xóa tag (không xóa giao dịch, chỉ bỏ liên kết).

### Request

```http
DELETE /api/v1/tags/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Tag đã được xóa. Liên kết với 23 giao dịch đã được gỡ bỏ."
}
```

---

## 📊 Tag Transactions

Giao dịch có tag.

### Request

```http
GET /api/v1/tags/{id}/transactions?from_date=2026-10-01&to_date=2026-10-31
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "tag-work",
      "name": "Công việc",
      "color": "#2196F3"
    },
    "summary": {
      "transaction_count": 12,
      "total_income": 0,
      "total_expense": 1200000,
      "net": -1200000
    },
    "transactions": [
      {
        "id": "tx-1",
        "amount": -150000,
        "description": "Taxi đi họp",
        "date": "2026-10-11",
        "category": "Di chuyển"
      }
    ]
  }
}
```

---

## 🔗 Related APIs

- [Transactions API](04-transactions-api.md)
- [Budgets API](06-budgets-api.md)
- [Insights API](13-insights-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
