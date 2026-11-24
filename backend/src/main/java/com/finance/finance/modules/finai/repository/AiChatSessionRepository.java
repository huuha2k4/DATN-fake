package com.finance.finance.modules.finai.repository;
import com.finance.finance.modules.finai.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {
    Optional<AiChatSession> findByIdAndUserId(UUID id, UUID userId);
    List<AiChatSession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}

