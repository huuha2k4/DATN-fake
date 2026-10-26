# Setup Checklist - Clone và Chạy Project

## ✅ Files cần có (đã commit vào Git)

- [x] `docker-compose.yml` - Docker services configuration
- [x] `.env.example` - Template cho environment variables
- [x] `.gitignore` - Ignore .env và các files không cần commit
- [x] `README.md` - Hướng dẫn setup
- [x] `backend/Dockerfile` - Backend container config
- [x] `frontend-web/Dockerfile.dev` - Frontend container config
- [x] `nginx/nginx.conf` - Nginx reverse proxy config
- [x] `backend/src/main/resources/db/migration/V*.sql` - 10 migration files (V1-V10)

## 🚀 Steps người khác cần làm sau khi clone

### 1. Kiểm tra requirements
```bash
docker --version          # Cần Docker 20+
docker compose version    # Cần Docker Compose v2+
```

### 2. Clone repo
```bash
git clone <repo-url>
cd DATN
```

### 3. Tạo file .env
```bash
# Copy template
cp .env.example .env

# Generate JWT secret mới
openssl rand -base64 64

# Mở .env và điền:
# - JWT_SECRET=<paste JWT secret vừa generate>
# - POSTGRES_PASSWORD=<đặt password mạnh>
# - SUPER_ADMIN_PASSWORD=<đặt password cho admin>
```

### 4. Start services
```bash
docker compose up -d --build
```

### 5. Đợi backend khởi động (30-60s)
```bash
# Theo dõi logs
docker logs backend -f

# Đợi thấy dòng: "Started FinanceApplication in X seconds"
```

### 6. Verify
```bash
# Check tất cả services đang chạy
docker ps

# Kết quả mong đợi: 5 containers
# - postgres
# - redis
# - backend
# - frontend-web
# - nginx

# Test API
curl http://localhost:1116/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!","fullName":"Test User"}'

# Mở browser
# http://localhost:1116
```

## ⚠️ Các vấn đề thường gặp

### Port conflict
```bash
# Nếu port 1116, 8080, 5432 đã được dùng
# Sửa trong file .env:
WEB_PORT=9999      # Đổi sang port khác
API_PORT=9090
POSTGRES_PORT=15432
```

### Backend không start
```bash
# Check logs
docker logs backend

# Thường do:
# - Database chưa ready → đợi thêm 10s
# - Migration lỗi → check logs xem migration nào fail
```

### Database connection refused
```bash
# Restart postgres
docker compose restart postgres

# Hoặc reset toàn bộ
docker compose down -v
docker compose up -d
```

## 📝 Notes

- **Database**: Tự động tạo 49 tables qua 10 migrations (V1-V10)
- **Timezone**: Asia/Ho_Chi_Minh (UTC+7)
- **Default Admin**: username từ SUPER_ADMIN_USER trong .env
- **JWT Token**: Access token expires sau 15 phút (900000ms)
- **Hot Reload**: Backend và frontend đều support hot reload khi dev

## 🔒 Security Notes

**KHÔNG BAO GIỜ commit các files sau:**
- ❌ `.env` (chứa passwords và secrets)
- ❌ `target/` (build files)
- ❌ `node_modules/` (dependencies)
- ❌ `.idea/`, `.vscode/` (IDE configs)

**File .gitignore đã được config để ignore những files trên.**

## ✨ Success!

Nếu thấy dòng sau khi test API:
```json
{
  "success": true,
  "message": "Đăng ký thành công..."
}
```

→ **Project đã sẵn sàng!** 🎉
