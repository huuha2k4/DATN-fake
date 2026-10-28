package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.MessageType;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.MarkMessagesReadRequest;
import com.finance.finance.modules.group.dto.request.SendMessageRequest;
import com.finance.finance.modules.group.dto.request.UpdateMessageRequest;
import com.finance.finance.modules.group.dto.response.MessageResponse;
import com.finance.finance.modules.group.entity.*;
import com.finance.finance.modules.group.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupMessageService {

    private static final String ATTACHMENT_UPLOAD_DIR = "uploads/group-messages";

    // Track typing status in memory: groupId -> (userId -> lastTypingTimestamp)
    private static final ConcurrentHashMap<UUID, ConcurrentHashMap<UUID, Long>> TYPING_STATUS = new ConcurrentHashMap<>();

    public void setTyping(UUID groupId, UUID userId, boolean typing) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            return;
        }
        ConcurrentHashMap<UUID, Long> groupTyping = TYPING_STATUS.computeIfAbsent(groupId, k -> new ConcurrentHashMap<>());
        if (typing) {
            groupTyping.put(userId, System.currentTimeMillis());
        } else {
            groupTyping.remove(userId);
        }
    }

    public List<UUID> getTypingUsers(UUID groupId, UUID excludeUserId) {
        ConcurrentHashMap<UUID, Long> groupTyping = TYPING_STATUS.get(groupId);
        if (groupTyping == null || groupTyping.isEmpty()) {
            return List.of();
        }
        long now = System.currentTimeMillis();
        // Expire after 5 seconds
        return groupTyping.entrySet().stream()
                .filter(entry -> !entry.getKey().equals(excludeUserId) && (now - entry.getValue() < 5000))
                .map(java.util.Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    private final GroupMessageRepository messageRepository;
    private final GroupMessageAttachmentRepository attachmentRepository;
    private final GroupMessageReadRepository readRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupExpenseRepository expenseRepository;
    private final com.finance.finance.modules.user.repository.UserRepository userRepository;

    @Transactional
    public MessageResponse.AttachmentSummary uploadAttachment(UUID groupId, MultipartFile file, UUID currentUserId) throws IOException {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }

        Path uploadPath = Paths.get(ATTACHMENT_UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String fileExtension = "";
        int extIndex = originalFilename.lastIndexOf(".");
        if (extIndex > 0) {
            fileExtension = originalFilename.substring(extIndex);
        }

        String newFilename = groupId + "_" + UUID.randomUUID() + fileExtension;
        Path filePath = uploadPath.resolve(newFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileKey = "/" + ATTACHMENT_UPLOAD_DIR + "/" + newFilename;
        String mimeType = file.getContentType();
        long fileSize = file.getSize();

        return MessageResponse.AttachmentSummary.builder()
                .fileKey(fileKey)
                .fileName(originalFilename)
                .mimeType(mimeType)
                .fileSize(fileSize)
                .build();
    }

    @Transactional
    public MessageResponse sendMessage(UUID groupId, SendMessageRequest request, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        // If expense card, validate expense exists
        if (request.getMessageType() == MessageType.EXPENSE_CARD && request.getExpenseId() != null) {
            if (!expenseRepository.existsById(request.getExpenseId())) {
                throw new ResourceNotFoundException("Expense not found");
            }
        }

        GroupMessage message = GroupMessage.builder()
                .groupId(groupId)
                .senderId(currentUserId)
                .messageType(request.getMessageType())
                .content(request.getContent())
                .replyToMessageId(request.getReplyToMessageId())
                .expenseId(request.getExpenseId())
                .mentionedUserIds(null) // TODO: Serialize to JSON
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        message = messageRepository.save(message);

        // Create attachments if provided
        if (request.getAttachments() != null && !request.getAttachments().isEmpty()) {
            final UUID messageId = message.getId();
            List<GroupMessageAttachment> attachments = request.getAttachments().stream()
                    .map(dto -> GroupMessageAttachment.builder()
                            .messageId(messageId)
                            .fileKey(dto.getFileKey())
                            .fileName(dto.getFileName())
                            .mimeType(dto.getMimeType())
                            .fileSize(dto.getFileSize())
                            .thumbnailKey(dto.getThumbnailKey())
                            .build())
                    .collect(Collectors.toList());
            attachmentRepository.saveAll(attachments);
        }

        // Mark as read by sender
        GroupMessageRead read = GroupMessageRead.builder()
                .messageId(message.getId())
                .userId(currentUserId)
                .readAt(LocalDateTime.now())
                .build();
        readRepository.save(read);

        return buildMessageResponse(message);
    }

    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessages(UUID groupId, Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        Page<GroupMessage> messages = messageRepository.findByGroupIdAndDeletedAtIsNullOrderByCreatedAtDesc(groupId, pageable);
        return messages.map(this::buildMessageResponse);
    }

    @Transactional(readOnly = true)
    public MessageResponse getMessage(UUID groupId, UUID messageId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Message does not belong to this group");
        }

        if (message.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Message has been deleted");
        }

        return buildMessageResponse(message);
    }

    @Transactional
    public MessageResponse updateMessage(UUID groupId, UUID messageId, UpdateMessageRequest request, UUID currentUserId) {
        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Message does not belong to this group");
        }

        if (!message.getSenderId().equals(currentUserId)) {
            throw new ResourceNotFoundException("You can only update your own messages");
        }

        if (message.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Message has been deleted");
        }

        message.setContent(request.getContent());
        message.setUpdatedAt(LocalDateTime.now());

        message = messageRepository.save(message);
        return buildMessageResponse(message);
    }

    @Transactional
    public void deleteMessage(UUID groupId, UUID messageId, UUID currentUserId) {
        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Message does not belong to this group");
        }

        if (!message.getSenderId().equals(currentUserId)) {
            throw new ResourceNotFoundException("You can only delete your own messages");
        }

        // Soft delete
        message.setDeletedAt(LocalDateTime.now());
        messageRepository.save(message);
    }

    @Transactional
    public void markAsRead(UUID groupId, MarkMessagesReadRequest request, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        LocalDateTime now = LocalDateTime.now();
        List<GroupMessageRead> reads = request.getMessageIds().stream()
                .map(messageId -> GroupMessageRead.builder()
                        .messageId(messageId)
                        .userId(currentUserId)
                        .readAt(now)
                        .build())
                .collect(Collectors.toList());

        readRepository.saveAll(reads);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID groupId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        return messageRepository.countUnreadMessages(groupId, currentUserId);
    }

    private MessageResponse buildMessageResponse(GroupMessage message) {
        // Get attachments
        List<GroupMessageAttachment> attachments = attachmentRepository.findByMessageId(message.getId());

        // Get reads
        List<GroupMessageRead> reads = readRepository.findByMessageId(message.getId());
        List<UUID> readByUserIds = reads.stream()
                .map(GroupMessageRead::getUserId)
                .collect(Collectors.toList());

        // Get sender info
        MessageResponse.SenderSummary senderSummary = userRepository.findById(message.getSenderId())
                .map(u -> MessageResponse.SenderSummary.builder()
                        .id(u.getId())
                        .fullName(u.getFullName() != null ? u.getFullName() : (u.getUsername() != null ? u.getUsername() : u.getEmail()))
                        .displayName(u.getUsername())
                        .avatarKey(u.getAvatarUrl())
                        .build())
                .orElse(null);

        return MessageResponse.builder()
                .id(message.getId())
                .groupId(message.getGroupId())
                .senderId(message.getSenderId())
                .sender(senderSummary)
                .messageType(message.getMessageType().name())
                .content(message.getContent())
                .replyToMessageId(message.getReplyToMessageId())
                .expenseId(message.getExpenseId())
                .mentionedUserIds(null) // TODO: Deserialize from JSON
                .attachments(attachments.stream()
                        .map(att -> MessageResponse.AttachmentSummary.builder()
                                .id(att.getId())
                                .fileKey(att.getFileKey())
                                .fileName(att.getFileName())
                                .mimeType(att.getMimeType())
                                .fileSize(att.getFileSize())
                                .thumbnailKey(att.getThumbnailKey())
                                .build())
                        .collect(Collectors.toList()))
                .readByCount(readByUserIds.size())
                .readByUserIds(readByUserIds)
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .build();
    }
}
