package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.ChoreStatus;
import com.finance.finance.modules.group.entity.ChildChore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public interface ChildChoreRepository extends JpaRepository<ChildChore, UUID> {
    
    @Query("SELECT cc FROM ChildChore cc " +
           "WHERE cc.walletId = :walletId " +
           "ORDER BY cc.createdAt DESC")
    Page<ChildChore> findByWalletIdOrderByCreatedAtDesc(@Param("walletId") UUID walletId, Pageable pageable);
    
    @Query("SELECT cc FROM ChildChore cc " +
           "WHERE cc.walletId = :walletId " +
           "AND cc.status = :status " +
           "ORDER BY cc.createdAt DESC")
    Page<ChildChore> findByWalletIdAndStatus(@Param("walletId") UUID walletId,
                                               @Param("status") ChoreStatus status,
                                               Pageable pageable);
    
    @Query("SELECT COUNT(cc) FROM ChildChore cc " +
           "WHERE cc.walletId = :walletId AND cc.status = 'APPROVED'")
    long countApprovedByWalletId(@Param("walletId") UUID walletId);
    
    @Query("SELECT SUM(cc.rewardAmount) FROM ChildChore cc " +
           "WHERE cc.walletId = :walletId AND cc.status = 'APPROVED'")
    BigDecimal sumRewardsByWalletId(@Param("walletId") UUID walletId);
}
