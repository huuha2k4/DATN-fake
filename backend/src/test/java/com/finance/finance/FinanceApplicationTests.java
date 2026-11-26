package com.finance.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.audit.context.RequestContextFilter;
import com.finance.finance.modules.finai.client.FinAiAgentClient;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class FinanceApplicationTests {
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

}
