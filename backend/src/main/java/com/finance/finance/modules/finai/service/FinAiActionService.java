package com.finance.finance.modules.finai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditSource;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.finai.dto.FinAiActionResponse;
import com.finance.finance.modules.finai.entity.*;
import com.finance.finance.modules.finai.repository.*;
import com.finance.finance.modules.finai.tool.FinAiToolExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FinAiActionService {
    private final FinAiPendingActionRepository actions;
    private final FinAiActionAuditRepository audits;
    private final FinAiToolExecutor executor;
    private final FinAiActionExecutionService executionService;
    private final ObjectMapper objectMapper;
    @Value("${app.finai.action-ttl-minutes:15}") private long ttlMinutes;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemAuditService systemAuditService;

    @Transactional
    public FinAiActionResponse createPending(UUID userId, UUID conversationId, UUID planId,
                                             String toolName, Map<String, Object> arguments) {
        FinAiToolExecutor.PreparedAction prepared = executor.prepareWrite(userId, toolName, arguments);
        Map<String, Object> storedPreview = new LinkedHashMap<>();
        storedPreview.put("title", prepared.title()); storedPreview.put("description", prepared.description());
        storedPreview.put("preview", prepared.preview());
        FinAiPendingAction action = FinAiPendingAction.builder()
                .userId(userId).conversationId(conversationId).planId(planId).toolName(toolName)
                .argumentsJson(json(arguments)).previewJson(json(storedPreview))
                .status(FinAiActionStatus.PENDING).idempotencyKey(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(Duration.ofMinutes(ttlMinutes))).build();
        action = actions.save(action);
        audit(action, "PROPOSED", "Pending user confirmation");
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.FINAI_ACTION_PROPOSED)
                    .actorId(userId)
                    .subjectUserId(userId)
                    .source(AuditSource.FINAI)
                    .correlationId("finai-" + action.getId())
                    .resourceType("FINAI_ACTION")
                    .resourceId(action.getId())
                    .metadata(Map.of("toolName", toolName))
                    .build());
        }
        return response(action);
    }

    public FinAiActionResponse confirm(UUID userId, UUID actionId) {
        try {
            executionService.execute(userId, actionId);
        } catch (FinAiExecutionException ex) {
            executionService.markFailed(userId, actionId, ex.getMessage());
        }
        return get(userId, actionId);
    }

    @Transactional
    public FinAiActionResponse cancel(UUID userId, UUID actionId) {
        FinAiPendingAction action = actions.findOwnedForUpdate(actionId, userId).orElseThrow(() -> notFound());
        if (action.getStatus() == FinAiActionStatus.CANCELLED) return response(action);
        if (action.getStatus() != FinAiActionStatus.PENDING)
            throw new BusinessException("Only a pending action can be cancelled", "FINAI_ACTION_STATE_INVALID", HttpStatus.CONFLICT);
        action.setStatus(FinAiActionStatus.CANCELLED); audit(action, "CANCELLED", "Cancelled by authenticated user");
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.FINAI_ACTION_CANCELLED)
                    .actorId(userId)
                    .subjectUserId(userId)
                    .source(AuditSource.FINAI)
                    .correlationId("finai-" + action.getId())
                    .resourceType("FINAI_ACTION")
                    .resourceId(action.getId())
                    .metadata(Map.of("toolName", action.getToolName()))
                    .build());
        }
        return response(action);
    }

    @Transactional
    public FinAiActionResponse get(UUID userId, UUID actionId) {
        FinAiPendingAction action = actions.findByIdAndUserId(actionId, userId).orElseThrow(() -> notFound());
        if (action.getStatus() == FinAiActionStatus.PENDING && !action.getExpiresAt().isAfter(Instant.now())) {
            action.setStatus(FinAiActionStatus.EXPIRED); action.setError("Confirmation window expired"); audit(action, "EXPIRED", action.getError());
        }
        return response(action);
    }

    @Transactional(readOnly = true)
    public List<FinAiActionResponse> byConversation(UUID userId, UUID conversationId) {
        return actions.findByConversationIdAndUserIdOrderByCreatedAtAsc(conversationId, userId).stream().map(this::response).toList();
    }

    private void audit(FinAiPendingAction action, String event, String detail) {
        actions.save(action);
        audits.save(FinAiActionAuditLog.builder().actionId(action.getId()).userId(action.getUserId())
                .toolName(action.getToolName()).event(event).status(action.getStatus().name()).detail(detail).build());
    }
    private BusinessException notFound() { return new BusinessException("Action not found", "FINAI_ACTION_NOT_FOUND", HttpStatus.NOT_FOUND); }
    private String json(Object value) { try { return objectMapper.writeValueAsString(value); } catch (Exception e) { throw new IllegalStateException("Cannot serialize FinAI data", e); } }
    @SuppressWarnings("unchecked")
    private FinAiActionResponse response(FinAiPendingAction a) {
        try {
            Map<String, Object> wrapper = objectMapper.readValue(a.getPreviewJson(), new TypeReference<>() {});
            Object result = a.getResultJson() == null ? null : objectMapper.readValue(a.getResultJson(), Object.class);
            return FinAiActionResponse.builder().actionId(a.getId()).planId(a.getPlanId()).toolName(a.getToolName())
                    .title(String.valueOf(wrapper.get("title"))).description(String.valueOf(wrapper.get("description")))
                    .preview((Map<String, Object>) wrapper.get("preview")).status(a.getStatus()).expiresAt(a.getExpiresAt())
                    .confirmedAt(a.getConfirmedAt()).executedAt(a.getExecutedAt()).result(result).error(a.getError()).build();
        } catch (Exception e) { throw new IllegalStateException("Invalid stored action response", e); }
    }
}

