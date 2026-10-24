# Finance Management System

## Quick Start

```bash
# Start tất cả
docker compose up -d --build

# Stop
docker compose down
```

## Services

- **Backend API**: http://localhost:8080
- **Frontend Web**: http://localhost:3000 (Admin Dashboard)
- **Nginx**: http://localhost:1116
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Frontend Mobile App

Frontend app (React Native/Expo) chạy **local**:

```bash
cd frontend-app
npm install
npm start
```

Scan QR code bằng Expo Go để xem trên điện thoại.

## Database

Database tự động khởi tạo khi start lần đầu (58 tables).

---

Đơn giản vậy thôi! 🚀
