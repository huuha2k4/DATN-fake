package com.finance.finance.modules.group.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.enums.MessageType;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.MarkMessagesReadRequest;
import com.finance.finance.modules.group.dto.request.SendMessageRequest;
import com.finance.finance.modules.group.dto.request.UpdateMessageRequest;
import com.finance.finance.modules.group.dto.response.MessageResponse;
import com.finance.finance.modules.group.entity.*;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.common.upload.AttachmentUrlSigner;
import com.finance.finance.common.upload.FileUploadValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
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
import java.util.ArrayList;
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
    private final com.finance.finance.modules.group.repository.GroupMessageReactionRepository reactionRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupExpenseRepository expenseRepository;
    private final com.finance.finance.modules.user.repository.UserRepository userRepository;
    private final com.finance.finance.modules.group.repository.GroupRepository groupRepository;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final FileUploadValidator fileUploadValidator;
    private final AttachmentUrlSigner attachmentUrlSigner;

    @Transactional
    public MessageResponse.AttachmentSummary uploadAttachment(UUID groupId, MultipartFile file, UUID currentUserId) throws IOException {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        FileUploadValidator.ValidatedUpload validated =
                fileUploadValidator.validate(file, FileUploadValidator.Policy.GROUP_IMAGE);

        Path uploadPath = Paths.get(ATTACHMENT_UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = sanitizeDisplayName(file.getOriginalFilename());

        String newFilename = groupId + "_" + UUID.randomUUID() + validated.extension();
        Path filePath = uploadPath.resolve(newFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileKey = "/" + ATTACHMENT_UPLOAD_DIR + "/" + newFilename;
        String mimeType = validated.contentType();
        long fileSize = file.getSize();

        Integer width = null;
        Integer height = null;
        if (mimeType != null && mimeType.startsWith("image/")) {
            try {
                java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(filePath.toFile());
                if (bimg != null) {
                    width = bimg.getWidth();
                    height = bimg.getHeight();
                }
            } catch (Exception ignored) {
            }
        }

        return MessageResponse.AttachmentSummary.builder()
                .fileKey(fileKey)
                .fileName(originalFilename)
                .mimeType(mimeType)
                .fileSize(fileSize)
                .width(width)
                .height(height)
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
                .mentionedUserIds(serializeMentions(request.getMentionedUserIds()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        message = messageRepository.save(message);

        // Create attachments if provided
        if (request.getAttachments() != null && !request.getAttachments().isEmpty()) {
            final UUID messageId = message.getId();
            List<GroupMessageAttachment> attachments = request.getAttachments().stream()
                    .map(dto -> {
                        Path storedFile = resolvePendingAttachment(groupId, dto.getFileKey());
                        return GroupMessageAttachment.builder()
                            .messageId(messageId)
                            .fileKey("/" + storedFile.toString().replace('\\', '/'))
                            .fileName(sanitizeDisplayName(dto.getFileName()))
                            .mimeType(contentTypeFromPath(storedFile))
                            .fileSize(fileSize(storedFile))
                            .thumbnailKey(null)
                            .width(dto.getWidth())
                            .height(dto.getHeight())
                            .build();
                    })
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

        // Tin nhắn nhóm chỉ dùng cho push notification thiết bị, không lưu vào bảng core.notifications
        // để tránh làm tràn ngập hộp thư thông báo trong app toàn là tin nhắn chat.

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

        if (Boolean.TRUE.equals(message.getIsRecalled())) {
            throw new IllegalArgumentException("Cannot edit recalled message");
        }

        message.setContent(request.getContent());
        message.setUpdatedAt(LocalDateTime.now());

        message = messageRepository.save(message);
        return buildMessageResponse(message);
    }

    @Transactional
    public MessageResponse recallMessage(UUID groupId, UUID messageId, UUID currentUserId) {
        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Message does not belong to this group");
        }

        if (!message.getSenderId().equals(currentUserId)) {
            throw new ResourceNotFoundException("You can only recall your own messages");
        }

        if (message.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Message has been deleted");
        }

        message.setIsRecalled(true);
        message.setContent("Tin nhắn đã bị thu hồi");
        message.setUpdatedAt(LocalDateTime.now());

        // Delete attachments for recalled message
        List<GroupMessageAttachment> attachments = attachmentRepository.findByMessageId(message.getId());
        if (attachments != null && !attachments.isEmpty()) {
            attachmentRepository.deleteAll(attachments);
        }

        message = messageRepository.save(message);
        return buildMessageResponse(message);
    }

    @Transactional
    public MessageResponse reactToMessage(UUID groupId, UUID messageId, String reaction, UUID currentUserId) {
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

        // Check if existing reaction by this user
        var existing = reactionRepository.findByMessageIdAndUserId(messageId, currentUserId);
        if (existing.isPresent()) {
            if (existing.get().getReaction().equals(reaction)) {
                // If same reaction clicked again, toggle off (remove)
                reactionRepository.delete(existing.get());
            } else {
                // Change reaction
                existing.get().setReaction(reaction);
                reactionRepository.save(existing.get());
            }
        } else {
            // New reaction
            var react = com.finance.finance.modules.group.entity.GroupMessageReaction.builder()
                    .messageId(messageId)
                    .userId(currentUserId)
                    .reaction(reaction)
                    .build();
            reactionRepository.save(react);
        }

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

        // Get reactions
        List<com.finance.finance.modules.group.entity.GroupMessageReaction> reactions = reactionRepository.findByMessageId(message.getId());
        List<MessageResponse.ReactionSummary> reactionSummaries = reactions.stream()
                .map(r -> {
                    String uName = userRepository.findById(r.getUserId())
                            .map(u -> u.getFullName() != null ? u.getFullName() : (u.getUsername() != null ? u.getUsername() : u.getEmail()))
                            .orElse("Thành viên");
                    return MessageResponse.ReactionSummary.builder()
                            .reaction(r.getReaction())
                            .userId(r.getUserId())
                            .userName(uName)
                            .build();
                })
                .collect(Collectors.toList());

        boolean isEdited = message.getUpdatedAt() != null
                && message.getCreatedAt() != null
                && java.time.Duration.between(message.getCreatedAt(), message.getUpdatedAt()).getSeconds() > 2;

        return MessageResponse.builder()
                .id(message.getId())
                .groupId(message.getGroupId())
                .senderId(message.getSenderId())
                .sender(senderSummary)
                .messageType(message.getMessageType().name())
                .content(message.getContent())
                .replyToMessageId(message.getReplyToMessageId())
                .expenseId(message.getExpenseId())
                .mentionedUserIds(deserializeMentions(message.getMentionedUserIds()))
                .attachments(attachments.stream()
                        .map(att -> MessageResponse.AttachmentSummary.builder()
                                .id(att.getId())
                                .fileKey(attachmentUrlSigner.createUrl(message.getGroupId(), att.getId()))
                                .fileName(att.getFileName())
                                .mimeType(att.getMimeType())
                                .fileSize(att.getFileSize())
                                .thumbnailKey(att.getThumbnailKey())
                                .width(att.getWidth())
                                .height(att.getHeight())
                                .build())
                        .collect(Collectors.toList()))
                .readByCount(readByUserIds.size())
                .readByUserIds(readByUserIds)
                .reactions(reactionSummaries)
                .isEdited(isEdited && !Boolean.TRUE.equals(message.getIsRecalled()))
                .isRecalled(Boolean.TRUE.equals(message.getIsRecalled()))
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .deletedAt(message.getDeletedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public AttachmentDownload getAttachmentResource(
            UUID groupId, UUID attachmentId, long expires, String signature) {
        if (!attachmentUrlSigner.isValid(groupId, attachmentId, expires, signature)) {
            throw new ResourceNotFoundException("Attachment not found");
        }

        GroupMessageAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
        messageRepository.findByIdAndNotDeleted(attachment.getMessageId())
                .filter(item -> groupId.equals(item.getGroupId()))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));

        try {
            Path root = Paths.get(ATTACHMENT_UPLOAD_DIR).toAbsolutePath().normalize();
            String storedName = Paths.get(attachment.getFileKey()).getFileName().toString();
            Path filePath = root.resolve(storedName).normalize();
            if (!filePath.startsWith(root)) {
                throw new ResourceNotFoundException("Attachment not found");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Attachment not found");
            }
            return new AttachmentDownload(resource, attachment.getFileName(), attachment.getMimeType());
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Cannot load group attachment {}", attachmentId, e);
            throw new ResourceNotFoundException("Attachment not found");
        }
    }

    private Path resolvePendingAttachment(UUID groupId, String fileKey) {
        if (fileKey == null || fileKey.isBlank()) {
            throw new IllegalArgumentException("Attachment key is missing");
        }
        Path root = Paths.get(ATTACHMENT_UPLOAD_DIR).toAbsolutePath().normalize();
        String storedName = Paths.get(fileKey).getFileName().toString();
        Path candidate = root.resolve(storedName).normalize();
        if (!candidate.startsWith(root)
                || !storedName.startsWith(groupId + "_")
                || !Files.isRegularFile(candidate)) {
            throw new IllegalArgumentException("Attachment is unavailable for this group");
        }
        return Paths.get(ATTACHMENT_UPLOAD_DIR).resolve(storedName);
    }

    private String sanitizeDisplayName(String name) {
        String safe = name == null || name.isBlank() ? "image" : name.replace('\\', '/');
        safe = safe.substring(safe.lastIndexOf('/') + 1).replaceAll("[\\r\\n\\u0000]", "_");
        return safe.length() > 255 ? safe.substring(safe.length() - 255) : safe;
    }

    private String contentTypeFromPath(Path path) {
        String name = path.getFileName().toString().toLowerCase(java.util.Locale.ROOT);
        if (name.endsWith(".jpg")) return "image/jpeg";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".webp")) return "image/webp";
        throw new IllegalArgumentException("Attachment type is not allowed");
    }

    private long fileSize(Path path) {
        try {
            return Files.size(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("Attachment is unavailable", e);
        }
    }

    public record AttachmentDownload(Resource resource, String fileName, String contentType) {
    }

    private String serializeMentions(List<UUID> mentionedUserIds) {
        if (mentionedUserIds == null || mentionedUserIds.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(mentionedUserIds);
        } catch (Exception e) {
            log.warn("Failed to serialize mentions: {}", e.getMessage());
            return null;
        }
    }

    private List<UUID> deserializeMentions(String mentionsJson) {
        if (mentionsJson == null || mentionsJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(mentionsJson, 
                    objectMapper.getTypeFactory().constructCollectionType(List.class, UUID.class));
        } catch (Exception e) {
            log.warn("Failed to deserialize mentions: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}
