package com.finance.finance.modules.ocr.repository;

import com.finance.finance.modules.ocr.entity.Receipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, UUID> {

    Optional<Receipt> findByIdAndUserId(UUID id, UUID userId);

    Page<Receipt> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
