package com.finance.finance.modules.schedule.entity;

import com.finance.finance.common.enums.OccurrenceStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity lưu các lần xuất hiện (occurrence) của lịch định kỳ
 * Mỗi occurrence đại diện cho 1 lần thực hiện của schedule
 */
@Entity
@Table(name = "schedule_occurrences", indexes = {
        @Index(name = "idx_occurrences_schedule_id", columnList = "schedule_id"),
        @Index(name = "idx_occurrences_status", columnList = "status"),
        @Index(name = "idx_occurrences_scheduled_date", columnList = "scheduled_date"),
        @Index(name = "idx_occurrences_schedule_status", columnList = "schedule_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleOccurrence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    /**
     * Ngày dự kiến thực hiện
     */
    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OccurrenceStatus status = OccurrenceStatus.PENDING;

    /**
     * Transaction ID được tạo ra (nếu là TRANSACTION type)
     */
    @Column(name = "transaction_id")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.UUID)
    private java.util.UUID transactionId;

    /**
     * Thời điểm thực hiện
     */
    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    /**
     * Ngày thực tế thực hiện (có thể khác scheduled_date)
     */
    @Column(name = "actual_execution_date")
    private LocalDate actualExecutionDate;

    /**
     * Lý do bỏ qua (nếu status = SKIPPED)
     */
    @Column(name = "skip_reason", columnDefinition = "TEXT")
    private String skipReason;

    /**
     * Thời điểm bỏ qua
     */
    @Column(name = "skipped_at")
    private LocalDateTime skippedAt;

    /**
     * Lý do thất bại (nếu status = FAILED)
     */
    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    /**
     * Thời điểm thất bại
     */
    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    /**
     * Số lần thử lại
     */
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * Ghi chú cho occurrence này
     */
    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 0;

    // ==================== Helper Methods ====================

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Đánh dấu đã thực hiện
     */
    public void markAsExecuted(java.util.UUID transactionId, LocalDate executionDate) {
        this.status = OccurrenceStatus.EXECUTED;
        this.transactionId = transactionId;
        this.executedAt = LocalDateTime.now();
        this.actualExecutionDate = executionDate;
    }

    /**
     * Đánh dấu bị bỏ qua
     */
    public void markAsSkipped(String reason) {
        this.status = OccurrenceStatus.SKIPPED;
        this.skipReason = reason;
        this.skippedAt = LocalDateTime.now();
    }

    /**
     * Đánh dấu thất bại
     */
    public void markAsFailed(String reason) {
        this.status = OccurrenceStatus.FAILED;
        this.failureReason = reason;
        this.failedAt = LocalDateTime.now();
        this.retryCount++;
    }

    /**
     * Kiểm tra xem occurrence có đang pending không
     */
    public boolean isPending() {
        return OccurrenceStatus.PENDING.equals(this.status);
    }

    /**
     * Kiểm tra xem occurrence đã được thực hiện chưa
     */
    public boolean isExecuted() {
        return OccurrenceStatus.EXECUTED.equals(this.status);
    }

    /**
     * Kiểm tra xem occurrence có bị bỏ qua không
     */
    public boolean isSkipped() {
        return OccurrenceStatus.SKIPPED.equals(this.status);
    }

    /**
     * Tính số ngày đến scheduled date
     */
    public int getDaysUntil() {
        return (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), scheduledDate);
    }
}
