# 05 — Security audit

## Điểm tốt đã xác minh

- JWT filter lấy principal từ subject và reload user; endpoint thường dùng `@AuthenticationPrincipal`.
- AI 2–5 bỏ qua user_id client, lấy identity từ JWT; Python direct/service-secret sai bị 401 trong E2E cô lập.
- Nginx chặn `/api/internal/**` từ ngoài; internal FinAI tool verify signed context token.
- DB/Redis/Python/Spring không publish port host trong Compose.
- `.env` không được Git track; file example dùng placeholder.

## Finding SEC-001 — IDOR/public access file chat nhóm

- **Severity:** HIGH
- **Module:** Group attachment
- **File và line:** [SecurityConfig.java:61](../../backend/src/main/java/com/finance/finance/common/config/SecurityConfig.java), [GroupController.java:431](../../backend/src/main/java/com/finance/finance/modules/group/controller/GroupController.java), [GroupMessageService.java:444](../../backend/src/main/java/com/finance/finance/modules/group/service/GroupMessageService.java)
- **Bằng chứng:** download `permitAll`, chỉ nhận filename; không kiểm group/message/member. Path traversal được làm sạch nhưng ownership không có.
- **Tái hiện:** lấy URL file từ một session/member, mở incognito không JWT.
- **Expected:** chỉ member hợp lệ hoặc signed URL ngắn hạn tải được.
- **Actual:** ai biết filename đều tải được.
- **Root cause:** authorization bị tách khỏi resource identifier.
- **Recommended fix:** endpoint theo group/message/attachment ID và kiểm membership; hoặc signed URL có expiry.
- **Regression test:** no-token, non-member, former-member, member, traversal.

## Finding SEC-002 — Upload chấp nhận content tùy ý và size quá lớn

- **Severity:** HIGH
- **Module:** User/Transaction/Group uploads
- **File và line:** [UserService.java:33](../../backend/src/main/java/com/finance/finance/modules/user/service/UserService.java), [TransactionService.java:1338](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [GroupMessageService.java:81](../../backend/src/main/java/com/finance/finance/modules/group/service/GroupMessageService.java)
- **Bằng chứng:** avatar chỉ kiểm extension và cho 100 MB; transaction/group giữ extension tùy ý; group không giới hạn size; không magic-byte scan.
- **Tái hiện:** upload text/HTML/script đổi đuôi ảnh hoặc file gần 100 MB; truy cập qua `/uploads`.
- **Expected:** allowlist MIME + magic bytes, size nhỏ hợp lý, random server filename, download headers an toàn.
- **Actual:** extension/MIME do client kiểm soát; public same-origin storage.
- **Root cause:** validation chỉ dựa metadata multipart.
- **Recommended fix:** central upload policy, decode/re-encode ảnh, antivirus nếu cần, `Content-Disposition: attachment`, CSP.
- **Regression test:** polyglot, HTML, double extension, oversized, malformed image, auth download.

## Finding SEC-003 — JWT issuer được phát hành nhưng không được yêu cầu khi verify

- **Severity:** MEDIUM
- **Module:** Authentication
- **File và line:** [JwtTokenProvider.java:48](../../backend/src/main/java/com/finance/finance/common/security/JwtTokenProvider.java), [JwtTokenProvider.java:86](../../backend/src/main/java/com/finance/finance/common/security/JwtTokenProvider.java)
- **Bằng chứng:** generation set `.issuer(issuer)`; parser chỉ `verifyWith(secretKey)` và parse, không `requireIssuer`; không audience.
- **Tái hiện:** ký token bằng cùng key nhưng issuer khác/thiếu.
- **Expected:** reject token ngoài issuer/audience/token type.
- **Actual:** token có signature/expiry hợp lệ được chấp nhận.
- **Root cause:** claim validation chưa đầy đủ.
- **Recommended fix:** require issuer; cân nhắc audience và token type; rotate secret nếu từng chia sẻ.
- **Regression test:** wrong/missing issuer, access-vs-refresh token, expired, altered signature.

## Finding SEC-004 — CORS property bị bỏ qua

- **Severity:** MEDIUM
- **Module:** Spring security
- **File và line:** [SecurityConfig.java:40](../../backend/src/main/java/com/finance/finance/common/config/SecurityConfig.java), [SecurityConfig.java:79](../../backend/src/main/java/com/finance/finance/common/config/SecurityConfig.java)
- **Bằng chứng:** inject `app.security.allowed-origins` nhưng bean dùng hardcoded ngrok/IP/domain patterns; credentials bật và headers `*`.
- **Tái hiện:** đổi env allowed origins rồi OPTIONS từ origin hardcoded.
- **Expected:** env là nguồn cấu hình; staging/prod allowlist tối thiểu.
- **Actual:** env không tác dụng.
- **Root cause:** refactor cấu hình chưa hoàn tất.
- **Recommended fix:** parse property, profile-specific allowlist; không wildcard không cần thiết.
- **Regression test:** allowed/disallowed preflight trên từng profile.

## Finding SEC-005 — Global exception biến 404 static thành 500

- **Severity:** MEDIUM
- **Module:** Error handling / information & availability
- **File và line:** [GlobalExceptionHandler.java](../../backend/src/main/java/com/finance/finance/common/exception/GlobalExceptionHandler.java)
- **Bằng chứng:** runtime `/uploads/audit-missing.txt` và `/api/v1/health` ném `NoResourceFoundException`, handler trả 500 và log full stack.
- **Tái hiện:** curl hai URL không tồn tại.
- **Expected:** 404 không tạo error log lớn.
- **Actual:** 500 + stack trace, dễ gây log amplification.
- **Root cause:** thiếu handler chuyên biệt trước catch-all.
- **Recommended fix:** map `NoResourceFoundException` 404, giảm log level.
- **Regression test:** unknown API/static route trả 404 contract.
