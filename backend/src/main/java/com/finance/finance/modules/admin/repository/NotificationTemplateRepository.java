package com.finance.finance.modules.admin.repository;

import com.finance.finance.modules.admin.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {
    Optional<NotificationTemplate> findByCode(String code);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM NotificationTemplate t WHERE t.id = :id")
    Optional<NotificationTemplate> lockById(@org.springframework.data.repository.query.Param("id") UUID id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM NotificationTemplate t WHERE t.code = :code")
    Optional<NotificationTemplate> lockByCode(@org.springframework.data.repository.query.Param("code") String code);
}

