package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupMessageAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMessageAttachmentRepository extends JpaRepository<GroupMessageAttachment, UUID> {
    
    List<GroupMessageAttachment> findByMessageId(UUID messageId);
    
    List<GroupMessageAttachment> findByMessageIdIn(List<UUID> messageIds);
}
