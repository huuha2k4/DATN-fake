package com.finance.finance.modules.audit.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Configurable retention job for ops.audit_logs.
 * Disabled by default (app.audit.retention.enabled=false) until retention policy is formally approved.
 * Supports dry-run mode and bounded batch deletes without table locks.
 */
@Slf4j
@Component
public class AuditRetentionJob {

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.audit.retention.enabled:false}")
    private boolean enabled;

    @Value("${app.audit.retention.dry-run:true}")
    private boolean dryRun;

    @Value("${app.audit.retention.operational-days:90}")
    private int operationalDays;

    @Value("${app.audit.retention.security-days:365}")
    private int securityDays;

    @Value("${app.audit.retention.batch-size:500}")
    private int batchSize;

    @Scheduled(cron = "${app.audit.retention.cron:0 30 3 * * *}")
    @Transactional
    public void runRetention() {
        if (!enabled) {
            return;
        }
        Instant operationalCutoff = Instant.now().minus(operationalDays, ChronoUnit.DAYS);
        Instant securityCutoff = Instant.now().minus(securityDays, ChronoUnit.DAYS);

        long eligibleOperational = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM ops.audit_logs " +
                "WHERE event_category IN ('CATEGORY', 'SCHEDULE', 'USER', 'OCR') " +
                "AND severity = 'INFO' AND occurred_at < :cutoff")
                .setParameter("cutoff", operationalCutoff)
                .getSingleResult()).longValue();

        long eligibleSecurity = ((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM ops.audit_logs " +
                "WHERE event_category IN ('AUTH', 'SECURITY') " +
                "AND severity NOT IN ('CRITICAL') AND occurred_at < :cutoff")
                .setParameter("cutoff", securityCutoff)
                .getSingleResult()).longValue();

        if (dryRun) {
            log.info("[AuditRetention DRY-RUN] eligibleOperational={}, eligibleSecurity={}",
                    eligibleOperational, eligibleSecurity);
            return;
        }

        // Only enabled when dedicated retention session setting is turned on inside this transaction
        entityManager.createNativeQuery("SET LOCAL app.audit_retention_mode = 'on'").executeUpdate();
        int deleted = entityManager.createNativeQuery(
                "DELETE FROM ops.audit_logs WHERE id IN (" +
                "  SELECT id FROM ops.audit_logs " +
                "  WHERE event_category IN ('CATEGORY', 'SCHEDULE', 'USER', 'OCR') " +
                "  AND severity = 'INFO' AND occurred_at < :cutoff " +
                "  ORDER BY occurred_at ASC LIMIT :limit" +
                ")")
                .setParameter("cutoff", operationalCutoff)
                .setParameter("limit", batchSize)
                .executeUpdate();
        log.info("[AuditRetention] Deleted {} operational audit records (eligible={})", deleted, eligibleOperational);
    }
}
