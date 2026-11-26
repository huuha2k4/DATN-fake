package com.finance.finance.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.modules.audit.context.AuditContext;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private Instant timestamp;
    private Integer status;
    private String error;
    private String message;
    private String errorCode;
    @Builder.Default
    private String requestId = currentRequestId();
    private Integer retryAfterSeconds;
    private Map<String, String> validationErrors;
    private String path;

    private static String currentRequestId() {
        AuditContext context = AuditContextHolder.get();
        return context == null ? null : context.getRequestId();
    }
}
