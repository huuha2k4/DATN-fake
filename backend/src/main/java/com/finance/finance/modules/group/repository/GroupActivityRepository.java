package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.modules.group.entity.GroupActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface GroupActivityRepository extends JpaRepository<GroupActivity, UUID> {
    
    Page<GroupActivity> findByGroupIdOrderByCreatedAtDesc(@Param("groupId") UUID groupId, Pageable pageable);
    
    Page<GroupActivity> findByGroupIdAndActivityTypeOrderByCreatedAtDesc(@Param("groupId") UUID groupId,
                                                                           @Param("activityType") ActivityType activityType,
                                                                           Pageable pageable);
    
    Page<GroupActivity> findByGroupIdAndUserIdOrderByCreatedAtDesc(@Param("groupId") UUID groupId,
                                                                     @Param("userId") UUID userId,
                                                                     Pageable pageable);
    
    Page<GroupActivity> findByGroupIdAndActivityTypeAndUserIdOrderByCreatedAtDesc(@Param("groupId") UUID groupId,
                                                                                    @Param("activityType") ActivityType activityType,
                                                                                    @Param("userId") UUID userId,
                                                                                    Pageable pageable);
    
    Page<GroupActivity> findByGroupIdAndCreatedAtBetweenOrderByCreatedAtDesc(@Param("groupId") UUID groupId,
                                                                               @Param("startDate") LocalDateTime startDate,
                                                                               @Param("endDate") LocalDateTime endDate,
                                                                               Pageable pageable);
    
    long countByGroupId(@Param("groupId") UUID groupId);
    
    long countByGroupIdAndActivityType(@Param("groupId") UUID groupId,
                                        @Param("activityType") ActivityType activityType);
    
    long countByGroupIdAndCreatedAtAfter(@Param("groupId") UUID groupId,
                                          @Param("after") LocalDateTime after);
}
