package com.finance.finance.modules.finai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.common.service.IdempotencyService;
import com.finance.finance.modules.finai.dto.*;
import com.finance.finance.modules.finai.service.*;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finai")
@RequiredArgsConstructor
@Slf4j
public class FinAiController {
    private final FinAiChatService chatService;
    private final FinAiActionService actionService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @PostMapping("/chat")
    public ResponseEntity<FinAiChatResponse> chat(@AuthenticationPrincipal User user,
                                                  @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
                                                  @Valid @RequestBody FinAiChatRequest request) {
        long started = System.nanoTime();
        boolean claimed = false;
        if (idempotencyKey != null && !idempotencyKey.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new BusinessException("Mã yêu cầu FinAI không hợp lệ.", "INVALID_REQUEST", HttpStatus.BAD_REQUEST);
        }
        try {
            String requestBody = objectMapper.writeValueAsString(request);
            java.util.Optional<IdempotencyService.IdempotencyResult> cached;
            try {
                cached = idempotencyService.check(idempotencyKey, user.getId(), IdempotencyService.FINAI_CHAT_ENDPOINT, "POST", requestBody);
            } catch (DataIntegrityViolationException error) {
                if (idempotencyKey == null) throw error;
                throw new IdempotencyService.IdempotencyConflictException("Concurrent FinAI request");
            }
            if (cached.isPresent()) {
                FinAiChatResponse response = objectMapper.readValue(cached.get().getResponseBody(), FinAiChatResponse.class);
                return ResponseEntity.ok().header("Idempotency-Replayed", "true").body(response);
            }
            claimed = idempotencyKey != null;
            com.finance.finance.modules.admin.monitoring.RequestObservation.businessRequest(idempotencyKey);
            FinAiChatResponse response = chatService.chat(user.getId(), user.getTimezone(), request, idempotencyKey);
            com.finance.finance.modules.admin.monitoring.RequestObservation.responseType(response.getType());
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            log.info("[FINAI_PIPELINE] stage=spring_total durationMs={} outcome=success", durationMs);
            return ResponseEntity.ok().header("Server-Timing", "finai;dur=" + durationMs).body(response);
        } catch (IdempotencyService.IdempotencyConflictException | IdempotencyService.IdempotencyKeyMismatchException error) {
            throw error;
        } catch (RuntimeException error) {
            if (claimed) idempotencyService.markFailed(idempotencyKey, user.getId(), error.getClass().getSimpleName());
            log.warn("[FINAI_PIPELINE] stage=spring_total durationMs={} outcome=error type={}",
                    (System.nanoTime() - started) / 1_000_000, error.getClass().getSimpleName());
            throw error;
        } catch (Exception error) {
            throw new IllegalStateException("Unable to process FinAI idempotency record", error);
        }
    }
    @PostMapping("/actions/{actionId}/confirm")
    public ResponseEntity<FinAiActionResponse> confirm(@AuthenticationPrincipal User user, @PathVariable UUID actionId) {
        return ResponseEntity.ok(actionService.confirm(user.getId(), actionId));
    }
    @PostMapping("/actions/{actionId}/cancel")
    public ResponseEntity<FinAiActionResponse> cancel(@AuthenticationPrincipal User user, @PathVariable UUID actionId) {
        return ResponseEntity.ok(actionService.cancel(user.getId(), actionId));
    }
    @GetMapping("/actions/{actionId}")
    public ResponseEntity<FinAiActionResponse> getAction(@AuthenticationPrincipal User user, @PathVariable UUID actionId) {
        return ResponseEntity.ok(actionService.get(user.getId(), actionId));
    }
    @GetMapping("/conversations")
    public ResponseEntity<List<FinAiConversationSummaryResponse>> conversations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.listSessions(user.getId()).stream()
                .map(session -> FinAiConversationSummaryResponse.builder()
                        .conversationId(session.getId()).title(session.getTitle())
                        .createdAt(session.getCreatedAt()).updatedAt(session.getUpdatedAt()).build())
                .toList());
    }
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<FinAiConversationResponse> conversation(@AuthenticationPrincipal User user, @PathVariable UUID conversationId) {
        return ResponseEntity.ok(chatService.getConversation(user.getId(), conversationId));
    }
}

