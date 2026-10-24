# OCR API

API cho nhận diện hóa đơn/biên lai từ hình ảnh (Optical Character Recognition).

## Base URL
```
/api/v1/ocr
```

## Endpoints

### 1. Upload và nhận diện hóa đơn

**POST** `/api/v1/ocr/receipts`

Upload hình ảnh hóa đơn và tự động nhận diện thông tin.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
image: [file] (required) - File ảnh (jpg, png, max 10MB)
language: string (optional) - Ngôn ngữ ("vi", "en", default: "vi")
extract_items: boolean (optional) - Có trích xuất từng item (default: true)
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ocr-123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "image_url": "https://example.com/uploads/receipt-001.jpg",
    "confidence": 0.92,
    "extracted_data": {
      "merchant_name": "Siêu thị Co.opMart",
      "merchant_address": "123 Nguyễn Văn Linh, Q.7, TP.HCM",
      "merchant_phone": "0283 1234567",
      "tax_code": "0123456789",
      "transaction_date": "2024-01-20",
      "transaction_time": "14:35:22",
      "total_amount": 545000,
      "subtotal": 495454.55,
      "tax_amount": 49545.45,
      "tax_rate": 10,
      "currency": "VND",
      "payment_method": "cash",
      "receipt_number": "HD001234",
      "cashier": "Nguyen Van A",
      "items": [
        {
          "name": "Gạo ST25 5kg",
          "quantity": 1,
          "unit_price": 150000,
          "total": 150000,
          "category_suggestion": "Thực phẩm"
        },
        {
          "name": "Dầu ăn Simply 1L",
          "quantity": 2,
          "unit_price": 85000,
          "total": 170000,
          "category_suggestion": "Thực phẩm"
        },
        {
          "name": "Nước ngọt Coca 1.5L",
          "quantity": 3,
          "unit_price": 15000,
          "total": 45000,
          "category_suggestion": "Đồ uống"
        }
      ]
    },
    "processing_time_ms": 2340,
    "created_at": "2024-01-20T14:40:00Z"
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Hình ảnh không hợp lệ hoặc không thể đọc được",
    "details": {
      "file_size": 15728640,
      "max_size": 10485760
    }
  }
}
```

---

### 2. Lấy kết quả OCR

**GET** `/api/v1/ocr/receipts/{ocrId}`

Lấy kết quả nhận diện hóa đơn.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ocr-123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "image_url": "https://example.com/uploads/receipt-001.jpg",
    "confidence": 0.92,
    "extracted_data": {
      "merchant_name": "Siêu thị Co.opMart",
      "total_amount": 545000,
      "transaction_date": "2024-01-20",
      "items": []
    },
    "created_at": "2024-01-20T14:40:00Z",
    "completed_at": "2024-01-20T14:40:03Z"
  }
}
```

**Response (Processing):** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ocr-123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "progress": 45,
    "estimated_time_remaining_ms": 1500,
    "created_at": "2024-01-20T14:40:00Z"
  }
}
```

---

### 3. Cập nhật kết quả OCR

**PATCH** `/api/v1/ocr/receipts/{ocrId}`

Cập nhật/sửa kết quả nhận diện nếu có sai sót.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "extracted_data": {
    "merchant_name": "Siêu thị Co.opMart Quận 7",
    "total_amount": 550000,
    "transaction_date": "2024-01-20",
    "items": [
      {
        "name": "Gạo ST25 5kg",
        "quantity": 1,
        "unit_price": 150000,
        "total": 150000
      }
    ]
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ocr-123e4567-e89b-12d3-a456-426614174000",
    "extracted_data": {
      "merchant_name": "Siêu thị Co.opMart Quận 7",
      "total_amount": 550000,
      "transaction_date": "2024-01-20"
    },
    "updated_at": "2024-01-20T15:00:00Z"
  }
}
```

---

### 4. Tạo transaction từ OCR

**POST** `/api/v1/ocr/receipts/{ocrId}/create-transaction`

Tạo giao dịch từ kết quả nhận diện OCR.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "account_id": "acc-123",
  "category_id": "cat-456",
  "description": "Mua sắm siêu thị",
  "notes": "Mua đồ gia dụng",
  "override_amount": null,
  "override_date": null,
  "create_items": true,
  "tags": ["grocery", "household"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn-789e4567-e89b-12d3-a456-426614174000",
    "ocr_id": "ocr-123e4567-e89b-12d3-a456-426614174000",
    "amount": 545000,
    "description": "Mua sắm siêu thị",
    "transaction_date": "2024-01-20",
    "receipt_url": "https://example.com/uploads/receipt-001.jpg",
    "items_created": 3,
    "created_at": "2024-01-20T15:10:00Z"
  }
}
```

---

### 5. Lấy lịch sử OCR

**GET** `/api/v1/ocr/receipts`

Lấy danh sách các lần nhận diện hóa đơn.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): Trạng thái (`processing`, `completed`, `failed`)
- `start_date` (string, optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (string, optional): Ngày kết thúc (YYYY-MM-DD)
- `has_transaction` (boolean, optional): Đã tạo transaction chưa
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "receipts": [
      {
        "id": "ocr-123e4567-e89b-12d3-a456-426614174000",
        "status": "completed",
        "image_url": "https://example.com/uploads/receipt-001.jpg",
        "thumbnail_url": "https://example.com/uploads/thumbs/receipt-001.jpg",
        "merchant_name": "Siêu thị Co.opMart",
        "total_amount": 545000,
        "transaction_date": "2024-01-20",
        "confidence": 0.92,
        "has_transaction": true,
        "transaction_id": "txn-789e4567-e89b-12d3-a456-426614174000",
        "created_at": "2024-01-20T14:40:00Z"
      },
      {
        "id": "ocr-223e4567-e89b-12d3-a456-426614174001",
        "status": "completed",
        "image_url": "https://example.com/uploads/receipt-002.jpg",
        "thumbnail_url": "https://example.com/uploads/thumbs/receipt-002.jpg",
        "merchant_name": "Nhà hàng ABC",
        "total_amount": 320000,
        "transaction_date": "2024-01-19",
        "confidence": 0.88,
        "has_transaction": false,
        "transaction_id": null,
        "created_at": "2024-01-19T19:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    },
    "statistics": {
      "total_receipts": 45,
      "completed": 42,
      "processing": 1,
      "failed": 2,
      "with_transaction": 38
    }
  }
}
```

---

### 6. Xóa kết quả OCR

**DELETE** `/api/v1/ocr/receipts/{ocrId}`

Xóa kết quả nhận diện và ảnh (không xóa transaction đã tạo).

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Kết quả OCR đã được xóa"
}
```

---

### 7. Lấy thống kê OCR

**GET** `/api/v1/ocr/statistics`

Lấy thống kê về việc sử dụng OCR.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Khoảng thời gian (`week`, `month`, `year`, default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "total_scans": 45,
    "successful_scans": 42,
    "failed_scans": 3,
    "success_rate": 0.933,
    "average_confidence": 0.89,
    "total_amount_scanned": 15750000,
    "transactions_created": 38,
    "conversion_rate": 0.844,
    "average_processing_time_ms": 2450,
    "top_merchants": [
      {
        "merchant_name": "Siêu thị Co.opMart",
        "scan_count": 12,
        "total_amount": 5250000
      },
      {
        "merchant_name": "Circle K",
        "scan_count": 8,
        "total_amount": 890000
      }
    ],
    "scans_by_day": [
      {
        "date": "2024-01-20",
        "count": 3,
        "total_amount": 1200000
      }
    ]
  }
}
```

---

### 8. Nhận diện merchant

**POST** `/api/v1/ocr/merchants/recognize`

Nhận diện merchant từ tên và đề xuất merchant đã có trong hệ thống.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "merchant_name": "Coopmart Q7",
  "merchant_address": "123 Nguyễn Văn Linh",
  "merchant_phone": "0283 1234567"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "merchant_id": "mer-001",
        "name": "Siêu thị Co.opMart Quận 7",
        "address": "123 Nguyễn Văn Linh, Q.7",
        "phone": "028 3123 4567",
        "confidence": 0.95,
        "logo_url": "https://example.com/logos/coopmart.jpg",
        "category": "Supermarket",
        "transaction_count": 15
      },
      {
        "merchant_id": "mer-002",
        "name": "Co.opMart Nguyễn Kiệm",
        "address": "456 Nguyễn Kiệm, Phú Nhuận",
        "phone": "028 3890 1234",
        "confidence": 0.65,
        "logo_url": "https://example.com/logos/coopmart.jpg",
        "category": "Supermarket",
        "transaction_count": 8
      }
    ],
    "create_new_suggestion": {
      "name": "Coopmart Q7",
      "normalized_name": "Co.opMart Quận 7",
      "address": "123 Nguyễn Văn Linh",
      "phone": "0283 1234567",
      "suggested_category": "Supermarket"
    }
  }
}
```

---

### 9. Training feedback

**POST** `/api/v1/ocr/receipts/{ocrId}/feedback`

Gửi feedback để cải thiện độ chính xác của OCR.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 4,
  "corrections": {
    "merchant_name": {
      "extracted": "CoopMart",
      "correct": "Co.opMart"
    },
    "total_amount": {
      "extracted": 545000,
      "correct": 545000
    }
  },
  "issues": ["merchant_name_incorrect", "date_format_wrong"],
  "comments": "Tên merchant bị thiếu dấu chấm"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Cảm ơn bạn đã đóng góp feedback để cải thiện hệ thống"
}
```

---

### 10. Batch OCR

**POST** `/api/v1/ocr/receipts/batch`

Upload và nhận diện nhiều hóa đơn cùng lúc.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
images: [file[]] (required) - Tối đa 10 ảnh
language: string (optional) - Ngôn ngữ
extract_items: boolean (optional) - Trích xuất items
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "batch_id": "batch-123e4567",
    "total_images": 5,
    "status": "processing",
    "receipt_ids": [
      "ocr-001",
      "ocr-002",
      "ocr-003",
      "ocr-004",
      "ocr-005"
    ],
    "estimated_completion_time": "2024-01-20T14:45:00Z"
  }
}
```

---

### 11. Lấy trạng thái batch

**GET** `/api/v1/ocr/receipts/batch/{batchId}`

Lấy trạng thái xử lý batch OCR.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "batch_id": "batch-123e4567",
    "status": "completed",
    "total_images": 5,
    "completed": 5,
    "failed": 0,
    "progress": 100,
    "results": [
      {
        "receipt_id": "ocr-001",
        "status": "completed",
        "merchant_name": "Co.opMart",
        "total_amount": 545000
      }
    ],
    "created_at": "2024-01-20T14:40:00Z",
    "completed_at": "2024-01-20T14:44:30Z"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_IMAGE` | 400 | Hình ảnh không hợp lệ |
| `IMAGE_TOO_LARGE` | 400 | Kích thước ảnh vượt quá giới hạn |
| `OCR_FAILED` | 500 | Không thể nhận diện hóa đơn |
| `OCR_NOT_FOUND` | 404 | Kết quả OCR không tồn tại |
| `LOW_CONFIDENCE` | 200 | Độ tin cậy thấp (cảnh báo) |
| `UNSUPPORTED_FORMAT` | 400 | Định dạng file không được hỗ trợ |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt quá giới hạn số lần quét |
| `BATCH_TOO_LARGE` | 400 | Quá nhiều ảnh trong batch |

---

## Business Rules

1. **File constraints:**
   - Formats: JPG, PNG, HEIC
   - Max size: 10MB/file
   - Max resolution: 4000x4000px
   - Batch: Max 10 files

2. **OCR confidence levels:**
   - High (>0.9): Tự động tạo transaction
   - Medium (0.7-0.9): Cần review
   - Low (<0.7): Cảnh báo người dùng kiểm tra

3. **Rate limiting:**
   - Free tier: 50 scans/month
   - Premium: 500 scans/month
   - Unlimited: No limit

4. **Data retention:**
   - Images: 90 days
   - OCR results: Permanent
   - Failed scans: 7 days

5. **Privacy:**
   - Images được mã hóa khi lưu trữ
   - Tự động xóa sau khi tạo transaction (optional)
   - Không chia sẻ dữ liệu với third-party

6. **Processing:**
   - Async processing cho batch
   - Webhook notification khi hoàn thành
   - Retry 3 lần nếu thất bại
