package com.finance.finance.modules.finai.repository;
import com.finance.finance.modules.finai.entity.AiChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {
    List<AiChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}

