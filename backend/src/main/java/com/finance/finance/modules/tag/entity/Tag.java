package com.finance.finance.modules.tag.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tags", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tag {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 50)
    private String name;
    
    @Column(name = "color", length = 7)
    private String color;
    
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
}
