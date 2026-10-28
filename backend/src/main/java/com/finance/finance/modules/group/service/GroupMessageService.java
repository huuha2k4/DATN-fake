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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupMessageService {

    private final GroupMessageRepository messageRepository;
    private final GroupMessageAttachmentRepository attachmentRepository;
    private final GroupMessageReadRepository readRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupExpenseRepository expenseRepository;
    private final com.finance.finance.modules.user.repository.UserRepository userRepository;

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

        // Get read count
        long readCount = readRepository.countByMessageId(message.getId());

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
                .readByCount((int) readCount)
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .build();
    }
}
