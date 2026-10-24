package com.finance.finance.modules.goal.repository;

import com.finance.finance.modules.goal.entity.GoalMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoalMilestoneRepository extends JpaRepository<GoalMilestone, UUID> {

    @Query("SELECT gm FROM GoalMilestone gm WHERE gm.goal.id = :goalId " +
           "ORDER BY gm.percentage ASC")
    List<GoalMilestone> findByGoalId(@Param("goalId") UUID goalId);

    @Query("SELECT gm FROM GoalMilestone gm WHERE gm.id = :id AND gm.goal.id = :goalId")
    Optional<GoalMilestone> findByIdAndGoalId(@Param("id") UUID id, @Param("goalId") UUID goalId);

    @Query("SELECT gm FROM GoalMilestone gm WHERE gm.goal.id = :goalId " +
           "AND gm.achieved = false ORDER BY gm.percentage ASC")
    List<GoalMilestone> findUnachievedMilestones(@Param("goalId") UUID goalId);

    @Query("SELECT gm FROM GoalMilestone gm WHERE gm.goal.id = :goalId " +
           "AND gm.achieved = true ORDER BY gm.achievedAt DESC")
    List<GoalMilestone> findAchievedMilestones(@Param("goalId") UUID goalId);

    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END FROM GoalMilestone gm " +
           "WHERE gm.goal.id = :goalId AND gm.percentage = :percentage " +
           "AND (:milestoneId IS NULL OR gm.id != :milestoneId)")
    Boolean existsByGoalIdAndPercentage(@Param("goalId") UUID goalId, 
                                        @Param("percentage") Integer percentage,
                                        @Param("milestoneId") UUID milestoneId);

    @Modifying
    @Query("UPDATE GoalMilestone gm SET gm.achieved = true, gm.achievedAt = CURRENT_TIMESTAMP " +
           "WHERE gm.id = :milestoneId")
    void markAsAchieved(@Param("milestoneId") UUID milestoneId);

    @Query("SELECT COUNT(gm) FROM GoalMilestone gm WHERE gm.goal.id = :goalId")
    Long countByGoalId(@Param("goalId") UUID goalId);

    @Query("SELECT COUNT(gm) FROM GoalMilestone gm WHERE gm.goal.id = :goalId AND gm.achieved = true")
    Long countAchievedByGoalId(@Param("goalId") UUID goalId);
}
