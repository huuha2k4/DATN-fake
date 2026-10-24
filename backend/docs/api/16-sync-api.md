# API Sync (Offline-First)

**Module:** Synchronization  
**Base Path:** `/api/v1/sync`  
**Version:** 1.0

---

## 📋 Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/sync/pull` | Pull thay đổi từ server | ✅ |
| POST | `/sync/push` | Push thay đổi lên server | ✅ |
| POST | `/sync/resolve-conflict` | Giải quyết xung đột | ✅ |
| GET | `/sync/status` | Trạng thái đồng bộ | ✅ |
| POST | `/sync/full-sync` | Đồng bộ toàn bộ (lần đầu) | ✅ |
| POST | `/sync/reset` | Reset trạng thái sync | ✅ |

---

## 📥 Pull Changes

Kéo các thay đổi mới từ server về client.

### Request

```http
GET /api/v1/sync/pull?since_seq=1234&limit=1000&tables=transactions,accounts,budgets
Authorization: Bearer <access_token>
```

### Query Parameters

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `since_seq` | bigint | Yes | Sequence number cuối cùng client có |
| `limit` | int | No | Số lượng changes (default: 1000, max: 5000) |
| `tables` | string[] | No | Lọc theo bảng (comma-separated) |

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "current_seq": 1500,
    "changes": [
      {
        "seq": 1235,
        "table": "transactions",
        "operation": "INSERT",
        "entity_id": "tx-uuid-1",
        "data": {
          "id": "tx-uuid-1",
          "user_id": "user-uuid",
          "account_id": "acc-uuid",
          "amount": 50000,
          "currency_code": "VND",
          "description": "Cafe",
          "transaction_date": "2026-10-11",
          "category_id": "cat-uuid",
          "created_at": "2026-10-11T08:00:00Z",
          "updated_at": "2026-10-11T08:00:00Z",
          "deleted_at": null,
          "version": 0,
          "sync_seq": 1235
        }
      },
      {
        "seq": 1240,
        "table": "transactions",
        "operation": "UPDATE",
        "entity_id": "tx-uuid-2",
        "data": {
          "id": "tx-uuid-2",
          "amount": 75000,
          "description": "Cafe + Bánh",
          "updated_at": "2026-10-11T09:00:00Z",
          "version": 1,
          "sync_seq": 1240
        }
      },
      {
        "seq": 1245,
        "table": "transactions",
        "operation": "DELETE",
        "entity_id": "tx-uuid-3",
        "data": {
          "id": "tx-uuid-3",
          "deleted_at": "2026-10-11T10:00:00Z",
          "sync_seq": 1245
        }
      },
      {
        "seq": 1250,
        "table": "accounts",
        "operation": "UPDATE",
        "entity_id": "acc-uuid-1",
        "data": {
          "id": "acc-uuid-1",
          "balance": 950000,
          "updated_at": "2026-10-11T08:00:00Z",
          "version": 5,
          "sync_seq": 1250
        }
      }
    ],
    "has_more": false,
    "next_seq": 1500
  },
  "metadata": {
    "total_changes": 15,
    "returned_changes": 15,
    "tables_included": ["transactions", "accounts"]
  }
}
```

### Client Processing Logic

```typescript
async function processPullChanges(changes: Change[]) {
  // Sort by seq to ensure order
  changes.sort((a, b) => a.seq - b.seq);
  
  for (const change of changes) {
    switch (change.operation) {
      case 'INSERT':
        await db.insertOrReplace(change.table, change.data);
        break;
      case 'UPDATE':
        await db.update(change.table, change.data);
        break;
      case 'DELETE':
        await db.softDelete(change.table, change.entity_id);
        break;
    }
    
    // Update local sync_seq
    await updateLocalSyncSeq(change.seq);
  }
}
```

---

## 📤 Push Changes

Đẩy các thay đổi từ client lên server.

### Request

```http
POST /api/v1/sync/push
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_id": "device-uuid",
  "client_timestamp": "2026-10-11T10:30:00Z",
  "changes": [
    {
      "client_id": "temp-uuid-1",
      "table": "transactions",
      "operation": "INSERT",
      "data": {
        "id": "temp-uuid-1",
        "account_id": "acc-uuid",
        "transaction_type": "EXPENSE",
        "amount": 50000,
        "currency_code": "VND",
        "description": "Cafe offline",
        "transaction_date": "2026-10-11",
        "category_id": "cat-uuid",
        "created_at": "2026-10-11T10:00:00Z",
        "updated_at": "2026-10-11T10:00:00Z",
        "version": 0
      }
    },
    {
      "client_id": "tx-uuid-existing",
      "table": "transactions",
      "operation": "UPDATE",
      "data": {
        "id": "tx-uuid-existing",
        "amount": 60000,
        "description": "Updated offline",
        "updated_at": "2026-10-11T10:05:00Z",
        "version": 2
      }
    },
    {
      "client_id": "tx-uuid-to-delete",
      "table": "transactions",
      "operation": "DELETE",
      "data": {
        "id": "tx-uuid-to-delete",
        "deleted_at": "2026-10-11T10:10:00Z",
        "version": 1
      }
    }
  ]
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "sync_seq": 1503,
    "processed": 3,
    "successful": 2,
    "conflicts": 1,
    "results": [
      {
        "client_id": "temp-uuid-1",
        "status": "SUCCESS",
        "server_id": "tx-uuid-new",
        "sync_seq": 1501,
        "message": "Giao dịch đã được tạo"
      },
      {
        "client_id": "tx-uuid-existing",
        "status": "CONFLICT",
        "conflict_type": "VERSION_MISMATCH",
        "reason": "Version không khớp (expected: 2, actual: 3)",
        "server_data": {
          "id": "tx-uuid-existing",
          "amount": 65000,
          "description": "Updated from another device",
          "updated_at": "2026-10-11T10:03:00Z",
          "version": 3,
          "sync_seq": 1495
        },
        "resolution_required": true
      },
      {
        "client_id": "tx-uuid-to-delete",
        "status": "SUCCESS",
        "sync_seq": 1503,
        "message": "Giao dịch đã được xóa"
      }
    ]
  },
  "message": "Đã xử lý 3 thay đổi. 2 thành công, 1 xung đột."
}
```

### Response - Partial Success with Conflicts

Khi có xung đột, client cần xử lý:

1. **Auto-resolve (Last-Write-Wins):**
   ```typescript
   if (conflict.server_data.updated_at < change.data.updated_at) {
     // Client wins, retry push
     await retryPush(change);
   } else {
     // Server wins, update local
     await updateLocal(conflict.server_data);
   }
   ```

2. **Manual resolution (User chooses):**
   ```typescript
   const choice = await showConflictDialog(
     change.data,
     conflict.server_data
   );
   await resolveConflict(conflict.client_id, choice);
   ```

---

## ⚔️ Resolve Conflict

Giải quyết xung đột thủ công.

### Request - Keep Client Version

```http
POST /api/v1/sync/resolve-conflict
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "entity_id": "tx-uuid-existing",
  "table": "transactions",
  "resolution": "CLIENT",
  "data": {
    "id": "tx-uuid-existing",
    "amount": 60000,
    "description": "Updated offline",
    "updated_at": "2026-10-11T10:05:00Z",
    "version": 3
  }
}
```

### Request - Keep Server Version

```http
POST /api/v1/sync/resolve-conflict
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "entity_id": "tx-uuid-existing",
  "table": "transactions",
  "resolution": "SERVER"
}
```

### Request - Merge (Field-level)

```http
POST /api/v1/sync/resolve-conflict
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "entity_id": "tx-uuid-existing",
  "table": "transactions",
  "resolution": "MERGE",
  "data": {
    "id": "tx-uuid-existing",
    "amount": 60000,
    "description": "Updated from another device",
    "category_id": "cat-new-uuid",
    "updated_at": "2026-10-11T10:30:00Z",
    "version": 3
  }
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "entity_id": "tx-uuid-existing",
    "resolved": true,
    "sync_seq": 1504,
    "final_data": {
      "id": "tx-uuid-existing",
      "amount": 60000,
      "description": "Updated offline",
      "version": 4,
      "sync_seq": 1504
    }
  },
  "message": "Xung đột đã được giải quyết"
}
```

---

## 📊 Sync Status

Kiểm tra trạng thái đồng bộ.

### Request

```http
GET /api/v1/sync/status
Authorization: Bearer <access_token>
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "current_seq": 1504,
    "last_pull_seq": 1500,
    "last_push_at": "2026-10-11T10:30:00Z",
    "last_pull_at": "2026-10-11T10:25:00Z",
    "pending_changes": 4,
    "is_synced": false,
    "has_conflicts": false,
    "devices": [
      {
        "device_id": "device-uuid-1",
        "device_name": "iPhone 13",
        "last_synced_at": "2026-10-11T10:30:00Z",
        "sync_seq": 1504
      },
      {
        "device_id": "device-uuid-2",
        "device_name": "MacBook Pro",
        "last_synced_at": "2026-10-11T09:00:00Z",
        "sync_seq": 1480
      }
    ]
  }
}
```

---

## 🔄 Full Sync

Đồng bộ toàn bộ dữ liệu (lần đầu hoặc reset).

### Request

```http
POST /api/v1/sync/full-sync
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_id": "device-uuid",
  "device_name": "iPhone 13",
  "platform": "iOS",
  "last_sync_at": null
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "sync_seq": 1504,
    "data": {
      "accounts": [
        {
          "id": "acc-1",
          "name": "Ví tiền mặt",
          "balance": 1000000,
          // ... full account data
        }
      ],
      "transactions": [
        // ... all transactions
      ],
      "categories": [
        // ... all categories
      ],
      "budgets": [
        // ... all budgets
      ],
      "goals": [
        // ... all goals
      ],
      "recurring_transactions": [
        // ... all recurring transactions
      ]
    },
    "counts": {
      "accounts": 5,
      "transactions": 1250,
      "categories": 45,
      "budgets": 8,
      "goals": 3,
      "recurring_transactions": 5
    }
  },
  "message": "Đã tải toàn bộ dữ liệu"
}
```

**Note:** Response có thể lớn (vài MB). Client nên cache và chỉ pull incremental sau đó.

---

## 🔄 Reset Sync

Reset trạng thái đồng bộ (xóa local, tải lại từ server).

### Request

```http
POST /api/v1/sync/reset
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_id": "device-uuid",
  "reason": "Data corruption"
}
```

### Response Success (200 OK)

```json
{
  "success": true,
  "data": {
    "reset": true,
    "new_sync_seq": 1504,
    "message": "Trạng thái đồng bộ đã được reset. Vui lòng gọi /full-sync để tải lại dữ liệu."
  }
}
```

---

## 🧩 Client Implementation Guide

### 1. Initial Setup

```typescript
class SyncService {
  private db: LocalDatabase;
  private api: ApiClient;
  private syncSeq: number = 0;

  async initialize() {
    // Load last sync_seq from local storage
    this.syncSeq = await this.db.getSyncSeq();
    
    // If first time, do full sync
    if (this.syncSeq === 0) {
      await this.fullSync();
    } else {
      await this.incrementalSync();
    }
  }

  async fullSync() {
    const response = await this.api.post('/sync/full-sync', {
      device_id: this.deviceId,
      device_name: this.deviceName
    });

    // Clear local database
    await this.db.clear();

    // Insert all data
    await this.db.bulkInsert(response.data);

    // Update sync_seq
    this.syncSeq = response.sync_seq;
    await this.db.setSyncSeq(this.syncSeq);
  }
}
```

### 2. Incremental Sync (Pull)

```typescript
async incrementalSync() {
  const response = await this.api.get('/sync/pull', {
    params: { since_seq: this.syncSeq }
  });

  // Process changes
  for (const change of response.changes) {
    await this.processChange(change);
  }

  // Update sync_seq
  this.syncSeq = response.current_seq;
  await this.db.setSyncSeq(this.syncSeq);

  // If has more, continue pulling
  if (response.has_more) {
    await this.incrementalSync();
  }
}

async processChange(change: Change) {
  switch (change.operation) {
    case 'INSERT':
    case 'UPDATE':
      await this.db.upsert(change.table, change.data);
      break;
    case 'DELETE':
      await this.db.softDelete(change.table, change.entity_id);
      break;
  }
}
```

### 3. Push Local Changes

```typescript
async pushChanges() {
  // Get pending changes from local queue
  const pendingChanges = await this.db.getPendingChanges();

  if (pendingChanges.length === 0) {
    return;
  }

  const response = await this.api.post('/sync/push', {
    device_id: this.deviceId,
    client_timestamp: new Date().toISOString(),
    changes: pendingChanges
  });

  // Process results
  for (const result of response.results) {
    if (result.status === 'SUCCESS') {
      await this.db.markSynced(result.client_id, result.sync_seq);
    } else if (result.status === 'CONFLICT') {
      await this.handleConflict(result);
    }
  }
}
```

### 4. Conflict Resolution

```typescript
async handleConflict(conflict: ConflictResult) {
  const strategy = await this.getConflictStrategy();

  switch (strategy) {
    case 'LAST_WRITE_WINS':
      // Compare timestamps
      const clientData = await this.db.get(conflict.client_id);
      if (clientData.updated_at > conflict.server_data.updated_at) {
        // Client wins, force push
        await this.resolveConflict(conflict.client_id, 'CLIENT', clientData);
      } else {
        // Server wins, update local
        await this.db.update(conflict.table, conflict.server_data);
      }
      break;

    case 'MANUAL':
      // Show UI for user to choose
      const choice = await this.showConflictDialog(conflict);
      await this.resolveConflict(conflict.client_id, choice.resolution, choice.data);
      break;
  }
}
```

### 5. Background Sync

```typescript
class BackgroundSyncService {
  private syncInterval: number = 15 * 60 * 1000; // 15 minutes

  start() {
    // Sync on app start
    this.syncNow();

    // Periodic sync
    setInterval(() => this.syncNow(), this.syncInterval);

    // Sync on network reconnect
    window.addEventListener('online', () => this.syncNow());
  }

  async syncNow() {
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    try {
      // Pull first
      await syncService.incrementalSync();

      // Then push
      await syncService.pushChanges();

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## 📱 Mobile Best Practices

### Android WorkManager

```kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            syncService.sync()
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

// Schedule periodic sync
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

### iOS Background Fetch

```swift
func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    syncService.sync { result in
        switch result {
        case .success:
            completionHandler(.newData)
        case .failure:
            completionHandler(.failed)
        }
    }
}
```

---

## ⚠️ Edge Cases

### 1. Token Theft Detection

Nếu refresh token bị reuse → Server revoke tất cả tokens → Client cần re-login.

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_REUSE_DETECTED",
    "message": "Phát hiện token bị sử dụng lại",
    "action_required": "RE_LOGIN"
  }
}
```

### 2. Data Corruption

Nếu client data bị corrupt:

```typescript
try {
  await syncService.incrementalSync();
} catch (error) {
  if (error.code === 'DATA_CORRUPTION') {
    // Reset and full sync
    await syncService.reset();
    await syncService.fullSync();
  }
}
```

### 3. Large Data Sets

Nếu user có quá nhiều giao dịch (>10K):

```typescript
async fullSync() {
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const response = await this.api.post('/sync/full-sync', {
      offset,
      limit
    });
    
    await this.db.bulkInsert(response.data);
    
    if (response.data.transactions.length < limit) {
      break;
    }
    
    offset += limit;
  }
}
```

---

## 🔗 Related Documentation

- [Database Sync Strategy](../08-chien-luoc-dong-bo.md)
- [Transactions API](04-transactions-api.md)
- [Authentication API](01-auth-api.md)

---

**Cập nhật:** 11/10/2026  
**Version:** 1.0
