# Chat API

API cho trợ lý AI tài chính (AI Financial Assistant) - chatbot thông minh hỗ trợ quản lý tài chính cá nhân.

## Base URL
```
/api/v1/chat
```

## Endpoints

### 1. Tạo conversation mới

**POST** `/api/v1/chat/conversations`

Tạo cuộc hội thoại mới với AI assistant.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Tư vấn tiết kiệm",
  "context": {
    "intent": "budgeting",
    "metadata": {
      "current_month_spending": 15000000,
      "budget": 20000000
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "conv-123e4567-e89b-12d3-a456-426614174000",
    "title": "Tư vấn tiết kiệm",
    "status": "active",
    "message_count": 0,
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T10:00:00Z"
  }
}
```

---

### 2. Lấy danh sách conversations

**GET** `/api/v1/chat/conversations`

Lấy danh sách các cuộc hội thoại.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional): Trạng thái (`active`, `archived`)
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-123e4567-e89b-12d3-a456-426614174000",
        "title": "Tư vấn tiết kiệm",
        "status": "active",
        "message_count": 12,
        "last_message": {
          "content": "Bạn nên cắt giảm chi tiêu ăn uống khoảng 20%",
          "role": "assistant",
          "created_at": "2024-01-20T10:30:00Z"
        },
        "created_at": "2024-01-20T10:00:00Z",
        "updated_at": "2024-01-20T10:30:00Z"
      },
      {
        "id": "conv-223e4567-e89b-12d3-a456-426614174001",
        "title": "Phân tích chi tiêu tháng 1",
        "status": "archived",
        "message_count": 8,
        "last_message": {
          "content": "Cảm ơn bạn!",
          "role": "user",
          "created_at": "2024-01-15T15:00:00Z"
        },
        "created_at": "2024-01-15T14:00:00Z",
        "updated_at": "2024-01-15T15:00:00Z"
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

### 3. Lấy chi tiết conversation

**GET** `/api/v1/chat/conversations/{conversationId}`

Lấy thông tin chi tiết một cuộc hội thoại.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "conv-123e4567-e89b-12d3-a456-426614174000",
    "title": "Tư vấn tiết kiệm",
    "status": "active",
    "message_count": 12,
    "context": {
      "intent": "budgeting",
      "metadata": {
        "current_month_spending": 15000000,
        "budget": 20000000
      }
    },
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T10:30:00Z"
  }
}
```

---

### 4. Cập nhật conversation

**PATCH** `/api/v1/chat/conversations/{conversationId}`

Cập nhật thông tin conversation (title, status).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Tư vấn tiết kiệm tháng 1/2024",
  "status": "archived"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "conv-123e4567-e89b-12d3-a456-426614174000",
    "title": "Tư vấn tiết kiệm tháng 1/2024",
    "status": "archived",
    "updated_at": "2024-01-21T09:00:00Z"
  }
}
```

---

### 5. Xóa conversation

**DELETE** `/api/v1/chat/conversations/{conversationId}`

Xóa cuộc hội thoại và tất cả messages.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Cuộc hội thoại đã được xóa"
}
```

---

### 6. Gửi message

**POST** `/api/v1/chat/conversations/{conversationId}/messages`

Gửi tin nhắn và nhận phản hồi từ AI.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Tôi chi tiêu 15 triệu trong tháng này, có quá nhiều không?",
  "attachments": [
    {
      "type": "transaction",
      "id": "txn-123"
    }
  ],
  "context": {
    "current_screen": "dashboard",
    "user_action": "quick_question"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message_id": "msg-123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": "conv-123e4567-e89b-12d3-a456-426614174000",
    "user_message": {
      "id": "msg-123e4567-e89b-12d3-a456-426614174000",
      "role": "user",
      "content": "Tôi chi tiêu 15 triệu trong tháng này, có quá nhiều không?",
      "created_at": "2024-01-20T10:15:00Z"
    },
    "assistant_message": {
      "id": "msg-223e4567-e89b-12d3-a456-426614174001",
      "role": "assistant",
      "content": "Dựa trên phân tích chi tiêu của bạn:\n\n- Mức chi tiêu 15 triệu/tháng tương đương 75% ngân sách\n- Chi tiêu cao nhất ở danh mục Ăn uống (5.5 triệu)\n- Tăng 20% so với tháng trước\n\nĐề xuất:\n1. Giảm chi tiêu ăn uống 1-2 triệu\n2. Tăng tỷ lệ tiết kiệm lên 30%\n3. Xem xét cắt giảm các dịch vụ không cần thiết",
      "metadata": {
        "analysis": {
          "spending_ratio": 0.75,
          "vs_previous_month": 0.20,
          "top_categories": [
            {"name": "Ăn uống", "amount": 5500000},
            {"name": "Di chuyển", "amount": 3000000}
          ]
        },
        "suggestions": [
          {
            "type": "reduce_spending",
            "category": "Ăn uống",
            "amount": 1500000,
            "priority": "high"
          }
        ],
        "actions": [
          {
            "type": "create_budget",
            "category": "Ăn uống",
            "amount": 4000000
          }
        ]
      },
      "created_at": "2024-01-20T10:15:03Z"
    }
  }
}
```

---

### 7. Gửi message streaming

**POST** `/api/v1/chat/conversations/{conversationId}/messages/stream`

Gửi tin nhắn và nhận phản hồi theo dạng stream (Server-Sent Events).

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: text/event-stream
```

**Request Body:**
```json
{
  "content": "Phân tích chi tiêu tháng này cho tôi",
  "stream": true
}
```

**Response:** `200 OK` (text/event-stream)
```
event: start
data: {"message_id": "msg-123", "conversation_id": "conv-123"}

event: token
data: {"content": "Dựa"}

event: token
data: {"content": " trên"}

event: token
data: {"content": " phân"}

event: token
data: {"content": " tích"}

event: metadata
data: {"analysis": {"spending_ratio": 0.75}}

event: done
data: {"message_id": "msg-123", "total_tokens": 256}
```

---

### 8. Lấy messages của conversation

**GET** `/api/v1/chat/conversations/{conversationId}/messages`

Lấy danh sách tin nhắn trong cuộc hội thoại.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (integer, optional): Số trang (default: 1)
- `limit` (integer, optional): Số lượng/trang (default: 50, max: 100)
- `order` (string, optional): Sắp xếp (`asc`, `desc`, default: `asc`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-123e4567-e89b-12d3-a456-426614174000",
        "role": "user",
        "content": "Tôi chi tiêu 15 triệu trong tháng này, có quá nhiều không?",
        "attachments": [],
        "created_at": "2024-01-20T10:15:00Z"
      },
      {
        "id": "msg-223e4567-e89b-12d3-a456-426614174001",
        "role": "assistant",
        "content": "Dựa trên phân tích...",
        "metadata": {
          "analysis": {},
          "suggestions": []
        },
        "created_at": "2024-01-20T10:15:03Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 12,
      "items_per_page": 50
    }
  }
}
```

---

### 9. Xóa message

**DELETE** `/api/v1/chat/conversations/{conversationId}/messages/{messageId}`

Xóa một tin nhắn trong conversation.

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

### 10. Regenerate response

**POST** `/api/v1/chat/conversations/{conversationId}/messages/{messageId}/regenerate`

Tạo lại phản hồi từ AI cho message.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "temperature": 0.8,
  "context_refresh": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message_id": "msg-323e4567-e89b-12d3-a456-426614174002",
    "role": "assistant",
    "content": "Phản hồi mới từ AI...",
    "created_at": "2024-01-20T10:20:00Z"
  }
}
```

---

### 11. Thực hiện action

**POST** `/api/v1/chat/actions`

Thực hiện các hành động được đề xuất bởi AI.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "action_type": "create_budget",
  "parameters": {
    "category_id": "cat-food",
    "amount": 4000000,
    "period": "monthly"
  },
  "message_id": "msg-223e4567-e89b-12d3-a456-426614174001",
  "conversation_id": "conv-123e4567-e89b-12d3-a456-426614174000"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "action_id": "act-123",
    "action_type": "create_budget",
    "status": "completed",
    "result": {
      "budget_id": "bud-456",
      "category": "Ăn uống",
      "amount": 4000000,
      "period": "monthly"
    },
    "created_at": "2024-01-20T10:25:00Z"
  }
}
```

---

### 12. Lấy suggestions

**GET** `/api/v1/chat/suggestions`

Lấy các gợi ý câu hỏi phổ biến.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `context` (string, optional): Ngữ cảnh (`dashboard`, `transactions`, `budget`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sug-001",
        "text": "Chi tiêu của tôi tháng này thế nào?",
        "category": "analysis",
        "icon": "📊"
      },
      {
        "id": "sug-002",
        "text": "Tôi nên tiết kiệm bao nhiêu mỗi tháng?",
        "category": "advice",
        "icon": "💰"
      },
      {
        "id": "sug-003",
        "text": "Tạo ngân sách cho tháng sau",
        "category": "action",
        "icon": "📝"
      },
      {
        "id": "sug-004",
        "text": "So sánh chi tiêu 3 tháng gần nhất",
        "category": "comparison",
        "icon": "📈"
      }
    ],
    "context": "dashboard"
  }
}
```

---

### 13. Feedback message

**POST** `/api/v1/chat/conversations/{conversationId}/messages/{messageId}/feedback`

Đánh giá phản hồi từ AI.

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": "positive",
  "feedback_type": ["helpful", "accurate"],
  "comment": "Phân tích rất chi tiết và hữu ích"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Cảm ơn feedback của bạn"
}
```

---

### 14. Lấy thống kê chat

**GET** `/api/v1/chat/statistics`

Lấy thống kê sử dụng AI assistant.

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_conversations": 25,
    "total_messages": 340,
    "average_messages_per_conversation": 13.6,
    "active_conversations": 3,
    "most_used_intents": [
      {
        "intent": "spending_analysis",
        "count": 45,
        "percentage": 35
      },
      {
        "intent": "budgeting_advice",
        "count": 32,
        "percentage": 25
      }
    ],
    "actions_executed": 28,
    "positive_feedback_rate": 0.87,
    "this_month": {
      "conversations": 8,
      "messages": 95,
      "actions": 12
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CONVERSATION_NOT_FOUND` | 404 | Conversation không tồn tại |
| `MESSAGE_NOT_FOUND` | 404 | Message không tồn tại |
| `INVALID_MESSAGE` | 400 | Nội dung message không hợp lệ |
| `AI_SERVICE_ERROR` | 500 | Lỗi từ AI service |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt quá giới hạn số message |
| `CONTEXT_TOO_LONG` | 400 | Conversation quá dài (>100 messages) |
| `INVALID_ACTION` | 400 | Action không hợp lệ |

---

## Business Rules

1. **Message limits:**
   - Free tier: 50 messages/month
   - Premium: 500 messages/month
   - Max 100 messages/conversation

2. **Context window:**
   - Include last 20 messages
   - Include user financial summary
   - Include recent transactions (last 30 days)

3. **AI capabilities:**
   - Spending analysis
   - Budget recommendations
   - Goal planning advice
   - Transaction categorization help
   - Financial health scoring
   - Anomaly detection explanation

4. **Actions AI can perform:**
   - Create budget
   - Set financial goal
   - Create recurring transaction
   - Categorize transactions
   - Generate reports

5. **Privacy:**
   - No PII sent to AI
   - Conversations encrypted
   - Can delete anytime
   - No data sharing

6. **Response time:**
   - Standard: <3s
   - Streaming: Start <500ms
   - Complex analysis: <10s
