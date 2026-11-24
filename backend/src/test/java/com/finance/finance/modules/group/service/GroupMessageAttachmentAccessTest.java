package com.finance.finance.modules.group.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.upload.AttachmentUrlSigner;
import com.finance.finance.common.upload.FileUploadValidator;
import com.finance.finance.modules.group.entity.GroupMessage;
import com.finance.finance.modules.group.entity.GroupMessageAttachment;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupMessageAttachmentRepository;
import com.finance.finance.modules.group.repository.GroupMessageReadRepository;
import com.finance.finance.modules.group.repository.GroupMessageReactionRepository;
import com.finance.finance.modules.group.repository.GroupMessageRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupMessageAttachmentAccessTest {

    @Mock GroupMessageRepository messageRepository;
    @Mock GroupMessageAttachmentRepository attachmentRepository;
    @Mock GroupMessageReadRepository readRepository;
    @Mock GroupMessageReactionRepository reactionRepository;
    @Mock GroupMemberRepository groupMemberRepository;
    @Mock GroupExpenseRepository expenseRepository;
    @Mock UserRepository userRepository;
    @Mock GroupRepository groupRepository;
    @Mock NotificationService notificationService;
    @Mock ObjectMapper objectMapper;
    @Mock FileUploadValidator fileUploadValidator;
    @Mock AttachmentUrlSigner attachmentUrlSigner;

    @InjectMocks GroupMessageService service;

    @Test
    void rejectsMissingOrInvalidSignatureBeforeDatabaseLookup() {
        UUID groupId = UUID.randomUUID();
        UUID attachmentId = UUID.randomUUID();
        when(attachmentUrlSigner.isValid(groupId, attachmentId, 1L, "bad")).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.getAttachmentResource(groupId, attachmentId, 1L, "bad"));

        verify(attachmentRepository, never()).findById(attachmentId);
    }

    @Test
    void rejectsValidSignatureWhenAttachmentMessageBelongsToAnotherGroup() {
        UUID requestedGroupId = UUID.randomUUID();
        UUID actualGroupId = UUID.randomUUID();
        UUID attachmentId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        when(attachmentUrlSigner.isValid(requestedGroupId, attachmentId, 999L, "valid")).thenReturn(true);
        when(attachmentRepository.findById(attachmentId)).thenReturn(Optional.of(
                GroupMessageAttachment.builder().id(attachmentId).messageId(messageId).fileKey("secret.jpg").build()));
        when(messageRepository.findByIdAndNotDeleted(messageId)).thenReturn(Optional.of(
                GroupMessage.builder().id(messageId).groupId(actualGroupId).build()));

        assertThrows(ResourceNotFoundException.class,
                () -> service.getAttachmentResource(requestedGroupId, attachmentId, 999L, "valid"));
    }
}
