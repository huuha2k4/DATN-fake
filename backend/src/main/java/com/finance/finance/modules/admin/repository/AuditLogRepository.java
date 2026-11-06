package com.finance.finance.modules.admin.repository;

import com.finance.finance.modules.admin.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:targetEntity IS NULL OR a.targetEntity = :targetEntity) " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> findWithFilters(@Param("action") String action, @Param("targetEntity") String targetEntity);
}

