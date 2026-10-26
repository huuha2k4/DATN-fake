package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.MessageType;
import com.finance.finance.modules.group.entity.GroupMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, UUID> {
    
    @Query("SELECT gm FROM GroupMessage gm " +
           "WHERE gm.id = :id AND gm.deletedAt IS NULL")
    Optional<GroupMessage> findByIdAndNotDeleted(@Param("id") UUID id);
    
    @Query("SELECT gm FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.deletedAt IS NULL " +
           "ORDER BY gm.createdAt DESC")
    Page<GroupMessage> findByGroupId(@Param("groupId") UUID groupId, Pageable pageable);
    
    @Query("SELECT gm FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.id < :beforeMessageId " +
           "AND gm.deletedAt IS NULL " +
           "ORDER BY gm.createdAt DESC")
    List<GroupMessage> findByGroupIdBeforeMessage(@Param("groupId") UUID groupId,
                                                    @Param("beforeMessageId") UUID beforeMessageId,
                                                    Pageable pageable);
    
    @Query("SELECT gm FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.id > :afterMessageId " +
           "AND gm.deletedAt IS NULL " +
           "ORDER BY gm.createdAt ASC")
    List<GroupMessage> findByGroupIdAfterMessage(@Param("groupId") UUID groupId,
                                                   @Param("afterMessageId") UUID afterMessageId,
                                                   Pageable pageable);
    
    @Query("SELECT COUNT(gm) FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.deletedAt IS NULL")
    long countByGroupId(@Param("groupId") UUID groupId);
    
    Page<GroupMessage> findByGroupIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID groupId, Pageable pageable);
    
    @Query("SELECT COUNT(gm) FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.deletedAt IS NULL " +
           "AND gm.id NOT IN (SELECT gmr.messageId FROM GroupMessageRead gmr WHERE gmr.userId = :userId)")
    long countUnreadMessages(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
