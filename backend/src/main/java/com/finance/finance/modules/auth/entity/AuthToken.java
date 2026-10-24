package com.finance.finance.modules.auth.entity;

import com.finance.finance.common.enums.TokenType;
import com.finance.finance.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_tokens", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TokenType tokenType;
    
    @Column(nullable = false, unique = true, length = 255)
    private String token;
    
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    
    @Column(name = "used_at")
    private Instant usedAt;
    
    @Column(nullable = false)
    private boolean used = false;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
    
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
    
    public boolean isUsed() {
        return usedAt != null;
    }
    
    public boolean isValid() {
        return !isExpired() && !isUsed();
    }
    
    public void markAsUsed() {
        this.used = true;
        this.usedAt = Instant.now();
    }
}
