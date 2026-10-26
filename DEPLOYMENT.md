# Production Deployment Guide

## 🚀 Quick Deploy

### Prerequisites
- Docker & Docker Compose installed on server
- Domain name pointing to server (optional, for HTTPS)
- Open ports: 80 (HTTP), 443 (HTTPS - optional)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd DATN
```

### Step 2: Setup Environment
```bash
# Copy production env template
cp .env.production.example .env.production

# Edit with secure values
nano .env.production
```

**Important values to change:**
- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `SUPER_ADMIN_PASSWORD` - Strong admin password
- `WEB_PORT` - Usually 80 for production

### Step 3: Deploy
```bash
# Build and start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Check status
docker ps

# View logs
docker logs backend -f
```

### Step 4: Verify
```bash
# Check if all containers are running
docker ps

# Expected output: 5 containers
# - nginx (port 80 exposed)
# - backend
# - frontend-web
# - postgres
# - redis

# Test the application
curl http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!","fullName":"Test"}'
```

## 🔒 Security Checklist

### ✅ Network Security
- [x] Chỉ nginx expose port ra ngoài
- [x] Backend, database, redis chỉ internal network
- [ ] Setup firewall (ufw/firewalld)
- [ ] Enable HTTPS/SSL

### ✅ Database Security
- [x] Strong database password
- [x] Database không expose ra internet
- [ ] Regular backups
- [ ] Backup encryption

### ✅ Application Security
- [x] Unique JWT secret per environment
- [x] Strong admin password
- [x] Timezone configured (Asia/Ho_Chi_Minh)
- [ ] Rate limiting
- [ ] Security headers

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Check logs
docker logs backend --tail 100
```

### Database Backup
```bash
# Backup database
docker exec postgres pg_dump -U postgres finance_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i postgres psql -U postgres finance_db < backup_20260101.sql
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs backend -f
docker logs nginx -f
docker logs postgres -f
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

## 🌐 HTTPS Setup (Optional but Recommended)

### Using Let's Encrypt
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx folder
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
```

Update `docker-compose.prod.yml` nginx section:
```yaml
nginx:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

Update `nginx.conf` to enable HTTPS (see nginx documentation).

## 📊 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost/api/v1/actuator/health

# Check all containers health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Database Connection
```bash
# Connect to database
docker exec -it postgres psql -U postgres -d finance_db

# Check migrations
docker exec postgres psql -U postgres -d finance_db \
  -c "SELECT version, description, installed_on FROM core.flyway_schema_history ORDER BY installed_rank DESC LIMIT 10"
```

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs backend --tail 100

# Common issues:
# - Database not ready → wait 30s
# - Migration failed → check migration logs
# - Port conflict → check WEB_PORT in .env
```

### Database connection error
```bash
# Check postgres is running
docker ps | grep postgres

# Check postgres logs
docker logs postgres --tail 50

# Test connection
docker exec postgres psql -U postgres -d finance_db -c "SELECT 1"
```

### Port already in use
```bash
# Check what's using port 80
sudo lsof -i :80

# Change WEB_PORT in .env.production
WEB_PORT=8080
```

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `MyS3cur3P@ssw0rd` |
| `JWT_SECRET` | JWT signing key | (64-char base64) |
| `SUPER_ADMIN_PASSWORD` | Admin account password | `Adm!n123` |
| `WEB_PORT` | Public nginx port | `80` or `443` |
| `COMPOSE_PROJECT_NAME` | Docker project name | `finance_app` |

## 🎯 Production Architecture

```
                    Internet
                        │
                        ▼
                   ┌─────────┐
                   │  Nginx  │ :80 (Public)
                   │ (Proxy) │
                   └────┬────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌──────────┐   ┌─────────┐
    │Backend │    │Frontend  │   │ Static  │
    │ :8080  │    │  :5173   │   │  Files  │
    └───┬────┘    └──────────┘   └─────────┘
        │              Internal Network
        ├─────────────┬────────────┐
        ▼             ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │Postgres │  │  Redis  │  │ Uploads  │
   │  :5432  │  │  :6379  │  │ Volume   │
   └─────────┘  └─────────┘  └──────────┘
```

**Security Notes:**
- ✅ Only nginx accepts external connections
- ✅ All other services communicate via internal Docker network
- ✅ Database & Redis not accessible from internet
- ✅ Secrets stored in .env (not committed to git)

## 📦 Migration Management

Current migrations: **V1 - V12**

### Check migration status
```bash
docker exec postgres psql -U postgres -d finance_db \
  -c "SELECT version, description, installed_on FROM core.flyway_schema_history ORDER BY installed_rank"
```

### Expected migrations:
1. V1: init schema (49 tables)
2. V2-V9: Schema fixes
3. V10: Fix entity schema mismatches (consolidated)
4. V11: Fix transactions enum types
5. V12: Fix transactions source enum

All migrations run automatically on backend startup via Flyway.

---

**Need help?** Check logs first: `docker logs backend -f`
