package com.finance.finance.modules.finai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.common.service.IdempotencyService;
import com.finance.finance.modules.finai.client.FinAiAgentClient;
import com.finance.finance.modules.finai.dto.*;
import com.finance.finance.modules.finai.entity.*;
import com.finance.finance.modules.finai.repository.*;
import com.finance.finance.modules.finai.security.FinAiContextTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinAiChatService {
    private final AiChatSessionRepository sessions;
    private final AiChatMessageRepository messages;
    private final FinAiActionService actionService;
    private final FinAiContextTokenService contextTokens;
    private final FinAiAgentClient agentClient;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;
    private final IdempotencyService idempotencyService;

    public FinAiChatResponse chat(UUID userId, String timezone, FinAiChatRequest request) {
        return chat(userId, timezone, request, null);
    }

    public FinAiChatResponse chat(UUID userId, String timezone, FinAiChatRequest request, String idempotencyKey) {
        long readStarted = System.nanoTime();
        AiChatSession session = resolveSession(userId, request);
        List<AiChatMessage> existing = request.getConversationId() == null ? List.of()
                : messages.findBySessionIdOrderByCreatedAtAsc(session.getId());
        List<FinAiAgentClient.HistoryItem> history = existing.stream()
                .skip(Math.max(0, existing.size() - 20L))
                .map(m -> new FinAiAgentClient.HistoryItem(m.getAuthor(), m.getText())).toList();
        log.info("[FINAI_PIPELINE] stage=conversation_db_read durationMs={}", (System.nanoTime() - readStarted) / 1_000_000);
        UUID conversationId = session.getId() == null ? UUID.randomUUID() : session.getId();
        FinAiAgentClient.AgentResponse ai = agentClient.chat(conversationId, request.getMessage(),
                contextTokens.issue(userId), history, FinAiTemporalContext.now(timezone));
        long writeStarted = System.nanoTime();
        FinAiChatResponse savedResponse = new TransactionTemplate(transactionManager).execute(status -> {
            AiChatSession saved = request.getConversationId() == null ? sessions.save(session) : session;
            FinAiChatResponse response = persistTurn(userId, request, saved, ai);
            idempotencyService.completeFinAiChat(idempotencyKey, userId, response, response.getConversationId());
            return response;
        });
        log.info("[FINAI_PIPELINE] stage=conversation_db_write durationMs={}", (System.nanoTime() - writeStarted) / 1_000_000);
        return savedResponse;
    }

    private FinAiChatResponse persistTurn(UUID userId, FinAiChatRequest request, AiChatSession session, FinAiAgentClient.AgentResponse ai) {
        messages.save(AiChatMessage.builder().sessionId(session.getId()).author("user").text(request.getMessage()).kind("normal").build());
        List<FinAiActionResponse> pending = new ArrayList<>();
        if (ai.getProposals() != null) {
            if (ai.getProposals().size() > 5) throw new BusinessException("Too many proposed actions", "FINAI_TOOL_LIMIT", HttpStatus.BAD_REQUEST);
            for (FinAiAgentClient.Proposal proposal : ai.getProposals()) {
                if (proposal.getArguments() == null) throw new BusinessException("Missing proposal arguments", "FINAI_SCHEMA_INVALID", HttpStatus.BAD_REQUEST);
                pending.add(actionService.createPending(userId, session.getId(), proposal.getPlanId(), proposal.getToolName(), proposal.getArguments()));
            }
        }
        String type = pending.isEmpty() ? "MESSAGE" : pending.size() == 1 ? "ACTION_REQUIRED" : "MULTI_ACTION_REQUIRED";
        String metaJson = null;
        if (!pending.isEmpty()) {
            try {
                List<UUID> actionIds = pending.stream().map(FinAiActionResponse::getActionId).toList();
                metaJson = objectMapper.writeValueAsString(Map.of("actionIds", actionIds));
            } catch (Exception e) {
                log.warn("Failed to serialize metadata actionIds for chat message", e);
            }
        }

        messages.save(AiChatMessage.builder()
                .sessionId(session.getId())
                .author("assistant")
                .text(ai.getMessage())
                .kind(pending.isEmpty() ? "normal" : "action_required")
                .metadataJson(metaJson)
                .build());
        session.setUpdatedAt(Instant.now()); sessions.save(session);
        return FinAiChatResponse.builder().type(type).conversationId(session.getId()).message(ai.getMessage()).actions(pending).build();
    }

    public FinAiConversationResponse getConversation(UUID userId, UUID conversationId) {
        AiChatSession session = sessions.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new BusinessException("Conversation not found", "FINAI_CONVERSATION_NOT_FOUND", HttpStatus.NOT_FOUND));

        List<FinAiActionResponse> allActions = actionService.byConversation(userId, conversationId);
        Map<UUID, FinAiActionResponse> actionMap = allActions.stream()
                .collect(Collectors.toMap(FinAiActionResponse::getActionId, Function.identity(), (a, b) -> a));

        List<AiChatMessage> rawMsgs = messages.findBySessionIdOrderByCreatedAtAsc(conversationId);
        Set<UUID> assignedActionIds = new HashSet<>();

        List<FinAiConversationResponse.Message> history = new ArrayList<>();
        for (AiChatMessage m : rawMsgs) {
            List<UUID> msgActionIds = new ArrayList<>();
            List<FinAiActionResponse> msgActions = new ArrayList<>();

            if (m.getMetadataJson() != null && !m.getMetadataJson().isBlank()) {
                try {
                    Map<String, Object> meta = objectMapper.readValue(m.getMetadataJson(), new TypeReference<>() {});
                    if (meta.containsKey("actionIds")) {
                        Object idsObj = meta.get("actionIds");
                        if (idsObj instanceof List<?> list) {
                            for (Object item : list) {
                                if (item != null) {
                                    UUID actId = UUID.fromString(item.toString());
                                    msgActionIds.add(actId);
                                    FinAiActionResponse act = actionMap.get(actId);
                                    if (act != null) {
                                        msgActions.add(act);
                                        assignedActionIds.add(actId);
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.debug("Error parsing metadataJson for message {}", m.getId());
                }
            }

            history.add(FinAiConversationResponse.Message.builder()
                    .id(m.getId())
                    .author(m.getAuthor())
                    .text(m.getText())
                    .kind(m.getKind())
                    .createdAt(m.getCreatedAt())
                    .actionIds(msgActionIds.isEmpty() ? null : msgActionIds)
                    .actions(msgActions.isEmpty() ? null : msgActions)
                    .build());
        }

        // Tương thích ngược với các tin nhắn cũ chưa có metadataJson
        List<FinAiActionResponse> unassigned = allActions.stream()
                .filter(a -> !assignedActionIds.contains(a.getActionId()))
                .toList();

        if (!unassigned.isEmpty()) {
            for (int i = history.size() - 1; i >= 0; i--) {
                FinAiConversationResponse.Message m = history.get(i);
                if ("assistant".equalsIgnoreCase(m.getAuthor())) {
                    List<FinAiActionResponse> existingActions = m.getActions() != null ? new ArrayList<>(m.getActions()) : new ArrayList<>();
                    existingActions.addAll(unassigned);
                    m.setActions(existingActions);
                    break;
                }
            }
        }

        return FinAiConversationResponse.builder()
                .conversationId(session.getId())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .messages(history)
                .actions(allActions)
                .build();
    }

    public List<AiChatSession> listSessions(UUID userId) {
        return sessions.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public List<AiChatMessage> legacyMessages(UUID userId, UUID conversationId) {
        sessions.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new BusinessException("Conversation not found", "FINAI_CONVERSATION_NOT_FOUND", HttpStatus.NOT_FOUND));
        return messages.findBySessionIdOrderByCreatedAtAsc(conversationId);
    }

    public void deleteConversation(UUID userId, UUID conversationId) {
        AiChatSession session = sessions.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new BusinessException("Conversation not found", "FINAI_CONVERSATION_NOT_FOUND", HttpStatus.NOT_FOUND));
        sessions.delete(session);
    }

    private AiChatSession resolveSession(UUID userId, FinAiChatRequest request) {
        if (request.getConversationId() != null) return sessions.findByIdAndUserId(request.getConversationId(), userId)
                .orElseThrow(() -> new BusinessException("Conversation not found", "FINAI_CONVERSATION_NOT_FOUND", HttpStatus.NOT_FOUND));
        String title = request.getMessage().trim(); if (title.length() > 80) title = title.substring(0, 80);
        return AiChatSession.builder().userId(userId).title(title).build();
    }
}

