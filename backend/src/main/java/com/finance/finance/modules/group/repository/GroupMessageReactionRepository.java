package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupMessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMessageReactionRepository extends JpaRepository<GroupMessageReaction, GroupMessageReaction.GroupMessageReactionId> {
    List<GroupMessageReaction> findByMessageId(UUID messageId);
    List<GroupMessageReaction> findByMessageIdIn(List<UUID> messageIds);
    Optional<GroupMessageReaction> findByMessageIdAndUserId(UUID messageId, UUID userId);
    void deleteByMessageIdAndUserId(UUID messageId, UUID userId);
}

