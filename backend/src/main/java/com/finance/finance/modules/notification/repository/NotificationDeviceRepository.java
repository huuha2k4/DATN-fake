package com.finance.finance.modules.notification.repository;

import com.finance.finance.modules.notification.entity.NotificationDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationDeviceRepository extends JpaRepository<NotificationDevice, UUID> {

    /**
     * Find device by token
     */
    @Query("SELECT d FROM NotificationDevice d WHERE d.deviceToken = :deviceToken")
    Optional<NotificationDevice> findByDeviceToken(@Param("deviceToken") String deviceToken);

    /**
     * Find all active devices for a user
     */
    @Query("SELECT d FROM NotificationDevice d WHERE d.userId = :userId AND d.isActive = true ORDER BY d.lastUsedAt DESC")
    List<NotificationDevice> findActiveDevicesByUserId(@Param("userId") UUID userId);

    /**
     * Check if device token exists
     */
    @Query("SELECT COUNT(d) > 0 FROM NotificationDevice d WHERE d.deviceToken = :deviceToken")
    boolean existsByDeviceToken(@Param("deviceToken") String deviceToken);

    /**
     * Deactivate device by token
     */
    @Modifying
    @Query("UPDATE NotificationDevice d SET d.isActive = false WHERE d.deviceToken = :deviceToken")
    int deactivateByDeviceToken(@Param("deviceToken") String deviceToken);

    /**
     * Delete device by token and user ID
     */
    @Modifying
    @Query("DELETE FROM NotificationDevice d WHERE d.deviceToken = :deviceToken AND d.userId = :userId")
    int deleteByDeviceTokenAndUserId(@Param("deviceToken") String deviceToken, @Param("userId") UUID userId);
}
