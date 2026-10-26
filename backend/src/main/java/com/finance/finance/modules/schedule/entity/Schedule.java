package com.finance.finance.modules.schedule.entity;

import com.finance.finance.common.enums.ScheduleStatus;
import com.finance.finance.common.enums.ScheduleType;
import com.finance.finance.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity cho lịch định kỳ (recurring transaction hoặc reminder)
 */
@Entity
@Table(name = "schedules", indexes = {
        @Index(name = "idx_schedules_user_id", columnList = "user_id"),
        @Index(name = "idx_schedules_status", columnList = "status"),
        @Index(name = "idx_schedules_type", columnList = "schedule_type"),
        @Index(name = "idx_schedules_next_occurrence", columnList = "next_occurrence_date"),
        @Index(name = "idx_schedules_user_status", columnList = "user_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false, length = 20)
    private ScheduleType scheduleType;

    @Column(nullable = false)
    private String name;

    /**
     * iCalendar recurrence rule
     * Examples:
     * - FREQ=DAILY - Hàng ngày
     * - FREQ=WEEKLY;BYDAY=MO,WE,FR - Thứ 2, 4, 6 hàng tuần
     * - FREQ=MONTHLY;BYMONTHDAY=1 - Ngày 1 hàng tháng
     * - FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1 - Ngày 1/1 hàng năm
     */
    @Column(name = "recurrence_rule", nullable = false, length = 500)
    private String recurrenceRule;

    /**
     * Text mô tả dễ đọc của recurrence rule
     * VD: "Hàng tháng vào ngày 1", "Thứ 2, 4, 6 hàng tuần"
     */
    @Column(name = "recurrence_text", length = 255)
    private String recurrenceText;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * Ngày xuất hiện tiếp theo
     */
    @Column(name = "next_occurrence_date")
    private LocalDate nextOccurrenceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ScheduleStatus status = ScheduleStatus.ACTIVE;

    // ==================== Transaction Template ====================
    // Chỉ áp dụng khi schedule_type = TRANSACTION

    @Column(name = "template_transaction_type", length = 20)
    private String templateTransactionType; // INCOME, EXPENSE, TRANSFER

    @Column(name = "template_account_id")
    private UUID templateAccountId;

    @Column(name = "template_to_account_id")
    private UUID templateToAccountId; // For TRANSFER

    @Column(name = "template_amount", precision = 19, scale = 4)
    private BigDecimal templateAmount;

    @Column(name = "template_currency_code", length = 3)
    private String templateCurrencyCode;

    @Column(name = "template_category_id")
    private UUID templateCategoryId;

    @Column(name = "template_merchant_id")
    private UUID templateMerchantId;

    @Column(name = "template_description", columnDefinition = "TEXT")
    private String templateDescription;

    @Column(name = "template_note", columnDefinition = "TEXT")
    private String templateNote;

    // ==================== Reminder Settings ====================
    // Chỉ áp dụng khi schedule_type = REMINDER

    @Column(name = "reminder_message", columnDefinition = "TEXT")
    private String reminderMessage;

    // ==================== Execution Settings ====================

    /**
     * Tự động thực hiện (tạo transaction) hay cần xác nhận
     */
    @Column(name = "auto_execute", nullable = false)
    @Builder.Default
    private Boolean autoExecute = false;

    // ==================== Notification Settings ====================

    @Column(name = "notification_enabled", nullable = false)
    @Builder.Default
    private Boolean notificationEnabled = true;

    /**
     * Thông báo trước bao nhiêu phút
     */
    @Column(name = "notification_time_before_minutes")
    private Integer notificationTimeBeforeMinutes;

    /**
     * Kênh thông báo: PUSH, EMAIL, SMS (lưu dạng comma-separated)
     */
    @Column(name = "notification_channels", length = 100)
    private String notificationChannels;

    // ==================== Statistics ====================

    @Column(name = "total_occurrences")
    @Builder.Default
    private Integer totalOccurrences = 0;

    @Column(name = "executed_count")
    @Builder.Default
    private Integer executedCount = 0;

    @Column(name = "skipped_count")
    @Builder.Default
    private Integer skippedCount = 0;

    @Column(name = "failed_count")
    @Builder.Default
    private Integer failedCount = 0;

    @Column(name = "last_executed_at")
    private LocalDateTime lastExecutedAt;

    // ==================== Pause Info ====================

    @Column(name = "paused_at")
    private LocalDateTime pausedAt;

    @Column(name = "pause_reason", columnDefinition = "TEXT")
    private String pauseReason;

    // ==================== Metadata ====================

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 0;

    // ==================== Relationships ====================

    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ScheduleOccurrence> occurrences = new ArrayList<>();

    // ==================== Helper Methods ====================

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Soft delete
     */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.status = ScheduleStatus.CANCELLED;
    }

    /**
     * Tạm dừng lịch
     */
    public void pause(String reason) {
        this.status = ScheduleStatus.PAUSED;
        this.pausedAt = LocalDateTime.now();
        this.pauseReason = reason;
    }

    /**
     * Tiếp tục lịch
     */
    public void resume() {
        this.status = ScheduleStatus.ACTIVE;
        this.pausedAt = null;
        this.pauseReason = null;
    }

    /**
     * Đánh dấu hoàn thành
     */
    public void complete() {
        this.status = ScheduleStatus.COMPLETED;
    }

    /**
     * Cập nhật thống kê khi occurrence được thực hiện
     */
    public void incrementExecuted() {
        this.executedCount++;
        this.totalOccurrences++;
        this.lastExecutedAt = LocalDateTime.now();
    }

    /**
     * Cập nhật thống kê khi occurrence bị bỏ qua
     */
    public void incrementSkipped() {
        this.skippedCount++;
        this.totalOccurrences++;
    }

    /**
     * Cập nhật thống kê khi occurrence thất bại
     */
    public void incrementFailed() {
        this.failedCount++;
        this.totalOccurrences++;
    }

    /**
     * Kiểm tra xem schedule có phải là transaction không
     */
    public boolean isTransaction() {
        return ScheduleType.TRANSACTION.equals(this.scheduleType);
    }

    /**
     * Kiểm tra xem schedule có phải là reminder không
     */
    public boolean isReminder() {
        return ScheduleType.REMINDER.equals(this.scheduleType);
    }

    /**
     * Kiểm tra xem schedule có đang active không
     */
    public boolean isActive() {
        return ScheduleStatus.ACTIVE.equals(this.status);
    }

    /**
     * Kiểm tra xem schedule có đang paused không
     */
    public boolean isPaused() {
        return ScheduleStatus.PAUSED.equals(this.status);
    }
}
