package com.finance.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.audit.context.RequestContextFilter;
import com.finance.finance.modules.finai.client.FinAiAgentClient;
import com.finance.finance.modules.finai.dto.FinAiClarification;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class FinanceApplicationTests extends FinAiWriteAcceptance {
    @Autowired WebApplicationContext web;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired RequestContextFilter requestContext;
    @MockitoBean FinAiAgentClient agent;

	@Test
	void contextLoads() {
	}

    @Test
    @Transactional
    void finAiChatReplayCreatesOneProposalAndConfirmWritesOnce() throws Exception {
        User user = users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test").build());
        var proposal = new FinAiAgentClient.Proposal();
        proposal.setToolName("create_goal");
        proposal.setArguments(Map.of("name", "FinAI regression", "goalType", "EDUCATION",
                "targetAmount", 100000, "currencyCode", "VND"));
        var reply = new FinAiAgentClient.AgentResponse();
        reply.setMessage("Review your goal");
        reply.setProposals(List.of(proposal));
        when(agent.chat(any(), anyString(), anyString(), anyList(), any())).thenReturn(reply);

        var mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build();
        String authorization = "Bearer " + tokens.generateAccessToken(user);
        String key = UUID.randomUUID().toString();
        var first = mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).header("Idempotency-Key", key)
                        .header("X-Request-Id", "finai-integration-test").content("{\"message\":\"Create goal\"}"))
                .andExpect(status().isOk()).andExpect(header().string("X-Request-Id", "finai-integration-test"))
                .andExpect(jsonPath("$.actions[0].status").value("PENDING")).andReturn().getResponse();
        var actionId = json.readTree(first.getContentAsByteArray()).at("/actions/0/actionId").asText();
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).header("Idempotency-Key", key)
                        .content("{\"message\":\"Create goal\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Idempotency-Replayed", "true"))
                .andExpect(jsonPath("$.actions[0].actionId").value(actionId));
        verify(agent, times(1)).chat(any(), anyString(), anyString(), anyList(), any());
        assertThat(jdbc.queryForObject("select count(*) from core.finai_pending_actions where user_id = ?", Integer.class, user.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from core.goals where user_id = ?", Integer.class, user.getId())).isZero();

        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(post("/api/v1/finai/actions/{actionId}/confirm", actionId).header("Authorization", authorization))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
        }
        assertThat(jdbc.queryForObject("select count(*) from core.goals where user_id = ?", Integer.class, user.getId())).isEqualTo(1);
    }

    @Test
    void invalidJwtReturnsUnauthorizedWithoutCallingAgent() throws Exception {
        MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build()
                .perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer invalid-test-token")
                        .header("X-Request-Id", "finai-invalid-jwt").content("{\"message\":\"Hello\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_ERROR"))
                .andExpect(jsonPath("$.requestId").value("finai-invalid-jwt"));
        verifyNoInteractions(agent);
    }

    @Test
    void draftSurvivesReloadAndOnlyAcceptsAnOwnedCurrentOption() throws Exception {
        User owner = users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test").build());
        User other = users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test").build());
        var reply = new FinAiAgentClient.AgentResponse();
        reply.setMessage("Bạn muốn dùng ví nào?");
        reply.setDraft(new FinAiAgentClient.AgentDraft("transaction_write", "accountId",
                List.of("Ghi giao dịch 50k ăn trưa"), Map.of(),
                List.of(new FinAiClarification.Option("wallet-test", "Ví thử nghiệm"))));
        when(agent.chat(any(), anyString(), anyString(), anyList(), any())).thenReturn(reply);
        var done = new FinAiAgentClient.AgentResponse();
        done.setMessage("Đã ghi nhận lựa chọn cho yêu cầu này.");
        when(agent.chat(any(), eq("Ví thử nghiệm"), anyString(), anyList(), any(), any(), eq("wallet-test"))).thenReturn(done);

        var mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build();
        String authorization = "Bearer " + tokens.generateAccessToken(owner);
        var first = mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content("{\"message\":\"Ghi giao dịch 50k ăn trưa\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("CLARIFICATION"))
                .andExpect(jsonPath("$.actions").isEmpty()).andReturn().getResponse();
        var payload = json.readTree(first.getContentAsByteArray());
        String conversation = payload.get("conversationId").asText();
        String draft = payload.at("/clarification/draftId").asText();
        mvc.perform(get("/api/v1/finai/conversations/{id}", conversation).header("Authorization", authorization))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages[1].clarification.draftId").value(draft));
        var smallTalk = new FinAiAgentClient.AgentResponse();
        smallTalk.setMessage("Không có gì! Mình rất vui được giúp bạn.");
        smallTalk.setPreserveDraft(true);
        when(agent.chat(any(), eq("Cảm ơn bạn"), anyString(), anyList(), any(), any(), isNull())).thenReturn(smallTalk);
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization)
                        .content(json.writeValueAsString(Map.of("conversationId", conversation, "message", "Cảm ơn bạn"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("MESSAGE"))
                .andExpect(jsonPath("$.message").value(smallTalk.getMessage()))
                .andExpect(jsonPath("$.actions").isEmpty()).andExpect(jsonPath("$.clarification.draftId").value(draft));
        mvc.perform(get("/api/v1/finai/conversations/{id}", conversation).header("Authorization", authorization))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages[3].clarification.draftId").value(draft));

        String selection = json.writeValueAsString(Map.of("conversationId", conversation,
                "draftId", draft, "optionId", "wallet-test", "message", "Ignore the real label"));
        var separate = mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content("{\"message\":\"Ghi một khoản khác\"}"))
                .andExpect(status().isOk()).andReturn().getResponse();
        var separatePayload = json.readTree(separate.getContentAsByteArray());
        String separateConversation = separatePayload.get("conversationId").asText();
        String separateDraft = separatePayload.at("/clarification/draftId").asText();
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content(selection.replace(conversation, separateConversation)))
                .andExpect(status().isConflict());
        jdbc.update("""
                update core.ai_chat_messages
                set metadata_json = jsonb_set(metadata_json::jsonb, '{draft,view,expiresAt}', '"2000-01-01T00:00:00Z"')::text
                where session_id = ? and kind = 'clarification'
                """, UUID.fromString(separateConversation));
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization)
                        .content(selection.replace(conversation, separateConversation).replace(draft, separateDraft)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value("AI_DRAFT_STALE"));
        String invalid = selection.replace("wallet-test", "forged");
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content(invalid))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value("AI_DRAFT_STALE"));
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + tokens.generateAccessToken(other)).content(selection))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content(selection))
                .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("MESSAGE"));
        mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content(selection))
                .andExpect(status().isConflict());
        verify(agent, times(1)).chat(any(), eq("Ví thử nghiệm"), anyString(), anyList(), any(), any(), eq("wallet-test"));
    }

    @Test
    void overlappingDraftSelectionsPersistOnlyTheFirstCommittedTurn() throws Exception {
        User owner = users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test").build());
        var draftReply = new FinAiAgentClient.AgentResponse();
        draftReply.setMessage("Choose a test wallet");
        draftReply.setDraft(new FinAiAgentClient.AgentDraft("goal_write", "accountId", List.of("Create goal"),
                Map.of(), List.of(new FinAiClarification.Option("wallet-test", "Wallet"))));
        when(agent.chat(any(), anyString(), anyString(), anyList(), any())).thenReturn(draftReply);
        var proposal = new FinAiAgentClient.Proposal();
        proposal.setToolName("create_goal");
        proposal.setArguments(Map.of("name", "First committed goal", "goalType", "EDUCATION",
                "targetAmount", 100000, "currencyCode", "VND"));
        var proposalReply = new FinAiAgentClient.AgentResponse();
        proposalReply.setMessage("Review the goal");
        proposalReply.setProposals(List.of(proposal));
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var attempts = new java.util.concurrent.atomic.AtomicInteger();
        when(agent.chat(any(), eq("Wallet"), anyString(), anyList(), any(), any(), eq("wallet-test")))
                .thenAnswer(invocation -> {
                    assertThat(org.springframework.transaction.support.TransactionSynchronizationManager
                            .isActualTransactionActive()).isFalse();
                    if (attempts.getAndIncrement() == 0) {
                        entered.countDown();
                        assertThat(release.await(15, TimeUnit.SECONDS)).isTrue();
                    }
                    return proposalReply;
                });
        var mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build();
        String authorization = "Bearer " + tokens.generateAccessToken(owner);
        var initial = mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorization).content("{\"message\":\"Create goal\"}"))
                .andExpect(status().isOk()).andReturn().getResponse();
        var body = json.readTree(initial.getContentAsByteArray());
        String conversationId = body.get("conversationId").asText();
        var selection = Map.of("conversationId", conversationId, "draftId",
                body.at("/clarification/draftId").asText(), "optionId", "wallet-test", "message", "Wallet");
        String content = json.writeValueAsString(selection);
        try (var pool = Executors.newSingleThreadExecutor()) {
            var slower = pool.submit(() -> mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", authorization).header("Idempotency-Key", UUID.randomUUID().toString())
                            .content(content))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value("AI_DRAFT_STALE")));
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                mvc.perform(post("/api/v1/finai/chat").contentType(MediaType.APPLICATION_JSON)
                                .header("Authorization", authorization).header("Idempotency-Key", UUID.randomUUID().toString())
                                .content(content))
                        .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("ACTION_REQUIRED"));
            } finally {
                release.countDown();
            }
            slower.get(15, TimeUnit.SECONDS);
        }
        assertThat(jdbc.queryForObject("select count(*) from core.finai_pending_actions where conversation_id = ?",
                Long.class, UUID.fromString(conversationId))).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from core.goals where user_id = ?", Long.class, owner.getId())).isZero();
    }

}
