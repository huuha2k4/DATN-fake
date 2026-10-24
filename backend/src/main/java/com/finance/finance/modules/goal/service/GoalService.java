package com.finance.finance.modules.goal.service;

import com.finance.finance.common.enums.GoalStatus;
import com.finance.finance.modules.goal.dto.request.*;
import com.finance.finance.modules.goal.dto.response.*;
import com.finance.finance.modules.goal.entity.Goal;
import com.finance.finance.modules.goal.entity.GoalContribution;
import com.finance.finance.modules.goal.entity.GoalMilestone;
import com.finance.finance.modules.goal.exception.GoalNotFoundException;
import com.finance.finance.modules.goal.repository.GoalContributionRepository;
import com.finance.finance.modules.goal.repository.GoalMilestoneRepository;
import com.finance.finance.modules.goal.repository.GoalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoalService {

    private final GoalRepository goalRepository;
    private final GoalContributionRepository contributionRepository;
    private final GoalMilestoneRepository milestoneRepository;

    @Transactional
    public GoalResponse createGoal(UUID userId, CreateGoalRequest request) {
        log.info("Creating goal for user: {}, name: {}", userId, request.getName());

        // Validate target date
        if (request.getTargetDate() != null && request.getTargetDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Ngày mục tiêu phải trong tương lai");
        }

        // Check duplicate name
        if (goalRepository.existsByNameAndUserId(request.getName(), userId, null)) {
            throw new IllegalArgumentException("Mục tiêu '" + request.getName() + "' đã tồn tại");
        }

        Goal goal = Goal.builder()
                .userId(userId)
                .name(request.getName())
                .goalType(request.getGoalType())
                .targetAmount(request.getTargetAmount())
                .currentAmount(request.getCurrentAmount())
                .currencyCode(request.getCurrencyCode())
                .targetDate(request.getTargetDate())
                .priority(request.getPriority())
                .icon(request.getIcon())
                .color(request.getColor())
                .description(request.getDescription())
                .autoSaveEnabled(request.getAutoSaveEnabled())
                .autoSaveAmount(request.getAutoSaveAmount())
                .autoSaveFrequency(request.getAutoSaveFrequency())
                .accountId(request.getAccountId())
                .status(GoalStatus.IN_PROGRESS)
                .build();

        boolean autoSave = Boolean.TRUE.equals(request.getAutoSaveEnabled());
        goal.setAutoSaveEnabled(autoSave);

        // Calculate next contribution date if auto save enabled
        if (autoSave && request.getAutoSaveFrequency() != null) {
            goal.setNextContributionDate(calculateNextContributionDate(request.getAutoSaveFrequency()));
        }

        goal = goalRepository.save(goal);
        log.info("Goal created: {}", goal.getId());

        return mapToResponse(goal, false);
    }

    @Transactional(readOnly = true)
    public GoalListResponse getGoals(UUID userId, GoalStatus status) {
        log.info("Getting goals for user: {}", userId);

        List<Goal> goals = status != null 
                ? goalRepository.findByUserIdAndStatus(userId, status)
                : goalRepository.findAllByUserId(userId);

        List<GoalListResponse.GoalSummaryItem> items = goals.stream()
                .map(this::mapToSummaryItem)
                .collect(Collectors.toList());

        // Calculate summary
        BigDecimal totalTarget = goalRepository.calculateTotalTarget(userId);
        BigDecimal totalSaved = goalRepository.calculateTotalSaved(userId);
        Long inProgress = goalRepository.countByStatus(userId, GoalStatus.IN_PROGRESS);
        Long completed = goalRepository.countByStatus(userId, GoalStatus.ACHIEVED);

        GoalListResponse.Summary summary = GoalListResponse.Summary.builder()
                .totalGoals(goals.size())
                .inProgress(inProgress.intValue())
                .completed(completed.intValue())
                .totalTarget(totalTarget)
                .totalSaved(totalSaved)
                .build();

        return GoalListResponse.builder()
                .goals(items)
                .summary(summary)
                .build();
    }

    @Transactional(readOnly = true)
    public GoalResponse getGoalById(UUID userId, UUID goalId) {
        log.info("Getting goal: {}", goalId);

        Goal goal = goalRepository.findByIdWithAll(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        return mapToResponse(goal, true);
    }

    @Transactional
    public GoalResponse updateGoal(UUID userId, UUID goalId, UpdateGoalRequest request) {
        log.info("Updating goal: {}", goalId);

        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        // Check version
        if (!goal.getVersion().equals(request.getVersion())) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        // Update fields
        if (request.getName() != null) goal.setName(request.getName());
        if (request.getTargetAmount() != null) goal.setTargetAmount(request.getTargetAmount());
        if (request.getTargetDate() != null) goal.setTargetDate(request.getTargetDate());
        if (request.getPriority() != null) goal.setPriority(request.getPriority());
        if (request.getIcon() != null) goal.setIcon(request.getIcon());
        if (request.getColor() != null) goal.setColor(request.getColor());
        if (request.getDescription() != null) goal.setDescription(request.getDescription());
        if (request.getAutoSaveEnabled() != null) goal.setAutoSaveEnabled(request.getAutoSaveEnabled());
        if (request.getAutoSaveAmount() != null) goal.setAutoSaveAmount(request.getAutoSaveAmount());
        if (request.getAutoSaveFrequency() != null) goal.setAutoSaveFrequency(request.getAutoSaveFrequency());
        if (request.getAccountId() != null) goal.setAccountId(request.getAccountId());

        goal = goalRepository.save(goal);
        return mapToResponse(goal, false);
    }

    @Transactional
    public void deleteGoal(UUID userId, UUID goalId) {
        log.info("Deleting goal: {}", goalId);

        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        goal.softDelete();
        goalRepository.save(goal);
    }

    @Transactional
    public ContributeResponse contribute(UUID userId, UUID goalId, ContributeRequest request) {
        log.info("Contributing to goal: {}, amount: {}", goalId, request.getAmount());

        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        if (goal.getStatus() != GoalStatus.IN_PROGRESS) {
            throw new IllegalStateException("Chỉ có thể đóng góp vào mục tiêu đang thực hiện");
        }

        GoalContribution contribution = GoalContribution.builder()
                .goal(goal)
                .amount(request.getAmount())
                .note(request.getNote())
                .sourceAccountId(request.getSourceAccountId())
                .build();

        contribution = contributionRepository.save(contribution);
        
        // Update goal current amount
        goal.setCurrentAmount(goal.getCurrentAmount().add(request.getAmount()));
        
        // Check if goal is achieved
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus(GoalStatus.ACHIEVED);
            goal.setCompletedAt(LocalDateTime.now());
        }
        
        // Check and mark milestones as achieved
        checkAndUpdateMilestones(goal);
        
        goalRepository.save(goal);

        return ContributeResponse.builder()
                .contributionId(contribution.getId())
                .goalId(goalId)
                .amount(request.getAmount())
                .newCurrentAmount(goal.getCurrentAmount())
                .newPercentage(goal.getPercentageComplete())
                .remaining(goal.getRemaining())
                .contributedAt(contribution.getContributedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public GoalProgressResponse getGoalProgress(UUID userId, UUID goalId) {
        log.info("Getting goal progress: {}", goalId);

        Goal goal = goalRepository.findByIdWithContributions(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        // Calculate current status
        Double expectedPercentage = calculateExpectedPercentage(goal);
        Double currentPercentage = goal.getPercentageComplete();
        Boolean onTrack = currentPercentage >= expectedPercentage;

        GoalProgressResponse.CurrentStatus currentStatus = GoalProgressResponse.CurrentStatus.builder()
                .percentageComplete(currentPercentage)
                .onTrack(onTrack)
                .expectedPercentageByNow(expectedPercentage)
                .behindByPercentage(expectedPercentage - currentPercentage)
                .build();

        // Calculate forecast
        LocalDate forecastDate = calculateForecastDate(goal);
        Integer behindDays = goal.getTargetDate() != null ? 
                (int) ChronoUnit.DAYS.between(goal.getTargetDate(), forecastDate) : 0;

        GoalProgressResponse.Forecast forecast = GoalProgressResponse.Forecast.builder()
                .expectedCompletionDate(forecastDate)
                .behindScheduleDays(Math.max(0, behindDays))
                .needToSaveMonthly(goal.getSuggestedMonthlySaving())
                .build();

        // Build history
        List<GoalProgressResponse.HistoryPoint> history = goal.getContributions().stream()
                .map(c -> GoalProgressResponse.HistoryPoint.builder()
                        .date(c.getContributedAt().toLocalDate())
                        .amount(c.getAmount())
                        .percentage(null) // TODO: Calculate percentage at that time
                        .build())
                .collect(Collectors.toList());

        return GoalProgressResponse.builder()
                .goal(GoalProgressResponse.GoalInfo.builder()
                        .id(goal.getId())
                        .name(goal.getName())
                        .build())
                .currentStatus(currentStatus)
                .forecast(forecast)
                .history(history)
                .chartData(new ArrayList<>()) // TODO: Generate chart data
                .build();
    }

    @Transactional
    public GoalResponse.MilestoneInfo createMilestone(UUID userId, UUID goalId, CreateMilestoneRequest request) {
        log.info("Creating milestone for goal: {}", goalId);

        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        // Check duplicate percentage
        if (milestoneRepository.existsByGoalIdAndPercentage(goalId, request.getPercentage(), null)) {
            throw new IllegalArgumentException("Milestone " + request.getPercentage() + "% đã tồn tại");
        }

        GoalMilestone milestone = GoalMilestone.builder()
                .goal(goal)
                .name(request.getName())
                .percentage(request.getPercentage())
                .targetAmount(request.getTargetAmount())
                .reward(request.getReward())
                .build();

        milestone = milestoneRepository.save(milestone);

        return mapMilestoneToResponse(milestone);
    }

    @Transactional
    public GoalResponse completeGoal(UUID userId, UUID goalId, CompleteGoalRequest request) {
        log.info("Completing goal: {}", goalId);

        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new GoalNotFoundException("Không tìm thấy mục tiêu"));

        goal.complete(request.getCompletedNote(), request.getActualAmountUsed());
        goalRepository.save(goal);

        return mapToResponse(goal, false);
    }

    @Transactional(readOnly = true)
    public GoalSummaryResponse getGoalsSummary(UUID userId) {
        log.info("Getting goals summary for user: {}", userId);

        List<Object[]> statusCounts = goalRepository.countByStatusGrouped(userId);
        Map<GoalStatus, Long> statusMap = statusCounts.stream()
                .collect(Collectors.toMap(
                        row -> (GoalStatus) row[0],
                        row -> ((Number) row[1]).longValue()
                ));

        Long totalGoals = statusMap.values().stream().mapToLong(Long::longValue).sum();
        Long inProgress = statusMap.getOrDefault(GoalStatus.IN_PROGRESS, 0L);
        Long completed = statusMap.getOrDefault(GoalStatus.ACHIEVED, 0L);

        BigDecimal totalTarget = goalRepository.calculateTotalTarget(userId);
        BigDecimal totalSaved = goalRepository.calculateTotalSaved(userId);
        Double overallProgress = totalTarget.compareTo(BigDecimal.ZERO) > 0 ?
                totalSaved.divide(totalTarget, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

        // Calculate on track vs behind
        List<Goal> activeGoals = goalRepository.findActiveGoals(userId);
        long onTrack = activeGoals.stream()
                .filter(g -> g.getPercentageComplete() >= calculateExpectedPercentage(g))
                .count();
        long behindSchedule = activeGoals.size() - onTrack;

        GoalSummaryResponse.Summary summary = GoalSummaryResponse.Summary.builder()
                .totalGoals(totalGoals.intValue())
                .inProgress(inProgress.intValue())
                .completed(completed.intValue())
                .onTrack((int) onTrack)
                .behindSchedule((int) behindSchedule)
                .totalTargetAmount(totalTarget)
                .totalSaved(totalSaved)
                .overallProgress(overallProgress)
                .build();

        // By type
        List<Object[]> byTypeData = goalRepository.getSummaryByType(userId);
        List<GoalSummaryResponse.ByType> byType = byTypeData.stream()
                .map(row -> GoalSummaryResponse.ByType.builder()
                        .type((com.finance.finance.common.enums.GoalType) row[0])
                        .count(((Number) row[1]).intValue())
                        .totalTarget((BigDecimal) row[2])
                        .totalSaved((BigDecimal) row[3])
                        .build())
                .collect(Collectors.toList());

        return GoalSummaryResponse.builder()
                .summary(summary)
                .byType(byType)
                .upcomingMilestones(new ArrayList<>()) // TODO: Implement
                .build();
    }

    // Helper methods
    private GoalListResponse.GoalSummaryItem mapToSummaryItem(Goal goal) {
        return GoalListResponse.GoalSummaryItem.builder()
                .id(goal.getId())
                .name(goal.getName())
                .goalType(goal.getGoalType())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .percentageComplete(goal.getPercentageComplete())
                .status(goal.getStatus())
                .targetDate(goal.getTargetDate())
                .daysRemaining(goal.getDaysRemaining())
                .icon(goal.getIcon())
                .color(goal.getColor())
                .build();
    }

    private GoalResponse mapToResponse(Goal goal, boolean includeDetails) {
        GoalResponse.GoalResponseBuilder builder = GoalResponse.builder()
                .id(goal.getId())
                .name(goal.getName())
                .goalType(goal.getGoalType())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .remaining(goal.getRemaining())
                .percentageComplete(goal.getPercentageComplete())
                .currencyCode(goal.getCurrencyCode())
                .status(goal.getStatus())
                .priority(goal.getPriority())
                .icon(goal.getIcon())
                .color(goal.getColor())
                .description(goal.getDescription())
                .targetDate(goal.getTargetDate())
                .daysTotal(goal.getDaysTotal())
                .daysElapsed(goal.getDaysElapsed())
                .daysRemaining(goal.getDaysRemaining())
                .suggestedMonthlySaving(goal.getSuggestedMonthlySaving())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .version(goal.getVersion());

        // Auto save settings
        if (goal.getAutoSaveEnabled()) {
            builder.autoSave(GoalResponse.AutoSaveSettings.builder()
                    .enabled(goal.getAutoSaveEnabled())
                    .amount(goal.getAutoSaveAmount())
                    .frequency(goal.getAutoSaveFrequency())
                    .nextContributionDate(goal.getNextContributionDate())
                    .build());
        }

        // Progress info
        Double expectedPercentage = calculateExpectedPercentage(goal);
        builder.progress(GoalResponse.ProgressInfo.builder()
                .onTrack(goal.getPercentageComplete() >= expectedPercentage)
                .expectedAmountByNow(goal.getTargetAmount().multiply(BigDecimal.valueOf(expectedPercentage / 100)))
                .aheadBehind(goal.getCurrentAmount().subtract(goal.getTargetAmount().multiply(BigDecimal.valueOf(expectedPercentage / 100))))
                .completionForecastDate(calculateForecastDate(goal))
                .build());

        if (includeDetails) {
            // Contributions
            builder.contributions(goal.getContributions().stream()
                    .map(this::mapContributionToResponse)
                    .collect(Collectors.toList()));

            // Milestones
            builder.milestones(goal.getMilestones().stream()
                    .map(this::mapMilestoneToResponse)
                    .collect(Collectors.toList()));
        }

        // Completion info
        if (goal.getStatus() == GoalStatus.ACHIEVED) {
            builder.completedAt(goal.getCompletedAt())
                    .completedNote(goal.getCompletedNote())
                    .actualAmountUsed(goal.getActualAmountUsed())
                    .leftover(goal.getCurrentAmount().subtract(goal.getActualAmountUsed() != null ? goal.getActualAmountUsed() : BigDecimal.ZERO));
        }

        return builder.build();
    }

    private GoalResponse.ContributionInfo mapContributionToResponse(GoalContribution contribution) {
        return GoalResponse.ContributionInfo.builder()
                .id(contribution.getId())
                .amount(contribution.getAmount())
                .note(contribution.getNote())
                .contributedAt(contribution.getContributedAt())
                .build();
    }

    private GoalResponse.MilestoneInfo mapMilestoneToResponse(GoalMilestone milestone) {
        return GoalResponse.MilestoneInfo.builder()
                .id(milestone.getId())
                .name(milestone.getName())
                .percentage(milestone.getPercentage())
                .targetAmount(milestone.getTargetAmount())
                .achieved(milestone.getAchieved())
                .achievedAt(milestone.getAchievedAt())
                .reward(milestone.getReward())
                .build();
    }

    private Double calculateExpectedPercentage(Goal goal) {
        if (goal.getTargetDate() == null || goal.getCreatedAt() == null) return 0.0;
        
        long totalDays = ChronoUnit.DAYS.between(goal.getCreatedAt().toLocalDate(), goal.getTargetDate());
        long elapsedDays = ChronoUnit.DAYS.between(goal.getCreatedAt().toLocalDate(), LocalDate.now());
        
        if (totalDays <= 0) return 100.0;
        return Math.min(100.0, (double) elapsedDays / totalDays * 100);
    }

    private LocalDate calculateForecastDate(Goal goal) {
        if (goal.getCreatedAt() == null) return LocalDate.now();
        
        long daysElapsed = ChronoUnit.DAYS.between(goal.getCreatedAt().toLocalDate(), LocalDate.now());
        if (daysElapsed == 0) return goal.getTargetDate();
        
        double dailyProgress = goal.getCurrentAmount().doubleValue() / daysElapsed;
        double daysNeeded = goal.getTargetAmount().doubleValue() / dailyProgress;
        
        return goal.getCreatedAt().toLocalDate().plusDays((long) daysNeeded);
    }

    private LocalDate calculateNextContributionDate(com.finance.finance.common.enums.AutoSaveFrequency frequency) {
        LocalDate now = LocalDate.now();
        switch (frequency) {
            case DAILY: return now.plusDays(1);
            case WEEKLY: return now.plusWeeks(1);
            case MONTHLY: return now.plusMonths(1);
            case QUARTERLY: return now.plusMonths(3);
            default: return now.plusMonths(1);
        }
    }

    private void checkAndUpdateMilestones(Goal goal) {
        List<GoalMilestone> milestones = milestoneRepository.findUnachievedMilestones(goal.getId());
        Double currentPercentage = goal.getPercentageComplete();
        
        for (GoalMilestone milestone : milestones) {
            if (currentPercentage >= milestone.getPercentage()) {
                milestoneRepository.markAsAchieved(milestone.getId());
            }
        }
    }
}
