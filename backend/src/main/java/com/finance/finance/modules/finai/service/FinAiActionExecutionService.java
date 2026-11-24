package com.finance.finance.modules.finai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.finai.entity.*;
import com.finance.finance.modules.finai.repository.*;
import com.finance.finance.modules.finai.tool.FinAiToolExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FinAiActionExecutionService {
    private final FinAiPendingActionRepository actions;
    private final FinAiActionAuditRepository audits;
    private final FinAiToolExecutor executor;
    private final ObjectMapper objectMapper;

    /** Business write and COMPLETED status commit in the same database transaction. */
    @Transactional
    public void execute(UUID userId, UUID actionId) {
        FinAiPendingAction action = actions.findOwnedForUpdate(actionId, userId)
                .orElseThrow(() -> new BusinessException("Action not found", "FINAI_ACTION_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (Set.of(FinAiActionStatus.COMPLETED, FinAiActionStatus.CANCELLED, FinAiActionStatus.EXPIRED,
                FinAiActionStatus.FAILED, FinAiActionStatus.EXECUTING).contains(action.getStatus())) return;
        if (action.getStatus() != FinAiActionStatus.PENDING)
            throw new BusinessException("Action cannot be confirmed from status " + action.getStatus(), "FINAI_ACTION_STATE_INVALID", HttpStatus.CONFLICT);
        if (!action.getExpiresAt().isAfter(Instant.now())) {
            action.setStatus(FinAiActionStatus.EXPIRED); action.setError("Confirmation window expired");
            audit(action, "EXPIRED", action.getError()); return;
        }
        action.setStatus(FinAiActionStatus.CONFIRMED); action.setConfirmedAt(Instant.now());
        audit(action, "CONFIRMED", "Confirmed by authenticated user");
        action.setStatus(FinAiActionStatus.EXECUTING);
        try {
            Object result = executor.executeWrite(userId, action.getToolName(), arguments(action));
            action.setResultJson(objectMapper.writeValueAsString(result)); action.setExecutedAt(Instant.now());
            action.setStatus(FinAiActionStatus.COMPLETED); audit(action, "EXECUTED", "Business service completed");
        } catch (Exception ex) {
            throw new FinAiExecutionException(safeError(ex), ex);
        }
    }

    /** Runs after the write transaction rolled back, so FAILED is durable without partial business data. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID userId, UUID actionId, String error) {
        FinAiPendingAction action = actions.findOwnedForUpdate(actionId, userId)
                .orElseThrow(() -> new BusinessException("Action not found", "FINAI_ACTION_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (action.getStatus() != FinAiActionStatus.PENDING) return;
        action.setStatus(FinAiActionStatus.FAILED); action.setExecutedAt(Instant.now());
        action.setError(error.substring(0, Math.min(error.length(), 1000))); audit(action, "FAILED", action.getError());
    }

    private void audit(FinAiPendingAction action, String event, String detail) {
        actions.save(action);
        audits.save(FinAiActionAuditLog.builder().actionId(action.getId()).userId(action.getUserId())
                .toolName(action.getToolName()).event(event).status(action.getStatus().name()).detail(detail).build());
    }
    private Map<String, Object> arguments(FinAiPendingAction action) {
        try { return objectMapper.readValue(action.getArgumentsJson(), new TypeReference<>() {}); }
        catch (Exception e) { throw new FinAiExecutionException("Invalid stored action", e); }
    }
    private String safeError(Exception e) { String m = e.getMessage(); return m == null ? "Business execution failed" : m.substring(0, Math.min(m.length(), 1000)); }
}

