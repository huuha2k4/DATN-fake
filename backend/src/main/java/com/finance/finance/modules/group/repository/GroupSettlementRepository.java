package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.SettlementStatus;
import com.finance.finance.modules.group.entity.GroupSettlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
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

    Optional<GroupSettlement> findByOutgoingTransactionIdOrIncomingTransactionId(UUID outgoingTransactionId, UUID incomingTransactionId);
    List<GroupSettlement> findByGroupIdAndStatus(UUID groupId, SettlementStatus status);
    boolean existsByGroupIdAndStatus(UUID groupId, SettlementStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT gs FROM GroupSettlement gs WHERE gs.id = :id AND gs.groupId = :groupId")
    Optional<GroupSettlement> findLockedByIdAndGroupId(@Param("id") UUID id, @Param("groupId") UUID groupId);

    @Query("SELECT COALESCE(SUM(gs.amount), 0) FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId AND gs.status = 'CONFIRMED' AND gs.fromUserId = :userId")
    BigDecimal sumConfirmedSentByGroupAndUser(@Param("groupId") UUID groupId, @Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(gs.amount), 0) FROM GroupSettlement gs " +
           "WHERE gs.groupId = :groupId AND gs.status = 'CONFIRMED' AND gs.toUserId = :userId")
    BigDecimal sumConfirmedReceivedByGroupAndUser(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
