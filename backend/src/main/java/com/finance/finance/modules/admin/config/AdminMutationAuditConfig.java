package com.finance.finance.modules.admin.config;

import com.finance.finance.modules.admin.controller.AdminController;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSource;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class AdminMutationAuditConfig implements WebMvcConfigurer {
    private final SystemAuditService audit;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                        Object handler, Exception exception) {
                if (!(handler instanceof HandlerMethod method)
                        || !AdminController.class.isAssignableFrom(method.getBeanType())
                        || !Set.of("POST", "PUT", "PATCH", "DELETE").contains(request.getMethod())
                        || (exception == null && response.getStatus() < 400)) {
                    return;
                }
                Object attributes = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
                Map<?, ?> variables = attributes instanceof Map<?, ?> map ? map : Map.of();
                UUID subject = uuid(variables.get("userId"));
                UUID resource = variables.values().stream().map(AdminMutationAuditConfig::uuid)
                        .filter(java.util.Objects::nonNull).findFirst().orElse(null);
                audit.record(AuditEventRequest.builder().eventType(AuditEventType.ADMIN_RESOURCE_MUTATION)
                        .outcome(response.getStatus() == 401 || response.getStatus() == 403
                                ? AuditOutcome.DENIED : AuditOutcome.FAILURE)
                        .resourceType(method.getMethod().getName()).resourceId(resource)
                        .subjectUserId(subject).source(AuditSource.ADMIN_PORTAL)
                        .reasonCode("HTTP_" + (exception != null && response.getStatus() < 400
                                ? 500 : response.getStatus())).build());
            }
        }).addPathPatterns("/api/v1/admin/**");
    }

    private static UUID uuid(Object value) {
        if (value instanceof String text) {
            try {
                return UUID.fromString(text);
            } catch (IllegalArgumentException ignored) {
                // Malformed route parameters need no audit resource ID.
            }
        }
        return null;
    }
}
