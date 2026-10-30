package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupInvitation;
import com.finance.finance.modules.group.entity.GroupInvitation.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, UUID> {
    
    List<GroupInvitation> findByInviteeIdAndStatus(UUID inviteeId, InvitationStatus status);
    
    List<GroupInvitation> findByGroupIdAndStatus(UUID groupId, InvitationStatus status);
    
    Optional<GroupInvitation> findByGroupIdAndInviteeIdAndStatus(UUID groupId, UUID inviteeId, InvitationStatus status);

    boolean existsByGroupIdAndInviteeIdAndStatus(UUID groupId, UUID inviteeId, InvitationStatus status);

    List<GroupInvitation> findByGroupIdAndStatusOrderByCreatedAtDesc(UUID groupId, InvitationStatus status);

    long countByGroupIdAndStatus(UUID groupId, InvitationStatus status);
}
