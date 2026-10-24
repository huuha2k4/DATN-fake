# Chiến Lược Đồng Bộ Offline-First

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Đồng Bộ](#kiến-trúc-đồng-bộ)
3. [Cột Đồng Bộ Chuẩn](#cột-đồng-bộ-chuẩn)
4. [Luồng Đồng Bộ](#luồng-đồng-bộ)
5. [Xử Lý Xung Đột](#xử-lý-xung-đột)
6. [Xóa Mềm (Soft Delete)](#xóa-mềm-soft-delete)
7. [Optimistic Locking](#optimistic-locking)
8. [Pull Incremental](#pull-incremental)
9. [Push Changes](#push-changes)
10. [API Endpoints](#api-endpoints)
11. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)

---

## Tổng Quan

### Mục Tiêu

Hệ thống được thiết kế với nguyên tắc **Offline-First**:

1. ✅ Người dùng có thể thao tác offline (thêm/sửa/xóa)
2. ✅ Dữ liệu tự động đồng bộ khi có mạng
3. ✅ Xung đột được phát hiện và xử lý
4. ✅ Đồng bộ tối ưu (chỉ pull/push thay đổi)
5. ✅ Hỗ trợ multi-device

### Chiến Lược

- **Timestamp-based sync:** Dùng `updated_at` để phát hiện thay đổi
- **Sequence number:** `sync_seq` per user để tracking
- **Soft delete:** `deleted_at` thay vì DELETE vật lý
- **Optimistic locking:** `version` để phát hiện concurrent updates
- **Conflict resolution:** Last-Write-Wins (LWW) hoặc user chọn

---

## Kiến Trúc Đồng Bộ

### Thành Phần

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Mobile App │◄────────┤   Backend   │────────►│  PostgreSQL │
│  (SQLite)   │  Sync   │   (API)     │         │  (Server)   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌─────────────┐
│ Local Queue │         │ Sync Engine │
│ (Pending)   │         │  (FastAPI)  │
└─────────────┘         └─────────────┘
```

### Luồng Đồng Bộ

1. **Pull:** Client kéo thay đổi mới từ server
2. **Merge:** Client merge vào DB local
3. **Push:** Client đẩy thay đổi local lên server
4. **Resolve:** Server phát hiện xung đột và xử lý

---

## Cột Đồng Bộ Chuẩn

### Cột Bắt Buộc (Có trong mọi bảng sync)

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| **id** | UUID | PK | ID duy nhất (client generate) |
| **sync_seq** | BIGINT | NULL | Phiên đồng bộ (server gán) |
| **created_at** | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Thời điểm tạo |
| **updated_at** | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Thời điểm cập nhật |
| **deleted_at** | TIMESTAMPTZ | NULL | Thời điểm xóa mềm |
| **version** | BIGINT | NOT NULL, DEFAULT 0 | Optimistic lock version |

### Trigger Tự Động Cập Nhật

```sql
-- Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng cho mọi bảng có cột updated_at
CREATE TRIGGER update_transactions_updated_at 
BEFORE UPDATE ON core.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Trigger Tự Động Tăng Version

```sql
CREATE OR REPLACE FUNCTION increment_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_transactions_version
BEFORE UPDATE ON core.transactions
FOR EACH ROW EXECUTE FUNCTION increment_version_column();
```

---

## Luồng Đồng Bộ

### 1. Pull Changes (Client → Server)

**Request:**
```http
GET /api/v1/sync/pull?since_seq=1234
Authorization: Bearer <token>
```

**Response:**
```json
{
  "current_seq": 1250,
  "changes": [
    {
      "table": "transactions",
      "sync_seq": 1235,
      "operation": "INSERT",
      "data": {
        "id": "uuid-1",
        "user_id": "uuid-user",
        "amount": 100000,
        "created_at": "2026-10-10T10:00:00Z",
        "updated_at": "2026-10-10T10:00:00Z",
        "deleted_at": null,
        "version": 0
      }
    },
    {
      "table": "transactions",
      "sync_seq": 1240,
      "operation": "UPDATE",
      "data": {
        "id": "uuid-2",
        "amount": 200000,
        "updated_at": "2026-10-10T11:00:00Z",
        "version": 1
      }
    },
    {
      "table": "transactions",
      "sync_seq": 1245,
      "operation": "DELETE",
      "data": {
        "id": "uuid-3",
        "deleted_at": "2026-10-10T12:00:00Z"
      }
    }
  ]
}
```

**Logic Server:**
```sql
SELECT 
  'transactions' as table_name,
  sync_seq,
  CASE 
    WHEN deleted_at IS NOT NULL THEN 'DELETE'
    WHEN sync_seq = 0 THEN 'INSERT'
    ELSE 'UPDATE'
  END as operation,
  -- Full data cho INSERT, partial cho UPDATE
  to_jsonb(t.*) as data
FROM core.transactions t
WHERE user_id = :user_id
  AND sync_seq > :since_seq
ORDER BY sync_seq ASC
LIMIT 1000;
```

### 2. Push Changes (Client → Server)

**Request:**
```http
POST /api/v1/sync/push
Authorization: Bearer <token>

{
  "client_timestamp": "2026-10-10T13:00:00Z",
  "changes": [
    {
      "table": "transactions",
      "operation": "INSERT",
      "data": {
        "id": "uuid-new",
        "amount": 50000,
        "description": "Cafe",
        "transaction_date": "2026-10-10",
        "created_at": "2026-10-10T13:00:00Z"
      }
    },
    {
      "table": "transactions",
      "operation": "UPDATE",
      "data": {
        "id": "uuid-existing",
        "amount": 75000,
        "version": 2,
        "updated_at": "2026-10-10T13:05:00Z"
      }
    }
  ]
}
```

**Response:**
```json
{
  "sync_seq": 1260,
  "results": [
    {
      "client_id": "uuid-new",
      "status": "SUCCESS",
      "sync_seq": 1251
    },
    {
      "client_id": "uuid-existing",
      "status": "CONFLICT",
      "reason": "Version mismatch (expected 2, got 3)",
      "server_data": {
        "id": "uuid-existing",
        "amount": 80000,
        "version": 3,
        "updated_at": "2026-10-10T12:50:00Z"
      }
    }
  ]
}
```

---

## Xử Lý Xung Đột

### Phát Hiện Xung Đột

**Xung đột xảy ra khi:**
1. **Version mismatch:** Client gửi version khác với server
2. **Concurrent update:** Cùng lúc sửa trên 2 device
3. **Delete conflict:** Client sửa record đã bị xóa

### Chiến Lược Giải Quyết

#### 1. Last-Write-Wins (LWW) - Mặc Định

```sql
-- Server so sánh timestamp
IF client.updated_at > server.updated_at THEN
    -- Client thắng
    UPDATE ... SET ... WHERE id = ... AND version = expected_version;
ELSE
    -- Server thắng
    RETURN 'CONFLICT' WITH server_data;
END IF;
```

**Ưu điểm:** Đơn giản, tự động  
**Nhược điểm:** Mất dữ liệu từ phía thua

#### 2. Manual Resolution (User Chọn)

Server trả về conflict:
```json
{
  "status": "CONFLICT",
  "client_data": {"amount": 75000, "description": "Cafe"},
  "server_data": {"amount": 80000, "description": "Coffee"},
  "conflict_fields": ["amount", "description"]
}
```

Client hiển thị UI cho user chọn:
- Giữ phiên bản của tôi
- Dùng phiên bản từ server
- Merge thủ công

#### 3. Field-Level Merge

```json
{
  "strategy": "MERGE",
  "resolution": {
    "amount": "CLIENT",      // Lấy từ client
    "description": "SERVER", // Lấy từ server
    "category_id": "CLIENT"
  }
}
```

### Ma trận Xung Đột

| Client | Server | Kết Quả |
|--------|--------|---------|
| INSERT | NULL | SUCCESS (insert) |
| INSERT | EXISTS | CONFLICT (duplicate) |
| UPDATE | SAME VERSION | SUCCESS (update) |
| UPDATE | NEWER VERSION | CONFLICT (stale) |
| UPDATE | DELETED | CONFLICT (not found) |
| DELETE | EXISTS | SUCCESS (soft delete) |
| DELETE | DELETED | SUCCESS (idempotent) |

---

## Xóa Mềm (Soft Delete)

### Nguyên Tắc

- **Không DELETE vật lý** các bảng có đồng bộ
- Set `deleted_at = now()` thay vì `DELETE FROM`
- Trigger tự động set deleted_at

### Implementation

```sql
-- Soft delete trigger
CREATE OR REPLACE FUNCTION soft_delete_handler()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Chuyển DELETE thành UPDATE
        UPDATE core.transactions 
        SET deleted_at = now()
        WHERE id = OLD.id;
        
        -- Ngăn DELETE vật lý
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soft_delete_transactions
BEFORE DELETE ON core.transactions
FOR EACH ROW EXECUTE FUNCTION soft_delete_handler();
```

### Query với Soft Delete

```sql
-- Chỉ lấy record chưa xóa
SELECT * FROM core.transactions
WHERE user_id = :user_id
  AND deleted_at IS NULL;

-- Lấy tất cả (bao gồm đã xóa)
SELECT * FROM core.transactions
WHERE user_id = :user_id;
```

### Cleanup Định Kỳ

```sql
-- Job chạy hàng tháng: xóa vật lý record đã xóa > 90 ngày
DELETE FROM core.transactions
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - INTERVAL '90 days';
```

---

## Optimistic Locking

### Nguyên Tắc

- Mỗi UPDATE phải gửi `version` hiện tại
- Server chỉ cập nhật nếu version khớp
- Nếu không khớp → CONFLICT

### Implementation

```sql
UPDATE core.transactions
SET 
  amount = :new_amount,
  description = :new_description,
  version = version + 1,
  updated_at = now()
WHERE id = :id
  AND user_id = :user_id
  AND version = :expected_version
  AND deleted_at IS NULL;

-- Kiểm tra affected rows
IF affected_rows = 0 THEN
    -- Version mismatch hoặc record không tồn tại
    RETURN 'CONFLICT';
END IF;
```

### Client Code (Java)

```java
@Transactional
public void updateTransaction(UUID id, UpdateTransactionDto dto) {
    Transaction tx = repo.findById(id)
        .orElseThrow(() -> new NotFoundException());
    
    // Client phải gửi version hiện tại
    if (!tx.getVersion().equals(dto.getExpectedVersion())) {
        throw new OptimisticLockException(tx);
    }
    
    tx.setAmount(dto.getAmount());
    tx.setDescription(dto.getDescription());
    // version tự động tăng bởi trigger
    
    repo.save(tx);
}
```

---

## Pull Incremental

### Bảng: user_sync_state

```sql
CREATE TABLE core.user_sync_state (
  user_id UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  current_seq BIGINT NOT NULL DEFAULT 0,
  last_pull_at TIMESTAMPTZ NULL,
  last_push_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Gán sync_seq

**Trigger tự động gán:**
```sql
CREATE SEQUENCE global_sync_seq START 1;

CREATE OR REPLACE FUNCTION assign_sync_seq()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        NEW.sync_seq = nextval('global_sync_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_transactions_sync_seq
BEFORE INSERT OR UPDATE ON core.transactions
FOR EACH ROW EXECUTE FUNCTION assign_sync_seq();
```

### Endpoint Pull

```python
@router.get("/sync/pull")
async def pull_changes(
    since_seq: int = 0,
    limit: int = 1000,
    current_user: User = Depends(get_current_user)
):
    changes = []
    
    # Lấy thay đổi từ tất cả bảng sync
    tables = [
        'transactions', 'accounts', 'budgets', 
        'goals', 'recurring_transactions'
    ]
    
    for table in tables:
        query = f"""
            SELECT sync_seq, to_jsonb(t.*) as data
            FROM core.{table} t
            WHERE user_id = :user_id
              AND sync_seq > :since_seq
            ORDER BY sync_seq ASC
        """
        
        rows = await db.fetch_all(query, {
            'user_id': current_user.id,
            'since_seq': since_seq
        })
        
        for row in rows:
            changes.append({
                'table': table,
                'sync_seq': row['sync_seq'],
                'data': row['data']
            })
    
    # Sort tất cả thay đổi theo sync_seq
    changes.sort(key=lambda x: x['sync_seq'])
    changes = changes[:limit]
    
    # Current seq cao nhất trong hệ thống
    current_seq = await db.fetch_val(
        "SELECT current_seq FROM core.user_sync_state WHERE user_id = :user_id",
        {'user_id': current_user.id}
    )
    
    return {
        'current_seq': current_seq or 0,
        'changes': changes,
        'has_more': len(changes) == limit
    }
```

---

## Push Changes

### Xử Lý Batch

```python
@router.post("/sync/push")
async def push_changes(
    request: PushRequest,
    current_user: User = Depends(get_current_user)
):
    results = []
    
    async with db.transaction():
        for change in request.changes:
            try:
                if change.operation == 'INSERT':
                    result = await handle_insert(change, current_user)
                elif change.operation == 'UPDATE':
                    result = await handle_update(change, current_user)
                elif change.operation == 'DELETE':
                    result = await handle_delete(change, current_user)
                
                results.append({
                    'client_id': change.data['id'],
                    'status': 'SUCCESS',
                    'sync_seq': result['sync_seq']
                })
                
            except OptimisticLockException as e:
                results.append({
                    'client_id': change.data['id'],
                    'status': 'CONFLICT',
                    'reason': str(e),
                    'server_data': e.server_data
                })
            
            except Exception as e:
                results.append({
                    'client_id': change.data['id'],
                    'status': 'ERROR',
                    'error': str(e)
                })
        
        # Cập nhật user_sync_state
        await update_user_sync_state(current_user.id)
    
    return {'results': results}
```

---

## API Endpoints

### Tổng Quan

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/sync/pull` | GET | Pull thay đổi từ server |
| `/api/v1/sync/push` | POST | Push thay đổi lên server |
| `/api/v1/sync/resolve-conflict` | POST | Giải quyết xung đột |
| `/api/v1/sync/status` | GET | Trạng thái đồng bộ |
| `/api/v1/sync/full-sync` | POST | Đồng bộ toàn bộ (lần đầu) |

### Full Sync (Lần Đầu)

```http
POST /api/v1/sync/full-sync

{
  "device_id": "uuid-device",
  "last_sync_at": null
}
```

**Response:** Toàn bộ dữ liệu của user

---

## Ví Dụ Thực Tế

### Kịch Bản: User Sửa Giao Dịch Offline

**1. User offline, sửa giao dịch:**
```sql
-- Client SQLite
UPDATE transactions
SET amount = 150000, version = version + 1, updated_at = '2026-10-10T14:00:00Z'
WHERE id = 'uuid-tx-1';

-- Đánh dấu pending sync
INSERT INTO sync_queue (table_name, operation, record_id)
VALUES ('transactions', 'UPDATE', 'uuid-tx-1');
```

**2. User online, app sync:**
```http
POST /api/v1/sync/push

{
  "changes": [{
    "table": "transactions",
    "operation": "UPDATE",
    "data": {
      "id": "uuid-tx-1",
      "amount": 150000,
      "version": 5,
      "updated_at": "2026-10-10T14:00:00Z"
    }
  }]
}
```

**3. Server xử lý:**
```sql
-- Kiểm tra version
SELECT version FROM core.transactions WHERE id = 'uuid-tx-1';
-- Kết quả: 5 (khớp)

UPDATE core.transactions
SET amount = 150000, updated_at = now()
WHERE id = 'uuid-tx-1' AND version = 5;
-- SUCCESS, sync_seq = 1300
```

**4. Client nhận response:**
```json
{
  "results": [{
    "client_id": "uuid-tx-1",
    "status": "SUCCESS",
    "sync_seq": 1300
  }]
}
```

**5. Client cleanup:**
```sql
DELETE FROM sync_queue WHERE record_id = 'uuid-tx-1';
```

---

## Best Practices

### 1. UUID Client-Generated
```java
// Client tạo UUID trước khi insert
UUID id = UUID.randomUUID();
transaction.setId(id);
```

### 2. Batch Sync
- Đồng bộ theo batch (50-100 records/lần)
- Tránh sync quá nhiều một lúc → timeout

### 3. Background Sync
```kotlin
// Android WorkManager
WorkManager.getInstance(context)
    .enqueueUniquePeriodicWork(
        "sync",
        ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()
    )
```

### 4. Conflict UI
```kotlin
// Hiển thị dialog khi có conflict
when (conflict.strategy) {
    ConflictStrategy.MANUAL -> {
        showConflictDialog(
            clientData = conflict.clientData,
            serverData = conflict.serverData,
            onResolve = { resolution ->
                syncService.resolveConflict(conflict.id, resolution)
            }
        )
    }
}
```

### 5. Sync Indicator
```kotlin
// Hiển thị trạng thái sync trên UI
viewModel.syncStatus.observe(this) { status ->
    when (status) {
        SyncStatus.SYNCING -> showProgressBar()
        SyncStatus.SYNCED -> hideProgressBar()
        SyncStatus.ERROR -> showRetryButton()
        SyncStatus.CONFLICT -> showConflictBadge()
    }
}
```

---

## Monitoring & Metrics

### Metrics Quan Trọng

- **Sync latency:** Thời gian từ lúc thay đổi đến lúc sync xong
- **Conflict rate:** % giao dịch bị conflict
- **Pull frequency:** Bao lâu user pull một lần
- **Push batch size:** Số lượng changes/push
- **Sync errors:** Lỗi network, timeout

### Logging

```sql
CREATE TABLE ops.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  direction VARCHAR(10) NOT NULL, -- PULL, PUSH
  changes_count INTEGER NOT NULL,
  conflicts_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Liên Kết

- ← [07. Schema OPS Chi Tiết](07-schema-ops-chi-tiet.md)
- ← [03. Quy Tắc Nghiệp Vụ](03-quy-tac-nghiep-vu.md)
- → [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md)
- → [09. Chiến Lược Bảo Mật](09-chien-luoc-bao-mat.md)
