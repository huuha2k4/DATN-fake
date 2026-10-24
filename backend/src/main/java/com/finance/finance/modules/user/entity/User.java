package com.finance.finance.modules.user.entity;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(unique = true, length = 50)
    private String username;
    
    @Column(name = "full_name", length = 100)
    private String fullName;
    
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;
    
    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;
    
    @Column(length = 20)
    private String phone;
    
    @Column(name = "mfa_enabled", nullable = false)
    @Builder.Default
    private boolean mfaEnabled = false;
    
    @Column(name = "mfa_secret")
    private String mfaSecret;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "user_status", nullable = false)
    @Builder.Default
    private UserStatus userStatus = UserStatus.ACTIVE;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "system_role", nullable = false)
    @Builder.Default
    private SystemRole systemRole = SystemRole.USER;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_tier", nullable = false)
    @Builder.Default
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;
    
    @Column(name = "subscription_expires_at")
    private Instant subscriptionExpiresAt;
    
    @Column(name = "preferred_currency", length = 3, nullable = false)
    @Builder.Default
    private String preferredCurrency = "VND";
    
    @Column(nullable = false)
    @Builder.Default
    private String timezone = "Asia/Ho_Chi_Minh";
    
    @Column(length = 10, nullable = false)
    @Builder.Default
    private String language = "vi-VN";
    
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;
    
    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;
    
    @Column(name = "locked_until")
    private Instant lockedUntil;
    
    @Column(name = "last_login_at")
    private Instant lastLoginAt;
    
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
    
    // UserDetails implementation
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
            new SimpleGrantedAuthority("ROLE_" + systemRole.name()),
            new SimpleGrantedAuthority("SUBSCRIPTION_" + subscriptionTier.name())
        );
    }
    
    @Override
    public String getPassword() {
        return passwordHash;
    }
    
    @Override
    public String getUsername() {
        return email;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return deletedAt == null;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        if (lockedUntil != null) {
            return Instant.now().isAfter(lockedUntil);
        }
        return userStatus != UserStatus.LOCKED && userStatus != UserStatus.DISABLED && userStatus != UserStatus.INACTIVE;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return userStatus == UserStatus.ACTIVE;
    }
    
    // Business methods
    
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void markAsDeleted() {
        this.deletedAt = Instant.now();
        this.userStatus = UserStatus.DELETED;
    }
    
    public boolean isEmailVerified() {
        return emailVerified;
    }
    
    public void verifyEmail() {
        this.emailVerified = true;
        this.emailVerifiedAt = Instant.now();
    }
    
    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }
    
    public void incrementFailedLoginAttempts() {
        this.failedLoginAttempts++;
    }
    
    public void resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }
    
    public void lockAccount(long durationMillis) {
        this.userStatus = UserStatus.LOCKED;
        this.lockedUntil = Instant.now().plusMillis(durationMillis);
    }
    
    public void updateLastLogin() {
        this.lastLoginAt = Instant.now();
    }
    
    public boolean isAdmin() {
        return systemRole == SystemRole.ADMIN;
    }
    
    public boolean isPremium() {
        return subscriptionTier == SubscriptionTier.PREMIUM || 
               subscriptionTier == SubscriptionTier.ENTERPRISE;
    }
    
    public boolean isSubscriptionActive() {
        if (subscriptionTier == SubscriptionTier.FREE) {
            return true;
        }
        if (subscriptionExpiresAt == null) {
            return true;
        }
        return Instant.now().isBefore(subscriptionExpiresAt);
    }
}
