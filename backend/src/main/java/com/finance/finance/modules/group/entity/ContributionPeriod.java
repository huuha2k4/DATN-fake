package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contribution_periods", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContributionPeriod {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "group_id", nullable = false) private UUID groupId;
    @Column(nullable = false, length = 160) private String name;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Enumerated(EnumType.STRING) @Column(name = "allocation_method", nullable = false) private ContributionAllocationMethod allocationMethod;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ContributionFrequency frequency;
    @Column(name = "required_total", nullable = false, precision = 19, scale = 4) private BigDecimal requiredTotal;
    @Column(name = "fundraising_target", precision = 19, scale = 4) private BigDecimal fundraisingTarget;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ContributionPeriodStatus status;
    @Column(name = "recurrence_key") private String recurrenceKey;
    @Column(name = "created_by_user_id", nullable = false) private UUID createdByUserId;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Column(name = "closed_at") private LocalDateTime closedAt;
    @Column(name = "cancelled_at") private LocalDateTime cancelledAt;
    @Version @Column(nullable = false) @Builder.Default private Long version = 0L;
}
