package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.GroupStatus;
import com.finance.finance.modules.group.entity.Group;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {
    
    @Query("SELECT g FROM Group g WHERE g.id = :id AND g.deletedAt IS NULL")
    Optional<Group> findByIdAndNotDeleted(@Param("id") UUID id);
    
    @Query("SELECT g FROM Group g " +
           "JOIN GroupMember gm ON g.id = gm.groupId " +
           "WHERE gm.userId = :userId " +
           "AND g.status = :status " +
           "AND g.deletedAt IS NULL")
    Page<Group> findByUserIdAndStatus(@Param("userId") UUID userId, 
                                       @Param("status") GroupStatus status, 
                                       Pageable pageable);
    
    @Query("SELECT g FROM Group g " +
           "JOIN GroupMember gm ON g.id = gm.groupId " +
           "WHERE gm.userId = :userId " +
           "AND g.deletedAt IS NULL")
    Page<Group> findByUserId(@Param("userId") UUID userId, Pageable pageable);
    
    @Query("SELECT COUNT(g) FROM Group g " +
           "JOIN GroupMember gm ON g.id = gm.groupId " +
           "WHERE gm.userId = :userId " +
           "AND g.deletedAt IS NULL")
    long countByUserId(@Param("userId") UUID userId);
}
