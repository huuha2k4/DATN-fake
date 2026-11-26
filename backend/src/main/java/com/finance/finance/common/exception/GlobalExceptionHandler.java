package com.finance.finance.common.exception;

import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditFailurePolicy;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSeverity;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.notification.exception.NotificationNotFoundException;
import com.finance.finance.common.service.IdempotencyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Autowired(required = false)
    private SystemAuditService systemAuditService;
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        log.error("Business exception: {}", ex.getMessage());
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(ex.getStatus().value())
                .error(ex.getStatus().getReasonPhrase())
                .message(ex.getMessage())
                .errorCode(ex.getErrorCode())
                .retryAfterSeconds(ex.getRetryAfterSeconds())
                .build();
        ResponseEntity.BodyBuilder response = ResponseEntity.status(ex.getStatus());
        if (ex.getRetryAfterSeconds() != null) {
            response.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()));
        }
        return response.body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("Dữ liệu không hợp lệ")
                .errorCode(aiCode("INVALID_REQUEST", "VALIDATION_ERROR"))
                .validationErrors(errors)
                .build();
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(BadCredentialsException ex) {
        log.error("Bad credentials: {}", ex.getMessage());
        recordSecurityAudit(AuditEventType.AUTH_LOGIN_FAILURE, AuditOutcome.FAILURE, AuditSeverity.WARNING, "INVALID_CREDENTIALS");
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Unauthorized")
                .message("Email hoặc mật khẩu không đúng")
                .errorCode("INVALID_CREDENTIALS")
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
    
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        log.error("Authentication failed: {}", ex.getMessage());
        recordSecurityAudit(AuditEventType.AUTH_LOGIN_FAILURE, AuditOutcome.FAILURE, AuditSeverity.WARNING, "AUTHENTICATION_FAILED");
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Unauthorized")
                .message("Xác thực thất bại")
                .errorCode(aiCode("AUTHENTICATION_ERROR", "AUTHENTICATION_FAILED"))
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        log.error("Access denied: {}", ex.getMessage());
        recordSecurityAudit(AuditEventType.ACCESS_DENIED, AuditOutcome.DENIED, AuditSeverity.HIGH, "ACCESS_DENIED");
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("Bạn không có quyền truy cập tài nguyên này")
                .errorCode(aiCode("AUTHORIZATION_ERROR", "ACCESS_DENIED"))
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Several legacy domain services use {@link SecurityException} for
     * authorization failures. Treat those as denials instead of allowing them
     * to fall through to the generic 500 handler.
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(SecurityException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        recordSecurityAudit(AuditEventType.ACCESS_DENIED, AuditOutcome.DENIED, AuditSeverity.HIGH, "SECURITY_EXCEPTION");
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("Bạn không có quyền truy cập tài nguyên này")
                .errorCode(aiCode("AUTHORIZATION_ERROR", "ACCESS_DENIED"))
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }
    
    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotificationNotFoundException(NotificationNotFoundException ex) {
        log.error("Notification not found: {}", ex.getMessage());
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Not Found")
                .message(ex.getMessage())
                .errorCode("NOTIFICATION_NOT_FOUND")
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    /**
     * Service-layer argument checks are expected business errors, not server
     * failures. This preserves their message for the client.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Invalid request: {}", ex.getMessage());
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(ex.getMessage())
                .errorCode("INVALID_REQUEST")
                .build();
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleMalformedRequest(Exception error) {
        if (!isAiRequest()) return handleGlobalException(error);
        return ResponseEntity.badRequest().body(ErrorResponse.builder()
                .timestamp(Instant.now()).status(HttpStatus.BAD_REQUEST.value()).error("Bad Request")
                .errorCode("INVALID_REQUEST").message("Dữ liệu gửi đến FinAI không hợp lệ.").build());
    }

    @ExceptionHandler(IdempotencyService.IdempotencyConflictException.class)
    public ResponseEntity<ErrorResponse> handleIdempotencyConflict(IdempotencyService.IdempotencyConflictException ex) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now()).status(HttpStatus.CONFLICT.value()).error("Conflict")
                .message("Yêu cầu FinAI này đang được xử lý.").errorCode("AI_REQUEST_IN_PROGRESS").build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(IdempotencyService.IdempotencyKeyMismatchException.class)
    public ResponseEntity<ErrorResponse> handleIdempotencyMismatch(IdempotencyService.IdempotencyKeyMismatchException ex) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now()).status(HttpStatus.BAD_REQUEST.value()).error("Bad Request")
                .message("Mã yêu cầu đã được dùng cho nội dung khác.").errorCode("INVALID_REQUEST").build();
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFoundException(NoResourceFoundException ex) {
        log.warn("Resource not found: {}", ex.getResourcePath());
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Not Found")
                .message("Tài nguyên không tồn tại")
                .errorCode("RESOURCE_NOT_FOUND")
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex) {
        log.error("Unexpected error: ", ex);
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("Đã xảy ra lỗi không mong muốn")
                .errorCode(aiCode("AI_INTERNAL_ERROR", "INTERNAL_ERROR"))
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private static String aiCode(String aiCode, String defaultCode) {
        return isAiRequest() ? aiCode : defaultCode;
    }

    private static boolean isAiRequest() {
        var context = com.finance.finance.modules.audit.context.AuditContextHolder.get();
        return context != null && com.finance.finance.common.config.SecurityConfig.isAiEndpoint(context.getEndpoint());
    }

    private void recordSecurityAudit(AuditEventType eventType, AuditOutcome outcome, AuditSeverity severity, String reasonCode) {
        if (systemAuditService == null) {
            return;
        }
        try {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(eventType)
                    .outcome(outcome)
                    .severity(severity)
                    .reasonCode(reasonCode)
                    .errorCode(reasonCode)
                    .policyOverride(AuditFailurePolicy.MANDATORY_REQUIRES_NEW)
                    .build());
        } catch (Exception auditEx) {
            log.error("Failed to record security audit event {}: {}", eventType, auditEx.getMessage());
        }
    }
}
