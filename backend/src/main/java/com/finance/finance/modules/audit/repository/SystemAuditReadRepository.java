package com.finance.finance.modules.audit.repository;

import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.model.AuditCategory;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSeverity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

/**
 * Read-only paginated query interface for ops.audit_logs used exclusively by the
 * password-gated SystemAuditViewerService. Exposes no save/delete/unbounded findAll.
 */
public interface SystemAuditReadRepository extends Repository<SystemAuditLog, UUID> {

    @Query("""
            SELECT a FROM SystemAuditLog a
            WHERE (:category IS NULL OR a.eventCategory = :category)
              AND (:outcome IS NULL OR a.outcome = :outcome)
              AND (:severity IS NULL OR a.severity = :severity)
              AND (:search IS NULL OR :search = '' OR
                   LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(a.reasonCode, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(a.endpoint, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(COALESCE(a.requestId, '')) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY a.occurredAt DESC
            """)
    Page<SystemAuditLog> findFiltered(
            @Param("category") AuditCategory category,
            @Param("outcome") AuditOutcome outcome,
            @Param("severity") AuditSeverity severity,
            @Param("search") String search,
            Pageable pageable);
}
