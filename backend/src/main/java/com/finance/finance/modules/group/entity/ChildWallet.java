package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.PrivacyLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "child_wallets", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildWallet {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "child_username", length = 50)
    private String childUsername;

    @Column(name = "child_name", nullable = false, length = 150)
    private String childName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "avatar_key")
    private String avatarKey;

    @Column(nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "weekly_allowance", precision = 19, scale = 4)
    private BigDecimal weeklyAllowance;

    @Column(name = "next_allowance_date")
    private LocalDate nextAllowanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_level", nullable = false, length = 20)
    private PrivacyLevel privacyLevel;

    @Column(name = "spend_limit_daily", precision = 19, scale = 4)
    private BigDecimal spendLimitDaily;

    @Column(name = "spend_limit_weekly", precision = 19, scale = 4)
    private BigDecimal spendLimitWeekly;

    @Column(name = "allowed_categories", columnDefinition = "jsonb")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private String allowedCategories;

    @Column(name = "require_approval_above", precision = 19, scale = 4)
    private BigDecimal requireApprovalAbove;

    @Column(columnDefinition = "jsonb")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private String settings;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;
}
