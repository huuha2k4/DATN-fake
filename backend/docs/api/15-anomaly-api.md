# Anomaly Detection API

API cho phát hiện bất thường trong giao dịch tài chính (AI-powered anomaly detection).

## Base URL
```
/api/v1/anomalies
```

## Endpoints

### 1. Lấy danh sách anomalies

**GET** `/api/v1/anomalies`

Lấy danh sách các giao dịch/patterns bất thường.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `severity` (string, optional): Mức độ nghiêm trọng (`critical`, `high`, `medium`, `low`)
- `type` (string, optional): Loại anomaly
- `status` (string, optional): Trạng thái (`unreviewed`, `confirmed`, `dismissed`)
- `start_date` (string, optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (string, optional): Ngày kết thúc (YYYY-MM-DD)
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "id": "anom-001",
        "type": "unusual_amount",
        "severity": "high",
        "title": "Giao dịch cao bất thường",
        "description": "Giao dịch 5,000,000₫ tại Circle K cao hơn 400% so với mức trung bình",
        "detected_at": "2024-01-19T15:32:00Z",
        "transaction_id": "txn-123",
        "transaction": {
          "amount": 5000000,
          "description": "Circle K",
          "category": "Tiện lợi",
          "date": "2024-01-19",
          "merchant": "Circle K Nguyễn Văn Linh"
        },
        "anomaly_score": 0.94,
        "confidence": 0.89,
        "expected_range": {
          "min": 50000,
          "max": 200000,
          "average": 85000
        },
        "deviation": {
          "amount": 4915000,
          "percentage": 481
        },
        "status": "unreviewed",
        "insights": [
          "Giao dịch cao hơn 481% so với trung bình",
          "Merchant này thường có giao dịch <200k",
          "Không phải ngày lương"
        ],
        "possible_reasons": [
          "Sai sót khi nhập liệu",
          "Mua hàng cho nhiều người",
          "Giao dịch không thường xuyên"
        ],
        "suggested_actions": [
          {
            "type": "review_transaction",
            "label": "Kiểm tra giao dịch"
          },
          {
            "type": "recategorize",
            "label": "Phân loại lại"
          },
          {
            "type": "split_transaction",
            "label": "Tách giao dịch"
          }
        ]
      },
      {
        "id": "anom-002",
        "type": "duplicate_transaction",
        "severity": "medium",
        "title": "Giao dịch có thể bị trùng",
        "description": "2 giao dịch giống nhau trong vòng 5 phút",
        "detected_at": "2024-01-18T10:15:00Z",
        "transaction_ids": ["txn-124", "txn-125"],
        "transactions": [
          {
            "id": "txn-124",
            "amount": 350000,
            "description": "Grab",
            "date": "2024-01-18T10:05:00Z"
          },
          {
            "id": "txn-125",
            "amount": 350000,
            "description": "Grab",
            "date": "2024-01-18T10:08:00Z"
          }
        ],
        "anomaly_score": 0.87,
        "confidence": 0.92,
        "similarity_score": 0.98,
        "status": "unreviewed",
        "suggested_actions": [
          {
            "type": "merge_transactions",
            "label": "Gộp giao dịch"
          },
          {
            "type": "delete_duplicate",
            "label": "Xóa trùng lặp"
          }
        ]
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 35,
      "items_per_page": 20
    },
    "summary": {
      "total_anomalies": 35,
      "unreviewed": 15,
      "confirmed": 12,
      "dismissed": 8,
      "by_severity": {
        "critical": 2,
        "high": 8,
        "medium": 15,
        "low": 10
      },
      "potential_savings": 2500000,
      "potential_errors": 5
    }
  }
}
```

---

### 2. Lấy chi tiết anomaly

**GET** `/api/v1/anomalies/{anomalyId}`

Lấy thông tin chi tiết một anomaly.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "anom-001",
    "type": "unusual_amount",
    "severity": "high",
    "title": "Giao dịch cao bất thường",
    "description": "Giao dịch 5,000,000₫ tại Circle K cao hơn 400% so với mức trung bình",
    "detected_at": "2024-01-19T15:32:00Z",
    "status": "unreviewed",
    "transaction_id": "txn-123",
    "transaction": {
      "id": "txn-123",
      "amount": 5000000,
      "description": "Circle K",
      "category": "Tiện lợi",
      "date": "2024-01-19",
      "time": "15:30:00",
      "merchant": "Circle K Nguyễn Văn Linh",
      "account": "Tiền mặt",
      "notes": null
    },
    "detection_details": {
      "anomaly_score": 0.94,
      "confidence": 0.89,
      "detection_method": "Isolation Forest + Statistical Analysis",
      "features_analyzed": [
        "transaction_amount",
        "merchant_pattern",
        "time_of_day",
        "day_of_week",
        "category_spending"
      ]
    },
    "statistical_analysis": {
      "expected_range": {
        "min": 50000,
        "max": 200000,
        "average": 85000,
        "median": 75000,
        "std_dev": 35000
      },
      "actual_value": 5000000,
      "deviation": {
        "amount": 4915000,
        "percentage": 481,
        "z_score": 14.2
      },
      "percentile": 99.9,
      "historical_data": {
        "same_merchant_transactions": 45,
        "same_merchant_avg": 82000,
        "same_merchant_max": 185000,
        "same_category_avg": 125000
      }
    },
    "context": {
      "time_context": "Giữa tuần, giờ làm việc",
      "spending_context": "Đã chi 12M trong tháng (60% ngân sách)",
      "merchant_context": "Merchant quen thuộc (45 giao dịch trước đó)",
      "pattern_context": "Không khớp với pattern thông thường"
    },
    "insights": [
      {
        "type": "statistical",
        "message": "Giao dịch cao hơn 481% so với trung bình tại merchant này"
      },
      {
        "type": "behavioral",
        "message": "Không phù hợp với thói quen chi tiêu của bạn"
      },
      {
        "type": "contextual",
        "message": "Merchant này thường có giao dịch nhỏ (<200k)"
      }
    ],
    "possible_reasons": [
      {
        "reason": "Sai sót khi nhập liệu",
        "probability": 0.45,
        "explanation": "Có thể nhập nhầm số tiền (5M thay vì 50k)"
      },
      {
        "reason": "Mua hàng cho nhóm",
        "probability": 0.35,
        "explanation": "Thanh toán chung cho nhiều người"
      },
      {
        "reason": "Giao dịch hợp lệ nhưng bất thường",
        "probability": 0.20,
        "explanation": "Mua hàng số lượng lớn hoặc sản phẩm đặc biệt"
      }
    ],
    "similar_anomalies": [
      {
        "id": "anom-015",
        "date": "2023-11-20",
        "description": "Giao dịch 3M tại 7-Eleven",
        "resolution": "Đã xác nhận là hợp lệ - mua hàng cho công ty"
      }
    ],
    "suggested_actions": [
      {
        "type": "review_transaction",
        "label": "Kiểm tra chi tiết giao dịch",
        "priority": "high"
      },
      {
        "type": "edit_amount",
        "label": "Sửa số tiền",
        "priority": "high",
        "suggested_value": 500000
      },
      {
        "type": "recategorize",
        "label": "Phân loại lại",
        "priority": "medium",
        "suggested_category": "Mua sắm"
      },
      {
        "type": "split_transaction",
        "label": "Tách thành nhiều giao dịch",
        "priority": "medium"
      },
      {
        "type": "add_note",
        "label": "Thêm ghi chú giải thích",
        "priority": "low"
      }
    ],
    "auto_resolution_suggestions": {
      "can_auto_resolve": false,
      "reason": "Cần xác nhận từ người dùng do độ lệch quá lớn"
    }
  }
}
```

---

### 3. Phân tích transaction

**POST** `/api/v1/anomalies/analyze`

Phân tích một transaction cụ thể để tìm anomalies.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "transaction_id": "txn-126"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn-126",
    "is_anomaly": true,
    "anomaly_score": 0.82,
    "confidence": 0.85,
    "anomaly_types": [
      {
        "type": "unusual_time",
        "score": 0.78,
        "description": "Giao dịch vào 3:00 AM, khác với pattern thông thường (8AM-11PM)"
      },
      {
        "type": "new_merchant",
        "score": 0.65,
        "description": "Merchant mới chưa từng giao dịch"
      }
    ],
    "risk_assessment": {
      "risk_level": "medium",
      "fraud_probability": 0.15,
      "error_probability": 0.35,
      "legitimate_probability": 0.50
    },
    "recommendations": [
      "Xác nhận giao dịch này có hợp lệ",
      "Thêm ghi chú nếu đây là giao dịch đặc biệt"
    ]
  }
}
```

---

### 4. Xác nhận anomaly

**POST** `/api/v1/anomalies/{anomalyId}/confirm`

Xác nhận anomaly là chính xác (giao dịch thật sự có vấn đề).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "resolution": "corrected",
  "correction_action": "edited_amount",
  "notes": "Đã sửa từ 5M thành 500k - nhập nhầm số 0",
  "new_transaction_data": {
    "amount": 500000
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "anom-001",
    "status": "confirmed",
    "resolution": "corrected",
    "confirmed_at": "2024-01-20T10:00:00Z",
    "transaction_updated": true
  }
}
```

---

### 5. Dismiss anomaly

**POST** `/api/v1/anomalies/{anomalyId}/dismiss`

Bỏ qua anomaly (xác nhận giao dịch hợp lệ).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "legitimate_transaction",
  "notes": "Đây là giao dịch hợp lệ - mua hàng cho công ty",
  "learn_from_this": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "anom-001",
    "status": "dismissed",
    "dismissed_at": "2024-01-20T10:15:00Z",
    "model_updated": true
  }
}
```

---

### 6. Lấy patterns bất thường

**GET** `/api/v1/anomalies/patterns`

Phát hiện patterns chi tiêu bất thường.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Khoảng thời gian (`week`, `month`, `quarter`, default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "patterns": [
      {
        "id": "pat-001",
        "type": "spending_spike",
        "severity": "high",
        "title": "Tăng đột biến chi tiêu cuối tuần",
        "description": "Chi tiêu cuối tuần tăng 150% so với tháng trước",
        "detected_at": "2024-01-20T08:00:00Z",
        "anomaly_score": 0.88,
        "data": {
          "current_avg_weekend_spending": 3500000,
          "previous_avg_weekend_spending": 1400000,
          "increase": 2100000,
          "increase_percentage": 150
        },
        "affected_categories": [
          {
            "category": "Ăn uống",
            "increase": 1500000,
            "percentage": 71
          },
          {
            "category": "Giải trí",
            "increase": 600000,
            "percentage": 29
          }
        ],
        "insights": [
          "Số lần ăn ngoài tăng từ 8 lên 18 lần/tháng",
          "Có 3 lần chi tiêu >500k vào cuối tuần"
        ],
        "impact": {
          "budget_impact": 2100000,
          "savings_impact": -2100000,
          "goal_delay_days": 15
        }
      },
      {
        "id": "pat-002",
        "type": "new_recurring_expense",
        "severity": "medium",
        "title": "Chi phí định kỳ mới phát hiện",
        "description": "Phát hiện chi phí Netflix 199k lặp lại hàng tháng",
        "detected_at": "2024-01-15T09:00:00Z",
        "anomaly_score": 0.75,
        "data": {
          "merchant": "Netflix",
          "amount": 199000,
          "frequency": "monthly",
          "occurrences": 3,
          "first_detected": "2023-11-15"
        },
        "suggestion": "Tạo recurring transaction để theo dõi"
      },
      {
        "id": "pat-003",
        "type": "category_shift",
        "severity": "low",
        "title": "Thay đổi phân bổ chi tiêu",
        "description": "Chi tiêu chuyển từ 'Di chuyển' sang 'Ăn uống'",
        "detected_at": "2024-01-18T10:00:00Z",
        "anomaly_score": 0.68,
        "data": {
          "decreased_category": "Di chuyển",
          "decreased_amount": -1500000,
          "increased_category": "Ăn uống",
          "increased_amount": 1800000
        },
        "insight": "Có thể do làm việc tại nhà nhiều hơn"
      }
    ],
    "summary": {
      "total_patterns": 3,
      "high_severity": 1,
      "medium_severity": 1,
      "low_severity": 1,
      "total_impact": 2100000
    }
  }
}
```

---

### 7. Cấu hình detection

**GET/PUT** `/api/v1/anomalies/settings`

Lấy hoặc cập nhật cấu hình phát hiện anomaly.

**GET Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "detection_enabled": true,
    "sensitivity": "medium",
    "auto_detect_duplicates": true,
    "minimum_confidence": 0.75,
    "notification_enabled": true,
    "notification_severity_threshold": "medium",
    "enabled_detection_types": [
      "unusual_amount",
      "duplicate_transaction",
      "unusual_time",
      "unusual_merchant",
      "spending_spike",
      "new_recurring_expense"
    ],
    "custom_rules": [
      {
        "id": "rule-001",
        "name": "Circle K high amount",
        "condition": "merchant='Circle K' AND amount > 500000",
        "severity": "high",
        "enabled": true
      }
    ],
    "learning_mode": "adaptive"
  }
}
```

**PUT Request Body:**
```json
{
  "sensitivity": "high",
  "minimum_confidence": 0.80,
  "notification_severity_threshold": "high"
}
```

**PUT Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sensitivity": "high",
    "minimum_confidence": 0.80,
    "notification_severity_threshold": "high",
    "updated_at": "2024-01-20T11:00:00Z"
  }
}
```

---

### 8. Lấy thống kê anomalies

**GET** `/api/v1/anomalies/statistics`

Lấy thống kê về anomalies đã phát hiện.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Khoảng thời gian (`week`, `month`, `quarter`, `year`, default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "summary": {
      "total_detected": 45,
      "confirmed": 18,
      "dismissed": 20,
      "unreviewed": 7,
      "auto_resolved": 12
    },
    "by_type": [
      {
        "type": "unusual_amount",
        "count": 15,
        "confirmed_count": 8,
        "accuracy": 0.53
      },
      {
        "type": "duplicate_transaction",
        "count": 12,
        "confirmed_count": 10,
        "accuracy": 0.83
      },
      {
        "type": "unusual_time",
        "count": 8,
        "confirmed_count": 0,
        "accuracy": 0.00
      }
    ],
    "by_severity": {
      "critical": 2,
      "high": 12,
      "medium": 20,
      "low": 11
    },
    "impact": {
      "errors_caught": 18,
      "money_saved": 5200000,
      "duplicates_removed": 10,
      "time_saved_hours": 3.5
    },
    "detection_performance": {
      "precision": 0.72,
      "recall": 0.85,
      "f1_score": 0.78,
      "false_positive_rate": 0.28,
      "average_detection_time_ms": 150
    },
    "trends": {
      "vs_last_month": {
        "total_detected_change": 5,
        "accuracy_change": 0.03
      }
    }
  }
}
```

---

### 9. Tạo custom rule

**POST** `/api/v1/anomalies/rules`

Tạo rule tùy chỉnh để phát hiện anomaly.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Large grocery transaction",
  "description": "Cảnh báo khi chi siêu thị >2M",
  "condition": {
    "category_id": "cat-grocery",
    "amount_threshold": 2000000,
    "operator": "greater_than"
  },
  "severity": "medium",
  "action": "alert",
  "enabled": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "rule-002",
    "name": "Large grocery transaction",
    "enabled": true,
    "created_at": "2024-01-20T11:30:00Z"
  }
}
```

---

### 10. Bulk review anomalies

**POST** `/api/v1/anomalies/bulk-review`

Xử lý nhiều anomalies cùng lúc.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "anomaly_ids": ["anom-001", "anom-002", "anom-003"],
  "action": "dismiss",
  "reason": "false_positive",
  "notes": "Đây là các giao dịch hợp lệ"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "processed": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "anomaly_id": "anom-001",
        "status": "dismissed",
        "success": true
      },
      {
        "anomaly_id": "anom-002",
        "status": "dismissed",
        "success": true
      },
      {
        "anomaly_id": "anom-003",
        "status": "dismissed",
        "success": true
      }
    ]
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ANOMALY_NOT_FOUND` | 404 | Anomaly không tồn tại |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction không tồn tại |
| `INVALID_ACTION` | 400 | Hành động không hợp lệ |
| `DETECTION_DISABLED` | 400 | Tính năng phát hiện đã tắt |
| `INSUFFICIENT_DATA` | 400 | Không đủ dữ liệu để phân tích |
| `RULE_CONFLICT` | 400 | Rule bị xung đột với rule khác |

---

## Business Rules

1. **Detection frequency:**
   - Realtime: Khi tạo transaction mới
   - Batch: Chạy hàng ngày lúc 6AM
   - On-demand: Khi user request

2. **Confidence thresholds:**
   - Auto-flag: >0.8
   - Manual review: 0.6-0.8
   - Ignore: <0.6

3. **Severity calculation:**
   - Critical: Impact >10M hoặc fraud risk >0.8
   - High: Impact 5-10M hoặc fraud risk 0.5-0.8
   - Medium: Impact 1-5M
   - Low: Impact <1M

4. **Learning:**
   - Model learns from user feedback
   - Adaptive thresholds per user
   - Pattern recognition improves over time

5. **Privacy:**
   - Anomaly data encrypted
   - Only user can see their anomalies
   - No cross-user learning (privacy-first)

6. **Auto-resolution:**
   - Duplicates: Auto-suggest merge
   - Low confidence: Auto-dismiss after 30 days
   - Confirmed pattern: Auto-create rule
