package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.SpendRequestStatus;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public interface ChildSpendRequestRepository extends JpaRepository<ChildSpendRequest, UUID> {
    
    Page<ChildSpendRequest> findByWalletIdOrderByCreatedAtDesc(@Param("walletId") UUID walletId, Pageable pageable);
    
    @Query("SELECT csr FROM ChildSpendRequest csr " +
           "WHERE csr.walletId = :walletId " +
           "AND csr.status = :status " +
           "ORDER BY csr.createdAt DESC")
    Page<ChildSpendRequest> findByWalletIdAndStatus(@Param("walletId") UUID walletId,
                                                      @Param("status") SpendRequestStatus status,
                                                      Pageable pageable);
    
    long countByWalletId(@Param("walletId") UUID walletId);
    
    @Query("SELECT COUNT(csr) FROM ChildSpendRequest csr " +
           "WHERE csr.walletId = :walletId AND csr.status = 'PENDING'")
    long countPendingByWalletId(@Param("walletId") UUID walletId);
    
    @Query("SELECT SUM(csr.amount) FROM ChildSpendRequest csr " +
           "WHERE csr.walletId = :walletId AND csr.status = 'APPROVED'")
    BigDecimal sumApprovedAmountByWalletId(@Param("walletId") UUID walletId);
}
