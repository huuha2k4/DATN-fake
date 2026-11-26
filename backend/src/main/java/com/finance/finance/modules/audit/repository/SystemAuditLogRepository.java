package com.finance.finance.modules.audit.repository;

import com.finance.finance.modules.audit.entity.SystemAuditLog;
import org.springframework.data.repository.Repository;

import java.util.UUID;

/**
 * Append-only Spring Data repository for ops.audit_logs.
 * Intentionally does NOT expose update/delete/findAll methods.
 */
public interface SystemAuditLogRepository extends Repository<SystemAuditLog, UUID> {

    SystemAuditLog save(SystemAuditLog entity);

    boolean existsByEventId(UUID eventId);

    long count();
}
