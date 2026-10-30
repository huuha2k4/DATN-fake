package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_funds", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupFund {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "group_id", nullable = false, unique = true) private UUID groupId;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false, precision = 19, scale = 4) @Builder.Default private BigDecimal balance = BigDecimal.ZERO;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Version @Builder.Default private Long version = 0L;
}
