package com.finance.finance.modules.notification.repository;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.modules.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Find notification by ID and user ID
     */
    @Query("SELECT n FROM Notification n WHERE n.id = :id AND n.userId = :userId AND n.deletedAt IS NULL")
    Optional<Notification> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Find all notifications for user with filters
     */
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.deletedAt IS NULL " +
           "AND (:isRead IS NULL OR n.isRead = :isRead) " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:priority IS NULL OR n.priority = :priority) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdWithFilters(
            @Param("userId") UUID userId,
            @Param("isRead") Boolean isRead,
            @Param("type") NotificationType type,
            @Param("priority") NotificationPriority priority,
            Pageable pageable
    );

    /**
     * Count unread notifications for user
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false AND n.deletedAt IS NULL")
    long countUnreadByUserId(@Param("userId") UUID userId);

    /**
     * Count unread notifications by priority
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false " +
           "AND n.priority = :priority AND n.deletedAt IS NULL")
    long countUnreadByUserIdAndPriority(@Param("userId") UUID userId, @Param("priority") NotificationPriority priority);

    /**
     * Count unread notifications by type
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false " +
           "AND n.type = :type AND n.deletedAt IS NULL")
    long countUnreadByUserIdAndType(@Param("userId") UUID userId, @Param("type") NotificationType type);

    /**
     * Mark all unread notifications as read
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP " +
           "WHERE n.userId = :userId AND n.isRead = false AND n.deletedAt IS NULL")
    int markAllAsReadByUserId(@Param("userId") UUID userId);

    /**
     * Soft delete all read notifications
     */
    @Modifying
    @Query("UPDATE Notification n SET n.deletedAt = CURRENT_TIMESTAMP " +
           "WHERE n.userId = :userId AND n.isRead = true AND n.deletedAt IS NULL")
    int deleteAllReadByUserId(@Param("userId") UUID userId);

    /**
     * Check if notification exists by ID and user ID (not deleted)
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.id = :id AND n.userId = :userId AND n.deletedAt IS NULL")
    boolean existsByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
