package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.FundReimbursementStatus;
import com.finance.finance.modules.group.entity.FundReimbursement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface FundReimbursementRepository extends JpaRepository<FundReimbursement, UUID> {
    Page<FundReimbursement> findByGroupId(UUID groupId, Pageable pageable);
    Optional<FundReimbursement> findByExpenseId(UUID expenseId);
    Optional<FundReimbursement> findByIdAndGroupId(UUID id, UUID groupId);
    boolean existsByGroupIdAndStatusIn(UUID groupId, Iterable<FundReimbursementStatus> statuses);
    boolean existsByGroupIdAndBeneficiaryUserIdAndStatusIn(UUID groupId, UUID beneficiaryUserId, Iterable<FundReimbursementStatus> statuses);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FundReimbursement> findLockedByIdAndGroupId(UUID id, UUID groupId);
}
