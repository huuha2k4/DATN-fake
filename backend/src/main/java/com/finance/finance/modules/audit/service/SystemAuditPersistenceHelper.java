package com.finance.finance.modules.audit.service;

import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.repository.SystemAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Separates transactional boundaries for mandatory fail-closed (caller TX) vs failure/denied (REQUIRES_NEW) audit writes.
 */
@Component
@RequiredArgsConstructor
public class SystemAuditPersistenceHelper {

    private final SystemAuditLogRepository repository;

    @Transactional(propagation = Propagation.REQUIRED)
    public SystemAuditLog saveInCurrentTransaction(SystemAuditLog logEntry) {
        return repository.save(logEntry);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SystemAuditLog saveInNewTransaction(SystemAuditLog logEntry) {
        return repository.save(logEntry);
    }
}
