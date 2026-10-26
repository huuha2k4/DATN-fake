package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.SettlementStatus;
import com.finance.finance.modules.group.entity.GroupSettlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupSettlementRepository extends JpaRepository<GroupSettlement, UUID> {
    
    @Query("SELECT gs FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId " +
           "ORDER BY gs.createdAt DESC")
    Page<GroupSettlement> findByGroupId(@Param("groupId") UUID groupId, Pageable pageable);
    
    @Query("SELECT gs FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId " +
           "AND gs.status = :status " +
           "ORDER BY gs.createdAt DESC")
    Page<GroupSettlement> findByGroupIdAndStatus(@Param("groupId") UUID groupId,
                                                   @Param("status") SettlementStatus status,
                                                   Pageable pageable);
    
    @Query("SELECT SUM(gs.amount) FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId " +
           "AND gs.status = 'CONFIRMED'")
    BigDecimal sumConfirmedAmountByGroupId(@Param("groupId") UUID groupId);
    
    @Query("SELECT COUNT(gs) FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId " +
           "AND gs.status = 'PENDING'")
    long countPendingByGroupId(@Param("groupId") UUID groupId);
    
    List<GroupSettlement> findByGroupIdAndFromUserIdOrToUserId(UUID groupId, UUID fromUserId, UUID toUserId);
}
