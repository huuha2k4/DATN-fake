package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.CommentableType;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.CreateCommentRequest;
import com.finance.finance.modules.group.dto.request.UpdateCommentRequest;
import com.finance.finance.modules.group.dto.response.CommentResponse;
import com.finance.finance.modules.group.entity.TransactionComment;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.TransactionCommentRepository;
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
public class CommentService {

    private final TransactionCommentRepository commentRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Transactional
    public CommentResponse createComment(UUID groupId, CreateCommentRequest request, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        TransactionComment comment = TransactionComment.builder()
                .groupId(groupId)
                .commentableType(request.getCommentableType())
                .commentableId(request.getCommentableId())
                .userId(currentUserId)
                .content(request.getContent())
                .parentCommentId(request.getParentCommentId())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        comment = commentRepository.save(comment);
        return buildCommentResponse(comment);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(UUID groupId, CommentableType type, UUID commentableId, Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        Page<TransactionComment> comments = commentRepository.findByGroupIdAndCommentableTypeAndCommentableIdOrderByCreatedAtDesc(
                groupId, type, commentableId, pageable);
        
        return comments.map(this::buildCommentResponse);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getCommentThread(UUID groupId, UUID commentId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        TransactionComment parentComment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!parentComment.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Comment does not belong to this group");
        }

        List<TransactionComment> thread = commentRepository.findByParentCommentIdOrderByCreatedAtAsc(commentId);
        return thread.stream()
                .map(this::buildCommentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse updateComment(UUID groupId, UUID commentId, UpdateCommentRequest request, UUID currentUserId) {
        TransactionComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!comment.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Comment does not belong to this group");
        }

        if (!comment.getUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("You can only update your own comments");
        }

        comment.setContent(request.getContent());
        comment.setUpdatedAt(LocalDateTime.now());

        comment = commentRepository.save(comment);
        return buildCommentResponse(comment);
    }

    @Transactional
    public void deleteComment(UUID groupId, UUID commentId, UUID currentUserId) {
        TransactionComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!comment.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Comment does not belong to this group");
        }

        if (!comment.getUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("You can only delete your own comments");
        }

        // Delete all replies first
        List<TransactionComment> replies = commentRepository.findByParentCommentIdOrderByCreatedAtAsc(commentId);
        commentRepository.deleteAll(replies);

        // Delete the comment
        commentRepository.delete(comment);
    }

    private CommentResponse buildCommentResponse(TransactionComment comment) {
        // Get reply count
        long replyCount = commentRepository.countByParentCommentId(comment.getId());

        return CommentResponse.builder()
                .id(comment.getId())
                .groupId(comment.getGroupId())
                .commentableType(comment.getCommentableType())
                .commentableId(comment.getCommentableId())
                .userId(comment.getUserId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentCommentId())
                .replyCount((int) replyCount)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
