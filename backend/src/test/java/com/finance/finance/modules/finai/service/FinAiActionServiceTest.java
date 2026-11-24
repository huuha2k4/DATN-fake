package com.finance.finance.modules.finai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.finai.entity.*;
import com.finance.finance.modules.finai.repository.*;
import com.finance.finance.modules.finai.tool.FinAiToolExecutor;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinAiActionServiceTest {
    @Mock FinAiPendingActionRepository actions;
    @Mock FinAiActionAuditRepository audits;
    @Mock FinAiToolExecutor executor;
    FinAiActionService service;
    FinAiActionExecutionService executionService;
    UUID userId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        executionService = new FinAiActionExecutionService(actions, audits, executor, mapper);
        service = new FinAiActionService(actions, audits, executor, executionService, mapper);
        ReflectionTestUtils.setField(service, "ttlMinutes", 15L);
        lenient().when(actions.save(any())).thenAnswer(inv -> {
            FinAiPendingAction a = inv.getArgument(0);
            if (a.getId() == null) ReflectionTestUtils.setField(a, "id", UUID.randomUUID());
            return a;
        });
    }

    @Test
    void createsDurablePendingWriteWithoutExecutingIt() {
        when(executor.prepareWrite(eq(userId), eq("create_budget"), anyMap()))
                .thenReturn(new FinAiToolExecutor.PreparedAction("title", "description", Map.of("amount", 10)));
        var response = service.createPending(userId, UUID.randomUUID(), null, "create_budget", Map.of("name", "Food"));
        assertEquals(FinAiActionStatus.PENDING, response.getStatus());
        verify(executor, never()).executeWrite(any(), any(), any());
        verify(audits).save(argThat(a -> a.getEvent().equals("PROPOSED")));
    }

    @Test
    void duplicateConfirmationReturnsCompletedResultWithoutExecutingAgain() {
        FinAiPendingAction action = action(FinAiActionStatus.COMPLETED);
        action.setResultJson("{\"id\":\"done\"}");
        stubConfirm(action);
        var response = service.confirm(userId, action.getId());
        assertEquals(FinAiActionStatus.COMPLETED, response.getStatus());
        verify(executor, never()).executeWrite(any(), any(), any());
    }

    @Test
    void expiredActionCannotExecute() {
        FinAiPendingAction action = action(FinAiActionStatus.PENDING);
        action.setExpiresAt(Instant.now().minusSeconds(1));
        stubConfirm(action);
        assertEquals(FinAiActionStatus.EXPIRED, service.confirm(userId, action.getId()).getStatus());
        verify(executor, never()).executeWrite(any(), any(), any());
    }

    @Test
    void confirmedActionExecutesExactlyOnceAndPersistsAuthoritativeResult() {
        FinAiPendingAction action = action(FinAiActionStatus.PENDING);
        action.setArgumentsJson("{\"name\":\"Food\"}");
        stubConfirm(action);
        when(executor.executeWrite(eq(userId), eq("create_budget"), anyMap())).thenReturn(Map.of("id", "budget-1"));
        var response = service.confirm(userId, action.getId());
        assertEquals(FinAiActionStatus.COMPLETED, response.getStatus());
        assertEquals("budget-1", ((Map<?, ?>) response.getResult()).get("id"));
        verify(executor, times(1)).executeWrite(eq(userId), eq("create_budget"), anyMap());
    }

    @Test
    void revalidationFailureBecomesFailedWithoutFalseSuccess() {
        FinAiPendingAction action = action(FinAiActionStatus.PENDING);
        FinAiPendingAction rolledBack = action(FinAiActionStatus.PENDING);
        rolledBack.setId(action.getId());
        when(actions.findOwnedForUpdate(action.getId(), userId))
                .thenReturn(Optional.of(action), Optional.of(rolledBack));
        when(actions.findByIdAndUserId(action.getId(), userId)).thenReturn(Optional.of(rolledBack));
        when(executor.executeWrite(any(), any(), anyMap())).thenThrow(new BusinessException("Budget now overlaps"));
        var response = service.confirm(userId, action.getId());
        assertEquals(FinAiActionStatus.FAILED, response.getStatus());
        assertNull(response.getResult());
        assertTrue(response.getError().contains("overlaps"));
    }

    @Test
    void cancelIsIdempotentAndOwnershipIsRequired() {
        FinAiPendingAction action = action(FinAiActionStatus.PENDING);
        when(actions.findOwnedForUpdate(action.getId(), userId)).thenReturn(Optional.of(action));
        assertEquals(FinAiActionStatus.CANCELLED, service.cancel(userId, action.getId()).getStatus());
        action.setStatus(FinAiActionStatus.CANCELLED);
        assertEquals(FinAiActionStatus.CANCELLED, service.cancel(userId, action.getId()).getStatus());
        UUID missingId = UUID.randomUUID();
        when(actions.findOwnedForUpdate(missingId, userId)).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> service.confirm(userId, missingId));
    }

    private FinAiPendingAction action(FinAiActionStatus status) {
        return FinAiPendingAction.builder().id(UUID.randomUUID()).userId(userId).toolName("create_budget")
                .argumentsJson("{}").previewJson("{\"title\":\"t\",\"description\":\"d\",\"preview\":{}}")
                .status(status).idempotencyKey(UUID.randomUUID().toString()).createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60)).build();
    }

    private void stubConfirm(FinAiPendingAction action) {
        when(actions.findOwnedForUpdate(action.getId(), userId)).thenReturn(Optional.of(action));
        when(actions.findByIdAndUserId(action.getId(), userId)).thenReturn(Optional.of(action));
    }
}

