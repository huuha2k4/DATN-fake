package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.common.enums.GroupStatus;
import com.finance.finance.common.enums.GroupType;
import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.modules.group.dto.request.*;
import com.finance.finance.modules.group.dto.response.*;
import com.finance.finance.modules.group.entity.Group;
import com.finance.finance.modules.group.entity.GroupActivity;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupExpenseRepository groupExpenseRepository;
    private final GroupSettlementRepository groupSettlementRepository;
    private final ChildWalletRepository childWalletRepository;
    private final GroupMessageReadRepository groupMessageReadRepository;
    private final GroupActivityRepository groupActivityRepository;
    private final ExpenseSplitRepository expenseSplitRepository;

    // ==================== Groups Management ====================

    @Transactional
    public GroupResponse createGroup(CreateGroupRequest request, UUID currentUserId) {
        // Validate group type
        GroupType groupType = GroupType.valueOf(request.getGroupType());

        // Create group
        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .groupType(groupType)
                .baseCurrency(request.getBaseCurrency())
                .avatarKey(request.getAvatarKey())
                .ownerId(currentUserId)
                .status(GroupStatus.ACTIVE)
                .settings(serializeSettings(request.getSettings()))
                .build();

        group = groupRepository.save(group);

        // Add creator as owner member
        GroupMember ownerMember = GroupMember.builder()
                .groupId(group.getId())
                .userId(currentUserId)
                .role(MemberRole.OWNER)
                .build();

        groupMemberRepository.save(ownerMember);

        // Log activity
        logActivity(group.getId(), currentUserId, ActivityType.GROUP_UPDATED, 
                   "Created group: " + group.getName(), null);

        return buildGroupResponse(group);
    }

    @Transactional(readOnly = true)
    public Page<GroupResponse> getGroups(Pageable pageable, UUID currentUserId) {
        Page<Group> groups = groupRepository.findByUserId(currentUserId, pageable);
        return groups.map(this::buildGroupResponse);
    }

    @Transactional(readOnly = true)
    public GroupDetailResponse getGroupDetail(UUID groupId, UUID currentUserId) {
        Group group = findGroupOrThrow(groupId);
        validateMemberAccess(groupId, currentUserId);
        
        return buildGroupDetailResponse(group, currentUserId);
    }

    @Transactional
    public GroupResponse updateGroup(UUID groupId, UpdateGroupRequest request, UUID currentUserId) {
        Group group = findGroupOrThrow(groupId);
        validateAdminOrOwner(groupId, currentUserId);

        // Update fields
        if (request.getName() != null) {
            group.setName(request.getName());
        }
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription());
        }
        if (request.getAvatarKey() != null) {
            group.setAvatarKey(request.getAvatarKey());
        }
        if (request.getSettings() != null) {
            group.setSettings(serializeSettings(request.getSettings()));
        }

        group = groupRepository.save(group);

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.GROUP_UPDATED, 
                   "Updated group settings", null);

        return buildGroupResponse(group);
    }

    @Transactional
    public GroupResponse archiveGroup(UUID groupId, UUID currentUserId) {
        Group group = findGroupOrThrow(groupId);
        validateOwnerAccess(groupId, currentUserId);

        group.setStatus(GroupStatus.ARCHIVED);
        group = groupRepository.save(group);

        logActivity(groupId, currentUserId, ActivityType.GROUP_UPDATED, 
                   "Archived group", null);
        
        return buildGroupResponse(group);
    }

    @Transactional
    public GroupResponse unarchiveGroup(UUID groupId, UUID currentUserId) {
        Group group = findGroupOrThrow(groupId);
        validateOwnerAccess(groupId, currentUserId);

        group.setStatus(GroupStatus.ACTIVE);
        group = groupRepository.save(group);

        logActivity(groupId, currentUserId, ActivityType.GROUP_UPDATED, 
                   "Unarchived group", null);
        
        return buildGroupResponse(group);
    }

    @Transactional
    public void deleteGroup(UUID groupId, UUID currentUserId) {
        Group group = findGroupOrThrow(groupId);
        validateOwnerAccess(groupId, currentUserId);

        // Check for unsettled balances
        BigDecimal totalExpenses = groupExpenseRepository.sumAmountByGroupId(groupId);
        BigDecimal totalSettlements = groupSettlementRepository.sumConfirmedAmountByGroupId(groupId);
        
        if (totalExpenses != null && totalSettlements != null && 
            totalExpenses.compareTo(totalSettlements) != 0) {
            throw new IllegalStateException("Cannot delete group with unsettled balances");
        }

        // Soft delete
        group.setDeletedAt(LocalDateTime.now());
        groupRepository.save(group);
    }

    // ==================== Members Management ====================

    @Transactional
    public MemberResponse addMember(UUID groupId, AddMemberRequest request, UUID currentUserId) {
        validateAdminOrOwner(groupId, currentUserId);

        // Check if member already exists
        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, request.getUserId())) {
            throw new IllegalArgumentException("User is already a member of this group");
        }

        MemberRole role = MemberRole.valueOf(request.getRole());

        GroupMember member = GroupMember.builder()
                .groupId(groupId)
                .userId(request.getUserId())
                .role(role)
                .contributionRatio(request.getContributionRatio())
                .build();

        member = groupMemberRepository.save(member);

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.MEMBER_JOINED, 
                   "Added member to group", Map.of("userId", request.getUserId().toString()));

        return buildMemberResponse(member);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(UUID groupId, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        return members.stream()
                .map(this::buildMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MemberResponse getMember(UUID groupId, UUID userId, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new NoSuchElementException("Member not found"));

        return buildMemberResponse(member);
    }

    @Transactional
    public MemberResponse updateMember(UUID groupId, UUID userId, UpdateMemberRequest request, 
                                        UUID currentUserId) {
        validateOwnerAccess(groupId, currentUserId);

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new NoSuchElementException("Member not found"));

        if (request.getRole() != null) {
            member.setRole(MemberRole.valueOf(request.getRole()));
        }
        if (request.getContributionRatio() != null) {
            member.setContributionRatio(request.getContributionRatio());
        }

        member = groupMemberRepository.save(member);

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.MEMBER_ROLE_CHANGED, 
                   "Updated member role", Map.of("userId", userId.toString()));

        return buildMemberResponse(member);
    }

    @Transactional
    public void removeMember(UUID groupId, UUID userId, UUID currentUserId) {
        validateAdminOrOwner(groupId, currentUserId);

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        // Cannot remove owner
        if (member.getRole() == MemberRole.OWNER) {
            throw new ResourceNotFoundException("Cannot remove group owner");
        }

        // Check balance before removing
        BigDecimal balance = calculateMemberBalance(groupId, userId);
        if (balance.abs().compareTo(BigDecimal.ZERO) > 0) {
            throw new ResourceNotFoundException("Cannot remove member with unsettled balance");
        }

        groupMemberRepository.delete(member);

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.MEMBER_LEFT, 
                   "Removed member from group", Map.of("userId", userId.toString()));
    }

    // ==================== Helper Methods ====================

    private Group findGroupOrThrow(UUID groupId) {
        return groupRepository.findByIdAndNotDeleted(groupId)
                .orElseThrow(() -> new NoSuchElementException("Group not found"));
    }

    private void validateMemberAccess(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new SecurityException("User is not a member of this group");
        }
    }

    private void validateAdminOrOwner(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("User is not a member of this group"));
        
        if (member.getRole() != MemberRole.ADMIN && member.getRole() != MemberRole.OWNER) {
            throw new SecurityException("Insufficient permissions");
        }
    }

    private void validateOwnerAccess(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("User is not a member of this group"));
        
        if (member.getRole() != MemberRole.OWNER) {
            throw new SecurityException("Only group owner can perform this action");
        }
    }

    private BigDecimal calculateMemberBalance(UUID groupId, UUID userId) {
        // Calculate: total paid - total owed
        BigDecimal totalPaid = groupExpenseRepository.findByGroupId(groupId, Pageable.unpaged())
                .stream()
                .filter(expense -> expense.getPaidByUserId().equals(userId))
                .map(expense -> expense.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOwed = expenseSplitRepository.sumByGroupIdAndUserId(groupId, userId);
        if (totalOwed == null) totalOwed = BigDecimal.ZERO;

        return totalPaid.subtract(totalOwed);
    }

    private void logActivity(UUID groupId, UUID userId, ActivityType activityType, 
                            String description, Map<String, Object> metadata) {
        GroupActivity activity = GroupActivity.builder()
                .groupId(groupId)
                .userId(userId)
                .activityType(activityType)
                .description(description)
                .metadata(serializeMetadata(metadata))
                .build();

        groupActivityRepository.save(activity);
    }

    private String serializeSettings(Object settings) {
        // TODO: Implement settings serialization if needed
        return null;
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        // TODO: Implement metadata serialization if needed
        return null;
    }

    private GroupResponse buildGroupResponse(Group group) {
        long memberCount = groupMemberRepository.countByGroupId(group.getId());

        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .groupType(group.getGroupType().name())
                .baseCurrency(group.getBaseCurrency())
                .avatarKey(group.getAvatarKey())
                .ownerId(group.getOwnerId())
                .status(group.getStatus().name())
                .memberCount((int) memberCount)
                .childWalletCount(0)
                .totalExpenses(BigDecimal.ZERO)
                .unreadMessageCount(0)
                .myRole(null)
                .myBalance(BigDecimal.ZERO)
                .lastActivityAt(group.getUpdatedAt())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .version(group.getVersion())
                .build();
    }

    private GroupResponse buildGroupResponse(Group group, UUID currentUserId) {
        long memberCount = groupMemberRepository.countByGroupId(group.getId());
        long childWalletCount = childWalletRepository.countByGroupId(group.getId());
        BigDecimal totalExpenses = groupExpenseRepository.sumAmountByGroupId(group.getId());
        long unreadCount = groupMessageReadRepository.countUnreadByGroupIdAndUserId(group.getId(), currentUserId);
        
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUserId)
                .orElse(null);
        
        BigDecimal myBalance = calculateMemberBalance(group.getId(), currentUserId);

        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .groupType(group.getGroupType().name())
                .baseCurrency(group.getBaseCurrency())
                .avatarKey(group.getAvatarKey())
                .ownerId(group.getOwnerId())
                .status(group.getStatus().name())
                .memberCount((int) memberCount)
                .childWalletCount((int) childWalletCount)
                .totalExpenses(totalExpenses != null ? totalExpenses : BigDecimal.ZERO)
                .unreadMessageCount((int) unreadCount)
                .myRole(member != null ? member.getRole().name() : null)
                .myBalance(myBalance)
                .lastActivityAt(group.getUpdatedAt())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .version(group.getVersion())
                .build();
    }

    private GroupDetailResponse buildGroupDetailResponse(Group group, UUID currentUserId) {
        GroupResponse groupResponse = buildGroupResponse(group, currentUserId);
        
        BigDecimal totalSettlements = groupSettlementRepository.sumConfirmedAmountByGroupId(group.getId());
        
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUserId)
                .orElse(null);
        
        List<String> permissions = getPermissions(member != null ? member.getRole() : null);

        return GroupDetailResponse.builder()
                .id(groupResponse.getId())
                .name(groupResponse.getName())
                .description(groupResponse.getDescription())
                .groupType(groupResponse.getGroupType())
                .baseCurrency(groupResponse.getBaseCurrency())
                .avatarKey(groupResponse.getAvatarKey())
                .ownerId(groupResponse.getOwnerId())
                .status(groupResponse.getStatus())
                .memberCount(groupResponse.getMemberCount())
                .childWalletCount(groupResponse.getChildWalletCount())
                .totalExpenses(groupResponse.getTotalExpenses())
                .totalSettlements(totalSettlements != null ? totalSettlements : BigDecimal.ZERO)
                .settings((CreateGroupRequest.GroupSettingsDto) deserializeSettings(group.getSettings()))
                .myRole(groupResponse.getMyRole())
                .myBalance(groupResponse.getMyBalance())
                .myPermissions(permissions)
                .createdAt(groupResponse.getCreatedAt())
                .updatedAt(groupResponse.getUpdatedAt())
                .version(groupResponse.getVersion())
                .build();
    }

    private MemberResponse buildMemberResponse(GroupMember member) {
        BigDecimal balance = calculateMemberBalance(member.getGroupId(), member.getUserId());
        
        // TODO: Fetch user info from UserService/Repository
        MemberResponse.UserSummary userSummary = MemberResponse.UserSummary.builder()
                .id(member.getUserId())
                .fullName("User " + member.getUserId()) // Placeholder
                .build();

        return MemberResponse.builder()
                .groupId(member.getGroupId())
                .userId(member.getUserId())
                .role(member.getRole().name())
                .contributionRatio(member.getContributionRatio())
                .balance(balance)
                .joinedAt(member.getJoinedAt())
                .user(userSummary)
                .build();
    }

    private Object deserializeSettings(String settingsJson) {
        // TODO: Implement settings deserialization if needed
        return null;
    }

    private List<String> getPermissions(MemberRole role) {
        if (role == null) return List.of();
        
        List<String> permissions = new ArrayList<>();
        switch (role) {
            case OWNER:
                permissions.addAll(List.of("manage_members", "create_expenses", "manage_expenses",
                        "create_settlements", "manage_child_wallets", "send_messages", "delete_group"));
                break;
            case ADMIN:
                permissions.addAll(List.of("create_expenses", "manage_expenses",
                        "create_settlements", "manage_child_wallets", "send_messages"));
                break;
            case MEMBER:
                permissions.addAll(List.of("create_expenses", "create_settlements", "send_messages"));
                break;
        }
        return permissions;
    }
}
