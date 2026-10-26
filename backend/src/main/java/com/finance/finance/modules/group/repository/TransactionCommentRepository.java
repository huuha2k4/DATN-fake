package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.CommentableType;
import com.finance.finance.modules.group.entity.TransactionComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionCommentRepository extends JpaRepository<TransactionComment, UUID> {
    
    @Query("SELECT tc FROM TransactionComment tc " +
           "WHERE tc.commentableType = :commentableType " +
           "AND tc.commentableId = :commentableId " +
           "AND tc.parentCommentId IS NULL " +
           "ORDER BY tc.createdAt DESC")
    Page<TransactionComment> findByCommentableTypeAndId(@Param("commentableType") CommentableType commentableType,
                                                          @Param("commentableId") UUID commentableId,
                                                          Pageable pageable);
    
    @Query("SELECT tc FROM TransactionComment tc " +
           "WHERE tc.parentCommentId = :parentId " +
           "ORDER BY tc.createdAt ASC")
    List<TransactionComment> findRepliesByParentId(@Param("parentId") UUID parentId);
    
    @Query("SELECT COUNT(tc) FROM TransactionComment tc " +
           "WHERE tc.commentableType = :commentableType " +
           "AND tc.commentableId = :commentableId")
    long countByCommentableTypeAndId(@Param("commentableType") CommentableType commentableType,
                                      @Param("commentableId") UUID commentableId);
    
    @Query("SELECT COUNT(tc) FROM TransactionComment tc " +
           "WHERE tc.parentCommentId = :parentId")
    long countRepliesByParentId(@Param("parentId") UUID parentId);
    
    Page<TransactionComment> findByGroupIdAndCommentableTypeAndCommentableIdOrderByCreatedAtDesc(
            UUID groupId, CommentableType commentableType, UUID commentableId, Pageable pageable);
    
    List<TransactionComment> findByParentCommentIdOrderByCreatedAtAsc(UUID parentCommentId);
    
    long countByParentCommentId(UUID parentCommentId);
}
