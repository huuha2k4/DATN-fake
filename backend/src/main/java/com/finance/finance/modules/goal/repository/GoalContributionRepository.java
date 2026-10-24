package com.finance.finance.modules.goal.repository;

import com.finance.finance.modules.goal.entity.GoalContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface GoalContributionRepository extends JpaRepository<GoalContribution, UUID> {

    @Query("SELECT gc FROM GoalContribution gc WHERE gc.goal.id = :goalId " +
           "ORDER BY gc.contributedAt DESC")
    List<GoalContribution> findByGoalId(@Param("goalId") UUID goalId);

    @Query("SELECT gc FROM GoalContribution gc WHERE gc.goal.id = :goalId " +
           "AND gc.contributedAt BETWEEN :startDate AND :endDate " +
           "ORDER BY gc.contributedAt ASC")
    List<GoalContribution> findByGoalIdAndDateRange(
            @Param("goalId") UUID goalId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COALESCE(SUM(gc.amount), 0) FROM GoalContribution gc " +
           "WHERE gc.goal.id = :goalId")
    BigDecimal calculateTotalContributions(@Param("goalId") UUID goalId);

    @Query("SELECT COUNT(gc) FROM GoalContribution gc WHERE gc.goal.id = :goalId")
    Long countByGoalId(@Param("goalId") UUID goalId);

    @Query("SELECT gc FROM GoalContribution gc WHERE gc.goal.userId = :userId " +
           "ORDER BY gc.contributedAt DESC")
    List<GoalContribution> findByUserId(@Param("userId") UUID userId);
}
