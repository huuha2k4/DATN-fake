package com.finance.finance.common.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.annotation.Idempotent;
import com.finance.finance.common.service.IdempotencyService;
import com.finance.finance.common.service.IdempotencyService.IdempotencyConflictException;
import com.finance.finance.common.service.IdempotencyService.IdempotencyKeyMismatchException;
import com.finance.finance.modules.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;
import java.util.UUID;

/**
 * Aspect to handle idempotency for annotated endpoints
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class IdempotencyAspect {

    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

    @Around("@annotation(idempotent)")
    public Object handleIdempotency(ProceedingJoinPoint joinPoint, Idempotent idempotent) throws Throwable {
        
        // Get request context
        ServletRequestAttributes attributes = 
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        
        if (attributes == null) {
            log.warn("No request context available, skipping idempotency check");
            return joinPoint.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        String idempotencyKey = request.getHeader(IDEMPOTENCY_KEY_HEADER);

        // If no idempotency key provided, proceed normally
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            log.debug("No idempotency key provided for {}", request.getRequestURI());
            return joinPoint.proceed();
        }

        // Get current user
        UUID userId = getCurrentUserId();
        if (userId == null) {
            log.warn("No authenticated user, skipping idempotency check");
            return joinPoint.proceed();
        }

        String endpoint = request.getRequestURI();
        String httpMethod = request.getMethod();
        String requestBody = extractRequestBody(joinPoint);

        try {
            // Check if request already processed
            Optional<IdempotencyService.IdempotencyResult> cached = 
                    idempotencyService.check(idempotencyKey, userId, endpoint, httpMethod, requestBody);

            if (cached.isPresent()) {
                // Return cached response
                IdempotencyService.IdempotencyResult result = cached.get();
                log.info("Returning cached response for idempotency key: {}", idempotencyKey);
                
                Object responseBody = objectMapper.readValue(result.getResponseBody(), Object.class);
                return ResponseEntity.status(result.getStatusCode()).body(responseBody);
            }

            // Proceed with actual request processing
            Object response = joinPoint.proceed();

            // Save result for future duplicate requests
            if (response instanceof ResponseEntity<?> responseEntity) {
                int statusCode = responseEntity.getStatusCode().value();
                Object body = responseEntity.getBody();
                
                // Extract resource ID and type from response
                UUID resourceId = extractResourceId(body);
                String resourceType = idempotent.resourceType().isEmpty() 
                        ? extractResourceType(body) 
                        : idempotent.resourceType();

                idempotencyService.saveResult(
                        idempotencyKey, 
                        userId, 
                        body, 
                        statusCode, 
                        resourceId, 
                        resourceType
                );
            }

            return response;

        } catch (IdempotencyKeyMismatchException e) {
            // Key reused with different request body
            log.error("Idempotency key mismatch: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ErrorResponse("IDEMPOTENCY_KEY_MISMATCH", e.getMessage()));

        } catch (IdempotencyConflictException e) {
            // Request already in progress
            log.warn("Idempotency conflict: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .header("Retry-After", "3") // Retry after 3 seconds
                    .body(new ErrorResponse("IDEMPOTENCY_CONFLICT", e.getMessage()));

        } catch (Exception e) {
            // Mark as failed and rethrow
            log.error("Error during idempotent request processing", e);
            idempotencyService.markFailed(idempotencyKey, userId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get current authenticated user ID
     */
    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }

    /**
     * Extract request body from method arguments
     */
    private String extractRequestBody(ProceedingJoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            // Skip primitives, strings, and Spring framework objects
            if (arg != null && 
                !arg.getClass().isPrimitive() &&
                !arg.getClass().getName().startsWith("java.") &&
                !arg.getClass().getName().startsWith("org.springframework.") &&
                !arg.getClass().getName().startsWith("jakarta.servlet.")) {
                
                try {
                    return objectMapper.writeValueAsString(arg);
                } catch (Exception e) {
                    log.warn("Failed to serialize request body", e);
                }
            }
        }
        return null;
    }

    /**
     * Extract resource ID from response body
     */
    private UUID extractResourceId(Object body) {
        if (body == null) return null;
        
        try {
            // Try to get 'id' field via reflection
            var idField = body.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            Object id = idField.get(body);
            
            if (id instanceof UUID) {
                return (UUID) id;
            } else if (id instanceof String) {
                return UUID.fromString((String) id);
            }
        } catch (Exception e) {
            // Ignore - field may not exist
        }
        
        return null;
    }

    /**
     * Extract resource type from response body class name
     */
    private String extractResourceType(Object body) {
        if (body == null) return "unknown";
        
        String className = body.getClass().getSimpleName();
        // Convert TransactionResponse -> transaction
        return className.replace("Response", "").toLowerCase();
    }

    /**
     * Error response DTO
     */
    private record ErrorResponse(String code, String message) {}
}
