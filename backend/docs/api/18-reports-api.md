# API Reports & Exports

**Module:** Reports  
**Base Path:** `/api/v1/reports`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/reports/generate` | Tạo báo cáo | ✅ |
| GET | `/reports/{id}` | Download báo cáo | ✅ |
| GET | `/reports/{id}/status` | Trạng thái báo cáo | ✅ |
| GET | `/reports` | Danh sách báo cáo | ✅ |
| DELETE | `/reports/{id}` | Xóa báo cáo | ✅ |

---

## 📊 Generate Report

Tạo báo cáo mới.

### Request - Monthly Summary

```http
POST /api/v1/reports/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "report_type": "MONTHLY_SUMMARY",
  "format": "PDF",
  "period": {
    "from": "2026-10-01",
    "to": "2026-10-31"
  },
  "sections": [
    "INCOME_EXPENSE",
    "BY_CATEGORY",
    "BY_MERCHANT",
    "BUDGET_PERFORMANCE",
    "GOALS_PROGRESS",
    "TOP_TRANSACTIONS",
    "INSIGHTS",
    "CHARTS"
  ],
  "language": "vi",
  "currency": "VND",
  "include_attachments": false
}
```

### Request - Annual Report

```http
POST /api/v1/reports/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "report_type": "ANNUAL_REPORT",
  "format": "PDF",
  "year": 2026,
  "sections": [
    "EXECUTIVE_SUMMARY",
    "MONTHLY_BREAKDOWN",
    "CATEGORY_ANALYSIS",
    "SAVINGS_RATE",
    "NET_WORTH_CHART",
    "BUDGET_PERFORMANCE",
    "GOALS_ACHIEVEMENT"
  ],
  "language": "vi"
}
```

### Response Success (202 Accepted)

```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "PROCESSING",
    "estimated_time_seconds": 30,
    "poll_url": "/api/v1/reports/report-uuid/status"
  },
  "message": "Đang tạo báo cáo. Bạn sẽ nhận thông báo khi hoàn tất."
}
```

### Report Types

- `MONTHLY_SUMMARY`: Tổng kết tháng
- `QUARTERLY_REPORT`: Báo cáo quý
- `ANNUAL_REPORT`: Báo cáo năm
- `CUSTOM_RANGE`: Báo cáo tùy chỉnh
- `CATEGORY_ANALYSIS`: Phân tích theo danh mục
- `BUDGET_REPORT`: Báo cáo ngân sách
- `GOALS_REPORT`: Báo cáo mục tiêu
- `TAX_REPORT`: Báo cáo thuế
- `NET_WORTH`: Tài sản ròng

### Formats

- `PDF`: PDF document
- `EXCEL`: Excel spreadsheet (.xlsx)
- `CSV`: CSV files (zipped)
- `JSON`: JSON data

---

## 📥 Download Report

Tải báo cáo đã hoàn thành.

### Request

```http
GET /api/v1/reports/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

**Content-Type:** `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Binary file download.

---

## 🔍 Check Status

Kiểm tra trạng thái tạo báo cáo.

### Request

```http
GET /api/v1/reports/{id}/status
Authorization: Bearer <access_token>
```

### Response - Processing

```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "PROCESSING",
    "progress_percentage": 65,
    "current_step": "Generating charts",
    "estimated_time_remaining": 15
  }
}
```

### Response - Completed

```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "COMPLETED",
    "report_type": "MONTHLY_SUMMARY",
    "format": "PDF",
    "file_size": 2456789,
    "file_name": "Bao_cao_thang_10_2026.pdf",
    "download_url": "/api/v1/reports/report-uuid",
    "expires_at": "2026-10-18T10:00:00Z",
    "created_at": "2026-10-11T10:00:00Z",
    "completed_at": "2026-10-11T10:00:45Z"
  }
}
```

### Response - Failed

```json
{
  "success": false,
  "error": {
    "code": "REPORT_GENERATION_FAILED",
    "message": "Không thể tạo báo cáo",
    "details": {
      "reason": "Insufficient data for the selected period"
    }
  }
}
```

---

## 📋 List Reports

Danh sách báo cáo đã tạo.

### Request

```http
GET /api/v1/reports?report_type=MONTHLY_SUMMARY&status=COMPLETED&page=1
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "report-1",
        "report_type": "MONTHLY_SUMMARY",
        "format": "PDF",
        "period": {
          "from": "2026-10-01",
          "to": "2026-10-31"
        },
        "file_name": "Bao_cao_thang_10_2026.pdf",
        "file_size": 2456789,
        "status": "COMPLETED",
        "download_url": "/api/v1/reports/report-1",
        "expires_at": "2026-10-18T10:00:00Z",
        "created_at": "2026-10-11T10:00:00Z"
      },
      {
        "id": "report-2",
        "report_type": "ANNUAL_REPORT",
        "format": "PDF",
        "year": 2025,
        "file_name": "Bao_cao_nam_2025.pdf",
        "file_size": 5234567,
        "status": "COMPLETED",
        "created_at": "2026-01-05T10:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 15
  }
}
```

---

## 🗑️ Delete Report

Xóa báo cáo.

### Request

```http
DELETE /api/v1/reports/{id}
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "message": "Báo cáo đã được xóa"
}
```

---

## 📊 Report Sections

### Monthly Summary Sections

- `INCOME_EXPENSE`: Tổng thu chi
- `BY_CATEGORY`: Phân tích theo danh mục
- `BY_MERCHANT`: Top merchants
- `BUDGET_PERFORMANCE`: Hiệu suất ngân sách
- `GOALS_PROGRESS`: Tiến độ mục tiêu
- `TOP_TRANSACTIONS`: Giao dịch lớn nhất
- `SAVINGS_RATE`: Tỷ lệ tiết kiệm
- `INSIGHTS`: Nhận xét & gợi ý
- `CHARTS`: Biểu đồ
- `COMPARISON`: So sánh với tháng trước

### Annual Report Sections

- `EXECUTIVE_SUMMARY`: Tóm tắt điều hành
- `MONTHLY_BREAKDOWN`: Phân tích theo tháng
- `CATEGORY_ANALYSIS`: Phân tích danh mục
- `SAVINGS_RATE`: Tỷ lệ tiết kiệm
- `NET_WORTH_CHART`: Biểu đồ tài sản ròng
- `BUDGET_PERFORMANCE`: Hiệu suất ngân sách
- `GOALS_ACHIEVEMENT`: Mục tiêu đạt được
- `TOP_EXPENSES`: Chi tiêu lớn nhất
- `INCOME_SOURCES`: Nguồn thu nhập
- `YEAR_OVER_YEAR`: So sánh năm trước

---

## 🎨 PDF Report Features

- **Branding:** Logo, colors
- **Charts:** Line, bar, pie, donut
- **Tables:** Formatted tables với totals
- **Highlights:** Key metrics boxes
- **Page numbers:** Footer pagination
- **Table of contents:** Auto-generated
- **Export date:** Timestamp

---

## 📈 Excel Report Features

- **Multiple sheets:** Income, Expense, Summary, Charts
- **Formulas:** Auto-calculated totals
- **Formatting:** Colors, borders, fonts
- **Charts:** Embedded charts
- **Filters:** Auto-filter enabled
- **Pivot tables:** Optional

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
