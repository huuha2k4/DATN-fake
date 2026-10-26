package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.response.ActivityResponse;
import com.finance.finance.modules.group.entity.GroupActivity;
import com.finance.finance.modules.group.repository.GroupActivityRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupActivityService {

    private final GroupActivityRepository activityRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Transactional
    public void logActivity(UUID groupId, ActivityType activityType, UUID userId, String description, Map<String, Object> metadata) {
        GroupActivity activity = GroupActivity.builder()
                .groupId(groupId)
                .activityType(activityType)
                .userId(userId)
                .description(description)
                .metadata(null) // TODO: Serialize to JSON
                .createdAt(LocalDateTime.now())
                .build();

        activityRepository.save(activity);
    }

    @Transactional(readOnly = true)
    public Page<ActivityResponse> getActivities(UUID groupId, ActivityType activityType, UUID userId, 
                                               LocalDateTime startDate, LocalDateTime endDate, 
                                               Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        Page<GroupActivity> activities;

        // Build query based on filters
        if (activityType != null && userId != null) {
            activities = activityRepository.findByGroupIdAndActivityTypeAndUserIdOrderByCreatedAtDesc(
                    groupId, activityType, userId, pageable);
        } else if (activityType != null) {
            activities = activityRepository.findByGroupIdAndActivityTypeOrderByCreatedAtDesc(
                    groupId, activityType, pageable);
        } else if (userId != null) {
            activities = activityRepository.findByGroupIdAndUserIdOrderByCreatedAtDesc(
                    groupId, userId, pageable);
        } else {
            activities = activityRepository.findByGroupIdOrderByCreatedAtDesc(groupId, pageable);
        }

        // Apply date range filter if provided
        if (startDate != null && endDate != null) {
            activities = activityRepository.findByGroupIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                    groupId, startDate, endDate, pageable);
        }

        return activities.map(this::buildActivityResponse);
    }

    @Transactional(readOnly = true)
    public ActivityResponse getActivity(UUID groupId, UUID activityId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        GroupActivity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));

        if (!activity.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Activity does not belong to this group");
        }

        return buildActivityResponse(activity);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatistics(UUID groupId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        // Count activities by type
        long totalActivities = activityRepository.countByGroupId(groupId);
        long expenseActivities = activityRepository.countByGroupIdAndActivityType(groupId, ActivityType.EXPENSE_ADDED);
        long settlementActivities = activityRepository.countByGroupIdAndActivityType(groupId, ActivityType.PAYMENT_MADE);
        long memberActivities = activityRepository.countByGroupIdAndActivityType(groupId, ActivityType.MEMBER_JOINED);

        // Get recent activity count (last 7 days)
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        long recentActivities = activityRepository.countByGroupIdAndCreatedAtAfter(groupId, sevenDaysAgo);

        // Build statistics map
        return Map.of(
                "totalActivities", totalActivities,
                "expenseActivities", expenseActivities,
                "settlementActivities", settlementActivities,
                "memberActivities", memberActivities,
                "recentActivities", recentActivities,
                "calculatedAt", LocalDateTime.now()
        );
    }

    private ActivityResponse buildActivityResponse(GroupActivity activity) {
        return ActivityResponse.builder()
                .id(activity.getId())
                .groupId(activity.getGroupId())
                .activityType(activity.getActivityType().name())
                .userId(activity.getUserId())
                .description(activity.getDescription())
                .metadata(null) // TODO: Deserialize from JSON
                .createdAt(activity.getCreatedAt())
                .build();
    }
}
