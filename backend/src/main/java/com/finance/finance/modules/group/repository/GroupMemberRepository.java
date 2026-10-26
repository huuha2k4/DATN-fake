package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.entity.GroupMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMemberId> {
    
    List<GroupMember> findByGroupId(UUID groupId);
    
    Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId);
    
    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.groupId = :groupId")
    long countByGroupId(@Param("groupId") UUID groupId);
    
    @Query("SELECT gm FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.role = :role")
    List<GroupMember> findByGroupIdAndRole(@Param("groupId") UUID groupId, @Param("role") MemberRole role);
    
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
    
    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.userId = :userId")
    boolean existsByGroup_IdAndUser_Id(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
    
    @Query("SELECT CASE WHEN COUNT(gm) > 0 THEN true ELSE false END FROM GroupMember gm WHERE gm.groupId = :groupId AND gm.userId = :userId AND gm.role IN :roles")
    boolean existsByGroup_IdAndUser_IdAndRoleIn(@Param("groupId") UUID groupId, @Param("userId") UUID userId, @Param("roles") List<MemberRole> roles);
}
