package com.finance.finance.modules.auth.entity;

import com.finance.finance.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, unique = true, length = 255)
    private String token;
    
    @Column(name = "device_id", length = 128)
    private String deviceId;
    
    @Column(name = "device_name", length = 100)
    private String deviceName;
    
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    
    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;
    
    @Column(name = "revoked_at")
    private Instant revokedAt;
    
    @Column(name = "replaced_by_id")
    private UUID replacedById;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
    
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
    
    public boolean isRevoked() {
        return revoked;
    }
    
    public boolean isValid() {
        return !isExpired() && !isRevoked();
    }
    
    public void revoke() {
        this.revoked = true;
        this.revokedAt = Instant.now();
    }
}
