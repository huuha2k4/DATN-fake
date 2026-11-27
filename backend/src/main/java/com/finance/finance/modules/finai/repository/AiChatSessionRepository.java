package com.finance.finance.modules.finai.repository;
import com.finance.finance.modules.finai.entity.AiChatSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {
    Optional<AiChatSession> findByIdAndUserId(UUID id, UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AiChatSession s where s.id = :id and s.userId = :userId")
    Optional<AiChatSession> findOwnedForUpdate(@Param("id") UUID id, @Param("userId") UUID userId);
    List<AiChatSession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}

