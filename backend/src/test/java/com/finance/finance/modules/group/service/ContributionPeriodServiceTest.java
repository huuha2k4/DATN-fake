package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.ContributionPeriodStatus;
import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.modules.group.dto.request.CreateContributionPeriodRequest;
import com.finance.finance.modules.group.entity.ContributionPeriod;
import com.finance.finance.modules.group.entity.GroupFinanceConfig;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.entity.MemberContributionObligation;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContributionPeriodServiceTest {
    @Mock ContributionPeriodRepository periodRepository;
    @Mock MemberContributionObligationRepository obligationRepository;
    @Mock GroupFundContributionRepository contributionRepository;
    @Mock GroupMemberRepository memberRepository;
    @Mock GroupFinanceConfigRepository configRepository;
    @Mock UserRepository userRepository;
    @Mock GroupFinanceNotifications financeNotifications;
    @Mock com.finance.finance.modules.audit.service.SystemAuditService audit;

    private ContributionPeriodService service;
    private final UUID groupId = UUID.fromString("10000000-0000-0000-0000-000000000000");
    private final UUID actorId = UUID.fromString("20000000-0000-0000-0000-000000000000");
    private final AtomicReference<List<MemberContributionObligation>> savedObligations = new AtomicReference<>(List.of());

    @BeforeEach
    void setUp() {
        service = new ContributionPeriodService(periodRepository, obligationRepository, contributionRepository,
                memberRepository, configRepository, userRepository, financeNotifications, audit);
        when(configRepository.findById(groupId)).thenReturn(Optional.of(GroupFinanceConfig.builder()
                .groupId(groupId).useContributionPeriods(true).build()));
        when(periodRepository.findFirstByGroupIdAndStatus(groupId, ContributionPeriodStatus.ACTIVE)).thenReturn(Optional.empty());
        when(memberRepository.findByGroupIdAndUserId(groupId, actorId)).thenReturn(Optional.of(GroupMember.builder()
                .groupId(groupId).userId(actorId).role(MemberRole.OWNER).build()));
        when(periodRepository.save(any())).thenAnswer(invocation -> {
            ContributionPeriod period = invocation.getArgument(0);
            period.setId(UUID.fromString("30000000-0000-0000-0000-000000000000"));
            return period;
        });
        when(obligationRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<MemberContributionObligation> rows = invocation.getArgument(0);
            savedObligations.set(rows);
            return rows;
        });
        when(obligationRepository.findByPeriodIdOrderByCreatedAtAsc(any())).thenAnswer(invocation -> savedObligations.get());
    }

    @Test
    void equalAllocationPreservesEveryDongUsingDeterministicRemainder() {
        UUID first = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID second = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID third = UUID.fromString("00000000-0000-0000-0000-000000000003");
        stubMember(first); stubMember(second); stubMember(third);

        var response = service.create(groupId, request("EQUAL", new BigDecimal("100000"),
                item(third, "0", null), item(first, "0", null), item(second, "0", null)), actorId);

        assertEquals(new BigDecimal("100000"), response.getRequiredTotal());
        Map<UUID, BigDecimal> amounts = new HashMap<>();
        savedObligations.get().forEach(row -> amounts.put(row.getUserId(), row.getRequiredAmount()));
        assertEquals(new BigDecimal("33334"), amounts.get(first));
        assertEquals(new BigDecimal("33333"), amounts.get(second));
        assertEquals(new BigDecimal("33333"), amounts.get(third));
    }

    @Test
    void percentageAllocationUsesLargestRemainderAndTotalsExactly() {
        UUID first = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID second = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID third = UUID.fromString("00000000-0000-0000-0000-000000000003");
        stubMember(first); stubMember(second); stubMember(third);

        var response = service.create(groupId, request("PERCENTAGE", new BigDecimal("100001"),
                item(first, "0", "50"), item(second, "0", "30"), item(third, "0", "20")), actorId);

        assertEquals(new BigDecimal("100001"), response.getRequiredTotal());
        assertEquals(new BigDecimal("100001"), savedObligations.get().stream()
                .map(MemberContributionObligation::getRequiredAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    @Test
    void voluntaryPeriodCreatesNoMemberDebt() {
        UUID member = UUID.fromString("00000000-0000-0000-0000-000000000001");
        stubMember(member);

        var response = service.create(groupId, request("VOLUNTARY", null, item(member, "999999", null)), actorId);

        assertEquals(BigDecimal.ZERO, response.getRequiredTotal());
        assertEquals(BigDecimal.ZERO, savedObligations.get().get(0).getRequiredAmount());
        assertEquals(BigDecimal.ZERO, response.getOutstandingAmount());
    }

    private void stubMember(UUID userId) {
        when(memberRepository.findByGroupIdAndUserId(groupId, userId)).thenReturn(Optional.of(GroupMember.builder()
                .groupId(groupId).userId(userId).role(MemberRole.MEMBER).isChildProfile(false).build()));
    }

    private CreateContributionPeriodRequest request(String method, BigDecimal target,
            CreateContributionPeriodRequest.MemberObligation... members) {
        CreateContributionPeriodRequest request = new CreateContributionPeriodRequest();
        request.setName("Monthly fund");
        request.setStartDate(LocalDate.of(2026, 11, 1));
        request.setDueDate(LocalDate.of(2026, 11, 30));
        request.setAllocationMethod(method);
        request.setFrequency("ONCE");
        request.setFundraisingTarget(target);
        request.setMembers(List.of(members));
        return request;
    }

    private CreateContributionPeriodRequest.MemberObligation item(UUID userId, String amount, String percentage) {
        CreateContributionPeriodRequest.MemberObligation item = new CreateContributionPeriodRequest.MemberObligation();
        item.setUserId(userId);
        item.setAmount(new BigDecimal(amount));
        if (percentage != null) item.setPercentage(new BigDecimal(percentage));
        return item;
    }
}
