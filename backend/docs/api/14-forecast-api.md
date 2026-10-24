# Forecast API

API cho dự báo tài chính (AI-powered financial forecasting).

## Base URL
```
/api/v1/forecast
```

## Endpoints

### 1. Lấy dự báo số dư

**GET** `/api/v1/forecast/balance`

Dự báo số dư tài khoản trong tương lai.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `account_id` (string, optional): ID tài khoản cụ thể (nếu không có sẽ tính tổng)
- `days` (integer, optional): Số ngày dự báo (default: 30, max: 365)
- `confidence_level` (float, optional): Mức độ tin cậy (0.8, 0.9, 0.95, default: 0.9)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "account_id": null,
    "account_name": "Tổng tất cả tài khoản",
    "current_balance": 45000000,
    "forecast_period": {
      "start_date": "2024-01-21",
      "end_date": "2024-02-20",
      "days": 30
    },
    "forecast": [
      {
        "date": "2024-01-21",
        "predicted_balance": 44200000,
        "lower_bound": 43500000,
        "upper_bound": 45000000,
        "confidence": 0.92,
        "expected_income": 0,
        "expected_expenses": 800000,
        "net_change": -800000
      },
      {
        "date": "2024-01-22",
        "predicted_balance": 43500000,
        "lower_bound": 42600000,
        "upper_bound": 44500000,
        "confidence": 0.91,
        "expected_income": 0,
        "expected_expenses": 700000,
        "net_change": -700000
      },
      {
        "date": "2024-01-25",
        "predicted_balance": 68500000,
        "lower_bound": 67500000,
        "upper_bound": 69500000,
        "confidence": 0.95,
        "expected_income": 25000000,
        "expected_expenses": 0,
        "net_change": 25000000,
        "events": [
          {
            "type": "income",
            "description": "Lương tháng (dự kiến)",
            "amount": 25000000,
            "probability": 0.98
          }
        ]
      }
    ],
    "summary": {
      "projected_balance_end": 52500000,
      "total_expected_income": 25000000,
      "total_expected_expenses": 17500000,
      "net_change": 7500000,
      "low_balance_dates": [
        {
          "date": "2024-01-24",
          "balance": 41000000,
          "warning": "Số dư thấp nhất trong kỳ"
        }
      ],
      "risk_level": "low",
      "confidence_average": 0.89
    },
    "methodology": {
      "model": "ARIMA + ML",
      "training_period_days": 180,
      "factors_considered": [
        "Historical spending patterns",
        "Recurring transactions",
        "Seasonal trends",
        "Day of week patterns",
        "Upcoming bills"
      ]
    },
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 2. Lấy dự báo chi tiêu

**GET** `/api/v1/forecast/expenses`

Dự báo chi tiêu theo category trong tương lai.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Kỳ dự báo (`week`, `month`, `quarter`, default: `month`)
- `category_id` (string, optional): Lọc theo category cụ thể
- `include_breakdown` (boolean, optional): Có phân tích chi tiết (default: true)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "forecast_period": {
      "start_date": "2024-02-01",
      "end_date": "2024-02-29",
      "period_type": "month",
      "days": 29
    },
    "total_forecast": {
      "predicted_amount": 17500000,
      "lower_bound": 15200000,
      "upper_bound": 19800000,
      "confidence": 0.87,
      "vs_current_month": {
        "current_amount": 18500000,
        "change": -1000000,
        "change_percentage": -5.4
      },
      "vs_average": {
        "average_amount": 17800000,
        "change": -300000,
        "change_percentage": -1.7
      }
    },
    "by_category": [
      {
        "category_id": "cat-food",
        "category_name": "Ăn uống",
        "predicted_amount": 7200000,
        "lower_bound": 6500000,
        "upper_bound": 8000000,
        "confidence": 0.91,
        "percentage_of_total": 41,
        "vs_current_month": {
          "current_amount": 8500000,
          "change": -1300000,
          "change_percentage": -15.3
        },
        "trend": "decreasing",
        "factors": [
          "Giảm tần suất ăn ngoài",
          "Ít ngày cuối tuần hơn (4 vs 5)",
          "Không có sự kiện đặc biệt"
        ]
      },
      {
        "category_id": "cat-transport",
        "category_name": "Di chuyển",
        "predicted_amount": 3200000,
        "lower_bound": 2800000,
        "upper_bound": 3600000,
        "confidence": 0.88,
        "percentage_of_total": 18,
        "vs_current_month": {
          "current_amount": 3000000,
          "change": 200000,
          "change_percentage": 6.7
        },
        "trend": "stable",
        "factors": [
          "Pattern ổn định qua các tháng",
          "Không có thay đổi trong routine"
        ]
      }
    ],
    "daily_forecast": [
      {
        "date": "2024-02-01",
        "predicted_amount": 550000,
        "confidence": 0.82,
        "is_weekend": false
      }
    ],
    "recurring_expenses": [
      {
        "description": "Netflix subscription",
        "amount": 199000,
        "date": "2024-02-05",
        "category": "Giải trí",
        "probability": 0.99
      },
      {
        "description": "Tiền điện",
        "amount": 850000,
        "date": "2024-02-10",
        "category": "Hóa đơn",
        "probability": 0.95,
        "estimated_range": {
          "min": 750000,
          "max": 950000
        }
      }
    ],
    "insights": [
      {
        "type": "saving_opportunity",
        "title": "Dự kiến tiết kiệm được 1 triệu",
        "description": "Chi tiêu tháng tới dự kiến giảm 5.4% so với tháng này"
      }
    ],
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 3. Lấy dự báo thu nhập

**GET** `/api/v1/forecast/income`

Dự báo thu nhập trong tương lai.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (string, optional): Kỳ dự báo (`month`, `quarter`, `year`, default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "forecast_period": {
      "start_date": "2024-02-01",
      "end_date": "2024-02-29",
      "period_type": "month"
    },
    "total_forecast": {
      "predicted_amount": 26500000,
      "lower_bound": 25000000,
      "upper_bound": 28000000,
      "confidence": 0.93,
      "vs_current_month": {
        "current_amount": 25000000,
        "change": 1500000,
        "change_percentage": 6
      }
    },
    "by_source": [
      {
        "source": "Lương chính",
        "predicted_amount": 20000000,
        "confidence": 0.98,
        "expected_date": "2024-02-25",
        "is_recurring": true,
        "status": "confirmed"
      },
      {
        "source": "Freelance",
        "predicted_amount": 6500000,
        "lower_bound": 5000000,
        "upper_bound": 8000000,
        "confidence": 0.75,
        "expected_dates": ["2024-02-05", "2024-02-20"],
        "is_recurring": false,
        "status": "estimated",
        "factors": [
          "Có 2 project đang chạy",
          "Dựa trên lịch sử 3 tháng trước"
        ]
      }
    ],
    "scheduled_income": [
      {
        "description": "Lương tháng 2",
        "amount": 20000000,
        "date": "2024-02-25",
        "source": "Lương chính",
        "probability": 0.99
      }
    ],
    "insights": [
      {
        "type": "income_increase",
        "title": "Thu nhập dự kiến tăng",
        "description": "Thu nhập freelance tăng nhờ có thêm projects"
      }
    ],
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 4. Dự báo đạt mục tiêu

**GET** `/api/v1/forecast/goals/{goalId}`

Dự báo khả năng đạt được mục tiêu tài chính.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "goal_id": "goal-123",
    "goal_name": "Tiết kiệm mua nhà",
    "goal_details": {
      "target_amount": 500000000,
      "current_amount": 150000000,
      "remaining_amount": 350000000,
      "target_date": "2026-12-31",
      "days_remaining": 1076
    },
    "forecast": {
      "completion_probability": 0.78,
      "predicted_completion_date": "2026-11-15",
      "days_early": 46,
      "predicted_final_amount": 515000000,
      "confidence": 0.85,
      "on_track": true
    },
    "monthly_projection": [
      {
        "month": "2024-02",
        "predicted_amount": 158500000,
        "monthly_contribution": 8500000,
        "required_contribution": 11574000,
        "on_track": false
      },
      {
        "month": "2024-03",
        "predicted_amount": 167000000,
        "monthly_contribution": 8500000,
        "required_contribution": 11574000,
        "on_track": false
      }
    ],
    "scenarios": [
      {
        "name": "Current pace",
        "monthly_contribution": 8500000,
        "completion_date": "2026-11-15",
        "final_amount": 515000000,
        "probability": 0.78
      },
      {
        "name": "Required pace",
        "monthly_contribution": 11574000,
        "completion_date": "2026-12-31",
        "final_amount": 500000000,
        "probability": 0.65,
        "adjustment_needed": 3074000
      },
      {
        "name": "Aggressive",
        "monthly_contribution": 15000000,
        "completion_date": "2026-06-30",
        "final_amount": 535000000,
        "probability": 0.45
      }
    ],
    "insights": [
      {
        "type": "ahead_of_schedule",
        "title": "Đang đi đúng hướng",
        "description": "Với tốc độ hiện tại, bạn sẽ đạt mục tiêu sớm 46 ngày"
      },
      {
        "type": "risk",
        "title": "Rủi ro chi tiêu tăng",
        "description": "Nếu chi tiêu tăng 10%, có thể trễ deadline 3 tháng",
        "probability": 0.25
      }
    ],
    "recommendations": [
      {
        "title": "Tăng đóng góp hàng tháng",
        "description": "Tăng từ 8.5M lên 11.6M để đảm bảo đúng deadline",
        "impact": "Giảm rủi ro xuống 15%"
      },
      {
        "title": "Tối ưu chi tiêu",
        "description": "Giảm chi tiêu không cần thiết 2M/tháng để tăng tiết kiệm",
        "impact": "Hoàn thành sớm 2 tháng"
      }
    ],
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 5. Scenario planning

**POST** `/api/v1/forecast/scenarios`

Tạo các scenarios "what-if" cho kế hoạch tài chính.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "base_scenario": "current",
  "adjustments": [
    {
      "type": "income_change",
      "amount": -5000000,
      "reason": "Giảm thu nhập freelance"
    },
    {
      "type": "expense_change",
      "category_id": "cat-food",
      "amount": -1500000,
      "reason": "Cắt giảm chi tiêu ăn uống"
    },
    {
      "type": "new_expense",
      "category_id": "cat-entertainment",
      "amount": 500000,
      "frequency": "monthly",
      "reason": "Thêm đăng ký Netflix"
    }
  ],
  "forecast_period_months": 6
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "scenario_id": "scen-123",
    "base_scenario": {
      "name": "Current trajectory",
      "end_balance": 98000000,
      "total_income": 150000000,
      "total_expenses": 105000000,
      "net_savings": 45000000,
      "monthly_avg_savings": 7500000
    },
    "adjusted_scenario": {
      "name": "With adjustments",
      "end_balance": 93500000,
      "total_income": 120000000,
      "total_expenses": 79500000,
      "net_savings": 40500000,
      "monthly_avg_savings": 6750000,
      "vs_base": {
        "balance_change": -4500000,
        "income_change": -30000000,
        "expense_change": -25500000,
        "savings_change": -4500000
      }
    },
    "monthly_comparison": [
      {
        "month": "2024-02",
        "base_balance": 52500000,
        "adjusted_balance": 48500000,
        "difference": -4000000
      }
    ],
    "impact_analysis": {
      "financial_health_score_change": -5,
      "goal_impact": [
        {
          "goal_id": "goal-123",
          "goal_name": "Tiết kiệm mua nhà",
          "base_completion": "2026-11-15",
          "adjusted_completion": "2027-02-28",
          "delay_months": 3
        }
      ],
      "risk_level": "medium",
      "sustainability": "manageable"
    },
    "insights": [
      {
        "type": "warning",
        "title": "Giảm thu nhập ảnh hưởng đáng kể",
        "description": "Giảm 5M thu nhập/tháng làm trễ mục tiêu 3 tháng"
      },
      {
        "type": "positive",
        "title": "Cắt giảm chi tiêu bù đắp được phần lớn",
        "description": "Giảm 1.5M chi tiêu ăn uống giúp giảm tác động xuống còn -750k/tháng"
      }
    ],
    "recommendations": [
      {
        "title": "Tìm nguồn thu nhập thay thế",
        "priority": "high",
        "description": "Cân nhắc tìm thêm công việc freelance hoặc bán thời gian"
      }
    ],
    "generated_at": "2024-01-20T10:30:00Z"
  }
}
```

---

### 6. Lấy cash flow forecast

**GET** `/api/v1/forecast/cashflow`

Dự báo dòng tiền (cash flow) chi tiết.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `months` (integer, optional): Số tháng dự báo (default: 3, max: 12)
- `granularity` (string, optional): Độ chi tiết (`daily`, `weekly`, `monthly`, default: `daily`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "forecast_period": {
      "start_date": "2024-01-21",
      "end_date": "2024-04-21",
      "months": 3
    },
    "current_balance": 45000000,
    "cashflow": [
      {
        "date": "2024-01-21",
        "opening_balance": 45000000,
        "inflows": 0,
        "outflows": 800000,
        "net_cashflow": -800000,
        "closing_balance": 44200000
      },
      {
        "date": "2024-01-25",
        "opening_balance": 41000000,
        "inflows": 25000000,
        "outflows": 0,
        "net_cashflow": 25000000,
        "closing_balance": 66000000,
        "events": [
          {
            "type": "income",
            "description": "Lương tháng",
            "amount": 25000000
          }
        ]
      }
    ],
    "summary": {
      "total_inflows": 78000000,
      "total_outflows": 52500000,
      "net_cashflow": 25500000,
      "ending_balance": 70500000,
      "min_balance": {
        "amount": 41000000,
        "date": "2024-01-24",
        "warning": true
      },
      "max_balance": {
        "amount": 71000000,
        "date": "2024-03-26"
      }
    },
    "alerts": [
      {
        "type": "low_balance",
        "severity": "medium",
        "date": "2024-01-24",
        "message": "Số dư dự kiến giảm xuống 41M (dưới ngưỡng cảnh báo 45M)",
        "recommendation": "Cân nhắc hoãn một số khoản chi không cần thiết"
      },
      {
        "type": "large_outflow",
        "severity": "info",
        "date": "2024-02-15",
        "message": "Dự kiến chi tiêu lớn 8M (tiền trọ + hóa đơn)",
        "recommendation": "Đảm bảo có đủ số dư"
      }
    ],
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 7. Lấy budget forecast

**GET** `/api/v1/forecast/budget`

Dự báo tình trạng tuân thủ ngân sách.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `month` (string, optional): Tháng dự báo (YYYY-MM, default: tháng tiếp theo)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "forecast_month": "2024-02",
    "budgets": [
      {
        "category_id": "cat-food",
        "category_name": "Ăn uống",
        "budget_amount": 6000000,
        "predicted_spending": 7200000,
        "variance": 1200000,
        "variance_percentage": 20,
        "status": "over_budget",
        "confidence": 0.88,
        "probability_over_budget": 0.82,
        "recommendation": "Giảm chi tiêu hoặc tăng ngân sách lên 7.5M"
      },
      {
        "category_id": "cat-transport",
        "category_name": "Di chuyển",
        "budget_amount": 3500000,
        "predicted_spending": 3200000,
        "variance": -300000,
        "variance_percentage": -8.6,
        "status": "under_budget",
        "confidence": 0.90,
        "probability_over_budget": 0.15,
        "recommendation": "Đang đi đúng hướng"
      }
    ],
    "overall": {
      "total_budget": 20000000,
      "predicted_total_spending": 17500000,
      "variance": -2500000,
      "variance_percentage": -12.5,
      "categories_over_budget": 1,
      "categories_under_budget": 7,
      "status": "under_budget",
      "probability_stay_under_budget": 0.75
    },
    "insights": [
      {
        "type": "warning",
        "category": "Ăn uống",
        "message": "Dự kiến vượt ngân sách 1.2M (20%)"
      }
    ],
    "generated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 8. Refresh forecast

**POST** `/api/v1/forecast/refresh`

Làm mới tất cả dự báo với dữ liệu mới nhất.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "refresh_id": "ref-123",
    "status": "completed",
    "forecasts_updated": [
      "balance",
      "expenses",
      "income",
      "cashflow",
      "budget"
    ],
    "models_retrained": true,
    "data_points_used": 2548,
    "completed_at": "2024-01-20T10:05:00Z"
  }
}
```

---

### 9. Lấy forecast accuracy

**GET** `/api/v1/forecast/accuracy`

Lấy độ chính xác của các dự báo trước đây.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overall_accuracy": {
      "score": 0.87,
      "grade": "B+",
      "total_forecasts": 156,
      "accurate_forecasts": 136
    },
    "by_type": [
      {
        "type": "balance",
        "accuracy": 0.92,
        "mean_absolute_error": 850000,
        "mean_percentage_error": 3.2
      },
      {
        "type": "expenses",
        "accuracy": 0.85,
        "mean_absolute_error": 1200000,
        "mean_percentage_error": 6.8
      },
      {
        "type": "income",
        "accuracy": 0.95,
        "mean_absolute_error": 500000,
        "mean_percentage_error": 2.1
      }
    ],
    "recent_performance": [
      {
        "month": "2023-12",
        "predicted_expenses": 19000000,
        "actual_expenses": 19200000,
        "error": 200000,
        "error_percentage": 1.05,
        "accurate": true
      }
    ],
    "insights": [
      {
        "type": "improvement",
        "message": "Độ chính xác tăng 5% trong 3 tháng qua nhờ học từ dữ liệu mới"
      }
    ]
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSUFFICIENT_DATA` | 400 | Không đủ dữ liệu lịch sử để dự báo |
| `INVALID_PERIOD` | 400 | Khoảng thời gian không hợp lệ |
| `GOAL_NOT_FOUND` | 404 | Mục tiêu không tồn tại |
| `FORECAST_FAILED` | 500 | Không thể tạo dự báo |
| `MODEL_NOT_READY` | 503 | Model đang training |

---

## Business Rules

1. **Minimum data requirements:**
   - Balance forecast: 30 days history
   - Expense forecast: 60 days history
   - Income forecast: 90 days history
   - Goal forecast: 3 months history

2. **Forecast horizon:**
   - Short-term (1-30 days): High confidence
   - Medium-term (1-6 months): Medium confidence
   - Long-term (6-12 months): Lower confidence

3. **Model retraining:**
   - Auto retrain: Weekly
   - Manual refresh: Anytime
   - After major changes: Auto trigger

4. **Confidence levels:**
   - >0.9: High confidence
   - 0.7-0.9: Medium confidence
   - <0.7: Low confidence (không hiển thị)

5. **Factors considered:**
   - Historical patterns
   - Recurring transactions
   - Seasonal trends
   - Day of week/month patterns
   - User behavior changes
   - Economic indicators (optional)
