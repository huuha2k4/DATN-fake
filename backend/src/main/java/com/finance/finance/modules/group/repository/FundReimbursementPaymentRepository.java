package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.FundReimbursementPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FundReimbursementPaymentRepository extends JpaRepository<FundReimbursementPayment, UUID> {
    List<FundReimbursementPayment> findByReimbursementIdOrderByPaidAtDesc(UUID reimbursementId);
    boolean existsByReimbursementIdAndIdempotencyKey(UUID reimbursementId, String idempotencyKey);
    boolean existsByPersonalTransactionId(UUID personalTransactionId);
}
