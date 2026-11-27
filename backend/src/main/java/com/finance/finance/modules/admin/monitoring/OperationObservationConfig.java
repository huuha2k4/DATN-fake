package com.finance.finance.modules.admin.monitoring;

import com.finance.finance.modules.analytics.controller.AiAnalyticsController;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import com.finance.finance.modules.finai.controller.FinAiController;
import com.finance.finance.modules.ocr.controller.OcrController;
import com.finance.finance.modules.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class OperationObservationConfig implements WebMvcConfigurer {
    private final OperationMetricWriter writer;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new Observer(writer));
    }

    private record Observer(OperationMetricWriter writer) implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            if (!(handler instanceof HandlerMethod method)) return true;
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof User user)) return true;
            String operation = operation(method);
            if (operation == null) return true;
            var audit = AuditContextHolder.get();
            String requestId = audit == null ? null : audit.getRequestId();
            if (requestId == null || !requestId.matches("[A-Za-z0-9_-]{1,64}")) requestId = UUID.randomUUID().toString();
            RequestObservation.CURRENT.set(new RequestObservation(operation, requestId, user.getId()));
            if (operation.equals("OCR_SCAN")) RequestObservation.businessRequest(request.getHeader("Idempotency-Key"));
            return true;
        }

        @Override
        public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                    Object handler, Exception exception) {
            var sample = RequestObservation.CURRENT.get();
            RequestObservation.CURRENT.remove();
            int status = response.getStatus();
            if (sample != null && (sample.entered || status == 400) && status != 401 && status != 403) {
                writer.submit(sample, exception == null ? status : 500);
            }
        }

        private static String operation(HandlerMethod method) {
            String name = method.getMethod().getName();
            if (FinAiController.class.isAssignableFrom(method.getBeanType())) {
                return "chat".equals(name) ? "FINAI_ASSISTANT" : null;
            }
            if (OcrController.class.isAssignableFrom(method.getBeanType())) {
                return switch (name) {
                    case "scanReceipt" -> "OCR_SCAN";
                    case "createTransactionFromOcr" -> "OCR_TRANSACTION";
                    default -> null;
                };
            }
            if (AiAnalyticsController.class.isAssignableFrom(method.getBeanType())) {
                return switch (name) {
                    case "balance" -> "AI_BALANCE_FORECAST";
                    case "spending", "category", "categories", "goals" -> "AI_FINANCIAL_FORECAST";
                    case "anomalies", "check" -> "AI_ANOMALY";
                    case "behavior" -> "AI_BEHAVIOR";
                    case "recommendations" -> "AI_RECOMMENDATIONS";
                    default -> null;
                };
            }
            return null;
        }
    }
}
