# Insights API

API cho phân tích và insights tài chính thông minh (AI-powered financial insights).

## Base URL
```
/api/v1/insights
```

## Endpoints

### 1. Lấy tổng quan insights

**GET** `/api/v1/insights/overview`

Lấy tổng quan các insights quan trọng nhất.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "priority_insights": [
      {
        "id": "ins-001",
        "type": "overspending_alert",
        "severity": "high",
        "title": "Chi tiêu vượt ngân sách",
        "description": "Bạn đã chi tiêu 8.5 triệu cho Ăn uống, vượt ngân sách 2.5 triệu (42%)",
        "category": "Ăn uống",
        "impact": {
          "amount": 2500000,
          "percentage": 42
        },
        "suggestions": [
          "Giảm số lần ăn ngoài từ 15 lần xuống 10 lần/tháng",
          "Nấu ăn tại nhà nhiều hơn vào cuối tuần"
        ],
        "actions": [
          {
            "type": "adjust_budget",
            "label": "Điều chỉnh ngân sách"
          },
          {
            "type": "view_details",
            "label": "Xem chi tiết"
          }
        ],
        "created_at": "2024-01-20T10:00:00Z",
        "expires_at": "2024-01-31T23:59:59Z"
      },
      {
        "id": "ins-002",
        "type": "saving_opportunity",
        "severity": "medium",
        "title": "Cơ hội tiết kiệm",
        "description": "Bạn có thể tiết kiệm thêm 1.8 triệu/tháng bằng cách tối ưu chi tiêu",
        "impact": {
          "amount": 1800000,
          "percentage": 12
        },
        "suggestions": [
          "Hủy đăng ký Netflix (199k) - không sử dụng trong 3 tháng",
          "Chuyển sang gói cước điện thoại rẻ hơn tiết kiệm 150k/tháng"
        ],
        "created_at": "2024-01-20T09:00:00Z"
      }
    ],
    "summary": {
      "total_insights": 12,
      "high_priority": 2,
      "medium_priority": 5,
      "low_priority": 5,
      "potential_savings": 3500000,
      "last_updated": "2024-01-20T10:00:00Z"
    }
  }
}
```

---

### 2. Lấy danh sách insights

**GET** `/api/v1/insights`

Lấy danh sách tất cả insights.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `type` (string, optional): Loại insight
- `severity` (string, optional): Mức độ (`high`, `medium`, `low`)
- `category_id` (string, optional): Lọc theo category
- `status` (string, optional): Trạng thái (`active`, `dismissed`, `acted`)
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "ins-001",
        "type": "overspending_alert",
        "severity": "high",
        "title": "Chi tiêu vượt ngân sách",
        "description": "Bạn đã chi tiêu 8.5 triệu cho Ăn uống...",
        "status": "active",
        "created_at": "2024-01-20T10:00:00Z"
      },
      {
        "id": "ins-003",
        "type": "unusual_transaction",
        "severity": "medium",
        "title": "Giao dịch bất thường",
        "description": "Giao dịch 5 triệu tại Circle K cao hơn 400% so với mức trung bình",
        "status": "active",
        "transaction_id": "txn-123",
        "created_at": "2024-01-19T15:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 12,
      "items_per_page": 20
    }
  }
}
```

---

### 3. Lấy chi tiết insight

**GET** `/api/v1/insights/{insightId}`

Lấy thông tin chi tiết một insight.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ins-001",
    "type": "overspending_alert",
    "severity": "high",
    "title": "Chi tiêu vượt ngân sách",
    "description": "Bạn đã chi tiêu 8.5 triệu cho Ăn uống, vượt ngân sách 2.5 triệu (42%)",
    "status": "active",
    "category_id": "cat-food",
    "category": {
      "name": "Ăn uống",
      "icon": "🍜",
      "color": "#FF6B6B"
    },
    "analysis": {
      "current_spending": 8500000,
      "budget_amount": 6000000,
      "overspend_amount": 2500000,
      "overspend_percentage": 42,
      "vs_last_month": {
        "amount": 7200000,
        "change": 1300000,
        "change_percentage": 18
      },
      "vs_average": {
        "amount": 6800000,
        "change": 1700000,
        "change_percentage": 25
      },
      "trend": "increasing",
      "breakdown": [
        {
          "subcategory": "Nhà hàng",
          "amount": 5000000,
          "percentage": 59,
          "transaction_count": 15
        },
        {
          "subcategory": "Cafe",
          "amount": 2500000,
          "percentage": 29,
          "transaction_count": 25
        },
        {
          "subcategory": "Siêu thị",
          "amount": 1000000,
          "percentage": 12,
          "transaction_count": 8
        }
      ]
    },
    "impact": {
      "amount": 2500000,
      "percentage": 42,
      "severity_score": 8.5,
      "financial_health_impact": -12,
      "goal_impact": [
        {
          "goal_id": "goal-001",
          "goal_name": "Tiết kiệm mua nhà",
          "delay_months": 2
        }
      ]
    },
    "suggestions": [
      {
        "id": "sug-001",
        "title": "Giảm tần suất ăn ngoài",
        "description": "Giảm từ 15 lần xuống 10 lần/tháng có thể tiết kiệm 1.5 triệu",
        "potential_savings": 1500000,
        "difficulty": "medium",
        "priority": 1
      },
      {
        "id": "sug-002",
        "title": "Nấu ăn tại nhà cuối tuần",
        "description": "Nấu ăn thay vì ăn ngoài vào cuối tuần tiết kiệm ~500k/tuần",
        "potential_savings": 2000000,
        "difficulty": "easy",
        "priority": 2
      }
    ],
    "actions": [
      {
        "type": "adjust_budget",
        "label": "Điều chỉnh ngân sách",
        "params": {
          "category_id": "cat-food",
          "suggested_amount": 9000000
        }
      },
      {
        "type": "create_alert",
        "label": "Tạo cảnh báo chi tiêu",
        "params": {
          "category_id": "cat-food",
          "threshold": 7000000
        }
      },
      {
        "type": "view_transactions",
        "label": "Xem giao dịch chi tiết",
        "params": {
          "category_id": "cat-food",
          "start_date": "2024-01-01"
        }
      }
    ],
    "related_insights": ["ins-004", "ins-007"],
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T10:00:00Z",
    "expires_at": "2024-01-31T23:59:59Z"
  }
}
```

---

### 4. Dismiss insight

**POST** `/api/v1/insights/{insightId}/dismiss`

Bỏ qua/ẩn insight.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "not_relevant",
  "feedback": "Tôi đã biết về vấn đề này"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ins-001",
    "status": "dismissed",
    "dismissed_at": "2024-01-20T11:00:00Z"
  }
}
```

---

### 5. Mark insight as acted

**POST** `/api/v1/insights/{insightId}/acted`

Đánh dấu đã xử lý insight.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "action_taken": "adjusted_budget",
  "notes": "Đã điều chỉnh ngân sách lên 9 triệu"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ins-001",
    "status": "acted",
    "acted_at": "2024-01-20T11:30:00Z"
  }
}
```

---

### 6. Lấy spending patterns

**GET** `/api/v1/insights/patterns/spending`

Phân tích patterns chi tiêu.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Khoảng thời gian (`week`, `month`, `quarter`, `year`)
- `category_id` (string, optional): Lọc theo category

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "patterns": [
      {
        "type": "day_of_week",
        "title": "Chi tiêu cao vào cuối tuần",
        "description": "Bạn chi tiêu nhiều hơn 35% vào thứ 7 và chủ nhật",
        "data": {
          "monday": 850000,
          "tuesday": 920000,
          "wednesday": 780000,
          "thursday": 1100000,
          "friday": 1300000,
          "saturday": 2200000,
          "sunday": 1950000
        },
        "insight": "Cân nhắc nấu ăn tại nhà vào cuối tuần để tiết kiệm",
        "confidence": 0.89
      },
      {
        "type": "time_of_day",
        "title": "Chi tiêu tập trung vào giờ trưa",
        "description": "60% giao dịch ăn uống diễn ra từ 11h-14h",
        "data": {
          "morning": 15,
          "lunch": 60,
          "afternoon": 10,
          "dinner": 15
        },
        "insight": "Mang cơm trưa có thể tiết kiệm ~800k/tháng",
        "confidence": 0.92
      },
      {
        "type": "recurring_merchants",
        "title": "Merchants thường xuyên",
        "description": "Bạn có 5 merchants chi tiêu thường xuyên chiếm 45% tổng chi tiêu",
        "data": [
          {
            "merchant": "Highlands Coffee",
            "frequency": 18,
            "total_amount": 1800000,
            "average_amount": 100000
          },
          {
            "merchant": "Circle K",
            "frequency": 22,
            "total_amount": 1650000,
            "average_amount": 75000
          }
        ],
        "insight": "Xem xét thẻ membership để được giảm giá",
        "confidence": 0.95
      },
      {
        "type": "seasonal",
        "title": "Chu kỳ chi tiêu hàng tháng",
        "description": "Chi tiêu tăng 25% vào tuần đầu tháng (sau khi nhận lương)",
        "data": {
          "week1": 5500000,
          "week2": 4200000,
          "week3": 3800000,
          "week4": 3500000
        },
        "insight": "Lập kế hoạch chi tiêu đều đặn hơn trong tháng",
        "confidence": 0.87
      }
    ],
    "summary": {
      "total_patterns": 4,
      "high_confidence": 3,
      "actionable_insights": 4
    }
  }
}
```

---

### 7. Lấy income insights

**GET** `/api/v1/insights/income`

Phân tích insights về thu nhập.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "income_stability": {
      "score": 8.5,
      "level": "stable",
      "description": "Thu nhập của bạn khá ổn định",
      "variance": 0.08,
      "trend": "increasing"
    },
    "income_vs_spending": {
      "income": 25000000,
      "spending": 18500000,
      "savings": 6500000,
      "savings_rate": 26,
      "vs_recommended": {
        "recommended_savings_rate": 30,
        "gap": -4
      }
    },
    "income_sources": [
      {
        "source": "Lương chính",
        "amount": 20000000,
        "percentage": 80,
        "frequency": "monthly",
        "stability": "high"
      },
      {
        "source": "Freelance",
        "amount": 5000000,
        "percentage": 20,
        "frequency": "irregular",
        "stability": "medium"
      }
    ],
    "insights": [
      {
        "type": "income_growth",
        "title": "Thu nhập tăng trưởng tốt",
        "description": "Thu nhập tăng 15% so với 6 tháng trước",
        "suggestion": "Tăng tỷ lệ tiết kiệm để tối ưu thu nhập tăng thêm"
      },
      {
        "type": "income_diversification",
        "title": "Nguồn thu nhập đa dạng",
        "description": "Bạn có 2 nguồn thu nhập, giảm rủi ro tài chính",
        "suggestion": "Duy trì và phát triển thêm nguồn thu nhập phụ"
      }
    ]
  }
}
```

---

### 8. Lấy financial health score

**GET** `/api/v1/insights/health-score`

Lấy điểm sức khỏe tài chính tổng thể.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overall_score": 72,
    "grade": "B",
    "level": "good",
    "trend": "improving",
    "vs_last_month": {
      "score": 68,
      "change": 4
    },
    "components": [
      {
        "name": "Savings Rate",
        "score": 75,
        "weight": 25,
        "status": "good",
        "current_value": 26,
        "target_value": 30,
        "description": "Tỷ lệ tiết kiệm của bạn tốt nhưng có thể cải thiện thêm"
      },
      {
        "name": "Debt Management",
        "score": 85,
        "weight": 20,
        "status": "excellent",
        "current_value": 8,
        "target_value": 10,
        "description": "Quản lý nợ rất tốt, tỷ lệ nợ/thu nhập chỉ 8%"
      },
      {
        "name": "Budget Adherence",
        "score": 65,
        "weight": 20,
        "status": "needs_improvement",
        "current_value": 65,
        "target_value": 90,
        "description": "Tuân thủ ngân sách chưa tốt, nhiều tháng vượt chi"
      },
      {
        "name": "Emergency Fund",
        "score": 60,
        "weight": 20,
        "status": "fair",
        "current_value": 15000000,
        "target_value": 25000000,
        "description": "Quỹ khẩn cấp đủ 3 tháng chi tiêu, nên tăng lên 6 tháng"
      },
      {
        "name": "Goal Progress",
        "score": 80,
        "weight": 15,
        "status": "good",
        "current_value": 80,
        "target_value": 100,
        "description": "Đang đạt 80% tiến độ các mục tiêu tài chính"
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "title": "Cải thiện tuân thủ ngân sách",
        "description": "Thiết lập cảnh báo chi tiêu và review ngân sách hàng tuần",
        "potential_impact": 8
      },
      {
        "priority": "medium",
        "title": "Tăng quỹ khẩn cấp",
        "description": "Tiết kiệm thêm 10 triệu để đạt mục tiêu 6 tháng chi tiêu",
        "potential_impact": 5
      }
    ],
    "calculated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 9. Lấy comparison insights

**GET** `/api/v1/insights/comparisons`

So sánh tài chính với các giai đoạn khác hoặc benchmark.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `comparison_type` (string): Loại so sánh (`month_over_month`, `year_over_year`, `benchmark`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "comparison_type": "month_over_month",
    "current_period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "income": 25000000,
      "expenses": 18500000,
      "savings": 6500000,
      "savings_rate": 26
    },
    "previous_period": {
      "start_date": "2023-12-01",
      "end_date": "2023-12-31",
      "income": 24000000,
      "expenses": 19200000,
      "savings": 4800000,
      "savings_rate": 20
    },
    "changes": {
      "income": {
        "amount": 1000000,
        "percentage": 4.2,
        "trend": "up"
      },
      "expenses": {
        "amount": -700000,
        "percentage": -3.6,
        "trend": "down"
      },
      "savings": {
        "amount": 1700000,
        "percentage": 35.4,
        "trend": "up"
      }
    },
    "category_changes": [
      {
        "category": "Ăn uống",
        "current": 8500000,
        "previous": 7200000,
        "change": 1300000,
        "change_percentage": 18,
        "trend": "up",
        "insight": "Chi tiêu ăn uống tăng đáng kể"
      }
    ],
    "insights": [
      {
        "type": "positive",
        "title": "Tiết kiệm tăng mạnh",
        "description": "Bạn đã tiết kiệm thêm 1.7 triệu so với tháng trước (+35%)"
      },
      {
        "type": "warning",
        "title": "Chi tiêu ăn uống tăng",
        "description": "Chi tiêu ăn uống tăng 1.3 triệu (+18%)"
      }
    ]
  }
}
```

---

### 10. Generate custom insights

**POST** `/api/v1/insights/generate`

Tạo insights tùy chỉnh dựa trên tiêu chí cụ thể.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "focus_areas": ["spending", "savings"],
  "categories": ["cat-food", "cat-transport"],
  "time_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "insight_types": ["patterns", "anomalies", "opportunities"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "generated_insights": [
      {
        "id": "gen-ins-001",
        "type": "pattern",
        "title": "Chi tiêu ăn uống cao vào cuối tuần",
        "severity": "medium",
        "description": "Phân tích dựa trên dữ liệu tháng 1/2024..."
      }
    ],
    "generated_at": "2024-01-20T11:00:00Z"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSIGHT_NOT_FOUND` | 404 | Insight không tồn tại |
| `INSUFFICIENT_DATA` | 400 | Không đủ dữ liệu để tạo insights |
| `INVALID_PERIOD` | 400 | Khoảng thời gian không hợp lệ |
| `GENERATION_FAILED` | 500 | Không thể tạo insights |

---

## Business Rules

1. **Insight generation:**
   - Chạy daily analysis vào 6AM
   - Realtime insights cho giao dịch bất thường
   - Cache insights 24h

2. **Severity levels:**
   - High: Impact >10% budget hoặc >2M VND
   - Medium: Impact 5-10% hoặc 1-2M VND
   - Low: Impact <5% hoặc <1M VND

3. **Insight expiration:**
   - Budget alerts: End of period
   - Saving opportunities: 30 days
   - Patterns: 90 days
   - Anomalies: 7 days

4. **Privacy:**
   - Không chia sẻ insights với third-party
   - User có thể tắt specific insight types
   - Insights chỉ dựa trên data của user

5. **Confidence threshold:**
   - Chỉ hiển thị insights có confidence >0.7
   - High confidence (>0.9): Tự động đề xuất actions
   - Low confidence (0.7-0.9): Chỉ hiển thị thông tin
