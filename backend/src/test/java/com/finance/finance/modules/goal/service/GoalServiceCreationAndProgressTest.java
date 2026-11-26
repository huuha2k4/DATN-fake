package com.finance.finance.modules.goal.service;

import com.finance.finance.common.enums.GoalType;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.goal.dto.request.ContributeRequest;
import com.finance.finance.modules.goal.dto.request.CreateGoalRequest;
import com.finance.finance.modules.goal.dto.response.ContributeResponse;
import com.finance.finance.modules.goal.dto.response.GoalResponse;
import com.finance.finance.modules.goal.entity.Goal;
import com.finance.finance.modules.goal.entity.GoalContribution;
import com.finance.finance.modules.goal.repository.GoalContributionRepository;
import com.finance.finance.modules.goal.repository.GoalRepository;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.transaction.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalServiceCreationAndProgressTest {

    @Mock GoalRepository goalRepository;
    @Mock GoalContributionRepository contributionRepository;
    @Mock TransactionService transactionService;
    @Mock AccountRepository accountRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock NotificationService notificationService;
    @Mock ChildWalletRepository childWalletRepository;
    @Mock ChildSpendRequestRepository childSpendRequestRepository;

    @InjectMocks GoalService goalService;

    @Test
    void createGoalWithNullCurrentAmountDefaultsToZeroWithoutNpe() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = new CreateGoalRequest();
        req.setName("Emergency Fund");
        req.setGoalType(GoalType.EMERGENCY_FUND);
        req.setTargetAmount(new BigDecimal("1000000"));
        req.setCurrentAmount(null);
        req.setCurrencyCode("VND");
        req.setTargetDate(LocalDate.now().plusMonths(6));

        when(goalRepository.existsByNameAndUserId("Emergency Fund", userId, null)).thenReturn(false);
        when(goalRepository.save(any(Goal.class))).thenAnswer(inv -> {
            Goal g = inv.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });

        GoalResponse res = goalService.createGoal(userId, req);

        assertEquals(0, BigDecimal.ZERO.compareTo(res.getCurrentAmount()));
        assertEquals(0, new BigDecimal("1000000").compareTo(res.getRemaining()));
        assertEquals(0.0, res.getPercentageComplete());
        assertEquals(com.finance.finance.common.enums.GoalPriority.MEDIUM, res.getPriority());
        verify(contributionRepository, never()).save(any());
    }

    @Test
    void createGoalWithZeroCurrentAmountDoesNotCreateInitialContribution() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = CreateGoalRequest.builder()
                .name("Laptop")
                .goalType(GoalType.PURCHASE)
                .targetAmount(new BigDecimal("20000000"))
                .currentAmount(BigDecimal.ZERO)
                .currencyCode("VND")
                .build();

        when(goalRepository.existsByNameAndUserId("Laptop", userId, null)).thenReturn(false);
        when(goalRepository.save(any(Goal.class))).thenAnswer(inv -> {
            Goal g = inv.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });

        GoalResponse res = goalService.createGoal(userId, req);

        assertEquals(0, BigDecimal.ZERO.compareTo(res.getCurrentAmount()));
        assertEquals(0, new BigDecimal("20000000").compareTo(res.getRemaining()));
        verify(contributionRepository, never()).save(any());
    }

    @Test
    void createGoalWithValidInitialAmountCreatesContributionAndComputesProgress() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = CreateGoalRequest.builder()
                .name("Vacation")
                .goalType(GoalType.VACATION)
                .targetAmount(new BigDecimal("10000000"))
                .currentAmount(new BigDecimal("2500000"))
                .currencyCode("VND")
                .build();

        when(goalRepository.existsByNameAndUserId("Vacation", userId, null)).thenReturn(false);
        when(goalRepository.save(any(Goal.class))).thenAnswer(inv -> {
            Goal g = inv.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });

        GoalResponse res = goalService.createGoal(userId, req);

        assertEquals(0, new BigDecimal("2500000").compareTo(res.getCurrentAmount()));
        assertEquals(0, new BigDecimal("7500000").compareTo(res.getRemaining()));
        assertEquals(25.0, res.getPercentageComplete());
        verify(contributionRepository).save(any(GoalContribution.class));
    }

    @Test
    void createGoalRejectsNegativeCurrentAmount() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = CreateGoalRequest.builder()
                .name("Invalid Negative")
                .goalType(GoalType.EMERGENCY_FUND)
                .targetAmount(new BigDecimal("1000000"))
                .currentAmount(new BigDecimal("-100"))
                .currencyCode("VND")
                .build();

        assertThrows(IllegalArgumentException.class, () -> goalService.createGoal(userId, req));
        verify(goalRepository, never()).save(any());
    }

    @Test
    void createGoalRejectsCurrentAmountExceedingTarget() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = CreateGoalRequest.builder()
                .name("Over Target")
                .goalType(GoalType.EMERGENCY_FUND)
                .targetAmount(new BigDecimal("1000000"))
                .currentAmount(new BigDecimal("1500000"))
                .currencyCode("VND")
                .build();

        assertThrows(IllegalArgumentException.class, () -> goalService.createGoal(userId, req));
        verify(goalRepository, never()).save(any());
    }

    @Test
    void createGoalRejectsAmountExceedingDbPrecisionLimit() {
        UUID userId = UUID.randomUUID();
        CreateGoalRequest req = CreateGoalRequest.builder()
                .name("Overflow")
                .goalType(GoalType.EMERGENCY_FUND)
                .targetAmount(new BigDecimal("9999999999999999"))
                .currentAmount(BigDecimal.ZERO)
                .currencyCode("VND")
                .build();

        assertThrows(IllegalArgumentException.class, () -> goalService.createGoal(userId, req));
        verify(goalRepository, never()).save(any());
    }

    @Test
    void contributeUpdatesAmountRemainingAndTriggersMilestoneNotification() {
        UUID userId = UUID.randomUUID();
        UUID goalId = UUID.randomUUID();
        Goal goal = Goal.builder()
                .id(goalId)
                .userId(userId)
                .name("House")
                .goalType(GoalType.PURCHASE)
                .targetAmount(new BigDecimal("1000000"))
                .currentAmount(BigDecimal.ZERO)
                .currencyCode("VND")
                .build();

        when(goalRepository.findByIdAndUserId(goalId, userId)).thenReturn(Optional.of(goal));
        when(contributionRepository.save(any(GoalContribution.class))).thenAnswer(inv -> {
            GoalContribution c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        ContributeRequest contribReq = new ContributeRequest();
        contribReq.setAmount(new BigDecimal("500000"));
        contribReq.setNote("Halfway");

        ContributeResponse res = goalService.contribute(userId, goalId, contribReq);

        assertEquals(0, new BigDecimal("500000").compareTo(res.getNewCurrentAmount()));
        assertEquals(0, new BigDecimal("500000").compareTo(res.getRemaining()));
        assertEquals(50.0, res.getNewPercentage());
        verify(notificationService).createNotification(eq(userId),
                eq(com.finance.finance.common.enums.NotificationType.GOAL_MILESTONE),
                any(), any(), any(), any(), any());
    }
}
