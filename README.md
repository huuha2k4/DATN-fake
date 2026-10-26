# Finance Management System

Hệ thống quản lý tài chính cá nhân với Spring Boot backend, React Web frontend và React Native mobile app.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (cho mobile app)
- Git

## Quick Start

### 1. Clone repository

```bash
git clone <repository-url>
cd DATN
```

### 2. Setup environment variables

```bash
# Copy file .env.example thành .env
cp .env.example .env

# Mở .env và thay đổi các giá trị sau:
# - POSTGRES_PASSWORD: Đặt password mạnh cho database
# - JWT_SECRET: Generate mới bằng: openssl rand -base64 64
# - SUPER_ADMIN_PASSWORD: Đặt password cho admin account
```

### 3. Start tất cả services

```bash
# Build và start tất cả containers
docker compose up -d --build

# Chờ 30s để backend khởi động và chạy migrations
# Kiểm tra logs
docker logs backend -f
```

### 4. Verify

- Truy cập http://localhost:1116 để xem frontend web
- Test API: http://localhost:1116/api/v1/auth/register

## Stop Services

```bash
# Stop tất cả
docker compose down

# Stop và xóa volumes (reset database)
docker compose down -v
```

## Services

- **Nginx Reverse Proxy**: http://localhost:1116
- **Backend API**: http://localhost:8080 (hoặc qua nginx: http://localhost:1116/api/v1)
- **Frontend Web**: http://localhost:5173 (Admin Dashboard)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Architecture

```
┌─────────┐
│  Nginx  │ :1116 (Reverse Proxy)
└────┬────┘
     │
     ├─→ Backend API :8080 (Spring Boot)
     │        │
     │        ├─→ PostgreSQL :5432
     │        └─→ Redis :6379
     │
     └─→ Frontend Web :5173 (React + Vite)
```

## Database

- **49 tables** tự động khởi tạo khi start lần đầu
- **10 migrations** (V1-V10) được apply bởi Flyway
- Timezone: **Asia/Ho_Chi_Minh (UTC+7)**
- Schema: `core`

### Migrations

```bash
# Xem migration history
docker exec postgres psql -U postgres -d finance_db -c \
  "SELECT version, description, installed_on FROM core.flyway_schema_history ORDER BY installed_rank"
```

## Frontend Mobile App

Frontend app (React Native/Expo) chạy **local** trên máy dev:

```bash
cd frontend-app
npm install

# Start Expo dev server
npm start
```

Scan QR code bằng **Expo Go** app trên điện thoại để xem.

## Troubleshooting

### Backend không start được

```bash
# Check logs
docker logs backend

# Restart backend
docker compose restart backend
```

### Database connection error

```bash
# Check postgres đã chạy chưa
docker ps | grep postgres

# Check logs
docker logs postgres

# Restart postgres
docker compose restart postgres
```

### Port đã được sử dụng

Sửa ports trong file `.env`:
- `WEB_PORT=1116` → đổi sang port khác
- `API_PORT=8080` → đổi sang port khác
- `POSTGRES_PORT=5432` → đổi sang port khác

Sau đó restart:
```bash
docker compose down
docker compose up -d
```

## Development

### Hot Reload

- **Backend**: Code thay đổi tự động compile nhờ Spring Boot DevTools
- **Frontend Web**: Vite auto-reload khi save file
- **Mobile App**: Expo fast refresh

### Database Reset

```bash
# Xóa tất cả data và chạy lại migrations
docker compose down -v
docker compose up -d
```

---

Đơn giản vậy thôi! 🚀
