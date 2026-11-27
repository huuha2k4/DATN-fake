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
import java.time.Duration;
import java.text.Normalizer;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinAiChatService {
    private static final Duration DRAFT_TTL = Duration.ofMinutes(30);
    private record StoredDraft(FinAiClarification view, FinAiAgentClient.AgentDraft state) {}
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
                : messages.findTop20BySessionIdOrderByCreatedAtDesc(session.getId()).reversed();
        List<FinAiAgentClient.HistoryItem> history = existing.stream()
                .map(m -> new FinAiAgentClient.HistoryItem(m.getAuthor(), m.getText())).toList();
        StoredDraft activeDraft = existing.isEmpty() ? null : activeDraft(existing.getLast());
        String submittedMessage = request.getMessage();
        if (request.getDraftId() != null || request.getOptionId() != null) {
            if (activeDraft == null || !activeDraft.view().draftId().equals(request.getDraftId())) throw staleDraft();
            submittedMessage = activeDraft.view().options().stream()
                    .filter(option -> option.id().equals(request.getOptionId()))
                    .findFirst().map(FinAiClarification.Option::label).orElseThrow(FinAiChatService::staleDraft);
        }
        log.info("[FINAI_PIPELINE] stage=conversation_db_read durationMs={}", (System.nanoTime() - readStarted) / 1_000_000);
        UUID conversationId = session.getId() == null ? UUID.randomUUID() : session.getId();
        Instant expectedVersion = session.getUpdatedAt();
        String contextToken = contextTokens.issue(userId);
        FinAiTemporalContext temporalContext = FinAiTemporalContext.now(timezone);
        FinAiAgentClient.AgentResponse ai = activeDraft == null
                ? agentClient.chat(conversationId, submittedMessage, contextToken, history, temporalContext)
                : agentClient.chat(conversationId, submittedMessage, contextToken, history, temporalContext,
                        activeDraft.state(), request.getOptionId());
        verifyScope(request, activeDraft, ai);
        String acceptedMessage = submittedMessage;
        long writeStarted = System.nanoTime();
        FinAiChatResponse savedResponse = new TransactionTemplate(transactionManager).execute(status -> {
            AiChatSession saved = request.getConversationId() == null ? sessions.save(session)
                    : sessions.findOwnedForUpdate(conversationId, userId).orElseThrow(FinAiChatService::staleDraft);
            if (expectedVersion != null && !expectedVersion.equals(saved.getUpdatedAt())) throw staleDraft();
            if (request.getDraftId() != null && !activeDraft.view().expiresAt().isAfter(Instant.now())) throw staleDraft();
            FinAiChatResponse response = persistTurn(userId, acceptedMessage, saved, ai, activeDraft);
            idempotencyService.completeFinAiChat(idempotencyKey, userId, response, response.getConversationId());
            return response;
        });
        log.info("[FINAI_PIPELINE] stage=conversation_db_write durationMs={}", (System.nanoTime() - writeStarted) / 1_000_000);
        return savedResponse;
    }

    private FinAiChatResponse persistTurn(UUID userId, String userMessage, AiChatSession session,
                                          FinAiAgentClient.AgentResponse ai, StoredDraft previousDraft) {
        if (ai.getMessage() == null || ai.getMessage().isBlank()) throw invalidAgentResponse();
        if (ai.getDraft() != null && ai.getProposals() != null && !ai.getProposals().isEmpty()) throw invalidAgentResponse();
        Instant now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Instant previous = session.getUpdatedAt().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Instant userCreatedAt = now.isAfter(previous) ? now : previous.plusNanos(1_000);
        Instant assistantCreatedAt = userCreatedAt.plusNanos(1_000);
        messages.save(AiChatMessage.builder().sessionId(session.getId()).author("user").text(userMessage)
                .kind("normal").createdAt(userCreatedAt).build());
        List<FinAiActionResponse> pending = new ArrayList<>();
        if (ai.getProposals() != null) {
            if (ai.getProposals().size() > 5) throw new BusinessException("Too many proposed actions", "FINAI_TOOL_LIMIT", HttpStatus.BAD_REQUEST);
            for (FinAiAgentClient.Proposal proposal : ai.getProposals()) {
                if (proposal.getArguments() == null) throw new BusinessException("Missing proposal arguments", "FINAI_SCHEMA_INVALID", HttpStatus.BAD_REQUEST);
                pending.add(actionService.createPending(userId, session.getId(), proposal.getPlanId(), proposal.getToolName(), proposal.getArguments()));
            }
        }
        StoredDraft draft = storedDraft(ai.getDraft());
        boolean interrupted = ai.isPreserveDraft() && draft == null && pending.isEmpty() && previousDraft != null
                && previousDraft.view().expiresAt().isAfter(Instant.now());
        if (interrupted) draft = previousDraft;
        String type = draft != null && !interrupted ? "CLARIFICATION" : pending.isEmpty() ? "MESSAGE"
                : pending.size() == 1 ? "ACTION_REQUIRED" : "MULTI_ACTION_REQUIRED";
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (draft != null) metadata.put("draft", draft);
        if (!pending.isEmpty()) {
            metadata.put("actionIds", pending.stream().map(FinAiActionResponse::getActionId).toList());
        }
        String metaJson;
        try {
            metaJson = metadata.isEmpty() ? null : objectMapper.writeValueAsString(metadata);
        } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
            throw invalidAgentResponse();
        }

        messages.save(AiChatMessage.builder()
                .sessionId(session.getId())
                .author("assistant")
                .text(ai.getMessage())
                .kind(draft != null ? "clarification" : pending.isEmpty() ? "normal" : "action_required")
                .createdAt(assistantCreatedAt)
                .metadataJson(metaJson)
                .build());
        session.setUpdatedAt(assistantCreatedAt);
        sessions.save(session);
        return FinAiChatResponse.builder().type(type).conversationId(session.getId()).message(ai.getMessage())
                .clarification(draft == null ? null : draft.view()).actions(pending).build();
    }

    private StoredDraft storedDraft(FinAiAgentClient.AgentDraft state) {
        if (state == null) return null;
        if (state.route() == null || state.field() == null || !state.field().matches("[A-Za-z][A-Za-z0-9_]{0,59}")
                || state.turns() == null || state.turns().isEmpty() || state.turns().size() > 8
                || state.turns().stream().anyMatch(turn -> turn == null || turn.length() > 4000)) {
            throw invalidAgentResponse();
        }
        List<FinAiClarification.Option> choices = state.options() == null ? List.of() : state.options().stream()
                .filter(option -> option != null && option.id() != null && option.id().matches("[A-Za-z0-9_-]{1,64}")
                        && option.label() != null && !option.label().isBlank() && option.label().length() <= 200)
                .distinct().limit(24).toList();
        return new StoredDraft(new FinAiClarification(UUID.randomUUID(), state.field(), Instant.now().plus(DRAFT_TTL), choices),
                new FinAiAgentClient.AgentDraft(state.route(), state.field(), state.turns(),
                        state.slots() == null ? Map.of() : state.slots(), choices));
    }

    private StoredDraft activeDraft(AiChatMessage message) {
        if (!"clarification".equals(message.getKind()) || message.getMetadataJson() == null) return null;
        try {
            StoredDraft draft = objectMapper.treeToValue(objectMapper.readTree(message.getMetadataJson()).get("draft"), StoredDraft.class);
            return draft != null && draft.view() != null && draft.view().expiresAt().isAfter(Instant.now()) ? draft : null;
        } catch (Exception error) {
            return null;
        }
    }

    private static void verifyScope(FinAiChatRequest request, StoredDraft draft, FinAiAgentClient.AgentResponse ai) {
        if (ai.getProposals() == null || ai.getProposals().isEmpty()) return;
        String evidence = request.getDraftId() == null ? request.getMessage()
                : String.join(" ", draft.state().turns());
        String folded = Normalizer.normalize(evidence.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd');
        boolean groupExpense = folded.matches("(?s).*\\b(?:chi tieu nhom|chi nhom|giao dich nhom|"
                + "quy (?:cua )?(?:nhom|chung|phong tro|gia dinh)|tien quy|chi ho|ca phong|"
                + "ghi vao nhom|group (?:expense|fund))\\b.*");
        for (var proposal : ai.getProposals()) {
            if (groupExpense && "create_transaction".equals(proposal.getToolName())) throw invalidAgentResponse();
        }
    }

    private static BusinessException invalidAgentResponse() {
        return new BusinessException("FinAI trả về phản hồi không hợp lệ.", "AI_INTERNAL_ERROR", HttpStatus.BAD_GATEWAY);
    }

    private static BusinessException staleDraft() {
        return new BusinessException("Hội thoại đã thay đổi hoặc lựa chọn đã hết hạn. Vui lòng tải lại hội thoại.",
                "AI_DRAFT_STALE", HttpStatus.CONFLICT);
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

            StoredDraft draft = m == rawMsgs.getLast() ? activeDraft(m) : null;
            history.add(FinAiConversationResponse.Message.builder()
                    .id(m.getId())
                    .author(m.getAuthor())
                    .text(m.getText())
                    .kind(m.getKind())
                    .createdAt(m.getCreatedAt())
                    .actionIds(msgActionIds.isEmpty() ? null : msgActionIds)
                    .actions(msgActions.isEmpty() ? null : msgActions)
                    .clarification(draft == null ? null : draft.view())
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

