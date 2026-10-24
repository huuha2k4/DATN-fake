package com.finance.finance.modules.merchant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "merchants", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Merchant {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 150)
    private String name;
    
    @Column(name = "normalized_name", nullable = false, length = 150)
    private String normalizedName;
    
    @Column(name = "aliases", columnDefinition = "text[]")
    private String[] aliases;
    
    @Column(name = "default_category_id")
    private UUID defaultCategoryId;
    
    @Column(name = "mcc", length = 4)
    private String mcc; // Merchant Category Code
    
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;
    
    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    // Business methods
    
    public boolean isSystemMerchant() {
        return userId == null;
    }
    
    public boolean isCustomMerchant() {
        return userId != null;
    }
    
    public void incrementUsageCount() {
        this.usageCount++;
    }
}
