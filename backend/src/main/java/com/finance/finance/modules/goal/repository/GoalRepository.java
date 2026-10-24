package com.finance.finance.modules.goal.repository;

import com.finance.finance.common.enums.GoalStatus;
import com.finance.finance.common.enums.GoalType;
import com.finance.finance.modules.goal.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    @Query("SELECT g FROM Goal g WHERE g.id = :id AND g.userId = :userId AND g.deletedAt IS NULL")
    Optional<Goal> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId AND g.deletedAt IS NULL " +
           "ORDER BY g.createdAt DESC")
    List<Goal> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId AND g.status = :status AND g.deletedAt IS NULL " +
           "ORDER BY g.createdAt DESC")
    List<Goal> findByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") GoalStatus status);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId " +
           "AND g.status = 'IN_PROGRESS' AND g.deletedAt IS NULL " +
           "ORDER BY g.targetDate ASC NULLS LAST")
    List<Goal> findActiveGoals(@Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId AND g.goalType = :goalType " +
           "AND g.deletedAt IS NULL ORDER BY g.createdAt DESC")
    List<Goal> findByGoalType(@Param("userId") UUID userId, @Param("goalType") GoalType goalType);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId " +
           "AND g.status = 'IN_PROGRESS' AND g.deletedAt IS NULL " +
           "AND g.targetDate IS NOT NULL AND g.targetDate < :date " +
           "ORDER BY g.targetDate ASC")
    List<Goal> findOverdueGoals(@Param("userId") UUID userId, @Param("date") LocalDate date);

    @Query("SELECT g FROM Goal g WHERE g.userId = :userId " +
           "AND g.autoSaveEnabled = true AND g.status = 'IN_PROGRESS' " +
           "AND g.deletedAt IS NULL " +
           "AND g.nextContributionDate <= :date")
    List<Goal> findGoalsForAutoSave(@Param("userId") UUID userId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.userId = :userId " +
           "AND g.status = :status AND g.deletedAt IS NULL")
    Long countByStatus(@Param("userId") UUID userId, @Param("status") GoalStatus status);

    @Query("SELECT g.status, COUNT(g) FROM Goal g " +
           "WHERE g.userId = :userId AND g.deletedAt IS NULL " +
           "GROUP BY g.status")
    List<Object[]> countByStatusGrouped(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(g.targetAmount), 0) FROM Goal g " +
           "WHERE g.userId = :userId AND g.deletedAt IS NULL")
    BigDecimal calculateTotalTarget(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(g.currentAmount), 0) FROM Goal g " +
           "WHERE g.userId = :userId AND g.deletedAt IS NULL")
    BigDecimal calculateTotalSaved(@Param("userId") UUID userId);

    @Query("SELECT g.goalType, COUNT(g), " +
           "COALESCE(SUM(g.targetAmount), 0), COALESCE(SUM(g.currentAmount), 0) " +
           "FROM Goal g WHERE g.userId = :userId AND g.deletedAt IS NULL " +
           "GROUP BY g.goalType")
    List<Object[]> getSummaryByType(@Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g LEFT JOIN FETCH g.contributions " +
           "WHERE g.id = :id AND g.userId = :userId AND g.deletedAt IS NULL")
    Optional<Goal> findByIdWithContributions(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g LEFT JOIN FETCH g.milestones " +
           "WHERE g.id = :id AND g.userId = :userId AND g.deletedAt IS NULL")
    Optional<Goal> findByIdWithMilestones(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT g FROM Goal g " +
           "LEFT JOIN FETCH g.contributions " +
           "LEFT JOIN FETCH g.milestones " +
           "WHERE g.id = :id AND g.userId = :userId AND g.deletedAt IS NULL")
    Optional<Goal> findByIdWithAll(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(g) > 0 THEN true ELSE false END FROM Goal g " +
           "WHERE LOWER(g.name) = LOWER(:name) AND g.userId = :userId " +
           "AND g.deletedAt IS NULL " +
           "AND (:goalId IS NULL OR g.id != :goalId)")
    Boolean existsByNameAndUserId(@Param("name") String name, 
                                   @Param("userId") UUID userId, 
                                   @Param("goalId") UUID goalId);
}
