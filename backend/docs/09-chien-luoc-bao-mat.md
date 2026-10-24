# Chiến Lược Bảo Mật

**Hệ thống:** Quản Lý Tài Chính Cá Nhân với Trợ Lý AI  
**Phiên bản:** 2.1  
**Cập nhật:** 11/10/2026

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Row-Level Security (RLS)](#row-level-security-rls)
3. [Mã Hóa Dữ Liệu](#mã-hóa-dữ-liệu)
4. [Xác Thực & Phân Quyền](#xác-thực--phân-quyền)
5. [API Security](#api-security)
6. [Audit & Compliance](#audit--compliance)
7. [Data Masking](#data-masking)
8. [Backup & Recovery](#backup--recovery)

---

## Tổng Quan

### Nguyên Tắc Bảo Mật

1. **Defense in Depth:** Nhiều lớp bảo vệ
2. **Least Privilege:** Quyền tối thiểu cần thiết
3. **Zero Trust:** Xác thực mọi request
4. **Data Encryption:** Mã hóa at-rest và in-transit
5. **Audit Everything:** Log mọi hành động nhạy cảm

### Compliance

- **GDPR:** Quyền xóa dữ liệu, export dữ liệu
- **PCI DSS:** Không lưu thông tin thẻ đầy đủ (chỉ 4 số cuối)
- **SOC 2:** Audit logs, access controls

---

## Row-Level Security (RLS)

### Nguyên Tắc

Mọi query đều tự động lọc theo `user_id` - user chỉ thấy dữ liệu của mình.

### Implementation PostgreSQL

```sql
-- Bật RLS cho bảng
ALTER TABLE core.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ thấy giao dịch của mình
CREATE POLICY transactions_user_isolation ON core.transactions
FOR ALL
TO authenticated_user
USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Admin thấy tất cả
CREATE POLICY transactions_admin_access ON core.transactions
FOR ALL
TO admin_role
USING (true);
```

### Set User Context (Application)

```java
// Spring Boot - set user context mỗi request
@Component
public class UserContextFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) {
        User user = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        // Set PostgreSQL session variable
        jdbcTemplate.execute(
            "SET LOCAL app.current_user_id = '" + user.getId() + "'"
        );
        
        chain.doFilter(request, response);
    }
}
```

```python
# FastAPI - middleware
@app.middleware("http")
async def set_user_context(request: Request, call_next):
    user = request.state.user
    
    async with db.transaction():
        await db.execute(
            "SET LOCAL app.current_user_id = :user_id",
            {"user_id": str(user.id)}
        )
        response = await call_next(request)
    
    return response
```

### Áp Dụng RLS

**Bảng cần RLS:**
- ✅ `core.transactions` - giao dịch
- ✅ `core.accounts` - tài khoản
- ✅ `core.budgets` - ngân sách
- ✅ `core.goals` - mục tiêu
- ✅ `core.receipts` - hóa đơn
- ✅ `ai.*` - tất cả bảng AI liên quan user
- ❌ `core.currencies` - dữ liệu công khai
- ❌ `core.banks` - dữ liệu công khai

### Shared Resources (Nhóm)

```sql
-- Policy phức tạp hơn cho shared resources
CREATE POLICY transactions_shared_access ON core.transactions
FOR ALL
TO authenticated_user
USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR
    EXISTS (
        SELECT 1 FROM core.shared_resources sr
        JOIN core.group_members gm ON gm.group_id = sr.group_id
        WHERE sr.resource_type = 'transactions'
          AND sr.resource_id = core.transactions.id
          AND gm.user_id = current_setting('app.current_user_id')::UUID
    )
);
```

---

## Mã Hóa Dữ Liệu

### At-Rest Encryption

**PostgreSQL TDE (Transparent Data Encryption):**
```bash
# Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Mã hóa toàn bộ database
ALTER DATABASE finance_db SET ENCRYPTION TO 'AES256';
```

**Application-Level Encryption (Field-level):**
```sql
-- Mã hóa trường nhạy cảm
CREATE TABLE core.user_sensitive_data (
  user_id UUID PRIMARY KEY,
  ssn_encrypted BYTEA, -- Số CMND/CCCD
  bank_account_encrypted BYTEA, -- Số tài khoản ngân hàng
  encryption_key_id VARCHAR(50) NOT NULL -- Key ID từ KMS
);
```

```java
// Java encryption service
@Service
public class EncryptionService {
    
    @Autowired
    private KmsClient kmsClient;
    
    public String encrypt(String plaintext, String keyId) {
        EncryptRequest request = EncryptRequest.builder()
            .keyId(keyId)
            .plaintext(SdkBytes.fromUtf8String(plaintext))
            .build();
        
        EncryptResponse response = kmsClient.encrypt(request);
        return Base64.getEncoder().encodeToString(
            response.ciphertextBlob().asByteArray()
        );
    }
    
    public String decrypt(String ciphertext, String keyId) {
        DecryptRequest request = DecryptRequest.builder()
            .keyId(keyId)
            .ciphertextBlob(SdkBytes.fromByteArray(
                Base64.getDecoder().decode(ciphertext)
            ))
            .build();
        
        DecryptResponse response = kmsClient.decrypt(request);
        return response.plaintext().asUtf8String();
    }
}
```

### In-Transit Encryption

- **HTTPS Only:** TLS 1.3
- **Certificate Pinning:** Mobile app
- **HSTS:** Strict-Transport-Security header

```nginx
# Nginx config
server {
    listen 443 ssl http2;
    
    ssl_certificate /etc/ssl/certs/finance.crt;
    ssl_certificate_key /etc/ssl/private/finance.key;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Key Management

**AWS KMS / Azure Key Vault:**
- Master key trong KMS
- Data Encryption Keys (DEK) rotate hàng tháng
- Envelope encryption pattern

```
Plaintext → DEK (encrypt) → Ciphertext
DEK → Master Key (encrypt) → Encrypted DEK

Store: [Encrypted DEK, Ciphertext]
```

---

## Xác Thực & Phân Quyền

### JWT Token

**Structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1697000000,
  "exp": 1697086400
}
```

**Implementation:**
```java
@Service
public class JwtService {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration}")
    private Long expiration; // 15 minutes
    
    public String generateAccessToken(User user) {
        return Jwts.builder()
            .setSubject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(Keys.hmacShaKeyFor(secret.getBytes()), SignatureAlgorithm.HS512)
            .compact();
    }
    
    public String generateRefreshToken(User user) {
        String token = Jwts.builder()
            .setSubject(user.getId().toString())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + 30 * 24 * 60 * 60 * 1000)) // 30 days
            .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
            .compact();
        
        // Lưu vào DB để phát hiện token reuse
        refreshTokenRepository.save(new RefreshToken(
            user.getId(), 
            token, 
            Instant.now().plus(30, ChronoUnit.DAYS)
        ));
        
        return token;
    }
}
```

### Refresh Token Rotation

**Phát hiện token bị đánh cắp:**
```sql
-- Bảng core.refresh_tokens
CREATE TABLE core.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL, -- SHA256(token)
  device_id VARCHAR(255) NOT NULL,
  parent_token_hash VARCHAR(64) NULL, -- Token chain
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_refresh_tokens_hash ON core.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON core.refresh_tokens(user_id, is_revoked);
```

**Logic:**
```java
public TokenPair refreshAccessToken(String refreshToken) {
    String tokenHash = sha256(refreshToken);
    RefreshToken storedToken = repo.findByTokenHash(tokenHash)
        .orElseThrow(() -> new InvalidTokenException());
    
    // Check if revoked
    if (storedToken.isRevoked()) {
        // Token đã dùng rồi → có thể bị đánh cắp
        // Revoke toàn bộ token chain của user
        repo.revokeAllTokensForUser(storedToken.getUserId());
        auditLog.log(AuditAction.TOKEN_THEFT_DETECTED, storedToken.getUserId());
        throw new SecurityException("Token reuse detected");
    }
    
    // Check expiration
    if (storedToken.getExpiresAt().isBefore(Instant.now())) {
        throw new TokenExpiredException();
    }
    
    // Mark current token as revoked
    storedToken.setRevoked(true);
    storedToken.setRevokedAt(Instant.now());
    repo.save(storedToken);
    
    // Generate new pair
    User user = userService.findById(storedToken.getUserId());
    String newAccessToken = jwtService.generateAccessToken(user);
    String newRefreshToken = jwtService.generateRefreshToken(user);
    
    // Save new refresh token with parent link
    repo.save(new RefreshToken(
        user.getId(),
        sha256(newRefreshToken),
        storedToken.getDeviceId(),
        tokenHash, // parent
        Instant.now().plus(30, ChronoUnit.DAYS)
    ));
    
    return new TokenPair(newAccessToken, newRefreshToken);
}
```

### MFA (Two-Factor Authentication)

**TOTP (Time-based One-Time Password):**
```java
@Service
public class MfaService {
    
    public String generateSecret(User user) {
        String secret = new SecureRandom().ints(20, 0, 32)
            .mapToObj(i -> "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".charAt(i))
            .map(String::valueOf)
            .collect(Collectors.joining());
        
        // Lưu vào DB mã hóa
        mfaCredentialRepository.save(new MfaCredential(
            user.getId(),
            MfaMethod.TOTP,
            encryptionService.encrypt(secret, user.getEncryptionKeyId()),
            false // chưa xác thực
        ));
        
        return secret;
    }
    
    public boolean verifyTotp(User user, String code) {
        MfaCredential credential = mfaCredentialRepository.findByUserId(user.getId())
            .orElseThrow(() -> new MfaNotSetupException());
        
        String secret = encryptionService.decrypt(
            credential.getSecretEncrypted(),
            user.getEncryptionKeyId()
        );
        
        Totp totp = new Totp(secret);
        boolean valid = totp.verify(code);
        
        if (valid) {
            credential.setLastUsedAt(Instant.now());
            mfaCredentialRepository.save(credential);
        }
        
        return valid;
    }
    
    public List<String> generateBackupCodes(User user) {
        List<String> codes = new ArrayList<>();
        SecureRandom random = new SecureRandom();
        
        for (int i = 0; i < 10; i++) {
            String code = String.format("%08d", random.nextInt(100000000));
            codes.add(code);
            
            // Lưu hash vào DB
            backupCodeRepository.save(new BackupCode(
                user.getId(),
                BCrypt.hashpw(code, BCrypt.gensalt()),
                false
            ));
        }
        
        return codes;
    }
}
```

### Role-Based Access Control (RBAC)

**Roles:**
- `USER`: Người dùng thường
- `PREMIUM_USER`: Người dùng trả phí
- `GROUP_ADMIN`: Quản trị viên nhóm
- `ADMIN`: Quản trị viên hệ thống

**Permissions:**
```java
@PreAuthorize("hasRole('USER')")
@GetMapping("/transactions")
public List<Transaction> getTransactions() { ... }

@PreAuthorize("hasRole('PREMIUM_USER')")
@GetMapping("/ai/advanced-insights")
public List<Insight> getAdvancedInsights() { ... }

@PreAuthorize("hasRole('ADMIN')")
@GetMapping("/admin/users")
public List<User> getAllUsers() { ... }
```

---

## API Security

### Rate Limiting

**Strategy: Token Bucket**
```python
from fastapi import Request
from fastapi.responses import JSONResponse
import redis

redis_client = redis.Redis(host='localhost', port=6379)

async def rate_limit_middleware(request: Request, call_next):
    user_id = request.state.user.id
    endpoint = request.url.path
    key = f"rate_limit:{user_id}:{endpoint}"
    
    # Token bucket algorithm
    limit = 100  # requests
    window = 60  # seconds
    
    current = redis_client.get(key)
    
    if current is None:
        redis_client.setex(key, window, 1)
        return await call_next(request)
    
    if int(current) >= limit:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(window)
            }
        )
    
    redis_client.incr(key)
    remaining = limit - int(redis_client.get(key))
    
    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    
    return response
```

### Input Validation

```java
// DTO with validation
public class CreateTransactionDto {
    
    @NotNull(message = "Account ID is required")
    private UUID accountId;
    
    @NotNull
    @DecimalMin(value = "0.01", message = "Amount must be positive")
    @DecimalMax(value = "999999999.99", message = "Amount too large")
    private BigDecimal amount;
    
    @NotBlank
    @Size(max = 500, message = "Description too long")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\p{P}\\p{Z}]+$", message = "Invalid characters")
    private String description;
    
    @NotNull
    @PastOrPresent(message = "Date cannot be in future")
    private LocalDate transactionDate;
}

// Controller
@PostMapping("/transactions")
public Transaction createTransaction(@Valid @RequestBody CreateTransactionDto dto) {
    // @Valid tự động validate
    return transactionService.create(dto);
}
```

### SQL Injection Prevention

**Luôn dùng Parameterized Queries:**
```java
// ✅ GOOD
String sql = "SELECT * FROM transactions WHERE user_id = ? AND amount > ?";
jdbcTemplate.query(sql, new Object[]{userId, minAmount}, rowMapper);

// ❌ BAD
String sql = "SELECT * FROM transactions WHERE user_id = '" + userId + "'";
jdbcTemplate.query(sql, rowMapper);
```

### CORS Configuration

```java
@Configuration
public class SecurityConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowedOrigins(Arrays.asList(
            "https://finance-app.com",
            "https://app.finance-app.com"
        ));
        
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        
        return source;
    }
}
```

### Content Security Policy

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers()
            .contentSecurityPolicy(
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self'; " +
                "connect-src 'self' https://api.finance-app.com; " +
                "frame-ancestors 'none';"
            )
        .and()
            .xssProtection()
        .and()
            .frameOptions().deny();
    
    return http.build();
}
```

---

## Audit & Compliance

### Audit Logging

**Automatic trigger:**
```sql
CREATE OR REPLACE FUNCTION audit_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ops.audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        changes,
        ip_address
    ) VALUES (
        NEW.user_id,
        TG_OP,
        'transactions',
        NEW.id,
        jsonb_build_object(
            'before', to_jsonb(OLD),
            'after', to_jsonb(NEW)
        ),
        current_setting('app.client_ip', true)::INET
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_transactions_changes
AFTER INSERT OR UPDATE OR DELETE ON core.transactions
FOR EACH ROW EXECUTE FUNCTION audit_transaction_changes();
```

### GDPR Compliance

**Right to be Forgotten:**
```java
@Transactional
public void deleteUserData(UUID userId) {
    // 1. Export data first (for user download)
    exportUserData(userId);
    
    // 2. Anonymize audit logs
    auditLogRepository.anonymizeUser(userId);
    
    // 3. Delete user data
    transactionRepository.deleteByUserId(userId);
    accountRepository.deleteByUserId(userId);
    // ... other tables
    
    // 4. Delete user account
    userRepository.delete(userId);
    
    // 5. Log deletion
    complianceLog.log(ComplianceEvent.USER_DATA_DELETED, userId);
}
```

**Data Export (GDPR Article 20):**
```java
public byte[] exportUserData(UUID userId) {
    Map<String, Object> data = new HashMap<>();
    
    data.put("user", userRepository.findById(userId));
    data.put("transactions", transactionRepository.findByUserId(userId));
    data.put("accounts", accountRepository.findByUserId(userId));
    data.put("budgets", budgetRepository.findByUserId(userId));
    data.put("goals", goalRepository.findByUserId(userId));
    
    // Convert to JSON
    String json = objectMapper.writeValueAsString(data);
    
    // Return as ZIP
    return createZip("user_data.json", json.getBytes());
}
```

---

## Data Masking

### PII Masking in Logs

```java
@Component
public class LogMaskingConverter extends ClassicConverter {
    
    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");
    
    private static final Pattern PHONE_PATTERN = 
        Pattern.compile("(\\d{3})[-.\\s]?(\\d{3})[-.\\s]?(\\d{4})");
    
    @Override
    public String convert(ILoggingEvent event) {
        String message = event.getFormattedMessage();
        
        // Mask email: user@example.com → u***@example.com
        message = EMAIL_PATTERN.matcher(message).replaceAll(
            m -> m.group(1).charAt(0) + "***@" + m.group(2)
        );
        
        // Mask phone: 0123456789 → 012***6789
        message = PHONE_PATTERN.matcher(message).replaceAll(
            m -> m.group(1) + "***" + m.group(3)
        );
        
        return message;
    }
}
```

### Database Views for Analysts

```sql
-- View với dữ liệu đã mask cho team analytics
CREATE VIEW analytics.transactions_masked AS
SELECT 
  id,
  user_id,
  account_id,
  category_id,
  amount,
  currency_code,
  transaction_type,
  transaction_date,
  -- Mask description
  CASE 
    WHEN description IS NOT NULL 
    THEN regexp_replace(description, '[a-zA-Z0-9]', '*', 'g')
    ELSE NULL
  END as description,
  created_at
FROM core.transactions
WHERE deleted_at IS NULL;

-- Grant access
GRANT SELECT ON analytics.transactions_masked TO analyst_role;
```

---

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# Daily backup script

DB_NAME="finance_db"
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="$BACKUP_DIR/${DB_NAME}_$DATE.sql.gz"

# Backup with pg_dump
pg_dump -h localhost -U postgres -d $DB_NAME | gzip > $FILENAME

# Encrypt backup
gpg --encrypt --recipient admin@finance-app.com $FILENAME

# Upload to S3
aws s3 cp ${FILENAME}.gpg s3://finance-backups/daily/

# Delete local backup older than 7 days
find $BACKUP_DIR -name "*.sql.gz*" -mtime +7 -delete

# Verify backup integrity
gunzip -t $FILENAME
```

**Backup Schedule:**
- **Daily:** Full backup lúc 2am
- **Hourly:** Incremental backup (WAL archiving)
- **Retention:** 30 ngày online, 1 năm offline (S3 Glacier)

### Point-in-Time Recovery (PITR)

```sql
-- Enable WAL archiving
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://finance-wal-archive/%f'

-- Restore to specific time
-- 1. Stop PostgreSQL
systemctl stop postgresql

-- 2. Restore base backup
rm -rf /var/lib/postgresql/14/main
tar -xzf /backups/base_backup.tar.gz -C /var/lib/postgresql/14/main

-- 3. Create recovery.conf
cat > /var/lib/postgresql/14/main/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://finance-wal-archive/%f %p'
recovery_target_time = '2026-10-10 14:30:00'
recovery_target_action = 'promote'
EOF

-- 4. Start PostgreSQL
systemctl start postgresql
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** < 4 giờ  
**RPO (Recovery Point Objective):** < 1 giờ

**Procedures:**
1. Activate DR site (AWS Multi-AZ)
2. Restore latest backup
3. Apply WAL logs
4. Update DNS (Route53 failover)
5. Verify data integrity
6. Notify users

---

## Security Checklist

### Development
- [ ] Dùng parameterized queries (không string concatenation)
- [ ] Validate input ở mọi endpoint
- [ ] Sanitize output (XSS prevention)
- [ ] Hash passwords với bcrypt/argon2
- [ ] Không commit secrets vào Git
- [ ] Review dependencies (CVE scanning)

### Deployment
- [ ] HTTPS only (TLS 1.3)
- [ ] RLS enabled trên production
- [ ] JWT secret strong và rotate định kỳ
- [ ] Rate limiting enabled
- [ ] WAF (Web Application Firewall) configured
- [ ] Database backups automated

### Operations
- [ ] Monitor audit logs hàng ngày
- [ ] Security patch updates monthly
- [ ] Penetration testing yearly
- [ ] Employee security training
- [ ] Incident response plan documented
- [ ] Data breach procedures tested

---

## Liên Kết

- ← [08. Chiến Lược Đồng Bộ](08-chien-luoc-dong-bo.md)
- → [02. Tổng Quan Cơ Sở Dữ Liệu](02-tong-quan-co-so-du-lieu.md)
- → [10. ERD & Sơ Đồ Quan Hệ](10-erd-so-do-quan-he.md)
