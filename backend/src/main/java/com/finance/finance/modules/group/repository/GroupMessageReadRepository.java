package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupMessageRead;
import com.finance.finance.modules.group.entity.GroupMessageReadId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMessageReadRepository extends JpaRepository<GroupMessageRead, GroupMessageReadId> {
    
    @Query("SELECT gmr FROM GroupMessageRead gmr WHERE gmr.messageId = :messageId")
    List<GroupMessageRead> findByMessageId(@Param("messageId") UUID messageId);
    
    @Query("SELECT COUNT(gmr) FROM GroupMessageRead gmr WHERE gmr.messageId = :messageId")
    long countByMessageId(@Param("messageId") UUID messageId);
    
    @Query("SELECT gmr FROM GroupMessageRead gmr " +
           "WHERE gmr.messageId IN :messageIds AND gmr.userId = :userId")
    List<GroupMessageRead> findByMessageIdsAndUserId(@Param("messageIds") List<UUID> messageIds,
                                                       @Param("userId") UUID userId);
    
    @Query("SELECT COUNT(gm) FROM GroupMessage gm " +
           "WHERE gm.groupId = :groupId " +
           "AND gm.deletedAt IS NULL " +
           "AND NOT EXISTS (" +
           "  SELECT 1 FROM GroupMessageRead gmr " +
           "  WHERE gmr.messageId = gm.id AND gmr.userId = :userId" +
           ")")
    long countUnreadByGroupIdAndUserId(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
