package com.finance.finance.modules.notification.repository;

import com.finance.finance.modules.notification.entity.UserNotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationSettingRepository extends JpaRepository<UserNotificationSetting, UUID> {
    Optional<UserNotificationSetting> findByUserId(UUID userId);
}

