package com.finance.finance.modules.category.entity;

import com.finance.finance.common.enums.CategoryKind;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "categories", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "parent_id")
    private UUID parentId;
    
    @Column(name = "code", length = 50, unique = true)
    private String code;
    
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private CategoryKind kind;
    
    @Column(name = "icon", length = 50)
    private String icon;
    
    @Column(name = "color", length = 7)
    private String color;
    
    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean isSystem = false;
    
    @Column(name = "is_essential", nullable = false)
    @Builder.Default
    private boolean isEssential = false;
    
    @Column(name = "default_budget_ratio", precision = 5, scale = 2)
    private BigDecimal defaultBudgetRatio;
    
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Short displayOrder = 0;
    
    @Column(name = "sync_seq")
    private Long syncSeq;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    @Column(name = "deleted_at")
    private Instant deletedAt;
    
    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
    
    // Business methods
    
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void markAsDeleted() {
        this.deletedAt = Instant.now();
    }
    
    public boolean isSystemCategory() {
        return isSystem;
    }
    
    public boolean isCustomCategory() {
        return !isSystem && userId != null;
    }
    
    public boolean hasParent() {
        return parentId != null;
    }
    
    public boolean isExpenseCategory() {
        return kind == CategoryKind.EXPENSE;
    }
    
    public boolean isIncomeCategory() {
        return kind == CategoryKind.INCOME;
    }
}
