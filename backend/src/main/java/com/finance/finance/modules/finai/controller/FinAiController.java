package com.finance.finance.modules.finai.controller;

import com.finance.finance.modules.finai.dto.*;
import com.finance.finance.modules.finai.service.*;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finai")
@RequiredArgsConstructor
public class FinAiController {
    private final FinAiChatService chatService;
    private final FinAiActionService actionService;

    @PostMapping("/chat")
    public ResponseEntity<FinAiChatResponse> chat(@AuthenticationPrincipal User user, @Valid @RequestBody FinAiChatRequest request) {
        return ResponseEntity.ok(chatService.chat(user.getId(), user.getTimezone(), request));
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

