package com.finance.finance.modules.finai.repository;

import com.finance.finance.modules.finai.entity.FinAiPendingAction;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface FinAiPendingActionRepository extends JpaRepository<FinAiPendingAction, UUID> {
    Optional<FinAiPendingAction> findByIdAndUserId(UUID id, UUID userId);
    List<FinAiPendingAction> findByConversationIdAndUserIdOrderByCreatedAtAsc(UUID conversationId, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from FinAiPendingAction a where a.id = :id and a.userId = :userId")
    Optional<FinAiPendingAction> findOwnedForUpdate(@Param("id") UUID id, @Param("userId") UUID userId);
}

