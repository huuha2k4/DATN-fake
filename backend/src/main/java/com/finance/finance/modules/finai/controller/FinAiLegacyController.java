package com.finance.finance.modules.finai.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.modules.finai.dto.*;
import com.finance.finance.modules.finai.entity.*;
import com.finance.finance.modules.finai.service.FinAiChatService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Temporary authenticated adapter for existing web/mobile chat clients. */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class FinAiLegacyController {
    private final FinAiChatService service;

    @PostMapping
    public ResponseEntity<LegacyChatResponse> chat(@AuthenticationPrincipal User user, @Valid @RequestBody LegacyChatRequest legacy) {
        FinAiChatRequest request = new FinAiChatRequest();
        request.setConversationId(legacy.sessionId); request.setMessage(legacy.question);
        FinAiChatResponse response = service.chat(user.getId(), user.getTimezone(), request);
        String answer = response.getMessage();
        if (!response.getActions().isEmpty()) answer += "\n\nHành động đang chờ xác nhận. Vui lòng cập nhật giao diện Action Agent để xem và xác nhận an toàn.";
        return ResponseEntity.ok(new LegacyChatResponse(answer, "success", response.getConversationId()));
    }

    @GetMapping("/sessions")
    public List<Map<String, Object>> sessions(@AuthenticationPrincipal User user) {
        return service.listSessions(user.getId()).stream().map(s -> {
            Map<String, Object> item = new LinkedHashMap<>(); item.put("id", s.getId()); item.put("title", s.getTitle());
            item.put("created_at", s.getCreatedAt()); item.put("updated_at", s.getUpdatedAt()); return item;
        }).toList();
    }
    @GetMapping("/sessions/{id}/messages")
    public List<Map<String, Object>> messages(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return service.legacyMessages(user.getId(), id).stream().map(m -> {
            Map<String, Object> item = new LinkedHashMap<>(); item.put("id", m.getId()); item.put("author", m.getAuthor());
            item.put("text", m.getText()); item.put("kind", m.getKind()); item.put("created_at", m.getCreatedAt()); return item;
        }).toList();
    }
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.deleteConversation(user.getId(), id); return ResponseEntity.noContent().build();
    }

    @Data public static class LegacyChatRequest {
        @NotBlank @Size(max = 4000) private String question;
        @JsonProperty("session_id") private UUID sessionId;
        @JsonProperty("user_id") private String ignoredUserId;
    }
    public record LegacyChatResponse(String answer, String status, @JsonProperty("session_id") UUID sessionId) {}
}
